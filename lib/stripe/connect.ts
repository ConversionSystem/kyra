import { stripe } from './config';
import { createServiceClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// ============================================================================
// Stripe Connect — Express accounts for agency client billing
// ============================================================================

/** Application fee percentage that goes to Kyra (the platform). */
const APPLICATION_FEE_PERCENT = 10;

interface ConnectAccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

/**
 * Create a Stripe Connect Express account for an agency.
 * Saves the account ID to agency.stripe_connect_account_id.
 */
export async function createConnectAccount(
  agencyId: string,
  email: string
): Promise<string> {
  const supabase = await createServiceClient();

  // Check if agency already has a connect account
  const { data: agency, error } = await supabase
    .from('agencies')
    .select('id, stripe_connect_account_id, name')
    .eq('id', agencyId)
    .single();

  if (error || !agency) {
    throw new Error('Agency not found');
  }

  const existing = (agency as { stripe_connect_account_id: string | null }).stripe_connect_account_id;
  if (existing) {
    return existing;
  }

  const account = await stripe.accounts.create({
    type: 'express',
    email,
    metadata: { agency_id: agencyId },
    business_profile: {
      name: (agency as { name: string }).name,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  await supabase
    .from('agencies')
    .update({ stripe_connect_account_id: account.id })
    .eq('id', agencyId);

  return account.id;
}

/**
 * Generate a Stripe Connect onboarding link for an agency.
 */
export async function createConnectOnboardingLink(
  agencyId: string,
  returnUrl: string
): Promise<string> {
  const supabase = await createServiceClient();

  const { data: agency, error } = await supabase
    .from('agencies')
    .select('stripe_connect_account_id')
    .eq('id', agencyId)
    .single();

  if (error || !agency) {
    throw new Error('Agency not found');
  }

  const accountId = (agency as { stripe_connect_account_id: string | null }).stripe_connect_account_id;
  if (!accountId) {
    throw new Error('Agency has no Connect account. Create one first.');
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${returnUrl}?refresh=true`,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return accountLink.url;
}

/**
 * Generate a Stripe Express dashboard login link for an agency.
 */
export async function createExpressDashboardLink(
  agencyId: string
): Promise<string> {
  const supabase = await createServiceClient();

  const { data: agency, error } = await supabase
    .from('agencies')
    .select('stripe_connect_account_id')
    .eq('id', agencyId)
    .single();

  if (error || !agency) {
    throw new Error('Agency not found');
  }

  const accountId = (agency as { stripe_connect_account_id: string | null }).stripe_connect_account_id;
  if (!accountId) {
    throw new Error('Agency has no Connect account');
  }

  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink.url;
}

/**
 * Get the Connect account status for an agency.
 */
export async function getConnectAccountStatus(
  agencyId: string
): Promise<ConnectAccountStatus | null> {
  const supabase = await createServiceClient();

  const { data: agency, error } = await supabase
    .from('agencies')
    .select('stripe_connect_account_id')
    .eq('id', agencyId)
    .single();

  if (error || !agency) {
    throw new Error('Agency not found');
  }

  const accountId = (agency as { stripe_connect_account_id: string | null }).stripe_connect_account_id;
  if (!accountId) {
    return null;
  }

  const account = await stripe.accounts.retrieve(accountId);

  return {
    accountId: account.id,
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
  };
}

// ============================================================================
// Per-Client Subscription Billing
// ============================================================================

/**
 * Get or create a Stripe customer on the agency's connected account for a client.
 */
async function getOrCreateConnectedCustomer(
  connectAccountId: string,
  agencyId: string,
  clientId: string,
  clientName: string,
  clientEmail?: string
): Promise<string> {
  // Search for existing customer by metadata
  const existing = await stripe.customers.search(
    { query: `metadata['client_id']:'${clientId}'`, limit: 1 },
    { stripeAccount: connectAccountId }
  );

  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  // Create new customer on the connected account
  const customer = await stripe.customers.create(
    {
      name: clientName,
      email: clientEmail ?? undefined,
      metadata: { client_id: clientId, agency_id: agencyId },
    },
    { stripeAccount: connectAccountId }
  );

  return customer.id;
}

/**
 * Create a recurring subscription for a client on the agency's connected account.
 * Includes an application fee (10%) that goes to Kyra's platform account.
 *
 * Uses Stripe Connect "destination charges" pattern via subscriptions.
 */
export async function createClientSubscription(
  agencyId: string,
  clientId: string,
  amountCents: number,
  clientName: string,
  clientEmail?: string
): Promise<{ subscriptionId: string; customerId: string }> {
  const supabase = await createServiceClient();

  const { data: agency, error } = await supabase
    .from('agencies')
    .select('stripe_connect_account_id, stripe_onboarding_complete')
    .eq('id', agencyId)
    .single();

  if (error || !agency) {
    throw new Error('Agency not found');
  }

  const agencyRow = agency as {
    stripe_connect_account_id: string | null;
    stripe_onboarding_complete: boolean;
  };

  if (!agencyRow.stripe_connect_account_id) {
    throw new Error('Agency has no Stripe Connect account. Complete onboarding first.');
  }

  if (!agencyRow.stripe_onboarding_complete) {
    throw new Error('Agency has not completed Stripe onboarding.');
  }

  const connectAccountId = agencyRow.stripe_connect_account_id;

  // Get or create customer on the connected account
  const customerId = await getOrCreateConnectedCustomer(
    connectAccountId,
    agencyId,
    clientId,
    clientName,
    clientEmail
  );

  // Create a price for this specific amount on the connected account
  const price = await stripe.prices.create(
    {
      unit_amount: amountCents,
      currency: 'usd',
      recurring: { interval: 'month' },
      product_data: {
        name: `Kyra AI — ${clientName}`,
        metadata: { client_id: clientId, agency_id: agencyId },
      },
      metadata: { client_id: clientId, agency_id: agencyId },
    },
    { stripeAccount: connectAccountId }
  );

  // Calculate application fee: 10% of the amount
  const applicationFeeAmount = Math.round(amountCents * APPLICATION_FEE_PERCENT / 100);

  // Create the subscription on the connected account
  const subscription = await stripe.subscriptions.create(
    {
      customer: customerId,
      items: [{ price: price.id }],
      application_fee_percent: APPLICATION_FEE_PERCENT,
      metadata: {
        client_id: clientId,
        agency_id: agencyId,
        application_fee_cents: applicationFeeAmount.toString(),
      },
    },
    { stripeAccount: connectAccountId }
  );

  // Update the client record with subscription details
  await supabase
    .from('agency_clients')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      billing_status: subscription.status === 'active' ? 'active' : 'trialing',
      billing_amount_cents: amountCents,
    })
    .eq('id', clientId);

  return { subscriptionId: subscription.id, customerId };
}

/**
 * Cancel a client's subscription.
 */
export async function cancelClientSubscription(
  agencyId: string,
  clientId: string
): Promise<void> {
  const supabase = await createServiceClient();

  const { data: agency, error: agencyErr } = await supabase
    .from('agencies')
    .select('stripe_connect_account_id')
    .eq('id', agencyId)
    .single();

  if (agencyErr || !agency) {
    throw new Error('Agency not found');
  }

  const connectAccountId = (agency as { stripe_connect_account_id: string | null }).stripe_connect_account_id;
  if (!connectAccountId) {
    throw new Error('Agency has no Connect account');
  }

  const { data: client, error: clientErr } = await supabase
    .from('agency_clients')
    .select('stripe_subscription_id')
    .eq('id', clientId)
    .eq('agency_id', agencyId)
    .single();

  if (clientErr || !client) {
    throw new Error('Client not found');
  }

  const subscriptionId = (client as { stripe_subscription_id: string | null }).stripe_subscription_id;
  if (!subscriptionId) {
    throw new Error('Client has no active subscription');
  }

  // Cancel at period end
  await stripe.subscriptions.update(
    subscriptionId,
    { cancel_at_period_end: true },
    { stripeAccount: connectAccountId }
  );

  await supabase
    .from('agency_clients')
    .update({ billing_status: 'canceled' })
    .eq('id', clientId);
}

/**
 * Update a client's billing amount. Creates a new price and swaps the subscription item.
 */
export async function updateClientBillingAmount(
  agencyId: string,
  clientId: string,
  newAmountCents: number
): Promise<void> {
  const supabase = await createServiceClient();

  const { data: agency, error: agencyErr } = await supabase
    .from('agencies')
    .select('stripe_connect_account_id')
    .eq('id', agencyId)
    .single();

  if (agencyErr || !agency) {
    throw new Error('Agency not found');
  }

  const connectAccountId = (agency as { stripe_connect_account_id: string | null }).stripe_connect_account_id;
  if (!connectAccountId) {
    throw new Error('Agency has no Connect account');
  }

  const { data: client, error: clientErr } = await supabase
    .from('agency_clients')
    .select('stripe_subscription_id, name')
    .eq('id', clientId)
    .eq('agency_id', agencyId)
    .single();

  if (clientErr || !client) {
    throw new Error('Client not found');
  }

  const clientRow = client as { stripe_subscription_id: string | null; name: string };
  if (!clientRow.stripe_subscription_id) {
    // No subscription — just update the amount in DB
    await supabase
      .from('agency_clients')
      .update({ billing_amount_cents: newAmountCents })
      .eq('id', clientId);
    return;
  }

  // Create a new price on the connected account
  const newPrice = await stripe.prices.create(
    {
      unit_amount: newAmountCents,
      currency: 'usd',
      recurring: { interval: 'month' },
      product_data: {
        name: `Kyra AI — ${clientRow.name}`,
        metadata: { client_id: clientId, agency_id: agencyId },
      },
    },
    { stripeAccount: connectAccountId }
  );

  // Get existing subscription to find the item to swap
  const sub = await stripe.subscriptions.retrieve(
    clientRow.stripe_subscription_id,
    { stripeAccount: connectAccountId }
  );

  const itemToUpdate = sub.items.data[0];
  if (!itemToUpdate) {
    throw new Error('No subscription item found');
  }

  // Swap the price
  await stripe.subscriptions.update(
    clientRow.stripe_subscription_id,
    {
      items: [{ id: itemToUpdate.id, price: newPrice.id }],
      proration_behavior: 'create_prorations',
    },
    { stripeAccount: connectAccountId }
  );

  // Update DB
  await supabase
    .from('agency_clients')
    .update({ billing_amount_cents: newAmountCents })
    .eq('id', clientId);
}

/**
 * Handle Connect account.updated webhook — update onboarding status.
 * Called from webhooks.ts.
 */
export async function syncConnectAccountStatus(
  account: { id: string; charges_enabled?: boolean; payouts_enabled?: boolean; details_submitted?: boolean }
): Promise<void> {
  const supabase = createServiceClientWithoutCookies();

  const chargesEnabled = account.charges_enabled ?? false;
  const payoutsEnabled = account.payouts_enabled ?? false;
  const detailsSubmitted = account.details_submitted ?? false;

  const onboardingComplete = chargesEnabled && payoutsEnabled && detailsSubmitted;

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, settings')
    .eq('stripe_connect_account_id', account.id)
    .single();

  if (!agency) {
    console.warn(`[stripe connect] No agency found for connect account ${account.id}`);
    return;
  }

  const agencyData = agency as { id: string; settings: Record<string, unknown> };

  const updatedSettings = {
    ...agencyData.settings,
    stripe_connect_charges_enabled: chargesEnabled,
    stripe_connect_payouts_enabled: payoutsEnabled,
    stripe_connect_details_submitted: detailsSubmitted,
  };

  await supabase
    .from('agencies')
    .update({
      settings: updatedSettings,
      stripe_onboarding_complete: onboardingComplete,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agencyData.id);
}

/**
 * Create an invoice on the agency's connected account to bill a client.
 * (One-time invoice, not recurring — kept for manual billing scenarios.)
 */
export async function createClientInvoice(
  agencyId: string,
  clientId: string,
  amountCents: number,
  description: string,
  customerEmail: string
): Promise<{ invoiceId: string; hostedUrl: string | null }> {
  const supabase = await createServiceClient();

  const { data: agency, error } = await supabase
    .from('agencies')
    .select('stripe_connect_account_id')
    .eq('id', agencyId)
    .single();

  if (error || !agency) {
    throw new Error('Agency not found');
  }

  const connectAccountId = (agency as { stripe_connect_account_id: string | null }).stripe_connect_account_id;
  if (!connectAccountId) {
    throw new Error('Agency has no Connect account');
  }

  // Create or find the customer on the connected account
  const existingCustomers = await stripe.customers.list(
    { email: customerEmail, limit: 1 },
    { stripeAccount: connectAccountId }
  );

  let stripeCustomerId: string;

  if (existingCustomers.data.length > 0) {
    stripeCustomerId = existingCustomers.data[0].id;
  } else {
    const newCustomer = await stripe.customers.create(
      {
        email: customerEmail,
        metadata: { client_id: clientId, agency_id: agencyId },
      },
      { stripeAccount: connectAccountId }
    );
    stripeCustomerId = newCustomer.id;
  }

  // Calculate application fee
  const applicationFeeAmount = Math.round(amountCents * APPLICATION_FEE_PERCENT / 100);

  // Create the invoice
  const invoice = await stripe.invoices.create(
    {
      customer: stripeCustomerId,
      collection_method: 'send_invoice',
      days_until_due: 30,
      application_fee_amount: applicationFeeAmount,
      metadata: { agency_id: agencyId, client_id: clientId },
    },
    { stripeAccount: connectAccountId }
  );

  // Add the line item
  await stripe.invoiceItems.create(
    {
      customer: stripeCustomerId,
      invoice: invoice.id,
      amount: amountCents,
      currency: 'usd',
      description,
    },
    { stripeAccount: connectAccountId }
  );

  // Finalize and send
  const finalizedInvoice = await stripe.invoices.finalizeInvoice(
    invoice.id,
    {},
    { stripeAccount: connectAccountId }
  );

  await stripe.invoices.sendInvoice(
    invoice.id,
    {},
    { stripeAccount: connectAccountId }
  );

  return {
    invoiceId: finalizedInvoice.id,
    hostedUrl: finalizedInvoice.hosted_invoice_url ?? null,
  };
}
