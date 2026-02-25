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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { AgencyClient, AgencyMember } from '@/lib/agency/queries';
import GHLConnection from './ghl-connection';
import { UsageAnalytics } from './usage-analytics';
import PermissionsCard from './permissions-card';
import HealthScoreBadge from '@/components/dashboard/health-score-badge';
import AISuggestionsCard from '@/components/dashboard/ai-suggestions-card';
import ClientStatusBanner from '@/components/dashboard/client-status-banner';
import ClientActivityHeatmap from '@/components/dashboard/client-activity-heatmap';
import { VoiceChannelCard } from '@/components/dashboard/voice-channel-card';
import RoiSummaryCard from '@/components/dashboard/roi-summary-card';

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
  if (!hasGHL) missing.push({ label: 'Connect GHL', tab: 'ghl', desc: 'Link a GHL sub-account so the AI responds to your contacts' });

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

type Tab = 'chat' | 'personality' | 'settings' | 'ghl' | 'permissions' | 'usage' | 'conversations' | 'channels' | 'portal';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'Test Chat', icon: MessageSquare },
  { id: 'personality', label: 'AI Personality', icon: Brain },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'ghl', label: 'GHL', icon: Link2 },
  { id: 'permissions', label: 'Permissions', icon: Shield },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
  { id: 'conversations', label: 'Conversations', icon: Inbox },
  { id: 'channels', label: 'Channels', icon: Radio },
  { id: 'portal', label: 'Client Portal', icon: Users },
];

interface ClientDetailViewProps {
  client: AgencyClient;
  role: AgencyMember['role'];
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

export function ClientDetailView({ client: initialClient, role }: ClientDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'chat';
  const [activeTab, setActiveTab] = useState<Tab>(
    TABS.some(t => t.id === initialTab) ? initialTab : 'chat'
  );

  // Update URL when tab changes (without full reload)
  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  }, []);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl">
      {/* Back link */}
      <Link
        href="/agency/clients"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-4 sm:mb-6"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Clients
      </Link>

      {/* Client Header */}
      <div className="flex items-start gap-3 sm:gap-4 mb-6">
        <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-lg sm:text-xl font-bold text-gray-700 shrink-0">
          {initialClient.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{initialClient.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge className={statusColors[initialClient.status]}>
              {initialClient.status}
            </Badge>
            <span className="text-sm text-gray-400">
              {initialClient.industry || 'No industry'}
            </span>
            {initialClient.template && (
              <span className="text-sm text-gray-400 hidden sm:inline">
                · {initialClient.template.name}
              </span>
            )}
          </div>
        </div>
        {/* Show Deploy AI button if gateway not running */}
        {(!initialClient.gateway_status || initialClient.gateway_status === 'error') && (
          <div className="shrink-0">
            <ReprovisionButton clientId={initialClient.id} />
          </div>
        )}
      </div>

      {/* Tab bar — scrollable on mobile */}
      <div className="border-b border-gray-200 mb-6 -mx-4 sm:mx-0 px-4 sm:px-0">
        <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ').pop()}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Status banners — gateway errors, GHL disconnect, missing API key */}
      <ClientStatusBanner client={initialClient} />

      {/* Setup nudge — shown when AI has no personality or GHL configured */}
      <SetupNudgeBanner client={initialClient} onTabChange={handleTabChange} />

      {/* Tab content */}
      {activeTab === 'chat' && (
        <TestChatTab client={initialClient} />
      )}
      {activeTab === 'personality' && (
        <AIPersonalityTab client={initialClient} />
      )}
      {activeTab === 'settings' && (
        <SettingsTab client={initialClient} role={role} onRefresh={() => router.refresh()} />
      )}
      {activeTab === 'ghl' && (
        <GHLTab client={initialClient} onRefresh={() => router.refresh()} />
      )}
      {activeTab === 'permissions' && (
        <PermissionsTab client={initialClient} />
      )}
      {activeTab === 'usage' && (
        <UsageTab client={initialClient} />
      )}
      {activeTab === 'conversations' && (
        <ConversationsTab client={initialClient} />
      )}
      {activeTab === 'channels' && (
        <ChannelsTab client={initialClient} />
      )}
      {activeTab === 'portal' && (
        <PortalTab client={initialClient} />
      )}
    </div>
  );
}

