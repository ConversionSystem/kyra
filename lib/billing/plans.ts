/**
 * Kyra Plan Configuration
 *
 * Plans are based on the number of client AI workers an agency can deploy.
 * Each plan has a hard client limit enforced at creation time.
 */

export type Plan = 'free' | 'solo_pro' | 'starter' | 'pro' | 'scale';

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
    name: 'Free (Beta)',
    price: 0,
    maxClients: 1,
    monthlyCredits: 0,
    trialDays: 0,         // No expiry during beta
    description: 'Free forever during beta. No credit card required.',
    features: [
      '1 AI worker',
      '50 platform credits (welcome gift)',
      'Multi-channel messaging (SMS, Telegram, web chat)',
      'Custom AI personality & name',
      'AI auto-training from website',
      'Knowledge base builder',
      'Smart escalation to human',
      'Conversation inbox',
      'Full CRM — contacts, companies, deals',
      'GHL integration',
      'Referral program (earn credits per referral)',
    ],
    badge: 'BETA',
    badgeColor: 'bg-green-100 text-green-700',
    cta: 'Get Started Free',
    stripePriceKey: 'free',
  },
  solo_pro: {
    name: 'Solo Pro',
    price: 39,
    maxClients: 1,
    monthlyCredits: 200,
    trialDays: 0,
    description: 'Your personal AI worker — run it for your own business with no limits.',
    features: [
      '1 AI worker (no expiry)',
      '200 platform credits / month',
      'Multi-channel messaging (SMS, Telegram, web chat)',
      'Full CRM — contacts, deals, pipeline',
      'GHL integration',
      'AI auto-training from your website',
      'Conversation inbox',
      'Analytics dashboard',
      'Priority email support',
      'Referral program (earn credits per referral)',
    ],
    badge: 'SOLO PRO',
    badgeColor: 'bg-violet-100 text-violet-700',
    cta: 'Upgrade to Solo Pro',
    stripePriceKey: 'solo_pro',
  },
  starter: {
    name: 'Lite',
    price: 99,
    maxClients: 3,
    monthlyCredits: 500,
    trialDays: 0,
    description: 'Launch your AI agency with your first 3 clients.',
    features: [
      '3 client AI workers',
      '500 platform credits / month',
      'Client management dashboard',
      '21 industry templates',
      'Multi-channel messaging (SMS, Telegram, web chat)',
      'GHL integration',
      'Proactive AI automations',
      'AI Sales Pipeline',
      'Smart escalation alerts',
      'Full analytics dashboard',
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
    monthlyCredits: 1500,
    trialDays: 0,
    description: 'For growing agencies managing multiple clients.',
    features: [
      '10 client AI workers',
      '1,500 platform credits / month',
      'Everything in Lite',
      'White-label branding',
      'Custom AI personalities',
      'AI lead discovery, enrichment & closing',
      'Custom templates',
      'Revenue tracking dashboard',
      'Review queue (human-in-the-loop)',
      'Advanced ROI & performance dashboard',
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
    trialDays: 0,
    description: 'Built for high-volume agencies running 30+ AI workers.',
    features: [
      '30 client AI workers',
      '2,500 platform credits / month',
      'Everything in Pro',
      'Dedicated infrastructure',
      'Custom domain per agency',
      'AI Sales Pipeline (unlimited + priority)',
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

// ── Annual Pricing ────────────────────────────────────────────────────────────

/** Annual pricing for each plan — monthly equivalent when billed yearly (20% off) */
export const ANNUAL_PRICES: Partial<Record<Plan, { monthly: number; annualTotal: number; savings: number }>> = {
  solo_pro: { monthly: 29,  annualTotal: 348,  savings: 120  },
  starter:  { monthly: 79,  annualTotal: 948,  savings: 240  },
  pro:      { monthly: 199, annualTotal: 2388, savings: 600  },
  scale:    { monthly: 399, annualTotal: 4788, savings: 1200 },
};

// ── Voice Add-on ──────────────────────────────────────────────────────────────

/** Voice AI add-on — 500 minutes/month of inbound + outbound AI calling */
export const VOICE_ADDON = {
  name: 'Voice AI Add-on',
  price: 79,
  annualMonthly: 63,
  annualTotal: 756,
  annualSavings: 192,
  description: '500 minutes/month of AI phone calls — inbound & outbound. Add to any plan.',
  features: [
    '500 AI calling minutes / month',
    'Inbound call answering (24/7)',
    'Outbound AI call campaigns',
    'Call transcripts & recordings',
    'Auto-escalation to human',
    'Works alongside any Kyra plan',
  ],
  stripePriceKey: 'voice_addon',
  stripePriceKeyAnnual: 'voice_addon_annual',
};
