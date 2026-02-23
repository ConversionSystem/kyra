// ============================================================================
// POST /api/webhooks/stripe
//
// Handles Stripe webhook events to keep agency plan and subscription data
// in sync with Stripe after payments, upgrades, cancellations, etc.
//
// Required env vars:
//   STRIPE_SECRET_KEY         — Stripe secret key
//   STRIPE_WEBHOOK_SECRET     — Webhook signing secret (whsec_...)
//
// Stripe events handled:
//   checkout.session.completed        — Payment succeeded, activate plan
//   customer.subscription.updated     — Plan upgrade/downgrade
//   customer.subscription.deleted     — Subscription cancelled → free
//   invoice.payment_failed            — Flag payment failure in settings
//   invoice.payment_succeeded         — Clear any payment failure flags
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, planFromPriceId, type StripePlan } from '@/lib/stripe/config';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// Stripe requires the raw body for signature verification
export const runtime = 'nodejs';

// ── Helpers ────────────────────────────────────────────────────────────────

const db = () => createServiceClientWithoutCookies();

async function updateAgencyPlan(
  agencyId: string,
  plan: StripePlan | 'free',
  subscriptionId?: string | null,
  extra?: Record<string, unknown>
) {
  const updates: Record<string, unknown> = { plan, ...extra };
  if (subscriptionId !== undefined) {
    updates.stripe_subscription_id = subscriptionId;
  }

  const { error } = await db()
    .from('agencies')
    .update(updates)
    .eq('id', agencyId);

  if (error) {
    console.error('[stripe/webhook] Failed to update agency plan:', error);
    throw error;
  }

  console.log(`[stripe/webhook] Agency ${agencyId} → plan=${plan}`, subscriptionId ? `sub=${subscriptionId}` : '');
}

async function agencyIdFromCustomer(customerId: string): Promise<string | null> {
  const { data } = await db()
    .from('agencies')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  return data?.id ?? null;
}

async function agencyIdFromSubscription(subscriptionId: string): Promise<string | null> {
  const { data } = await db()
    .from('agencies')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();
  return data?.id ?? null;
}

// ── Event handlers ─────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription') return;

  const agencyId = session.metadata?.agency_id;
  const plan = session.metadata?.plan as StripePlan | undefined;
  const subscriptionId = session.subscription as string | null;

  if (!agencyId || !plan) {
    console.warn('[stripe/webhook] checkout.session.completed missing metadata', session.id);
    return;
  }

  // Also store the customer id in case it wasn't set (defensive)
  const extra: Record<string, unknown> = {};
  if (session.customer && typeof session.customer === 'string') {
    extra.stripe_customer_id = session.customer;
  }

  await updateAgencyPlan(agencyId, plan, subscriptionId, extra);
  console.log(`[stripe/webhook] Checkout complete — agency=${agencyId} plan=${plan} sub=${subscriptionId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Find agency by subscription ID or by customer ID
  const agencyId =
    (await agencyIdFromSubscription(subscription.id)) ??
    (await agencyIdFromCustomer(subscription.customer as string));

  if (!agencyId) {
    console.warn('[stripe/webhook] subscription.updated — no agency found for sub', subscription.id);
    return;
  }

  // Determine plan from the first price item
  const priceId = subscription.items.data[0]?.price?.id;
  const plan: StripePlan | 'free' = priceId ? (planFromPriceId(priceId) ?? 'free') : 'free';

  // Map Stripe status to our flags
  const isActive = ['active', 'trialing'].includes(subscription.status);
  const resolvedPlan: StripePlan | 'free' = isActive ? plan : 'free';

  await updateAgencyPlan(agencyId, resolvedPlan, subscription.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const agencyId =
    (await agencyIdFromSubscription(subscription.id)) ??
    (await agencyIdFromCustomer(subscription.customer as string));

  if (!agencyId) {
    console.warn('[stripe/webhook] subscription.deleted — no agency found for sub', subscription.id);
    return;
  }

  // Downgrade to free, clear subscription ID
  await updateAgencyPlan(agencyId, 'free', null);
  console.log(`[stripe/webhook] Subscription cancelled — agency=${agencyId} → free`);
}

async function mergeAgencySettings(agencyId: string, patch: Record<string, unknown>) {
  const { data: current } = await db()
    .from('agencies')
    .select('settings')
    .eq('id', agencyId)
    .single();

  const existing = (current?.settings ?? {}) as Record<string, unknown>;
  const merged = { ...existing, ...patch };

  const { error } = await db()
    .from('agencies')
    .update({ settings: merged })
    .eq('id', agencyId);

  if (error) console.error('[stripe/webhook] Failed to merge agency settings:', error);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const agencyId = await agencyIdFromCustomer(customerId);
  if (!agencyId) return;

  // Flag the account — don't downgrade yet (Stripe retries automatically)
  await mergeAgencySettings(agencyId, {
    stripe_payment_status: 'past_due',
    stripe_last_payment_failure: new Date().toISOString(),
    stripe_invoice_url: invoice.hosted_invoice_url,
  });
  console.log(`[stripe/webhook] Payment failed — agency=${agencyId}`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const agencyId = await agencyIdFromCustomer(customerId);
  if (!agencyId) return;

  // Clear any past_due flags
  await mergeAgencySettings(agencyId, {
    stripe_payment_status: 'active',
    stripe_last_payment_failure: null,
    stripe_invoice_url: null,
  });
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
  }

  // Get raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // Verify webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe/webhook] Signature verification failed:', message);
    return NextResponse.json({ error: `Webhook signature invalid: ${message}` }, { status: 400 });
  }

  // Route to handler
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      default:
        // Ignore unhandled events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[stripe/webhook] Handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
