/**
 * BYOK (Bring Your Own Key) — Agency API key resolution
 *
 * When an agency adds their own OpenAI/Anthropic/etc key,
 * they should NOT be charged platform credits for AI operations
 * that use their key — BUT ONLY on paid plans.
 *
 * Free plan agencies with BYOK still consume platform credits.
 * They're using our routing, CRM, and infrastructure regardless
 * of whose API key pays the model bill.
 *
 * isByok  = uses their API key (always set if they have one)
 * skipCredits = true only for paid BYOK accounts (starter/pro/scale/solo_pro)
 *
 * ─── Canonical provider priority ───────────────────────────────────────────
 * The constant BYOK_PROVIDER_PRIORITY below is the SINGLE source of truth for
 * preference order across the platform. It's imported by:
 *   - this file's resolveAgencyApiKey (async, DB-backed)
 *   - lib/ovh/provisioner.ts::resolveWinningKey (sync, used after DB fetch)
 *   - lib/ghl/poller.ts::resolveAgencyApiKey (per-GHL-poll resolution)
 * Previously these three iterated the list in different orders (openai-first
 * vs anthropic-first), so the same agency could see different keys picked in
 * different subsystems. Consolidated to anthropic-first in Phase 0.12.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export type BYOKProvider = 'anthropic' | 'openrouter' | 'openai' | 'google';

/**
 * Canonical BYOK provider preference order.
 *
 * Rationale: Anthropic (Claude) is Kyra's primary inference backbone — its
 * tool-use behavior is most aligned with SOUL.md agent patterns. OpenRouter
 * is a close second because it gives access to any model via one key.
 * OpenAI is third (still strong function-calling). Google is last (lowest
 * platform integration today).
 *
 * Callers with a preferred provider can use it as a priority override, but
 * the iteration order for fallback MUST follow this list.
 */
export const BYOK_PROVIDER_PRIORITY: readonly BYOKProvider[] = [
  'anthropic',
  'openrouter',
  'openai',
  'google',
];

export interface ResolvedKey {
  apiKey: string;
  provider: BYOKProvider;
  model: string;
  isByok: boolean;       // true = using agency's own API key
  skipCredits: boolean;  // true = do NOT deduct platform credits (paid BYOK only)
  // true ONLY when the agencies row could not be read (transient DB error).
  // Distinguishes "we checked, this agency has no BYOK" (skipCredits=false,
  // lookupFailed=false) from "we could not check" (skipCredits=false,
  // lookupFailed=true). The widget credit gate MUST treat these differently
  // or a DB blip silently bills a paid BYOK agency (F2b).
  lookupFailed: boolean;
}

const PAID_PLANS = new Set(['starter', 'pro', 'scale', 'solo_pro', 'beta']);

/**
 * Resolve the best API key for an agency.
 * Priority: preferredProvider (if agency has that key) → BYOK_PROVIDER_PRIORITY
 *           (anthropic > openrouter > openai > google) → platform default.
 *
 * Returns { apiKey, provider, model, isByok, skipCredits }
 * skipCredits=true only when agency is on a paid plan AND using their own key.
 */
