import { stripe, STRIPE_PRICES, type StripePlan } from './config';
import { createServiceClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

// ============================================================================
// Subscription Management
// ============================================================================

interface AgencyRow {
  id: string;
  name: string;
  stripe_customer_id: string | null;
  owner_id: string;
}

/**
 * Create a Stripe customer and subscription for an agency.
 * Saves stripe_customer_id back to the agency row.
 */
export async function createAgencySubscription(
  agencyId: string,
  plan: StripePlan,
  email: string
): Promise<{ customerId: string; subscriptionId: string }> {
  const supabase = await createServiceClient();

  const { data: agency, error } = await supabase
    .from('agencies')
    .select('id, name, stripe_customer_id, owner_id')
    .eq('id', agencyId)
    .single();

  if (error || !agency) {
    throw new Error('Agency not found');
  }

  const agencyData = agency as AgencyRow;

  // Reuse existing customer or create a new one
  let customerId = agencyData.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      name: agencyData.name,
      metadata: { agency_id: agencyId },
    });
    customerId = customer.id;

    await supabase
      .from('agencies')
      .update({ stripe_customer_id: customerId })
      .eq('id', agencyId);
  }

  const priceId = STRIPE_PRICES[plan].priceId;
  if (!priceId) {
    throw new Error(`No price ID configured for plan: ${plan}`);
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    metadata: { agency_id: agencyId },
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });

  return { customerId, subscriptionId: subscription.id };
}

/**
 * Upgrade or downgrade an agency's plan.
 * Swaps the subscription item to the new plan's price.
 */
export async function updateAgencyPlan(
  agencyId: string,
  newPlan: StripePlan
): Promise<Stripe.Subscription> {
  const supabase = await createServiceClient();

  const { data: agency, error } = await supabase
    .from('agencies')
    .select('stripe_customer_id')
    .eq('id', agencyId)
    .single();

  if (error || !agency) {
    throw new Error('Agency not found');
  }

  const customerId = (agency as { stripe_customer_id: string | null }).stripe_customer_id;
  if (!customerId) {
    throw new Error('Agency has no Stripe customer');
  }

  // Find the active subscription
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });

  const subscription = subscriptions.data[0];
  if (!subscription) {
    throw new Error('No active subscription found');
  }

  const newPriceId = STRIPE_PRICES[newPlan].priceId;
  if (!newPriceId) {
    throw new Error(`No price ID configured for plan: ${newPlan}`);
  }

  // Find the subscription item for the current plan price (skip per_client metered items)
  const planItem = subscription.items.data.find((item) => {
    const itemPriceId = typeof item.price === 'string' ? item.price : item.price.id;
    return itemPriceId !== STRIPE_PRICES.per_client.priceId;
  });

  if (!planItem) {
    throw new Error('No plan subscription item found');
  }

  const updated = await stripe.subscriptions.update(subscription.id, {
    items: [{ id: planItem.id, price: newPriceId }],
    proration_behavior: 'create_prorations',
  });

  return updated;
}

/**
 * Cancel an agency subscription at the end of the current period.
 */
export async function cancelSubscription(agencyId: string): Promise<Stripe.Subscription> {
  const supabase = await createServiceClient();

  const { data: agency, error } = await supabase
    .from('agencies')
    .select('stripe_customer_id')
    .eq('id', agencyId)
    .single();

  if (error || !agency) {
    throw new Error('Agency not found');
  }

  const customerId = (agency as { stripe_customer_id: string | null }).stripe_customer_id;
  if (!customerId) {
    throw new Error('Agency has no Stripe customer');
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });

  const subscription = subscriptions.data[0];
  if (!subscription) {
    throw new Error('No active subscription found');
  }

  return stripe.subscriptions.update(subscription.id, {
    cancel_at_period_end: true,
  });
}

/**
 * Get the current subscription status for an agency.
 */
export async function getSubscriptionStatus(agencyId: string): Promise<{
  status: Stripe.Subscription.Status | 'none';
  plan: StripePlan | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}> {
  const supabase = await createServiceClient();

  const { data: agency, error } = await supabase
    .from('agencies')
    .select('stripe_customer_id')
    .eq('id', agencyId)
    .single();

  if (error || !agency) {
    throw new Error('Agency not found');
  }

  const customerId = (agency as { stripe_customer_id: string | null }).stripe_customer_id;
  if (!customerId) {
    return { status: 'none', plan: null, currentPeriodEnd: null, cancelAtPeriodEnd: false };
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    expand: ['data.items.data.price'],
  });

  const subscription = subscriptions.data[0];
  if (!subscription) {
    return { status: 'none', plan: null, currentPeriodEnd: null, cancelAtPeriodEnd: false };
  }

  // Determine plan from subscription item prices
  let detectedPlan: StripePlan | null = null;
  for (const item of subscription.items.data) {
    const priceId = typeof item.price === 'string' ? item.price : item.price.id;
    if (priceId === STRIPE_PRICES.starter.priceId) detectedPlan = 'starter';
    else if (priceId === STRIPE_PRICES.pro.priceId) detectedPlan = 'pro';
    else if (priceId === STRIPE_PRICES.scale.priceId) detectedPlan = 'scale';
  }

  return {
    status: subscription.status,
    plan: detectedPlan,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}
