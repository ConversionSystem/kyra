'use client';

// ============================================================================
// Billing Page — Agency plan management + upgrade flow
// ============================================================================

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { PLANS, type Plan } from '@/lib/billing/plans';

interface Props {
  agency: {
    id: string;
    name: string;
    plan: string;
    stripe_customer_id: string | null;
  };
  clientCount: number;
  checkoutStatus: string | null;  // 'success' | 'cancelled' | null
  autoUpgradePlan: string | null; // plan to auto-trigger on mount
}

const PLAN_ORDER: Plan[] = ['free', 'starter', 'pro', 'scale'];

function planIndex(p: string) {
  return PLAN_ORDER.indexOf(p as Plan);
}

export function BillingPageClient({ agency, clientCount, checkoutStatus, autoUpgradePlan }: Props) {
  const router = useRouter();
  const currentPlan = agency.plan as Plan;
  const [loading, setLoading] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-trigger checkout if ?upgrade=plan was set (from plans page CTA)
  useEffect(() => {
    if (autoUpgradePlan && PLAN_ORDER.includes(autoUpgradePlan as Plan) && autoUpgradePlan !== 'free') {
      handleUpgrade(autoUpgradePlan as Plan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpgrade = async (plan: Plan) => {
    if (plan === 'free') return;
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe checkout
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(null);
    }
  };

  const handlePortal = async () => {
    setLoading('free' as Plan); // reuse loading state
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error('Could not open billing portal');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const limit = PLANS[currentPlan]?.maxClients ?? 1;
  const usagePct = Math.min(100, Math.round((clientCount / limit) * 100));
  const nearLimit = usagePct >= 80;

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

      {/* Checkout status banner */}
      {checkoutStatus === 'success' && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <div>
            <p className="font-semibold">Payment successful — welcome to {PLANS[currentPlan]?.name ?? 'your new plan'}! 🎉</p>
            <p className="text-xs text-green-600 mt-0.5">Your client slots and features are now active.</p>
          </div>
        </div>
      )}
      {checkoutStatus === 'cancelled' && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <p>Checkout was cancelled. No charge was made. Choose a plan below to upgrade.</p>
        </div>
      )}

      {/* Error banner */}
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
                <p className="text-2xl font-black text-gray-900">{clientCount}<span className="text-base font-normal text-gray-400">/{limit}</span></p>
                <p className="text-xs text-gray-500 flex items-center gap-1"><Users className="h-3 w-3" /> Client AIs</p>
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
              <Button variant="outline" size="sm" onClick={handlePortal} className="text-xs shrink-0">
                <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Manage Billing
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Choose a plan</h2>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id];
            const isCurrent = id === currentPlan;
            const isUpgrade = planIndex(id) > planIndex(currentPlan);
            const isDowngrade = planIndex(id) < planIndex(currentPlan);
            const isLoading = loading === id;

            return (
              <Card
                key={id}
                className={`relative flex flex-col transition-all ${
                  plan.highlighted ? 'border-indigo-300 shadow-md shadow-indigo-50 scale-[1.01]' : ''
                } ${isCurrent ? 'ring-2 ring-green-400' : ''}`}
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
                    <span className="px-3 py-0.5 rounded-full bg-green-500 text-white text-xs font-bold shadow">
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
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && <span className="text-gray-400 text-sm">/mo</span>}
                  </div>
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
                  ) : id === 'free' ? (
                    <Button className="w-full text-sm" size="sm" variant="outline" disabled>
                      Free Plan
                    </Button>
                  ) : (
                    <Button
                      className={`w-full text-sm ${plan.highlighted ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                      size="sm"
                      variant={plan.highlighted ? 'default' : 'outline'}
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

                  {isUpgrade && !isCurrent && (
                    <p className="text-[10px] text-gray-400 text-center mt-2">30-day free trial • Cancel anytime</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Feature comparison note */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400" />
              <span>All paid plans include a <strong>30-day free trial</strong> — no charge today.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Cancel anytime. Downgrade keeps existing clients (no new ones until under limit).</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
