// ============================================================================
// Shared Chat Core — common logic used by both dashboard and widget chat routes
//
// Centralizes model resolution, LLM client creation, credit operations,
// and conversation storage so the two chat endpoints stay in sync.
// ============================================================================

import OpenAI from 'openai';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { deductCredits, requireCredits, type CreditAction } from '@/lib/billing/credit-engine';
import { getCreditsForModel } from '@/lib/billing/model-credits';

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatConfig {
  model: string;
  maxTokens?: number;
  temperature?: number;
}

// ─── OpenRouter Slug Map ─────────────────────────────────────────────────────
// Canonical model ID → valid OpenRouter slug
// Verified against OpenRouter /v1/models on Apr 3, 2026

export const OPENROUTER_SLUGS: Record<string, string> = {
  'claude-haiku-3-5':   'anthropic/claude-3.5-haiku',
  'claude-haiku-4-5':   'anthropic/claude-haiku-4.5',
  'claude-sonnet-3-7':  'anthropic/claude-3.7-sonnet',
  'claude-sonnet-4-6':  'anthropic/claude-sonnet-4.6',
  'claude-opus-4-6':    'anthropic/claude-opus-4.6',
  'gpt-4o-mini':        'openai/gpt-4o-mini',
  'gpt-4o':             'openai/gpt-4o',
  'gemini-2.0-flash':   'google/gemini-2.0-flash-001',
  'gemini-2.5-pro':     'google/gemini-2.5-pro',
  'o3-mini':            'openai/o3-mini',
  'o3':                 'openai/o3',
  'o1':                 'openai/o1',
};

// ─── Model Resolution ────────────────────────────────────────────────────────

/**
 * Resolve a raw model string into a valid provider-specific model ID.
 * Handles OpenRouter slug mapping, provider prefix inference, and fallbacks.
 */
export function resolveModel(rawModel: string, useOpenRouter: boolean): string {
  if (useOpenRouter) {
    const stripped = rawModel.startsWith('openrouter/') ? rawModel.slice('openrouter/'.length) : rawModel;

    // 1. Direct slug mapping (most reliable)
    if (OPENROUTER_SLUGS[stripped]) {
      return OPENROUTER_SLUGS[stripped];
    }

    // 2. Already has provider prefix
    if (stripped.includes('/')) {
      const maybeCanonical = stripped.split('/').pop() || '';
      return OPENROUTER_SLUGS[maybeCanonical] || stripped;
    }

    // 3. Infer provider from prefix
    if (stripped.startsWith('gpt-') || stripped.startsWith('o1') || stripped.startsWith('o3')) {
      return `openai/${stripped}`;
    }
    if (stripped.startsWith('gemini-')) {
      return `google/${stripped}`;
    }

    // Unknown — return as-is (caller should handle fallback)
    return stripped;
  }

  // Direct OpenAI — strip any provider prefix
  return rawModel.includes('/') ? rawModel.split('/').slice(1).join('/') : rawModel;
}

// ─── LLM Client ──────────────────────────────────────────────────────────────

/**
 * Create a direct LLM client (bypasses OpenClaw gateway).
 * Uses OpenRouter when OPENROUTER_API_KEY is set, falls back to OpenAI.
 *
 * Note: this returns a client whose URL/key is fixed at construction time. It
 * does NOT fail over at call time — for that, use
 * `createChatCompletionWithFailover` below. Kept for callers that explicitly
 * pin to one provider (e.g. when the caller already remapped the model and
 * doesn't want a silent provider switch).
 */
export function getDirectLLMClient(): OpenAI {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    return new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openrouterKey,
    });
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

// ─── Resilient LLM call (with auth-error failover) ───────────────────────────
//
// Background: the 2026-05-18 widget outage was caused by BOTH provider keys
// being non-functional in production — OpenRouter returned `401 "User not
// found."` (account/key revoked) and the OpenAI fallback key was corrupted by
// `echo "value" | vercel env add` appending a literal `\n` to the key string.
// Worse, `getDirectLLMClient()` only falls back to OpenAI when
// OPENROUTER_API_KEY is *absent*, not when it's present-but-invalid — so a
// revoked key turned into a 100% widget outage with no graceful degradation.
//
// This helper closes that gap. It calls the primary provider (OpenRouter when
// configured, OpenAI otherwise). If the primary fails with an authentication
// error (HTTP 401/403, or known auth-failure messages), it transparently
// retries on OpenAI with a remapped model (LLM_FALLBACK_MODEL env, default
// `gpt-4o-mini`) — because an OpenRouter slug like `anthropic/claude-sonnet-4.6`
// is not a valid OpenAI model. Non-auth errors (timeouts, 5xx, 429, model
// not found) propagate unchanged — failover would mask the real problem.
//
// Both streaming and non-streaming forms are supported by the same code path
// because the OpenAI SDK reports auth errors on the awaited create() call,
// before any tokens are yielded. The caller passes `stream: true` exactly as
// they would to the raw SDK.

