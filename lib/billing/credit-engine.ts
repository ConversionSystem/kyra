// ============================================================================
// Unified Credit Engine — SINGLE source of truth for all credit operations
//
// Every AI action on the platform flows through this engine:
// - Pipeline: find leads, enrich, AI Closer
// - Chat: dashboard test chat, OpenClaw chat, worker chat
// - Channels: GHL SMS, Twilio, voice, inbound webhooks
//
// Rules:
// 1. Check balance BEFORE running expensive operations (requireCredits)
// 2. Deduct AFTER the operation succeeds (deductCredits)
// 3. Log every transaction with description + client context
// 4. Gate at 0 — return insufficient, caller blocks the action
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreditBalance {
  balance: number;
  lifetimePurchased: number;
  lifetimeUsed: number;
}

export interface DeductResult {
  ok: boolean;
  newBalance: number;
  insufficient: boolean;
  lowBalance: boolean;
}

export interface PreflightResult {
  allowed: boolean;
  balance: number;
  cost: number;
  shortfall: number; // how many credits short (0 if allowed)
}

export interface CreditTransaction {
  id: string;
  amount: number;
  type: 'purchase' | 'usage' | 'refund' | 'bonus' | 'manual';
  description: string | null;
  clientId: string | null;
  createdAt: string;
}

export const LOW_BALANCE_THRESHOLD = 50;

// ─── Credit Costs ─────────────────────────────────────────────────────────────