// ── Test Chat Tab ─────────────────────────────────────────────────────────────

function TestChatTab({ client }: { client: AgencyClient }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const gatewayUrl = (client as any).gateway_url as string | undefined;
  const gatewayToken = (client as any).gateway_token as string | undefined;

  // Include ?token= so the browser auto-authenticates (bypasses stale device identity)
  const gatewayUrlWithToken = gatewayUrl && gatewayToken
    ? `${gatewayUrl}?token=${gatewayToken}`
    : gatewayUrl;

  // Clients get the real OpenClaw terminal — share the gateway URL with token directly
  const shareUrl = gatewayUrlWithToken ?? (typeof window !== 'undefined'
    ? `${window.location.origin}/portal/${client.id}`
    : `/portal/${client.id}`);

  const handleCopyPortalLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSending) return;
    const userMessage = chatInput.trim();
    setChatInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    setIsSending(true);

    try {
      const res = await fetch(`/api/agency/clients/${client.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) throw new Error('Chat request failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No reader');

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content' && parsed.content) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + parsed.content };
                }
                return updated;
              });
            } else if (parsed.type === 'error') {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant' && !last.content) {
                  updated[updated.length - 1] = { ...last, content: `⚠️ ${parsed.message || 'Stream error'}` };
                }
                return updated;
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1), // Remove empty assistant msg
        { role: 'assistant', content: '⚠️ Network error. Could not reach the chat endpoint.' },
      ]);
    }

    setIsSending(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  return (
    <div>
      {/* ── Terminal Access Panel ── */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-indigo-500" />
              OpenClaw Terminal
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Full control — memory, automations, channels, personality, files. Share with your client so they can manage their own AI.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {gatewayUrl ? (
              <a
                href={gatewayUrlWithToken || gatewayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition text-white text-xs font-semibold"
              >
                <Terminal className="h-3.5 w-3.5" />
                Open Terminal
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-200 text-gray-400 text-xs font-semibold cursor-not-allowed">
                <Terminal className="h-3.5 w-3.5" />
                No terminal yet
              </span>
            )}
            <button
              onClick={handleCopyPortalLink}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition text-gray-700 text-xs font-semibold"
              title="Copy OpenClaw terminal link for your client"
            >
              {copied
                ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Copied</>
                : <><Share2 className="h-3.5 w-3.5" /> Share with Client</>
              }
            </button>
          </div>
        </div>
        {/* Client's OpenClaw terminal URL */}
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
          <Terminal className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          <span className="text-[10px] font-mono text-indigo-700 truncate flex-1">{shareUrl}</span>
          <button
            onClick={handleCopyPortalLink}
            className="shrink-0 text-indigo-400 hover:text-indigo-700"
            title="Copy OpenClaw terminal link"
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Performance Report link */}
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2">
        <span className="text-[10px] text-green-700 flex-1">📊 Share performance report with your client</span>
        <a
          href={`/report/${client.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[10px] font-semibold text-green-700 hover:text-green-900 flex items-center gap-1"
        >
          View <ExternalLink className="h-3 w-3" />
        </a>
        <button
          onClick={() => { navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/report/${client.id}`); }}
          className="shrink-0 text-green-500 hover:text-green-700"
          title="Copy performance report link"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Test Chat ── */}
      <p className="text-sm text-gray-500 mb-3 mt-4">
        Test the AI below — or share the portal link with your client so they can control it directly.
      </p>
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm h-96 overflow-y-auto mb-3 p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">
              Type a message to test this client&apos;s AI...
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.content || (isSending && i === messages.length - 1 ? '...' : '')}
              </div>
            </div>
          ))
        )}
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="flex gap-2">
        <Input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Type a message..."
          className="bg-gray-100 border-gray-200"
          disabled={isSending}
        />
        <Button onClick={handleSendMessage} disabled={isSending || !chatInput.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── AI Personality Tab ────────────────────────────────────────────────────────

function AIPersonalityTab({ client }: { client: AgencyClient }) {
  const cfg = (client.container_config as Record<string, unknown>) || {};
  const bhCfg = (cfg.business_hours as { enabled?: boolean; start?: string; end?: string; timezone?: string }) || {};

  const [greeting, setGreeting] = useState(cfg.greeting as string || '');
  const [instructions, setInstructions] = useState(cfg.instructions as string || '');
  const [persona, setPersona] = useState(cfg.persona as string || '');
  const [calendarUrl, setCalendarUrl] = useState((cfg.calendar_url as string) || '');
  const [responseLanguage, setResponseLanguage] = useState((cfg.response_language as string) || 'English');
  // Widget appearance config
  const [widgetTitle, setWidgetTitle] = useState((cfg.widget_title as string) || '');
  const [widgetColor, setWidgetColor] = useState((cfg.widget_color as string) || '#6366f1');
  const [widgetGreeting, setWidgetGreeting] = useState((cfg.widget_greeting as string) || '');
  const [bhEnabled, setBhEnabled] = useState(bhCfg.enabled ?? false);
  const [bhStart, setBhStart] = useState(bhCfg.start ?? '09:00');
  const [bhEnd, setBhEnd] = useState(bhCfg.end ?? '17:00');
  const [bhTimezone, setBhTimezone] = useState(bhCfg.timezone ?? 'America/New_York');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Proactive greeting
  const [proactiveEnabled, setProactiveEnabled] = useState((cfg.proactive_enabled as boolean) ?? false);
  const [proactiveGreeting, setProactiveGreeting] = useState((cfg.proactive_greeting as string) ?? '');

  // Wake words — keyword → action pairs
  type WakeWordAction = 'pause' | 'escalate' | 'custom';
  interface WakeWord { keyword: string; action: WakeWordAction; response: string }
  const [wakeWords, setWakeWords] = useState<WakeWord[]>(
    (cfg.wake_words as WakeWord[]) ?? []
  );

  const addWakeWord = () =>
    setWakeWords((prev) => [...prev, { keyword: '', action: 'escalate', response: '' }]);

  const removeWakeWord = (i: number) =>
    setWakeWords((prev) => prev.filter((_, idx) => idx !== i));

  const updateWakeWord = (i: number, patch: Partial<WakeWord>) =>
    setWakeWords((prev) => prev.map((w, idx) => idx === i ? { ...w, ...patch } : w));

  // Auto-train from website
  const [websiteUrl, setWebsiteUrl] = useState((cfg.website_url as string) || '');
  const [isAutoTraining, setIsAutoTraining] = useState(false);
  const [autoTrainResult, setAutoTrainResult] = useState<{
    documentsCreated: number;
    documents: string[];
    pagesScraped: number;
    persona?: string | null;
    personaUpdated?: boolean;
  } | null>(null);

  const handleAutoTrain = async () => {
    if (!websiteUrl.trim()) return;
    setIsAutoTraining(true);
    setMessage(null);
    setAutoTrainResult(null);
    try {
      const res = await fetch('/api/agency/knowledge/auto-train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, websiteUrl: websiteUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auto-training failed');
      setAutoTrainResult(data);
      if (data.personaUpdated && data.persona) {
        setPersona(data.persona);
      }
      setMessage({
        type: 'success',
        text: `🧠 Trained from ${data.pagesScraped} pages — created ${data.documentsCreated} knowledge documents!`,
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsAutoTraining(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/agency/clients/${client.id}/generate-personality`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: client.name, industry: client.industry }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Generation failed');
      if (d.persona) setPersona(d.persona);
      if (d.greeting) setGreeting(d.greeting);
      if (d.instructions) setInstructions(d.instructions);
      setMessage({ type: 'success', text: '✨ Personality generated! Review the fields below, then click Save.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/agency/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          container_config: {
            ...cfg,
            greeting,
            instructions,
            persona,
            business_hours: { enabled: bhEnabled, start: bhStart, end: bhEnd, timezone: bhTimezone },
            calendar_url: calendarUrl.trim() || undefined,
            response_language: responseLanguage || 'English',
            widget_title: widgetTitle.trim() || undefined,
            widget_color: widgetColor || '#6366f1',
            widget_greeting: widgetGreeting.trim() || undefined,
            proactive_enabled: proactiveEnabled,
            proactive_greeting: proactiveGreeting.trim() || undefined,
            wake_words: wakeWords.filter((w) => w.keyword.trim()),
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setMessage({ type: 'success', text: 'AI personality saved.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save. Try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-gray-500">
          Define how this client&apos;s AI assistant behaves — its personality, greeting message, and detailed instructions.
        </p>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
        >
          {isGenerating ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</>
          ) : (
            <>✨ Generate with AI</>
          )}
        </Button>
      </div>

      <AISuggestionsCard clientId={client.id} />

      {message && (
        <div className={`rounded-md px-4 py-3 text-sm ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Auto-Train from Website */}
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-500" />
            Train from Website
          </CardTitle>
          <CardDescription>
            Paste a website URL and the AI will learn the business — services, FAQ, pricing, hours, and more. Takes about 30 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="e.g., https://smilefamilydental.com"
              className="bg-white"
              onKeyDown={(e) => e.key === 'Enter' && handleAutoTrain()}
            />
            <Button
              onClick={handleAutoTrain}
              disabled={isAutoTraining || !websiteUrl.trim()}
              className="shrink-0 gap-1.5 bg-indigo-600 hover:bg-indigo-700"
            >
              {isAutoTraining ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning...</>
              ) : (
                <>🧠 Auto-Train</>
              )}
            </Button>
          </div>
          {isAutoTraining && (
            <p className="text-xs text-indigo-500 mt-2 animate-pulse">
              Scraping website pages, extracting business knowledge with AI...
            </p>
          )}
          {autoTrainResult && (
            <div className="mt-3 rounded-md bg-green-50 border border-green-200 p-3 text-sm">
              <p className="font-medium text-green-800">
                ✅ Trained from {autoTrainResult.pagesScraped} pages
              </p>
              <p className="text-green-700 mt-1">
                Created {autoTrainResult.documentsCreated} knowledge {autoTrainResult.documentsCreated === 1 ? 'document' : 'documents'}:
              </p>
              <ul className="mt-1 space-y-0.5">
                {autoTrainResult.documents.map((doc, i) => (
                  <li key={i} className="text-green-600 text-xs flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {doc}
                  </li>
                ))}
              </ul>
              {autoTrainResult.personaUpdated && (
                <p className="text-green-600 text-xs mt-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> AI persona auto-updated ↓
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Persona</CardTitle>
          <CardDescription>
            A short description of who the AI is. Example: &quot;Friendly dental receptionist named Sarah&quot;
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            placeholder="e.g., Professional dental receptionist named Sarah who is warm and helpful"
            className="bg-gray-50"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Greeting Message</CardTitle>
          <CardDescription>
            The first message sent to new contacts. Leave empty for a contextual auto-greeting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            placeholder="e.g., Hi! Thanks for reaching out to Smile Dental. How can I help you today?"
            rows={3}
            className="bg-gray-50"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detailed Instructions</CardTitle>
          <CardDescription>
            Business-specific rules, FAQs, pricing, hours, and anything the AI needs to know.
            The more detail, the better the responses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={`e.g.,\n\nBusiness: Smile Dental Clinic\nHours: Mon-Fri 9am-5pm, Sat 9am-1pm\nAddress: 123 Main St, Springfield\n\nServices & Pricing:\n- Cleaning: $150\n- Whitening: $300\n- Crown: $800-1200\n\nRules:\n- Always offer to schedule an appointment\n- Never discuss competitor pricing\n- For emergencies, direct to call (555) 123-4567`}
            rows={12}
            className="bg-gray-50 font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            📅 Calendar Booking Link
          </CardTitle>
          <CardDescription>
            When customers mention booking or scheduling, the AI automatically includes this link. Get it from GHL → Calendars → your calendar → share link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={calendarUrl}
            onChange={(e) => setCalendarUrl(e.target.value)}
            placeholder="https://booking.leadconnectorhq.com/your-calendar-id"
            className="bg-gray-50 font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* ── Response Language ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            🌐 Response Language
          </CardTitle>
          <CardDescription>
            The AI will always respond in this language, regardless of what language the customer uses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <select
            value={responseLanguage}
            onChange={(e) => setResponseLanguage(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            {[
              'English', 'Spanish (Español)', 'Portuguese (Português)', 'French (Français)',
              'German (Deutsch)', 'Italian (Italiano)', 'Chinese (中文)', 'Japanese (日本語)',
              'Korean (한국어)', 'Arabic (العربية)', 'Hindi (हिन्दी)', 'Russian (Русский)',
              'Dutch (Nederlands)', 'Polish (Polski)', 'Turkish (Türkçe)',
            ].map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-2">
            💡 Spanish is the most common choice for US GHL agencies — dental, cannabis, restaurants, and home services all serve large Spanish-speaking customer bases.
          </p>
        </CardContent>
      </Card>

      {/* ── Web Chat Widget Appearance ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-500" /> Web Chat Widget Appearance
          </CardTitle>
          <CardDescription>
            Customise the chat bubble on your client&apos;s website. Changes take effect within 5 minutes (CDN cache).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left — fields */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Widget Title</label>
                <Input
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
                  placeholder={`Chat with ${client.name}`}
                  className="bg-gray-50 text-sm"
                />
                <p className="text-[11px] text-gray-400">Shown in the chat header. Defaults to &quot;Chat with [name]&quot;.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Brand Colour</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={widgetColor}
                    onChange={(e) => setWidgetColor(e.target.value)}
                    className="h-9 w-12 rounded border border-gray-200 cursor-pointer bg-white p-0.5"
                  />
                  <Input
                    value={widgetColor}
                    onChange={(e) => setWidgetColor(e.target.value)}
                    placeholder="#6366f1"
                    className="bg-gray-50 font-mono text-sm flex-1"
                    maxLength={7}
                  />
                </div>
                <p className="text-[11px] text-gray-400">Chat bubble and header background. Hex code.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Opening Greeting</label>
                <Textarea
                  value={widgetGreeting}
                  onChange={(e) => setWidgetGreeting(e.target.value)}
                  placeholder="Hi! 👋 How can I help you today?"
                  rows={2}
                  className="bg-gray-50 text-sm"
                />
                <p className="text-[11px] text-gray-400">First message shown when widget opens.</p>
              </div>
            </div>

            {/* Right — live preview */}
            <div className="flex flex-col items-center justify-center gap-3">
              <p className="text-xs font-medium text-gray-500 self-start">Preview</p>

              {/* Mini chat panel */}
              <div className="w-full rounded-xl overflow-hidden border border-gray-200 shadow-lg text-[11px]">
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: widgetColor }}>
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs">🤖</div>
                  <div className="flex-1">
                    <div className="text-white font-semibold">{widgetTitle || `Chat with ${client.name}`}</div>
                    <div className="text-white/70" style={{ fontSize: '9px' }}>Typically replies instantly</div>
                  </div>
                  <div className="text-white/70 text-base leading-none">✕</div>
                </div>

                {/* Messages */}
                <div className="bg-gray-50 px-3 py-3 space-y-2 min-h-[80px]">
                  <div className="flex items-end gap-1.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] shrink-0" style={{ background: widgetColor }}>🤖</div>
                    <div className="bg-white rounded-xl rounded-bl-sm px-2.5 py-1.5 shadow-sm text-gray-800 max-w-[80%]">
                      {widgetGreeting || 'Hi! 👋 How can I help you today?'}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="rounded-xl rounded-br-sm px-2.5 py-1.5 text-white max-w-[70%]" style={{ background: widgetColor }}>
                      Hi, I have a question!
                    </div>
                  </div>
                </div>

                {/* Input bar */}
                <div className="bg-white border-t border-gray-100 px-3 py-2 flex items-center gap-2">
                  <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-gray-400">Type a message...</div>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: widgetColor }}>
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </div>
                </div>
              </div>

              {/* Floating bubble preview */}
              <div className="flex items-center gap-2 self-end mt-1">
                <span className="text-[11px] text-gray-400">Chat bubble:</span>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg" style={{ background: widgetColor }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            ⏰ Business Hours
          </CardTitle>
          <CardDescription>
            AI only replies during these hours. Outside hours, messages are ignored until the next business day.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="bh-enabled"
              checked={bhEnabled}
              onChange={(e) => setBhEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600"
            />
            <label htmlFor="bh-enabled" className="text-sm text-gray-700 font-medium">
              Enable business hours restriction
            </label>
          </div>
          {bhEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Open</label>
                <Input type="time" value={bhStart} onChange={(e) => setBhStart(e.target.value)} className="bg-gray-50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Close</label>
                <Input type="time" value={bhEnd} onChange={(e) => setBhEnd(e.target.value)} className="bg-gray-50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Timezone</label>
                <select
                  value={bhTimezone}
                  onChange={(e) => setBhTimezone(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                >
                  <option value="America/New_York">Eastern (ET)</option>
                  <option value="America/Chicago">Central (CT)</option>
                  <option value="America/Denver">Mountain (MT)</option>
                  <option value="America/Los_Angeles">Pacific (PT)</option>
                  <option value="America/Phoenix">Arizona (AZ)</option>
                  <option value="Europe/London">London (GMT/BST)</option>
                  <option value="Europe/Bratislava">Bratislava (CET)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proactive first message + Wake words */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Proactive Greeting</CardTitle>
          <CardDescription>
            When a new GHL contact is added, should the AI reach out first? Enable this and set the opening message.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setProactiveEnabled(!proactiveEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${proactiveEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${proactiveEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <label className="text-sm font-medium text-gray-700">
              {proactiveEnabled ? 'AI reaches out to new contacts' : 'Proactive greeting disabled'}
            </label>
          </div>
          {proactiveEnabled && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Opening message</label>
              <Textarea
                value={proactiveGreeting}
                onChange={(e) => setProactiveGreeting(e.target.value)}
                placeholder={`Hi {{firstName}}, this is ${client.name}'s AI assistant! How can I help you today?`}
                className="bg-gray-50 min-h-[80px] text-sm"
              />
              <p className="text-xs text-gray-400">Use {'{{firstName}}'} and {'{{lastName}}'} to personalize with GHL contact data.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>⚡ Wake Words</CardTitle>
          <CardDescription>
            Keywords that trigger a specific AI behavior. When a customer says one of these words, the AI takes the configured action.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {wakeWords.length === 0 && (
            <p className="text-sm text-gray-400 italic">No wake words configured. Add one below.</p>
          )}
          {wakeWords.map((w, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-lg border border-gray-100 bg-gray-50">
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Keyword (e.g. STOP)"
                  value={w.keyword}
                  onChange={(e) => updateWakeWord(i, { keyword: e.target.value })}
                  className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400 uppercase"
                />
                <select
                  value={w.action}
                  onChange={(e) => updateWakeWord(i, { action: e.target.value as WakeWordAction })}
                  className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
                >
                  <option value="pause">Pause AI responses</option>
                  <option value="escalate">Escalate to human</option>
                  <option value="custom">Reply with custom text</option>
                </select>
                {w.action === 'custom' && (
                  <input
                    type="text"
                    placeholder="Custom reply text…"
                    value={w.response}
                    onChange={(e) => updateWakeWord(i, { response: e.target.value })}
                    className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => removeWakeWord(i)}
                className="shrink-0 mt-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addWakeWord}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Add wake word
          </button>
          <p className="text-xs text-gray-400">
            Common wake words: STOP (pause), UNSUBSCRIBE (pause), HUMAN / AGENT (escalate), PRICE (custom reply).
          </p>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving} className="gap-2">
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save Personality
          </>
        )}
      </Button>
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
    portal: 'bg-purple-50 text-purple-600 border-purple-200',
    telegram: 'bg-sky-50 text-sky-600 border-sky-200',
    sms: 'bg-green-50 text-green-600 border-green-200',
    ghl_sms: 'bg-green-50 text-green-600 border-green-200',
    ghl_email: 'bg-orange-50 text-orange-600 border-orange-200',
    whatsapp: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  };

  const channelLabel: Record<string, string> = {
    test_chat: 'Test Chat', portal: 'Portal', telegram: 'Telegram',
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

function ChannelsTab({ client }: { client: AgencyClient }) {
  const [copied, setCopied] = useState<string | null>(null);
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://kyra.conversionsystem.com';
  const scriptTag = `<script src="${appUrl}/api/widget/${client.id}/script" defer></script>`;

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

          <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-700 space-y-1">
            <p className="font-medium">Widget customization</p>
            <p>To change the chat title, greeting, or brand color — update these in your client's <strong>Personality</strong> tab (coming soon to widget config). Current defaults use the client's name and indigo theme.</p>
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

      {/* ── Voice AI — VAPI / Synthflow / Retell ─────────────────────── */}
      <VoiceChannelCard client={client} />
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
                  className="shrink-0 px-3 py-2 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
