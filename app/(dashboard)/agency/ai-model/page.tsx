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
  // Falls back to solo_client_id's ai_model if set, then defaults to gpt-4o-mini
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

  // Always show the selector — never redirect or show "not set up"
  return <AiModelClient initialModel={currentModel} />;
}
