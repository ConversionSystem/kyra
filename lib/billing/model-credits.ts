/**
 * Kyra Model Credits — Credit cost per AI model
 *
 * Credits are deducted per conversation turn based on the model selected.
 *
 * Calibrated: March 30 2026 — based on real OpenRouter spend data
 * (2.5-day sample, 3,460 API calls, 107k avg input tokens, 60% cache hit rate).
 *
 * Agency pack = $0.005/credit. Target: 50%+ margin at Agency tier.
 *
 * Real cost per turn → credits needed:
 *   mini      (1 cr)   — GPT-4o-mini $0.0003/turn, Gemini Flash ~$0.0002  → 1 cr
 *   standard  (5 cr)   — Haiku 3.5 $0.008, Haiku 4.5 $0.010, GPT-4o $0.006 → 5 cr
 *   pro       (15 cr)  — Gemini 2.5 Pro (no data, keep 15)                → 15 cr
 *   flagship  (75 cr)  — Sonnet 3.7 $0.154, Sonnet 4.6 $0.154            → 75 cr (was 15 — LOSS)
 *   reasoning (8 cr)   — o3-mini $0.00187                                 → 8 cr
 *   premium   (125 cr) — Opus 4.6 $0.257 (1.67× Sonnet)                  → 125 cr (was 35 — LOSS)
 *   reasoning2(20 cr)  — o3 ~$0.040/turn (mid-range reasoning)            → 20 cr
 *   ultra     (100 cr) — o1 $0.0255                                       → 100 cr
 */

export type ModelTier = 'mini' | 'standard' | 'pro' | 'flagship' | 'reasoning' | 'premium' | 'ultra';

export interface ModelOption {
  id: string;
  label: string;
  provider: 'openai' | 'anthropic' | 'google';
  tier: ModelTier;
  creditsPerTurn: number;
  description: string;
  routerMaxTier: number; // KYRA_MAX_TIER value for kyra-router
}

export const MODELS: ModelOption[] = [
  // ── Mini (1 credit/turn) ──────────────────────────────────
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    provider: 'openai',
    tier: 'mini',
    creditsPerTurn: 1,
    description: 'Fast and affordable. Best for simple Q&A and FAQs.',
    routerMaxTier: 2,
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    provider: 'google',
    tier: 'mini',
    creditsPerTurn: 1,
    description: "Google's fastest model. Great for high-volume workflows.",
    routerMaxTier: 2,
  },

  // ── Standard (5 credits/turn) ─────────────────────────────
  {
    id: 'claude-haiku-3-5',
    label: 'Claude Haiku 3.5',
    provider: 'anthropic',
    tier: 'standard',
    creditsPerTurn: 5,
    description: "Anthropic's fast model. Sharper reasoning than GPT-4o-mini.",
    routerMaxTier: 2,
  },
  {
    id: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    provider: 'anthropic',
    tier: 'standard',
    creditsPerTurn: 5,
    description: "Latest Haiku — fast, smart, great value. $0.010/turn.",
    routerMaxTier: 2,
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    tier: 'standard',
    creditsPerTurn: 5,
    description: "OpenAI's flagship. Balanced intelligence and speed. $0.006/turn.",
    routerMaxTier: 3,
  },

  // ── Pro (15 credits/turn) ─────────────────────────────────
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    provider: 'google',
    tier: 'pro',
    creditsPerTurn: 15,
    description: "Google's most capable model. Strong at analysis and code.",
    routerMaxTier: 3,
  },

  // ── Flagship (75 credits/turn) ────────────────────────────
  {
    id: 'claude-sonnet-3-7',
    label: 'Claude Sonnet 3.7',
    provider: 'anthropic',
    tier: 'flagship',
    creditsPerTurn: 75,
    description: 'Excellent reasoning and nuanced writing. $0.154/turn.',
    routerMaxTier: 3,
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    tier: 'flagship',
    creditsPerTurn: 75,
    description: "Latest Claude Sonnet. State-of-the-art performance. $0.154/turn.",
    routerMaxTier: 3,
  },

  // ── Reasoning (8 credits/turn) ───────────────────────────
  {
    id: 'o3-mini',
    label: 'o3-mini',
    provider: 'openai',
    tier: 'reasoning',
    creditsPerTurn: 8,
    description: 'OpenAI reasoning model. Best for logic and step-by-step analysis.',
    routerMaxTier: 3,
  },

  // ── Premium (125 credits/turn) ────────────────────────────
  {
    id: 'claude-opus-4-6',
    label: 'Claude Opus 4.6',
    provider: 'anthropic',
    tier: 'premium',
    creditsPerTurn: 125,
    description: "Anthropic's most powerful model. $0.257/turn.",
    routerMaxTier: 4,
  },
  {
    id: 'o3',
    label: 'o3',
    provider: 'openai',
    // Re-tiered from 'premium' (35 cr) → 'reasoning' (20 cr).
    // o3 costs ~$0.040/turn actual — far below Opus ($0.257).
    // 20 cr × $0.005 = $0.10 revenue → ~60% margin. Was mis-priced at 35 cr.
    tier: 'reasoning',
    creditsPerTurn: 20,
    description: "OpenAI's powerful reasoning model. ~$0.040/turn.",
    routerMaxTier: 4,
  },

  // ── Ultra (100 credits/turn) ──────────────────────────────
  {
    id: 'o1',
    label: 'o1',
    provider: 'openai',
    tier: 'ultra',
    creditsPerTurn: 100,
    description: 'Deep research-grade reasoning. Most expensive model ($15/1M in).',
    routerMaxTier: 4,
  },
];

