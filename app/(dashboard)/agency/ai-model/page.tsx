export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';
import { AiModelClient } from './ai-model-client';

export default async function AiModelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const { agency } = result;
  const agencySettings = (agency.settings as Record<string, unknown>) ?? {};

  // Resolve solo client — same logic as /agency page
  const clients = await getAgencyClients(agency.id);
  let soloClient = clients[0] ?? null;
  if (!soloClient && agencySettings.solo_client_id) {
    const { data: fetchedClient } = await supabase
      .from('agency_clients')
      .select('id, ai_model')
      .eq('id', agencySettings.solo_client_id as string)
      .single();
    if (fetchedClient) soloClient = fetchedClient as unknown as typeof clients[0];
  }

  if (!soloClient) {
    // No client yet — redirect home
    redirect('/agency');
  }

  const currentModel =
    ((soloClient as unknown) as Record<string, unknown> & { ai_model?: string }).ai_model ?? 'gpt-4o-mini';

  return <AiModelClient clientId={soloClient.id} initialModel={currentModel} />;
}
