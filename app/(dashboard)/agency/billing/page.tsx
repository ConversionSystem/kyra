import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  ArrowUpRight,
  BarChart3,
  Users,
  Zap,
  Link as LinkIcon,
} from 'lucide-react';
import type { AgencyBilling, AgencyPlan } from '@/lib/agency/types';

// ---------- plan configuration ----------

const PLAN_CONFIG: Record<
  AgencyPlan,
  { label: string; price: string; priceCents: number; includedClients: number }
> = {
  starter: { label: 'Starter', price: '$49/mo', priceCents: 4900, includedClients: 5 },
  pro: { label: 'Pro', price: '$149/mo', priceCents: 14900, includedClients: 25 },
  scale: { label: 'Scale', price: '$399/mo', priceCents: 39900, includedClients: 100 },
};

const planBadgeColors: Record<AgencyPlan, string> = {
  starter: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
  pro: 'border-violet-500/50 bg-violet-500/10 text-violet-400',
  scale: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
};

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const typeLabels: Record<string, string> = {
  subscription: 'Subscription',
  client_fee: 'Client Fee',
  credit_topup: 'Credit Top-up',
  payout: 'Payout',
};

const typeColors: Record<string, string> = {
  subscription: 'text-violet-400',
  client_fee: 'text-cyan-400',
  credit_topup: 'text-green-400',
  payout: 'text-amber-400',
};

export default async function AgencyBillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/chat');

  const { agency } = result;
  const plan = PLAN_CONFIG[agency.plan] ?? PLAN_CONFIG.starter;

  // Fetch clients + billing in parallel
  const [clients, billingResult] = await Promise.all([
    getAgencyClients(agency.id),
    supabase
      .from('agency_billing')
      .select('*, client:agency_clients(name)')
      .eq('agency_id', agency.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const billingRecords = (billingResult.data ?? []) as (AgencyBilling & {
    client: { name: string } | null;
  })[];

  const totalUsage = clients.reduce((sum, c) => sum + c.usage_this_month, 0);
  const isPremium = agency.plan === 'pro' || agency.plan === 'scale';
  const hasStripeConnect = !!agency.stripe_connect_account_id;

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Billing</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Manage your subscription, usage, and billing history
        </p>
      </div>

      {/* Top cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Current Plan */}
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Current Plan</p>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-zinc-100">{plan.label}</h2>
                  <Badge className={planBadgeColors[agency.plan]}>
                    {plan.price}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-400">
                  {clients.length} / {plan.includedClients} clients used
                </p>

                {/* Progress bar */}
                <div className="mt-3 h-2 w-full max-w-xs rounded-full bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-violet-500 transition-all"
                    style={{
                      width: `${Math.min(100, (clients.length / plan.includedClients) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <Button variant="outline" size="sm" className="gap-2 shrink-0">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage */}
        <Card>
          <CardContent className="p-6">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Usage This Period</p>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <Zap className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">{totalUsage.toLocaleString()}</p>
                <p className="text-xs text-zinc-500">credits across all clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stripe Connect (Pro/Scale only) */}
      {isPremium && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-violet-500/10 p-2.5 mt-0.5">
                  <LinkIcon className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-100 mb-1">Stripe Connect</h3>
                  {hasStripeConnect ? (
                    <>
                      <p className="text-sm text-zinc-400">
                        Your Stripe account is connected. You can bill your clients directly.
                      </p>
                      <Badge className="mt-2 border-green-500/50 bg-green-500/10 text-green-400">
                        Connected
                      </Badge>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-400">
                      Connect your Stripe account to bill your clients and receive payouts
                      automatically.
                    </p>
                  )}
                </div>
              </div>
              {!hasStripeConnect && (
                <Button size="sm" className="gap-2 shrink-0">
                  <CreditCard className="h-3.5 w-3.5" />
                  Connect Stripe
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing History</CardTitle>
          <CardDescription>Recent invoices and transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {billingRecords.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500">No billing records yet.</p>
              <p className="text-xs text-zinc-600 mt-1">
                Transactions will appear here once your subscription starts.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-400 text-left border-b border-zinc-800 bg-zinc-900/50">
                      <th className="p-3 font-medium">Date</th>
                      <th className="p-3 font-medium">Type</th>
                      <th className="p-3 font-medium">Client</th>
                      <th className="p-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingRecords.map((record) => (
                      <tr
                        key={record.id}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors"
                      >
                        <td className="p-3 text-zinc-300">{formatDate(record.created_at)}</td>
                        <td className="p-3">
                          <span className={typeColors[record.type] ?? 'text-zinc-400'}>
                            {typeLabels[record.type] ?? record.type}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-400">
                          {record.client?.name ?? '—'}
                        </td>
                        <td className="p-3 text-right font-medium text-zinc-100">
                          {formatCents(record.amount_cents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