/** Map of model ID → credit cost per turn */
export const MODEL_CREDITS: Record<string, number> = Object.fromEntries(
  MODELS.map(m => [m.id, m.creditsPerTurn])
);

/**
 * Aliases for model IDs that arrive in non-canonical formats.
 * OpenRouter, gateway, and dot-notation variants → internal canonical ID.
 */
const MODEL_ID_ALIASES: Record<string, string> = {
  // OpenRouter full slugs — Anthropic
  'anthropic/claude-4.6-sonnet-20260217': 'claude-sonnet-4-6',
  'anthropic/claude-sonnet-4.6': 'claude-sonnet-4-6',
  'openrouter/anthropic/claude-sonnet-4.6': 'claude-sonnet-4-6',
  'anthropic/claude-4.5-haiku-20251001': 'claude-haiku-4-5',
  'anthropic/claude-haiku-4.5': 'claude-haiku-4-5',
  'openrouter/anthropic/claude-haiku-4.5': 'claude-haiku-4-5',
  'anthropic/claude-3-5-haiku-20241022': 'claude-haiku-3-5',
  'anthropic/claude-haiku-3.5': 'claude-haiku-3-5',
  'openrouter/anthropic/claude-haiku-3.5': 'claude-haiku-3-5',
  'anthropic/claude-sonnet-3-7': 'claude-sonnet-3-7',
  'anthropic/claude-3-7-sonnet-20250219': 'claude-sonnet-3-7',
  'openrouter/anthropic/claude-sonnet-3.7': 'claude-sonnet-3-7',
  'anthropic/claude-opus-4.6': 'claude-opus-4-6',
  'openrouter/anthropic/claude-opus-4.6': 'claude-opus-4-6',
  // OpenRouter full slugs — OpenAI
  'openai/gpt-4o-mini': 'gpt-4o-mini',
  'openai/gpt-4o': 'gpt-4o',
  'openai/o3-mini': 'o3-mini',
  'openai/o3': 'o3',
  'openai/o1': 'o1',
  // OpenRouter full slugs — Google
  'google/gemini-2.0-flash-001': 'gemini-2.0-flash',
  'google/gemini-2.5-pro': 'gemini-2.5-pro',
  // Dot-notation variants (non-canonical)
  'claude-haiku-4.5': 'claude-haiku-4-5',
  'claude-sonnet-4.6': 'claude-sonnet-4-6',
  'claude-sonnet-3.7': 'claude-sonnet-3-7',
  'claude-opus-4.6': 'claude-opus-4-6',
  'claude-haiku-3.5': 'claude-haiku-3-5',
  // Dash-notation with provider prefix (widget sends these)
  'anthropic/claude-haiku-4-5': 'claude-haiku-4-5',
  'anthropic/claude-haiku-3-5': 'claude-haiku-3-5',
  'anthropic/claude-sonnet-4-6': 'claude-sonnet-4-6',
  'anthropic/claude-opus-4-6': 'claude-opus-4-6',
  // OpenRouter prefix + dash notation
  'openrouter/anthropic/claude-haiku-4-5': 'claude-haiku-4-5',
  'openrouter/anthropic/claude-haiku-3-5': 'claude-haiku-3-5',
  'openrouter/anthropic/claude-sonnet-4-6': 'claude-sonnet-4-6',
  'openrouter/anthropic/claude-sonnet-3-7': 'claude-sonnet-3-7',
  'openrouter/anthropic/claude-opus-4-6': 'claude-opus-4-6',
};

