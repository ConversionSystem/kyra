// ============================================================================
// Kyra Credits — Welcome Grant
// New agencies get $2 in free credits to test the platform.
// Enough for ~200 AI conversations. Not enough to run a real business.
// ============================================================================

export const WELCOME_CREDITS = 200; // $2 worth at $0.01/credit
export const WELCOME_CREDIT_DESCRIPTION = 'Welcome gift — $2 in free credits to test Kyra 🎁';

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
    credits: 1000,
    bonusCredits: 0,
    totalCredits: 1000,
    bonusPct: 0,
    pricePerCredit: 0.01,
    badge: null,
    badgeColor: '',
    highlighted: false,
    description: 'Perfect for getting started.',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 20,
    credits: 2000,
    bonusCredits: 200,
    totalCredits: 2200,
    bonusPct: 10,
    pricePerCredit: 0.0091,
    badge: '+10% bonus',
    badgeColor: 'bg-green-100 text-green-700',
    highlighted: false,
    description: 'Great for growing agencies.',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 40,
    credits: 4000,
    bonusCredits: 800,
    totalCredits: 4800,
    bonusPct: 20,
    pricePerCredit: 0.0083,
    badge: 'Best Value',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    highlighted: true,
    description: 'Most popular. 20% more credits free.',
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 100,
    credits: 10000,
    bonusCredits: 3000,
    totalCredits: 13000,
    bonusPct: 30,
    pricePerCredit: 0.0077,
    badge: '+30% bonus',
    badgeColor: 'bg-amber-100 text-amber-700',
    highlighted: false,
    description: 'For high-volume agencies.',
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 250,
    credits: 25000,
    bonusCredits: 10000,
    totalCredits: 35000,
    bonusPct: 40,
    pricePerCredit: 0.0071,
    badge: '+40% bonus',
    badgeColor: 'bg-purple-100 text-purple-700',
    highlighted: false,
    description: 'Maximum value for large agencies.',
  },
];

export function getCreditPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}
