import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { getAgencyCredits, getCreditTransactions } from '@/lib/billing/credit-engine';
import { CreditsClient } from './credits-client';

export const metadata = { title: 'Credits — Kyra' };
export const dynamic = 'force-dynamic';

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const { checkout } = await searchParams;

  const [balance, transactions] = await Promise.all([
    getAgencyCredits(result.agency.id),
    getCreditTransactions(result.agency.id, 10),
  ]);

  return (
    <CreditsClient
      agencyId={result.agency.id}
      balance={balance.balance}
      lifetimePurchased={balance.lifetimePurchased}
      lifetimeUsed={balance.lifetimeUsed}
      recentTransactions={transactions}
      checkoutStatus={checkout ?? null}
    />
  );
}
