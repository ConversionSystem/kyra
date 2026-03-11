'use client';

/**
 * MissionControlLive
 * Real-time dashboard panel for Mission Control.
 * Polls /api/agency/fleet (fleet status + KPIs) and /api/agency/conversations (live feed).
 * Works for both agency and solo accounts.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Zap, Users, Coins, AlertTriangle, Clock,
  RefreshCw, ChevronRight, Send, Globe, Smartphone, ExternalLink,
  TrendingUp, Activity,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FleetClient {
  id: string;
  name: string;
  gateway_status: string | null;
  gateway_error: string | null;
  usage_this_month: number;
  conversations_today: number;
  last_message_at: string | null;
}

interface FleetSummary {
  total: number;
  running: number;
  conversations_today: number;
  credits_balance: number;
  credits_used: number;
}

interface Conversation {
  id: string;
  client_id: string;
  client_name?: string;
  channel: string;
  user_message: string;
  ai_response: string;
  created_at: string;
}

interface Props {
  // Initial data from SSR (avoids loading flash)
  initialClients?: FleetClient[];
  initialSummary?: FleetSummary;
  initialConversations?: Conversation[];
  // Whether to show client column in feed (agency vs solo)
  showClientColumn?: boolean;
  // Optional: solo-specific gateway terminal link
  terminalUrl?: string | null;
  // Interval in ms (default 20s)
  pollInterval?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const CHANNEL_STYLE: Record<string, { label: string; color: string }> = {
  test_chat: { label: 'Test',      color: 'bg-blue-50   text-blue-700   border-blue-100'    },
  portal:    { label: 'Portal',    color: 'bg-purple-50 text-purple-700 border-purple-100'  },
  telegram:  { label: 'Telegram',  color: 'bg-sky-50    text-sky-700    border-sky-100'     },
  sms:       { label: 'SMS',       color: 'bg-green-50  text-green-700  border-green-100'   },
  ghl_sms:   { label: 'GHL SMS',   color: 'bg-green-50  text-green-700  border-green-100'   },
  ghl_email: { label: 'GHL Email', color: 'bg-orange-50 text-orange-700 border-orange-100'  },
  whatsapp:  { label: 'WhatsApp',  color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  webchat:   { label: 'Web Chat',  color: 'bg-indigo-50 text-indigo-700 border-indigo-100'  },
  web_chat:  { label: 'Web Chat',  color: 'bg-indigo-50 text-indigo-700 border-indigo-100'  },
};

function ChannelBadge({ channel }: { channel: string }) {
  const style = CHANNEL_STYLE[channel] ?? { label: channel, color: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${style.color}`}>
      {style.label}
    </span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  iconBg,
  iconColor,
  pulse,
  alert,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  iconBg: string;
  iconColor: string;
  pulse?: boolean;
  alert?: boolean;
}) {
  return (
    <div className={`bg-white border rounded-xl p-4 flex items-center gap-3.5 ${alert ? 'border-red-200' : 'border-gray-200'}`}>
      <div className={`relative rounded-xl ${iconBg} p-2.5 shrink-0`}>
        <Icon className={`h-4.5 w-4.5 ${iconColor}`} />
        {pulse && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" />
        )}
      </div>
      <div className="min-w-0">
        <p className={`text-xl font-black leading-none ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MissionControlLive({
  initialClients = [],
  initialSummary = { total: 0, running: 0, conversations_today: 0, credits_balance: 0, credits_used: 0 },
  initialConversations = [],
  showClientColumn = true,
  pollInterval = 20_000,
}: Props) {
  const [clients, setClients]           = useState<FleetClient[]>(initialClients);
  const [summary, setSummary]           = useState<FleetSummary>(initialSummary);
  const [convos, setConvos]             = useState<Conversation[]>(initialConversations);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const [polling, setPolling]           = useState(false);
  const [tab, setTab]                   = useState<'fleet' | 'activity'>('fleet');
  const pollingRef                      = useRef(false);

  const fetchFleet = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    setPolling(true);
    try {
      const [fleetRes, convoRes] = await Promise.all([
        fetch('/api/agency/fleet', { cache: 'no-store' }),
        fetch('/api/agency/conversations?limit=15', { cache: 'no-store' }),
      ]);
      if (fleetRes.ok) {
        const data = await fleetRes.json();
        setClients(data.clients ?? []);
        setSummary(data.summary ?? initialSummary);
        setLastUpdated(new Date());
      }
      if (convoRes.ok) {
        const data = await convoRes.json();
        if (Array.isArray(data.conversations)) {
          setConvos(data.conversations.slice(0, 15));
        }
      }
    } catch {
      // silently fail — show stale data
    } finally {
      pollingRef.current = false;
      setPolling(false);
    }
  }, [initialSummary]);

  // Initial fetch + polling interval
  useEffect(() => {
    fetchFleet();
    const t = setInterval(fetchFleet, pollInterval);
    return () => clearInterval(t);
  }, [fetchFleet, pollInterval]);

  const running = clients.filter(c => c.gateway_status === 'running').length;
  const errored = clients.filter(c => c.gateway_status === 'error' || (c.gateway_status !== 'running' && c.gateway_status !== 'starting' && c.gateway_status !== 'provisioning')).length;
  const lowCredits = summary.credits_balance <= 10;

  return (
    <div className="space-y-5">

      {/* ── Live KPI Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          icon={Zap}
          label="Active Workers"
          value={`${running}/${summary.total}`}
          sub={errored > 0 ? `${errored} need attention` : 'All systems go'}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          pulse={running > 0}
          alert={errored > 0}
        />
        <KpiCard
          icon={MessageSquare}
          label="Today"
          value={summary.conversations_today}
          sub="conversations"
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />
        <KpiCard
          icon={TrendingUp}
          label="This Month"
          value={clients.reduce((s, c) => s + c.usage_this_month, 0).toLocaleString()}
          sub="conversations"
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KpiCard
          icon={Coins}
          label="Credits"
          value={summary.credits_balance}
          sub={lowCredits ? '⚠ Low — top up soon' : `${summary.credits_used} used lifetime`}
          iconBg={lowCredits ? 'bg-red-50' : 'bg-emerald-50'}
          iconColor={lowCredits ? 'text-red-600' : 'text-emerald-600'}
          alert={lowCredits}
        />
      </div>

      {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['fleet', 'activity'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'fleet' ? (
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    {running > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${running > 0 ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </span>
                  AI Workers
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  Live Feed
                  {convos.length > 0 && (
                    <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 rounded-full">{convos.length}</span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Refresh indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {polling && <RefreshCw className="h-3 w-3 animate-spin" />}
          {lastUpdated && !polling && (
            <span className="hidden sm:inline">Updated {timeAgo(lastUpdated.toISOString())}</span>
          )}
          <button onClick={fetchFleet} className="p-1 hover:text-gray-600 transition" title="Refresh now">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── Fleet Tab ────────────────────────────────────────────────────── */}
      {tab === 'fleet' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {clients.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-8 w-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No AI workers yet</p>
              <p className="text-xs text-gray-400 mt-1">Add your first client to deploy an AI worker</p>
              <Link href="/agency/clients/new" className="inline-flex items-center gap-1 mt-3 text-xs text-indigo-600 font-semibold hover:underline">
                Add AI Worker <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">AI Worker</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Today</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">This Month</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Last Active</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {clients.map(client => {
                      const isRunning = client.gateway_status === 'running';
                      const isStarting = client.gateway_status === 'starting' || client.gateway_status === 'provisioning';
                      const isDown = !isRunning && !isStarting;
                      const isSilent = isRunning && client.conversations_today === 0 && client.usage_this_month > 0;

                      return (
                        <tr key={client.id} className={`group hover:bg-indigo-50/30 transition-colors ${isDown && client.gateway_status !== null ? 'bg-red-50/20' : ''}`}>
                          <td className="px-4 py-3.5">
                            <Link href={`/agency/clients/${client.id}`} className="block">
                              <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors truncate max-w-[200px]">
                                {client.name}
                              </p>
                              {client.gateway_error && (
                                <p className="text-[10px] text-red-500 truncate max-w-[200px] mt-0.5 flex items-center gap-1">
                                  <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                                  {client.gateway_error}
                                </p>
                              )}
                            </Link>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`relative flex h-2 w-2`}>
                                {isRunning && !isSilent && (
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                                )}
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                  isRunning && !isSilent ? 'bg-green-500' :
                                  isRunning && isSilent  ? 'bg-amber-400' :
                                  isStarting             ? 'bg-blue-400' :
                                                           'bg-red-500'
                                }`} />
                              </span>
                              <span className={`text-xs font-medium ${
                                isRunning && !isSilent ? 'text-green-700' :
                                isRunning && isSilent  ? 'text-amber-600' :
                                isStarting             ? 'text-blue-600' :
                                                         'text-red-600'
                              }`}>
                                {isRunning && !isSilent ? 'Active' :
                                 isRunning && isSilent  ? 'Idle' :
                                 isStarting             ? 'Starting' :
                                                          'Down'}
                              </span>
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                            <span className={`text-sm font-bold ${client.conversations_today > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
                              {client.conversations_today}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center hidden md:table-cell">
                            <span className="text-sm text-gray-600 font-medium">
                              {client.usage_this_month.toLocaleString()}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                            <span className="text-xs text-gray-400">
                              {client.last_message_at ? timeAgo(client.last_message_at) : '—'}
                            </span>
                          </td>

                          <td className="px-2 py-3.5 text-center">
                            <Link href={`/agency/clients/${client.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Fleet footer */}
              <div className="px-4 py-2.5 bg-gray-50/80 border-t border-gray-100 flex flex-wrap items-center gap-x-5 gap-y-1">
                <span className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">{running}</span>
                  /{clients.length} online
                </span>
                <span className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">{summary.conversations_today}</span> conversations today
                </span>
                {errored > 0 && (
                  <span className="text-xs text-red-500 font-semibold">
                    ⚠ {errored} need attention
                  </span>
                )}
                <Link href="/agency/clients" className="ml-auto text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-0.5">
                  Manage all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Activity Feed Tab ─────────────────────────────────────────────── */}
      {tab === 'activity' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {convos.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="h-8 w-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Activity will appear here as your AI workers respond to customers</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-50">
                {convos.map(conv => (
                  <div key={conv.id} className="px-4 py-3.5 hover:bg-indigo-50/20 transition-colors">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <ChannelBadge channel={conv.channel} />
                      {showClientColumn && conv.client_name && (
                        <span className="text-xs font-semibold text-gray-700">{conv.client_name}</span>
                      )}
                      <span className="flex items-center gap-1 text-[10px] text-gray-400 ml-auto">
                        <Clock className="h-3 w-3" />
                        {timeAgo(conv.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-1">
                      <span className="text-gray-400 mr-1 font-mono">→</span>
                      {conv.user_message}
                    </p>
                    <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                      <span className="text-indigo-400 mr-1 font-mono">←</span>
                      {conv.ai_response}
                    </p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">Showing last {convos.length} conversations · auto-refreshes every 20s</span>
                <Link href="/agency/clients" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-0.5">
                  Full history <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Low credits inline alert ─────────────────────────────────────── */}
      {lowCredits && (
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${summary.credits_balance === 0 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
          <AlertTriangle className={`h-4 w-4 shrink-0 ${summary.credits_balance === 0 ? 'text-red-600' : 'text-amber-600'}`} />
          <p className={`text-sm flex-1 ${summary.credits_balance === 0 ? 'text-red-800' : 'text-amber-800'}`}>
            {summary.credits_balance === 0
              ? 'No credits remaining — AI workers may stop responding'
              : `Only ${summary.credits_balance} credits left`}
          </p>
          <div className="flex gap-2 shrink-0">
            <Link href="/agency/credits" className="text-xs font-semibold text-indigo-600 hover:underline">Top up</Link>
            <Link href="/agency/referrals" className="text-xs text-gray-500 hover:underline">Free credits</Link>
          </div>
        </div>
      )}
    </div>
  );
}
