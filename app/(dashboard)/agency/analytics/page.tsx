export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';
import { AnalyticsClient } from './analytics-client';

export default async function AgencyAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const agencyClients = await getAgencyClients(result.agency.id);
  const clientRates = agencyClients.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    monthlyRate: ((c.settings as Record<string, unknown>)?.monthly_rate as number) ?? 0,
  }));

  return <AnalyticsClient agencyPlan={result.agency.plan} clients={clientRates} />;
}
