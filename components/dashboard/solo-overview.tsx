'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  MessageSquare,
  Coins,
  ExternalLink,
  BookOpen,
  Palette,
  Code,
  Zap,
  ArrowRight,
  Sparkles,
  Globe,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity,
  Wifi,
  WifiOff,
  Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RouterSavingsWidget from '@/components/dashboard/router-savings-widget';
import QuickAnswersEditor from '@/components/dashboard/quick-answers-editor';

interface MissionControlClient {
  id: string;
  name: string;
  gateway_status: string | null;
  gateway_error: string | null;
  usage_this_month: number;
  todayCount: number;
  lastMessage: string | null;
}

interface SoloOverviewProps {
  businessName: string;
  gatewayUrl: string | null;
  gatewayToken: string | null;
  gatewayStatus: string | null;
  gatewayError: string | null;
  creditsBalance: number;
  creditsUsed: number;
  conversationsToday: number;
  conversationsTotal: number;
  recentConversations: {
    id: string;
    channel: string;
    user_message: string;
    ai_response: string;
    created_at: string;
  }[];
  clientId: string | null;
  agencyId: string;
  hasKnowledge: boolean;
  hasPersonality: boolean;
  clients: MissionControlClient[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

function getChannelBadgeColor(channel: string): string {
  const ch = channel?.toLowerCase() || '';
  if (ch.includes('sms') || ch.includes('ghl')) return 'bg-green-100 text-green-700';
  if (ch.includes('telegram')) return 'bg-blue-100 text-blue-700';
  if (ch.includes('whatsapp')) return 'bg-emerald-100 text-emerald-700';
  if (ch.includes('web') || ch.includes('chat')) return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-600';
}

export default function SoloOverview({
  businessName,
  gatewayUrl,
  gatewayToken,
  gatewayStatus,
  gatewayError,
  creditsBalance,
  creditsUsed,
  conversationsToday,
  conversationsTotal,
  recentConversations,
  clientId,
  agencyId,
  hasKnowledge,
  hasPersonality,
  clients,
}: SoloOverviewProps) {
  const embedId = clientId ?? agencyId;
  const isOnline = gatewayStatus === 'running';

  // Live credit tracking — poll every 15s + reconcile on mount
  const [liveBalance, setLiveBalance] = useState(creditsBalance);
  const [liveUsed, setLiveUsed] = useState(creditsUsed);

  useEffect(() => {
    // Reconcile credits on mount (catches untracked terminal usage)
    fetch('/api/agency/credits/reconcile', { method: 'POST' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.reconciled) {
          setLiveBalance(data.newBalance);
          setLiveUsed(prev => prev + data.deficit);
        }
      })
      .catch(() => {});

    // Poll for fresh balance every 15 seconds
    const poll = setInterval(() => {
      fetch('/api/agency/credits')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setLiveBalance(data.balance ?? 0);
            setLiveUsed(data.lifetimeUsed ?? 0);
            // Dispatch event for sidebar badge
            window.dispatchEvent(new Event('kyra:credit-update'));
          }
        })
        .catch(() => {});
    }, 15_000);

