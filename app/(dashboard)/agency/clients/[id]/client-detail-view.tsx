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
  Trash2,
  Save,
  FileDown,
  ChevronDown,
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
} from 'lucide-react';
import type { AgencyClient, AgencyMember } from '@/lib/agency/queries';
import GHLConnection from './ghl-connection';
import PermissionsCard from './permissions-card';
import ClientStatusBanner from '@/components/dashboard/client-status-banner';
import { VoiceClient } from '@/app/(dashboard)/agency/voice/voice-client';
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
  if (!hasPersonality) missing.push({ label: 'Add Personality', tab: 'train', desc: 'Train the AI with persona, greeting, and instructions' });
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

type Tab = 'inbox' | 'chat' | 'train' | 'workers' | 'marketing' | 'operations' | 'crm' | 'website' | 'settings' | 'insights' | 'share';

// Map legacy ?tab= values to new tab IDs
const LEGACY_TAB_MAP: Record<string, Tab> = {
  conversations: 'inbox',
  terminal: 'chat',
  personality: 'train',
  templates: 'workers',
  'ai-workers': 'workers',
  skills: 'workers',
  'it-operations': 'operations',
  website: 'website',
  knowledge: 'train',
  ghl: 'settings',
  channels: 'settings',
  secrets: 'settings',
  voice: 'settings',
  'delivery-sms': 'settings',
  automation: 'settings',
  usage: 'insights',
  memory: 'insights',
  seo: 'insights',
  portal: 'share',
  'ai-teams': 'chat',
};

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'marketing', label: 'Marketing', icon: TrendingUp },
  { id: 'operations', label: 'Operations', icon: Cpu },
  { id: 'crm', label: 'CRM', icon: Users },
  { id: 'website', label: 'Website', icon: Globe },
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
      { id: 'train' as Tab, label: 'Train', icon: Brain },
      { id: 'workers' as Tab, label: 'AI Workers', icon: Bot },
      { id: 'settings' as Tab, label: 'Settings', icon: Settings },
    ],
  },
  {
    label: 'Analyze',
    tabs: [
      { id: 'insights' as Tab, label: 'Insights', icon: BarChart3 },
      { id: 'share' as Tab, label: 'Share', icon: Share2 },
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

export function ClientDetailView({ client: initialClient, role, plan, accountType }: ClientDetailViewProps) {
  const isFreeOrSolo = !plan || plan === 'free' || plan === 'solo_pro' || (plan === 'free' && accountType === 'solo');
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab') || 'inbox';
  const resolvedTab = (LEGACY_TAB_MAP[rawTab] ?? rawTab) as Tab;
  const ALL_TAB_IDS = TAB_GROUPS.flatMap(g => g.tabs.map(t => t.id));
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
          {TAB_GROUPS.map((group, gi) => (
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
              {TAB_GROUPS.flatMap(g => g.tabs).map((tab) => {
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

          {/* Setup nudge — only shown on setup-relevant tabs */}
          {['chat', 'train', 'settings'].includes(activeTab) && (
            <SetupNudgeBanner client={initialClient} onTabChange={handleTabChange} />
          )}

          {/* Tab content */}
          {activeTab === 'inbox' && (
            <ConversationsTab client={initialClient} />
          )}
          {activeTab === 'chat' && (
            <TerminalTab client={initialClient} />
          )}
          {activeTab === 'train' && (
            <TrainTab client={initialClient} />
          )}
          {activeTab === 'workers' && (
            <AIWorkersTab client={initialClient} agencyId={initialClient.agency_id} />
          )}
          {activeTab === 'marketing' && (
            <MarketingTab client={initialClient} />
          )}
          {activeTab === 'operations' && (
            <ITOperationsTab client={initialClient} />
          )}
          {activeTab === 'crm' && (
            <CrmTab client={initialClient} clientId={initialClient.id} />
          )}
          {activeTab === 'website' && (
            <WebsiteTab clientId={initialClient.id} clientName={initialClient.name} />
          )}
          {activeTab === 'settings' && (
            <SettingsTabMerged client={initialClient} role={role} plan={plan} accountType={accountType} onRefresh={() => router.refresh()} />
          )}
          {activeTab === 'insights' && (
            <InsightsTab client={initialClient} isSeoLocked={isFreeOrSolo} />
          )}
          {activeTab === 'share' && (
            <PortalTab client={initialClient} />
          )}

        </main>
      </div>{/* end body */}
    </div>
  );
}


// ── Terminal Tab ──────────────────────────────────────────────────────────────

function TerminalTab({ client }: { client: AgencyClient }) {
  const hasGateway = !!(client.gateway_url && client.gateway_status === 'running');

  if (!hasGateway) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Terminal className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Terminal Not Available</h3>
        <p className="text-sm text-gray-500 max-w-md">
          This client&apos;s AI worker hasn&apos;t been provisioned yet. The terminal will appear once the gateway is running.
        </p>
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
    (client as AgencyClient & { ai_model?: string }).ai_model ?? 'gpt-4o-mini'
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
      description: 'SEO keyword research, SERP analysis, rank tracking',
      connected: !!(cfg.dataforseo_login && cfg.dataforseo_password),
      fields: [
        { key: 'dataforseo_login', label: 'API Login', placeholder: 'your@email.com', help: 'DataForSEO dashboard → API Access' },
        { key: 'dataforseo_password', label: 'API Password', placeholder: 'Your API password', help: 'DataForSEO dashboard → API Access', sensitive: true },
      ],
      setupSteps: [
        'Sign up at dataforseo.com',
        'Go to your dashboard → API Access',
        'Copy your login and password below',
      ],
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
                  {integration.connected || integration.alwaysConnected ? (
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
    </div>
  );
}

// ── Settings Tab Merged (General + Channels + Integrations + Security + Voice + SMS + Workflows) ──

type SettingsSubTab = 'general' | 'channels' | 'integrations' | 'voice' | 'sms' | 'workflows';

const SETTINGS_SUB_TABS: { id: SettingsSubTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'channels', label: 'Channels' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'voice', label: 'Voice' },
  { id: 'sms', label: 'SMS' },
  { id: 'workflows', label: 'Workflows' },
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
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>('general');
  const isFreeOrSolo = !plan || plan === 'free' || plan === 'solo_pro' || (plan === 'free' && accountType === 'solo');

  return (
    <div className="space-y-6">
      {/* Sub-nav pills */}
      <div className="flex flex-wrap gap-2">
        {SETTINGS_SUB_TABS.map((tab) => {
          const locked = tab.id === 'sms' && isFreeOrSolo;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeSubTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              {locked && <span className="ml-1">🔒</span>}
            </button>
          );
        })}
      </div>

      {activeSubTab === 'general' && (
        <SettingsTab client={client} role={role} onRefresh={onRefresh} />
      )}
      {activeSubTab === 'channels' && (
        <ChannelsLiveTab clientId={client.id} client={client} />
      )}
      {activeSubTab === 'integrations' && (
        <div className="space-y-8">
          <IntegrationsTab client={client} onRefresh={onRefresh} />

          {/* Secrets Vault */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Custom Secrets</h3>
            <p className="text-xs text-gray-500 mb-4">Store additional API keys or credentials not covered by the integrations above.</p>
            <SecretsTab clientId={client.id} />
          </div>
        </div>
      )}
      {activeSubTab === 'voice' && (
        <VoiceClient
          agencyId={client.agency_id}
          clientId={client.id}
          clientName={client.name ?? 'Client'}
          voiceConfig={(client.container_config as Record<string, unknown>)?.voice_config as Record<string, string> | null ?? null}
          isSolo={false}
        />
      )}
      {activeSubTab === 'sms' && (
        isFreeOrSolo ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <span className="text-3xl">🔒</span>
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
      {activeSubTab === 'workflows' && (
        <AutopilotClient />
      )}
    </div>
  );
}

// ── Conversations Tab ─────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  channel: string;
  user_message: string;
  ai_response: string;
  created_at: string;
}

function ConversationsTab({ client }: { client: AgencyClient }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadConversations = useCallback(() => {
    fetch(`/api/agency/clients/${client.id}/conversations`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => {
        if (d.migrationRequired) { setMigrationRequired(true); return; }
        setConversations(d.conversations || []);
        setTotal(d.total ?? (d.conversations || []).length);
      })
      .catch((err) => console.error('[conversations] load failed:', err))
      .finally(() => setLoading(false));
  }, [client.id]);

  useEffect(() => {
    loadConversations();
    // Auto-refresh every 10 seconds so new conversations appear without manual reload
    const interval = setInterval(loadConversations, 10_000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  const channelBadge: Record<string, string> = {
    test_chat: 'bg-blue-50 text-blue-600 border-blue-200',
    web_chat:  'bg-indigo-50 text-indigo-600 border-indigo-200',
    portal: 'bg-purple-50 text-purple-600 border-purple-200',
    telegram: 'bg-sky-50 text-sky-600 border-sky-200',
    sms: 'bg-green-50 text-green-600 border-green-200',
    ghl_sms: 'bg-green-50 text-green-600 border-green-200',
    ghl_email: 'bg-orange-50 text-orange-600 border-orange-200',
    whatsapp: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  };

  const channelLabel: Record<string, string> = {
    test_chat: 'Test Chat', web_chat: 'Chat Widget', portal: 'Portal', telegram: 'Telegram',
    sms: 'SMS', ghl_sms: 'GHL SMS', ghl_email: 'GHL Email', whatsapp: 'WhatsApp',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (migrationRequired) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 space-y-3">
        <p className="font-semibold text-amber-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> One-time setup required
        </p>
        <p className="text-sm text-amber-700">
          Run this SQL in your{' '}
          <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-medium">
            Supabase SQL Editor
          </a>{' '}
          to enable conversation logging:
        </p>
        <pre className="text-xs bg-white border border-amber-200 rounded-lg p-3 overflow-x-auto text-gray-700 whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS client_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'test_chat',
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  tokens_used INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE client_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members view" ON client_conversations FOR SELECT
  USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));
CREATE POLICY "Service insert" ON client_conversations FOR INSERT WITH CHECK (true);`}
        </pre>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Inbox className="h-10 w-10 text-gray-300" />
        <p className="font-medium text-gray-600">No conversations yet</p>
        <p className="text-sm text-gray-400">
          Open the Terminal tab to test the AI, or share the portal link — conversations will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{total} conversation{total !== 1 ? 's' : ''} logged{total > conversations.length ? ` (showing ${conversations.length} most recent)` : ''}</p>
      {conversations.map(conv => {
        const isEscalated = conv.ai_response?.includes("I'll flag this for our team");
        const isProactive = conv.user_message?.includes('[NEW CONTACT]');
        return (
        <div
          key={conv.id}
          className={`rounded-xl border transition cursor-pointer ${isEscalated ? 'border-red-200 bg-red-50 hover:border-red-300' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          onClick={() => setExpanded(expanded === conv.id ? null : conv.id)}
        >
          <div className="flex items-start gap-3 p-4">
            <User className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {isEscalated && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">🚨 Escalated</span>}
                {isProactive && !isEscalated && <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-medium">👋 Proactive greeting</span>}
              </div>
              <p className="text-sm text-gray-900 line-clamp-2">{conv.user_message}</p>
              {expanded === conv.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  <div className="flex items-start gap-2">
                    <Bot className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{conv.ai_response}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${channelBadge[conv.channel] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                {channelLabel[conv.channel] || conv.channel}
              </span>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(conv.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
        );
      })}
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
