import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { AISetupClient } from './ai-setup-client';

export const dynamic = 'force-dynamic';

export default async function AISetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const settings = (result.agency.settings as Record<string, unknown>) ?? {};
  let clientId = (settings.solo_client_id as string) ?? null;

  if (!clientId) {
    const { data: firstClient } = await supabase
      .from('agency_clients')
      .select('id')
      .eq('agency_id', result.agency.id)
      .limit(1)
      .maybeSingle();
    clientId = firstClient?.id ?? null;
  }

  return (
    <AISetupClient
      agencyId={result.agency.id}
      businessName={result.agency.name}
      clientId={clientId}
    />
  );
}