/** Every billable action and its credit cost. One place, no ambiguity. */
export const CREDIT_COSTS = {
  // Pipeline
  'pipeline.find_leads': 5,       // Per campaign (GPT-4o or Outscraper)
  'pipeline.enrich': 2,           // Per lead (GPT-4o + web scrape)
  'pipeline.closer_response': 1,  // Per AI Closer reply
  'pipeline.follow_up': 1,        // Per follow-up message sent
  'pipeline.outscraper_lead': 1,  // Per Outscraper lead (on top of find_leads)

  // Chat
  'chat.message': 1,              // Dashboard/portal chat message
  'chat.web_search': 2,           // Chat with web search
  'chat.deep_research': 5,        // Sub-agent research
  'chat.file_analysis': 3,        // File/document analysis
  'chat.image_analysis': 3,       // Image analysis

  // Channels
  'channel.ghl_sms': 1,           // GHL SMS AI response
  'channel.twilio_sms': 1,        // Twilio SMS AI response
  'channel.voice_call': 2,        // Voice call
  'channel.inbound_webhook': 1,   // Inbound webhook AI response
  'channel.telegram': 1,          // Telegram AI response

  // CRM
  'crm_enrichment': 2,            // AI auto-enrichment per contact
  'crm_scoring': 1,               // AI relationship scoring (batch of 50)
  'crm_follow_up_draft': 1,       // AI follow-up draft
  'crm_meeting_prep': 1,          // AI meeting prep briefing

  // Website builder
  'website.page_generation': 5,   // Per AI-generated page (content engine)

  // AI Campaign & Funnel
  'campaign.generate': 3,         // Per AI campaign generation
  'funnel.generate': 3,           // Per AI funnel generation
  'ai_lead_scoring': 1,           // Per individual AI lead score
  'ai_report': 1,                 // Per AI analytics report

  // SEO
  'seo.geo_test': 5,              // Per GEO visibility test
  'seo.nap_audit': 3,             // Per NAP consistency audit
  'seo.gsc_sync': 1,              // Per GSC data sync
  'seo.content_publish': 2,       // Per off-site content publish

  // Dispatch agents (cannabis vertical — Onfleet + LLM reasoning)
  'dispatch.brain_call': 5,       // Dispatch Brain (Sonnet 4.5) — per webhook/cron evaluation
  'dispatch.sms_writer_call': 1,  // SMS Writer (Haiku 4.5) — per outbound message draft
  'dispatch.copilot_call': 3,     // Dispatcher Copilot (Sonnet cached) — per briefing
  'dispatch.inbound_customer_call': 1, // Inbound Customer Agent (Haiku) — per customer reply

  // Free actions (logged but cost 0)
  'system.calendar': 0,
  'system.reminder': 0,
  'system.memory': 0,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

/** Get the credit cost for an action */
export function getCreditCost(action: CreditAction): number {
  return CREDIT_COSTS[action] ?? 1;
}

// ─── Balance Operations ───────────────────────────────────────────────────────

/**
 * Get the current credit balance for an agency.
 * Auto-creates the record if it doesn't exist.
 */
export async function getAgencyCredits(agencyId: string): Promise<CreditBalance> {
  const supabase = createServiceClientWithoutCookies();

  const { data, error } = await supabase
    .from('agency_credits')
    .upsert({ agency_id: agencyId }, { onConflict: 'agency_id' })
    .select('balance, lifetime_purchased, lifetime_used')
    .eq('agency_id', agencyId)
    .single();

  if (error || !data) {
    console.warn('[credit-engine] Failed to get credits:', error);
    return { balance: 0, lifetimePurchased: 0, lifetimeUsed: 0 };
  }

  return {
    balance: data.balance ?? 0,
    lifetimePurchased: data.lifetime_purchased ?? 0,
    lifetimeUsed: data.lifetime_used ?? 0,
  };
}

// ─── Pre-flight Check ─────────────────────────────────────────────────────────

/**
 * Check if an agency has enough credits for an action BEFORE running it.
 * Call this before any expensive operation. Non-blocking, non-mutating.
 *
 * Usage:
 *   const check = await requireCredits(agencyId, 'pipeline.find_leads');
 *   if (!check.allowed) return Response.json({ error: 'Insufficient credits', ...check });
 *   // ... run the expensive operation ...
 *   await deductCredits(agencyId, 'pipeline.find_leads', ...);
 *
 * Use `overrideCost` when the action cost is model-aware (e.g. Sonnet = 75, mini = 1).
 * Without it, the check falls back to CREDIT_COSTS[action] which is a flat 1 for chat.message
 * and would allow a Sonnet request even with only 1 credit in balance.
 */
export async function requireCredits(
  agencyId: string,
  action: CreditAction,
  multiplier: number = 1,
  overrideCost?: number,
): Promise<PreflightResult> {
  const cost = overrideCost ?? (getCreditCost(action) * multiplier);

  // Free actions always pass
  if (cost === 0) {
    return { allowed: true, balance: 0, cost: 0, shortfall: 0 };
  }

  const { balance } = await getAgencyCredits(agencyId);

  return {
    allowed: balance >= cost,
    balance,
    cost,
    shortfall: Math.max(0, cost - balance),
  };
}

// ─── Deduction ────────────────────────────────────────────────────────────────

/**
 * Deduct credits for a completed action.
 * Supports multi-credit deductions (e.g. enrich 10 leads = 20 credits).
 *
 * @param agencyId   - Agency to charge
 * @param action     - Action type (determines base cost)
 * @param opts.multiplier - Multiply base cost (e.g. 10 leads enriched)
 * @param opts.override   - Override calculated cost with exact amount
 * @param opts.clientId   - Client context for transaction log
 * @param opts.description - Human-readable description
 */
export async function deductCredits(
  agencyId: string,
  action: CreditAction,
  opts: {
    multiplier?: number;
    override?: number;
    clientId?: string | null;
    description?: string;
  } = {},
): Promise<DeductResult> {
  const supabase = createServiceClientWithoutCookies();
  const totalCost = opts.override ?? (getCreditCost(action) * (opts.multiplier ?? 1));

  // Free actions — log but don't deduct
  if (totalCost === 0) {
    return { ok: true, newBalance: 0, insufficient: false, lowBalance: false };
  }

  try {
    const { data: current } = await supabase
      .from('agency_credits')
      .select('balance, lifetime_used')
      .eq('agency_id', agencyId)
      .single();

    const currentBalance = current?.balance ?? 0;

    if (currentBalance < totalCost) {
      return { ok: false, newBalance: currentBalance, insufficient: true, lowBalance: true };
    }

    const newBalance = currentBalance - totalCost;
    const newLifetimeUsed = (current?.lifetime_used ?? 0) + totalCost;

    const { data: updated, error } = await supabase
      .from('agency_credits')
      .update({
        balance: newBalance,
        lifetime_used: newLifetimeUsed,
        updated_at: new Date().toISOString(),
      })
      .eq('agency_id', agencyId)
      .select('balance')
      .single();

    if (error || !updated) {
      return { ok: false, newBalance: currentBalance, insufficient: false, lowBalance: false };
    }

    const finalBalance = updated.balance as number;
    const justCrossedLow =
      currentBalance >= LOW_BALANCE_THRESHOLD && finalBalance < LOW_BALANCE_THRESHOLD;

    // Fire low-balance notification
    if (justCrossedLow) {
      fireLowBalanceNotification(supabase, agencyId, finalBalance).catch(() => {});
    }

    // Log the transaction
    const desc = opts.description || `${action}${(opts.multiplier ?? 1) > 1 ? ` ×${opts.multiplier}` : ''}`;
    await supabase.from('credit_transactions').insert({
      agency_id: agencyId,
      amount: -totalCost,
      type: 'usage',
      description: desc,
      client_id: opts.clientId || null,
    }).then(() => {}, () => {});

    return { ok: true, newBalance: finalBalance, insufficient: false, lowBalance: justCrossedLow };
  } catch (err) {
    console.warn('[credit-engine] deductCredits error:', err);
    return { ok: false, newBalance: 0, insufficient: false, lowBalance: false };
  }
}

/**
 * Legacy single-credit deduction (backward compatible).
 * Routes with existing deductCredit() calls will keep working.
 */
export async function deductCredit(
  agencyId: string,
  clientId?: string | null,
  description?: string,
): Promise<DeductResult> {
  return deductCredits(agencyId, 'chat.message', {
    clientId,
    description,
  });
}

// ─── Add Credits ──────────────────────────────────────────────────────────────

/**
 * Add credits to an agency (purchase, bonus, manual adjustment).
 */
export async function addCredits(
  agencyId: string,
  amount: number,
  type: CreditTransaction['type'],
  description: string,
  stripePaymentIntentId?: string,
): Promise<number> {
  const supabase = createServiceClientWithoutCookies();

  await supabase
    .from('agency_credits')
    .upsert({ agency_id: agencyId }, { onConflict: 'agency_id' });

  const { data: current } = await supabase
    .from('agency_credits')
    .select('balance, lifetime_purchased')
    .eq('agency_id', agencyId)
    .single();

  const newBalance = (current?.balance ?? 0) + amount;
  const newLifetime = type === 'purchase'
    ? (current?.lifetime_purchased ?? 0) + amount
    : (current?.lifetime_purchased ?? 0);

  const { data: updated } = await supabase
    .from('agency_credits')
    .update({
      balance: newBalance,
      lifetime_purchased: newLifetime,
      updated_at: new Date().toISOString(),
    })
    .eq('agency_id', agencyId)
    .select('balance')
    .single();

  await supabase.from('credit_transactions').insert({
    agency_id: agencyId,
    amount,
    type,
    description,
    stripe_payment_intent_id: stripePaymentIntentId || null,
  }).then(() => {}, () => {});

  return updated?.balance ?? newBalance;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getCreditTransactions(
  agencyId: string,
  limit = 10,
): Promise<CreditTransaction[]> {
  const supabase = createServiceClientWithoutCookies();

  const { data } = await supabase
    .from('credit_transactions')
    .select('id, amount, type, description, client_id, created_at')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    amount: row.amount,
    type: row.type as CreditTransaction['type'],
    description: row.description,
    clientId: row.client_id,
    createdAt: row.created_at,
  }));
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fireLowBalanceNotification(supabase: any, agencyId: string, balance: number) {
  try {
    const { data: agency } = await supabase
      .from('agencies')
      .select('name, settings')
      .eq('id', agencyId)
      .single();
    const settings = (agency?.settings ?? {}) as Record<string, unknown>;
    const notifyEmail =
      (settings.escalation_email as string | undefined) ||
      (settings.weekly_report_email as string | undefined);
    if (notifyEmail && process.env.ESCALATION_WEBHOOK_URL) {
      await fetch(process.env.ESCALATION_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'low_credits',
          agencyId,
          agencyName: agency?.name || 'Your agency',
          balance,
          threshold: LOW_BALANCE_THRESHOLD,
          notifyEmail,
          message: `⚠️ Your Kyra credits are running low (${balance} remaining). Top up: https://kyra.conversionsystem.com/agency/credits`,
        }),
      });
    }
  } catch { /* best-effort */ }
}
