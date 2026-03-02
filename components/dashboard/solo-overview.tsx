'use client';

import Link from 'next/link';
import {
  Bot,
  MessageSquare,
  Coins,
  ExternalLink,
  BookOpen,
  Palette,
  Code,
  Clock,
  Zap,
  ArrowRight,
  Sparkles,
  Globe,
  Terminal,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SoloOverviewProps {
  businessName: string;
  gatewayUrl: string | null;
  gatewayToken: string | null;
  gatewayStatus: string | null;
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
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SoloOverview({
  businessName,
  gatewayUrl,
  gatewayToken,
  gatewayStatus,
  creditsBalance,
  creditsUsed,
  conversationsToday,
  conversationsTotal,
  recentConversations,
  clientId,
  agencyId,
  hasKnowledge,
  hasPersonality,
}: SoloOverviewProps) {
  // For embed code and portal links, prefer clientId but fall back to agencyId
  const embedId = clientId ?? agencyId;
  const isOnline = gatewayStatus === 'running';
  const terminalUrl = gatewayUrl
    ? gatewayToken
      ? `${gatewayUrl}?token=${gatewayToken}`
      : gatewayUrl
    : null;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {getGreeting()}, {businessName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Your AI is working for you</p>
      </div>

      {/* ── AI Worker Status ── */}
      <div className="mb-6">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className={`flex items-center justify-between px-5 py-4 ${isOnline ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isOnline ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                  <Bot className={`h-5 w-5 ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-gray-900">Your OpenClaw AI Worker</h2>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      {isOnline ? 'Online' : gatewayStatus === 'provisioning' ? 'Starting...' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isOnline ? 'Answering customers 24/7' : 'Your AI worker is being set up'}
                  </p>
                </div>
              </div>
              {terminalUrl && (
                <a
                  href={terminalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition"
                >
                  <Terminal className="h-4 w-4" />
                  Open Terminal
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Stats Row ── */}
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
                <Zap className="h-4 w-4 text-indigo-600" />
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
                <p className="text-xl font-bold text-gray-900">{creditsBalance}</p>
                <p className="text-[11px] text-gray-400">Credits left</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-purple-50 p-2">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">24/7</p>
                <p className="text-[11px] text-gray-400">Always on</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Setup / Actions ── */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {(!hasKnowledge || !hasPersonality) ? 'Finish Setup' : 'Quick Actions'}
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Link href={embedId ? `/agency/clients/${embedId}` : '/agency/clients'}>
            <Card className={`cursor-pointer hover:border-indigo-200 transition h-full ${!hasKnowledge ? 'border-amber-200 bg-amber-50/50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${!hasKnowledge ? 'bg-amber-100' : 'bg-indigo-50'}`}>
                    <BookOpen className={`h-4 w-4 ${!hasKnowledge ? 'text-amber-600' : 'text-indigo-600'}`} />
                  </div>
                  {!hasKnowledge && <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">To do</span>}
                </div>
                <h3 className="font-semibold text-sm text-gray-900">Train from Website</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {hasKnowledge ? 'Update your AI\'s knowledge' : 'Teach your AI about your business'}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href={embedId ? `/agency/clients/${embedId}` : '/agency/clients'}>
            <Card className={`cursor-pointer hover:border-indigo-200 transition h-full ${!hasPersonality ? 'border-amber-200 bg-amber-50/50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${!hasPersonality ? 'bg-amber-100' : 'bg-purple-50'}`}>
                    <Palette className={`h-4 w-4 ${!hasPersonality ? 'text-amber-600' : 'text-purple-600'}`} />
                  </div>
                  {!hasPersonality && <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">To do</span>}
                </div>
                <h3 className="font-semibold text-sm text-gray-900">Set Personality</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {hasPersonality ? 'Adjust your AI\'s tone & style' : 'Define how your AI talks to customers'}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href={embedId ? `/portal/${embedId}` : '#'} target="_blank" rel="noopener noreferrer">
            <Card className="cursor-pointer hover:border-indigo-200 transition h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-teal-600" />
                  </div>
                </div>
                <h3 className="font-semibold text-sm text-gray-900">Preview Chat</h3>
                <p className="text-xs text-gray-500 mt-0.5">See what your customers see</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* ── Embed Code ── */}
      {embedId && (
        <div className="mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Code className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">Add Chat to Your Website</h3>
                  <p className="text-xs text-gray-500">Paste this anywhere on your site</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-600 overflow-x-auto border">
                {`<script src="https://kyra.conversionsystem.com/embed/${embedId}.js" async></script>`}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `<script src="https://kyra.conversionsystem.com/embed/${embedId}.js" async></script>`
                  );
                }}
                className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                📋 Copy to clipboard
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Explore All Features ── */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Explore Your AI Toolkit
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link href="/agency/setup">
            <Card className="cursor-pointer hover:border-indigo-200 transition h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🚀</span>
                  <h3 className="font-semibold text-sm text-gray-900">Setup Wizard</h3>
                </div>
                <p className="text-xs text-gray-500">Configure your entire AI worker in 60 seconds — personality, agents, automations, all at once.</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/agency/templates">
            <Card className="cursor-pointer hover:border-indigo-200 transition h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📋</span>
                  <h3 className="font-semibold text-sm text-gray-900">Template Store</h3>
                </div>
                <p className="text-xs text-gray-500">10 industry templates — plumber, dentist, real estate, restaurant & more. One-click apply.</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/agency/agents">
            <Card className="cursor-pointer hover:border-indigo-200 transition h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🤖</span>
                  <h3 className="font-semibold text-sm text-gray-900">AI Agents</h3>
                </div>
                <p className="text-xs text-gray-500">5 department specialists — Front Desk, Sales, Support, Collections, Reviews. Smart routing included.</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/agency/autopilot">
            <Card className="cursor-pointer hover:border-indigo-200 transition h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚡</span>
                  <h3 className="font-semibold text-sm text-gray-900">Autopilot</h3>
                </div>
                <p className="text-xs text-gray-500">Automated follow-ups, reminders, review requests & weekly reports — set it and forget it.</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/agency/crm">
            <Card className="cursor-pointer hover:border-indigo-200 transition h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📇</span>
                  <h3 className="font-semibold text-sm text-gray-900">CRM</h3>
                </div>
                <p className="text-xs text-gray-500">Contacts, companies, deals & analytics. AI auto-fills customer profiles from conversations.</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/agency/reviews">
            <Card className="cursor-pointer hover:border-indigo-200 transition h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⭐</span>
                  <h3 className="font-semibold text-sm text-gray-900">Review Generation</h3>
                </div>
                <p className="text-xs text-gray-500">Automatically send review requests after service. Happy → Google review, unhappy → escalation alert.</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/agency/channels">
            <Card className="cursor-pointer hover:border-indigo-200 transition h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📱</span>
                  <h3 className="font-semibold text-sm text-gray-900">Channels</h3>
                </div>
                <p className="text-xs text-gray-500">Connect SMS, WhatsApp, Telegram, web chat — your AI replies instantly on any channel.</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/agency/voice">
            <Card className="cursor-pointer hover:border-indigo-200 transition h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎙️</span>
                  <h3 className="font-semibold text-sm text-gray-900">Voice AI</h3>
                </div>
                <p className="text-xs text-gray-500">AI answers phone calls. Connect VAPI, Synthflow, or Retell for 24/7 voice support.</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/agency/packages">
            <Card className="cursor-pointer hover:border-indigo-200 transition h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📦</span>
                  <h3 className="font-semibold text-sm text-gray-900">Service Packages</h3>
                </div>
                <p className="text-xs text-gray-500">Pre-built bundles for plumbing, HVAC, electrical & more. One click activates everything.</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/agency/performance">
            <Card className="cursor-pointer hover:border-indigo-200 transition h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📊</span>
                  <h3 className="font-semibold text-sm text-gray-900">Performance</h3>
                </div>
                <p className="text-xs text-gray-500">Track conversations, response times, customer satisfaction & revenue influenced.</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/agency/automations">
            <Card className="cursor-pointer hover:border-indigo-200 transition h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🔄</span>
                  <h3 className="font-semibold text-sm text-gray-900">Automations</h3>
                </div>
                <p className="text-xs text-gray-500">Custom workflow triggers — AI sends follow-ups, tags contacts, creates deals automatically.</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/agency/crm/web-leads">
            <Card className="cursor-pointer hover:border-indigo-200 transition h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🌐</span>
                  <h3 className="font-semibold text-sm text-gray-900">Web Leads</h3>
                </div>
                <p className="text-xs text-gray-500">Capture leads from your website chat widget. Every conversation becomes a CRM contact.</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* ── Recent Conversations ── */}
      {recentConversations.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Conversations</h2>
            <Link href="/agency/conversations" className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <Card>
            <CardContent className="p-0 divide-y divide-gray-100">
              {recentConversations.map((conv) => (
                <div key={conv.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider">{conv.channel || 'web_chat'}</span>
                    <span className="text-[10px] text-gray-400">{timeAgo(conv.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-1">
                    <span className="font-medium text-gray-900">Customer:</span> {conv.user_message}
                  </p>
                  <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                    <span className="font-medium text-indigo-600">AI:</span> {conv.ai_response}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Empty state if no conversations ── */}
      {recentConversations.length === 0 && conversationsTotal === 0 && (
        <div className="mb-6">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="h-6 w-6 text-indigo-400" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">No conversations yet</h3>
              <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                Your AI worker is online and waiting. Share your chat link or embed it on your website to start getting conversations.
              </p>
              {embedId && (
                <Link href={`/portal/${embedId}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Try a Test Chat
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Credits Banner ── */}
      {creditsBalance <= 10 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-4">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {creditsBalance === 0 ? 'You\'re out of credits' : `Only ${creditsBalance} credits remaining`}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Top up to keep your AI worker responding to customers.
              </p>
            </div>
            <Link href="/agency/credits">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-xs">
                Get Credits
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
