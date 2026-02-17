'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminStats {
  summary: {
    totalUsers: number;
    payingUsers: number;
    planBreakdown: Record<string, number>;
    totalConversations: number;
    totalMessages: number;
    totalMemories: number;
    totalUsage: number;
    msgs24h: number;
    msgs7d: number;
    mrr: number;
  };
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    plan: string;
    usage_this_month: number;
    stripe_customer_id: string | null;
    created_at: string;
    updated_at: string;
    conversations: number;
    messages: number;
    memories: number;
  }>;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="text-gray-500 text-sm mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-gray-400 text-xs mt-1">{sub}</div>}
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: 'bg-gray-200 text-gray-700',
    starter: 'bg-blue-900/50 text-blue-600',
    business: 'bg-indigo-50 text-indigo-600',
    max: 'bg-amber-900/50 text-amber-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[plan] || colors.free}`}>
      {plan}
    </span>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(async (res) => {
        if (res.status === 403) {
          router.push('/chat');
          return null;
        }
        if (!res.ok) throw new Error('Failed to load stats');
        return res.json();
      })
      .then((data) => {
        if (data) setStats(data as AdminStats);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-gray-500 animate-pulse">Loading admin dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!stats) return null;

  const { summary, users } = stats;
  const planCredits: Record<string, number> = { free: 50, starter: 500, business: 3000, max: 8000 };

  return (
    <div className="min-h-screen bg-black text-gray-900 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Kyra Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time platform metrics</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetch('/api/admin/stats').then(r => r.json()).then((d) => setStats(d as AdminStats)).finally(() => setLoading(false)); }}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="MRR" value={`$${summary.mrr}`} sub={`${summary.payingUsers} paying users`} />
        <StatCard label="Total Users" value={summary.totalUsers} sub={Object.entries(summary.planBreakdown).map(([k, v]) => `${v} ${k}`).join(' · ')} />
        <StatCard label="Messages (24h)" value={summary.msgs24h} sub={`${summary.msgs7d} this week`} />
        <StatCard label="Total Credits Used" value={summary.totalUsage.toLocaleString()} sub={`${summary.totalConversations} conversations`} />
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-left border-b border-gray-200">
                <th className="p-3">User</th>
                <th className="p-3">Plan</th>
                <th className="p-3 text-right">Usage</th>
                <th className="p-3 text-right">Conversations</th>
                <th className="p-3 text-right">Messages</th>
                <th className="p-3 text-right">Memories</th>
                <th className="p-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const limit = planCredits[user.plan] || 50;
                const pct = Math.round((user.usage_this_month / limit) * 100);
                return (
                  <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <div className="font-medium">{user.name || '—'}</div>
                      <div className="text-gray-400 text-xs">{user.email}</div>
                    </td>
                    <td className="p-3"><PlanBadge plan={user.plan} /></td>
                    <td className="p-3 text-right">
                      <span className={pct > 80 ? 'text-red-600' : pct > 50 ? 'text-amber-600' : 'text-gray-700'}>
                        {user.usage_this_month}/{limit}
                      </span>
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1 ml-auto">
                        <div
                          className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-3 text-right text-gray-700">{user.conversations}</td>
                    <td className="p-3 text-right text-gray-700">{user.messages}</td>
                    <td className="p-3 text-right text-gray-700">{user.memories}</td>
                    <td className="p-3 text-gray-500 text-xs">
                      {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {['free', 'starter', 'business', 'max'].map((plan) => (
          <div key={plan} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <PlanBadge plan={plan} />
            <div className="text-2xl font-bold mt-2">{summary.planBreakdown[plan] || 0}</div>
            <div className="text-gray-400 text-xs">
              Beta (free)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
