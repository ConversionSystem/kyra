'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CreditCard,
  ArrowUpRight,
  BarChart3,
  Users,
  Zap,
  Link as LinkIcon,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Loader2,
} from 'lucide-react';

// ---------- Types ----------

interface AgencyData {
  id: string;
  plan: 'starter' | 'pro' | 'scale';
  stripe_connect_account_id: string | null;
  stripe_onboarding_complete: boolean;
  default_client_price_cents: number;
}

interface ClientData {
  id: string;
  name: string;
  billing_amount_cents: number;
  billing_status: string;
  stripe_subscription_id: string | null;
  usage_this_month: number;
  status: string;
}

interface BillingRecord {
  id: string;
  type: string;
  amount_cents: number;
  created_at: string;
  client: { name: string } | null;
}

interface ConnectStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

interface BillingClientProps {
  agency: AgencyData;
  clients: ClientData[];
  billingRecords: BillingRecord[];
  connectStatus: ConnectStatus;
}

// ---------- Config ----------

const PLAN_CONFIG: Record<
  string,
  { label: string; price: string; priceCents: number; includedClients: number }
> = {
  starter: { label: 'Lite', price: '$99/mo', priceCents: 9900, includedClients: 5 },
  pro: { label: 'Pro', price: '$249/mo', priceCents: 24900, includedClients: 25 },
  scale: { label: 'Scale', price: '$499/mo', priceCents: 49900, includedClients: 100 },
};

const planBadgeColors: Record<string, string> = {
  starter: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
  pro: 'border-violet-500/50 bg-violet-500/10 text-violet-400',
  scale: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
};

const billingStatusBadge: Record<string, { label: string; class: string }> = {
  none: { label: 'Not Billed', class: 'border-zinc-600/50 bg-zinc-600/10 text-zinc-400' },
  active: { label: 'Active', class: 'border-green-500/50 bg-green-500/10 text-green-400' },
  past_due: { label: 'Past Due', class: 'border-red-500/50 bg-red-500/10 text-red-400' },
  canceled: { label: 'Canceled', class: 'border-zinc-500/50 bg-zinc-500/10 text-zinc-500' },
  trialing: { label: 'Trialing', class: 'border-blue-500/50 bg-blue-500/10 text-blue-400' },
};

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

// ---------- Component ----------