    return () => clearInterval(poll);
  }, []);
  const terminalUrl = gatewayUrl
    ? gatewayToken
      ? `${gatewayUrl}?token=${gatewayToken}`
      : gatewayUrl
    : null;

  // Compute setup completion
  const setupSteps = [
    { done: hasKnowledge, label: 'Train from Website', href: '/agency/knowledge', icon: BookOpen, desc: 'Teach your AI about your business' },
    { done: hasPersonality, label: 'Set Personality', href: '/agency/agents', icon: Palette, desc: 'Define how your AI talks to customers' },
    { done: isOnline, label: 'AI Worker Online', href: '#', icon: Wifi, desc: 'Your AI worker is running' },
  ];
  const setupComplete = setupSteps.filter(s => s.done).length;
  const setupTotal = setupSteps.length;
  const setupPct = Math.round((setupComplete / setupTotal) * 100);

  // Activity analysis
  const avgPerDay = conversationsTotal > 0
    ? Math.round((conversationsTotal / Math.max(new Date().getDate(), 1)) * 10) / 10
    : 0;
  const creditsRemaining = liveBalance;
  const estimatedDaysLeft = avgPerDay > 0 ? Math.floor(creditsRemaining / avgPerDay) : creditsRemaining > 0 ? 999 : 0;

  // Channel breakdown from recent conversations
  const channelCounts: Record<string, number> = {};
  recentConversations.forEach(c => {
    const ch = c.channel || 'web_chat';
    channelCounts[ch] = (channelCounts[ch] || 0) + 1;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            Mission Control
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{businessName}</p>
        </div>
        {terminalUrl && (
          <a
            href={terminalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-medium text-sm px-4 py-2 rounded-lg transition shrink-0"
          >
            <Terminal className="h-4 w-4" />
            Open Terminal
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>
        )}
      </div>

      {/* ── System Status Banner ── */}
      <Card className={`mb-6 border-l-4 ${isOnline ? 'border-l-green-500' : 'border-l-red-500'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isOnline ? 'bg-green-50' : 'bg-red-50'}`}>
                {isOnline ? <Wifi className="h-5 w-5 text-green-600" /> : <WifiOff className="h-5 w-5 text-red-600" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className={`text-sm font-semibold ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
                    {isOnline ? 'All Systems Online' : gatewayStatus === 'provisioning' ? 'Starting Up...' : 'AI Worker Offline'}
                  </span>
                </div>
                {gatewayError && (
                  <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {gatewayError}
                  </p>
                )}
                {isOnline && !gatewayError && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Responding to customers on all connected channels
                  </p>
                )}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">{setupPct}%</p>
                <p className="text-[10px] text-gray-400 uppercase">Setup</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-blue-50 p-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{conversationsToday}</p>
                <p className="text-[11px] text-gray-400">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-indigo-50 p-2">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{conversationsTotal}</p>
                <p className="text-[11px] text-gray-400">This month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-emerald-50 p-2">
                <Coins className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{liveBalance}</p>
                <p className="text-[11px] text-gray-400">Credits left</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-purple-50 p-2">
                <Zap className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{liveUsed}</p>
                <p className="text-[11px] text-gray-400">Credits used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Mission Control Fleet Table ── */}
      {clients.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            AI Workers
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Today</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Month</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Last Activity</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clients.map((client) => {
                    const isRunning = client.gateway_status === 'running';
                    const isError = client.gateway_status === 'error' || client.gateway_status === null;
                    const isPaused = client.gateway_status === 'starting' || client.gateway_status === 'provisioning';
                    const hasError = client.gateway_error;
                    const isSilent = isRunning && client.todayCount === 0 && client.usage_this_month > 0;

                    return (
                      <tr key={client.id} className={`hover:bg-gray-50/80 transition ${isError ? 'bg-red-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{client.name}</p>
                          {hasError && (
                            <p className="text-[10px] text-red-500 truncate max-w-[200px] mt-0.5">⚠ {client.gateway_error}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${
                              isRunning ? 'bg-green-500' : isPaused ? 'bg-amber-400 animate-pulse' : 'bg-red-500'
                            }`} />
                            <span className={`text-xs font-medium ${
                              isRunning ? 'text-green-700' : isPaused ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {isRunning ? (isSilent ? 'Idle' : 'Active') : isPaused ? 'Starting' : 'Down'}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <span className={`text-sm font-semibold ${client.todayCount > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
                            {client.todayCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          <span className="text-sm text-gray-600">{client.usage_this_month.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          <span className="text-xs text-gray-400">{client.lastMessage ? timeAgo(client.lastMessage) : '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {hasError ? <span title="Error">⚠️</span> : isSilent ? <span title="Idle">🕐</span> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 bg-gray-50/50 border-t border-gray-100 text-[11px] text-gray-400">
              {clients.filter(c => c.gateway_status === 'running').length}/{clients.length} online
              {' · '}{clients.reduce((sum, c) => sum + c.todayCount, 0)} conversations today
              {clients.some(c => c.gateway_error) && (
                <span className="text-red-400"> · {clients.filter(c => c.gateway_error).length} need attention</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Single worker fallback (no clients yet) ── */}
      {clients.length === 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            </span>
            AI Worker
          </h2>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className={`h-5 w-5 ${isOnline ? 'text-green-600' : 'text-red-500'}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{businessName}</p>
                    <p className="text-xs text-gray-500">
                      {isOnline ? 'Active — answering customers' : 'Offline'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-center">
                  <div className="hidden sm:block">
                    <p className={`text-lg font-bold ${conversationsToday > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>{conversationsToday}</p>
                    <p className="text-[10px] text-gray-400">Today</p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-lg font-bold text-gray-600">{conversationsTotal}</p>
                    <p className="text-[10px] text-gray-400">Month</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Activity Insights ── */}
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {/* Usage projection */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Usage Forecast</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Avg conversations/day</span>
                <span className="font-medium text-gray-900">{avgPerDay}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Credits remaining</span>
                <span className={`font-medium ${creditsRemaining <= 10 ? 'text-red-600' : 'text-gray-900'}`}>{creditsRemaining}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Est. days until empty</span>
                <span className={`font-medium ${estimatedDaysLeft <= 7 ? 'text-amber-600' : estimatedDaysLeft > 100 ? 'text-green-600' : 'text-gray-900'}`}>
                  {estimatedDaysLeft > 100 ? '30+' : estimatedDaysLeft}
                </span>
              </div>
              {/* Usage bar */}
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>{liveUsed} used</span>
                  <span>{liveUsed + liveBalance} total</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      liveBalance <= 10 ? 'bg-red-500' : liveBalance <= 30 ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, (liveUsed / Math.max(liveUsed + liveBalance, 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Channel breakdown */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Channel Activity</h3>
            {Object.keys(channelCounts).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(channelCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([channel, count]) => (
                    <div key={channel} className="flex items-center justify-between">
                      <span className={`text-[11px] font-medium uppercase px-2 py-0.5 rounded ${getChannelBadgeColor(channel)}`}>
                        {channel.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">{count}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400">No channel activity yet</p>
                <Link href="/agency/channels" className="text-xs text-indigo-500 hover:underline mt-1 inline-block">
                  Connect a channel →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Setup Progress removed — not useful per product feedback */}

      {/* ── AI Cost Savings ── */}
      <div className="mb-6">
        <RouterSavingsWidget />
      </div>

      {/* ── Live Activity Feed ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Live Activity</h2>
          <Link href="/agency/conversations" className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
            All conversations <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentConversations.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-50">
            {recentConversations.map((conv) => (
              <div key={conv.id} className="px-4 py-3 hover:bg-gray-50/50 transition">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${getChannelBadgeColor(conv.channel)}`}>
                      {(conv.channel || 'web_chat').replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-gray-400">{timeAgo(conv.created_at)}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-800 line-clamp-1">
                  <span className="font-medium text-gray-900">→</span> {conv.user_message}
                </p>
                <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                  <span className="font-medium text-indigo-600">←</span> {conv.ai_response}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">No activity yet</h3>
              <p className="text-xs text-gray-500 mb-3 max-w-sm mx-auto">
                Your AI worker is online and waiting for conversations. Connect a channel or embed the chat widget on your website.
              </p>
              <div className="flex justify-center gap-2">
                <Link href="/agency/channels">
                  <Button size="sm" variant="outline" className="text-xs gap-1">
                    <MessageSquare className="h-3 w-3" /> Connect Channel
                  </Button>
                </Link>
                {clientId && (
                  <Link href={`/portal/${clientId}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="text-xs gap-1">
                      <Eye className="h-3 w-3" /> Test Chat
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Quick Answers — free template injection ── */}
      {clientId && (
        <div className="mb-6">
          <QuickAnswersEditor clientId={clientId} />
        </div>
      )}

      {/* ── Embed Code ── */}
      {clientId && (
        <div className="mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Code className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">Chat Widget Embed</h3>
                  <p className="text-xs text-gray-500">Add to your website — customers can chat with your AI instantly</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-600 overflow-x-auto border">
                {`<script src="https://kyra.conversionsystem.com/embed/${clientId}.js" async></script>`}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => navigator.clipboard.writeText(`<script src="https://kyra.conversionsystem.com/embed/${clientId}.js" async></script>`)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  📋 Copy code
                </button>
                <Link href={`/portal/${clientId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-gray-700">
                  Preview chat →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Quick Links ── */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { href: '/agency/crm/contacts', icon: '📇', label: 'Contacts' },
            { href: '/agency/channels', icon: '📱', label: 'Channels' },
            { href: '/agency/autopilot', icon: '⚡', label: 'Autopilot' },
            { href: '/agency/agents', icon: '🤖', label: 'AI Agents' },
            { href: '/agency/performance', icon: '📊', label: 'Performance' },
            { href: '/agency/credits', icon: '💳', label: 'Credits' },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm transition cursor-pointer text-sm">
                <span>{item.icon}</span>
                <span className="font-medium text-gray-700">{item.label}</span>
                <ArrowRight className="h-3 w-3 text-gray-300 ml-auto" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Credits Warning ── */}
      {liveBalance <= 10 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {liveBalance === 0 ? 'Out of credits — AI worker paused' : `Only ${liveBalance} credits remaining`}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Top up to keep your AI worker responding.
              </p>
            </div>
            <Link href="/agency/credits">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-xs shrink-0">Get Credits</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