export async function resolveAgencyApiKey(
  agencyId: string,
  preferredProvider: BYOKProvider = 'anthropic',
): Promise<ResolvedKey> {
  const supabase = createServiceClientWithoutCookies();

  const { data: agency } = await supabase
    .from('agencies')
    .select('api_keys, plan')
    .eq('id', agencyId)
    .single();

  // No row means we genuinely could not determine BYOK status — NOT that
  // the agency has no key. .single() returns {data:null} WITHOUT a
  // populated error on zero rows / some transient blips (the same
  // contract lib/auth/admin.ts hardens against). Keying off `error`
  // alone would miss the {data:null,error:null} blip and silently bill a
  // paid BYOK agency — the exact F2b outage. Any missing row →
  // could-not-confirm; the caller falls back to evidence.
  const lookupFailed = !agency;

  const keys = (agency?.api_keys as Record<string, unknown>) || {};
  const selectedModels = (keys.selected_models as Record<string, string>) || {};
  const isPaidPlan = PAID_PLANS.has(agency?.plan ?? '');

  // Check preferred provider first (caller-supplied override).
  if (keys[preferredProvider]) {
    return {
      apiKey: keys[preferredProvider] as string,
      provider: preferredProvider,
      model: selectedModels[preferredProvider] || getDefaultModel(preferredProvider),
      isByok: true,
      skipCredits: isPaidPlan,
      lookupFailed: false,
    };
  }

  // Fall back to canonical priority. Using BYOK_PROVIDER_PRIORITY here keeps
  // this aligned with lib/ovh/provisioner.ts and lib/ghl/poller.ts.
  for (const provider of BYOK_PROVIDER_PRIORITY) {
    if (provider !== preferredProvider && keys[provider]) {
      return {
        apiKey: keys[provider] as string,
        provider,
        model: selectedModels[provider] || getDefaultModel(provider),
        isByok: true,
        skipCredits: isPaidPlan,
        lookupFailed: false,
      };
    }
  }

  // No BYOK configured (or the lookup failed) — fall back to platform key.
  const platformKey = process.env.OPENAI_API_KEY || '';
  return {
    apiKey: platformKey,
    provider: 'openai',
    model: 'gpt-4o',
    isByok: false,
    skipCredits: false,
    lookupFailed,
  };
}

// ─── Credit-gate decision (F2b fail-safe) ───────────────────────────────────
//
// Agencies CONFIRMED paid+BYOK at least once this process. A transient DB
// error must not let a never-confirmed agency skip the credit gate (that
// would be a free-AI hole), but it also must not bill an agency we have
// already proven is paid+BYOK (that is the F2b outage). This in-process set
// is that independent evidence.
const _byokSkipConfirmed = new Set<string>();

/** Test seam — reset the paid+BYOK evidence set. */
export function __resetByokSkipEvidenceForTests(): void {
  _byokSkipConfirmed.clear();
}

/**
 * Should the platform credit gate be skipped for this agency?
 *
 *   confirmed paid+BYOK      → true  (and remember it)
 *   confirmed NOT BYOK       → false (gate applies — correct)
 *   lookup failed (DB blip)  → true ONLY if we have independent prior
 *                              evidence this agency is paid+BYOK; else
 *                              false (fail toward gating, never toward
 *                              free AI for an unknown agency)
 *
 * Unlike agency ownership (immutable), plan+BYOK status is MUTABLE: an
 * agency can downgrade (cancel Stripe) or pull its API key. Stale
 * positive evidence would let a now-free agency skip the gate on every
 * DB blip for the instance lifetime. So a confirmed not-skip read
 * actively INVALIDATES the evidence — the cache self-heals on the first
 * contradicting successful read.
 *
 * This is the single decision point the widget credit gate must use
 * instead of reading `resolved.skipCredits` directly.
 */
export async function byokShouldSkipCredits(agencyId: string): Promise<boolean> {
  let resolved: ResolvedKey;
  try {
    resolved = await resolveAgencyApiKey(agencyId);
  } catch {
    // resolver itself threw (e.g. service client init) — treat as a
    // failed lookup: skip only with prior positive evidence.
    return _byokSkipConfirmed.has(agencyId);
  }

  if (resolved.skipCredits) {
    _byokSkipConfirmed.add(agencyId);
    return true;
  }
  if (resolved.lookupFailed) {
    return _byokSkipConfirmed.has(agencyId);
  }
  // Confirmed NOT paid+BYOK right now — drop any stale evidence so a
  // downgraded agency cannot keep skipping the gate on future blips.
  _byokSkipConfirmed.delete(agencyId);
  return false;
}

function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'openai': return 'gpt-4o';
    case 'anthropic': return 'claude-sonnet-4-20250514';
    case 'openrouter': return 'openai/gpt-4o';
    case 'google': return 'gemini-2.0-flash';
    default: return 'gpt-4o';
  }
}

/**
 * Get the OpenAI-compatible API base URL for a provider.
 */
export function getApiBase(provider: string): string {
  switch (provider) {
    case 'openai': return 'https://api.openai.com/v1';
    case 'anthropic': return 'https://api.anthropic.com/v1';  // needs different format
    case 'openrouter': return 'https://openrouter.ai/api/v1';
    case 'google': return 'https://generativelanguage.googleapis.com/v1beta';
    default: return 'https://api.openai.com/v1';
  }
}
