export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import QuickAnswersPageClient from './quick-answers-client';

export default async function QuickAnswersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const { agency } = result;
  const settings = (agency.settings as Record<string, unknown>) ?? {};

  // Resolve the client ID — solo_client_id first, then first client
  let clientId = (settings.solo_client_id as string) ?? null;

  if (!clientId) {
    const { data: clients } = await supabase
      .from('agency_clients')
      .select('id')
      .eq('agency_id', agency.id)
      .limit(1)
      .maybeSingle();
    clientId = clients?.id ?? null;
  }

  return (
    <QuickAnswersPageClient
      agencyId={agency.id}
      clientId={clientId}
      businessName={agency.name}
    />
  );
}
