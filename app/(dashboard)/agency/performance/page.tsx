import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';
import { PerformanceClient } from './performance-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Performance — Kyra' };

export default async function PerformancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const clients = await getAgencyClients(result.agency.id);

  return (
    <PerformanceClient
      clients={clients}
      agencyId={result.agency.id}
      agencySettings={result.agency.settings as Record<string, unknown>}
    />
  );
}
