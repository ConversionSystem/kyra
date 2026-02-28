/**
 * BYOK (Bring Your Own Key) — Agency API key resolution
 *
 * When an agency adds their own OpenAI/Anthropic/etc key,
 * they should NOT be charged platform credits for AI operations
 * that use their key.
 *
 * This module resolves which API key to use and whether
 * credits should be charged.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export interface ResolvedKey {
  apiKey: string;
  provider: 'openai' | 'anthropic' | 'openrouter' | 'google';
  model: string;
  isByok: boolean;  // true = agency's own key, skip credits
}

/**
 * Resolve the best API key for an agency.
 * Priority: agency BYOK → platform default
 *
 * Returns { apiKey, provider, model, isByok }
 * isByok=true means the agency is using their own key — don't charge credits.
 */
export async function resolveAgencyApiKey(
  agencyId: string,
  preferredProvider: 'openai' | 'anthropic' | 'openrouter' | 'google' = 'openai',
): Promise<ResolvedKey> {
  const supabase = createServiceClientWithoutCookies();

  const { data: agency } = await supabase
    .from('agencies')
    .select('api_keys')
    .eq('id', agencyId)
    .single();

  const keys = (agency?.api_keys as Record<string, unknown>) || {};
  const selectedModels = (keys.selected_models as Record<string, string>) || {};

  // Check if agency has their own key for the preferred provider
  if (keys[preferredProvider]) {
    return {
      apiKey: keys[preferredProvider] as string,
      provider: preferredProvider,
      model: selectedModels[preferredProvider] || getDefaultModel(preferredProvider),
      isByok: true,
    };
  }

  // Check other providers the agency might have
  const providerPriority: Array<'openai' | 'anthropic' | 'openrouter' | 'google'> = [
    'openai', 'anthropic', 'openrouter', 'google',
  ];

  for (const provider of providerPriority) {
    if (provider !== preferredProvider && keys[provider]) {
      return {
        apiKey: keys[provider] as string,
        provider,
        model: selectedModels[provider] || getDefaultModel(provider),
        isByok: true,
      };
    }
  }

  // Fall back to platform key
  const platformKey = process.env.OPENAI_API_KEY || '';
  return {
    apiKey: platformKey,
    provider: 'openai',
    model: 'gpt-4o',
    isByok: false,
  };
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
