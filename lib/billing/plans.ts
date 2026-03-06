/**
 * Kyra Plan Configuration
 *
 * Plans are based on the number of client AI workers an agency can deploy.
 * Each plan has a hard client limit enforced at creation time.
 */

export type Plan = 'free' | 'starter' | 'pro' | 'scale';

export interface PlanConfig {
  name: string;
  price: number;            // USD/month
  maxClients: number;       // max client AI workers
  monthlyCredits: number;   // platform credits included per month (0 = BYOK only)
  trialDays: number;        // free trial length in days
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
    maxClients: 999,      // Unlimited during trial
    monthlyCredits: 500,  // Same as Lite so they can actually test
    trialDays: 7,
    description: 'Full access to every feature for 7 days. No limits.',
    features: [
      // AI Worker
      'Unlimited AI workers (7-day trial)',
      '21 industry AI templates',
      'Custom AI personality & name',
      'AI auto-training from website',
      'Knowledge base builder',
      'AI capabilities (web search, image understanding, file processing)',
      'Multi-channel: SMS, Telegram, WhatsApp, web chat, email',
      'Voice AI (inbound & outbound calls)',
      'Smart escalation to human',
      'Conversation inbox with real-time refresh',
      // CRM
      'Full CRM — contacts, companies, deals',
      'AI-powered contact intelligence',
      'Pipeline management',
      'Contact segments & tags',
      'Task management',
      'Lead capture from web chat',
      'Import / export contacts',
      'CRM analytics',
      // Agency
      'GHL integration',
      'Client portal access',
      'Analytics & usage dashboard',
      'Proactive AI automations',
      'Event triggers',
      'Referral program',
    ],
    badge: 'TRIAL',
    badgeColor: 'bg-gray-100 text-gray-600',
    cta: 'Start Free Trial',
    stripePriceKey: 'free',
  },
  starter: {
    name: 'Lite',
    price: 99,
    maxClients: 3,
    monthlyCredits: 500,
    trialDays: 7,
    description: 'Launch your AI agency with up to 3 clients.',
    features: [
      // AI Worker
      '3 client AI workers',
      '500 platform credits / month',
      '21 industry AI templates',
      'Custom AI personality & name',
      'AI auto-training from website',
      'Knowledge base builder',
      'AI capabilities (web search, image understanding, file processing)',
      'Multi-channel: SMS, Telegram, WhatsApp, web chat, email',
      'Voice AI (inbound & outbound calls)',
      'Smart escalation to human',
      'Conversation inbox with real-time refresh',
      // CRM
      'Full CRM — contacts, companies, deals',
      'AI-powered contact intelligence',
      'Pipeline management',
      'Contact segments & tags',
      'Task management',
      'Lead capture from web chat',
      'Import / export contacts',
      'CRM analytics',
      // Agency
      'GHL integration',
      'Client portal access',
      'Analytics & usage dashboard',
      'Proactive AI automations',
      'Event triggers',
      'Referral program',
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
    monthlyCredits: 1500,
    trialDays: 7,
    description: 'For growing agencies managing multiple clients.',
    features: [
      // AI Worker
      '10 client AI workers',
      '1,500 platform credits / month',
      'Everything in Lite',
      // Pro extras
      'White-label branding (your logo & colors)',
      'Custom domain per client portal',
      'AI Teams — multi-agent routing',
      'Revenue tracking dashboard',
      'Review queue (human-in-the-loop)',
      'AI lead discovery, enrichment & closing',
      'Outbound AI sales campaigns',
      'Custom AI templates',
      'Priority support',
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
    monthlyCredits: 2500,
    trialDays: 7,
    description: 'Built for high-volume agencies running 30+ AI workers.',
    features: [
      // AI Worker
      '30 client AI workers',
      '2,500 platform credits / month',
      'Everything in Pro',
      // Scale extras
      'Dedicated infrastructure per agency',
      'SLA uptime guarantee',
      'OpenAI-compatible API endpoint',
      'Outbound webhooks & event triggers',
      'Alert monitoring',
      'Dedicated Slack support channel',
      'Early access to new features',
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
