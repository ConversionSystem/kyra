'use client';

import { useEffect, useState } from 'react';
import {
  RefreshCw, TrendingUp, TrendingDown, Users, MessageSquare,
  DollarSign, Zap, Gift, Building2, BarChart3, Activity,
  ArrowUpRight, ArrowDownRight, Minus, CreditCard, Flame,
  UserCheck, Globe, Phone, DatabaseZap, CheckCircle2, AlertCircle,
  Server, HardDrive, Cpu, Container, TriangleAlert, Info,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HealthCheck {
  id: string;
  title: string;
  desc: string;
  link: string;
  linkLabel: string;
  severity: 'critical' | 'warning' | 'info';
  sql?: string;
}

interface VpsHealth {
  ok: boolean;
  hostname?: string;
  docker?: string;
  containers?: { total: number; running: number; stopped: number };
  memory?: { totalMb: number; availableMb: number; usedMb: number; usagePercent: number };
  disk?: { totalMb: number; usedMb: number; availableMb: number; usagePercent: number };
  cpus?: number;
  uptime?: number;
  error?: string;
}

interface SyncResult {
  ok: boolean;
  masterAgencyId: string;
  total: number;
  synced: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
}

interface Stats {
  mrr: number;
  mrrLastMonth: number;
  mrrGrowthPct: number | null;
  mrrPerPlan: Record<string, number>;
  arpu: number;
  estimatedLtv: number;
  agencies: {
    total: number; solo: number; agency: number;
    paying: number; free: number;
    newToday: number; newLast7d: number; newLast30d: number;
    newSoloLast30d: number; newAgencyLast30d: number;
    conversionRate: number; planBreakdown: Record<string, number>;
  };
  clients: { total: number; active: number; newLast7d: number };
  conversations: { total: number; today: number; last7d: number; last30d: number };
  activation: { rate: number; activated: number; total: number };
  referrals: {
    total: number; signedUp: number; activated: number; converted: number;
    earlyBird: number; last7d: number; conversionRate: number;
  };
  credits: { used30d: number; purchased30d: number; granted30d: number };
  signupsByDay: Record<string, number>;
  recentSignups: {
    id: string; name: string; plan: string; mrr: number;
    createdAt: string; accountType: string; websiteUrl: string | null;
  }[];
  generatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  solo_pro: 'bg-violet-100 text-violet-700',
  starter: 'bg-blue-100 text-blue-700',
  pro: 'bg-indigo-100 text-indigo-700',
  scale: 'bg-purple-100 text-purple-700',
  beta: 'bg-amber-100 text-amber-700',
};

const PLAN_BAR_COLORS: Record<string, string> = {
  free: 'bg-gray-300',
  solo_pro: 'bg-violet-500',
  starter: 'bg-blue-500',
  pro: 'bg-indigo-500',
  scale: 'bg-purple-600',
  beta: 'bg-amber-400',
};

function fmt(n: number) { return n.toLocaleString(); }
function usd(n: number) { return `$${n.toLocaleString()}`; }

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-400">No prev data</span>;
  if (pct === 0) return (
    <span className="flex items-center gap-0.5 text-xs text-gray-500">
      <Minus className="h-3 w-3" /> 0%
    </span>
  );
  const up = pct > 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-bold ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct)}% vs last month
    </span>
  );
}

