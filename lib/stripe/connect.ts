import { stripe } from './config';
import { createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// Stripe Connect — Standard accounts for agency client billing
// ============================================================================

interface ConnectAccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

/**
 * Create a Standard Stripe Connect account for an agency.
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
    type: 'standard',
    email,
    metadata: { agency_id: agencyId },
    business_profile: {
      name: (agency as { name: string }).name,
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

/**
 * Create an invoice on the agency's connected account to bill a client.
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

  // Create the invoice
  const invoice = await stripe.invoices.create(
    {
      customer: stripeCustomerId,
      collection_method: 'send_invoice',
      days_until_due: 30,
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
