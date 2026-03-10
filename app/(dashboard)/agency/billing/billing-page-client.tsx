'use client';

// ============================================================================
// Billing Page — Plan management, annual toggle, Solo Pro, Voice Add-on
// ============================================================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Zap,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  Crown,
  Users,
  BarChart3,
  Star,
  DollarSign,
  MessageSquare,
  Info,
  Phone,
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
}

// Cost estimation: avg conversation ≈ $0.003 (GPT-4o)
const COST_PER_CONVERSATION_USD = 0.0033;

function formatUsd(n: number): string {
  if (n < 1) return `$${n.toFixed(2)}`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function BillingPageClient({
  agency, clientCount, totalConversationsThisMonth, checkoutStatus, autoUpgradePlan, isSolo,
}: Props) {
  const router = useRouter();
  const currentPlan = agency.plan as Plan;
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  const voiceActive = !!(agency.settings?.voice_addon_active);

  // Plan order — solo users see Solo Pro first
  const PLAN_ORDER: Plan[] = isSolo
    ? ['solo_pro', 'starter', 'pro', 'scale']
    : ['starter', 'pro', 'scale'];

  const planIndex = (p: string) => PLAN_ORDER.indexOf(p as Plan);

  // Auto-trigger checkout if ?upgrade=plan was set
  useEffect(() => {
    if (autoUpgradePlan && PLAN_ORDER.includes(autoUpgradePlan as Plan) && autoUpgradePlan !== 'free') {
      handleUpgrade(autoUpgradePlan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpgrade = async (planOrAddon: string, isVoiceAddon = false) => {
    setLoading(planOrAddon);
    setError(null);
    try {
      const body = isVoiceAddon
        ? { addon: 'voice', billing }
        : { plan: planOrAddon, billing };

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
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
    } finally {
      setLoading(null);
    }
  };

  const limit = PLANS[currentPlan]?.maxClients ?? 1;
  const usagePct = Math.min(100, Math.round((clientCount / limit) * 100));
  const nearLimit = usagePct >= 80;

  const platformFee = PLANS[currentPlan]?.price ?? 0;
  const estimatedApiCost = Math.round(totalConversationsThisMonth * COST_PER_CONVERSATION_USD * 100) / 100;
  const estimatedTotal = platformFee + estimatedApiCost;

  // Get display price for a plan (annual or monthly)
  const getPlanPrice = (id: Plan) => {
    if (billing === 'annual' && ANNUAL_PRICES[id]) {
      return ANNUAL_PRICES[id]!.monthly;
    }
    return PLANS[id]?.price ?? 0;
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl space-y-8">

      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900">Plans & Billing</h1>
        </div>
        <p className="text-sm text-gray-500">
          Manage your subscription, upgrade your plan, and view billing history.
        </p>
      </div>

      {/* Voice success banner */}
      {checkoutStatus === 'voice_success' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <div>
            <p className="font-bold text-emerald-900 text-sm">Voice AI Add-on activated! 🎉</p>
            <p className="text-emerald-700 text-xs mt-0.5">Your AI can now answer and make phone calls. Configure it in the Voice AI section.</p>
          </div>
        </div>
      )}

      {/* Checkout success banner */}
      {checkoutStatus === 'success' && (
        <div className="rounded-xl overflow-hidden border border-indigo-200">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-4 sm:p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="text-4xl">🎉</div>
              <div>
                <p className="text-xl font-black">You&apos;re on {PLANS[currentPlan]?.name ?? 'your new plan'}!</p>
                <p className="text-indigo-200 text-sm mt-1">Your client slots are live. Start adding AI workers right now.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Client slots', value: String(PLANS[currentPlan]?.maxClients ?? '?') },
                { label: 'Revenue potential', value: `$${((PLANS[currentPlan]?.maxClients ?? 1) * 997).toLocaleString()}/mo` },
                { label: 'ROI at 1 client', value: `${Math.round((997 - (PLANS[currentPlan]?.price ?? 39)) / Math.max(1, PLANS[currentPlan]?.price ?? 39))}×` },
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
          <p>Checkout was cancelled. No charge was made. Choose a plan below to upgrade.</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Current plan card */}
      <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-white">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <Crown className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Plan</p>
                <p className="text-xl font-bold text-gray-900">{PLANS[currentPlan]?.name ?? currentPlan}</p>
              </div>
            </div>

            <div className="flex items-center gap-6 flex-wrap">
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900">
                  {clientCount}<span className="text-base font-normal text-gray-400">/{limit}</span>
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Client AIs
                </p>
              </div>
              <div className="min-w-[120px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Usage</span>
                  <span className={`text-xs font-semibold ${nearLimit ? 'text-amber-600' : 'text-gray-600'}`}>{usagePct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${nearLimit ? 'bg-amber-400' : 'bg-indigo-500'}`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                {nearLimit && <p className="text-[10px] text-amber-600 mt-1">Approaching limit — upgrade soon</p>}
              </div>
            </div>

            {agency.stripe_customer_id && (
              <Button variant="outline" size="sm" onClick={handlePortal} className="text-xs shrink-0" disabled={loading === 'portal'}>
                {loading === 'portal' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5 mr-1.5" />}
                Manage Billing
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Estimated Monthly Cost */}
      <Card className="border-green-100 bg-gradient-to-br from-green-50/50 to-white">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <CardTitle className="text-base">Estimated Cost This Month</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Based on {totalConversationsThisMonth.toLocaleString()} conversations processed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
              <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Kyra Platform</p>
              <p className="text-2xl font-black text-gray-900">{platformFee === 0 ? 'Free' : `$${platformFee}`}</p>
              <p className="text-xs text-gray-400 mt-0.5">{PLANS[currentPlan]?.name ?? currentPlan} plan / mo</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
              <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">AI API Usage</p>
              <p className="text-2xl font-black text-gray-900">{formatUsd(estimatedApiCost)}</p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <MessageSquare className="h-3 w-3 text-gray-300" />
                <p className="text-xs text-gray-400">{totalConversationsThisMonth.toLocaleString()} conversations</p>
              </div>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-center">
              <p className="text-xs text-indigo-600 mb-1 font-medium uppercase tracking-wide">Total Estimate</p>
              <p className="text-2xl font-black text-indigo-700">{formatUsd(estimatedTotal)}</p>
              <p className="text-xs text-indigo-500 mt-0.5">this month so far</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <Info className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600">
              AI API costs are billed directly by OpenAI to your API key — they don&apos;t appear on your Kyra invoice.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-base font-semibold text-gray-900">Choose a plan</h2>
          {/* Annual / Monthly toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${billing === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition ${billing === 'annual' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Annual
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition ${billing === 'annual' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700'}`}>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className={`grid gap-4 ${PLAN_ORDER.length === 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3'}`}>
          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id];
            if (!plan) return null;
            const isCurrent = id === currentPlan;
            const isUpgrade = planIndex(id) > planIndex(currentPlan);
            const isLoading = loading === id;
            const displayPrice = getPlanPrice(id);
            const annualInfo = ANNUAL_PRICES[id];
            const isSoloPro = id === 'solo_pro';

            return (
              <Card
                key={id}
                className={`relative flex flex-col transition-all ${
                  plan.highlighted ? 'border-indigo-300 shadow-md shadow-indigo-50 scale-[1.01]' : ''
                } ${isSoloPro && !isCurrent ? 'border-violet-200 bg-violet-50/30' : ''}
                ${isCurrent ? 'ring-2 ring-blue-400' : ''}`}
              >
                {plan.highlighted && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="px-3 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-bold shadow">
                      Most Popular
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-3 z-10">
                    <span className="px-3 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold shadow">
                      Your Plan
                    </span>
                  </div>
                )}

                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.badgeColor}`}>
                      {plan.badge}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-gray-900">
                      {displayPrice === 0 ? 'Free' : `$${displayPrice}`}
                    </span>
                    {displayPrice > 0 && (
                      <span className="text-gray-400 text-sm">
                        /mo{billing === 'annual' && annualInfo ? ' · billed annually' : ''}
                      </span>
                    )}
                  </div>
                  {billing === 'annual' && annualInfo && (
                    <p className="text-xs text-green-600 font-semibold">Save ${annualInfo.savings}/year</p>
                  )}
                  <p className="text-sm font-semibold text-indigo-600">
                    {plan.maxClients} client AI{plan.maxClients !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-500">{plan.description}</p>
                </CardHeader>

                <CardContent className="flex flex-col flex-1">
                  <ul className="space-y-1.5 mb-5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-gray-700">
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
                      className={`w-full text-sm ${plan.highlighted ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''} ${isSoloPro ? 'bg-violet-600 hover:bg-violet-700 text-white border-0' : ''}`}
                      size="sm"
                      variant={plan.highlighted || isSoloPro ? 'default' : 'outline'}
                      onClick={() => handleUpgrade(id)}
                      disabled={!!loading}
                    >
                      {isLoading ? (
                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Redirecting...</>
                      ) : (
                        <><ArrowUpRight className="h-3.5 w-3.5 mr-1.5" /> {plan.cta}</>
                      )}
                    </Button>
                  )}

                  {isUpgrade && !isCurrent && billing === 'monthly' && (
                    <p className="text-[10px] text-gray-400 text-center mt-2">7-day free trial • Cancel anytime</p>
                  )}
                  {isUpgrade && !isCurrent && billing === 'annual' && (
                    <p className="text-[10px] text-gray-400 text-center mt-2">Billed annually • Cancel anytime</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Voice Add-on */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Add-ons</h2>
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="h-4 w-4 text-emerald-600" />
                <h3 className="font-bold text-gray-900">{VOICE_ADDON.name}</h3>
                <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">ADD-ON</Badge>
                {voiceActive && <Badge className="bg-emerald-600 text-white text-[10px]">✓ ACTIVE</Badge>}
              </div>
              <div className="flex items-baseline gap-1 mb-1">
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
              <p className="text-sm text-gray-600 mb-2">{VOICE_ADDON.description}</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
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
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm disabled:opacity-50"
              >
                {loading === 'voice_addon' ? (
                  <span className="flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" /> Redirecting...</span>
                ) : (
                  `Add Voice AI — $${billing === 'annual' ? VOICE_ADDON.annualMonthly : VOICE_ADDON.price}/mo →`
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feature comparison note */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400" />
              <span>Monthly plans include a <strong>7-day free trial</strong> — no charge today.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Cancel anytime. Annual plans save 20% and are billed upfront.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
