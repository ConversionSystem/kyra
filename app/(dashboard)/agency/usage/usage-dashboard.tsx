'use client';

import { useState, useEffect } from 'react';
import {
  Activity, DollarSign, MessageSquare, Zap, Bot, Clock,
  TrendingUp, AlertTriangle, CheckCircle2, XCircle, Loader2,
  ChevronUp, ChevronDown, ArrowUpDown, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { SectionNav } from '@/components/dashboard/section-nav';

interface ClientUsage {
  client_id: string;
  client_name: string;
  status: string;
  model: string;
  conversations_today: number;
  conversations_month: number;
  estimated_tokens: number;
  estimated_cost_usd: number;
  last_activity: string | null;
}

interface Totals {
  total_clients: number;
  active_clients: number;
  conversations_today: number;
  conversations_month: number;
  estimated_tokens: number;
  estimated_cost_usd: number;
}

type SortKey = 'name' | 'convos' | 'tokens' | 'cost' | 'status';

export function UsageDashboard() {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [clients, setClients] = useState<ClientUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>('cost');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    fetch('/api/agency/usage')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setTotals(d.totals); setClients(d.clients); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSort = (key: SortKey) => {
    if (sort === key) setSortAsc(!sortAsc);
    else { setSort(key); setSortAsc(false); }
  };

  const sorted = [...clients].sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case 'name': cmp = a.client_name.localeCompare(b.client_name); break;
      case 'convos': cmp = a.conversations_month - b.conversations_month; break;
      case 'tokens': cmp = a.estimated_tokens - b.estimated_tokens; break;
      case 'cost': cmp = a.estimated_cost_usd - b.estimated_cost_usd; break;
      case 'status': cmp = a.status.localeCompare(b.status); break;
    }
    return sortAsc ? cmp : -cmp;
  });

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-0">
    <SectionNav currentHref="/agency/usage" />
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="h-6 w-6 text-indigo-600" /> Token Usage & Costs
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor AI worker activity, token consumption, and estimated costs across all clients
        </p>
      </div>

      {/* KPI Cards */}
      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard icon={Bot} label="Total Workers" value={totals.total_clients} color="bg-indigo-50 text-indigo-600 border-indigo-200" />
          <KpiCard icon={CheckCircle2} label="Active" value={totals.active_clients} color="bg-green-50 text-green-600 border-green-200" />
          <KpiCard icon={MessageSquare} label="Today" value={totals.conversations_today} color="bg-blue-50 text-blue-600 border-blue-200" />
          <KpiCard icon={MessageSquare} label="This Month" value={totals.conversations_month} color="bg-cyan-50 text-cyan-600 border-cyan-200" />
          <KpiCard icon={Zap} label="Tokens" value={formatTokens(totals.estimated_tokens)} color="bg-amber-50 text-amber-600 border-amber-200" />
          <KpiCard icon={DollarSign} label="Est. Cost" value={`$${totals.estimated_cost_usd.toFixed(2)}`} color="bg-purple-50 text-purple-600 border-purple-200" />
        </div>
      )}

      {/* Cost Breakdown Bar */}
      {clients.length > 0 && totals && totals.estimated_cost_usd > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Cost Distribution</h3>
          <div className="flex h-6 rounded-lg overflow-hidden">
            {sorted.filter(c => c.estimated_cost_usd > 0).map((c, i) => {
              const pct = (c.estimated_cost_usd / totals.estimated_cost_usd) * 100;
              if (pct < 1) return null;
              const colors = ['bg-indigo-500', 'bg-blue-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500', 'bg-teal-500'];
              return (
                <div key={c.client_id} className={`${colors[i % colors.length]} relative group`} style={{ width: `${pct}%` }}>
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                    {c.client_name}: ${c.estimated_cost_usd.toFixed(2)} ({pct.toFixed(0)}%)
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {sorted.filter(c => c.estimated_cost_usd > 0).slice(0, 8).map((c, i) => {
              const colors = ['bg-indigo-500', 'bg-blue-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500', 'bg-teal-500'];
              return (
                <div key={c.client_id} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className={`h-2.5 w-2.5 rounded-sm ${colors[i % colors.length]}`} />
                  {c.client_name}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Client Usage Table */}
      {clients.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Bot className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No AI workers yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first client to start tracking usage.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <SortTh label="AI Worker" sortKey="name" current={sort} asc={sortAsc} onClick={handleSort} />
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Model</th>
                  <SortTh label="Conversations" sortKey="convos" current={sort} asc={sortAsc} onClick={handleSort} />
                  <SortTh label="Tokens" sortKey="tokens" current={sort} asc={sortAsc} onClick={handleSort} className="hidden sm:table-cell" />
                  <SortTh label="Est. Cost" sortKey="cost" current={sort} asc={sortAsc} onClick={handleSort} />
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map(c => (
                  <tr key={c.client_id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <Link
                        href={`/agency/clients/${c.client_id}`}
                        className="flex items-center gap-2 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition">
                          <Bot className="h-4 w-4 text-indigo-600" />
                        </div>
                        <span className="font-medium text-gray-900 truncate max-w-[180px] group-hover:text-indigo-600 transition">{c.client_name}</span>
                        <ExternalLink className="h-3 w-3 text-gray-300 group-hover:text-indigo-400 shrink-0 transition" />
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-3 py-3 text-gray-500 hidden md:table-cell">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{c.model}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-900">{c.conversations_month}</span>
                        {c.conversations_today > 0 && (
                          <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                            +{c.conversations_today} today
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600 hidden sm:table-cell font-mono text-xs">
                      {formatTokens(c.estimated_tokens)}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`font-semibold ${c.estimated_cost_usd > 1 ? 'text-amber-600' : 'text-gray-600'}`}>
                        ${c.estimated_cost_usd.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 hidden lg:table-cell">
                      {c.last_activity ? (
                        <span className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {timeAgo(c.last_activity)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-700">
          <p className="font-semibold">Cost estimates are approximate</p>
          <p className="mt-0.5">Based on average tokens per conversation (~800) and current model pricing. Actual costs depend on conversation length and API provider rates.</p>
        </div>
      </div>
    </div>
    </div>
  );
}

// ── Sub-components ──

function KpiCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'running') return (
    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Running
    </span>
  );
  if (status === 'error') return (
    <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      <XCircle className="h-3 w-3" /> Error
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
      <Clock className="h-3 w-3" /> {status}
    </span>
  );
}

function SortTh({ label, sortKey, current, asc, onClick, className = '' }: {
  label: string; sortKey: SortKey; current: SortKey; asc: boolean;
  onClick: (k: SortKey) => void; className?: string;
}) {
  const active = current === sortKey;
  return (
    <th className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}>
      <button onClick={() => onClick(sortKey)} className="flex items-center gap-1 hover:text-gray-700">
        {label}
        <span className="inline-flex flex-col leading-none">
          <ChevronUp className={`h-2.5 w-2.5 ${active && asc ? 'text-indigo-600' : 'text-gray-300'}`} />
          <ChevronDown className={`h-2.5 w-2.5 -mt-0.5 ${active && !asc ? 'text-indigo-600' : 'text-gray-300'}`} />
        </span>
      </button>
    </th>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
