import type Stripe from 'stripe';
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
  let updatedPlan: string | null = null;

  // Determine plan from subscription items
  for (const item of subscription.items.data) {
    const priceId = typeof item.price === 'string' ? item.price : item.price.id;
    const plan = planFromPriceId(priceId);
    if (plan) {
      await supabase
        .from('agencies')
        .update({ plan, updated_at: new Date().toISOString() })
        .eq('id', agencyId);
      updatedPlan = plan;
      break;
    }
  }

  // Mark referral as converted if this agency was referred and just upgraded
  if (updatedPlan && updatedPlan !== 'free') {
    await supabase
      .from('agency_referrals')
      .update({ status: 'converted', updated_at: new Date().toISOString() })
      .eq('referred_id', agencyId)
      .eq('status', 'signed_up');
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
    .update({ plan: 'free', updated_at: new Date().toISOString() })
    .eq('id', agencyId);
}

/**
 * Handle `checkout.session.completed` — upgrade plan OR activate voice addon.
 *
 * This is the critical safety net: if customer.subscription.updated fires
 * before the agency row is found (race condition), or if planFromPriceId()
 * returns null due to a misconfigured env var, the plan upgrade still happens
 * here because we store the plan name directly in session metadata.
 */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const agencyId = session.metadata?.agency_id;
  if (!agencyId) return;

  const addon = session.metadata?.addon;
  const plan = session.metadata?.plan as string | undefined;

  const supabase = createServiceClientWithoutCookies();

  // ── Plan upgrade ──────────────────────────────────────────────────────────
  if (plan && plan !== 'voice' && session.payment_status === 'paid') {
    // Validate it's a known plan before writing
    const validPlans = ['solo_pro', 'starter', 'pro', 'scale'];
    if (validPlans.includes(plan)) {
      const { data: current } = await supabase
        .from('agencies')
        .select('plan')
        .eq('id', agencyId)
        .single();

      const currentPlan = (current as { plan: string } | null)?.plan ?? 'free';

      // Only upgrade, never downgrade via checkout
      const planRank: Record<string, number> = { free: 0, solo_pro: 1, starter: 2, pro: 3, scale: 4 };
      if ((planRank[plan] ?? 0) > (planRank[currentPlan] ?? 0)) {
        await supabase
          .from('agencies')
          .update({ plan, updated_at: new Date().toISOString() })
          .eq('id', agencyId);

        console.log(`[stripe webhook] Plan upgraded: ${currentPlan} → ${plan} for agency ${agencyId}`);
      } else {
        console.log(`[stripe webhook] Checkout plan (${plan}) not higher than current (${currentPlan}) — skipping`);
      }
    } else {
      console.warn(`[stripe webhook] Unknown plan in checkout metadata: ${plan}`);
    }
  }

  // ── Voice add-on ──────────────────────────────────────────────────────────
  if (addon === 'voice') {
    const { data: agency } = await supabase
      .from('agencies')
      .select('settings')
      .eq('id', agencyId)
      .single();

    const settings = ((agency as { settings: Record<string, unknown> } | null)?.settings ?? {}) as Record<string, unknown>;
    settings.voice_addon = true;

    await supabase
      .from('agencies')
      .update({ settings, updated_at: new Date().toISOString() })
      .eq('id', agencyId);

    // Ensure voice_usage row exists with 300 min limit for current month
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await supabase
      .from('voice_usage')
      .upsert(
        { agency_id: agencyId, month, minute_limit: 300 },
        { onConflict: 'agency_id,month' },
      );

    console.log(`[stripe webhook] Voice addon activated for agency ${agencyId}`);
  }
}

/**
 * Handle `account.updated` (Connect) — update connect readiness on agency.
 * Delegates to syncConnectAccountStatus in connect.ts for DRY logic.
 */
export async function handleConnectAccountUpdated(
  account: Stripe.Account
): Promise<void> {
  const { syncConnectAccountStatus } = await import('./connect');
  await syncConnectAccountStatus({
    id: account.id,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
  });
}
