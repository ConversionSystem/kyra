'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { AgencyClient, AgencyMember } from '@/lib/agency/queries';
import GHLConnection from './ghl-connection';
import { UsageAnalytics } from './usage-analytics';
import PermissionsCard from './permissions-card';

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

type Tab = 'chat' | 'personality' | 'settings' | 'ghl' | 'permissions' | 'usage' | 'conversations';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'Test Chat', icon: MessageSquare },
  { id: 'personality', label: 'AI Personality', icon: Brain },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'ghl', label: 'GHL', icon: Link2 },
  { id: 'permissions', label: 'Permissions', icon: Shield },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
  { id: 'conversations', label: 'Conversations', icon: Inbox },
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
  const [activeTab, setActiveTab] = useState<Tab>('chat');

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
                onClick={() => setActiveTab(tab.id)}
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

      {/* Setup nudge — shown when AI has no personality or GHL configured */}
      <SetupNudgeBanner client={initialClient} onTabChange={setActiveTab} />

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

      {/* ── Test Chat ── */}
      <p className="text-sm text-gray-500 mb-3">
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
  const [bhEnabled, setBhEnabled] = useState(bhCfg.enabled ?? false);
  const [bhStart, setBhStart] = useState(bhCfg.start ?? '09:00');
  const [bhEnd, setBhEnd] = useState(bhCfg.end ?? '17:00');
  const [bhTimezone, setBhTimezone] = useState(bhCfg.timezone ?? 'America/New_York');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      <p className="text-sm text-gray-500">
        Define how this client&apos;s AI assistant behaves — its personality, greeting message, and detailed instructions.
      </p>

      {message && (
        <div className={`rounded-md px-4 py-3 text-sm ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

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
            <div className="grid grid-cols-3 gap-3">
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

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>Download conversation logs and reports as Markdown files.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative inline-block" ref={exportMenuRef}>
            <Button variant="outline" className="gap-2" onClick={() => setShowExportMenu(!showExportMenu)} disabled={isExporting}>
              {isExporting ? <><Loader2 className="h-4 w-4 animate-spin" /> Exporting...</> : <><FileDown className="h-4 w-4" /> Export<ChevronDown className="h-3 w-3" /></>}
            </Button>
            {showExportMenu && (
              <div className="absolute left-0 top-full mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-50 py-1">
                <p className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Conversations</p>
                <button onClick={() => handleExport('conversations', '7d')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Last 7 days</button>
                <button onClick={() => handleExport('conversations', '30d')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Last 30 days</button>
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
        Messages handled, response times, and costs for this client&apos;s AI assistant.
      </p>
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
