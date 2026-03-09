export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { AiModelClient } from './ai-model-client';
import { AiModelNoClient } from './ai-model-no-client';

export default async function AiModelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const { agency } = result;
  const agencySettings = (agency.settings as Record<string, unknown>) ?? {};

  // 1. Try solo_client_id from settings first (most reliable for solo accounts)
  let clientId: string | null = null;
  let currentModel = 'gpt-4o-mini';

  if (agencySettings.solo_client_id) {
    const { data } = await supabase
      .from('agency_clients')
      .select('id, ai_model')
      .eq('id', agencySettings.solo_client_id as string)
      .single();
    if (data) {
      clientId = data.id;
      currentModel = (data as Record<string, unknown> & { ai_model?: string }).ai_model ?? 'gpt-4o-mini';
    }
  }

  // 2. Fallback: first client in agency_clients for this agency
  if (!clientId) {
    const { data } = await supabase
      .from('agency_clients')
      .select('id, ai_model')
      .eq('agency_id', agency.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
    if (data) {
      clientId = data.id;
      currentModel = (data as Record<string, unknown> & { ai_model?: string }).ai_model ?? 'gpt-4o-mini';
    }
  }

  // 3. No client container yet — show provisioning message instead of redirecting
  if (!clientId) {
    return <AiModelNoClient />;
  }

  return <AiModelClient clientId={clientId} initialModel={currentModel} />;
}
