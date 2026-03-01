import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { VoiceClient } from './voice-client';

export default async function VoicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  // Get first client for the agency (solo = the agency's own client)
  const { data: clients } = await supabase
    .from('agency_clients')
    .select('id, name, container_config')
    .eq('agency_id', result.agency.id)
    .limit(1);

  const client = clients?.[0] ?? null;
  const agencySettings = (result.agency.settings ?? {}) as Record<string, unknown>;
  const isSolo = agencySettings.account_type === 'solo';

  return (
    <VoiceClient
      agencyId={result.agency.id}
      clientId={client?.id ?? null}
      clientName={client?.name ?? result.agency.name}
      voiceConfig={(client?.container_config as Record<string, unknown>)?.voice_config as Record<string, string> | null ?? null}
      isSolo={isSolo}
    />
  );
}
