import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import ReferralsClient from './referrals-client';

export const metadata = { title: 'Referral Machine — Kyra' };

export default async function ReferralsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const serviceClient = createServiceClientWithoutCookies();

  const { data: referrals } = await serviceClient
    .from('agency_referrals')
    .select('id, status, referred_email, created_at, referred_id, early_bird, referrer_credits_granted, friend_credits_granted')
    .eq('referrer_id', result.agency.id)
    .order('created_at', { ascending: false });

  // Streak: referrals in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
  const weeklyCount = referrals?.filter(r => r.created_at > sevenDaysAgo).length ?? 0;

  // Credits earned from referrals
  const creditsEarned = referrals?.reduce((sum, r) => sum + (r.referrer_credits_granted ?? 0), 0) ?? 0;

  const stats = {
    total: referrals?.length ?? 0,
    signedUp: referrals?.filter(r => ['signed_up', 'activated', 'converted'].includes(r.status)).length ?? 0,
    activated: referrals?.filter(r => ['activated', 'converted'].includes(r.status)).length ?? 0,
    weeklyCount,
    creditsEarned,
  };

  return (
    <ReferralsClient
      agencyId={result.agency.id}
      agencyName={result.agency.name}
      agencyCreatedAt={result.agency.created_at ?? new Date().toISOString()}
      referrals={referrals ?? []}
      stats={stats}
    />
  );
}
