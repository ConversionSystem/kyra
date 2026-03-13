'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Loader2,
  Send,
  Zap,
  Trash2,
  Save,
  FileDown,
  ChevronDown,
  MessageSquare,
  Settings,
  Link2,
  Shield,
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
  Globe,
  Mail,
  Phone,
  Radio,
  MessageCircle,
  X,
  Plus,
  Users,
  Database,
  Sparkles,
  GitBranch,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { AgencyClient, AgencyMember } from '@/lib/agency/queries';
import GHLConnection from './ghl-connection';
import { UsageAnalytics } from './usage-analytics';
import PermissionsCard from './permissions-card';
import HealthScoreBadge from '@/components/dashboard/health-score-badge';
import ClientStatusBanner from '@/components/dashboard/client-status-banner';
import ClientActivityHeatmap from '@/components/dashboard/client-activity-heatmap';
import { VoiceClient } from '@/app/(dashboard)/agency/voice/voice-client';
import RoiSummaryCard from '@/components/dashboard/roi-summary-card';
import { ModelSelector } from '@/components/dashboard/model-selector';
import QuickAnswersEditor from '@/components/dashboard/quick-answers-editor';
import { MemoryBrowser } from './memory-browser';
import { CustomerIntelligence } from './customer-intelligence';
import { AICapabilities } from './ai-capabilities';
import { SEODashboard } from './seo-dashboard';
import SkillsTab from '@/components/dashboard/client-tabs/skills-tab';
import AIPersonalityTab from '@/components/dashboard/client-tabs/ai-personality-tab';
import DeliverySmsTab from '@/components/dashboard/client-tabs/delivery-sms-tab';
import CrmTab from '@/components/dashboard/client-tabs/crm-tab';
import { AISetupClient } from '@/app/(dashboard)/agency/ai-setup/ai-setup-client';
import { AgentsClient } from '@/app/(dashboard)/agency/agents/agents-client';
import { AutopilotClient } from '@/app/(dashboard)/agency/autopilot/autopilot-client';

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
  if (!hasPersonality) missing.push({ label: 'Add Personality', tab: 'personality', desc: 'Train the AI with persona, greeting, and instructions' });
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
  setup: 'border-blue-200 bg-blue-50 text-blue-600',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type Tab = 'terminal' | 'personality' | 'templates' | 'skills' | 'crm' | 'settings' | 'ghl' | 'usage' | 'conversations' | 'channels' | 'portal' | 'memory' | 'voice' | 'seo' | 'automation' | 'ai-teams' | 'delivery-sms';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'personality', label: 'AI Personality', icon: Brain },
  { id: 'templates', label: 'Templates', icon: Sparkles },
  { id: 'skills', label: 'Skills', icon: Zap },
  { id: 'ai-teams', label: 'AI Teams', icon: Bot },
  { id: 'delivery-sms', label: 'Delivery SMS', icon: MessageSquare },
  { id: 'crm', label: 'CRM', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'ghl', label: 'GHL', icon: Link2 },
  { id: 'automation', label: 'Automation', icon: GitBranch },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
  { id: 'conversations', label: 'Conversations', icon: Inbox },
  { id: 'channels', label: 'Channels', icon: Radio },
  { id: 'portal', label: 'Client Portal', icon: Users },
  { id: 'memory', label: 'AI Memory', icon: Database },
  { id: 'voice', label: 'Voice AI', icon: Phone },
  { id: 'seo', label: 'SEO', icon: BarChart3 },
];

// Grouped sidebar navigation — desktop only
const TAB_GROUPS: { label: string; tabs: typeof TABS }[] = [
  {
    label: 'Core',
    tabs: TABS.filter(t => ['terminal', 'personality', 'crm', 'templates', 'skills'].includes(t.id)),
  },
  {
    label: 'Communicate',
    tabs: TABS.filter(t => ['conversations', 'channels'].includes(t.id)),
  },
  {
    label: 'Configure',
    tabs: TABS.filter(t => ['ai-teams', 'voice', 'settings'].includes(t.id)),
  },
  {
    label: 'Integrate',
    tabs: TABS.filter(t => ['ghl', 'automation', 'delivery-sms'].includes(t.id)),
  },
  {
    label: 'Analyze',
    tabs: TABS.filter(t => ['usage', 'memory', 'seo'].includes(t.id)),
  },
  {
    label: 'Portal',
    tabs: TABS.filter(t => ['portal'].includes(t.id)),
  },
];

