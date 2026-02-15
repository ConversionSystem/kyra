import Stripe from 'stripe';
import { stripe, planFromPriceId } from './config';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// ============================================================================
// Stripe Webhook Helpers
// ============================================================================

/**
 * Verify and construct a Stripe webhook event from raw body + signature.
 */
export function verifyStripeWebhook(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  return stripe.webhooks.constructEvent(body, signature, secret);
}

/**
 * Handle `invoice.paid` — record billing entry in agency_billing.
 */
export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const supabase = createServiceClientWithoutCookies();

  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id ?? null;

  if (!customerId) return;

  // Find agency by stripe_customer_id
  const { data: agency } = await supabase
    .from('agencies')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!agency) {
    console.warn(`[stripe webhook] No agency found for customer ${customerId}`);
    return;
  }

  const agencyId = (agency as { id: string }).id;

  // Determine billing type from invoice metadata or line items
  let billingType: 'subscription' | 'client_fee' | 'credit_topup' = 'subscription';
  const clientId: string | null = (invoice.metadata?.client_id as string) ?? null;

  if (clientId) {
    billingType = 'client_fee';
  }

  const amountCents = invoice.amount_paid ?? 0;

  await supabase.from('agency_billing').insert({
    agency_id: agencyId,
    client_id: clientId,
    type: billingType,
    amount_cents: amountCents,
    stripe_invoice_id: invoice.id,
  });
}

/**
 * Handle `customer.subscription.updated` — sync plan in DB.
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = createServiceClientWithoutCookies();

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, plan')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!agency) {
    console.warn(`[stripe webhook] No agency found for customer ${customerId}`);
    return;
  }

  const agencyId = (agency as { id: string }).id;

  // Determine plan from subscription items
  for (const item of subscription.items.data) {
    const priceId = typeof item.price === 'string' ? item.price : item.price.id;
    const plan = planFromPriceId(priceId);
    if (plan) {
      await supabase
        .from('agencies')
        .update({ plan, updated_at: new Date().toISOString() })
        .eq('id', agencyId);
      break;
    }
  }
}

/**
 * Handle `customer.subscription.deleted` — downgrade agency to starter.
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = createServiceClientWithoutCookies();

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  const { data: agency } = await supabase
    .from('agencies')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!agency) return;

  const agencyId = (agency as { id: string }).id;

  await supabase
    .from('agencies')
    .update({ plan: 'starter', updated_at: new Date().toISOString() })
    .eq('id', agencyId);
}

/**
 * Handle `account.updated` (Connect) — update connect readiness on agency.
 */
export async function handleConnectAccountUpdated(
  account: Stripe.Account
): Promise<void> {
  const supabase = createServiceClientWithoutCookies();

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, settings')
    .eq('stripe_connect_account_id', account.id)
    .single();

  if (!agency) {
    console.warn(`[stripe webhook] No agency found for connect account ${account.id}`);
    return;
  }

  const agencyData = agency as { id: string; settings: Record<string, unknown> };

  // Store connect status in agency settings
  const updatedSettings = {
    ...agencyData.settings,
    stripe_connect_charges_enabled: account.charges_enabled ?? false,
    stripe_connect_payouts_enabled: account.payouts_enabled ?? false,
    stripe_connect_details_submitted: account.details_submitted ?? false,
  };

  await supabase
    .from('agencies')
    .update({ settings: updatedSettings, updated_at: new Date().toISOString() })
    .eq('id', agencyData.id);
}
