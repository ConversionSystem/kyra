import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import ReferralsClient from './referrals-client';

export const metadata = { title: 'Referrals — Kyra' };

export default async function ReferralsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const serviceClient = createServiceClientWithoutCookies();
  const { data: referrals } = await serviceClient
    .from('agency_referrals')
    .select('id, status, referred_email, created_at, referred_id')
    .eq('referrer_id', result.agency.id)
    .order('created_at', { ascending: false });

  const stats = {
    total: referrals?.length ?? 0,
    signedUp: referrals?.filter(r => r.status !== 'pending').length ?? 0,
    converted: referrals?.filter(r => ['converted', 'paid_out'].includes(r.status)).length ?? 0,
  };

  return (
    <ReferralsClient
      agencyId={result.agency.id}
      agencyName={result.agency.name}
      referrals={referrals ?? []}
      stats={stats}
    />
  );
}
