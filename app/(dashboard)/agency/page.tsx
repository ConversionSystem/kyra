export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users, Zap, MessageSquare, AlertTriangle, Plus, Target, DollarSign,
  BarChart3, ClipboardList, ArrowRight, Rocket, Globe, Send, Smartphone,
  Clock,
} from 'lucide-react';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
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

const CHANNEL_META: Record<string, { label: string; icon: typeof MessageSquare; color: string }> = {
  test_chat: { label: 'Test Chat', icon: MessageSquare, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  portal:    { label: 'Portal',    icon: Globe,         color: 'bg-purple-50 text-purple-600 border-purple-200' },
  telegram:  { label: 'Telegram',  icon: Send,          color: 'bg-sky-50 text-sky-600 border-sky-200' },
  sms:       { label: 'SMS',       icon: Smartphone,    color: 'bg-green-50 text-green-600 border-green-200' },
  ghl_sms:   { label: 'GHL SMS',   icon: Smartphone,    color: 'bg-green-50 text-green-600 border-green-200' },
  ghl_email: { label: 'GHL Email', icon: MessageSquare, color: 'bg-orange-50 text-orange-600 border-orange-200' },
  whatsapp:  { label: 'WhatsApp',  icon: Smartphone,    color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
};

export default async function AgencyOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const { agency } = result;
  const clients = await getAgencyClients(agency.id);

  // Stats
  const totalCount = clients.length;
  const activeNow = clients.filter((c) => c.gateway_status === 'running').length;
  const totalUsage = clients.reduce((sum, c) => sum + c.usage_this_month, 0);
  const needAttention = clients.filter(
    (c) => c.gateway_status === 'running' && c.usage_this_month === 0,
  ).length;

  // Recent activity + today stats — try fetching from client_conversations
  let recentConversations: {
    id: string;
    client_id: string;
    client_name: string;
    channel: string;
    user_message: string;
    ai_response: string;
    created_at: string;
  }[] = [];
  let conversationsAvailable = true;
  let conversationsToday = 0;
  let escalationsToday = 0;
  let proactiveGreetingsToday = 0;

  try {
    const { data: membership } = await supabase
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();

    if (membership) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Today's summary
      const { data: todayConvos } = await supabase
        .from('client_conversations')
        .select('id, ai_response, user_message')
        .eq('agency_id', membership.agency_id)
        .gte('created_at', todayStart.toISOString());

      conversationsToday = todayConvos?.length ?? 0;
      escalationsToday = (todayConvos ?? []).filter(
        (c) => c.ai_response?.includes("I'll flag this for our team") || c.user_message?.includes('[Kyra AI 🚨')
      ).length;
      proactiveGreetingsToday = (todayConvos ?? []).filter(
        (c) => c.user_message?.includes('[NEW CONTACT]')
      ).length;

      // Recent 5 for activity feed
      const { data: convos, error } = await supabase
        .from('client_conversations')
        .select('id, client_id, channel, user_message, ai_response, created_at')
        .eq('agency_id', membership.agency_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        conversationsAvailable = false;
      } else {
        const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
        recentConversations = (convos ?? []).map((conv) => ({
          ...conv,
          client_name: clientMap[conv.client_id] || 'Unknown',
        }));
      }
    }
  } catch {
    conversationsAvailable = false;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl">

      {/* ── Header Row ── */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {getGreeting()}, {agency.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Agency Command Center</p>
        </div>
        <Link href="/agency/clients/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Client</span>
          </Button>
        </Link>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {/* AI Employees */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-2">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                <p className="text-xs text-gray-400">AI Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Now */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2 relative">
                <Zap className="h-5 w-5 text-green-600" />
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeNow}</p>
                <p className="text-xs text-gray-400">Active Now</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This Month */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalUsage.toLocaleString()}</p>
                <p className="text-xs text-gray-400">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Need Attention */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{needAttention}</p>
                <p className="text-xs text-gray-400">Silent Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Today at a Glance ── */}
      {conversationsAvailable && conversationsToday > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Today</h2>
            <a href="/agency/conversations" className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-indigo-50 rounded-xl p-4 flex items-center gap-3">
              <div className="text-2xl">💬</div>
              <div>
                <p className="text-2xl font-bold text-indigo-700">{conversationsToday}</p>
                <p className="text-xs text-indigo-500 font-medium">Conversations today</p>
              </div>
            </div>
            <div className={`rounded-xl p-4 flex items-center gap-3 ${proactiveGreetingsToday > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
              <div className="text-2xl">👋</div>
              <div>
                <p className={`text-2xl font-bold ${proactiveGreetingsToday > 0 ? 'text-green-700' : 'text-gray-400'}`}>{proactiveGreetingsToday}</p>
                <p className={`text-xs font-medium ${proactiveGreetingsToday > 0 ? 'text-green-500' : 'text-gray-400'}`}>Leads greeted first</p>
              </div>
            </div>
            <div className={`rounded-xl p-4 flex items-center gap-3 ${escalationsToday > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
              <div className="text-2xl">{escalationsToday > 0 ? '🚨' : '✅'}</div>
              <div>
                <p className={`text-2xl font-bold ${escalationsToday > 0 ? 'text-red-700' : 'text-gray-400'}`}>{escalationsToday}</p>
                <p className={`text-xs font-medium ${escalationsToday > 0 ? 'text-red-500' : 'text-gray-400'}`}>{escalationsToday > 0 ? 'Need human follow-up' : 'No escalations'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Heartbeat Strip ── */}
      {clients.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Heartbeat
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {clients.map((client) => {
              const isRunning = client.gateway_status === 'running';
              const isError = client.gateway_status === 'error' || client.gateway_status === null;
              const isPaused = client.gateway_status === 'starting' || client.gateway_status === 'provisioning';
              const isSilent = isRunning && client.usage_this_month === 0;
              const northStar = (client.settings as Record<string, unknown>)?.north_star as string | undefined;

              let borderColor = 'border-gray-200';
              if (isSilent) borderColor = 'border-l-amber-400 border-t-gray-200 border-r-gray-200 border-b-gray-200';
              else if (isRunning) borderColor = 'border-l-green-400 border-t-gray-200 border-r-gray-200 border-b-gray-200';

              return (
                <Link
                  key={client.id}
                  href={`/agency/clients/${client.id}`}
                  className={`block rounded-xl border ${borderColor} border-l-[3px] bg-white p-4 hover:shadow-md hover:-translate-y-0.5 transition-all`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900 truncate pr-2">
                      {client.name}
                    </p>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isRunning ? 'bg-green-400' :
                          isPaused ? 'bg-yellow-400' :
                          'bg-red-400'
                        }`}
                      />
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{client.usage_this_month.toLocaleString()} conversations</span>
                  </div>
                  <p className={`text-xs mt-1.5 truncate ${
                    northStar ? 'text-gray-400' : 'text-gray-300 italic'
                  }`}>
                    {northStar ? northStar.slice(0, 40) : 'No goal set'}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Two-Column Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Left: Recent Activity (60%) */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <Link
                href="/agency/conversations"
                className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
              >
                View all →
              </Link>
            </CardHeader>
            <CardContent>
              {!conversationsAvailable ? (
                <div className="py-6 text-center space-y-3">
                  <p className="text-sm text-gray-500">
                    Conversation history coming soon. Run the SQL migration to enable full activity tracking.
                  </p>
                  <code className="block text-xs bg-gray-50 text-gray-600 rounded-lg p-3 font-mono">
                    supabase/migrations/20260221001_client_conversations.sql
                  </code>
                </div>
              ) : recentConversations.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-gray-400">No conversations yet. Test chat with a client to see activity here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentConversations.map((conv) => {
                    const ch = CHANNEL_META[conv.channel] || {
                      label: conv.channel,
                      icon: MessageSquare,
                      color: 'bg-gray-50 text-gray-500 border-gray-200',
                    };
                    const ChIcon = ch.icon;
                    const isEscalated = conv.ai_response?.includes("I'll flag this for our team");
                    const isProactive = conv.user_message?.includes('[NEW CONTACT]');
                    return (
                      <div
                        key={conv.id}
                        className={`flex items-start gap-3 rounded-lg border p-3 ${isEscalated ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}
                      >
                        <div className={`mt-0.5 shrink-0 rounded-md p-1 border ${ch.color}`}>
                          <ChIcon className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-700">
                              {conv.client_name}
                            </span>
                            {isEscalated && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">🚨 Escalated</span>}
                            {isProactive && !isEscalated && <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-medium">👋 Greeted</span>}
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {timeAgo(conv.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                            {conv.user_message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Quick Actions (40%) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  {
                    icon: Target,
                    label: 'Set North Star Goals',
                    subtitle: 'Define what each AI works toward',
                    href: '/agency/heartbeat',
                    color: 'text-indigo-600 bg-indigo-50',
                  },
                  {
                    icon: DollarSign,
                    label: 'Manage Budgets',
                    subtitle: 'Set limits and model preferences',
                    href: '/agency/budget',
                    color: 'text-green-600 bg-green-50',
                  },
                  {
                    icon: BarChart3,
                    label: 'View Performance',
                    subtitle: 'Weekly stats and ROI scores',
                    href: '/agency/performance',
                    color: 'text-blue-600 bg-blue-50',
                  },
                  {
                    icon: Plus,
                    label: 'Add New Client',
                    subtitle: 'Deploy a new AI employee',
                    href: '/agency/clients/new',
                    color: 'text-purple-600 bg-purple-50',
                  },
                  {
                    icon: ClipboardList,
                    label: 'GHL Listing Draft',
                    subtitle: 'Submit to GHL Marketplace',
                    href: '/agency/ghl-listing',
                    color: 'text-amber-600 bg-amber-50',
                  },
                ].map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 hover:shadow-sm transition-all group"
                  >
                    <div className={`rounded-lg p-2 ${action.color}`}>
                      <action.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{action.label}</p>
                      <p className="text-xs text-gray-400">{action.subtitle}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Welcome Banner (empty state) ── */}
      {clients.length === 0 && (
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-8 text-center">
          <div className="mx-auto rounded-xl bg-indigo-600 p-3 w-fit mb-4">
            <Rocket className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Welcome to Kyra!
          </h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Create your first AI employee to get started. You&apos;ll have a live assistant running in minutes.
          </p>
          <Link href="/agency/clients/new">
            <Button className="gap-2">
              Create AI Employee
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
