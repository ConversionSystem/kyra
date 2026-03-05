import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { BillingPageClient } from './billing-page-client';

export const metadata = { title: 'Billing — Kyra' };

export default async function AgencyBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string; checkout?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const { upgrade, checkout } = await searchParams;

  // Fetch agency details with billing fields
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, plan, stripe_customer_id')
    .eq('id', result.agency.id)
    .single();

  if (!agency) redirect('/agency');

  // Get client count and total conversation usage for cost estimate
  const { data: clientRows } = await supabase
    .from('agency_clients')
    .select('id, status, usage_this_month')
    .eq('agency_id', result.agency.id);

  const clientCount = (clientRows ?? []).filter(
    (c) => c.status === 'active' || c.status === 'setup'
  ).length;

  const totalConversationsThisMonth = (clientRows ?? []).reduce(
    (sum: number, c: { usage_this_month: number }) => sum + (c.usage_this_month ?? 0),
    0
  );

  const agencySettings = (result.agency.settings ?? {}) as Record<string, unknown>;
  const isSolo = agencySettings.account_type === 'solo';

  return (
    <BillingPageClient
      agency={agency as { id: string; name: string; plan: string; stripe_customer_id: string | null }}
      clientCount={clientCount}
      totalConversationsThisMonth={totalConversationsThisMonth}
      checkoutStatus={checkout ?? null}
      autoUpgradePlan={upgrade ?? null}
      isSolo={isSolo}
    />
  );
}
