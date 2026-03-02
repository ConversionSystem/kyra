import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';
import { ClientsListView } from './clients-list-view';
import { getPlanClientLimit } from '@/lib/billing/plans';

export default async function AgencyClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  // Solo users don't manage clients — redirect to overview
  const settings = (result.agency.settings as Record<string, unknown>) ?? {};
  if (settings.account_type === 'solo') {
    redirect('/agency');
  }

  const clients = await getAgencyClients(result.agency.id);
  const plan = result.agency.plan || 'free';
  const clientLimit = getPlanClientLimit(plan);

  return <ClientsListView clients={clients} plan={plan} clientLimit={clientLimit} />;
}
