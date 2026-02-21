import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';
import { HeartbeatClient } from './heartbeat-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Heartbeat Protocol — Kyra' };

export default async function HeartbeatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const clients = await getAgencyClients(result.agency.id);

  return <HeartbeatClient clients={clients} />;
}
