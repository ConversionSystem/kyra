export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';
import { getAgencyCredits } from '@/lib/billing/credit-engine';
import { Button } from '@/components/ui/button';
import { Plus, Activity, Gift, AlertTriangle, Sparkles, ArrowRight, Rocket, Zap } from 'lucide-react';
import MissionControlLive from '@/components/dashboard/mission-control-live';
import { StartTourButton } from '@/components/onboarding/guided-tour';
import { OnboardingProgress } from '@/components/dashboard/onboarding-progress';
import { ONBOARDING_STEPS, type OnboardingStepsRecord } from '@/lib/onboarding/tracker';

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

  const totalCount = clients.length;

  // Show onboarding widget for agencies created in the last 30 days
  const agencyAge = Date.now() - new Date(agency.created_at).getTime();
  const showOnboarding = agencyAge < 30 * 24 * 60 * 60 * 1000;
  const onboardingSteps = ((agency as unknown as Record<string, unknown>).onboarding_steps ?? {}) as OnboardingStepsRecord;

  const showLowCredits = agencyCredits.balance <= 10 && agencyCredits.lifetimePurchased > 0;
  const showOutOfCredits = agencyCredits.balance === 0 && agencyCredits.lifetimePurchased > 0;
  const showWelcomeCredits = agencyCredits.lifetimePurchased === 0 && agencyCredits.balance > 0;

  // Plan limits for "Add Client" button visibility
  const planLimits: Record<string, number> = { free: 1, solo_pro: 1, starter: 3, pro: 10, scale: 30 };
  const limit = planLimits[agency.plan || 'free'] ?? 1;
  const canAddClient = totalCount < limit;

  // Free plan nudge (not on first load — only after they have a client)
  const showUpgradeNudge = agency.plan === 'free' && totalCount >= 1;

  // Seed initial data for MissionControlLive
  const initialClients = clients.map(c => ({
    id:                 c.id,
    name:               c.name,
    gateway_status:     c.gateway_status,
    gateway_error:      c.gateway_error ?? null,
    usage_this_month:   c.usage_this_month ?? 0,
    conversations_today: 0,
    last_message_at:    null,
  }));

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            {getGreeting()}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500">{agency.name}</p>
            <StartTourButton />
          </div>
        </div>
        {canAddClient && (
          <Link href="/agency/clients/new">
            <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add AI Worker</span>
            </Button>
          </Link>
        )}
      </div>

      {/* ── Onboarding checklist (new agencies only) ── */}
      {showOnboarding && (
        <OnboardingProgress steps={onboardingSteps} stepsMeta={ONBOARDING_STEPS} />
      )}

      {/* ── Credit alerts (only one shows) ── */}
      {showOutOfCredits && (
        <div className="flex items-center gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm font-semibold text-red-900 flex-1">
            Out of credits — your AI workers have stopped responding.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/agency/credits"><Button size="sm" className="bg-red-600 hover:bg-red-700 text-xs h-8">Top Up</Button></Link>
            <Link href="/agency/referrals"><Button size="sm" variant="outline" className="text-xs h-8 gap-1 border-red-200 text-red-700"><Gift className="h-3 w-3" />Free Credits</Button></Link>
          </div>
        </div>
      )}
      {showLowCredits && !showOutOfCredits && (
        <div className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-900 flex-1">
            Only {agencyCredits.balance} credits left — top up to avoid interruptions.
          </p>
          <Link href="/agency/credits"><Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-xs h-8">Top Up</Button></Link>
        </div>
      )}
      {showWelcomeCredits && (
        <div className="flex items-center gap-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3.5">
          <span className="text-2xl shrink-0">🎁</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-indigo-900">
              You have <strong>{agencyCredits.balance} welcome credits</strong> — your AI is ready to work.
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">Top up or add your own API key when ready to scale.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/agency/credits"><Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs h-8">Top up</Button></Link>
            <Link href="/agency/api-keys"><Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs h-8">Add API Key</Button></Link>
          </div>
        </div>
      )}

      {/* ── Upgrade nudge (free plan with active client) ── */}
      {showUpgradeNudge && (
        <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4 flex items-center gap-4">
          <div className="bg-white/15 rounded-xl p-2.5 shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">Your AI worker is live — ready to scale?</p>
            <p className="text-xs text-indigo-200 mt-0.5">Upgrade to add more clients and unlock white-label branding.</p>
          </div>
          <Link href="/agency/billing" className="bg-white text-indigo-700 font-bold text-sm px-4 py-2 rounded-xl whitespace-nowrap hover:bg-indigo-50 transition shrink-0">
            View Plans →
          </Link>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          MISSION CONTROL — live fleet + KPIs + activity feed
      ═════════════════════════════════════════════════════════════════════ */}
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

      {/* ── Empty state: first-time onboarding ── */}
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
              { n: 1, title: 'Add your first client', desc: 'Pick an industry template — AI personality is pre-written.', href: '/agency/clients/new', cta: 'Add Client' },
              { n: 2, title: 'Connect GoHighLevel', desc: 'Link your GHL account so the AI responds to SMS automatically.', href: '/agency/clients', cta: 'Connect GHL' },
              { n: 3, title: 'Watch your AI go live', desc: 'The AI responds to GHL messages within 60 seconds.', href: '/agency', cta: 'View Feed' },
            ].map(step => (
              <div key={step.n} className="flex items-start gap-4 p-5">
                <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                  {step.n}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{step.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                </div>
                <Link href={step.href}><Button size="sm" className="text-xs shrink-0">{step.cta} →</Button></Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
