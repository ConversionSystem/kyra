'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ArrowLeft,
  Loader2,
  Send,
  BarChart3,
  Trash2,
  Save,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { AgencyClient, AgencyMember } from '@/lib/agency/queries';
import GHLConnection from './ghl-connection';

const statusColors: Record<string, string> = {
  active: 'border-green-500/50 bg-green-500/10 text-green-400',
  paused: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
  setup: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClientDetailViewProps {
  client: AgencyClient;
  role: AgencyMember['role'];
}

export function ClientDetailView({ client: initialClient, role }: ClientDetailViewProps) {
  const router = useRouter();
  const supabase = createClient();

  // Settings state
  const [name, setName] = useState(initialClient.name);
  const [industry, setIndustry] = useState(initialClient.industry);
  const [status, setStatus] = useState(initialClient.status);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    const { error } = await supabase
      .from('agency_clients')
      .update({ name, industry, status })
      .eq('id', initialClient.id);

    if (error) {
      setSaveMessage({ type: 'error', text: `Failed to save: ${error.message}` });
    } else {
      setSaveMessage({ type: 'success', text: 'Changes saved!' });
      router.refresh();
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    const { error } = await supabase
      .from('agency_clients')
      .delete()
      .eq('id', initialClient.id);

    if (error) {
      setSaveMessage({ type: 'error', text: `Failed to delete: ${error.message}` });
      setIsDeleting(false);
    } else {
      router.push('/agency/clients');
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSending) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsSending(true);

    try {
      const res = await fetch(`/api/agency/clients/${initialClient.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMsg = errorData?.message || errorData?.error || `Error ${res.status}`;
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `⚠️ ${errorMsg}` },
        ]);
        setIsSending(false);
        return;
      }

      // Handle SSE streaming response
      const reader = res.body?.getReader();
      if (!reader) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '⚠️ No response stream available.' },
        ]);
        setIsSending(false);
        return;
      }

      // Add empty assistant message that we'll stream into
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content' && parsed.content) {
              // Append streamed content to the last assistant message
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.content,
                  };
                }
                return updated;
              });
            } else if (parsed.type === 'error') {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant' && !last.content) {
                  updated[updated.length - 1] = {
                    ...last,
                    content: `⚠️ ${parsed.message || 'Stream error'}`,
                  };
                }
                return updated;
              });
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Network error. Could not reach the chat endpoint.' },
      ]);
    }

    setIsSending(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const industries = [
    'General',
    'Dental / Medical',
    'Real Estate',
    'Home Services',
    'Retail / E-commerce',
    'Legal',
    'Finance',
    'Fitness / Wellness',
    'Restaurant / Hospitality',
    'Education',
    'Other',
  ];

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <Link
        href="/agency/clients"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Clients
      </Link>

      {/* Client Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl font-bold text-zinc-300">
            {initialClient.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">{initialClient.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge className={statusColors[initialClient.status]}>
                {initialClient.status}
              </Badge>
              <span className="text-sm text-zinc-500">
                {initialClient.industry || 'No industry'}
              </span>
              {initialClient.template && (
                <span className="text-sm text-zinc-500">
                  · {initialClient.template.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {saveMessage && (
        <div
          className={`rounded-md px-4 py-3 text-sm mb-6 ${
            saveMessage.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Test Chat */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Test Chat
          </CardTitle>
          <CardDescription>
            Send test messages to this client&apos;s AI instance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-zinc-700 bg-zinc-950 h-64 overflow-y-auto mb-3 p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-zinc-600">
                  Send a message to test this client&apos;s AI...
                </p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-800 text-zinc-200'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
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
              className="bg-zinc-800 border-zinc-700"
              disabled={isSending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isSending || !chatInput.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Edit this client&apos;s configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            >
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Status</label>
            <div className="flex gap-2">
              {(['active', 'paused', 'setup'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    status === s
                      ? 'border-violet-500/50 bg-violet-500/10 text-violet-400'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* GHL Connection */}
      <GHLConnection
        clientId={initialClient.id}
        ghlLocationId={initialClient.ghl_location_id ?? null}
        ghlConnectedAt={initialClient.ghl_connected_at ?? null}
        onDisconnected={() => router.refresh()}
      />

      {/* Usage Stats (Placeholder) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Usage
          </CardTitle>
          <CardDescription>This month&apos;s activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-center">
              <p className="text-2xl font-bold text-zinc-100">
                {initialClient.usage_this_month}
              </p>
              <p className="text-xs text-zinc-500">Credits Used</p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-center">
              <p className="text-2xl font-bold text-zinc-100">—</p>
              <p className="text-xs text-zinc-500">Messages</p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-center">
              <p className="text-2xl font-bold text-zinc-100">—</p>
              <p className="text-xs text-zinc-500">Conversations</p>
            </div>
          </div>
          <p className="text-xs text-zinc-600 mt-3">
            Detailed analytics will be available in a future update.
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {role === 'owner' && (
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-400">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions. Proceed with caution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Client
              </Button>
            ) : (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                <p className="text-sm text-red-400">
                  Are you sure you want to delete <strong>{initialClient.name}</strong>?
                  This action cannot be undone. All client data, configurations, and chat
                  history will be permanently removed.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Yes, Delete Forever'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
