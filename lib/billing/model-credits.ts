/**
 * Kyra Model Credits — Credit cost per AI model
 *
 * Credits are deducted per conversation turn based on the model selected.
 * Pricing is calibrated against actual API costs (March 2026, pricepertoken.com).
 *
 * Baseline: 1 credit = 1 GPT-4o-mini turn (~500 in + 300 out tokens ≈ $0.000255)
 *
 * Tiers & ratios vs baseline:
 *   mini      (1 credit)  — GPT-4o-mini $0.000255, Gemini Flash $0.000170  → ~1x
 *   standard  (5 credits) — Claude Haiku 3.5 $0.0016                       → ~6x
 *   pro       (15 credits)— GPT-4o $0.00425, Sonnet $0.0060, Gemini 2.5 Pro $0.0036 → ~15–23x
 *   reasoning (8 credits) — o3-mini $0.00187                               → ~7x
 *   premium   (35 credits)— o3 $0.0034 (~13x), Opus 4.6 $0.010 (~39x)     → avg ~35x
 *   ultra     (100 credits)— o1 $0.0255                                    → ~100x
 */

export type ModelTier = 'mini' | 'standard' | 'pro' | 'reasoning' | 'premium' | 'ultra';

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

  // ── Pro (15 credits/turn) ─────────────────────────────────
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    tier: 'pro',
    creditsPerTurn: 15,
    description: "OpenAI's flagship. Balanced intelligence and speed.",
    routerMaxTier: 3,
  },
  {
    id: 'claude-sonnet-3-7',
    label: 'Claude Sonnet 3.7',
    provider: 'anthropic',
    tier: 'pro',
    creditsPerTurn: 15,
    description: 'Excellent reasoning and nuanced writing.',
    routerMaxTier: 3,
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    tier: 'pro',
    creditsPerTurn: 15,
    description: "Latest Claude Sonnet. State-of-the-art performance.",
    routerMaxTier: 3,
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    provider: 'google',
    tier: 'pro',
    creditsPerTurn: 15,
    description: "Google's most capable model. Strong at analysis and code.",
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

  // ── Premium (35 credits/turn) ─────────────────────────────
  {
    id: 'claude-opus-4-6',
    label: 'Claude Opus 4.6',
    provider: 'anthropic',
    tier: 'premium',
    creditsPerTurn: 35,
    description: "Anthropic's most powerful model. Maximum intelligence.",
    routerMaxTier: 4,
  },
  {
    id: 'o3',
    label: 'o3',
    provider: 'openai',
    tier: 'premium',
    creditsPerTurn: 35,
    description: "OpenAI's most powerful reasoning. Complex problem solving.",
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

/** Map of model ID → router max tier */
export const MODEL_ROUTER_TIER: Record<string, number> = Object.fromEntries(
  MODELS.map(m => [m.id, m.routerMaxTier])
);

/** Default model for new clients */
export const DEFAULT_MODEL_ID = 'gpt-4o-mini';
export const DEFAULT_CREDITS_PER_TURN = 1;

/**
 * Get credit cost for a model ID.
 * Falls back to DEFAULT_CREDITS_PER_TURN if model not found.
 */
export function getCreditsForModel(modelId: string | null | undefined): number {
  if (!modelId) return DEFAULT_CREDITS_PER_TURN;
  return MODEL_CREDITS[modelId] ?? DEFAULT_CREDITS_PER_TURN;
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
    mini: [], standard: [], pro: [], reasoning: [], premium: [], ultra: [],
  };
  for (const model of MODELS) {
    grouped[model.tier].push(model);
  }
  return grouped;
}
