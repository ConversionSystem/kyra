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
