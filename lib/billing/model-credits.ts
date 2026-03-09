/**
 * Kyra Model Credits — Credit cost per AI model
 *
 * Credits are deducted per conversation turn based on the model selected
 * for that client's AI worker. More powerful models cost more credits.
 *
 * Credit pricing is designed so:
 * - 1 credit ≈ 1 GPT-4o-mini / Haiku conversation turn (~$0.0001)
 * - Higher tiers multiply proportionally to actual API cost difference
 */

export type ModelTier = 'free' | 'mini' | 'standard' | 'reasoning' | 'premium';

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
  // ── Mini tier (1 credit/turn) ─────────────────────────────
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
    id: 'claude-haiku-3-5',
    label: 'Claude Haiku 3.5',
    provider: 'anthropic',
    tier: 'mini',
    creditsPerTurn: 1,
    description: 'Fast Anthropic model. Great for quick responses.',
    routerMaxTier: 2,
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    provider: 'google',
    tier: 'mini',
    creditsPerTurn: 1,
    description: 'Google\'s fastest model. Ideal for high-volume workflows.',
    routerMaxTier: 2,
  },

  // ── Standard tier (5 credits/turn) ───────────────────────
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    tier: 'standard',
    creditsPerTurn: 5,
    description: 'OpenAI\'s flagship. Balanced intelligence and speed.',
    routerMaxTier: 3,
  },
  {
    id: 'claude-sonnet-3-7',
    label: 'Claude Sonnet 3.7',
    provider: 'anthropic',
    tier: 'standard',
    creditsPerTurn: 5,
    description: 'Anthropic\'s best value. Excellent reasoning and writing.',
    routerMaxTier: 3,
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    tier: 'standard',
    creditsPerTurn: 5,
    description: 'Latest Claude Sonnet. State-of-the-art performance.',
    routerMaxTier: 3,
  },
  {
    id: 'gemini-2.0-pro',
    label: 'Gemini 2.0 Pro',
    provider: 'google',
    tier: 'standard',
    creditsPerTurn: 5,
    description: 'Google\'s advanced model for complex tasks.',
    routerMaxTier: 3,
  },

  // ── Reasoning tier (10 credits/turn) ─────────────────────
  {
    id: 'o3-mini',
    label: 'o3-mini',
    provider: 'openai',
    tier: 'reasoning',
    creditsPerTurn: 10,
    description: 'OpenAI reasoning model. Best for logic and analysis.',
    routerMaxTier: 3,
  },
  {
    id: 'o1',
    label: 'o1',
    provider: 'openai',
    tier: 'reasoning',
    creditsPerTurn: 10,
    description: 'OpenAI\'s deep reasoning. Great for complex problem solving.',
    routerMaxTier: 3,
  },

  // ── Premium tier (25 credits/turn) ────────────────────────
  {
    id: 'claude-opus-4-6',
    label: 'Claude Opus 4.6',
    provider: 'anthropic',
    tier: 'premium',
    creditsPerTurn: 25,
    description: 'Anthropic\'s most powerful model. Maximum intelligence.',
    routerMaxTier: 4,
  },
  {
    id: 'gpt-4.5',
    label: 'GPT-4.5',
    provider: 'openai',
    tier: 'premium',
    creditsPerTurn: 25,
    description: 'OpenAI\'s latest flagship. Cutting-edge capabilities.',
    routerMaxTier: 4,
  },
  {
    id: 'o3',
    label: 'o3',
    provider: 'openai',
    tier: 'premium',
    creditsPerTurn: 25,
    description: 'OpenAI\'s most powerful reasoning model.',
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
    free: [], mini: [], standard: [], reasoning: [], premium: [],
  };
  for (const model of MODELS) {
    grouped[model.tier].push(model);
  }
  return grouped;
}
