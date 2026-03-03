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
    id: 'starter',
    name: 'Starter',
    price: 10,
    credits: 500,
    bonusCredits: 0,
    totalCredits: 500,
    bonusPct: 0,
    pricePerCredit: 0.02,
    badge: null,
    badgeColor: '',
    highlighted: false,
    description: 'Perfect for getting started.',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 25,
    credits: 1500,
    bonusCredits: 150,
    totalCredits: 1650,
    bonusPct: 10,
    pricePerCredit: 0.0152,
    badge: '+10% bonus',
    badgeColor: 'bg-green-100 text-green-700',
    highlighted: false,
    description: 'Great for growing agencies.',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 50,
    credits: 3000,
    bonusCredits: 600,
    totalCredits: 3600,
    bonusPct: 20,
    pricePerCredit: 0.0139,
    badge: 'Best Value',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    highlighted: true,
    description: 'Most popular. 20% more credits free.',
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 100,
    credits: 6000,
    bonusCredits: 1800,
    totalCredits: 7800,
    bonusPct: 30,
    pricePerCredit: 0.0128,
    badge: '+30% bonus',
    badgeColor: 'bg-amber-100 text-amber-700',
    highlighted: false,
    description: 'For high-volume agencies.',
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 250,
    credits: 15000,
    bonusCredits: 6000,
    totalCredits: 21000,
    bonusPct: 40,
    pricePerCredit: 0.0119,
    badge: '+40% bonus',
    badgeColor: 'bg-purple-100 text-purple-700',
    highlighted: false,
    description: 'Maximum value for large agencies.',
  },
];

export function getCreditPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}
