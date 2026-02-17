/**
 * Kyra Credits-Based Billing System
 * 
 * Credit costs per action:
 *   - Simple chat: 1 credit
 *   - Web search + response: 2 credits
 *   - Deep research (sub-agent): 5 credits
 *   - File analysis: 3 credits
 *   - Voice transcription: 2 credits
 *   - Voice TTS response: 2 credits
 *   - Calendar/reminder: 0 credits (free)
 *   - Memory operations: 0 credits (free)
 * 
 * Margin targets: 70%+ on all paid plans
 */

export type Plan = 'free' | 'starter' | 'business' | 'max';

export type CreditAction =
  | 'chat'              // 1 credit
  | 'web_search'        // 2 credits
  | 'deep_research'     // 5 credits
  | 'file_analysis'     // 3 credits
  | 'image_analysis'    // 3 credits
  | 'voice_transcribe'  // 2 credits
  | 'voice_tts'         // 2 credits
  | 'calendar'          // 0 credits
  | 'reminder'          // 0 credits
  | 'memory';           // 0 credits

export interface PlanConfig {
  name: string;
  price: number;
  creditsPerMonth: number;
  features: string[];
  highlighted?: boolean;
  cta: string;
  href: string;
}

export const CREDIT_COSTS: Record<CreditAction, number> = {
  chat: 1,
  web_search: 2,
  deep_research: 5,
  file_analysis: 3,
  image_analysis: 3,
  voice_transcribe: 2,
  voice_tts: 2,
  calendar: 0,
  reminder: 0,
  memory: 0,
};

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    name: 'Free',
    price: 0,
    creditsPerMonth: 100,
    features: [
      '100 credits/month',
      'Basic chat',
      'Web interface',
      'Basic memory',
    ],
    cta: 'Get Started',
    href: '/signup',
  },
  starter: {
    name: 'Lite',
    price: 99,
    creditsPerMonth: 500,
    features: [
      '500 credits/month',
      'All chat features',
      'Web search & research',
      'WhatsApp + Telegram',
      'Google Calendar',
      'Full memory',
    ],
    highlighted: true,
    cta: 'Start Free Trial',
    href: '/signup?plan=starter',
  },
  business: {
    name: 'Business',
    price: 100,
    creditsPerMonth: 3000,
    features: [
      '3,000 credits/month',
      'Everything in Lite',
      'AI sub-agents for complex tasks',
      'Priority response times',
      'Email integration',
      'Custom instructions',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    href: '/signup?plan=business',
  },
  max: {
    name: 'Max',
    price: 200,
    creditsPerMonth: 8000,
    features: [
      '8,000 credits/month',
      'Everything in Business',
      'Unlimited memory',
      'Dedicated AI workforce',
      'API access',
      'Custom integrations',
      'Dedicated support + SLA',
    ],
    cta: 'Contact Sales',
    href: '/signup?plan=max',
  },
};

/**
 * Get credit limit for a plan
 */
export function getPlanLimit(plan: Plan): number {
  return PLANS[plan]?.creditsPerMonth || PLANS.free.creditsPerMonth;
}

/**
 * Get the credit cost for an action
 */
export function getCreditCost(action: CreditAction): number {
  return CREDIT_COSTS[action] ?? 1;
}

/**
 * Check if user has enough credits for an action
 */
export function hasCreditsFor(plan: Plan, currentUsage: number, action: CreditAction): boolean {
  const limit = getPlanLimit(plan);
  const cost = getCreditCost(action);
  return (currentUsage + cost) <= limit;
}

/**
 * Legacy compatibility — checks if within overall credit limit
 */
export function isWithinLimit(plan: Plan, currentUsage: number): boolean {
  const limit = getPlanLimit(plan);
  return currentUsage < limit;
}

/**
 * Get usage percentage
 */
export function getUsagePercentage(plan: Plan, currentUsage: number): number {
  const limit = getPlanLimit(plan);
  return Math.min(100, Math.round((currentUsage / limit) * 100));
}

/**
 * Determine the credit action type from a chat message context
 */
export function classifyChatAction(opts: {
  hasWebSearch?: boolean;
  hasSubAgent?: boolean;
  hasFileAnalysis?: boolean;
  hasImageAnalysis?: boolean;
  isCalendar?: boolean;
  isReminder?: boolean;
}): CreditAction {
  if (opts.isCalendar) return 'calendar';
  if (opts.isReminder) return 'reminder';
  if (opts.hasSubAgent) return 'deep_research';
  if (opts.hasImageAnalysis) return 'image_analysis';
  if (opts.hasFileAnalysis) return 'file_analysis';
  if (opts.hasWebSearch) return 'web_search';
  return 'chat';
}
