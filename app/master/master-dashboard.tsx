'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Crown, Building2, Users, Zap, DollarSign, BarChart3, MessageSquare,
  Server, RefreshCw, ChevronRight, Globe, Activity, Coins,
  UserPlus, Bot, Clock, TrendingUp, ExternalLink, CreditCard,
} from 'lucide-react';
import GrowthChart from '@/components/master/growth-chart';

interface KPIs {
  total_agencies: number;
  solo_accounts: number;
  agency_accounts: number;
  total_clients: number;
  active_containers: number;
  platform_mrr_cents: number;
  conversations_today: number;
  conversations_this_week: number;
  conversations_this_month: number;
  credits_used: number;
  credits_purchased: number;
  credits_bonus: number;
  signups_this_week: number;
}

interface AgencyStat {
  id: string;
  name: string;
  slug: string;
  plan: string;
  type: 'solo' | 'agency';
  created_at: string;
  client_count: number;
  running_clients: number;
  conversations: number;
  mrr_cents: number;
  has_gateway: boolean;
}

interface Conversation {
  id: string;
  agency_id: string;
  channel: string;
  user_message: string;
  ai_response: string;
  created_at: string;
}

interface Signup {
  id: string;
  name: string;
  type: 'solo' | 'agency';
  created_at: string;
}

interface VpsHealth {
  status: string;
  containers: { total: number; running: number; stopped: number };
  memory: { usagePercent: number; usedMb: number; totalMb: number; availableMb: number };
  disk: { usagePercent: number; usedMb: number; totalMb: number };
  cpus: number;
  uptime: number;
}

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function Bar({ pct, warn = 60, danger = 80 }: { pct: number; warn?: number; danger?: number }) {
  const color = pct >= danger ? 'bg-red-500' : pct >= warn ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`rounded-lg ${color} p-1.5`}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-700 text-gray-300',
  starter: 'bg-blue-900 text-blue-300',
  pro: 'bg-indigo-900 text-indigo-300',
  scale: 'bg-purple-900 text-purple-300',
};

