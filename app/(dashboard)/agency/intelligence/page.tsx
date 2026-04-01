export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { IntelligenceClient } from './intelligence-client';

export default async function AgencyIntelligencePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  // Plan gating: pro/scale or master only
  const { agency } = result;
  const agencyRaw = agency as unknown as Record<string, unknown>;
  const isMaster = agencyRaw.account_level === 'master';
  if (!['pro', 'scale'].includes(agency.plan) && !isMaster) {
    redirect('/agency/billing');
  }

  return <IntelligenceClient />;
}
