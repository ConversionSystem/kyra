import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { AISetupClient } from './ai-setup-client';

export const dynamic = 'force-dynamic';

/** Extract the container UUID from a gateway URL like
 *  https://01b74bad-3308-4a91-b5ad-a6efa45d367d.gw.kyra.conversionsystem.com */
function extractContainerId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\./);
  return m?.[1] ?? null;
}

export default async function AISetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const { agency } = result;
  const settings = (agency.settings as Record<string, unknown>) ?? {};
  const isSolo = settings.account_type === 'solo';

  // Resolve clientId: solo_client_id → first agency_client → extract from gateway URL
  let clientId: string | null = (settings.solo_client_id as string) ?? null;

  if (!clientId) {
    const { data: firstClient } = await supabase
      .from('agency_clients')
      .select('id')
      .eq('agency_id', agency.id)
      .limit(1)
      .maybeSingle();
    clientId = firstClient?.id ?? null;
  }

  // Last resort: extract container ID from the agency gateway URL
  if (!clientId) {
    const { data: agencyRow } = await supabase
      .from('agencies')
      .select('gateway_url')
      .eq('id', agency.id)
      .single();
    clientId = extractContainerId(agencyRow?.gateway_url as string | null) ?? null;
  }

  return (
    <AISetupClient
      agencyId={agency.id}
      businessName={agency.name}
      clientId={clientId}
      isSolo={isSolo}
    />
  );
}
