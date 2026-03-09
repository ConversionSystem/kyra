export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { AiModelClient } from './ai-model-client';

export default async function AiModelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const { agency } = result;
  const settings = (agency.settings as Record<string, unknown>) ?? {};

  // Model preference — stored in agency.settings.ai_model
  let currentModel = (settings.ai_model as string) ?? 'gpt-4o-mini';

  // If agency settings doesn't have ai_model yet, check the client row
  if (!settings.ai_model) {
    const clientId = settings.solo_client_id as string | undefined;
    if (clientId) {
      const { data } = await supabase
        .from('agency_clients')
        .select('ai_model')
        .eq('id', clientId)
        .maybeSingle();
      if (data?.ai_model) currentModel = data.ai_model as string;
    }
  }

  // Determine which providers the agency has BYOK keys for
  const { data: agencyRow } = await supabase
    .from('agencies')
    .select('api_keys')
    .eq('id', agency.id)
    .single();

  const apiKeys = (agencyRow?.api_keys as Record<string, unknown>) ?? {};
  const availableProviders: ('openai' | 'anthropic' | 'google')[] = ['openai'];
  if (apiKeys.anthropic) availableProviders.push('anthropic');
  if (apiKeys.google) availableProviders.push('google');
  // OpenRouter can serve any provider
  if (apiKeys.openrouter) {
    if (!availableProviders.includes('anthropic')) availableProviders.push('anthropic');
    if (!availableProviders.includes('google')) availableProviders.push('google');
  }

  return (
    <AiModelClient
      initialModel={currentModel}
      availableProviders={availableProviders}
    />
  );
}
