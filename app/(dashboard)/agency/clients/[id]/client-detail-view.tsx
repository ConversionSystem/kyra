'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Loader2,
  Zap,
  Sparkles,
  Trash2,
  Save,
  FileDown,
  ChevronDown,
  Plug,
  MessageSquare,
  Settings,
  BarChart3,
  Brain,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  ExternalLink,
  Copy,
  Share2,
  Inbox,
  Clock,
  User,
  Bot,
  Users,
  Globe,
  TrendingUp,
  Cpu,
  ChevronUp,
  Eye,
  EyeOff,
  Send,
  Search,
  ArrowRight,
  Phone,
  Mail,
  CornerDownLeft,
  Play,
  Calendar,
  Monitor,
} from 'lucide-react';
import type { AgencyClient, AgencyMember } from '@/lib/agency/queries';
import GHLConnection from './ghl-connection';
import PermissionsCard from './permissions-card';
import ClientStatusBanner from '@/components/dashboard/client-status-banner';
import RetellVoiceTab from '@/components/dashboard/client-tabs/retell-voice-tab';
import { ModelSelector } from '@/components/dashboard/model-selector';
import QuickAnswersEditor from '@/components/dashboard/quick-answers-editor';
import DeliverySmsTab from '@/components/dashboard/client-tabs/delivery-sms-tab';
import CrmTab from '@/components/dashboard/client-tabs/crm-tab';
import SecretsTab from '@/components/dashboard/client-tabs/secrets-tab';
import ChannelsLiveTab from '@/components/dashboard/client-tabs/channels-live-tab';
import { AutopilotClient } from '@/app/(dashboard)/agency/autopilot/autopilot-client';
import TrainTab from '@/components/dashboard/client-tabs/train-tab';
import InsightsTab from '@/components/dashboard/client-tabs/insights-tab';
import WebsiteTab from '@/components/dashboard/client-tabs/website-tab';
import AIWorkersTab from '@/components/dashboard/client-tabs/ai-workers-tab';
import MarketingTab from '@/components/dashboard/client-tabs/marketing-tab';
import ITOperationsTab from '@/components/dashboard/client-tabs/it-operations-tab';
import BookingConfigTab from '@/components/dashboard/client-tabs/booking-config-tab';
import WorkflowsTab from '@/components/dashboard/client-tabs/workflows-tab';
import AiSetupTab from '@/components/dashboard/client-tabs/ai-setup-tab';
import SeoGeoTab from '@/components/dashboard/client-tabs/seo-geo-tab';

// ── GHL Free Sub-Account Sticky Banner ───────────────────────────────────────

