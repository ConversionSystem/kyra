import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';
import { VoiceHubClient } from './voice-hub-client';

export default async function VoicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const { agency } = result;
  const clients = await getAgencyClients(agency.id);

  // Build per-client voice status from container_config
  const clientVoiceRows = clients.map(c => {
    const cc = (c.container_config ?? {}) as Record<string, unknown>;
    const vc = (cc.voice_config ?? {}) as Record<string, unknown>;
    return {
      id: c.id,
      name: c.name,
      industry: c.industry ?? null,
      voiceEnabled: !!(vc.enabled),
      provider: typeof vc.provider === 'string' ? vc.provider : null,
      phoneNumber: typeof vc.phoneNumber === 'string' ? vc.phoneNumber : null,
      assistantId: typeof vc.assistantId === 'string' ? vc.assistantId : null,
    };
  });

  // Fetch voice usage for this agency
  const svc = createServiceClientWithoutCookies();
  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  const [usageResult, callCountResult] = await Promise.all([
    svc
      .from('voice_usage')
      .select('minutes_used, minute_limit')
      .eq('agency_id', agency.id)
      .eq('month', currentMonth)
      .maybeSingle(),

    svc
      .from('voice_call_logs')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agency.id),
  ]);

  const usage = usageResult.data
    ? { minutesUsed: usageResult.data.minutes_used ?? 0, minuteLimit: usageResult.data.minute_limit ?? 0 }
    : null;

  const totalCallCount = callCountResult.count ?? 0;

  return (
    <VoiceHubClient
      clients={clientVoiceRows}
      usage={usage}
      totalCallCount={totalCallCount}
      agencyId={agency.id}
    />
  );
}