// Tabs locked behind Lite+ plans (hidden for free & solo_pro)
const PREMIUM_TABS: Tab[] = ['ai-teams', 'voice', 'delivery-sms', 'ghl', 'automation', 'seo'];

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
  // Free & Solo Pro accounts get a reduced tab set — premium features are Lite+ only
  const isFreeOrSolo = !plan || plan === 'free' || plan === 'solo_pro' || (plan === 'free' && accountType === 'solo');
  const visibleTabs = isFreeOrSolo ? TABS.filter(t => !PREMIUM_TABS.includes(t.id)) : TABS;
  const visibleTabGroups = TAB_GROUPS
    .map(g => ({ ...g, tabs: g.tabs.filter(t => !isFreeOrSolo || !PREMIUM_TABS.includes(t.id)) }))
    .filter(g => g.tabs.length > 0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'terminal';
  const justActivated = searchParams.get('activated') === 'true';
  const [activeTab, setActiveTab] = useState<Tab>(
    TABS.some(t => t.id === initialTab) ? initialTab : 'terminal'
  );

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

          {/* Client avatar */}
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 border border-indigo-200 flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0">
            {initialClient.name.charAt(0).toUpperCase()}
          </div>

          {/* Client name + badges */}
          <div className="min-w-0 flex items-center gap-2.5 flex-1">
            <h1 className="text-lg font-semibold text-gray-900 truncate">{initialClient.name}</h1>
            <Badge className={statusColors[initialClient.status]}>
              {initialClient.status}
            </Badge>
            {initialClient.industry && initialClient.industry !== 'General' && (
              <span className="text-xs text-gray-400 hidden sm:inline">{initialClient.industry}</span>
            )}
            {initialClient.template && (
              <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full hidden md:inline">
                {initialClient.template.name}
              </span>
            )}
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
        <aside className="hidden md:flex flex-col w-48 shrink-0 border-r border-gray-100 bg-white pt-2 pb-6 px-2 sticky top-0 self-start max-h-screen overflow-y-auto">
          {visibleTabGroups.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? 'mt-5' : ''}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-1">
                {group.label}
              </p>
              {group.tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors mb-0.5 ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
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
              {visibleTabs.map((tab) => {
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

          {/* Setup nudge — shown when AI has no personality or GHL configured */}
          <SetupNudgeBanner client={initialClient} onTabChange={handleTabChange} />

          {/* Tab content */}
          {activeTab === 'terminal' && (
            <TerminalTab client={initialClient} />
          )}
          {activeTab === 'personality' && (
            <AIPersonalityTab client={initialClient} />
          )}
          {activeTab === 'skills' && (
            <SkillsTab client={initialClient} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab client={initialClient} role={role} onRefresh={() => router.refresh()} />
          )}
          {activeTab === 'ghl' && (
            <GHLTab client={initialClient} onRefresh={() => router.refresh()} />
          )}
          {activeTab === 'usage' && (
            <UsageTab client={initialClient} />
          )}
          {activeTab === 'conversations' && (
            <ConversationsTab client={initialClient} />
          )}
          {activeTab === 'channels' && (
            <ChannelsTab client={initialClient} onTabChange={handleTabChange} />
          )}
          {activeTab === 'portal' && (
            <PortalTab client={initialClient} />
          )}

                {activeTab === 'memory' && (
            <div className="space-y-0">
              <CustomerIntelligence clientId={initialClient.id} />
              <div className="border-t border-gray-200 mt-6 pt-6 px-4 sm:px-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  AI Context Files (Advanced)
                </p>
                <MemoryBrowser clientId={initialClient.id} clientName={initialClient.name || 'Client'} />
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <VoiceClient
              agencyId={initialClient.agency_id}
              clientId={initialClient.id}
              clientName={initialClient.name ?? 'Client'}
              voiceConfig={(initialClient.container_config as Record<string, unknown>)?.voice_config as Record<string, string> | null ?? null}
              isSolo={false}
            />
          )}

          {activeTab === 'seo' && (
            <SEODashboard clientId={initialClient.id} clientName={initialClient.name || 'Client'} />
          )}
          {activeTab === 'templates' && (
            <AISetupClient
              agencyId={initialClient.agency_id}
              businessName={initialClient.name ?? 'Client'}
              clientId={initialClient.id}
              isSolo={false}
            />
          )}
          {activeTab === 'ai-teams' && (
            <AgentsClient />
          )}
          {activeTab === 'automation' && (
            <AutopilotClient />
          )}
          {activeTab === 'delivery-sms' && (
            <DeliverySmsTab clientId={initialClient.id} />
          )}
          {activeTab === 'crm' && (
            <CrmTab client={initialClient} />
          )}

        </main>
      </div>{/* end body */}
    </div>
  );
}


// ── Terminal Tab ──────────────────────────────────────────────────────────────

function TerminalTab({ client }: { client: AgencyClient }) {
  const gatewayUrl = (client as any).gateway_url as string | undefined;
  const gatewayToken = (client as any).gateway_token as string | undefined;
  const gatewayUrlWithToken = gatewayUrl && gatewayToken
    ? `${gatewayUrl}?token=${gatewayToken}`
    : gatewayUrl || null;

  if (!gatewayUrlWithToken) {
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
          href={gatewayUrlWithToken}
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
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      if (!res.ok) throw new Error('Failed to save');
      setSaveMessage({ type: 'success', text: 'Client updated.' });
      onRefresh();
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save.' });
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
      setSaveMessage({ type: 'success', text: 'AI model updated. Takes effect on next conversation.' });
      onRefresh();
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to update model.' });
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
      setSaveMessage({ type: 'success', text: 'Notes saved.' });
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save notes.' });
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
      setSaveMessage({ type: 'error', text: 'Failed to delete.' });
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
      setSaveMessage({ type: 'error', text: 'Export failed.' });
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
      setSaveMessage({ type: 'error', text: 'Export failed.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {saveMessage && (
        <div className={`rounded-md px-4 py-3 text-sm ${
          saveMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {saveMessage.text}
        </div>
      )}

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
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Changes</>}
          </Button>
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

// ── Permissions Tab ───────────────────────────────────────────────────────────

function PermissionsTab({ client }: { client: AgencyClient }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Control what this client&apos;s AI can do. Start in read-only mode and expand capabilities as you build confidence.
      </p>
      <PermissionsCard clientId={client.id} />
    </div>
  );
}

// ── Usage Tab ─────────────────────────────────────────────────────────────────

function UsageTab({ client }: { client: AgencyClient }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Messages handled, response times, and costs for this client&apos;s AI worker.
      </p>

      {/* ROI card — shows what this AI worker is worth vs. hiring staff */}
      <RoiSummaryCard
        totalConversations={client.usage_this_month ?? 0}
        plan="pro"
        billingCents={client.billing_amount_cents ?? 0}
        showLink={false}
      />

      <HealthScoreBadge clientId={client.id} showDetails />
      <ClientActivityHeatmap clientId={client.id} />
      <UsageAnalytics clientId={client.id} />
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
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/agency/clients/${client.id}/conversations`)
      .then(r => r.json())
      .then(d => {
        if (d.migrationRequired) { setMigrationRequired(true); return; }
        setConversations(d.conversations || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [client.id]);

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
          Use the Test Chat tab or share the portal link — conversations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''} logged</p>
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

// ── Channels Tab ──────────────────────────────────────────────────────────────
// Shows all available channels: web chat embed, email outreach, WhatsApp, voice.

function ChannelsTab({ client, onTabChange }: { client: AgencyClient; onTabChange?: (tab: Tab) => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const cfg = (client.container_config ?? {}) as Record<string, unknown>;
  const [widgetTitle, setWidgetTitle] = useState((cfg.widget_title as string) || '');
  const [widgetColor, setWidgetColor] = useState((cfg.widget_color as string) || '#6366f1');
  const [widgetGreeting, setWidgetGreeting] = useState((cfg.widget_greeting as string) || '');
  const [savingWidget, setSavingWidget] = useState(false);
  const [widgetSaved, setWidgetSaved] = useState(false);
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://kyra.conversionsystem.com';
  const scriptTag = `<script src="${appUrl}/api/widget/${client.id}/script" defer></script>`;

  const saveWidgetAppearance = async () => {
    setSavingWidget(true);
    try {
      await fetch(`/api/agency/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          container_config: {
            ...cfg,
            widget_title: widgetTitle.trim() || undefined,
            widget_color: widgetColor || '#6366f1',
            widget_greeting: widgetGreeting.trim() || undefined,
          },
        }),
      });
      setWidgetSaved(true);
      setTimeout(() => setWidgetSaved(false), 2000);
    } catch { /* ignore */ }
    setSavingWidget(false);
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Channels</h2>
        <p className="text-sm text-gray-500 mt-1">
          Connect your client AI to every surface customers use — from your website to WhatsApp to voice calls.
        </p>
      </div>

      {/* ── Web Chat Widget ─────────────────────────────────────────────── */}
      <Card className="border-indigo-100">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Globe className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-base">Web Chat Widget</CardTitle>
              <CardDescription className="text-xs">Embed a live chat bubble on any website — no GHL required</CardDescription>
            </div>
            <span className="ml-auto text-[10px] bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">✅ Ready</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Drop one line of code on any webpage. A floating chat bubble appears — customers type, your AI responds instantly.
            Sessions persist per browser via <code className="text-xs bg-gray-100 px-1 rounded">localStorage</code>.
          </p>

          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Embed snippet — paste before <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code></p>
            <div className="flex items-start gap-2">
              <div className="flex-1 bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 overflow-x-auto">
                {scriptTag}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => copy(scriptTag, 'script')}
              >
                {copied === 'script' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* ── Widget Appearance ── */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-700 mb-3">Customize appearance</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Widget Title</label>
                  <Input value={widgetTitle} onChange={(e) => setWidgetTitle(e.target.value)} placeholder={`Chat with ${client.name}`} className="bg-gray-50 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Brand Colour</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={widgetColor} onChange={(e) => setWidgetColor(e.target.value)} className="h-8 w-10 rounded border border-gray-200 cursor-pointer bg-white p-0.5" />
                    <Input value={widgetColor} onChange={(e) => setWidgetColor(e.target.value)} placeholder="#6366f1" className="bg-gray-50 font-mono text-sm flex-1" maxLength={7} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Opening Greeting</label>
                  <Textarea value={widgetGreeting} onChange={(e) => setWidgetGreeting(e.target.value)} placeholder="Hi! 👋 How can I help you today?" rows={2} className="bg-gray-50 text-sm" />
                </div>
                <Button size="sm" onClick={saveWidgetAppearance} disabled={savingWidget} className="mt-1">
                  {savingWidget ? 'Saving...' : widgetSaved ? '✅ Saved' : 'Save Appearance'}
                </Button>
              </div>
              {/* Live preview */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs font-medium text-gray-500 self-start">Preview</p>
                <div className="w-full rounded-xl overflow-hidden border border-gray-200 shadow-lg text-[11px]">
                  <div className="flex items-center gap-2 px-3 py-2" style={{ background: widgetColor }}>
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-[9px]">🤖</div>
                    <div className="text-white font-semibold text-xs">{widgetTitle || `Chat with ${client.name}`}</div>
                  </div>
                  <div className="bg-gray-50 px-3 py-2.5 space-y-1.5 min-h-[60px]">
                    <div className="flex items-end gap-1">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] shrink-0" style={{ background: widgetColor }}>🤖</div>
                      <div className="bg-white rounded-lg rounded-bl-sm px-2 py-1 shadow-sm text-gray-800 max-w-[80%] text-[10px]">{widgetGreeting || 'Hi! 👋 How can I help you today?'}</div>
                    </div>
                  </div>
                  <div className="bg-white border-t border-gray-100 px-2 py-1.5 flex items-center gap-1.5">
                    <div className="flex-1 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-gray-400 text-[10px]">Type a message...</div>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: widgetColor }}>
                      <svg viewBox="0 0 24 24" width="8" height="8" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => window.open(`${appUrl}/api/widget/${client.id}/script`, '_blank')}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Preview script
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => copy(`${appUrl}/api/widget/chat`, 'api')}
            >
              {copied === 'api' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              Copy API endpoint
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── GHL (existing) ──────────────────────────────────────────────── */}
      <Card className="border-green-100">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-base">GHL (SMS + Multi-channel)</CardTitle>
              <CardDescription className="text-xs">SMS, WhatsApp, Instagram, FB Messenger, Live Chat, Google Business — all via GHL</CardDescription>
            </div>
            <span className="ml-auto text-[10px] bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">✅ Active</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Connect GHL in the <strong>GHL tab</strong> and the AI automatically handles all channels your client has connected — SMS, WhatsApp, Instagram DMs, Facebook Messenger, Live Chat, and Google My Business. No extra setup needed per channel.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['SMS', 'WhatsApp (via GHL)', 'Instagram DMs', 'FB Messenger', 'Live Chat', 'Google Business'].map(ch => (
              <span key={ch} className="text-[11px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">{ch}</span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Zapier / Make / n8n ─────────────────────────────────────────── */}
      <ZapierChannelCard client={client} appUrl={appUrl} copy={copy} copied={copied} />

      {/* ── Email Outreach ──────────────────────────────────────────────── */}
      <Card className="border-blue-100">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Email Outreach</CardTitle>
              <CardDescription className="text-xs">AI-personalized emails via Resend — follow-ups, welcome emails, nurture sequences</CardDescription>
            </div>
            <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">⚙️ Needs API Key</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>Add <code className="bg-amber-100 px-1 rounded font-mono">RESEND_API_KEY</code> to your <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-medium">Vercel env vars</a> to enable email sending. Get a free key at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">resend.com</a>.</span>
          </div>
          <p className="text-sm text-gray-600">
            Trigger AI-written, personalized emails from your GHL workflows or cron jobs. Uses the client AI&apos;s personality to craft each email.
          </p>

          <div>
            <p className="text-xs font-medium text-gray-700 mb-1.5">API call (from GHL workflow or cron)</p>
            <div className="flex items-start gap-2">
              <pre className="flex-1 bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 overflow-x-auto whitespace-pre">{`POST ${appUrl}/api/channels/email
Authorization: Bearer YOUR_KYRA_API_SECRET

{
  "clientId": "${client.id}",
  "to": "customer@email.com",
  "toName": "John",
  "templateId": "follow_up",
  "context": "they just booked a demo call"
}`}</pre>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => copy(`POST ${appUrl}/api/channels/email\nAuthorization: Bearer YOUR_KYRA_API_SECRET\n\n{\n  "clientId": "${client.id}",\n  "to": "customer@email.com",\n  "templateId": "follow_up"\n}`, 'email')}
              >
                {copied === 'email' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            <span className="font-medium">Templates:</span> <code className="bg-gray-100 px-1 rounded">follow_up</code> · <code className="bg-gray-100 px-1 rounded">welcome</code> · <code className="bg-gray-100 px-1 rounded">nurture</code> · <code className="bg-gray-100 px-1 rounded">custom</code>
          </div>
        </CardContent>
      </Card>

      {/* ── WhatsApp Direct ─────────────────────────────────────────────── */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <CardTitle className="text-base text-gray-700">WhatsApp Business API (Direct)</CardTitle>
              <CardDescription className="text-xs">Meta Cloud API — no GHL dependency</CardDescription>
            </div>
            <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">⚙️ Setup Required</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Use this if your client wants WhatsApp without GHL. Requires a Meta Business account and phone number approval.
          </p>
          <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Setup steps:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">developers.facebook.com</a> → create app → add WhatsApp</li>
              <li>Get a <strong>System User Access Token</strong> (permanent) + <strong>Phone Number ID</strong></li>
              <li>Add to Vercel env: <code className="bg-amber-100 px-1 rounded">WHATSAPP_ACCESS_TOKEN</code>, <code className="bg-amber-100 px-1 rounded">WHATSAPP_PHONE_NUMBER_ID</code>, <code className="bg-amber-100 px-1 rounded">WHATSAPP_VERIFY_TOKEN</code> (any string), <code className="bg-amber-100 px-1 rounded">WHATSAPP_DEFAULT_CLIENT_ID={client.id}</code></li>
              <li>Set webhook URL in Meta: <code className="bg-amber-100 px-1 rounded break-all">{appUrl}/api/channels/whatsapp-direct</code></li>
              <li>Subscribe to: <strong>messages</strong></li>
            </ol>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => copy(`${appUrl}/api/channels/whatsapp-direct`, 'wa')}
          >
            {copied === 'wa' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
            Copy webhook URL
          </Button>
        </CardContent>
      </Card>

      {/* ── Telegram ───────────────────────────────────────────────────── */}
      <Card className="border-sky-100">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <CardTitle className="text-base">Telegram</CardTitle>
              <CardDescription className="text-xs">The fastest setup — get your AI worker live on Telegram in under 5 minutes</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">@BotFather</a>, paste the token in the Terminal config, and your AI is live.</p>
          <p className="text-xs text-gray-400">Configure via the <strong>Terminal</strong> → OpenClaw config → channels.telegram</p>
        </CardContent>
      </Card>

      {/* ── Discord ─────────────────────────────────────────────────────── */}
      <Card className="border-violet-100">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-base">Discord</CardTitle>
              <CardDescription className="text-xs">Deploy your AI across Discord servers — great for community businesses</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>Create a bot at the <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">Discord Developer Portal</a>, add it to your server, and paste the token.</p>
          <p className="text-xs text-gray-400">Configure via the <strong>Terminal</strong> → OpenClaw config → channels.discord</p>
        </CardContent>
      </Card>

      {/* ── Slack ───────────────────────────────────────────────────────── */}
      <Card className="border-orange-100">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-base">Slack</CardTitle>
              <CardDescription className="text-xs">Add your AI worker to any Slack workspace</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          <p>Create a Slack App at <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">api.slack.com</a>, enable Socket Mode, and add the bot token.</p>
          <p className="text-xs text-gray-400 mt-2">Configure via the <strong>Terminal</strong> → OpenClaw config → channels.slack</p>
        </CardContent>
      </Card>

      {/* ── Signal / iMessage / Google Chat ──────────────────────────── */}
      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
              <Radio className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <CardTitle className="text-base">More Channels</CardTitle>
              <CardDescription className="text-xs">Signal, iMessage, Google Chat, IRC, Line — 20+ channels supported</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          <p>OpenClaw supports 20+ messaging channels. Configure any channel through the Terminal → OpenClaw gateway config.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['Signal', 'iMessage', 'Google Chat', 'IRC', 'Line'].map(ch => (
              <span key={ch} className="text-[11px] bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">{ch}</span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Voice AI — managed in dedicated tab ──────────────────────── */}
      <Card className="rounded-2xl border border-gray-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Voice AI</h3>
                <p className="text-xs text-gray-500 mt-0.5">Inbound & outbound phone calls powered by Kyra Native</p>
              </div>
            </div>
            <button
              onClick={() => onTabChange?.('voice')}
              className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              Configure →
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
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
                  className="shrink-0 px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