function MetricCard({
  icon: Icon, label, value, sub, color = 'text-indigo-600', badge,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color?: string; badge?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="text-3xl font-black text-gray-900 tabular-nums">{value}</p>
      {badge && <div>{badge}</div>}
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// Sparkline using SVG
function Sparkline({ data, color = '#6366f1' }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 120, h = 32, pad = 2;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminDashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [vpsHealth, setVpsHealth] = useState<VpsHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/kyra-stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStats(await res.json());
      setLastRefresh(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const syncLeads = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await fetch('/api/admin/sync-leads', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSyncResult(data as SyncResult);
    } catch (e: unknown) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/admin/health-check');
      if (res.ok) {
        const data = await res.json();
        setHealthChecks(data.checks || []);
        setVpsHealth(data.vps || null);
      }
    } catch { /* ignore */ } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchHealth();
    const interval = setInterval(fetchStats, 60_000);
    const healthInterval = setInterval(fetchHealth, 120_000);
    return () => { clearInterval(interval); clearInterval(healthInterval); };
  }, []);

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-medium">{error}</p>
          <button onClick={fetchStats} className="mt-3 text-sm text-indigo-600 underline">Retry</button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const sparkData = Object.values(stats.signupsByDay);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs">K</div>
              <h1 className="text-xl font-black text-gray-900">Kyra Admin</h1>
            </div>
            <p className="text-xs text-gray-400">
              Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · auto-refreshes every 60s
            </p>
          </div>
          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ── MRR Hero ────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl p-6 text-white">
          <div className="grid md:grid-cols-4 gap-6">

            {/* MRR */}
            <div className="md:col-span-1">
              <p className="text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">MRR</p>
              <p className="text-5xl font-black tabular-nums">{usd(stats.mrr)}</p>
              <div className="mt-1">
                <GrowthBadge pct={stats.mrrGrowthPct} />
              </div>
              <div className="mt-3 pt-3 border-t border-white/20">
                <Sparkline data={sparkData} color="#a5b4fc" />
                <p className="text-indigo-300 text-[10px] mt-1">14-day signups trend</p>
              </div>
            </div>

            {/* MRR breakdown */}
            <div className="md:col-span-3 grid grid-cols-3 gap-3">
              {[
                { label: 'ARPU', value: usd(stats.arpu), sub: 'avg revenue / paying user' },
                { label: 'Est. LTV', value: usd(stats.estimatedLtv), sub: 'ARPU × 12 months' },
                { label: 'Conversion', value: `${stats.agencies.conversionRate}%`, sub: 'free → paid' },
                { label: 'Paying', value: fmt(stats.agencies.paying), sub: 'of ' + fmt(stats.agencies.total) + ' total' },
                { label: 'New today', value: fmt(stats.agencies.newToday), sub: 'signups' },
                { label: 'New 30d', value: fmt(stats.agencies.newLast30d), sub: `${stats.agencies.newSoloLast30d} solo · ${stats.agencies.newAgencyLast30d} agency` },
              ].map(s => (
                <div key={s.label} className="bg-white/10 rounded-xl p-3">
                  <p className="text-indigo-300 text-[10px] font-semibold uppercase tracking-wide mb-1">{s.label}</p>
                  <p className="text-xl font-black tabular-nums">{s.value}</p>
                  <p className="text-indigo-300 text-[10px] mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Metric Grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Users} label="Total accounts" color="text-indigo-600"
            value={fmt(stats.agencies.total)}
            sub={`${fmt(stats.agencies.solo)} solo · ${fmt(stats.agencies.agency)} agency`}
          />
          <MetricCard
            icon={Activity} label="Activation rate" color="text-green-600"
            value={`${stats.activation.rate}%`}
            sub={`${stats.activation.activated} of ${stats.activation.total} free users sent a message`}
          />
          <MetricCard
            icon={MessageSquare} label="Conversations today" color="text-blue-600"
            value={fmt(stats.conversations.today)}
            sub={`${fmt(stats.conversations.last7d)} last 7d · ${fmt(stats.conversations.last30d)} last 30d`}
          />
          <MetricCard
            icon={Building2} label="Client AIs deployed" color="text-violet-600"
            value={fmt(stats.clients.total)}
            sub={`${fmt(stats.clients.active)} active · ${fmt(stats.clients.newLast7d)} new this week`}
          />
        </div>

        {/* ── Middle row ──────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-4">

          {/* Plan Breakdown + MRR per plan */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-500" /> Plan Breakdown
            </h2>
            <div className="space-y-3">
              {Object.entries(stats.agencies.planBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([plan, count]) => {
                  const total = stats.agencies.total || 1;
                  const pct = Math.round((count / total) * 100);
                  const planMrr = stats.mrrPerPlan[plan] || 0;
                  return (
                    <div key={plan}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${PLAN_COLORS[plan] || 'bg-gray-100 text-gray-600'}`}>
                            {plan.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500">{count} accounts</span>
                        </div>
                        <span className="text-xs font-bold text-gray-700 tabular-nums">
                          {planMrr > 0 ? usd(planMrr) + '/mo' : `${pct}%`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${PLAN_BAR_COLORS[plan] || 'bg-gray-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex justify-between text-xs text-gray-500">
                <span>MRR breakdown</span>
                <span className="font-bold text-gray-900">{usd(stats.mrr)}/mo total</span>
              </div>
            </div>
          </div>

          {/* Referral Funnel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Gift className="h-4 w-4 text-purple-500" /> Referral Funnel
            </h2>
            <div className="space-y-2">
              {[
                { label: 'Links shared', value: stats.referrals.total, pct: 100, color: 'bg-gray-200' },
                { label: 'Signed up', value: stats.referrals.signedUp, pct: stats.referrals.total > 0 ? Math.round((stats.referrals.signedUp / stats.referrals.total) * 100) : 0, color: 'bg-indigo-400' },
                { label: 'Activated (sent msg)', value: stats.referrals.activated, pct: stats.referrals.total > 0 ? Math.round((stats.referrals.activated / stats.referrals.total) * 100) : 0, color: 'bg-green-500' },
                { label: 'Converted to paid', value: stats.referrals.converted, pct: stats.referrals.total > 0 ? Math.round((stats.referrals.converted / stats.referrals.total) * 100) : 0, color: 'bg-amber-500' },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs text-gray-600">{s.label}</span>
                    <span className="text-xs font-bold tabular-nums text-gray-900">{fmt(s.value)} <span className="text-gray-400 font-normal">({s.pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-lg font-black text-purple-700">{stats.referrals.last7d}</p>
                <p className="text-[10px] text-purple-500">last 7 days</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-lg font-black text-amber-700">{stats.referrals.earlyBird}</p>
                <p className="text-[10px] text-amber-500">early bird</p>
              </div>
            </div>
          </div>

          {/* Credit Economy */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" /> Credit Economy (30d)
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Credits used', value: fmt(stats.credits.used30d), sub: 'AI conversations', color: 'text-blue-600' },
                { label: 'Credits purchased', value: fmt(stats.credits.purchased30d), sub: 'top-up revenue', color: 'text-green-600' },
                { label: 'Credits granted (bonus)', value: fmt(stats.credits.granted30d), sub: 'referrals + welcome', color: 'text-amber-600' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-400">{s.sub}</p>
                  </div>
                  <span className={`text-xs font-bold ${s.color}`}>{s.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-gray-400" />
                <p className="text-xs text-gray-500">
                  {stats.conversations.last30d.toLocaleString()} conversations in 30d
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Activation + Solo/Agency split ───────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-4">

          {/* Activation funnel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-500" /> Activation Funnel
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Signed up (free)', value: stats.agencies.free, color: 'bg-gray-50 border border-gray-200' },
                { label: 'Sent 1st message', value: stats.activation.activated, color: 'bg-blue-50 border border-blue-100' },
                { label: 'Converted to paid', value: stats.agencies.paying, color: 'bg-green-50 border border-green-100' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                  <p className="text-2xl font-black text-gray-900 tabular-nums">{fmt(s.value)}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Activation rate</span>
              <span className="font-black text-gray-900">{stats.activation.rate}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${stats.activation.rate}%` }} />
            </div>
            <div className="flex items-center justify-between text-sm mt-3">
              <span className="text-gray-500">Free → Paid conversion</span>
              <span className="font-black text-gray-900">{stats.agencies.conversionRate}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${stats.agencies.conversionRate}%` }} />
            </div>
          </div>

          {/* Solo vs Agency */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" /> Solo vs Agency (30d)
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-center">
                <p className="text-3xl font-black text-violet-700">{fmt(stats.agencies.newSoloLast30d)}</p>
                <p className="text-xs text-violet-500 mt-0.5">Solo signups (30d)</p>
                <p className="text-[10px] text-violet-400 mt-1">{fmt(stats.agencies.solo)} total</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                <p className="text-3xl font-black text-indigo-700">{fmt(stats.agencies.newAgencyLast30d)}</p>
                <p className="text-xs text-indigo-500 mt-0.5">Agency signups (30d)</p>
                <p className="text-[10px] text-indigo-400 mt-1">{fmt(stats.agencies.agency)} total</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-xs text-gray-400 mb-1">Conversations total</p>
                <p className="text-2xl font-black text-gray-900">{fmt(stats.conversations.total)}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-xs text-gray-400 mb-1">AI workers deployed</p>
                <p className="text-2xl font-black text-gray-900">{fmt(stats.clients.total)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 14-day signup chart ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" /> Daily Signups — Last 14 Days
          </h2>
          <div className="flex items-end gap-1 h-24">
            {Object.entries(stats.signupsByDay).map(([date, count]) => {
              const max = Math.max(...Object.values(stats.signupsByDay), 1);
              const pct = Math.round((count / max) * 100);
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    className="w-full bg-indigo-500 rounded-t hover:bg-indigo-400 transition-colors cursor-default group-hover:bg-indigo-400"
                    style={{ height: `${Math.max(pct, 4)}%` }}
                    title={`${date}: ${count} signups`}
                  />
                  <span className="text-[9px] text-gray-400 rotate-45 origin-left hidden sm:block">
                    {date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-3">
            <span>{Object.keys(stats.signupsByDay)[0]}</span>
            <span className="font-semibold text-indigo-600">{fmt(stats.agencies.newLast7d)} this week · {fmt(stats.agencies.newLast30d)} this month</span>
            <span>{Object.keys(stats.signupsByDay).slice(-1)[0]}</span>
          </div>
        </div>

        {/* ── Recent Signups ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" /> Recent Signups
          </h2>
          {stats.recentSignups.length === 0 ? (
            <p className="text-gray-400 text-sm">No signups yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">Account</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Plan</th>
                    <th className="pb-2 font-medium">MRR</th>
                    <th className="pb-2 font-medium">Signed up</th>
                    <th className="pb-2 font-medium">Website</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.recentSignups.map(a => (
                    <tr key={a.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                            {a.name[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900 truncate max-w-[160px]">{a.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.accountType === 'solo' ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {a.accountType}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[a.plan] || 'bg-gray-100 text-gray-600'}`}>
                          {a.plan.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5">
                        {a.mrr > 0
                          ? <span className="text-green-600 font-bold text-xs">{usd(a.mrr)}/mo</span>
                          : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="py-2.5 text-xs text-gray-500">
                        {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5">
                        {a.websiteUrl
                          ? <a href={a.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline text-xs flex items-center gap-0.5">
                              <Globe className="h-3 w-3" /> {a.websiteUrl.replace(/https?:\/\//, '').slice(0, 20)}
                            </a>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── VPS Provisioner Health ──────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Server className="h-4 w-4 text-indigo-500" /> VPS Provisioner
            </h2>
            <button
              onClick={fetchHealth}
              disabled={healthLoading}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1 transition"
            >
              <RefreshCw className={`h-3 w-3 ${healthLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          {vpsHealth === null ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : !vpsHealth.ok ? (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-4">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-800 text-sm">Provisioner unreachable</p>
                <p className="text-xs text-red-600 mt-0.5">{vpsHealth.error}</p>
                <p className="text-xs text-gray-500 mt-1">Sites cannot be built or deployed until this is resolved.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-green-50 border border-green-100 p-3 col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <p className="text-xs font-semibold text-green-700">Healthy</p>
                </div>
                <p className="text-sm font-bold text-gray-900">{vpsHealth.hostname}</p>
                <p className="text-[10px] text-gray-400">Docker {vpsHealth.docker}</p>
                {vpsHealth.uptime !== undefined && (
                  <p className="text-[10px] text-gray-400">Up {Math.floor(vpsHealth.uptime / 3600)}h {Math.floor((vpsHealth.uptime % 3600) / 60)}m</p>
                )}
              </div>
              {vpsHealth.containers && (
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Container className="h-3.5 w-3.5 text-indigo-500" />
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Containers</p>
                  </div>
                  <p className="text-xl font-black text-gray-900">{vpsHealth.containers.running}<span className="text-xs text-gray-400">/{vpsHealth.containers.total}</span></p>
                  {vpsHealth.containers.stopped > 0 && (
                    <p className="text-[10px] text-amber-500 font-medium">{vpsHealth.containers.stopped} stopped</p>
                  )}
                </div>
              )}
              {vpsHealth.memory && (
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Cpu className="h-3.5 w-3.5 text-purple-500" />
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Memory</p>
                  </div>
                  <p className="text-xl font-black text-gray-900">{vpsHealth.memory.usagePercent}%</p>
                  <p className="text-[10px] text-gray-400">{Math.round(vpsHealth.memory.usedMb / 1024)}GB / {Math.round(vpsHealth.memory.totalMb / 1024)}GB</p>
                  <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${vpsHealth.memory.usagePercent > 80 ? 'bg-red-500' : vpsHealth.memory.usagePercent > 60 ? 'bg-amber-400' : 'bg-green-500'}`}
                      style={{ width: `${vpsHealth.memory.usagePercent}%` }}
                    />
                  </div>
                </div>
              )}
              {vpsHealth.disk && (
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <HardDrive className="h-3.5 w-3.5 text-blue-500" />
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Disk</p>
                  </div>
                  <p className="text-xl font-black text-gray-900">{vpsHealth.disk.usagePercent}%</p>
                  <p className="text-[10px] text-gray-400">{Math.round(vpsHealth.disk.usedMb / 1024)}GB / {Math.round(vpsHealth.disk.totalMb / 1024)}GB</p>
                  <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${vpsHealth.disk.usagePercent > 80 ? 'bg-red-500' : vpsHealth.disk.usagePercent > 60 ? 'bg-amber-400' : 'bg-blue-500'}`}
                      style={{ width: `${vpsHealth.disk.usagePercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Action Items ─────────────────────────────────────────────── */}
        {healthChecks.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-amber-500" /> Action Items
              <span className="ml-auto text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {healthChecks.filter(c => c.severity === 'critical').length} critical
              </span>
            </h2>
            <div className="space-y-3">
              {healthChecks.map(check => {
                const isCritical = check.severity === 'critical';
                const isWarning = check.severity === 'warning';
                return (
                  <div
                    key={check.id}
                    className={`rounded-xl border p-4 ${
                      isCritical ? 'bg-red-50 border-red-200' :
                      isWarning ? 'bg-amber-50 border-amber-200' :
                      'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {isCritical
                        ? <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        : isWarning
                        ? <TriangleAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        : <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${
                          isCritical ? 'text-red-800' : isWarning ? 'text-amber-800' : 'text-blue-800'
                        }`}>{check.title}</p>
                        <p className={`text-xs mt-0.5 ${
                          isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-blue-600'
                        }`}>{check.desc}</p>
                        {check.sql && (
                          <details className="mt-2">
                            <summary className="text-[11px] text-gray-500 cursor-pointer font-medium">View SQL migration ▸</summary>
                            <pre className="mt-1.5 text-[10px] bg-white border border-gray-200 rounded-lg p-2 overflow-x-auto text-gray-700 font-mono whitespace-pre-wrap">{check.sql}</pre>
                          </details>
                        )}
                        <a
                          href={check.link}
                          target={check.link.startsWith('http') ? '_blank' : '_self'}
                          rel="noreferrer"
                          className={`inline-block mt-2 text-xs font-semibold underline ${
                            isCritical ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-blue-700'
                          }`}
                        >
                          {check.linkLabel}
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Lead Sync ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DatabaseZap className="h-4 w-4 text-indigo-500" />
                <h2 className="font-bold text-gray-900">Sync All Leads → CRM</h2>
              </div>
              <p className="text-sm text-gray-500">
                Backfill every Kyra signup into your master CRM as a contact.
                Safe to run multiple times — skips emails already in CRM.
              </p>
            </div>
            <button
              onClick={syncLeads}
              disabled={syncing}
              className="shrink-0 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition"
            >
              {syncing
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Syncing…</>
                : <><DatabaseZap className="h-4 w-4" /> Sync Now</>}
            </button>
          </div>

          {/* Result */}
          {syncResult && (
            <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="font-bold text-green-800 text-sm">Sync complete</p>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total agencies', value: syncResult.total },
                  { label: 'Synced to CRM', value: syncResult.synced, highlight: true },
                  { label: 'Already existed', value: syncResult.skipped },
                  { label: 'Errors', value: syncResult.errors, isError: true },
                ].map(s => (
                  <div key={s.label} className={`rounded-lg p-3 text-center ${s.highlight ? 'bg-green-100' : s.isError && s.value > 0 ? 'bg-red-50' : 'bg-white border border-green-100'}`}>
                    <p className={`text-2xl font-black tabular-nums ${s.highlight ? 'text-green-700' : s.isError && s.value > 0 ? 'text-red-600' : 'text-gray-900'}`}>{s.value}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {syncResult.errors > 0 && syncResult.errorDetails.length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs text-red-600 cursor-pointer font-medium">
                    View {syncResult.errors} error{syncResult.errors !== 1 ? 's' : ''}
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {syncResult.errorDetails.map((e, i) => (
                      <li key={i} className="text-[11px] text-red-500 font-mono">{e}</li>
                    ))}
                  </ul>
                </details>
              )}
              <p className="text-[10px] text-green-600 mt-2">
                Master CRM ID: <span className="font-mono">{syncResult.masterAgencyId}</span>
                {' · '}View contacts at{' '}
                <a href="/agency/crm/contacts" className="underline" target="_blank">CRM → Contacts</a>
              </p>
            </div>
          )}

          {syncError && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">Sync failed</p>
                <p className="text-xs text-red-600 mt-0.5">{syncError}</p>
                {syncError.includes('MASTER_AGENCY_ID') && (
                  <p className="text-xs text-red-500 mt-2">
                    Add <code className="bg-red-100 px-1 rounded">MASTER_AGENCY_ID</code> to Vercel env vars
                    — your Conversion System agency UUID from Supabase.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-300">
          Kyra Admin · Restricted access · Generated {new Date(stats.generatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
