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
  monthlyWebScrapes: number; // Firecrawl web scrape allowance per month (0 = no web intelligence)
  maxTeamMembers: number;   // max specialist members per AI team (0 = teams disabled)
  trialDays: number;        // free trial length in days
  description: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  badgeColor?: string;
  cta: string;
  stripePriceKey: string;   // key in STRIPE_PRICE_IDS
  hidden?: boolean;         // hidden from new signups (legacy plan)
}

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    name: 'Free (Beta)',
    price: 0,
    maxClients: 1,
    monthlyCredits: 0,
    monthlyWebScrapes: 0,
    maxTeamMembers: 0,    // No teams on free
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
    monthlyCredits: 2000,
    monthlyWebScrapes: 0,
    maxTeamMembers: 0,    // No teams on solo
    trialDays: 0,
    hidden: true,
    description: 'Your personal AI worker — run it for your own business with no limits.',
    features: [
      '1 AI Worker powered by OpenClaw',
      '2,000 credits / month',
      'Messaging across SMS, Telegram & web chat',
      'Built-in CRM with contacts, deals & pipeline',
      'AI Templates — pick one, deploy instantly',
      'Skills — add capabilities to your AI worker',
      'Knowledge Base — teach your AI with docs & links',
      'Customer Intelligence — insights from conversations',
      'Email support',
      'Referral program — earn credits for every referral',
    ],
    badge: 'SOLO PRO',
    badgeColor: 'bg-violet-100 text-violet-700',
    cta: 'Upgrade to Solo Pro',
    stripePriceKey: 'solo_pro',
  },
  starter: {
    name: 'Lite',
    price: 99,
    maxClients: 4,       // 3 plan workers + 1 free worker they bring from Free tier
    monthlyCredits: 10000,
    monthlyWebScrapes: 500,
    maxTeamMembers: 2,   // Primary + 2 specialists
    trialDays: 0,
    description: 'Launch your AI agency with your first 3 clients + 1 free.',
    features: [
      '4 AI workers (3 + 1 free)',
      '10,000 platform credits / month',
      '500 web scrapes/mo — AI workers can read the internet',
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
    price: 299,
    maxClients: 11,      // 10 plan workers + 1 free worker they bring from Free tier
    monthlyCredits: 25000,
    monthlyWebScrapes: 2000,
    maxTeamMembers: 4,   // Primary + 4 specialists
    trialDays: 0,
    description: 'For growing agencies managing multiple clients.',
    features: [
      '11 AI workers (10 + 1 free)',
      '25,000 platform credits / month',
      '2,000 web scrapes/mo — full web intelligence',
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
    maxClients: 21,      // 20 plan workers + 1 free worker they bring from Free tier
    monthlyCredits: 50000,
    monthlyWebScrapes: 5000,
    maxTeamMembers: 6,   // Primary + 6 specialists
    trialDays: 0,
    description: 'Built for high-volume agencies — up to 20 clients + 1 free, full Business in a Box.',
    features: [
      '21 AI workers (20 + 1 free)',
      '50,000 platform credits / month',
      '5,000 web scrapes/mo — full automation stack',
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

/** Plans available for new signups (excludes hidden/legacy plans) */
export const AVAILABLE_PLANS = PLAN_IDS.filter(id => !PLANS[id]?.hidden);

/** Get the max clients allowed for a plan */
export function getPlanClientLimit(plan: Plan | string): number {
  return PLANS[plan as Plan]?.maxClients ?? PLANS.free.maxClients;
}

/** Check if an agency can add another client given their current count */
export function canAddClient(plan: Plan | string, currentClientCount: number): boolean {
  return currentClientCount < getPlanClientLimit(plan);
}

/** Get the max team members allowed for a plan (0 = teams disabled) */
export function getPlanTeamLimit(plan: Plan | string): number {
  return PLANS[plan as Plan]?.maxTeamMembers ?? 0;
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
  pro:      { monthly: 239, annualTotal: 2868, savings: 720  },
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
  minutes: 300,
  description: '300 minutes/month of AI phone calls — inbound & outbound. Add to any plan.',
  features: [
    '300 AI calling minutes / month',
    'Inbound call answering (24/7)',
    'Outbound AI call campaigns',
    'Call transcripts & recordings (Whisper)',
    'Auto-escalation to human',
    'Works alongside any Kyra plan',
  ],
  stripePriceKey: 'voice_addon',
  stripePriceKeyAnnual: 'voice_addon_annual',
};
