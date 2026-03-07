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

export type StripePlan = 'starter' | 'pro' | 'scale' | 'solo_pro';

type StripePriceKey =
  | StripePlan
  | 'solo_pro_annual'
  | 'starter_annual'
  | 'pro_annual'
  | 'scale_annual'
  | 'voice_addon'
  | 'voice_addon_annual'
  | 'per_client';

interface PriceConfig {
  priceId: string;
}

export const STRIPE_PRICES: Record<StripePriceKey, PriceConfig> = {
  // Monthly plans
  solo_pro:           { priceId: process.env.STRIPE_SOLO_PRO_PRICE_ID ?? '' },
  starter:            { priceId: process.env.STRIPE_STARTER_PRICE_ID ?? '' },
  pro:                { priceId: process.env.STRIPE_PRO_PRICE_ID ?? '' },
  scale:              { priceId: process.env.STRIPE_SCALE_PRICE_ID ?? '' },
  // Annual plans
  solo_pro_annual:    { priceId: process.env.STRIPE_SOLO_PRO_ANNUAL_PRICE_ID ?? '' },
  starter_annual:     { priceId: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID ?? '' },
  pro_annual:         { priceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? '' },
  scale_annual:       { priceId: process.env.STRIPE_SCALE_ANNUAL_PRICE_ID ?? '' },
  // Add-ons
  voice_addon:        { priceId: process.env.STRIPE_VOICE_ADDON_PRICE_ID ?? '' },
  voice_addon_annual: { priceId: process.env.STRIPE_VOICE_ADDON_ANNUAL_PRICE_ID ?? '' },
  // Metered (legacy)
  per_client:         { priceId: process.env.STRIPE_PER_CLIENT_PRICE_ID ?? '' },
};

/** Map annual price keys back to the base plan (for webhook handling) */
const ANNUAL_TO_BASE: Partial<Record<StripePriceKey, StripePlan>> = {
  solo_pro_annual: 'solo_pro',
  starter_annual:  'starter',
  pro_annual:      'pro',
  scale_annual:    'scale',
};

/**
 * Reverse-lookup: given a Stripe price ID, return the plan name.
 * Annual price IDs resolve to the base plan (e.g. starter_annual → 'starter').
 */
export function planFromPriceId(priceId: string): StripePlan | null {
  for (const [key, config] of Object.entries(STRIPE_PRICES)) {
    if (config.priceId && config.priceId === priceId) {
      // If this is an annual key, return the base plan
      const base = ANNUAL_TO_BASE[key as StripePriceKey];
      if (base) return base;
      // Ignore per_client and add-ons in plan lookup
      if (key === 'per_client' || key === 'voice_addon' || key === 'voice_addon_annual') continue;
      return key as StripePlan;
    }
  }
  return null;
}