export interface LLMFailoverMeta {
  /** Which provider actually served the request — informational, useful for logs. */
  provider: 'openrouter' | 'openai';
  /** True if the call fell back from OpenRouter to OpenAI mid-request. */
  failedOver: boolean;
  /** If failedOver, the short reason (e.g. "openrouter_401"). */
  failoverReason?: string;
  /** Model actually requested (may differ from caller-supplied if remapped on fallback). */
  modelUsed: string;
}

/**
 * Returns true when an error from the OpenAI SDK looks like an auth failure
 * (key revoked, malformed, account closed, user-not-found). Scoped tight on
 * purpose — we only want to fail over when retrying on a different provider
 * is actually useful. 429s, 5xx, timeouts, and model-not-found do not count.
 */
export function isAuthError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: number; code?: string | number; message?: string };
  if (e.status === 401 || e.status === 403) return true;
  if (e.code === 401 || e.code === 403) return true;
  if (typeof e.code === 'string' && (e.code === 'invalid_api_key' || e.code === 'unauthorized')) return true;
  const msg = (e.message || '').toLowerCase();
  if (!msg) return false;
  return (
    msg.includes('user not found') ||
    msg.includes('incorrect api key') ||
    msg.includes('invalid api key') ||
    msg.includes('invalid_api_key') ||
    msg.includes('no auth credentials')
  );
}

const OPENAI_FALLBACK_MODEL_DEFAULT = 'gpt-4o-mini';

/** Pick a safe OpenAI model when failing over from an OpenRouter slug. */
function pickFallbackModel(_originalModel: string): string {
  // Configurable so an operator can dial up to gpt-4o without a code change.
  return process.env.LLM_FALLBACK_MODEL || OPENAI_FALLBACK_MODEL_DEFAULT;
}

interface FailoverOpts {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  /** Forwarded to the underlying SDK as request options. */
  signal?: AbortSignal;
  /** Test seam — inject a primary client; production callers should omit. */
  __primaryClient?: OpenAI;
  /** Test seam — inject a fallback client; production callers should omit. */
  __fallbackClient?: OpenAI;
}

/**
 * Streaming overload — caller passes stream: true.
 */
export async function createChatCompletionWithFailover(
  opts: FailoverOpts & { stream: true },
): Promise<{ completion: AsyncIterable<unknown>; meta: LLMFailoverMeta }>;
/**
 * Non-streaming overload — default.
 */
export async function createChatCompletionWithFailover(
  opts: FailoverOpts & { stream?: false | undefined },
): Promise<{ completion: { choices: Array<{ message?: { content?: string | null } | null }> }; meta: LLMFailoverMeta }>;
export async function createChatCompletionWithFailover(
  opts: FailoverOpts,
): Promise<{ completion: unknown; meta: LLMFailoverMeta }> {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const primaryProvider: 'openrouter' | 'openai' = openrouterKey ? 'openrouter' : 'openai';

  const primaryClient = opts.__primaryClient ?? (
    primaryProvider === 'openrouter'
      ? new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: openrouterKey! })
      : new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  );

  const buildBody = (model: string) => {
    const body: Record<string, unknown> = {
      model,
      messages: opts.messages,
    };
    if (opts.stream) body.stream = true;
    if (typeof opts.temperature === 'number') body.temperature = opts.temperature;
    if (typeof opts.max_tokens === 'number') body.max_tokens = opts.max_tokens;
    return body;
  };

  const reqOpts: { signal?: AbortSignal } = {};
  if (opts.signal) reqOpts.signal = opts.signal;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completion = await primaryClient.chat.completions.create(buildBody(opts.model) as any, reqOpts);
    return {
      completion,
      meta: { provider: primaryProvider, failedOver: false, modelUsed: opts.model },
    };
  } catch (err) {
    // Only fail over on auth errors AND only when the fallback is a *different*
    // provider with a *different* key. If we were already on OpenAI as primary,
    // failover doesn't help — propagate.
    if (!isAuthError(err) || primaryProvider !== 'openrouter') {
      throw err;
    }

    const fallbackKey = process.env.OPENAI_API_KEY;
    if (!fallbackKey) {
      // No second key to try — propagate so the caller's existing
      // `ai_unavailable` path handles it.
      throw err;
    }

    const errMsg = err instanceof Error ? err.message : String(err);
    const reasonShort = errMsg.toLowerCase().includes('user not found')
      ? 'openrouter_user_not_found'
      : 'openrouter_401';
    const fallbackModel = pickFallbackModel(opts.model);

    // Loud, structured log — this is the signal the operator wants to see
    // the moment a key dies. Includes the original model + the remapped one
    // so it's obvious which slug was rejected and what we substituted.
    console.warn(
      `[llm-failover] openrouter→openai reason=${reasonShort} ` +
      `originalModel=${opts.model} fallbackModel=${fallbackModel} err=${errMsg.slice(0, 200)}`,
    );

    const fallbackClient = opts.__fallbackClient ?? new OpenAI({ apiKey: fallbackKey });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completion = await fallbackClient.chat.completions.create(buildBody(fallbackModel) as any, reqOpts);
    return {
      completion,
      meta: {
        provider: 'openai',
        failedOver: true,
        failoverReason: reasonShort,
        modelUsed: fallbackModel,
      },
    };
  }
}