export default function BillingClient({
  agency,
  clients,
  billingRecords,
  connectStatus,
}: BillingClientProps) {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState<string | null>(null);
  const [defaultPrice, setDefaultPrice] = useState(
    (agency.default_client_price_cents / 100).toString()
  );
  const [priceEditing, setPriceEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = PLAN_CONFIG[agency.plan] ?? PLAN_CONFIG.starter;
  const isPremium = agency.plan === 'pro' || agency.plan === 'scale';

  // Revenue calculations
  const activeClients = clients.filter(c => c.billing_status === 'active');
  const monthlyRevenue = activeClients.reduce((sum, c) => sum + c.billing_amount_cents, 0);
  const platformFee = Math.round(monthlyRevenue * 0.10);
  const netRevenue = monthlyRevenue - platformFee;
  const totalUsage = clients.reduce((sum, c) => sum + c.usage_this_month, 0);

  async function handleConnectStripe() {
    setLoading('connect');
    setError(null);
    try {
      const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to start onboarding');
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Stripe');
    } finally {
      setLoading(null);
    }
  }

  async function handleStripeDashboard() {
    setLoading('dashboard');
    setError(null);
    try {
      const res = await fetch('/api/stripe/connect/dashboard', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to open dashboard');
      window.open(data.url, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open dashboard');
    } finally {
      setLoading(null);
    }
  }

  async function handleUpdateDefaultPrice() {
    const cents = Math.round(parseFloat(defaultPrice) * 100);
    if (isNaN(cents) || cents < 100) {
      setError('Price must be at least $1.00');
      return;
    }
    setLoading('price');
    setError(null);
    try {
      const res = await fetch('/api/agency/billing/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_client_price_cents: cents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update price');
      setPriceEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update price');
    } finally {
      setLoading(null);
    }
  }

  async function handleActivateClient(clientId: string) {
    setLoading(`activate-${clientId}`);
    setError(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to activate billing');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate billing');
    } finally {
      setLoading(null);
    }
  }

  async function handleCancelClient(clientId: string) {
    if (!confirm('Cancel billing for this client? They will not be charged at the next cycle.')) return;
    setLoading(`cancel-${clientId}`);
    setError(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to cancel billing');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel billing');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Billing</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Manage your subscription, client billing, and Stripe Connect payouts
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">{error}</p>
            <button
              className="text-xs text-red-400 underline mt-1"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Top cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Current Plan */}
        <Card>
          <CardContent className="p-6">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Current Plan</p>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-zinc-100">{plan.label}</h2>
              <Badge className={planBadgeColors[agency.plan]}>
                {plan.price}
              </Badge>
            </div>
            <p className="text-sm text-zinc-400">
              {clients.length} / {plan.includedClients} clients
            </p>
            <div className="mt-3 h-2 w-full rounded-full bg-zinc-800">
              <div
                className="h-2 rounded-full bg-violet-500 transition-all"
                style={{
                  width: `${Math.min(100, (clients.length / plan.includedClients) * 100)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardContent className="p-6">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Monthly Revenue</p>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">{formatCents(netRevenue)}</p>
                <p className="text-xs text-zinc-500">
                  {formatCents(monthlyRevenue)} gross − {formatCents(platformFee)} platform fee
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage */}
        <Card>
          <CardContent className="p-6">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Usage This Period</p>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-500/10 p-2">
                <Zap className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">{totalUsage.toLocaleString()}</p>
                <p className="text-xs text-zinc-500">credits across {activeClients.length} active clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stripe Connect Card */}
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
                  {connectStatus.connected && connectStatus.chargesEnabled ? (
                    <>
                      <p className="text-sm text-zinc-400">
                        Your Stripe account is connected and ready to accept payments.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="border-green-500/50 bg-green-500/10 text-green-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                        {connectStatus.payoutsEnabled && (
                          <Badge className="border-green-500/50 bg-green-500/10 text-green-400">
                            Payouts Enabled
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-2">
                        10% platform fee on all client payments. Payouts processed by Stripe on a rolling basis.
                      </p>
                    </>
                  ) : connectStatus.connected && !connectStatus.chargesEnabled ? (
                    <>
                      <p className="text-sm text-zinc-400">
                        Your Stripe account is connected but onboarding is incomplete.
                        Please finish setup to start accepting payments.
                      </p>
                      <Badge className="mt-2 border-amber-500/50 bg-amber-500/10 text-amber-400">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Onboarding Incomplete
                      </Badge>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-400">
                      Connect your Stripe account to bill your clients directly
                      and receive payouts. Kyra takes a 10% platform fee.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                {connectStatus.connected && connectStatus.chargesEnabled ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={handleStripeDashboard}
                    disabled={loading === 'dashboard'}
                  >
                    {loading === 'dashboard' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5" />
                    )}
                    Stripe Dashboard
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={handleConnectStripe}
                    disabled={loading === 'connect'}
                  >
                    {loading === 'connect' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CreditCard className="h-3.5 w-3.5" />
                    )}
                    {connectStatus.connected ? 'Finish Setup' : 'Connect Stripe'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Default Pricing */}
      {isPremium && connectStatus.connected && connectStatus.chargesEnabled && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Default Client Pricing</CardTitle>
            <CardDescription>
              Set the default monthly price for new clients. You can customize per-client below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-lg">$</span>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={defaultPrice}
                  onChange={(e) => {
                    setDefaultPrice(e.target.value);
                    if (!priceEditing) setPriceEditing(true);
                  }}
                  className="w-32"
                />
                <span className="text-zinc-400 text-sm">/mo per client</span>
              </div>
              {priceEditing && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleUpdateDefaultPrice}
                    disabled={loading === 'price'}
                  >
                    {loading === 'price' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDefaultPrice((agency.default_client_price_cents / 100).toString());
                      setPriceEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              You keep 90% ({formatCents(Math.round(agency.default_client_price_cents * 0.9))}/client).
              Kyra platform fee: 10% ({formatCents(Math.round(agency.default_client_price_cents * 0.1))}/client).
            </p>
          </CardContent>
        </Card>
      )}

      {/* Client Billing Table */}
      {isPremium && connectStatus.connected && connectStatus.chargesEnabled && clients.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Billing
            </CardTitle>
            <CardDescription>
              Manage per-client subscriptions. Activate billing to start charging.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-400 text-left border-b border-zinc-800 bg-zinc-900/50">
                      <th className="p-3 font-medium">Client</th>
                      <th className="p-3 font-medium">Monthly Price</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Your Earnings</th>
                      <th className="p-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => {
                      const statusBadge = billingStatusBadge[client.billing_status] ?? billingStatusBadge.none;
                      const clientEarnings = client.billing_status === 'active'
                        ? Math.round(client.billing_amount_cents * 0.9)
                        : 0;

                      return (
                        <tr
                          key={client.id}
                          className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors"
                        >
                          <td className="p-3">
                            <div>
                              <span className="text-zinc-100 font-medium">{client.name}</span>
                              <span className="text-xs text-zinc-500 ml-2">
                                {client.status}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-zinc-300">
                            {client.billing_amount_cents > 0
                              ? formatCents(client.billing_amount_cents)
                              : formatCents(agency.default_client_price_cents)}
                          </td>
                          <td className="p-3">
                            <Badge className={statusBadge.class}>
                              {statusBadge.label}
                            </Badge>
                          </td>
                          <td className="p-3 text-zinc-300">
                            {clientEarnings > 0 ? formatCents(clientEarnings) : '—'}
                          </td>
                          <td className="p-3 text-right">
                            {client.billing_status === 'none' ? (
                              <Button
                                size="sm"
                                className="gap-1"
                                onClick={() => handleActivateClient(client.id)}
                                disabled={loading === `activate-${client.id}`}
                              >
                                {loading === `activate-${client.id}` ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Zap className="h-3.5 w-3.5" />
                                )}
                                Activate
                              </Button>
                            ) : client.billing_status === 'active' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                                onClick={() => handleCancelClient(client.id)}
                                disabled={loading === `cancel-${client.id}`}
                              >
                                {loading === `cancel-${client.id}` ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  'Cancel'
                                )}
                              </Button>
                            ) : (
                              <span className="text-xs text-zinc-500">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Summary (if billing is active) */}
      {activeClients.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <p className="text-xs text-zinc-500 mb-1">Active Subscriptions</p>
                <p className="text-xl font-bold text-zinc-100">{activeClients.length}</p>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <p className="text-xs text-zinc-500 mb-1">Gross MRR</p>
                <p className="text-xl font-bold text-zinc-100">{formatCents(monthlyRevenue)}</p>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <p className="text-xs text-zinc-500 mb-1">Platform Fee (10%)</p>
                <p className="text-xl font-bold text-red-400">−{formatCents(platformFee)}</p>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <p className="text-xs text-zinc-500 mb-1">Your Net Revenue</p>
                <p className="text-xl font-bold text-green-400">{formatCents(netRevenue)}</p>
              </div>
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
                Transactions will appear here once billing starts.
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
