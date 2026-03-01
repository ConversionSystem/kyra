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

  const { agency } = result;
  let clients = await getAgencyClients(agency.id);

  // For solo accounts (or any account with an agency gateway but no clients),
  // create a synthetic "client" entry from the agency's own gateway
  if (clients.length === 0 && agency.gateway_url) {
    const agencyAsClient = {
      id: agency.id,
      agency_id: agency.id,
      name: agency.name,
      industry: 'AI Worker',
      status: 'active' as const,
      gateway_url: agency.gateway_url,
      gateway_token: (agency as any).gateway_token ?? null,
      gateway_status: (agency as any).gateway_status ?? 'running',
      gateway_container_id: `kyra-cl-${agency.id}`,
      usage_this_month: 0,
      billing_amount_cents: 0,
      created_at: agency.created_at,
      updated_at: agency.created_at,
      settings: {},
      container_config: {},
      template: null,
      ghl_location_id: null,
      template_id: null,
    };
    clients = [agencyAsClient as any];
  }

  return <HeartbeatClient clients={clients} />;
}
