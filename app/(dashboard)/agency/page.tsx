export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';
import { getAgencyCredits } from '@/lib/billing/credit-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus, Target, DollarSign, BarChart3, ClipboardList, ArrowRight,
  Rocket, Activity, AlertTriangle, Gift,
} from 'lucide-react';
import WhatsNewBanner from '@/components/dashboard/whats-new-banner';
import AgencyChecklist from '@/components/dashboard/agency-checklist';
import TrialCountdownBanner from '@/components/dashboard/trial-countdown-banner';
import { UltronSummaryCard } from '@/components/dashboard/ultron-summary-card';
// SoloOverview removed — solo accounts now use the same agency dashboard
import { LaunchProgress } from '@/components/onboarding/launch-progress';
import { StartTourButton } from '@/components/onboarding/guided-tour';
import MissionControlLive from '@/components/dashboard/mission-control-live';
import LowCreditBanner from '@/components/dashboard/low-credit-banner';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function AgencyOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const { agency } = result;
  const [clients, agencyCredits] = await Promise.all([
    getAgencyClients(agency.id),
    getAgencyCredits(agency.id).catch(() => ({ balance: 0, lifetimePurchased: 0, lifetimeUsed: 0 })),
  ]);

  const isAdmin = ['hello@conversionsystem.com', 'angel@conversionsystem.com'].includes(user.email ?? '');
  const agencySettings = (agency.settings as Record<string, unknown>) ?? {};
  // ── Dashboard (same for solo and agency) ─────────────────────────────────────
  const isSolo = agencySettings.account_type === 'solo';

  const totalCount  = clients.length;
  const totalUsage  = clients.reduce((sum, c) => sum + c.usage_this_month, 0);
  const showTrialCreditsBanner = agencyCredits.lifetimePurchased === 0 && agencyCredits.balance > 0;
  const showLowCredits = agencyCredits.balance <= 10;

  const checklistProps = {
    hasClients:         clients.length > 0,
    hasRunningClient:   clients.some(c => c.gateway_status === 'running'),
    hasGhlConnected:    clients.some(c => !!(c.ghl_private_token || c.ghl_access_token)),
    hasPersonalitySet:  clients.some(c => { const cfg = (c.container_config as Record<string, unknown>) ?? {}; return !!(cfg.persona || cfg.instructions); }),
    hasConversations:   totalUsage > 0,
    hasBilling:         !!(agency.stripe_customer_id) || agency.plan !== 'free',
  };

  // Seed initial data for MissionControlLive (avoids loading flash on first render)
  const initialClients = clients.map(c => ({
    id:                 c.id,
    name:               c.name,
    gateway_status:     c.gateway_status,
    gateway_error:      c.gateway_error ?? null,
    usage_this_month:   c.usage_this_month ?? 0,
    conversations_today: 0, // will be filled by client polling
    last_message_at:    null,
  }));

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            {getGreeting()}, {agency.name.split(' ')[0]}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500">Mission Control · {agency.name}</p>
            <StartTourButton />
          </div>
        </div>
        {/* Hide Add Client when at plan limit */}
        {(() => {
          const planLimits: Record<string, number> = { free: 1, starter: 3, lite: 3, pro: 10, scale: 30 };
          const limit = planLimits[agency.plan || 'free'] ?? 1;
          return totalCount < limit ? (
            <Link href="/agency/clients/new">
              <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Client</span>
              </Button>
            </Link>
          ) : null;
        })()}
      </div>

      {/* ── Low Credit Banner (shows when agency credits ≤ 10) ── */}
      <LowCreditBanner balance={agencyCredits.balance} />

      {/* ── Platform Admin Banner ── */}
      {isAdmin && <div className="mb-4"><WhatsNewBanner /></div>}

      {/* ── Trial countdown ── */}
      <TrialCountdownBanner
        createdAt={agency.created_at ?? new Date().toISOString()}
        plan={agency.plan || 'free'}
        clientCount={totalCount}
        totalConversations={totalUsage}
      />

      {/* ── Welcome credits banner ── */}
      {showTrialCreditsBanner && (
        <div className="mb-4 flex items-center gap-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3.5">
          <span className="text-2xl shrink-0">🎁</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-900">
              You have <strong>{agencyCredits.balance} welcome credits</strong> — your AI is ready to work.
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Top up or add your own API key when ready to scale.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/agency/credits"><Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs h-8">Top up</Button></Link>
            <Link href="/agency/api-keys"><Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs h-8">Add API Key</Button></Link>
          </div>
        </div>
      )}

      {/* ── Low credits alert ── */}
      {showLowCredits && (
        <div className={`mb-4 flex items-center gap-4 rounded-xl border px-4 py-3.5 ${agencyCredits.balance === 0 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
          <AlertTriangle className={`h-5 w-5 shrink-0 ${agencyCredits.balance === 0 ? 'text-red-600' : 'text-amber-600'}`} />
          <p className={`text-sm flex-1 font-semibold ${agencyCredits.balance === 0 ? 'text-red-900' : 'text-amber-900'}`}>
            {agencyCredits.balance === 0 ? 'Out of credits — AI responses may pause' : `Only ${agencyCredits.balance} credits remaining`}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/agency/billing"><Button size="sm" className={`text-xs h-8 ${agencyCredits.balance === 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}>Upgrade</Button></Link>
            <Link href="/agency/referrals"><Button size="sm" variant="outline" className="text-xs h-8 gap-1"><Gift className="h-3 w-3" />Free Credits</Button></Link>
          </div>
        </div>
      )}

      {/* ── Launch Progress ── */}
      <div className="mb-6">
        <LaunchProgress
          completedSteps={[
            'signup_complete',
            ...(agencySettings.setup_complete || agencySettings.onboarding_completed ? ['setup_complete'] : []),
            ...(clients.some(c => c.gateway_status === 'running') ? ['channels_connected'] : []),
            ...(agencySettings.autopilot_configured ? ['autopilot_configured'] : []),
            ...(clients.length > 0 ? ['first_client_added'] : []),
          ]}
          compact
        />
      </div>

      {/* ── Setup Checklist ── */}
      <div className="mb-6">
        <AgencyChecklist {...checklistProps} />
      </div>

      {/* ── CEO Action Board (admin only) ── */}
      {isAdmin && (
        <div className="mb-6">
          <UltronSummaryCard />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          LIVE MISSION CONTROL — real-time fleet + KPIs + activity feed
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <MissionControlLive
          initialClients={initialClients}
          initialSummary={{
            total:                totalCount,
            running:              clients.filter(c => c.gateway_status === 'running').length,
            conversations_today:  0,
            credits_balance:      agencyCredits.balance,
            credits_used:         agencyCredits.lifetimeUsed,
          }}
          showClientColumn
        />
      </div>

      {/* ── Two-Column Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">

        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { icon: Plus,         label: 'Add New Client',     subtitle: 'Deploy a new AI worker',              href: '/agency/clients/new',   color: 'text-indigo-600 bg-indigo-50' },
                  { icon: Target,       label: 'AI Workers',         subtitle: 'Configure your AI workers',           href: '/agency/clients',       color: 'text-purple-600 bg-purple-50' },
                  { icon: BarChart3,    label: 'View Clients',       subtitle: 'Performance, usage & revenue',        href: '/agency/clients',       color: 'text-blue-600  bg-blue-50'   },
                  { icon: DollarSign,   label: 'Credits & Billing',  subtitle: 'Manage your account',                 href: '/agency/credits',       color: 'text-green-600 bg-green-50'  },
                  { icon: Gift,         label: 'Earn Free Credits',  subtitle: 'Refer a friend — you both benefit',   href: '/agency/referrals',     color: 'text-amber-600 bg-amber-50'  },
                  ...(isAdmin ? [{ icon: ClipboardList, label: 'Master Control', subtitle: 'Platform admin dashboard', href: '/master', color: 'text-orange-600 bg-orange-50' }] : []),
                ].map(action => (
                  <Link key={action.href} href={action.href} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-sm transition-all group">
                    <div className={`rounded-xl p-2 ${action.color}`}>
                      <action.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{action.label}</p>
                      <p className="text-xs text-gray-400">{action.subtitle}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* This Month Summary */}
        <div className="lg:col-span-3">
          <Card className="shadow-sm h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">This Month</CardTitle>
              <Link href="/agency/clients" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-0.5">
                View clients <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Conversations', value: totalUsage.toLocaleString(),                                                               color: 'text-indigo-600', bg: 'bg-indigo-50'  },
                  { label: 'Active AI Workers',    value: clients.filter(c => c.gateway_status === 'running').length,                               color: 'text-green-600',  bg: 'bg-green-50'   },
                  { label: 'Credits Balance',      value: agencyCredits.balance,                                                                    color: agencyCredits.balance <= 10 ? 'text-red-600' : 'text-emerald-600', bg: agencyCredits.balance <= 10 ? 'bg-red-50' : 'bg-emerald-50' },
                  { label: 'Silent Workers',       value: clients.filter(c => c.gateway_status === 'running' && c.usage_this_month === 0).length,  color: 'text-amber-600',  bg: 'bg-amber-50'   },
                ].map(stat => (
                  <div key={stat.label} className={`${stat.bg} rounded-xl p-4`}>
                    <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Credit burn rate */}
              {agencyCredits.lifetimeUsed > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>{agencyCredits.lifetimeUsed} credits used</span>
                    <span>{agencyCredits.balance} remaining</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all"
                      style={{ width: `${Math.min(100, (agencyCredits.lifetimeUsed / Math.max(agencyCredits.lifetimeUsed + agencyCredits.balance, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Onboarding Wizard (no clients) ── */}
      {clients.length === 0 && (
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white overflow-hidden">
          <div className="p-5 border-b border-indigo-100 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-2.5">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Deploy your first AI worker</h2>
              <p className="text-xs text-gray-500 mt-0.5">Connect GHL, pick a template, go live in under 5 minutes.</p>
            </div>
          </div>
          <div className="divide-y divide-indigo-50">
            {[
              { n: 1, title: 'Connect GoHighLevel', desc: 'Link your GHL account so Kyra can respond to SMS messages.', done: clients.some(c => c.ghl_private_token) || !!agency.ghl_agency_id, href: '/agency/ghl-setup', cta: 'Connect GHL' },
              { n: 2, title: 'Add your first client', desc: 'Pick an industry template. AI personality is pre-written.', done: clients.length > 0, href: '/agency/clients/new', cta: 'Add Client' },
              { n: 3, title: 'Watch your AI go live', desc: 'AI responds to GHL SMS within 60 seconds automatically.', done: clients.some(c => c.gateway_status === 'running'), href: '/agency', cta: 'View Feed' },
            ].map(step => (
              <div key={step.n} className={`flex items-start gap-4 p-5 ${step.done ? 'opacity-60' : ''}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${step.done ? 'bg-green-100 text-green-600' : 'bg-indigo-600 text-white'}`}>
                  {step.done ? '✓' : step.n}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${step.done ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{step.title}</p>
                  {!step.done && <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>}
                </div>
                {!step.done && (
                  <Link href={step.href}><Button size="sm" className="text-xs">{step.cta} →</Button></Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
