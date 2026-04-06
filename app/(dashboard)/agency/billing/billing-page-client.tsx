'use client';

// ============================================================================
// Billing Page — Plan management, annual toggle, Solo Pro, Voice Add-on
// Real-time credit + usage polling. No trial language.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, Zap, ArrowUpRight, Loader2, AlertCircle,
  Crown, Users, BarChart3, Phone, MessageSquare,
  Coins, TrendingUp, RefreshCw,
} from 'lucide-react';
import { PLANS, ANNUAL_PRICES, VOICE_ADDON, type Plan } from '@/lib/billing/plans';

interface Props {
  agency: {
    id: string;
    name: string;
    plan: string;
    stripe_customer_id: string | null;
    settings?: Record<string, unknown>;
  };
  clientCount: number;
  totalConversationsThisMonth: number;
  checkoutStatus: string | null;
  autoUpgradePlan: string | null;
  isSolo?: boolean;
  requirePlan?: boolean;
  // Seed values for real-time
  initialCreditsBalance?: number;
  initialCreditsUsed?: number;
}

export function BillingPageClient({
  agency,
  clientCount: initialClientCount,
  totalConversationsThisMonth: initialConversations,
  checkoutStatus,
  autoUpgradePlan,
  isSolo,
  requirePlan = false,
  initialCreditsBalance = 0,
  initialCreditsUsed = 0,
}: Props) {
  const router = useRouter();
  const currentPlan = agency.plan as Plan;

  const [loading, setLoading]         = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [billing, setBilling]         = useState<'monthly' | 'annual'>('monthly');

  // ── Live data ─────────────────────────────────────────────────────────────
  const [creditsBalance, setCreditsBalance]   = useState(initialCreditsBalance);
  const [creditsUsed, setCreditsUsed]         = useState(initialCreditsUsed);
  const [conversations, setConversations]     = useState(initialConversations);
  const [clientCount, setClientCount]         = useState(initialClientCount);
  const [lastUpdated, setLastUpdated]         = useState<Date | null>(null);
  const [polling, setPolling]                 = useState(false);

  const voiceActive = !!(agency.settings?.voice_addon_active);

  const fetchLive = useCallback(async () => {
    setPolling(true);
    try {
      const [credRes, fleetRes] = await Promise.all([
        fetch('/api/agency/credits', { cache: 'no-store' }),
        fetch('/api/agency/fleet',   { cache: 'no-store' }),
      ]);
      if (credRes.ok) {
        const d = await credRes.json();
        setCreditsBalance(d.balance ?? 0);
        setCreditsUsed(d.lifetimeUsed ?? 0);
        window.dispatchEvent(new Event('kyra:credit-update'));
      }
      if (fleetRes.ok) {
        const d = await fleetRes.json();
        setClientCount(d.summary?.total ?? initialClientCount);
        setConversations(
          d.clients?.reduce((s: number, c: { usage_this_month: number }) => s + (c.usage_this_month ?? 0), 0) ?? initialConversations
        );
      }
      setLastUpdated(new Date());
    } catch { /* silent — polling will retry */ }
    finally { setPolling(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchLive();
    const t = setInterval(fetchLive, 30_000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Plan config ───────────────────────────────────────────────────────────
  const PLAN_ORDER: Plan[] = ['starter', 'pro', 'scale'];

  const planIndex = (p: string) => PLAN_ORDER.indexOf(p as Plan);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (autoUpgradePlan && PLAN_ORDER.includes(autoUpgradePlan as Plan) && autoUpgradePlan !== 'free') {
      handleUpgrade(autoUpgradePlan);
    }
  }, []);

  const handleUpgrade = async (planOrAddon: string, isVoiceAddon = false) => {
    setLoading(planOrAddon);
    setError(null);
    try {
      const body = isVoiceAddon
        ? { addon: 'voice', billing }
        : { plan: planOrAddon, billing, ...(requirePlan ? { successRedirect: '/onboarding' } : {}) };
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (data.url) window.location.href = data.url;
      else throw new Error('No checkout URL returned');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(null);
    }
  };

  const handlePortal = async () => {
    setLoading('portal');
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error('Could not open billing portal');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally { setLoading(null); }
  };

  const limit     = PLANS[currentPlan]?.maxClients ?? 1;
  const usagePct  = Math.min(100, Math.round((clientCount / limit) * 100));
  const nearLimit = usagePct >= 80;
  const lowCreds  = creditsBalance <= 10;

  const getPlanPrice = (id: Plan) =>
    billing === 'annual' && ANNUAL_PRICES[id]
      ? ANNUAL_PRICES[id]!.monthly
      : PLANS[id]?.price ?? 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-500" />
            Plans & Billing
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your subscription and track usage in real time.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
          {polling && <RefreshCw className="h-3 w-3 animate-spin" />}
          {lastUpdated && !polling && (
            <span className="hidden sm:inline">Live · {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          )}
          <button onClick={fetchLive} title="Refresh" className="p-1 hover:text-gray-600 transition">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── Required plan gate banner ── */}
      {requirePlan && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 flex items-start gap-4">
          <div className="h-9 w-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <Crown className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-indigo-900">Choose a plan to activate your agency</p>
            <p className="text-sm text-indigo-700 mt-0.5">
              Your account is ready. Pick a plan below to deploy your first AI worker and start serving clients.
            </p>
          </div>
        </div>
      )}

      {/* ── Status Banners ── */}
      {checkoutStatus === 'voice_success' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <div>
            <p className="font-bold text-emerald-900 text-sm">Voice AI Add-on activated! 🎉</p>
            <p className="text-emerald-700 text-xs mt-0.5">Your AI can now answer and make phone calls.</p>
          </div>
        </div>
      )}

      {checkoutStatus === 'success' && (
        <div className="rounded-xl overflow-hidden border border-indigo-200">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-5 sm:p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="text-4xl">🎉</div>
              <div>
                <p className="text-xl font-black">You&apos;re on {PLANS[currentPlan]?.name ?? 'your new plan'}!</p>
                <p className="text-indigo-200 text-sm mt-1">Your client slots are live. Start adding AI workers now.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Client slots',       value: String(PLANS[currentPlan]?.maxClients ?? '?') },
                { label: 'Revenue potential',  value: `$${((PLANS[currentPlan]?.maxClients ?? 1) * 997).toLocaleString()}/mo` },
                { label: 'ROI at 1 client',    value: `${Math.round((997 - (PLANS[currentPlan]?.price ?? 39)) / Math.max(1, PLANS[currentPlan]?.price ?? 39))}×` },
              ].map(s => (
                <div key={s.label} className="bg-white/15 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-white">{s.value}</p>
                  <p className="text-[10px] text-indigo-200 mt-0.5 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
            <Link href="/agency/clients/new" className="block w-full text-center bg-white text-indigo-700 font-black py-3 rounded-xl hover:bg-indigo-50 transition text-sm">
              Add Your First Client Now →
            </Link>
          </div>
        </div>
      )}

      {checkoutStatus === 'cancelled' && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          Checkout was cancelled. No charge was made. Choose a plan below to upgrade.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* ── Current Plan + Live KPIs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Plan card */}
        <div className="lg:col-span-2 bg-white border border-indigo-100 rounded-2xl p-5 bg-gradient-to-br from-indigo-50/40 to-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <Crown className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Current Plan</p>
              <p className="text-xl font-black text-gray-900">{PLANS[currentPlan]?.name ?? currentPlan}</p>
            </div>
            {agency.stripe_customer_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePortal}
                className="ml-auto text-xs shrink-0 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                disabled={loading === 'portal'}
              >
                {loading === 'portal'
                  ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  : <BarChart3 className="h-3.5 w-3.5 mr-1.5" />}
                Manage Billing
              </Button>
            )}
          </div>

          {/* Client slot usage */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> AI Workers
              </span>
              <span className={`text-xs font-bold ${nearLimit ? 'text-amber-600' : 'text-gray-700'}`}>
                {clientCount} / {limit} used
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${nearLimit ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-indigo-500 to-indigo-400'}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            {nearLimit && (
              <p className="text-[11px] text-amber-600 mt-1.5 font-medium">⚠ Approaching your limit — upgrade to add more clients</p>
            )}
          </div>

          {/* Conversations this month */}
          <div className="flex items-center gap-2 mt-3">
            <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">
              <span className="font-semibold text-gray-800">{conversations.toLocaleString()}</span> conversations this month
            </span>
          </div>
        </div>

        {/* Live credits card */}
        <div className={`rounded-2xl border p-5 flex flex-col justify-between ${lowCreds ? 'border-red-200 bg-red-50/50' : 'border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-white'}`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Coins className={`h-4 w-4 ${lowCreds ? 'text-red-500' : 'text-emerald-600'}`} />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Credits</p>
              <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                </span>
                live
              </span>
            </div>
            <p className={`text-4xl font-black mt-1 ${lowCreds ? 'text-red-600' : 'text-gray-900'}`}>
              {creditsBalance.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">remaining</p>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
              <TrendingUp className="h-3 w-3" />
              <span><span className="font-semibold text-gray-700">{creditsUsed.toLocaleString()}</span> used lifetime</span>
            </div>
            {/* Burn bar */}
            {(creditsBalance + creditsUsed) > 0 && (
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${lowCreds ? 'bg-red-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(100, (creditsUsed / Math.max(creditsUsed + creditsBalance, 1)) * 100)}%` }}
                />
              </div>
            )}
            {lowCreds && (
              <p className="text-[11px] text-red-600 font-semibold mt-1.5">
                {creditsBalance === 0 ? 'Out of credits' : `Only ${creditsBalance} left`} — top up below
              </p>
            )}
            <Link href="/agency/credits" className="mt-3 block text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg py-1.5 transition">
              Manage Credits →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Plan Cards ── */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-base font-bold text-gray-900">Choose a plan</h2>

          {/* Monthly / Annual toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${billing === 'annual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Annual
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition ${billing === 'annual' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700'}`}>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const plan        = PLANS[id];
            if (!plan) return null;
            const isCurrent   = id === currentPlan;
            const isLoading   = loading === id;
            const displayPrice = getPlanPrice(id);
            const annualInfo  = ANNUAL_PRICES[id];
            return (
              <Card
                key={id}
                className={`relative flex flex-col transition-all hover:shadow-md ${
                  plan.highlighted ? 'border-indigo-300 shadow-md shadow-indigo-50' : 'border-gray-200'
                } ${isCurrent ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}
              >
                {plan.highlighted && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-sm">
                      Most Popular
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-3 z-10">
                    <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-sm">
                      Current Plan
                    </span>
                  </div>
                )}

                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <CardTitle className="text-base font-bold">{plan.name}</CardTitle>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.badgeColor}`}>
                      {plan.badge}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black text-gray-900">
                      {displayPrice === 0 ? 'Free' : `$${displayPrice}`}
                    </span>
                    {displayPrice > 0 && (
                      <span className="text-gray-400 text-sm">
                        /mo{billing === 'annual' && annualInfo ? ' · annual' : ''}
                      </span>
                    )}
                  </div>
                  {billing === 'annual' && annualInfo && (
                    <p className="text-xs text-green-600 font-semibold">Save ${annualInfo.savings}/year</p>
                  )}

                  <p className="text-sm font-bold mt-1 text-indigo-600">
                    {plan.maxClients} AI worker{plan.maxClients !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                </CardHeader>

                <CardContent className="flex flex-col flex-1 pt-0">
                  <ul className="space-y-1.5 mb-5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button className="w-full text-sm" size="sm" variant="outline" disabled>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-500" /> Current Plan
                    </Button>
                  ) : (
                    <Button
                      className={`w-full text-sm font-semibold ${
                        plan.highlighted
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-0'
                          : ''
                      }`}
                      size="sm"
                      variant={plan.highlighted ? 'default' : 'outline'}
                      onClick={() => handleUpgrade(id)}
                      disabled={!!loading}
                    >
                      {isLoading
                        ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Redirecting...</>
                        : <><ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />{plan.cta}</>}
                    </Button>
                  )}

                  <p className="text-[10px] text-gray-400 text-center mt-2">
                    {billing === 'annual' ? 'Billed annually · cancel anytime' : 'Cancel anytime'}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Voice AI Add-on ── */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-3">Add-ons</h2>
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50/50 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Phone className="h-4 w-4 text-emerald-600" />
                <h3 className="font-bold text-gray-900">{VOICE_ADDON.name}</h3>
                <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-0">ADD-ON</Badge>
                {voiceActive && <Badge className="bg-emerald-600 text-white text-[10px] border-0">✓ ACTIVE</Badge>}
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-black text-gray-900">
                  ${billing === 'annual' ? VOICE_ADDON.annualMonthly : VOICE_ADDON.price}
                </span>
                <span className="text-gray-400 text-sm">
                  /mo{billing === 'annual' ? ' · billed annually' : ''}
                </span>
                {billing === 'annual' && (
                  <span className="text-xs text-green-600 font-semibold ml-1">Save ${VOICE_ADDON.annualSavings}/yr</span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-3">{VOICE_ADDON.description}</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {VOICE_ADDON.features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {voiceActive ? (
              <div className="shrink-0 flex items-center gap-2 bg-emerald-100 text-emerald-700 font-bold px-5 py-2.5 rounded-xl text-sm">
                <CheckCircle2 className="h-4 w-4" /> Voice Active
              </div>
            ) : (
              <button
                onClick={() => handleUpgrade('voice_addon', true)}
                disabled={!!loading}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm disabled:opacity-50 whitespace-nowrap"
              >
                {loading === 'voice_addon'
                  ? <span className="flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" />Redirecting...</span>
                  : `Add Voice AI — $${billing === 'annual' ? VOICE_ADDON.annualMonthly : VOICE_ADDON.price}/mo →`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer note ── */}
      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500">
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        Start free, upgrade anytime. Cancel or change your plan anytime. No setup fees.
      </div>
    </div>
  );
}
