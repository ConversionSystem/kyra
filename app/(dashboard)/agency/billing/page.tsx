import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';
import { getConnectAccountStatus } from '@/lib/stripe/connect';
import BillingClient from './billing-client';
import type { AgencyBilling } from '@/lib/agency/types';

export default async function AgencyBillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/chat');

  const { agency } = result;

  // Fetch clients + billing + connect status in parallel
  const [clients, billingResult, connectStatusResult] = await Promise.all([
    getAgencyClients(agency.id),
    supabase
      .from('agency_billing')
      .select('*, client:agency_clients(name)')
      .eq('agency_id', agency.id)
      .order('created_at', { ascending: false })
      .limit(50),
    getConnectAccountStatus(agency.id).catch(() => null),
  ]);

  const billingRecords = (billingResult.data ?? []) as (AgencyBilling & {
    client: { name: string } | null;
  })[];

  const connectStatus = connectStatusResult
    ? {
        connected: true,
        chargesEnabled: connectStatusResult.chargesEnabled,
        payoutsEnabled: connectStatusResult.payoutsEnabled,
        detailsSubmitted: connectStatusResult.detailsSubmitted,
      }
    : {
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      };

  // Serialize data for client component
  const agencyData = {
    id: agency.id,
    plan: agency.plan as 'starter' | 'pro' | 'scale',
    stripe_connect_account_id: agency.stripe_connect_account_id,
    stripe_onboarding_complete: agency.stripe_onboarding_complete ?? false,
    default_client_price_cents: agency.default_client_price_cents ?? 2900,
  };

  const clientsData = clients.map((c) => ({
    id: c.id,
    name: c.name,
    billing_amount_cents: c.billing_amount_cents,
    billing_status: c.billing_status ?? 'none',
    stripe_subscription_id: c.stripe_subscription_id ?? null,
    usage_this_month: c.usage_this_month,
    status: c.status,
  }));

  const billingData = billingRecords.map((r) => ({
    id: r.id,
    type: r.type,
    amount_cents: r.amount_cents,
    created_at: r.created_at,
    client: r.client,
  }));

  return (
    <BillingClient
      agency={agencyData}
      clients={clientsData}
      billingRecords={billingData}
      connectStatus={connectStatus}
    />
  );
}
