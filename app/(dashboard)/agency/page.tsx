export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';
import { getAgencyCredits } from '@/lib/billing/credit-engine';
import { WELCOME_CREDITS } from '@/lib/billing/credits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users, Zap, MessageSquare, AlertTriangle, Plus, Target, DollarSign,
  BarChart3, ClipboardList, ArrowRight, Rocket, Globe, Send, Smartphone,
  Clock, Activity,
} from 'lucide-react';
import CeoActionBoard from '@/components/dashboard/ceo-action-board';
import AgencyAnalyticsStrip from '@/components/dashboard/agency-analytics-strip';
import WhatsNewBanner from '@/components/dashboard/whats-new-banner';
import AgencyChecklist from '@/components/dashboard/agency-checklist';
import ClientSparkline from '@/components/dashboard/client-sparkline';
// SalesLeadWidget removed — was hardcoded dummy data
import RevenueUnlockCard from '@/components/dashboard/revenue-unlock-card';
import TrialCountdownBanner from '@/components/dashboard/trial-countdown-banner';
import ReferralShareWidget from '@/components/dashboard/referral-share-widget';
import { ReferralNudge } from '@/components/dashboard/referral-nudge';
import { UltronSummaryCard } from '@/components/dashboard/ultron-summary-card';
import RoiSummaryCard from '@/components/dashboard/roi-summary-card';
import SoloOverview from '@/components/dashboard/solo-overview';
import { LaunchProgress } from '@/components/onboarding/launch-progress';
import { FleetStatusBar } from '@/components/dashboard/fleet-status-bar';
import RouterSavingsWidget from '@/components/dashboard/router-savings-widget';
import { StartTourButton } from '@/components/onboarding/guided-tour';

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
  const [clients, agencyCredits, referralData] = await Promise.all([
    getAgencyClients(agency.id),
    getAgencyCredits(agency.id).catch(() => ({ balance: 0, lifetimePurchased: 0, lifetimeUsed: 0 })),
    supabase
      .from('agency_referrals')
      .select('id')
      .eq('referrer_id', agency.id)
      .neq('status', 'pending')
      .then(r => ({ count: r.data?.length ?? 0 })),
  ]);
  const isAdmin = ['hello@conversionsystem.com', 'angel@conversionsystem.com'].includes(user.email ?? '');
  const agencySettings = (agency.settings as Record<string, unknown>) ?? {};
  const isSolo = agencySettings.account_type === 'solo';

  // ── Solo Dashboard ── render a completely different overview for solo users
  if (isSolo) {
    // For solo: the agency gateway IS the user's AI worker
    // Try clients array first, then solo_client_id from settings
    let soloClient = clients[0] ?? null;
    if (!soloClient && agencySettings.solo_client_id) {
      const { data: fetchedClient } = await supabase
        .from('agency_clients')
        .select('*, template:agency_templates(*)')
        .eq('id', agencySettings.solo_client_id as string)
        .single();
      if (fetchedClient) soloClient = fetchedClient as typeof clients[0];
    }

    // Fetch the agency's own gateway info (this is the solo user's container)
    const { data: agencyGw } = await supabase
      .from('agencies')
      .select('gateway_url, gateway_token, gateway_status')
      .eq('id', agency.id)
      .single();

    // Use agency gateway first, fall back to client gateway
    const gwUrl = agencyGw?.gateway_url ?? soloClient?.gateway_url ?? null;
    const gwToken = agencyGw?.gateway_token ?? soloClient?.gateway_token ?? null;
    const gwStatus = agencyGw?.gateway_status ?? soloClient?.gateway_status ?? null;
    
    // Fetch recent conversations for solo
    let soloConversations: { id: string; channel: string; user_message: string; ai_response: string; created_at: string }[] = [];
    let soloConvosToday = 0;
    let soloConvosTotal = 0;
    const soloPerClientToday: Record<string, number> = {};
    const soloPerClientLastMsg: Record<string, string> = {};
    
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayConvos } = await supabase
        .from('client_conversations')
        .select('id, client_id, created_at')
        .eq('agency_id', agency.id)
        .gte('created_at', todayStart.toISOString());
      soloConvosToday = todayConvos?.length ?? 0;

      // Per-client today counts
      (todayConvos ?? []).forEach(c => {
        if (c.client_id) soloPerClientToday[c.client_id] = (soloPerClientToday[c.client_id] || 0) + 1;
      });
      
      const { data: monthConvos } = await supabase
        .from('client_conversations')
        .select('id')
        .eq('agency_id', agency.id)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
      soloConvosTotal = monthConvos?.length ?? 0;

      const { data: recentConvos } = await supabase
        .from('client_conversations')
        .select('id, channel, user_message, ai_response, created_at, client_id')
        .eq('agency_id', agency.id)
        .order('created_at', { ascending: false })
        .limit(5);
      soloConversations = (recentConvos ?? []) as typeof soloConversations;

      // Per-client last message
      const { data: lastMsgs } = await supabase
        .from('client_conversations')
        .select('client_id, created_at')
        .eq('agency_id', agency.id)
        .order('created_at', { ascending: false })
        .limit(50);
      (lastMsgs ?? []).forEach(m => {
        if (m.client_id && !soloPerClientLastMsg[m.client_id]) {
          soloPerClientLastMsg[m.client_id] = m.created_at;
        }
      });
    } catch {
      // conversations table may not exist yet — graceful fallback
    }

    const soloConfig = (soloClient?.container_config as Record<string, unknown>) ?? {};

    // Gather all clients for Mission Control (solo may have 1+ clients via API)
    const soloClients = clients.length > 0 ? clients : soloClient ? [soloClient] : [];

    return (
      <SoloOverview
        businessName={agency.name}
        gatewayUrl={gwUrl}
        gatewayToken={gwToken}
        gatewayStatus={gwStatus}
        gatewayError={(agencyGw as Record<string, unknown> | null)?.gateway_error as string | null ?? null}
        creditsBalance={agencyCredits.balance}
        creditsUsed={agencyCredits.lifetimeUsed}
        conversationsToday={soloConvosToday}
        conversationsTotal={soloConvosTotal}
        recentConversations={soloConversations}
        clientId={soloClient?.id ?? null}
        agencyId={agency.id}
        hasKnowledge={!!(soloConfig.knowledge_trained || soloConfig.website_url)}
        hasPersonality={!!(soloConfig.persona || soloConfig.instructions)}
        clients={soloClients.map(c => ({
          id: c.id,
          name: c.name,
          gateway_status: c.gateway_status,
          gateway_error: c.gateway_error ?? null,
          usage_this_month: c.usage_this_month ?? 0,
          todayCount: soloPerClientToday[c.id] || 0,
          lastMessage: soloPerClientLastMsg[c.id] || null,
        }))}
      />
    );
  }

  // salesPipelineState removed — SalesLeadWidget was hardcoded dummy data
  // Show trial credits banner when: still on welcome credits, haven't purchased yet
  const showTrialCreditsBanner = agencyCredits.lifetimePurchased === 0 && agencyCredits.balance > 0;

  // Stats
  const totalCount = clients.length;
  const activeNow = clients.filter((c) => c.gateway_status === 'running').length;
  const totalUsage = clients.reduce((sum, c) => sum + c.usage_this_month, 0);
  const needAttention = clients.filter(
    (c) => c.gateway_status === 'running' && c.usage_this_month === 0,
  ).length;

  // Checklist props
  const checklistProps = {
    hasClients: clients.length > 0,
    hasRunningClient: clients.some((c) => c.gateway_status === 'running'),
    hasGhlConnected: clients.some((c) => !!(c.ghl_private_token || c.ghl_access_token)),
    hasPersonalitySet: clients.some((c) => {
      const cfg = (c.container_config as Record<string, unknown>) ?? {};
      return !!(cfg.persona || cfg.instructions);
    }),
    hasConversations: totalUsage > 0,
    hasBilling: !!(agency.stripe_customer_id) || agency.plan !== 'free',
  };

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

      // Per-client today counts + last message time
      const { data: todayPerClient } = await supabase
        .from('client_conversations')
        .select('client_id, created_at')
        .eq('agency_id', membership.agency_id)
        .gte('created_at', todayStart.toISOString());

      const perClientToday: Record<string, number> = {};
      (todayPerClient ?? []).forEach(c => {
        perClientToday[c.client_id] = (perClientToday[c.client_id] || 0) + 1;
      });

      // Last message per client
      const { data: lastMessages } = await supabase
        .from('client_conversations')
        .select('client_id, created_at')
        .eq('agency_id', membership.agency_id)
        .order('created_at', { ascending: false })
        .limit(200);

      const perClientLastMsg: Record<string, string> = {};
      (lastMessages ?? []).forEach(m => {
        if (!perClientLastMsg[m.client_id]) {
          perClientLastMsg[m.client_id] = m.created_at;
        }
      });

      // Attach to clients
      clients.forEach(c => {
        (c as unknown as Record<string, unknown>)._todayCount = perClientToday[c.id] || 0;
        (c as unknown as Record<string, unknown>)._lastMessage = perClientLastMsg[c.id] || null;
      });

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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            Mission Control
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500">{agency.name}</p>
            <StartTourButton />
          </div>
        </div>
        <Link href="/agency/clients/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Client</span>
          </Button>
        </Link>
      </div>

      {/* ── What's New Banner (platform admin only) ── */}
      {isAdmin && <WhatsNewBanner />}

      {/* ── Trial Countdown Banner ── */}
      <TrialCountdownBanner
        createdAt={agency.created_at ?? new Date().toISOString()}
        plan={agency.plan || 'free'}
        clientCount={totalCount}
        totalConversations={totalUsage}
      />

      {/* ── Trial Credits Banner ── */}
      {showTrialCreditsBanner && (
        <div className="flex items-center gap-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3.5">
          <span className="text-2xl shrink-0">🪙</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-900">
              You have {agencyCredits.balance} free credits in your account — ${(agencyCredits.balance * 0.01).toFixed(0)} worth
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Enough for ~{agencyCredits.balance} AI conversations to test Kyra.
              Top up or add your own API key when ready to scale.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/agency/credits">
              <Button size="sm" variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-100 text-xs h-8 px-3">
                Top up
              </Button>
            </Link>
            <Link href="/agency/api-keys">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs h-8 px-3">
                Add API Key
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Launch Progress ── */}
      <div className="mb-6">
        <LaunchProgress
          completedSteps={[
            'signup_complete', // always true — they're logged in
            ...(agencySettings.setup_complete || agencySettings.onboarding_completed ? ['setup_complete'] : []),
            ...(clients.some(c => c.gateway_status === 'running') || (agencySettings as Record<string, unknown>).channels_connected ? ['channels_connected'] : []),
            ...(agencySettings.autopilot_configured || agencySettings.autopilot_enabled ? ['autopilot_configured'] : []),
            ...(clients.length > 0 ? ['first_client_added'] : []),
          ]}
          compact
        />
      </div>

      {/* Fleet Status bar removed — replaced by Mission Control table below */}

      {/* ── Setup Checklist ── */}
      <AgencyChecklist {...checklistProps} />

      {/* ── ROI Summary Card — shows once conversations have started ── */}
      {totalUsage > 0 && (
        <div className="mb-6">
          <RoiSummaryCard
            totalConversations={totalUsage}
            plan={agency.plan || 'free'}
          />
        </div>
      )}

      {/* ── Revenue Unlock Card (non-scale plans only) ── */}
      {agency.plan !== 'scale' && (
        <div className="mb-6">
          <RevenueUnlockCard plan={agency.plan || 'free'} clientCount={totalCount} />
        </div>
      )}

      {/* ── Referral Nudges (early bird + low credits) ── */}
      <ReferralNudge
        balance={agencyCredits.balance}
        agencyCreatedAt={agency.created_at ?? new Date().toISOString()}
        referralUrl={agency.settings?.invite_code
          ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://kyra.conversionsystem.com'}/invite/${agency.settings.invite_code}`
          : undefined}
      />

      {/* ── Referral Share Widget ── */}
      <div className="mb-6">
        <ReferralShareWidget
          agencyId={agency.id}
          referralCount={referralData.count}
          creditsEarned={referralData.count * 100}
        />
      </div>

      {/* ── CEO Action Board (admin only) ── */}
      {isAdmin && (
        <div className="mb-6">
          <CeoActionBoard />
        </div>
      )}

      {/* Sales Lead Widget removed — was hardcoded dummy data */}

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
        {/* AI Workers */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-2">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                <p className="text-xs text-gray-400">AI Workers</p>
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

      {/* ── Ultron: Agency Ops Brief ── */}
      <UltronSummaryCard />

      {/* ── Public profile sharelink ── */}
      <div className="mb-6 flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
        <span className="text-sm text-indigo-700 flex-1">
          🌐 Your public agency profile:{' '}
          <span className="font-mono text-xs text-indigo-600">
            kyra.conversionsystem.com/a/{agency.id}
          </span>
        </span>
        <Link href={`/a/${agency.id}`} target="_blank" rel="noopener noreferrer"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap flex items-center gap-1 shrink-0">
          View →
        </Link>
      </div>

      {/* ── Agency Analytics Strip ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">AI Workforce · This Week</h2>
          <a href="/agency/conversations" className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
            View conversations <ArrowRight className="h-3 w-3" />
          </a>
        </div>
        <AgencyAnalyticsStrip />
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* ── Mission Control — Fleet View ── */}
      {clients.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              Mission Control
            </h2>
            <Link href="/agency/usage" className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
              Token Details <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Fleet Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Worker</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Today</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">This Month</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Last Message</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clients.map((client) => {
                    const isRunning = client.gateway_status === 'running';
                    const isError = client.gateway_status === 'error' || client.gateway_status === null;
                    const isPaused = client.gateway_status === 'starting' || client.gateway_status === 'provisioning';
                    const todayCount = ((client as unknown as Record<string, unknown>)._todayCount as number) || 0;
                    const lastMsg = (client as unknown as Record<string, unknown>)._lastMessage as string | null;
                    const hasError = client.gateway_error;
                    const isSilent = isRunning && todayCount === 0 && client.usage_this_month > 0;

                    return (
                      <tr key={client.id} className={`hover:bg-gray-50/80 transition ${isError ? 'bg-red-50/30' : ''}`}>
                        {/* Name */}
                        <td className="px-4 py-3">
                          <Link href={`/agency/clients/${client.id}`} className="group">
                            <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition truncate max-w-[180px]">
                              {client.name}
                            </p>
                            {hasError && (
                              <p className="text-[10px] text-red-500 truncate max-w-[180px] mt-0.5">
                                ⚠ {client.gateway_error}
                              </p>
                            )}
                          </Link>
                        </td>

                        {/* Status light */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${
                              isRunning ? 'bg-green-500' :
                              isPaused ? 'bg-amber-400 animate-pulse' :
                              'bg-red-500'
                            }`} />
                            <span className={`text-xs font-medium ${
                              isRunning ? 'text-green-700' :
                              isPaused ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {isRunning ? (isSilent ? 'Idle' : 'Active') :
                               isPaused ? 'Starting' :
                               'Down'}
                            </span>
                          </span>
                        </td>

                        {/* Today count */}
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <span className={`text-sm font-semibold ${todayCount > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
                            {todayCount}
                          </span>
                        </td>

                        {/* Month count */}
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          <span className="text-sm text-gray-600">
                            {client.usage_this_month.toLocaleString()}
                          </span>
                        </td>

                        {/* Last message */}
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          <span className="text-xs text-gray-400">
                            {lastMsg ? timeAgo(lastMsg) : '—'}
                          </span>
                        </td>

                        {/* Alert indicator */}
                        <td className="px-4 py-3 text-center">
                          {isError ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : isSilent ? (
                            <Clock className="h-3.5 w-3.5 text-amber-400" />
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Fleet Summary Footer */}
            <div className="px-4 py-2.5 bg-gray-50/80 border-t border-gray-100 flex flex-wrap items-center gap-x-5 gap-y-1">
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">{clients.filter(c => c.gateway_status === 'running').length}</span>/{clients.length} online
              </span>
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">{conversationsToday}</span> conversations today
              </span>
              {clients.some(c => c.gateway_status === 'error' || c.gateway_status === null) && (
                <span className="text-xs text-red-500 font-medium">
                  ⚠ {clients.filter(c => c.gateway_status === 'error' || c.gateway_status === null).length} need attention
                </span>
              )}
            </div>
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
                    subtitle: 'Deploy a new AI worker',
                    href: '/agency/clients/new',
                    color: 'text-purple-600 bg-purple-50',
                  },
                  ...(isAdmin ? [{
                    icon: ClipboardList,
                    label: 'GHL Listing Draft',
                    subtitle: 'Submit to GHL Marketplace',
                    href: '/agency/ghl-listing',
                    color: 'text-amber-600 bg-amber-50',
                  }] : []),
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

      {/* ── Onboarding Wizard (empty state) ── */}
      {clients.length === 0 && (() => {
        const ghlConnected = clients.some(c => c.ghl_private_token) || !!agency.ghl_agency_id;
        const hasClient = clients.length > 0;
        const isLive = clients.some(c => c.gateway_status === 'running');

        const steps = [
          {
            n: 1,
            title: 'Connect GoHighLevel',
            desc: 'Link your GHL account so Kyra can respond to your clients\u2019 SMS messages.',
            done: ghlConnected,
            href: '/agency/ghl-setup',
            cta: 'Connect GHL \u2192',
          },
          {
            n: 2,
            title: 'Add your first client',
            desc: 'Pick an industry template. The AI personality is already written \u2014 just set the business name.',
            done: hasClient,
            href: '/agency/clients/new',
            cta: 'Add Client \u2192',
          },
          {
            n: 3,
            title: 'Watch your AI go live',
            desc: 'Your AI worker starts responding to GHL SMS within 60 seconds.',
            done: isLive,
            href: '/agency/conversations',
            cta: 'View Conversations \u2192',
          },
        ];
        const currentStep = steps.find(s => !s.done) ?? steps[steps.length - 1];

        return (
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-indigo-100 flex items-center gap-3">
              <div className="rounded-xl bg-indigo-600 p-2.5">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Deploy your first AI worker</h2>
                <p className="text-xs text-gray-500 mt-0.5">Connect a GHL sub-account, pick a template, and your OpenClaw-powered AI worker is live in under 5 minutes.</p>
              </div>
            </div>

            {/* Steps */}
            <div className="divide-y divide-indigo-50">
              {steps.map((step) => (
                <div key={step.n} className={`flex items-start gap-4 p-5 ${step.done ? 'opacity-60' : ''}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${
                    step.done
                      ? 'bg-green-100 text-green-600'
                      : step.n === currentStep.n
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-400'
                  }`}>
                    {step.done ? '✓' : step.n}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${step.done ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {step.title}
                    </p>
                    {!step.done && (
                      <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                    )}
                  </div>
                  {!step.done && step.n === currentStep.n && (
                    <Link href={step.href}>
                      <Button size="sm" className="shrink-0 text-xs gap-1">
                        {step.cta}
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 bg-white border-t border-indigo-100 flex items-center justify-between gap-4">
              <p className="text-xs text-gray-400">
                Need help? Check the{' '}
                <Link href="/agency/biz-in-a-box" className="text-indigo-600 hover:underline font-medium">
                  Business in a Box playbook
                </Link>{' '}
                for step-by-step scripts.
              </p>
              <Link href="/agency/ghl-setup">
                <Button size="sm" variant="outline" className="text-xs shrink-0 gap-1">
                  GHL Setup Guide
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
