import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';
import { ClientsListView } from './clients-list-view';

export default async function AgencyClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/chat');

  const clients = await getAgencyClients(result.agency.id);

  return <ClientsListView clients={clients} />;
}