// ─── Provider health check (used by /api/health/llm) ─────────────────────────

export interface ProviderHealth {
  configured: boolean;
  ok: boolean;
  latencyMs: number | null;
  modelTested: string | null;
  error: string | null;
}

/**
 * Ping a single provider with a minimal completion. Returns shape-stable
 * health info — never throws. `configured:false` means the relevant env var
 * isn't set, which is not an error condition (a tenant might intentionally
 * run on one provider).
 */
export async function pingProvider(
  provider: 'openrouter' | 'openai',
): Promise<ProviderHealth> {
  const key = provider === 'openrouter' ? process.env.OPENROUTER_API_KEY : process.env.OPENAI_API_KEY;
  if (!key) {
    return { configured: false, ok: false, latencyMs: null, modelTested: null, error: null };
  }

  const client = provider === 'openrouter'
    ? new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: key })
    : new OpenAI({ apiKey: key });

  // Pick a cheap model per provider — we're testing the credential, not
  // the model. Operator can override via LLM_HEALTH_MODEL_{OPENROUTER,OPENAI}
  // if they want to validate a specific slug.
  const model = provider === 'openrouter'
    ? (process.env.LLM_HEALTH_MODEL_OPENROUTER || 'anthropic/claude-haiku-4.5')
    : (process.env.LLM_HEALTH_MODEL_OPENAI || 'gpt-4o-mini');

  const t0 = Date.now();
  try {
    await client.chat.completions.create(
      {
        model,
        messages: [{ role: 'user', content: 'pong' }],
        max_tokens: 1,
      },
      { signal: AbortSignal.timeout(8000) },
    );
    return { configured: true, ok: true, latencyMs: Date.now() - t0, modelTested: model, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      configured: true,
      ok: false,
      latencyMs: Date.now() - t0,
      modelTested: model,
      error: msg.slice(0, 240),
    };
  }
}

// ─── Credit Operations ───────────────────────────────────────────────────────

/**
 * Check if agency has enough credits, then deduct. Returns whether the action was allowed.
 */
export async function checkAndDeductCredits(
  agencyId: string,
  model: string,
  action: CreditAction = 'chat.message',
  opts?: { clientId?: string; description?: string },
): Promise<{ allowed: boolean; remaining?: number }> {
  const cost = getCreditsForModel(model);

  const preflight = await requireCredits(agencyId, action, 1, cost);
  if (!preflight.allowed) {
    return { allowed: false, remaining: preflight.balance };
  }

  const result = await deductCredits(agencyId, action, {
    override: cost,
    clientId: opts?.clientId,
    description: opts?.description,
  });

  return { allowed: true, remaining: result.newBalance };
}

// ─── Conversation Storage ────────────────────────────────────────────────────

function getServiceSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Save a conversation exchange to the client_conversations table (used by widget chat).
 */
export async function saveConversation(params: {
  clientId: string;
  agencyId: string;
  sessionId: string;
  userMessage: string;
  aiResponse: string;
  channel?: string;
  sourceUrl?: string | null;
}): Promise<{ error: string | null }> {
  const supabase = getServiceSupabase();

  const { error } = await supabase
    .from('client_conversations')
    .insert({
      client_id: params.clientId,
      agency_id: params.agencyId,
      channel: params.channel || 'web_chat',
      user_message: params.userMessage,
      ai_response: params.aiResponse,
      session_id: params.sessionId,
      source_url: params.sourceUrl || null,
    });

  if (error) {
    console.error('[chat/core] saveConversation failed:', error.message, error.code);
    return { error: error.message };
  }

  return { error: null };
}