export default function MasterDashboard() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [agencies, setAgencies] = useState<AgencyStat[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [vps, setVps] = useState<VpsHealth | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/master/stats');
      if (res.ok) {
        const data = await res.json();
        setKpis(data.kpis);
        setAgencies(data.agencies);
        setConversations(data.recent_conversations);
        setSignups(data.recent_signups);
        setLastUpdate(new Date());
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchVps = useCallback(async () => {
    try {
      const res = await fetch('/api/master/vps-health');
      if (res.ok) {
        const data = await res.json();
        setVps(data);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchVps();
    fetch('/api/stripe/env-check').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setStripeReady(!!d.STRIPE_SECRET_KEY);
    }).catch(() => {});
    const statsInterval = setInterval(fetchStats, 15_000); // 15s
    const vpsInterval = setInterval(fetchVps, 30_000); // 30s
    return () => { clearInterval(statsInterval); clearInterval(vpsInterval); };
  }, [fetchStats, fetchVps]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading Master Control...</span>
        </div>
      </div>
    );
  }

  const memPct = vps ? vps.memory.usagePercent : 0;
  const diskPct = vps ? vps.disk.usagePercent : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Top Bar ── */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-600 p-1.5">
            <Crown className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Master Control</h1>
            <p className="text-[10px] text-gray-500">Conversion System</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <span className="text-[10px] text-gray-600 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live · {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button onClick={() => { fetchStats(); fetchVps(); }} className="text-gray-500 hover:text-white transition">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <Link href="/agency" className="text-xs text-gray-400 hover:text-white transition flex items-center gap-1">
            Dashboard <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        {/* ── KPIs ── */}
        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard icon={Building2} label="Agencies" value={kpis.agency_accounts} sub={`+ ${kpis.solo_accounts} solo`} color="bg-indigo-600" />
            <KpiCard icon={Bot} label="Containers" value={kpis.active_containers} sub={`${kpis.total_clients} clients`} color="bg-green-600" />
            <KpiCard icon={MessageSquare} label="Today" value={kpis.conversations_today} sub={`${kpis.conversations_this_week} this week`} color="bg-blue-600" />
            <KpiCard icon={TrendingUp} label="This Month" value={kpis.conversations_this_month} sub="conversations" color="bg-cyan-600" />
            <KpiCard icon={UserPlus} label="Signups" value={kpis.signups_this_week} sub="last 7 days" color="bg-purple-600" />
            <KpiCard icon={Coins} label="Credits" value={kpis.credits_used} sub={`${kpis.credits_purchased} purchased · ${kpis.credits_bonus} bonus`} color="bg-amber-600" />
          </div>
        )}

        {/* ── Growth Chart ── */}
        {agencies.length > 0 && (
          <GrowthChart agencies={agencies.map(a => ({ id: a.id, created_at: a.created_at, type: a.type as 'solo' | 'agency' }))} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Main Column ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Agency Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  All Accounts ({agencies.length})
                </h2>
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" />Agency</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Solo</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="text-left px-4 py-2 font-medium">Account</th>
                      <th className="text-center px-3 py-2 font-medium">Type</th>
                      <th className="text-center px-3 py-2 font-medium">Plan</th>
                      <th className="text-center px-3 py-2 font-medium">Clients</th>
                      <th className="text-center px-3 py-2 font-medium">Convos</th>
                      <th className="text-center px-3 py-2 font-medium">Gateway</th>
                      <th className="text-right px-4 py-2 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {agencies.map(a => (
                      <tr key={a.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white ${a.type === 'solo' ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
                              {a.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-white truncate max-w-[160px]">{a.name}</span>
                          </div>
                        </td>
                        <td className="text-center px-3">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${a.type === 'solo' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-indigo-900/50 text-indigo-400'}`}>
                            {a.type}
                          </span>
                        </td>
                        <td className="text-center px-3">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PLAN_COLORS[a.plan] ?? PLAN_COLORS.free}`}>
                            {a.plan}
                          </span>
                        </td>
                        <td className="text-center px-3 text-gray-400">
                          {a.client_count > 0 ? `${a.running_clients}/${a.client_count}` : '–'}
                        </td>
                        <td className="text-center px-3">
                          <span className={a.conversations > 0 ? 'text-white font-medium' : 'text-gray-600'}>{a.conversations || '–'}</span>
                        </td>
                        <td className="text-center px-3">
                          {a.has_gateway ? (
                            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" title="Running" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-gray-700 inline-block" title="No gateway" />
                          )}
                        </td>
                        <td className="text-right px-4 text-gray-500">{timeAgo(a.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Conversations */}
            {conversations.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                    Live Conversations
                  </h2>
                </div>
                <div className="divide-y divide-gray-800/50">
                  {conversations.slice(0, 8).map(c => {
                    const agencyName = agencies.find(a => a.id === c.agency_id)?.name ?? 'Unknown';
                    return (
                      <div key={c.id} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-indigo-400">{agencyName}</span>
                            <span className="text-[10px] text-gray-600">·</span>
                            <span className="text-[10px] text-gray-500 uppercase">{c.channel || 'chat'}</span>
                          </div>
                          <span className="text-[10px] text-gray-600">{timeAgo(c.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-300 line-clamp-1">
                          <span className="text-gray-500">Customer:</span> {c.user_message}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                          <span className="text-emerald-500">AI:</span> {c.ai_response}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-4">

            {/* VPS Health */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Server className="h-4 w-4 text-gray-400" />
                VPS Health
                {vps && <span className="text-[10px] text-emerald-400 font-normal ml-auto">● Live</span>}
              </h3>
              {vps ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-gray-400">CPU</span>
                      <span className="text-white font-mono">{vps.cpus} cores</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-gray-400">RAM</span>
                      <span className="text-white font-mono">{Math.round(vps.memory.usedMb / 1024)}GB / {Math.round(vps.memory.totalMb / 1024)}GB</span>
                    </div>
                    <Bar pct={memPct} warn={70} danger={90} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-gray-400">Disk</span>
                      <span className="text-white font-mono">{Math.round(vps.disk.usedMb / 1024)}GB / {Math.round(vps.disk.totalMb / 1024)}GB</span>
                    </div>
                    <Bar pct={diskPct} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-gray-400">Containers</span>
                      <span className="text-white font-mono">{vps.containers.running} running</span>
                    </div>
                    <Bar pct={(vps.containers.running / 200) * 100} warn={60} danger={80} />
                    <p className="text-[10px] text-gray-600 mt-0.5">~{200 - vps.containers.running} capacity remaining</p>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Uptime</span>
                    <span className="text-gray-300 font-mono">{Math.floor(vps.uptime / 86400)}d {Math.floor((vps.uptime % 86400) / 3600)}h</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Loading VPS data...</p>
              )}
            </div>

            {/* Recent Signups */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-gray-400" />
                Recent Signups
              </h3>
              {signups.length > 0 ? (
                <div className="space-y-2">
                  {signups.slice(0, 8).map(s => (
                    <div key={s.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`h-5 w-5 rounded flex items-center justify-center text-[9px] font-bold text-white ${s.type === 'solo' ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-300 truncate">{s.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-600 shrink-0 ml-2">{timeAgo(s.created_at)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No signups this week</p>
              )}
            </div>

            {/* Quick Links */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Quick Links</h3>
              <div className="space-y-1.5">
                {[
                  { label: '⚙️ Accounts Admin', href: '/master/accounts', icon: Crown },
                  { label: 'Billing Setup', href: '/master/stripe-setup', icon: CreditCard, dot: stripeReady === false },
                  { label: 'Agency Dashboard', href: '/agency', icon: Building2 },
                  { label: 'Solo Landing', href: '/solo', icon: Users },
                  { label: 'VPS Provisioner', href: 'https://provisioner.gw.kyra.conversionsystem.com/health', icon: Server, ext: true },
                  { label: 'OVH Control Panel', href: 'https://www.ovh.com/manager/#/dedicated/vps', icon: Server, ext: true },
                  { label: 'Supabase', href: 'https://supabase.com/dashboard', icon: Activity, ext: true },
                  { label: 'Vercel', href: 'https://vercel.com/dashboard', icon: Globe, ext: true },
                  { label: 'GitHub', href: 'https://github.com/ConversionSystem/kyra', icon: Globe, ext: true },
                ].map(({ label, href, icon: Icon, ext, dot }) => (
                  <a key={href} href={href} target={ext ? '_blank' : undefined} rel={ext ? 'noopener noreferrer' : undefined}
                    className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition py-1">
                    <span className="relative">
                      <Icon className="h-3 w-3" />
                      {dot && <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />}
                    </span>
                    {label}
                    {ext ? <ExternalLink className="h-2.5 w-2.5 ml-auto opacity-40" /> : <ChevronRight className="h-3 w-3 ml-auto opacity-40" />}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