function GHLStickyBanner({
  clientId,
  onGoToGHL,
}: {
  clientId: string;
  onGoToGHL: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (dismissed || submitted) return null;

  return (
    <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 md:-mx-8 mb-4">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 sm:px-6 md:px-8 py-2.5 flex items-center gap-3 shadow-sm">
        {/* Icon */}
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20 shrink-0">
          <Plug className="h-3.5 w-3.5 text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-white font-semibold text-sm">
            Don&apos;t have a GoHighLevel account?
          </span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
            Free
          </span>
          <span className="text-indigo-200 text-xs hidden sm:inline">
            — We&apos;ll set one up for this client within 1 business day.
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={onGoToGHL}
          className="shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors whitespace-nowrap"
        >
          Get it free →
        </button>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-white/60 hover:text-white transition-colors text-lg leading-none ml-1"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ── Setup Nudge Banner ────────────────────────────────────────────────────────

function SetupNudgeBanner({
  client,
  onTabChange,
}: {
  client: AgencyClient;
  onTabChange: (tab: Tab) => void;
}) {
  const cc = (client.container_config as Record<string, unknown>) ?? {};
  const hasPersonality = !!(cc.persona || cc.instructions);
  const hasGHL = !!(
    (client as any).ghl_location_id ||
    (client as any).ghl_private_token ||
    (client as any).ghl_access_token
  );

  const missing: { label: string; tab: Tab; desc: string }[] = [];
  if (!hasPersonality) missing.push({ label: 'Add Personality', tab: 'ai-setup', desc: 'Train the AI with persona, greeting, and instructions' });
  // GHL nudge removed from global banner — shown only inside the GHL tab

  if (missing.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">
            Your AI needs training to work properly
          </p>
          <p className="text-xs text-amber-700 mt-0.5 mb-3">
            Complete these steps so the AI knows who it is and who it works for.
          </p>
          <div className="flex flex-wrap gap-2">
            {missing.map((step) => (
              <button
                key={step.tab}
                onClick={() => onTabChange(step.tab)}
                className="inline-flex flex-col items-start rounded-lg border border-amber-200 bg-white px-3 py-2 text-left hover:border-amber-400 hover:shadow-sm transition-all"
              >
                <span className="text-xs font-semibold text-amber-800">→ {step.label}</span>
                <span className="text-[10px] text-amber-600 mt-0.5">{step.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  active: 'border-green-200 bg-green-50 text-green-600',
  paused: 'border-yellow-200 bg-yellow-50 text-yellow-600',
  setup: 'border-amber-200 bg-amber-50 text-amber-600',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type Tab = 'inbox' | 'crm' | 'voice-sms' | 'marketing' | 'website' | 'seo-geo' | 'ai-setup' | 'integrations' | 'it-operations' | 'settings' | 'insights';

// Map legacy ?tab= values to new tab IDs
const LEGACY_TAB_MAP: Record<string, Tab> = {
  conversations: 'inbox',
  terminal: 'inbox',
  chat: 'inbox',
  personality: 'ai-setup',
  train: 'ai-setup',
  workers: 'ai-setup',
  'ai-workers': 'ai-setup',
  templates: 'ai-setup',
  skills: 'ai-setup',
  booking: 'ai-setup',
  knowledge: 'ai-setup',
  operations: 'it-operations',
  'it-operations': 'it-operations',
  workflows: 'marketing',
  share: 'settings',
  portal: 'settings',
  ghl: 'settings',
  channels: 'settings',
  secrets: 'settings',
  voice: 'voice-sms',
  'delivery-sms': 'voice-sms',
  automation: 'settings',
  usage: 'insights',
  memory: 'insights',
  seo: 'seo-geo',
  'ai-teams': 'inbox',
};

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'crm', label: 'CRM', icon: Users },
  { id: 'voice-sms', label: 'Voice & SMS', icon: Phone },
  { id: 'marketing', label: 'Marketing', icon: TrendingUp },
  { id: 'website', label: 'Website', icon: Globe },
  { id: 'seo-geo', label: 'SEO/GEO', icon: Search },
];

// Grouped sidebar navigation — desktop only
const TAB_GROUPS: { label?: string; tabs: typeof TABS }[] = [
  {
    // Daily use — no label
    tabs: TABS,
  },
  {
    label: 'Configure',
    tabs: [
      { id: 'ai-setup', label: 'AI Setup', icon: Brain },
      { id: 'integrations', label: 'Integrations', icon: Cpu },
      { id: 'it-operations', label: 'IT Operations', icon: Monitor },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    label: 'Analyze',
    tabs: [
      { id: 'insights', label: 'Insights', icon: BarChart3 },
    ],
  },
];

interface ClientDetailViewProps {
  client: AgencyClient;
  role: AgencyMember['role'];
  plan?: string;
  accountType?: string;
}

// ── Reprovision Button ────────────────────────────────────────────────────────

function ReprovisionButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleReprovision = async () => {
    setState('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/reprovision`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setState('success');
        setTimeout(() => router.refresh(), 1500);
      } else {
        setState('error');
        setErrorMsg(data.error || 'Provisioning failed');
      }
    } catch {
      setState('error');
      setErrorMsg('Network error — please try again');
    }
  };

  if (state === 'success') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" />
        AI deployed! Refreshing...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={handleReprovision}
        disabled={state === 'loading'}
        className="h-7 text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
      >
        {state === 'loading' ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3 mr-1" />
        )}
        {state === 'loading' ? 'Deploying AI...' : 'Deploy AI'}
      </Button>
      {state === 'error' && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {errorMsg}
        </p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const MASTER_AGENCY_ID = '1511e077-77ef-4c47-81fd-06a3bc9f1dbb';

// Agencies with access to advanced tabs (Marketing + IT Operations Center)
// Add agency IDs here to unlock these tabs for specific accounts
const ADVANCED_TABS_AGENCIES = new Set([
  '1511e077-77ef-4c47-81fd-06a3bc9f1dbb', // Conversion System (Kyra master)
  '18e6e562-ec29-4652-a38b-58f6be2e533f', // TrustedNetworx
  '13cc47bc-88bb-4ef8-84e8-f2c0cd97fd3e', // Priv7 (Purple Lotus — Paul Rivera)
]);

export function ClientDetailView({ client: initialClient, role, plan, accountType }: ClientDetailViewProps) {
  const isFreeOrSolo = !plan || plan === 'free' || plan === 'solo_pro' || (plan === 'free' && accountType === 'solo');
  const isPaidPlan = plan === 'pro' || plan === 'scale';
  const isMasterOrKyra = ADVANCED_TABS_AGENCIES.has(initialClient.agency_id ?? '');
  const isTrustedNetworx = initialClient.agency_id === '18e6e562-ec29-4652-a38b-58f6be2e533f';
  const hasAdvancedTabs = isMasterOrKyra || isPaidPlan;
  // TrustedNetworx gets Operations only (not Marketing) unless they're on a paid plan
  const hasMarketingTab = isMasterOrKyra;
  const hasSeoGeoTab = isMasterOrKyra;
  const hasVoiceSmsTab = isMasterOrKyra;
  const hasOperationsTab = isMasterOrKyra || isPaidPlan || isTrustedNetworx;
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab') || 'inbox';
  const resolvedTab = (LEGACY_TAB_MAP[rawTab] ?? rawTab) as Tab;
  const hasItOps = ((initialClient.container_config as Record<string, unknown>) ?? {}).active_worker_id === 'it-operations-specialist';
  // Feature gating: Marketing, Operations, Voice, AI Marketing Worker
  const HIDDEN_TABS: string[] = [];
  if (!hasMarketingTab) HIDDEN_TABS.push('marketing');
  if (!hasSeoGeoTab) HIDDEN_TABS.push('seo-geo');
  if (!hasVoiceSmsTab) HIDDEN_TABS.push('voice-sms');
  if (!hasOperationsTab) HIDDEN_TABS.push('integrations');
  if (!hasItOps) HIDDEN_TABS.push('it-operations');
  const filteredGroups = TAB_GROUPS.map(g => ({
    ...g,
    tabs: g.tabs.filter(t => !HIDDEN_TABS.includes(t.id)),
  }));
  const ALL_TAB_IDS = filteredGroups.flatMap(g => g.tabs.map(t => t.id));
  const initialTab = ALL_TAB_IDS.includes(resolvedTab) ? resolvedTab : 'inbox';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Update URL when tab changes (without full reload)
  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  }, []);

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Top Header (compact) ─────────────────────────────────────── */}
      <div className="px-4 sm:px-6 md:px-8 py-2.5 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          {/* Back arrow */}
          <Link
            href="/agency/clients"
            className="text-gray-400 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {/* Client name */}
          <div className="min-w-0 flex items-center gap-2.5 flex-1">
            <h1 className="text-lg font-semibold text-gray-900 truncate">{initialClient.name}</h1>
          </div>

          {(!initialClient.gateway_status || initialClient.gateway_status === 'error') && (
            <div className="shrink-0">
              <ReprovisionButton clientId={initialClient.id} />
            </div>
          )}
        </div>
      </div>

      {/* ── Body: sidebar nav + content ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0">

        {/* Left sidebar nav — desktop only */}
        <aside className="hidden md:flex flex-col w-48 shrink-0 bg-white border-r border-gray-100 pt-2 pb-6 px-2 sticky top-0 self-start max-h-screen overflow-y-auto">
          {filteredGroups.map((group, gi) => (
            <div key={group.label ?? gi} className={gi > 0 ? 'mt-5' : ''}>
              {group.label && (
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-1">
                  {group.label}
                </p>
              )}
              {group.tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors mb-0.5 ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* Mobile: horizontal scrollable tab bar */}
        <div className="md:hidden w-full">
          <div className="border-b border-gray-200 overflow-x-auto scrollbar-hide bg-white">
            <nav className="flex gap-0.5 px-4 -mb-px">
              {filteredGroups.flatMap(g => g.tabs).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* ── Content pane ────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 md:p-8">
          {/* Status banners — gateway errors, GHL disconnect, missing API key */}
          <ClientStatusBanner client={initialClient} />

          {/* GHL free sub-account banner removed — building our own system */}

          {/* Setup nudge — only shown on setup-relevant tabs */}
          {['inbox', 'ai-setup', 'settings'].includes(activeTab) && (
            <SetupNudgeBanner client={initialClient} onTabChange={handleTabChange} />
          )}

          {/* Tab content */}
          {activeTab === 'inbox' && (
            <InboxWithTerminal client={initialClient} isFree={isFreeOrSolo} />
          )}
          {activeTab === 'crm' && (
            <CrmTab client={initialClient} clientId={initialClient.id} />
          )}
          {activeTab === 'voice-sms' && (
            <VoiceSmsTab client={initialClient} plan={plan} accountType={accountType} />
          )}
          {activeTab === 'marketing' && (
            <MarketingTab client={initialClient} onNavigateToTab={(tab: string) => handleTabChange(tab as Tab)} />
          )}
          {activeTab === 'website' && (
            <WebsiteTab clientId={initialClient.id} clientName={initialClient.name} />
          )}
          {activeTab === 'seo-geo' && (
            <SeoGeoTab clientId={initialClient.id} clientName={initialClient.name} />
          )}
          {activeTab === 'ai-setup' && (
            <AiSetupTab client={initialClient} clientId={initialClient.id} agencyId={initialClient.agency_id} plan={plan} />
          )}
          {activeTab === 'integrations' && (
            <IntegrationsTab client={initialClient} onRefresh={() => router.refresh()} />
          )}
          {activeTab === 'it-operations' && (
            <ITOperationsTab client={initialClient} />
          )}
          {activeTab === 'settings' && (
            <SettingsWithPortal client={initialClient} role={role} plan={plan} accountType={accountType} onRefresh={() => router.refresh()} />
          )}
          {activeTab === 'insights' && (
            <InsightsTab
              client={initialClient}
              workerRoleId={((initialClient.container_config as Record<string, unknown>) ?? {}).active_worker_id as string | undefined}
            />
          )}

        </main>
      </div>{/* end body */}
    </div>
  );
}


// ── Inbox + Terminal (merged) ─────────────────────────────────────────────────

function InboxWithTerminal({ client, isFree }: { client: AgencyClient; isFree?: boolean }) {
  const [mode, setMode] = useState<'messages' | 'terminal'>('messages');

  return (
    <div className="space-y-3">
      {/* Toggle between Messages and Terminal */}
      <div className="flex items-center gap-1 border-b border-gray-100 pb-3">
        {([
          { id: 'messages' as const, label: 'Messages', icon: Inbox },
          { id: 'terminal' as const, label: 'Terminal', icon: Terminal },
        ]).map(f => (
          <button
            key={f.id}
            onClick={() => setMode(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              mode === f.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <f.icon className="h-3.5 w-3.5" />
            {f.label}
          </button>
        ))}
      </div>

      {/* Upgrade nudge — free plan users see this after their first messages */}
      {isFree && mode === 'messages' && (
        <UpgradeNudgeBanner />
      )}

      {mode === 'messages' && <ConversationsTab client={client} />}
      {mode === 'terminal' && <TerminalTab client={client} />}
    </div>
  );
}

// ── Upgrade Nudge Banner (Inbox) ─────────────────────────────────────────────

function UpgradeNudgeBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-4 flex items-center gap-4 shadow-sm">
      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-white/60 hover:text-white transition text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>

      <div className="bg-white/15 rounded-xl p-2.5 shrink-0">
        <Sparkles className="h-5 w-5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-tight">
          Unlock unlimited clients &amp; white-label branding
        </p>
        <p className="text-xs text-indigo-200 mt-0.5">
          Your AI is already working. Upgrade to scale to more clients and bill them under your own brand.
        </p>
        {/* Feature bullets */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {[
            '10+ AI workers',
            'White-label dashboard',
            'Priority support',
            'Advanced analytics',
          ].map(f => (
            <span key={f} className="flex items-center gap-1 text-[11px] text-indigo-100">
              <CheckCircle2 className="h-3 w-3 text-indigo-300 shrink-0" />
              {f}
            </span>
          ))}
        </div>
      </div>

      <Link
        href="/agency/billing"
        className="shrink-0 bg-white text-indigo-700 hover:bg-indigo-50 transition font-bold text-sm px-4 py-2 rounded-xl whitespace-nowrap"
      >
        View Plans →
      </Link>
    </div>
  );
}

// ── Settings + Portal (merged) ───────────────────────────────────────────────

function SettingsWithPortal({
  client,
  role,
  plan,
  accountType,
  onRefresh,
}: {
  client: AgencyClient;
  role: AgencyMember['role'];
  plan?: string;
  accountType?: string;
  onRefresh: () => void;
}) {
  return (
    <SettingsTabMerged
      client={client}
      role={role}
      plan={plan}
      accountType={accountType}
      onRefresh={onRefresh}
    />
  );
}

// ── Terminal Tab ──────────────────────────────────────────────────────────────

function TerminalTab({ client }: { client: AgencyClient }) {
  const hasGateway = !!(client.gateway_url && client.gateway_status === 'running');
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);
  const router = useRouter();

  const handleActivate = async () => {
    setActivating(true);
    setActivateError(null);
    try {
      const res = await fetch(`/api/agency/clients/${client.id}/reprovision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        // Reload to pick up new gateway status
        setTimeout(() => router.refresh(), 2000);
        setTimeout(() => window.location.reload(), 4000);
      } else {
        const data = await res.json().catch(() => ({}));
        setActivateError(data.error || 'Failed to activate. Try again.');
      }
    } catch {
      setActivateError('Network error. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  if (!hasGateway) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Terminal className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Terminal Not Available</h3>
        <p className="text-sm text-gray-500 max-w-md mb-6">
          This client&apos;s AI worker isn&apos;t running. Activate it to start the terminal.
        </p>
        <button
          onClick={handleActivate}
          disabled={activating}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {activating ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Activating...</>
          ) : (
            <><Zap className="h-4 w-4" /> Activate Terminal</>
          )}
        </button>
        {activateError && <p className="text-sm text-red-600 mt-3">{activateError}</p>}
        {activating && <p className="text-xs text-gray-400 mt-2">This may take 30-60 seconds...</p>}
      </div>
    );
  }

  const terminalPageUrl = `/terminal/${client.id}`;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-white/10 rounded-xl">
            <Terminal className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1">Test {client.name}&apos;s AI</h3>
            <p className="text-gray-300 text-sm">
              Open the terminal to chat with this AI worker and test how it responds to customers.
            </p>
          </div>
        </div>
        <a
          href={terminalPageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          <ExternalLink className="h-5 w-5" />
          Open Terminal
        </a>
      </div>
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab({
  client,
  role,
  onRefresh,
}: {
  client: AgencyClient;
  role: AgencyMember['role'];
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(client.name);
  const [industry, setIndustry] = useState(client.industry);
  const [status, setStatus] = useState(client.status);
  const [aiModel, setAiModel] = useState<string>(
    (client as AgencyClient & { ai_model?: string }).ai_model ?? 'openrouter/anthropic/claude-haiku-4.5'
  );
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Internal agency notes — stored in settings.agency_notes
  const [notes, setNotes] = useState<string>(
    ((client.settings as Record<string, unknown>)?.agency_notes as string) ?? ''
  );
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string; section?: string } | null>(null);

  const showMsg = (type: 'success' | 'error', text: string, section?: string) => {
    setSaveMessage({ type, text, section });
    if (type === 'success') setTimeout(() => setSaveMessage(null), 4000);
  };

  // Export state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  const industries = [
    'General', 'Dental / Medical', 'Real Estate', 'Home Services',
    'Retail / E-commerce', 'Legal', 'Finance', 'Fitness / Wellness',
    'Restaurant / Hospitality', 'Education', 'Media & Content',
    'Sales & Consulting', 'Market Intelligence', 'Other',
  ];

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/agency/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, industry, status }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to save'); }
      showMsg('success', 'Client updated.', 'general');
      onRefresh();
    } catch (e) {
      showMsg('error', e instanceof Error ? e.message : 'Failed to save.', 'general');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveModel = async (modelId: string) => {
    setAiModel(modelId);
    setIsSavingModel(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/agency/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_model: modelId }),
      });
      if (!res.ok) throw new Error('Failed to save model');
      showMsg('success', 'AI model updated. Takes effect on next conversation.', 'model');
      onRefresh();
    } catch {
      showMsg('error', 'Failed to update model.', 'model');
    } finally {
      setIsSavingModel(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/agency/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { agency_notes: notes } }),
      });
      if (!res.ok) throw new Error('Failed to save notes');
      showMsg('success', 'Notes saved.', 'notes');
    } catch {
      showMsg('error', 'Failed to save notes.', 'notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/agency/clients/${client.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/agency/clients');
    } catch {
      showMsg('error', 'Failed to delete client.', 'delete');
      setIsDeleting(false);
    }
  };

  const handleExport = async (type: string, range: string) => {
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const res = await fetch(
        `/api/agency/clients/${client.id}/export?type=${type}&range=${range}`
      );
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${client.name.toLowerCase().replace(/\s+/g, '-')}-${type}-${range}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showMsg('error', 'Export failed.', 'export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportHtml = async (range: string) => {
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const res = await fetch(
        `/api/agency/clients/${client.id}/export?format=html&type=all&range=${range}`
      );
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${client.name.toLowerCase().replace(/\s+/g, '-')}-report-${range}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showMsg('error', 'Export failed.', 'export');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
            >
              {industries.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <div className="flex gap-2">
              {(['active', 'paused', 'setup'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    status === s
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-600'
                      : 'border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Changes</>}
            </Button>
            {saveMessage?.section === 'general' && (
              <span className={`text-sm ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{saveMessage.text}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            AI Model
          </CardTitle>
          <CardDescription>
            Choose which AI model powers this client's AI worker. More powerful models cost more credits per conversation turn.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ModelSelector
            value={aiModel}
            onChange={handleSaveModel}
            disabled={isSavingModel || role === 'member'}
          />
          {isSavingModel && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving model selection...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Answers — free template injection */}
      <QuickAnswersEditor clientId={client.id} />

      {/* Private Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Private Notes</CardTitle>
          <CardDescription>
            Internal notes visible only to your agency team. Great for context, onboarding details, client preferences, or follow-up reminders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Client prefers Spanish. Using their own OpenAI key (Tier 1). Key contact: Maria at (555) 234-5678. GHL setup completed Feb 2026..."
            className="min-h-[120px] bg-gray-50 text-sm resize-y"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              {notes.length > 0 ? `${notes.length} characters` : 'No notes yet'}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
              className="gap-2"
            >
              {isSavingNotes
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>
                : <><Save className="h-3 w-3" /> Save Notes</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>Download a PDF-ready HTML report or Markdown conversation logs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative inline-block" ref={exportMenuRef}>
            <Button variant="outline" className="gap-2" onClick={() => setShowExportMenu(!showExportMenu)} disabled={isExporting}>
              {isExporting ? <><Loader2 className="h-4 w-4 animate-spin" /> Exporting...</> : <><FileDown className="h-4 w-4" /> Export<ChevronDown className="h-3 w-3" /></>}
            </Button>
            {showExportMenu && (
              <div className="absolute left-0 top-full mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-50 py-1">
                <p className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Conversations</p>
                <button onClick={() => handleExportHtml('30d')} className="w-full text-left px-3 py-2 text-sm text-indigo-700 font-medium hover:bg-indigo-50 flex items-center gap-2">📄 PDF Report (30d)</button>
                <div className="border-t border-gray-100 my-1" />
                <button onClick={() => handleExport('conversations', '7d')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Last 7 days (MD)</button>
                <button onClick={() => handleExport('conversations', '30d')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Last 30 days (MD)</button>
                <div className="border-t border-gray-100 my-1" />
                <p className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Reports</p>
                <button onClick={() => handleExport('summary', '30d')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Summary (30d)</button>
                <button onClick={() => handleExport('all', 'all')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Export All Data</button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {role === 'owner' && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="gap-2">
                <Trash2 className="h-4 w-4" /> Delete Client
              </Button>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                <p className="text-sm text-red-600">
                  Delete <strong>{client.name}</strong>? This cannot be undone. All data will be permanently removed.
                </p>
                <div className="flex gap-3">
                  <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="gap-2">
                    {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</> : 'Yes, Delete Forever'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Permissions moved to GHL tab — they're GHL-specific actions */}
    </div>
  );
}

// ── GHL Tab ───────────────────────────────────────────────────────────────────

function GHLTab({ client, onRefresh }: { client: AgencyClient; onRefresh: () => void }) {
  const cc = (client.container_config as Record<string, unknown>) ?? {};
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Connect this client&apos;s GoHighLevel sub-account so the AI can read contacts, respond to messages, and manage their pipeline.
      </p>
      <GHLConnection
        clientId={client.id}
        ghlLocationId={client.ghl_location_id ?? null}
        ghlConnectedAt={client.ghl_connected_at ?? null}
        hasPrivateToken={!!client.ghl_private_token}
        calendarId={(cc.calendar_id as string) ?? null}
        pipelineId={(cc.pipeline_id as string) ?? null}
        onDisconnected={onRefresh}
        onConnected={onRefresh}
      />

      {/* AI Permissions — controls what the AI can do in GHL */}
      <div className="pt-6 border-t border-gray-200">
        <PermissionsCard clientId={client.id} />
      </div>
    </div>
  );
}

// ── Integrations Tab (all integrations in one place) ─────────────────────────

interface IntegrationField {
  key: string;
  label: string;
  placeholder: string;
  help: string;
  sensitive?: boolean;
  multiline?: boolean;
}

interface IntegrationDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  connected: boolean;
  fields: IntegrationField[];
  setupSteps: string[];
  alwaysConnected?: boolean;
  platformProvided?: boolean; // true = Kyra provides this at platform level, no per-client setup needed
  note?: string;
  workerRelevance?: Record<string, 'required' | 'optional'>;
}

function IntegrationsTab({ client, onRefresh }: { client: AgencyClient; onRefresh: () => void }) {
  const cfg = (client.container_config || {}) as Record<string, unknown>;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});

  const integrations: IntegrationDef[] = [
    {
      id: 'ghl',
      name: 'GoHighLevel',
      icon: '🔗',
      description: 'CRM, SMS, email, calendar, pipeline',
      connected: !!(client.ghl_location_id),
      fields: [],
      setupSteps: [],
    },
    {
      id: 'email',
      name: 'Email (IMAP/SMTP)',
      icon: '📧',
      description: 'Connect any email account — Outlook, Gmail, Yahoo, or custom IMAP',
      connected: !!(cfg.email_imap_host),
      fields: [
        { key: 'email_imap_host', label: 'IMAP Server', placeholder: 'imap.gmail.com or outlook.office365.com', help: 'Gmail: imap.gmail.com | Outlook: outlook.office365.com | Yahoo: imap.mail.yahoo.com' },
        { key: 'email_imap_port', label: 'IMAP Port', placeholder: '993', help: 'Usually 993 for SSL' },
        { key: 'email_address', label: 'Email Address', placeholder: 'you@example.com', help: 'The email address to read and send from' },
        { key: 'email_password', label: 'App Password', placeholder: 'Your app-specific password', help: 'Gmail: myaccount.google.com → Security → App Passwords | Outlook: account.microsoft.com → Security → App Passwords', sensitive: true },
        { key: 'email_smtp_host', label: 'SMTP Server', placeholder: 'smtp.gmail.com or smtp.office365.com', help: 'Gmail: smtp.gmail.com | Outlook: smtp.office365.com' },
        { key: 'email_smtp_port', label: 'SMTP Port', placeholder: '465', help: 'Usually 465 for SSL or 587 for TLS' },
      ],
      setupSteps: [
        'For Gmail: Go to myaccount.google.com → Security → 2-Step Verification → App Passwords → Generate',
        'For Outlook: Go to account.microsoft.com → Security → Advanced Security → App Passwords',
        'Enter your IMAP and SMTP server details below',
        'The AI worker will use these to read and send emails',
      ],
      workerRelevance: { 'it-operations-specialist': 'required' },
    },
    {
      id: 'microsoft365',
      name: 'Microsoft 365',
      icon: '📧',
      description: 'Outlook email, OneDrive files, Teams messaging',
      connected: !!(cfg.microsoft_tenant_id && cfg.microsoft_client_id && cfg.microsoft_client_secret),
      fields: [
        { key: 'microsoft_tenant_id', label: 'Tenant ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', help: 'Azure Portal → Azure Active Directory → Overview → Tenant ID' },
        { key: 'microsoft_client_id', label: 'Application (Client) ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', help: 'Azure Portal → App Registrations → Your App → Client ID' },
        { key: 'microsoft_client_secret', label: 'Client Secret', placeholder: 'Your app client secret value', help: 'Azure Portal → App Registrations → Certificates & Secrets', sensitive: true },
      ],
      setupSteps: [
        'Go to Azure Portal (portal.azure.com)',
        'Navigate to Azure Active Directory → App Registrations → New Registration',
        'Name it "Kyra AI Integration" — set Redirect URI to your callback URL',
        'Grant permissions: Mail.ReadWrite, Files.ReadWrite.All, Chat.ReadWrite, Calendars.ReadWrite',
        'Create a Client Secret and copy the Value (not the ID)',
        'Copy Tenant ID, Client ID, and Client Secret below',
      ],
      workerRelevance: { 'it-operations-specialist': 'required' },
    },
    {
      id: 'google',
      name: 'Google Workspace',
      icon: '✉️',
      description: 'Gmail, Google Drive, Google Calendar',
      connected: !!(cfg.google_service_account_email),
      fields: [
        { key: 'google_service_account_email', label: 'Service Account Email', placeholder: 'your-bot@project.iam.gserviceaccount.com', help: 'Google Cloud Console → IAM & Admin → Service Accounts' },
        { key: 'google_service_account_key', label: 'Service Account JSON Key', placeholder: 'Paste the entire JSON key file content', help: 'Create a key for the service account → download JSON', sensitive: true, multiline: true },
      ],
      setupSteps: [
        'Go to Google Cloud Console (console.cloud.google.com)',
        'Create a new project or select existing',
        'Enable APIs: Gmail API, Google Drive API, Google Calendar API',
        'Create a Service Account under IAM & Admin',
        'Download the JSON key file',
        'Share your Google Drive folders and Calendar with the service account email',
        'Paste the service account email and JSON key below',
      ],
      workerRelevance: { 'it-operations-specialist': 'required' },
    },
    {
      id: 'fathom',
      name: 'Fathom',
      icon: '🎙️',
      description: 'Meeting transcripts, summaries, action items',
      connected: !!(cfg.fathom_api_key),
      fields: [
        { key: 'fathom_api_key', label: 'API Key', placeholder: 'fathom_xxxxxxxx', help: 'Fathom → Settings → API → Generate Key', sensitive: true },
      ],
      setupSteps: [
        'Log in to Fathom (fathom.video)',
        'Go to Settings → API',
        'Generate a new API key',
        'Paste it below',
      ],
      workerRelevance: { 'it-operations-specialist': 'optional' },
    },
    {
      id: 'github',
      name: 'GitHub',
      icon: '🔧',
      description: 'Repositories, pull requests, deployments',
      connected: !!(cfg.github_token),
      fields: [
        { key: 'github_token', label: 'Personal Access Token', placeholder: 'ghp_xxxxxxxxxxxx', help: 'GitHub → Settings → Developer Settings → Personal Access Tokens', sensitive: true },
        { key: 'github_repos', label: 'Repositories to Monitor', placeholder: 'org/repo1\norg/repo2', help: 'One repository per line (owner/repo format)', multiline: true },
      ],
      setupSteps: [
        'Go to GitHub → Settings → Developer Settings → Personal Access Tokens',
        'Generate a classic token with scopes: repo, workflow, read:org',
        'Paste the token and list your repositories below',
      ],
      workerRelevance: { 'it-operations-specialist': 'required' },
    },
    {
      id: 'wordpress',
      name: 'WordPress',
      icon: '📝',
      description: 'Blog publishing, content management',
      connected: !!(cfg.wordpress_url && cfg.wordpress_username),
      fields: [
        { key: 'wordpress_url', label: 'Site URL', placeholder: 'https://yourblog.com', help: 'Your WordPress site URL' },
        { key: 'wordpress_username', label: 'Username', placeholder: 'admin', help: 'WordPress admin username' },
        { key: 'wordpress_app_password', label: 'Application Password', placeholder: 'xxxx xxxx xxxx xxxx', help: 'WordPress → Users → Profile → Application Passwords', sensitive: true },
      ],
      setupSteps: [
        'Go to WordPress Admin → Users → Profile',
        'Scroll to Application Passwords section',
        'Create a new application password for "Kyra AI"',
        'Paste the URL, username, and password below',
      ],
      workerRelevance: { 'seo-writer': 'required' },
    },
    {
      id: 'dataforseo',
      name: 'DataForSEO',
      icon: '📊',
      description: 'SEO keyword research, SERP analysis, rank tracking — included with all Kyra plans',
      connected: true, // Platform-level — included with all Kyra plans (no per-client setup required)
      fields: [],
      setupSteps: [],
      platformProvided: true,
      workerRelevance: { 'seo-writer': 'required' },
    },
    {
      id: 'heygen',
      name: 'HeyGen',
      icon: '🎬',
      description: 'AI video generation, avatars',
      connected: !!(cfg.heygen_api_key),
      fields: [
        { key: 'heygen_api_key', label: 'API Key', placeholder: 'your-heygen-api-key', help: 'HeyGen → Settings → API', sensitive: true },
      ],
      setupSteps: [
        'Log in to HeyGen',
        'Go to Settings → API',
        'Generate an API key and paste it below',
      ],
      workerRelevance: { 'seo-writer': 'optional' },
    },
  ];

  // Sort integrations: relevant to active worker first, then others
  const activeWorkerId = cfg.active_worker_id as string | undefined;
  const sortedIntegrations = activeWorkerId
    ? [...integrations].sort((a, b) => {
        const aRelevance = a.workerRelevance?.[activeWorkerId];
        const bRelevance = b.workerRelevance?.[activeWorkerId];
        // GHL always stays first
        if (a.id === 'ghl') return -1;
        if (b.id === 'ghl') return 1;
        // Required before optional before irrelevant
        const rank = (r: string | undefined) => r === 'required' ? 0 : r === 'optional' ? 1 : 2;
        return rank(aRelevance) - rank(bRelevance);
      })
    : integrations;

  const handleSave = async (integrationId: string, fields: IntegrationField[]) => {
    setSaving(integrationId);
    setError(null);
    try {
      const configUpdate: Record<string, string> = {};
      fields.forEach(f => {
        if (values[f.key]?.trim()) configUpdate[f.key] = values[f.key].trim();
      });
      const res = await fetch(`/api/agency/clients/${client.id}/container-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configUpdate),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved(integrationId);
      setTimeout(() => setSaved(null), 3000);
    } catch {
      setError('Failed to save configuration. Try again.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Connect your tools and services. All credentials are encrypted.</p>

      <div className="space-y-3">
        {sortedIntegrations.map(integration => {
          const isExpanded = expandedId === integration.id;
          return (
            <div
              key={integration.id}
              className={`rounded-xl border transition-all ${
                isExpanded ? 'border-indigo-300 shadow-md' : 'border-gray-200 hover:border-indigo-200'
              }`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : integration.id)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{integration.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{integration.name}</p>
                    <p className="text-xs text-gray-500">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeWorkerId && integration.workerRelevance?.[activeWorkerId] && (
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full ${
                      integration.workerRelevance[activeWorkerId] === 'required'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-50 text-blue-600'
                    }`}>
                      {integration.workerRelevance[activeWorkerId] === 'required' ? 'Required' : 'Optional'}
                    </span>
                  )}
                  {integration.platformProvided ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      Included
                    </span>
                  ) : integration.connected || integration.alwaysConnected ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      Not Connected
                    </span>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  {/* GHL uses its own dedicated component */}
                  {integration.id === 'ghl' ? (
                    <div className="pt-4">
                      <GHLTab client={client} onRefresh={onRefresh} />
                    </div>
                  ) : integration.platformProvided ? (
                    <div className="mt-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-start gap-3">
                      <span className="text-green-600 text-base mt-0.5">✅</span>
                      <div>
                        <p className="text-sm font-semibold text-green-800">Included with Kyra</p>
                        <p className="text-xs text-green-700 mt-0.5">
                          {integration.name} is provisioned at the platform level — no setup needed. All your clients get access automatically.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {integration.setupSteps.length > 0 && (
                        <div className="mt-3 rounded-lg bg-indigo-50 p-3">
                          <p className="text-xs font-semibold text-indigo-900 mb-2">Step-by-step guide:</p>
                          <ol className="space-y-1">
                            {integration.setupSteps.map((step, i) => (
                              <li key={i} className="text-xs text-indigo-800 flex gap-2">
                                <span className="font-semibold text-indigo-600 shrink-0">{i + 1}.</span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {integration.fields.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {integration.fields.map(field => (
                            <div key={field.key}>
                              <label className="block text-xs font-medium text-gray-700 mb-1">{field.label}</label>
                              <p className="text-[10px] text-gray-400 mb-1">{field.help}</p>
                              {field.multiline ? (
                                <textarea
                                  value={values[field.key] || (cfg[field.key] as string) || ''}
                                  onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                                  placeholder={field.placeholder}
                                  rows={4}
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                                />
                              ) : (
                                <div className="relative">
                                  <input
                                    type={field.sensitive && !showSensitive[field.key] ? 'password' : 'text'}
                                    value={values[field.key] || (cfg[field.key] as string) || ''}
                                    onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                                    placeholder={field.placeholder}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono pr-10"
                                  />
                                  {field.sensitive && (
                                    <button
                                      type="button"
                                      onClick={() => setShowSensitive(s => ({ ...s, [field.key]: !s[field.key] }))}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                      {showSensitive[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}

                          <div className="flex items-center gap-3 pt-2">
                            <button
                              onClick={() => handleSave(integration.id, integration.fields)}
                              disabled={saving === integration.id}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                              {saving === integration.id ? 'Saving…' : 'Save Configuration'}
                            </button>
                            {saved === integration.id && (
                              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {error && saving === null && (
                        <p className="mt-2 text-xs text-red-600">{error}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Secrets Vault */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Custom Secrets</h3>
        <p className="text-xs text-gray-500 mb-4">Store additional API keys or credentials not covered by the integrations above.</p>
        <SecretsTab clientId={client.id} />
      </div>
    </div>
  );
}

// ── Voice & SMS Tab ─────────────────────────────────────────────────────────

function VoiceSmsTab({
  client,
  plan,
  accountType,
}: {
  client: AgencyClient;
  plan?: string;
  accountType?: string;
}) {
  const isFreeOrSolo = !plan || plan === 'free' || plan === 'solo_pro' || (plan === 'free' && accountType === 'solo');
  const isPaidPlan = plan === 'pro' || plan === 'scale';
  const isMasterOrKyra = ADVANCED_TABS_AGENCIES.has(client.agency_id ?? '');
  const hasVoice = isMasterOrKyra || isPaidPlan;
  const [activeSection, setActiveSection] = useState<'voice' | 'sms'>('voice');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'voice' as const, label: 'Voice' },
          { id: 'sms' as const, label: 'SMS' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeSection === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSection === 'voice' && (
        hasVoice ? (
          <RetellVoiceTab client={client} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <Phone className="h-8 w-8 text-indigo-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Premium Feature</h2>
            <p className="text-gray-500 mb-6 max-w-md">
              <span className="font-medium">Voice AI</span> is available on Pro and Scale plans. Upgrade to unlock voice capabilities.
            </p>
            <a
              href="/agency/billing"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Upgrade Plan
            </a>
          </div>
        )
      )}

      {activeSection === 'sms' && (
        isFreeOrSolo ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-indigo-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Premium Feature</h2>
            <p className="text-gray-500 mb-6 max-w-md">
              <span className="font-medium">Delivery SMS</span> is available on Agency plans. Upgrade to unlock all features.
            </p>
            <a
              href="/agency/billing"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Upgrade Plan
            </a>
          </div>
        ) : (
          <DeliverySmsTab clientId={client.id} />
        )
      )}
    </div>
  );
}

// ── Settings Tab Merged (General + Channels + Autopilot) ──

type SettingsSubTab = 'general' | 'channels' | 'autopilot' | 'sharing';

const SETTINGS_SUB_TABS: { id: SettingsSubTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'channels', label: 'Channels' },
  { id: 'autopilot', label: 'Autopilot' },
  { id: 'sharing', label: 'Sharing' },
];

function SettingsTabMerged({
  client,
  role,
  plan,
  accountType,
  onRefresh,
}: {
  client: AgencyClient;
  role: AgencyMember['role'];
  plan?: string;
  accountType?: string;
  onRefresh: () => void;
}) {
  // Read settingsTab from URL params to preserve tab across reloads (e.g., after voice agent creation)
  const initialSubTab = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('settingsTab') as SettingsSubTab) || 'general' : 'general';
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>(initialSubTab);
  return (
    <div className="space-y-6">
      {/* Sub-nav pills */}
      <div className="flex flex-wrap gap-2">
        {SETTINGS_SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              id={`settings-subtab-${tab.id}`}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeSubTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
        ))}
      </div>

      {activeSubTab === 'general' && (
        <SettingsTab client={client} role={role} onRefresh={onRefresh} />
      )}
      {activeSubTab === 'channels' && (
        <ChannelsLiveTab clientId={client.id} client={client} />
      )}
      {activeSubTab === 'autopilot' && (
        <AutopilotClient />
      )}
      {activeSubTab === 'sharing' && (
        <PortalTab client={client} />
      )}
    </div>
  );
}

// ── Conversations Tab (Writable Inbox) ────────────────────────────────────────

interface VoiceCall {
  id: string;
  created_at: string;
  user_message: string;
  ai_response: string;
  metadata: {
    callerNumber?: string;
    direction?: string;
    status?: string;
    durationSeconds?: number;
    recordingUrl?: string;
  };
}

interface Thread {
  contactId: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  conversationId: string;
  messageType: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  hasEscalation: boolean;
  hasHumanReply: boolean;
}

interface GHLMessage {
  id: string;
  contact_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  conversation_id: string;
  inbound_message: string;
  ai_response: string;
  message_type: string;
  escalated: boolean;
  escalation_reason: string | null;
  created_at: string;
}

function ConversationsTab({ client }: { client: AgencyClient }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [totalThreads, setTotalThreads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Thread | null>(null);
  const [threadMessages, setThreadMessages] = useState<GHLMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<'all' | 'voice'>('all');
  const [voiceCalls, setVoiceCalls] = useState<VoiceCall[]>([]);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load voice calls
  useEffect(() => {
    if (channelFilter !== 'voice') return;
    setVoiceLoading(true);
    fetch(`/api/voice/call-logs?entityId=${client.id}&limit=50`)
      .then(r => r.json())
      .then(d => setVoiceCalls(d.calls ?? []))
      .catch(err => console.error('[voice-calls] load failed:', err))
      .finally(() => setVoiceLoading(false));
  }, [channelFilter, client.id]);

  // Load threads
  const loadThreads = useCallback(() => {
    const params = new URLSearchParams({ limit: '30' });
    if (searchQuery) params.set('q', searchQuery);
    fetch(`/api/agency/clients/${client.id}/threads?${params}`)
      .then(r => r.json())
      .then(d => {
        setThreads(d.threads || []);
        setTotalThreads(d.total || 0);
      })
      .catch(err => console.error('[threads] load failed:', err))
      .finally(() => setLoading(false));
  }, [client.id, searchQuery]);

  useEffect(() => {
    loadThreads();
    const interval = setInterval(loadThreads, 15_000);
    return () => clearInterval(interval);
  }, [loadThreads]);

  // Load messages for selected thread
  const loadThreadMessages = useCallback((contactId: string, messageType?: string) => {
    setThreadLoading(true);
    const isWebChat = messageType === 'Web Chat';
    const url = isWebChat
      ? `/api/agency/clients/${client.id}/messages?source=webchat&contactId=${encodeURIComponent(contactId)}`
      : `/api/agency/clients/${client.id}/messages?limit=100`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        const msgs = (d.messages || [])
          .filter((m: GHLMessage) => isWebChat || m.contact_id === contactId)
          .sort((a: GHLMessage, b: GHLMessage) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setThreadMessages(msgs);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .catch(err => console.error('[thread-messages] load failed:', err))
      .finally(() => setThreadLoading(false));
  }, [client.id]);

  useEffect(() => {
    if (selectedContact) {
      loadThreadMessages(selectedContact.contactId, selectedContact.messageType);
      const interval = setInterval(() => loadThreadMessages(selectedContact.contactId, selectedContact.messageType), 10_000);
      return () => clearInterval(interval);
    }
  }, [selectedContact, loadThreadMessages]);

  // Send reply
  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedContact || sending) return;
    setSending(true);
    setSendError(null);
    setSendSuccess(false);
    try {
      const res = await fetch(`/api/agency/clients/${client.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContact.contactId,
          conversationId: selectedContact.conversationId,
          message: replyText.trim(),
          messageType: selectedContact.messageType || 'SMS',
          contactName: selectedContact.contactName,
          contactPhone: selectedContact.contactPhone,
          contactEmail: selectedContact.contactEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setReplyText('');
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
      // Refresh messages
      loadThreadMessages(selectedContact.contactId, selectedContact.messageType);
      loadThreads();
    } catch (err: any) {
      setSendError(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const channelBadge: Record<string, string> = {
    SMS: 'bg-green-50 text-green-600 border-green-200',
    Email: 'bg-orange-50 text-orange-600 border-orange-200',
    WhatsApp: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'Live Chat': 'bg-blue-50 text-blue-600 border-blue-200',
    Facebook: 'bg-blue-50 text-blue-600 border-blue-200',
    Instagram: 'bg-pink-50 text-pink-600 border-pink-200',
    GMB: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (channelFilter === 'all' && threads.length === 0 && !searchQuery) {
    return (
      <div className="space-y-3">
        <ChannelFilterBar filter={channelFilter} onChange={setChannelFilter} />
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Inbox className="h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-600">No conversations yet</p>
          <p className="text-sm text-gray-400">
            Conversations from GHL (SMS, WhatsApp, Email) will appear here once customers start messaging.
          </p>
        </div>
      </div>
    );
  }

  // Voice calls view
  if (channelFilter === 'voice') {
    return (
      <div className="space-y-3">
        <ChannelFilterBar filter={channelFilter} onChange={setChannelFilter} />
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {voiceLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : voiceCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Phone className="h-10 w-10 text-gray-300" />
              <p className="font-medium text-gray-600">No voice calls yet</p>
              <p className="text-sm text-gray-400">Inbound and outbound AI phone calls will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {voiceCalls.map(call => {
                const isExpanded = expandedCall === call.id;
                const mins = call.metadata.durationSeconds ? Math.floor(call.metadata.durationSeconds / 60) : null;
                const secs = call.metadata.durationSeconds ? call.metadata.durationSeconds % 60 : null;
                const duration = mins !== null && secs !== null ? `${mins}:${String(secs).padStart(2, '0')}` : null;
                const transcript = call.user_message?.replace(/^Transcript\n\n/, '') ?? '';
                return (
                  <div key={call.id} className="p-4 hover:bg-gray-50 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <Phone className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">
                            {call.metadata.callerNumber || 'Unknown Caller'}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                            call.metadata.direction === 'outbound'
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : 'bg-green-50 text-green-600 border-green-200'
                          }`}>
                            {call.metadata.direction === 'outbound' ? 'Outbound' : 'Inbound'}
                          </span>
                          {duration && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />{duration}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400 ml-auto">
                            {formatTime(call.created_at)}
                          </span>
                        </div>
                        {call.ai_response && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">Last AI: {call.ai_response}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          {transcript && (
                            <button
                              onClick={() => setExpandedCall(isExpanded ? null : call.id)}
                              className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            >
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              {isExpanded ? 'Hide' : 'View'} Transcript
                            </button>
                          )}
                          {call.metadata.recordingUrl && (
                            <a
                              href={call.metadata.recordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                            >
                              <Play className="h-3 w-3" /> Recording
                            </a>
                          )}
                        </div>
                        {isExpanded && transcript && (
                          <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                            {transcript}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
    <ChannelFilterBar filter={channelFilter} onChange={setChannelFilter} />
    <div className="flex h-[calc(100vh-260px)] min-h-[500px] rounded-xl border border-gray-200 overflow-hidden bg-white">
      {/* ── Thread List (Left Panel) ── */}
      <div className={`${selectedContact ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-gray-200 bg-gray-50/50`}>
        {/* Search */}
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">{totalThreads} conversation{totalThreads !== 1 ? 's' : ''}</p>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto">
          {threads.map(thread => (
            <button
              key={thread.contactId}
              onClick={() => {
                setSelectedContact(thread);
                setReplyText('');
                setSendError(null);
              }}
              className={`w-full text-left p-3 border-b border-gray-100 hover:bg-white transition ${
                selectedContact?.contactId === thread.contactId ? 'bg-white border-l-2 border-l-indigo-500' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                  thread.hasEscalation ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'
                }`}>
                  {getInitials(thread.contactName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {thread.contactName || thread.contactPhone || 'Unknown'}
                    </span>
                    <span className="text-[10px] text-gray-400 shrink-0">{formatTime(thread.lastMessageAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{thread.lastMessage}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${channelBadge[thread.messageType] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {thread.messageType}
                    </span>
                    <span className="text-[9px] text-gray-400">{thread.messageCount} msg{thread.messageCount !== 1 ? 's' : ''}</span>
                    {thread.hasEscalation && <span className="text-[9px]">🚨</span>}
                    {thread.hasHumanReply && <span className="text-[9px] text-indigo-500">👤 replied</span>}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Thread Detail (Right Panel) ── */}
      {selectedContact ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white">
            <button
              onClick={() => setSelectedContact(null)}
              className="md:hidden p-1 rounded hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
              selectedContact.hasEscalation ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'
            }`}>
              {getInitials(selectedContact.contactName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{selectedContact.contactName || 'Unknown Contact'}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {selectedContact.contactPhone && (
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedContact.contactPhone}</span>
                )}
                {selectedContact.contactEmail && (
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedContact.contactEmail}</span>
                )}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${channelBadge[selectedContact.messageType] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {selectedContact.messageType}
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
            {threadLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : threadMessages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No messages found</p>
            ) : (
              threadMessages.map(msg => {
                const isHumanReply = msg.inbound_message === '[HUMAN REPLY]';
                return (
                  <div key={msg.id} className="space-y-2">
                    {/* Customer message */}
                    {!isHumanReply && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-white border border-gray-200 shadow-sm">
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{msg.inbound_message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    )}
                    {/* AI or Human response */}
                    <div className="flex justify-end">
                      <div className={`max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm ${
                        isHumanReply
                          ? 'bg-indigo-600 text-white'
                          : 'bg-emerald-50 border border-emerald-200 text-gray-900'
                      }`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {isHumanReply ? (
                            <span className="text-[10px] font-medium text-indigo-200">👤 You</span>
                          ) : (
                            <span className="text-[10px] font-medium text-emerald-600">🤖 AI</span>
                          )}
                          {msg.escalated && <span className="text-[10px]">🚨</span>}
                        </div>
                        <p className={`text-sm whitespace-pre-wrap ${isHumanReply ? 'text-white' : 'text-gray-800'}`}>
                          {msg.ai_response}
                        </p>
                        <p className={`text-[10px] mt-1 ${isHumanReply ? 'text-indigo-200' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Input */}
          <div className="p-3 border-t border-gray-200 bg-white">
            {sendError && (
              <div className="mb-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {sendError}
              </div>
            )}
            {sendSuccess && (
              <div className="mb-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-600 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Reply sent successfully!
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                placeholder={`Reply via ${selectedContact.messageType}… (Enter to send)`}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 max-h-32"
                style={{ minHeight: '40px' }}
              />
              <button
                onClick={handleSendReply}
                disabled={!replyText.trim() || sending}
                className="shrink-0 h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
              <CornerDownLeft className="h-2.5 w-2.5" /> Enter to send · Shift+Enter for new line · Sends via GHL {selectedContact.messageType}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center bg-gray-50/30">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Select a conversation</p>
            <p className="text-xs text-gray-300 mt-1">Choose a thread to view messages and reply</p>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

// ── ChannelFilterBar ──────────────────────────────────────────────────────────

function ChannelFilterBar({ filter, onChange }: {
  filter: 'all' | 'voice';
  onChange: (f: 'all' | 'voice') => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-gray-100 pb-3">
      {([
        { id: 'all', label: 'All Channels' },
        { id: 'voice', label: '📞 Voice Calls' },
      ] as const).map(f => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
            filter === f.id
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

// ── Zapier Channel Card ───────────────────────────────────────────────────────

function ZapierChannelCard({
  client, appUrl, copy, copied,
}: {
  client: AgencyClient;
  appUrl: string;
  copy: (text: string, key: string) => void;
  copied: string | null;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const webhookUrl = `${appUrl}/api/inbound/webhook?clientId=${client.id}`;
  const webhookWithToken = `${webhookUrl}&token=YOUR_TOKEN`;

  return (
    <Card className="border-orange-100">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
            <Zap className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <CardTitle className="text-base">Zapier · Make · n8n · Any Webhook</CardTitle>
            <CardDescription className="text-xs">Connect any CRM, form, or app — HubSpot, Salesforce, Typeform, Airtable, and 5,000+ more</CardDescription>
          </div>
          <span className="ml-auto text-[10px] bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">✅ Ready</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600">
          No GHL? No problem. Any lead source can trigger the AI — paste this URL into Zapier's Webhooks action, Make's HTTP module, or any POST request.
          The AI responds instantly and returns the response text for your next automation step.
        </p>

        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Webhook URL</p>
          <div className="flex items-start gap-2">
            <code className="flex-1 bg-gray-900 text-green-400 rounded-lg px-3 py-2.5 text-xs font-mono break-all">
              {webhookUrl}
            </code>
            <Button size="sm" variant="outline" className="shrink-0" onClick={() => copy(webhookUrl, 'zapier_url')}>
              {copied === 'zapier_url' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        <button
          onClick={() => setShowDetail(!showDetail)}
          className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
        >
          {showDetail ? '▲' : '▼'} {showDetail ? 'Hide' : 'Show'} setup guide + example payload
        </button>

        {showDetail && (
          <div className="space-y-3">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-800 space-y-2">
              <p className="font-bold">Zapier setup (2 minutes):</p>
              <ol className="list-decimal ml-4 space-y-1.5 leading-relaxed">
                <li>Create a Zap with any trigger (new HubSpot contact, Typeform submission, Google Sheet row, etc.)</li>
                <li>Add action: <strong>Webhooks by Zapier → POST</strong></li>
                <li>URL: paste the webhook URL above</li>
                <li>Payload type: <strong>JSON</strong></li>
                <li>Map your fields: <code className="bg-indigo-100 px-1 rounded">name</code>, <code className="bg-indigo-100 px-1 rounded">phone</code>, <code className="bg-indigo-100 px-1 rounded">email</code>, <code className="bg-indigo-100 px-1 rounded">message</code></li>
                <li>The Zap response contains <code className="bg-indigo-100 px-1 rounded">ai_response</code> — use it in a next step to send SMS or email</li>
              </ol>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Example payload (JSON)</p>
              <pre className="bg-gray-900 text-green-400 rounded-xl p-4 text-xs overflow-x-auto">{`{
  "name": "Sarah Johnson",
  "phone": "+14155551234",
  "email": "sarah@example.com",
  "message": "Hi, I'm interested in booking a consultation",
  "source": "website-contact-form"
}`}</pre>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Response (use in next Zap step)</p>
              <pre className="bg-gray-900 text-blue-300 rounded-xl p-4 text-xs overflow-x-auto">{`{
  "ok": true,
  "ai_response": "Hi Sarah! Thanks for reaching out to Downtown Dental...",
  "sms_response": "Hi Sarah! Thanks for reaching out...",
  "sender_phone": "+14155551234",
  "sender_email": "sarah@example.com"
}`}</pre>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="text-xs gap-1.5"
                onClick={() => copy(webhookWithToken, 'zapier_full')}>
                {copied === 'zapier_full' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                Copy URL with token placeholder
              </Button>
              <Button size="sm" variant="outline" className="text-xs gap-1.5"
                onClick={() => window.open('https://zapier.com/apps/webhooks', '_blank')}>
                <ExternalLink className="h-3.5 w-3.5" />
                Open Zapier
              </Button>
              <Button size="sm" variant="outline" className="text-xs gap-1.5"
                onClick={() => window.open('https://make.com', '_blank')}>
                <ExternalLink className="h-3.5 w-3.5" />
                Open Make
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Client Portal Tab ─────────────────────────────────────────────────────────

function PortalTab({ client }: { client: AgencyClient }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'owner' | 'admin' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ portalUrl: string } | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [copied, setCopied] = useState(false);

  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://kyra.conversionsystem.com'}/client-portal/${client.id}`;

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError('');
    setInviteResult(null);
    try {
      const res = await fetch('/api/portal/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create invite');
      setInviteResult(data);
      setInviteEmail('');
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setInviting(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6 py-4">
      {/* What is the portal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            Client Portal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            The Client Portal gives your client&apos;s team a branded view of their AI worker — 
            conversation stats, performance metrics, and their monthly report. They can&apos;t change 
            anything; they just get visibility.
          </p>

          {/* Direct portal link */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Portal URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 font-mono text-gray-700 truncate">
                {portalUrl}
              </code>
              <button
                onClick={() => copyUrl(portalUrl)}
                className="shrink-0 px-3 py-2.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-3 py-2.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Preview
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite a team member */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite Client Staff</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Send your client&apos;s team member a portal invite link. They sign up (or log in) and 
            immediately see their AI&apos;s performance dashboard.
          </p>

          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="client@theirbusiness.com"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as 'owner' | 'admin' | 'viewer')}
              className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {inviting ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sending…</>
              ) : (
                <>Invite</>
              )}
            </button>
          </div>

          {inviteError && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              {inviteError}
            </p>
          )}

          {inviteResult && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Invite link created!
              </p>
              <p className="text-xs text-green-700">Send this link to your client — it expires in 7 days:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white border border-green-200 rounded-lg px-3 py-2 font-mono text-green-800 truncate">
                  {inviteResult.portalUrl}
                </code>
                <button
                  onClick={() => copyUrl(inviteResult.portalUrl)}
                  className="shrink-0 px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">Access Levels</p>
            <div className="space-y-1.5 text-xs text-gray-600">
              <p><strong>Viewer</strong> — Read-only: stats, conversations, report</p>
              <p><strong>Admin</strong> — Can update AI personality and settings</p>
              <p><strong>Owner</strong> — Full access, can invite other members</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
