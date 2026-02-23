// ============================================================================
// AI Model Definitions
//
// Single source of truth for all supported models per provider.
// Used by: API route, provisioner, poller, test route, and UI.
// ============================================================================

export interface ModelDef {
  id: string;           // Native API model ID (sent to provider)
  ocModel: string;      // OpenClaw model string (sent to containers)
  label: string;        // Human-readable name
  desc: string;         // Short description
  badge?: string;       // e.g. 'Recommended' | 'Cheapest' | 'Powerful'
  badgeColor?: string;  // Tailwind classes for the badge
}

export const PROVIDER_MODELS: Record<string, ModelDef[]> = {
  anthropic: [
    {
      id: 'claude-haiku-4-5',
      ocModel: 'anthropic/claude-haiku-4-5',
      label: 'Claude Haiku',
      desc: 'Fastest · Best for high-volume simple tasks',
      badge: 'Cheapest',
      badgeColor: 'bg-green-100 text-green-700',
    },
    {
      id: 'claude-3-5-haiku-20241022',
      ocModel: 'anthropic/claude-3-5-haiku-20241022',
      label: 'Claude 3.5 Haiku',
      desc: 'Fast with stronger reasoning than Haiku',
    },
    {
      id: 'claude-sonnet-4-5',
      ocModel: 'anthropic/claude-sonnet-4-5',
      label: 'Claude Sonnet 4.5',
      desc: 'Balanced · Great for most AI employee tasks',
      badge: 'Recommended',
      badgeColor: 'bg-violet-100 text-violet-700',
    },
    {
      id: 'claude-3-7-sonnet-20250219',
      ocModel: 'anthropic/claude-3-7-sonnet-20250219',
      label: 'Claude Sonnet 3.7',
      desc: 'Latest Sonnet · Extended thinking support',
    },
    {
      id: 'claude-opus-4',
      ocModel: 'anthropic/claude-opus-4',
      label: 'Claude Opus',
      desc: 'Most powerful · Complex multi-step reasoning',
      badge: 'Most Powerful',
      badgeColor: 'bg-orange-100 text-orange-700',
    },
  ],

  openrouter: [
    {
      id: 'anthropic/claude-haiku-4-5',
      ocModel: 'anthropic/claude-haiku-4-5',
      label: 'Claude Haiku',
      desc: 'Fast Anthropic model via OpenRouter',
      badge: 'Cheapest',
      badgeColor: 'bg-green-100 text-green-700',
    },
    {
      id: 'anthropic/claude-sonnet-4-5',
      ocModel: 'anthropic/claude-sonnet-4-5',
      label: 'Claude Sonnet',
      desc: 'Balanced Anthropic model via OpenRouter',
      badge: 'Recommended',
      badgeColor: 'bg-violet-100 text-violet-700',
    },
    {
      id: 'anthropic/claude-opus-4',
      ocModel: 'anthropic/claude-opus-4',
      label: 'Claude Opus',
      desc: 'Most powerful Anthropic model',
    },
    {
      id: 'openai/gpt-4o',
      ocModel: 'openai/gpt-4o',
      label: 'GPT-4o',
      desc: 'OpenAI flagship via OpenRouter',
    },
    {
      id: 'openai/gpt-4o-mini',
      ocModel: 'openai/gpt-4o-mini',
      label: 'GPT-4o mini',
      desc: 'Fast and affordable OpenAI model',
    },
    {
      id: 'google/gemini-flash-1.5',
      ocModel: 'google/gemini-flash-1.5',
      label: 'Gemini 1.5 Flash',
      desc: 'Google fast model via OpenRouter',
    },
    {
      id: 'meta-llama/llama-3.3-70b-instruct',
      ocModel: 'meta-llama/llama-3.3-70b-instruct',
      label: 'Llama 3.3 70B',
      desc: 'Open source · Low cost',
    },
    {
      id: 'deepseek/deepseek-r1',
      ocModel: 'deepseek/deepseek-r1',
      label: 'DeepSeek R1',
      desc: 'Strong reasoning · Very affordable',
    },
  ],

  openai: [
    {
      id: 'gpt-4o-mini',
      ocModel: 'openai/gpt-4o-mini',
      label: 'GPT-4o mini',
      desc: 'Fast and affordable · Best for high volume',
      badge: 'Cheapest',
      badgeColor: 'bg-green-100 text-green-700',
    },
    {
      id: 'gpt-4o',
      ocModel: 'openai/gpt-4o',
      label: 'GPT-4o',
      desc: 'Flagship model · Great all-rounder',
      badge: 'Recommended',
      badgeColor: 'bg-emerald-100 text-emerald-700',
    },
    {
      id: 'gpt-4-turbo',
      ocModel: 'openai/gpt-4-turbo',
      label: 'GPT-4 Turbo',
      desc: 'Previous OpenAI flagship',
    },
    {
      id: 'o1-mini',
      ocModel: 'openai/o1-mini',
      label: 'o1 mini',
      desc: 'Reasoning model · Slower, smarter',
    },
    {
      id: 'o3-mini',
      ocModel: 'openai/o3-mini',
      label: 'o3 mini',
      desc: 'Latest reasoning model',
      badge: 'New',
      badgeColor: 'bg-blue-100 text-blue-700',
    },
  ],

  google: [
    {
      id: 'gemini-1.5-flash',
      ocModel: 'google/gemini-flash-1.5',
      label: 'Gemini 1.5 Flash',
      desc: 'Fastest Google model · Very affordable',
      badge: 'Cheapest',
      badgeColor: 'bg-green-100 text-green-700',
    },
    {
      id: 'gemini-1.5-pro',
      ocModel: 'google/gemini-pro-1.5',
      label: 'Gemini 1.5 Pro',
      desc: 'Balanced Google model',
    },
    {
      id: 'gemini-2.0-flash',
      ocModel: 'google/gemini-2.0-flash',
      label: 'Gemini 2.0 Flash',
      desc: 'Latest Google model · Fast and capable',
      badge: 'Recommended',
      badgeColor: 'bg-blue-100 text-blue-700',
    },
  ],
};

// Default model ID per provider (used when no model is selected)
export const DEFAULT_MODEL_ID: Record<string, string> = {
  anthropic: 'claude-haiku-4-5',
  openrouter: 'anthropic/claude-sonnet-4-5',
  openai: 'gpt-4o-mini',
  google: 'gemini-1.5-flash',
};

/**
 * Resolve the OpenClaw model string for a provider + selected model ID.
 * Falls back to the provider default if the model ID is not found.
 */
export function resolveOcModel(provider: string, selectedModelId?: string): string {
  const models = PROVIDER_MODELS[provider] || [];
  const fallbackId = DEFAULT_MODEL_ID[provider] || 'openai/gpt-4o-mini';

  if (selectedModelId) {
    const found = models.find((m) => m.id === selectedModelId);
    if (found) return found.ocModel;
  }

  const fallback = models.find((m) => m.id === fallbackId);
  return fallback?.ocModel || 'openai/gpt-4o-mini';
}

/**
 * Get the human-readable label for a provider + model ID.
 */
export function resolveModelLabel(provider: string, selectedModelId?: string): string {
  const models = PROVIDER_MODELS[provider] || [];
  const fallbackId = DEFAULT_MODEL_ID[provider];

  const modelId = selectedModelId || fallbackId;
  const found = models.find((m) => m.id === modelId);
  return found?.label || modelId || provider;
}
