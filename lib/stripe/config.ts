import Stripe from 'stripe';

// ============================================================================
// Stripe Client
// ============================================================================

// Stripe is optional during beta — only initialized when key is present
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      // @ts-expect-error — Stripe SDK types lag behind latest API version
      apiVersion: '2025-04-30.basil',
      typescript: true,
    })
  : (null as unknown as Stripe); // null during beta — callers should guard

// ============================================================================
// Price IDs — set via env vars, created in Stripe Dashboard
// ============================================================================

export type StripePlan = 'business_starter' | 'starter' | 'pro' | 'scale';

interface PriceConfig {
  priceId: string;
}

export const STRIPE_PRICES: Record<StripePlan | 'per_client', PriceConfig> = {
  business_starter: { priceId: process.env.STRIPE_BUSINESS_STARTER_PRICE_ID ?? '' },
  starter: { priceId: process.env.STRIPE_STARTER_PRICE_ID ?? '' },
  pro: { priceId: process.env.STRIPE_PRO_PRICE_ID ?? '' },
  scale: { priceId: process.env.STRIPE_SCALE_PRICE_ID ?? '' },
  per_client: { priceId: process.env.STRIPE_PER_CLIENT_PRICE_ID ?? '' }, // metered: $19/client/mo
};

/**
 * Reverse-lookup: given a Stripe price ID, return the plan name.
 */
export function planFromPriceId(priceId: string): StripePlan | null {
  for (const [plan, config] of Object.entries(STRIPE_PRICES)) {
    if (plan !== 'per_client' && config.priceId === priceId) {
      return plan as StripePlan;
    }
  }
  return null;
}
