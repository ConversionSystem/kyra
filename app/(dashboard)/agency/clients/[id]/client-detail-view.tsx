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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { AgencyClient, AgencyMember } from '@/lib/agency/queries';
import GHLConnection from './ghl-connection';
import { UsageAnalytics } from './usage-analytics';
import PermissionsCard from './permissions-card';

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

type Tab = 'chat' | 'personality' | 'settings' | 'ghl' | 'permissions' | 'usage';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'Test Chat', icon: MessageSquare },
  { id: 'personality', label: 'AI Personality', icon: Brain },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'ghl', label: 'GHL', icon: Link2 },
  { id: 'permissions', label: 'Permissions', icon: Shield },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
];

interface ClientDetailViewProps {
  client: AgencyClient;
  role: AgencyMember['role'];
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
        <div className="min-w-0">
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
    </div>
  );
}

// ── Test Chat Tab ─────────────────────────────────────────────────────────────

function TestChatTab({ client }: { client: AgencyClient }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
      <p className="text-sm text-gray-500 mb-4">
        Send test messages to this client&apos;s AI. Responses use your agency&apos;s API keys and this client&apos;s personality.
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
  const [greeting, setGreeting] = useState(
    (client.container_config as Record<string, unknown>)?.greeting as string || ''
  );
  const [instructions, setInstructions] = useState(
    (client.container_config as Record<string, unknown>)?.instructions as string || ''
  );
  const [persona, setPersona] = useState(
    (client.container_config as Record<string, unknown>)?.persona as string || ''
  );
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
            ...(client.container_config as Record<string, unknown> || {}),
            greeting,
            instructions,
            persona,
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
