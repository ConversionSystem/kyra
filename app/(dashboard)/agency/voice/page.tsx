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

  const agencySettings = (result.agency.settings ?? {}) as Record<string, unknown>;
  const isSolo = agencySettings.account_type === 'solo';

  // Solo users: their voice AI IS their business — attach to first client
  // Agency users: the sidebar Voice AI is the AGENCY's own number (not tied to any client)
  let clientId: string | null = null;
  let clientName = result.agency.name;
  let voiceConfig: Record<string, string> | null = null;

  if (isSolo) {
    const { data: clients } = await supabase
      .from('agency_clients')
      .select('id, name, container_config')
      .eq('agency_id', result.agency.id)
      .limit(1);
    const client = clients?.[0] ?? null;
    clientId = client?.id ?? null;
    clientName = client?.name ?? result.agency.name;
    voiceConfig = (client?.container_config as Record<string, unknown>)?.voice_config as Record<string, string> | null ?? null;
  } else {
    // Agency level: use agency's own voice config (stored in agencies.settings)
    voiceConfig = (agencySettings.voice_config as Record<string, string>) ?? null;
  }

  return (
    <VoiceClient
      agencyId={result.agency.id}
      clientId={clientId}
      clientName={clientName}
      voiceConfig={voiceConfig}
      isSolo={isSolo}
    />
  );
}
