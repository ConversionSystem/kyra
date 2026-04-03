// ============================================================================
// Kyra Credits — Welcome Grant
// New agencies get $2 in free credits to test the platform.
// Enough for ~200 AI conversations. Not enough to run a real business.
// ============================================================================

export const WELCOME_CREDITS = 50; // One-time welcome gift — enough for ~50 conversations
export const WELCOME_CREDIT_DESCRIPTION = 'Welcome gift — 50 free credits (one-time) 🎁';

// ============================================================================
// Promo Codes
// ============================================================================
export interface PromoCode {
  bonusCredits: number;
  description: string;
  trialDays: number; // 0 = use default
}

export const PROMO_CODES: Record<string, PromoCode> = {
  INDIA2026: {
    bonusCredits: 500,
    description: 'HighLevel LIVE India 2026 — 500 bonus credits 🇮🇳',
    trialDays: 60,
  },
};

export function getPromoCode(code: string): PromoCode | null {
  return PROMO_CODES[code?.toUpperCase()] ?? null;
}

// ============================================================================
// Kyra Credits — Pack Definitions
// 1 Credit = 1 AI conversation (~1,500 tokens)
// Our cost: ~0.45 credits/conv. Agency pays 1. ~55% margin.
// ============================================================================

export interface CreditPack {
  id: string;
  name: string;
  price: number;          // USD
  credits: number;        // Base credits
  bonusCredits: number;   // Bonus credits
  totalCredits: number;   // credits + bonusCredits
  bonusPct: number;       // Bonus percentage (0, 10, 20, 30, 40)
  pricePerCredit: number; // USD per credit
  badge: string | null;
  badgeColor: string;
  highlighted: boolean;
  description: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pro',
    name: 'Pro',
    price: 50,
    credits: 5000,
    bonusCredits: 0,
    totalCredits: 5000,
    bonusPct: 0,
    pricePerCredit: 0.01,
    badge: null,
    badgeColor: '',
    highlighted: false,
    description: 'Most popular for active agencies.',
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 100,
    credits: 10000,
    bonusCredits: 0,
    totalCredits: 10000,
    bonusPct: 0,
    pricePerCredit: 0.01,
    badge: 'Best $/credit',
    badgeColor: 'bg-amber-100 text-amber-700',
    highlighted: false,
    description: 'For high-volume agencies.',
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 250,
    credits: 25000,
    bonusCredits: 0,
    totalCredits: 25000,
    bonusPct: 0,
    pricePerCredit: 0.01,
    badge: 'Max Value',
    badgeColor: 'bg-purple-100 text-purple-700',
    highlighted: false,
    description: 'Maximum value for large agencies.',
  },
];

export function getCreditPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}
