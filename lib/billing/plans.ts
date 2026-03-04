/**
 * Kyra Plan Configuration
 *
 * Plans are based on the number of client AI workers an agency can deploy.
 * Each plan has a hard client limit enforced at creation time.
 */

export type Plan = 'free' | 'business_starter' | 'starter' | 'pro' | 'scale';

export interface PlanConfig {
  name: string;
  price: number;            // USD/month
  maxClients: number;       // max client AI workers
  description: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  badgeColor?: string;
  cta: string;
  stripePriceKey: string;   // key in STRIPE_PRICE_IDS
}

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    name: 'Free Trial',
    price: 0,
    maxClients: 1,
    description: '14-day trial to test the platform. Upgrade to keep your AI worker running.',
    features: [
      '1 client AI worker (14-day trial)',
      '21 industry templates',
      'Telegram, SMS, web chat',
      'GHL integration',
    ],
    badge: 'TRIAL',
    badgeColor: 'bg-gray-100 text-gray-600',
    cta: 'Start Trial',
    stripePriceKey: 'free',
  },
  business_starter: {
    name: 'Business Starter',
    price: 49,
    maxClients: 1,
    description: 'Perfect for agencies deploying their first AI worker.',
    features: [
      '1 client AI worker',
      '21 industry templates',
      'Telegram, SMS, web chat',
      'GHL integration',
      'BYOK (Bring Your Own AI Keys)',
      'AI Sales Pipeline',
      'Lead discovery & enrichment',
      'Auto-qualifying AI worker',
      'Client conversation history',
    ],
    badge: 'STARTER',
    badgeColor: 'bg-green-100 text-green-700',
    cta: 'Start for $49/mo',
    stripePriceKey: 'business_starter',
  },
  starter: {
    name: 'Lite',
    price: 99,
    maxClients: 3,
    description: 'Launch your AI agency with your first 3 clients.',
    features: [
      '3 client AI workers',
      'Everything in Business Starter',
      'Full analytics dashboard',
      'AI Sales Pipeline (unlimited campaigns)',
      'Proactive lead outreach',
      'Smart escalation alerts',
      'Weekly performance reports',
    ],
    badge: 'LITE',
    badgeColor: 'bg-blue-100 text-blue-700',
    cta: 'Start Lite',
    stripePriceKey: 'starter',
  },
  pro: {
    name: 'Pro',
    price: 249,
    maxClients: 10,
    description: 'For growing agencies managing multiple clients.',
    features: [
      '10 client AI workers',
      'Everything in Lite',
      'White-label branding',
      'AI lead discovery, enrichment & closing',
      'Custom AI personalities',
      'Priority support',
      'Custom templates',
      'Revenue tracking dashboard',
      'Review queue (human-in-the-loop)',
    ],
    highlighted: true,
    badge: 'MOST POPULAR',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    cta: 'Start Pro',
    stripePriceKey: 'pro',
  },
  scale: {
    name: 'Scale',
    price: 499,
    maxClients: 30,
    description: 'Built for high-volume agencies running 30+ AI workers.',
    features: [
      '30 client AI workers',
      'Everything in Pro',
      'AI Sales Pipeline (unlimited + priority)',
      'AI lead discovery, enrichment & auto-closing',
      'Dedicated infrastructure',
      'Custom domain per agency',
      'SLA uptime guarantee',
      'Dedicated Slack support',
      'API access',
      'Outbound webhooks',
      'Alert monitoring',
    ],
    badge: 'FOR AGENCIES',
    badgeColor: 'bg-purple-100 text-purple-700',
    cta: 'Start Scale',
    stripePriceKey: 'scale',
  },
};

/** All valid plan IDs */
export const PLAN_IDS = Object.keys(PLANS) as Plan[];

/** Get the max clients allowed for a plan */
export function getPlanClientLimit(plan: Plan | string): number {
  return PLANS[plan as Plan]?.maxClients ?? PLANS.free.maxClients;
}

/** Check if an agency can add another client given their current count */
export function canAddClient(plan: Plan | string, currentClientCount: number): boolean {
  return currentClientCount < getPlanClientLimit(plan);
}

/** Get plan display name */
export function getPlanName(plan: Plan | string): string {
  return PLANS[plan as Plan]?.name ?? plan;
}

/** Get plan price */
export function getPlanPrice(plan: Plan | string): number {
  return PLANS[plan as Plan]?.price ?? 0;
}

// ── Legacy compatibility (some files still reference credits) ─────────────────

/** @deprecated — plans are now client-count based, not credit-based */
export function getPlanLimit(plan: Plan | string): number {
  return getPlanClientLimit(plan);
}

/** @deprecated */
export function isWithinLimit(plan: Plan | string, currentUsage: number): boolean {
  return canAddClient(plan, currentUsage);
}

// ── Backward-compatible credit stubs (plans are now client-count based) ───────
// These are kept so existing chat/voice routes compile without changes.
// Credits are no longer enforced; all calls return permissive values.

export type CreditAction = 'chat' | 'web_search' | 'deep_research' | 'file_analysis'
  | 'image_analysis' | 'voice_transcribe' | 'voice_tts' | 'calendar' | 'reminder' | 'memory';

export const CREDIT_COSTS: Record<CreditAction, number> = {
  chat: 1, web_search: 2, deep_research: 5, file_analysis: 3,
  image_analysis: 3, voice_transcribe: 2, voice_tts: 2, calendar: 0, reminder: 0, memory: 0,
};

/** @deprecated — credits no longer enforced; always returns 1 */
export function getCreditCost(_action: CreditAction): number { return 1; }

/** @deprecated — usage percentage based on clients, not credits */
export function getUsagePercentage(_plan: Plan | string, _currentUsage: number): number { return 0; }

/** @deprecated — classify chat action; kept for API compat */
export function classifyChatAction(opts: {
  hasWebSearch?: boolean; hasSubAgent?: boolean; hasFileAnalysis?: boolean;
  hasImageAnalysis?: boolean; isCalendar?: boolean; isReminder?: boolean;
}): CreditAction {
  if (opts.isCalendar) return 'calendar';
  if (opts.isReminder) return 'reminder';
  if (opts.hasSubAgent) return 'deep_research';
  if (opts.hasImageAnalysis) return 'image_analysis';
  if (opts.hasFileAnalysis) return 'file_analysis';
  if (opts.hasWebSearch) return 'web_search';
  return 'chat';
}
