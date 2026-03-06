'use client';

import { useState, useEffect, useCallback } from 'react';
import { CREDIT_PACKS, type CreditPack } from '@/lib/billing/credits';
import type { CreditTransaction } from '@/lib/billing/credit-engine';
import { pixel } from '@/components/analytics/MetaPixel';
import {
  Coins, Zap, ShoppingBag, Gift, RotateCcw,
  CheckCircle2, AlertCircle, AlertTriangle, Crown,
  TrendingUp, MessageSquare, BarChart3, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientUsageStat {
  clientId: string;
  clientName: string;
  creditsUsed: number;
  conversationCount: number;
  lastActivity: string | null;
}

interface MonthlyTrend {
  month: string;
  credits: number;
}

interface UsageData {
  thisMonth: number;
  lastMonth: number;
  monthOverMonthPct: number;
  byClient: ClientUsageStat[];
  trend: MonthlyTrend[];
}

interface Props {
  agencyId: string;
  balance: number;
  lifetimePurchased: number;
  lifetimeUsed: number;
  recentTransactions: CreditTransaction[];
  checkoutStatus: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function txIcon(type: string) {
  if (type === 'purchase') return <ShoppingBag className="h-4 w-4 text-indigo-500" />;
  if (type === 'usage') return <Zap className="h-4 w-4 text-gray-400" />;
  if (type === 'bonus') return <Gift className="h-4 w-4 text-purple-500" />;
  if (type === 'refund') return <RotateCcw className="h-4 w-4 text-green-500" />;
  return <Coins className="h-4 w-4 text-gray-400" />;
}

// ─── Usage Analytics Tab ──────────────────────────────────────────────────────

function UsageTab() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/credits/usage');
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Failed to load usage data. Try refreshing.
      </div>
    );
  }

  const maxCredits = Math.max(...data.trend.map((t) => t.credits), 1);

  return (
    <div className="space-y-6">
      {/* Month-over-month summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Coins className="h-3.5 w-3.5" /> This Month
            </p>
            <p className="text-3xl font-black text-gray-900">{data.thisMonth.toLocaleString()}</p>
            <p className="text-xs text-gray-400">credits used</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> Conversations
            </p>
            <p className="text-3xl font-black text-gray-900">{data.thisMonth.toLocaleString()}</p>
            <p className="text-xs text-gray-400">AI replies sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> vs Last Month
            </p>
            <div className="flex items-center gap-2">
              <p className={`text-3xl font-black ${
                data.monthOverMonthPct > 0 ? 'text-green-600'
                : data.monthOverMonthPct < 0 ? 'text-red-500'
                : 'text-gray-900'
              }`}>
                {data.monthOverMonthPct > 0 ? '+' : ''}{data.monthOverMonthPct}%
              </p>
              {data.monthOverMonthPct > 0 && <ArrowUpRight className="h-5 w-5 text-green-500" />}
              {data.monthOverMonthPct < 0 && <ArrowDownRight className="h-5 w-5 text-red-400" />}
              {data.monthOverMonthPct === 0 && <Minus className="h-5 w-5 text-gray-300" />}
            </div>
            <p className="text-xs text-gray-400">{data.lastMonth.toLocaleString()} last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Mini bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            Monthly Usage (last 6 months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-24">
            {data.trend.map((t) => {
              const heightPct = maxCredits > 0 ? (t.credits / maxCredits) * 100 : 0;
              const isCurrentMonth = t === data.trend[data.trend.length - 1];
              return (
                <div key={t.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        isCurrentMonth ? 'bg-indigo-500' : 'bg-indigo-200'
                      }`}
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                      title={`${t.credits} credits`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 truncate w-full text-center">{t.month}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Per-client breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Per-Client Usage (this month)</h3>
        {data.byClient.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm border rounded-xl border-dashed">
            No usage recorded this month yet
          </div>
        ) : (
          <Card>
            <CardContent className="pt-4 pb-2">
              <div className="divide-y divide-gray-50">
                {data.byClient.map((c) => {
                  const pct = data.thisMonth > 0 ? (c.creditsUsed / data.thisMonth) * 100 : 0;
                  return (
                    <div key={c.clientId} className="py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
                            {c.clientName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-800">{c.clientName}</span>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <span className="text-xs text-gray-400">
                            {c.conversationCount} convos
                          </span>
                          <span className="text-sm font-semibold text-gray-700">
                            {c.creditsUsed.toLocaleString()} credits
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {c.lastActivity && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          Last active {timeAgo(c.lastActivity)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CreditsClient({
  balance,
  lifetimePurchased,
  lifetimeUsed,
  recentTransactions,
  checkoutStatus,
}: Props) {
  const [activeTab, setActiveTab] = useState<'topup' | 'usage'>(() => {
    // Auto-switch to top-up on successful checkout
    return checkoutStatus === 'success' ? 'topup' : 'topup';
  });
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLow = balance < 100;

  // Fire Purchase event on successful Stripe checkout return
  useEffect(() => {
    if (checkoutStatus === 'success') {
      pixel.purchase(0, 'USD', { content_name: 'Credit Pack Purchase', content_category: 'Credits' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutStatus]);

  const handleBuy = async (pack: CreditPack) => {
    setLoadingPack(pack.id);
    pixel.initiateCheckout({ content_name: pack.name, value: pack.price, currency: 'USD' });
    setError(null);
    try {
      const res = await fetch('/api/stripe/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: pack.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Coins className="h-5 w-5 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900">Kyra Credits</h1>
        </div>
        <p className="text-sm text-gray-500">
          Power your AI workers. 1 credit = 1 AI conversation.
        </p>
      </div>

      {/* Trial credits banner — shown when still on free welcome credits */}
      {lifetimePurchased === 0 && balance > 0 && checkoutStatus !== 'success' && (
        <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3.5 text-sm">
          <span className="text-2xl leading-none mt-0.5">🎁</span>
          <div className="flex-1">
            <p className="font-semibold text-indigo-900">You have ${(balance / 100).toFixed(0) === '0' ? '<1' : (balance * 0.01).toFixed(0)} in free trial credits — {balance} credits remaining</p>
            <p className="text-indigo-700 text-xs mt-0.5">
              Enough to run ~{balance} AI conversations while you evaluate Kyra.
              Top up when you&apos;re ready to scale, or add your own API key in{' '}
              <a href="/agency/api-keys" className="underline font-medium">API Keys</a>.
            </p>
          </div>
          <span className="text-xs text-indigo-400 whitespace-nowrap">Free trial</span>
        </div>
      )}

      {/* Status banners */}
      {checkoutStatus === 'success' && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <div>
            <p className="font-semibold">Payment successful — credits added to your balance! 🎉</p>
            <p className="text-xs text-green-600 mt-0.5">Your AI workers are powered up.</p>
          </div>
        </div>
      )}
      {checkoutStatus === 'cancelled' && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <p>Checkout cancelled. No charge was made.</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {isLow && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p>
            <strong>Running low</strong> — {balance} credit{balance !== 1 ? 's' : ''} remaining.
            Top up to keep your AI workers responding.
          </p>
        </div>
      )}

      {/* Balance card */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <Coins className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-indigo-500 uppercase tracking-wide">Current Balance</p>
              <p className="text-4xl font-black text-gray-900">{balance.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-0.5">~{balance.toLocaleString()} conversations remaining</p>
            </div>
          </div>
          <div className="flex items-center gap-8 ml-auto flex-wrap">
            <div className="text-center">
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-xs">Lifetime purchased</span>
              </div>
              <p className="text-xl font-bold text-gray-800">{lifetimePurchased.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="text-xs">Conversations powered</span>
              </div>
              <p className="text-xl font-bold text-gray-800">{lifetimeUsed.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('topup')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'topup'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🛒 Top Up
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'usage'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📊 Usage
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'topup' && (
        <>
          {/* Pack grid */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Choose a credit pack</h2>
            <p className="text-sm text-gray-500 mb-4">
              One-time purchase. Credits never expire. Bigger packs = more bonus credits.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {CREDIT_PACKS.map((pack) => (
                <Card
                  key={pack.id}
                  className={`relative flex flex-col transition-all ${
                    pack.highlighted
                      ? 'border-indigo-300 shadow-lg shadow-indigo-100 scale-[1.02]'
                      : 'hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  {pack.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-bold shadow">
                        <Crown className="h-3 w-3" /> Best Value
                      </span>
                    </div>
                  )}
                  <CardHeader className="pb-2 pt-5">
                    <CardTitle className="text-sm font-semibold text-gray-700">{pack.name}</CardTitle>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-black text-gray-900">${pack.price}</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-lg font-bold text-indigo-700">
                        {pack.totalCredits.toLocaleString()} credits
                      </p>
                      {pack.bonusPct > 0 && (
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${pack.badgeColor}`}>
                          +{pack.bonusPct}% bonus
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 flex flex-col flex-1 gap-3">
                    <CardDescription className="text-xs text-gray-400">
                      ~{pack.totalCredits.toLocaleString()} AI conversations
                    </CardDescription>
                    <p className="text-xs text-gray-500 flex-1">{pack.description}</p>
                    <Button
                      onClick={() => handleBuy(pack)}
                      disabled={!!loadingPack}
                      className={`w-full mt-auto ${pack.highlighted ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                      variant={pack.highlighted ? 'default' : 'outline'}
                      size="sm"
                    >
                      {loadingPack === pack.id ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Processing…</>
                      ) : (
                        `Buy for $${pack.price}`
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Transaction history */}
          {recentTransactions.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Recent Transactions</h2>
              <Card>
                <CardContent className="pt-4 pb-2">
                  <div className="divide-y divide-gray-50">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center gap-3 py-2.5">
                        <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                          {txIcon(tx.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{tx.description || tx.type}</p>
                          <p className="text-xs text-gray-400">{timeAgo(tx.createdAt)}</p>
                        </div>
                        <span className={`text-sm font-semibold shrink-0 ${tx.amount > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                          {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* How credits work */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">How it works</p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { icon: '🤖', t: '1 credit = 1 conversation', d: 'Each AI reply uses 1 credit, regardless of model.' },
                { icon: '📦', t: 'Never expire', d: 'Credits roll over indefinitely.' },
                { icon: '⚡', t: 'Auto-routed', d: 'Kyra picks the most efficient model per message.' },
                { icon: '📊', t: 'Per-client tracking', d: "See exactly how each client's AI performs." },
              ].map((item) => (
                <div key={item.t} className="flex gap-3">
                  <span className="text-lg leading-5">{item.icon}</span>
                  <div>
                    <p className="font-medium text-gray-700">{item.t}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'usage' && <UsageTab />}
    </div>
  );
}
