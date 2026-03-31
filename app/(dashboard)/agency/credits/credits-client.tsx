'use client';

// ============================================================================
// Credits Dashboard — Real-time balance, top-up, usage analytics
// No money amounts. No conversation counts. Kyra brand only.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CREDIT_PACKS, type CreditPack } from '@/lib/billing/credits';
import type { CreditTransaction } from '@/lib/billing/credit-engine';
import { pixel } from '@/components/analytics/MetaPixel';
import {
  Coins, Zap, ShoppingBag, Gift, RotateCcw,
  CheckCircle2, AlertCircle, AlertTriangle, Crown,
  TrendingUp, BarChart3, ArrowUpRight, ArrowDownRight, Minus,
  RefreshCw, Sparkles, Key, Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

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
  if (type === 'usage')    return <Zap className="h-4 w-4 text-gray-400" />;
  if (type === 'bonus')    return <Gift className="h-4 w-4 text-violet-500" />;
  if (type === 'refund')   return <RotateCcw className="h-4 w-4 text-green-500" />;
  return <Coins className="h-4 w-4 text-gray-400" />;
}

function BalanceStatus({ balance }: { balance: number }) {
  if (balance === 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      Out of credits
    </span>
  );
  if (balance <= 10) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      Running low
    </span>
  );
  if (balance <= 50) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2.5 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
      Getting low
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
      </span>
      Healthy
    </span>
  );
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
        <Loader2 className="h-6 w-6 animate-spin text-indigo-300" />
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
        <Card className="border-gray-200">
          <CardContent className="pt-5 pb-5">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-indigo-400" /> This Month
            </p>
            <p className="text-3xl font-black text-gray-900">{data.thisMonth.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">credits used</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="pt-5 pb-5">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-gray-400" /> Last Month
            </p>
            <p className="text-3xl font-black text-gray-900">{data.lastMonth.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">credits used</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="pt-5 pb-5">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-400" /> Growth
            </p>
            <div className="flex items-center gap-2">
              <p className={`text-3xl font-black ${
                data.monthOverMonthPct > 0 ? 'text-emerald-600'
                : data.monthOverMonthPct < 0 ? 'text-red-500'
                : 'text-gray-900'
              }`}>
                {data.monthOverMonthPct > 0 ? '+' : ''}{data.monthOverMonthPct}%
              </p>
              {data.monthOverMonthPct > 0 && <ArrowUpRight className="h-5 w-5 text-emerald-500" />}
              {data.monthOverMonthPct < 0 && <ArrowDownRight className="h-5 w-5 text-red-400" />}
              {data.monthOverMonthPct === 0 && <Minus className="h-5 w-5 text-gray-300" />}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Mini bar chart */}
      <Card className="border-gray-200">
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
                        isCurrentMonth ? 'bg-indigo-500' : 'bg-indigo-100'
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
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Per-Worker Usage (this month)</h3>
        {data.byClient.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm border rounded-xl border-dashed border-gray-200">
            No usage recorded this month yet
          </div>
        ) : (
          <Card className="border-gray-200">
            <CardContent className="pt-4 pb-2">
              <div className="divide-y divide-gray-50">
                {data.byClient.map((c) => {
                  const pct = data.thisMonth > 0 ? (c.creditsUsed / data.thisMonth) * 100 : 0;
                  return (
                    <div key={c.clientId} className="py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-800">{c.clientName}</span>
                        <span className="text-sm font-semibold text-gray-700">
                          {c.creditsUsed.toLocaleString()} credits
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {c.lastActivity && (
                        <p className="text-[10px] text-gray-400 mt-1">Last active {timeAgo(c.lastActivity)}</p>
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

// ─── Web Intelligence Tab ─────────────────────────────────────────────────────

interface WebUsageData {
  used: number;
  limit: number;
  plan: string;
  resetDate: string;
  lastScrapedAt: string | null;
}

function WebIntelligenceTab() {
  const [data, setData] = useState<WebUsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/web-intelligence/usage');
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-300" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Failed to load web intelligence data.
      </div>
    );
  }

  // Free/solo plans — show upgrade callout
  if (data.limit === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-8 text-center">
          <Globe className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Web Intelligence</h3>
          <p className="text-sm text-gray-600 mb-1 font-semibold">Powered by Firecrawl</p>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Give your AI workers eyes on the internet. Scrape pages, search the web, and autonomously research any topic — all from within your AI worker conversations.
          </p>
          <div className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
            Available on Lite plan ($99/mo) and above
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 text-left max-w-lg mx-auto">
            {[
              { label: 'Lite', scrapes: '500 scrapes/mo' },
              { label: 'Pro', scrapes: '2,000 scrapes/mo' },
              { label: 'Scale', scrapes: '5,000 scrapes/mo' },
            ].map(p => (
              <div key={p.label} className="rounded-xl border border-gray-200 p-3 text-center">
                <p className="text-xs font-bold text-gray-700">{p.label}</p>
                <p className="text-xs text-indigo-600 font-semibold mt-1">{p.scrapes}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const usedPct = Math.min(100, (data.used / data.limit) * 100);
  const isHealthy = usedPct < 80;
  const isLow = usedPct >= 80 && usedPct < 100;
  const isEmpty = usedPct >= 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide mb-1">Web Intelligence</p>
            <p className="text-sm text-indigo-200 mb-3">Powered by Firecrawl — your AI workers can read the internet</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-black leading-none">{data.used.toLocaleString()}</p>
              <span className="text-indigo-200 text-sm font-medium">/ {data.limit.toLocaleString()} scrapes used</span>
            </div>
            <div className="mt-2">
              {isEmpty ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-100 bg-red-500/40 rounded-full px-2.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-300 animate-pulse" /> Limit reached
                </span>
              ) : isLow ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-100 bg-amber-500/30 rounded-full px-2.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" /> Getting low
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-100 bg-emerald-500/30 rounded-full px-2.5 py-0.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-300" />
                  </span>
                  Healthy
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-indigo-200 mb-1.5">
            <span>{data.used.toLocaleString()} used</span>
            <span>{(data.limit - data.used).toLocaleString()} remaining</span>
          </div>
          <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isEmpty ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-white/70'}`}
              style={{ width: `${Math.max(usedPct, 2)}%` }}
            />
          </div>
          <p className="text-xs text-indigo-300 mt-2">
            Resets {new Date(data.resetDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            {data.lastScrapedAt && (
              <span className="ml-3">· Last scrape: {timeAgo(data.lastScrapedAt)}</span>
            )}
          </p>
        </div>
      </div>

      {/* Limit reached banner */}
      {isEmpty && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <div>
            <p className="font-semibold">Monthly web scrape limit reached.</p>
            <p className="text-xs text-red-600 mt-0.5">Upgrade your plan for more scrapes, or wait until the 1st of next month.</p>
          </div>
        </div>
      )}

      {/* Credit cost reference */}
      <Card className="border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-500" />
            Scrape Credit Costs
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y divide-gray-50">
            {[
              { action: 'Scrape (single page)', cost: 1, desc: 'firecrawl scrape <url>' },
              { action: 'Crawl (per page discovered)', cost: 1, desc: 'firecrawl crawl <url>' },
              { action: 'Map (URL discovery)', cost: 1, desc: 'firecrawl map <url>' },
              { action: 'Search (web results + content)', cost: 2, desc: 'firecrawl search "<query>"' },
              { action: 'Extract (structured data)', cost: 2, desc: 'firecrawl extract <url>' },
              { action: 'Agent (autonomous research)', cost: 5, desc: 'firecrawl agent "<prompt>"' },
            ].map(item => (
              <div key={item.action} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-gray-700 font-medium">{item.action}</p>
                  <p className="text-xs text-gray-400 font-mono">{item.desc}</p>
                </div>
                <span className="text-sm font-semibold text-indigo-600 shrink-0 ml-4">
                  {item.cost} credit{item.cost !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">How Web Intelligence works</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              icon: <Globe className="h-5 w-5 text-indigo-500" />,
              title: 'Your AI can read any website',
              body: 'Workers use firecrawl-cli to scrape pages, search the web, and autonomously research topics.',
            },
            {
              icon: <Sparkles className="h-5 w-5 text-emerald-500" />,
              title: 'Pre-configured and ready',
              body: 'No API keys to manage. Auth is injected automatically into every container.',
            },
            {
              icon: <Zap className="h-5 w-5 text-amber-500" />,
              title: 'Counted per call, not per token',
              body: 'Each scrape, search, or agent run costs a fixed number of credits — predictable and transparent.',
            },
            {
              icon: <RefreshCw className="h-5 w-5 text-violet-500" />,
              title: 'Resets monthly',
              body: `Your ${data.limit.toLocaleString()} scrape allowance resets on the 1st of each month. Unused scrapes do not roll over.`,
            },
          ].map(item => (
            <div key={item.title} className="flex gap-3">
              <div className="shrink-0 mt-0.5">{item.icon}</div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CreditsClient({
  balance: initialBalance,
  lifetimePurchased: initialPurchased,
  lifetimeUsed: initialUsed,
  recentTransactions: initialTransactions,
  checkoutStatus,
}: Props) {
  const [activeTab, setActiveTab] = useState<'topup' | 'usage' | 'web'>('topup');
  const [loadingPack, setLoadingPack]   = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);

  // ── Real-time state ────────────────────────────────────────────────────────
  const [balance, setBalance]           = useState(initialBalance);
  const [lifetimePurchased, setLifetimePurchased] = useState(initialPurchased);
  const [lifetimeUsed, setLifetimeUsed] = useState(initialUsed);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [polling, setPolling]           = useState(false);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);

  // ── Master account check (only master sees transaction history + credits info) ──
  const [isMaster, setIsMaster] = useState(false);
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const email = data.user?.email || '';
      setIsMaster(['hello@conversionsystem.com', 'angel@conversionsystem.com'].includes(email));
    });
  }, []);

  const fetchLive = useCallback(async () => {
    setPolling(true);
    try {
      const res = await fetch('/api/agency/credits', { cache: 'no-store' });
      if (res.ok) {
        const d = await res.json();
        setBalance(d.balance ?? 0);
        setLifetimePurchased(d.lifetimePurchased ?? 0);
        setLifetimeUsed(d.lifetimeUsed ?? 0);
        if (d.recentTransactions) setTransactions(d.recentTransactions);
        setLastUpdated(new Date());
        window.dispatchEvent(new Event('kyra:credit-update'));
      }
    } catch { /* silent */ }
    finally { setPolling(false); }
  }, []);

  useEffect(() => {
    fetchLive();
    const t = setInterval(fetchLive, 30_000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire pixel event on successful checkout
  useEffect(() => {
    if (checkoutStatus === 'success') {
      pixel.purchase(0, 'USD', { content_name: 'Credit Pack Purchase', content_category: 'Credits' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutStatus]);

  const isWelcome = lifetimePurchased === 0 && balance > 0 && checkoutStatus !== 'success';
  const isLow     = balance > 0 && balance <= 10;
  const isEmpty   = balance === 0;

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

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Coins className="h-5 w-5 text-indigo-500" />
            Kyra Credits
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Power your AI workers. Credits are consumed per AI response — cost varies by model.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0 mt-1">
          {polling && <RefreshCw className="h-3 w-3 animate-spin" />}
          {lastUpdated && !polling && (
            <span className="hidden sm:inline text-[11px]">
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={fetchLive} title="Refresh" className="p-1 hover:text-indigo-600 transition rounded">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Status Banners ── */}

      {/* Welcome / free credits — no dollar amounts, no conversation counts */}
      {isWelcome && (
        <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-4">
          <span className="text-2xl leading-none mt-0.5">🎁</span>
          <div className="flex-1">
            <p className="font-semibold text-indigo-900 text-sm">
              You have <span className="text-indigo-700 font-black">{balance} welcome credits</span> — your AI is ready to work.
            </p>
            <p className="text-indigo-700 text-xs mt-1 leading-relaxed">
              Start exploring Kyra with your free credits. When you&apos;re ready to scale,{' '}
              top up below or add your own API key in{' '}
              <Link href="/agency/api-keys" className="underline font-semibold hover:text-indigo-900">API Keys</Link>.
            </p>
          </div>
        </div>
      )}

      {checkoutStatus === 'success' && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <div>
            <p className="font-semibold">Credits added — your AI workers are fuelled up! 🎉</p>
            <p className="text-xs text-emerald-600 mt-0.5">New balance: <strong>{balance.toLocaleString()} credits</strong></p>
          </div>
        </div>
      )}

      {checkoutStatus === 'cancelled' && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          Checkout cancelled. No charge was made. Choose a pack below to continue.
        </div>
      )}

      {isEmpty && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <div>
            <p className="font-semibold">Your AI workers have run out of credits.</p>
            <p className="text-xs text-red-600 mt-0.5">Top up below to get them back online.</p>
          </div>
        </div>
      )}

      {isLow && !isEmpty && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p>
            <strong>{balance} credit{balance !== 1 ? 's' : ''} remaining.</strong>{' '}
            Top up now to keep your AI workers responding without interruption.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* ── Balance Card ── */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-5 sm:p-6">
        {/* Balance + Stats — stack on mobile, row on desktop */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">

          {/* Left: balance */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Coins className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide mb-1">Current Balance</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl sm:text-5xl font-black leading-none">{balance.toLocaleString()}</p>
                <span className="text-indigo-200 text-sm font-medium">credits</span>
              </div>
              <div className="mt-2">
                <BalanceStatus balance={balance} />
              </div>
            </div>
          </div>

          {/* Right: lifetime stats — side by side on all sizes */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center flex-1 sm:flex-none sm:min-w-[100px]">
              <div className="flex items-center justify-center gap-1 text-indigo-200 mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Purchased</span>
              </div>
              <p className="text-2xl font-black">{lifetimePurchased.toLocaleString()}</p>
              <p className="text-[10px] text-indigo-300 mt-0.5">lifetime</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center flex-1 sm:flex-none sm:min-w-[100px]">
              <div className="flex items-center justify-center gap-1 text-indigo-200 mb-1">
                <Zap className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Used</span>
              </div>
              <p className="text-2xl font-black">{lifetimeUsed.toLocaleString()}</p>
              <p className="text-[10px] text-indigo-300 mt-0.5">lifetime</p>
            </div>
          </div>
        </div>

        {/* Usage bar */}
        {(lifetimeUsed + balance) > 0 && (
          <div className="mt-5">
            <div className="flex justify-between text-xs text-indigo-200 mb-1.5">
              <span>{lifetimeUsed.toLocaleString()} used</span>
              <span>{balance.toLocaleString()} remaining</span>
            </div>
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-white/70 transition-all"
                style={{ width: `${Math.min(100, (lifetimeUsed / Math.max(lifetimeUsed + balance, 1)) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('topup')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'topup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Top Up
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'usage' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Usage Analytics
        </button>
        <button
          onClick={() => setActiveTab('web')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'web' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Web Intelligence
        </button>
      </div>

      {/* ── Top Up Tab ── */}
      {activeTab === 'topup' && (
        <>
          {/* Pack grid */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-gray-900">Choose a credit pack</h2>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              One-time purchase. Credits never expire. Bigger packs include bonus credits.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {CREDIT_PACKS.map((pack) => (
                <Card
                  key={pack.id}
                  className={`relative flex flex-col transition-all ${
                    pack.highlighted
                      ? 'border-indigo-300 shadow-lg shadow-indigo-100 scale-[1.02]'
                      : 'border-gray-200 hover:border-indigo-200 hover:shadow-sm'
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
                    <CardTitle className="text-sm font-semibold text-gray-600">{pack.name}</CardTitle>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-black text-gray-900">${pack.price}</span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <p className="text-lg font-black text-indigo-700">
                        {pack.totalCredits.toLocaleString()} <span className="font-semibold text-base">credits</span>
                      </p>
                      {pack.bonusPct > 0 && (
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${pack.badgeColor}`}>
                          +{pack.bonusPct}% bonus
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 flex flex-col flex-1 gap-3">
                    <CardDescription className="text-xs text-gray-400 flex-1">{pack.description}</CardDescription>
                    <Button
                      onClick={() => handleBuy(pack)}
                      disabled={!!loadingPack}
                      className={`w-full mt-auto font-semibold ${pack.highlighted ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                      variant={pack.highlighted ? 'default' : 'outline'}
                      size="sm"
                    >
                      {loadingPack === pack.id
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Processing…</>
                        : `Buy for $${pack.price}`}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Transaction history — master only */}
          {isMaster && transactions.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-3">Recent Activity</h2>
              <Card className="border-gray-200">
                <CardContent className="pt-4 pb-2">
                  <div className="divide-y divide-gray-50">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center gap-3 py-2.5">
                        <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                          {txIcon(tx.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{tx.description || tx.type}</p>
                          <p className="text-xs text-gray-400">{timeAgo(tx.createdAt)}</p>
                        </div>
                        <span className={`text-sm font-semibold shrink-0 tabular-nums ${tx.amount > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                          {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* How credits work — master only */}
          {isMaster && <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">How Kyra Credits work</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: <Coins className="h-5 w-5 text-emerald-500" />,
                  title: 'Credits never expire',
                  body: 'Your balance rolls over indefinitely. Top up once, use whenever.',
                },
                {
                  icon: <Key className="h-5 w-5 text-violet-500" />,
                  title: 'Bring your own API key',
                  body: 'Agencies with their own API key bypass credit usage entirely.',
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <div className="shrink-0 mt-0.5">{item.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>}
        </>
      )}

      {activeTab === 'usage' && <UsageTab />}

      {activeTab === 'web' && <WebIntelligenceTab />}
    </div>
  );
}
