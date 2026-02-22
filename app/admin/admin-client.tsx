'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, Users, MessageSquare, DollarSign, Zap, Gift, Building2 } from 'lucide-react';

interface Stats {
  mrr: number;
  agencies: { total: number; paying: number; free: number; newToday: number; newLast7d: number; newLast30d: number; planBreakdown: Record<string, number> };
  clients: { total: number; active: number };
  conversations: { total: number; today: number; last7d: number };
  referrals: { signedUp: number; converted: number };
  recentSignups: { id: string; name: string; plan: string; mrr: number; createdAt: string }[];
  generatedAt: string;
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  starter: 'bg-blue-100 text-blue-700',
  pro: 'bg-indigo-100 text-indigo-700',
  scale: 'bg-purple-100 text-purple-700',
  beta: 'bg-amber-100 text-amber-700',
};

function StatCard({ icon: Icon, label, value, sub, color = 'text-indigo-600' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="text-3xl font-black text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/kyra-stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStats(await res.json());
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60_000); // auto-refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500"><RefreshCw className="h-4 w-4 animate-spin" /> Loading...</div>
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

  const conversionRate = stats.agencies.total > 0
    ? Math.round((stats.agencies.paying / stats.agencies.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Kyra Admin</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Last updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {' · '}Auto-refreshes every 60s
            </p>
          </div>
          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* MRR hero */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white">
          <p className="text-indigo-200 text-sm font-medium uppercase tracking-wide mb-1">Monthly Recurring Revenue</p>
          <p className="text-5xl font-black tabular-nums">${stats.mrr.toLocaleString()}</p>
          <p className="text-indigo-300 text-sm mt-1">
            {stats.agencies.paying} paying agencies · {conversionRate}% conversion rate
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'New today', value: stats.agencies.newToday },
              { label: 'New last 7d', value: stats.agencies.newLast7d },
              { label: 'New last 30d', value: stats.agencies.newLast30d },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                <p className="text-indigo-300 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Building2} label="Total agencies" value={stats.agencies.total} sub={`${stats.agencies.free} free · ${stats.agencies.paying} paid`} />
          <StatCard icon={Users} label="Client AIs deployed" value={stats.clients.total} sub={`${stats.clients.active} active`} color="text-green-600" />
          <StatCard icon={MessageSquare} label="Conversations today" value={stats.conversations.today} sub={`${stats.conversations.last7d} last 7 days`} color="text-blue-600" />
          <StatCard icon={Gift} label="Referrals converted" value={stats.referrals.converted} sub={`${stats.referrals.signedUp} signed up`} color="text-purple-600" />
        </div>

        {/* Plan breakdown + Recent signups side by side */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Plan breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-bold text-gray-900 mb-4">Plan Breakdown</h2>
            <div className="space-y-3">
              {Object.entries(stats.agencies.planBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([plan, count]) => {
                  const total = stats.agencies.total || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={plan}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[plan] || 'bg-gray-100 text-gray-600'}`}>{plan}</span>
                        <span className="text-sm font-bold text-gray-900 tabular-nums">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Recent signups */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-bold text-gray-900 mb-4">Recent Signups</h2>
            {stats.recentSignups.length === 0 ? (
              <p className="text-gray-400 text-sm">No signups yet.</p>
            ) : (
              <div className="space-y-2">
                {stats.recentSignups.map(a => (
                  <div key={a.id} className="flex items-center gap-3 py-1.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                      {a.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[a.plan] || 'bg-gray-100 text-gray-600'}`}>{a.plan}</span>
                      {a.mrr > 0 && <span className="text-xs font-bold text-green-600">${a.mrr}/mo</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conversations */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            AI Conversations
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Total all time', value: stats.conversations.total.toLocaleString() },
              { label: 'Today', value: stats.conversations.today.toLocaleString() },
              { label: 'Last 7 days', value: stats.conversations.last7d.toLocaleString() },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-4">
                <p className="text-2xl font-black text-gray-900 tabular-nums">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-300">
          Kyra Admin · Restricted access · {new Date(stats.generatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