/** Map of model ID → router max tier */
export const MODEL_ROUTER_TIER: Record<string, number> = Object.fromEntries(
  MODELS.map(m => [m.id, m.routerMaxTier])
);

/** Default model for new clients */
export const DEFAULT_MODEL_ID = 'gpt-4o-mini';
export const DEFAULT_CREDITS_PER_TURN = 1;

/**
 * Normalize any model ID format to the internal canonical ID.
 * Handles OpenRouter slugs, dot-notation, and case variations.
 */
export function normalizeModelId(modelId: string | null | undefined): string {
  if (!modelId) return DEFAULT_MODEL_ID;
  // Exact match
  if (MODEL_ID_ALIASES[modelId]) return MODEL_ID_ALIASES[modelId];
  // Case-insensitive
  if (MODEL_ID_ALIASES[modelId.toLowerCase()]) return MODEL_ID_ALIASES[modelId.toLowerCase()];
  // Dash→dot conversion for version numbers: 'claude-haiku-4-5' → 'claude-haiku-4.5'
  const dotVariant = modelId.replace(/(\d+)-(\d+)/g, '$1.$2');
  if (MODEL_ID_ALIASES[dotVariant]) return MODEL_ID_ALIASES[dotVariant];
  // Direct lookup in MODEL_CREDITS (already canonical)
  if (MODEL_CREDITS[modelId]) return modelId;
  return modelId;
}

/**
 * Get credit cost for a model ID.
 * Normalizes the ID first, then falls back to DEFAULT_CREDITS_PER_TURN.
 */
export function getCreditsForModel(modelId: string | null | undefined): number {
  if (!modelId) return DEFAULT_CREDITS_PER_TURN;
  const normalized = normalizeModelId(modelId);
  return MODEL_CREDITS[normalized] ?? DEFAULT_CREDITS_PER_TURN;
}

/**
 * Get the router max tier for a model.
 * Used to set KYRA_MAX_TIER env var on the container.
 */
export function getRouterTierForModel(modelId: string | null | undefined): number {
  if (!modelId) return 2;
  return MODEL_ROUTER_TIER[modelId] ?? 2;
}

/**
 * Get a ModelOption by ID.
 */
export function getModel(modelId: string): ModelOption | undefined {
  return MODELS.find(m => m.id === modelId);
}

/** Group models by tier for UI display */
export function getModelsByTier(): Record<ModelTier, ModelOption[]> {
  const grouped: Record<ModelTier, ModelOption[]> = {
    mini: [], standard: [], pro: [], flagship: [], reasoning: [], premium: [], ultra: [],
  };
  for (const model of MODELS) {
    grouped[model.tier].push(model);
  }
  return grouped;
}
