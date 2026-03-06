'use client';

import { useState } from 'react';
import {
  Webhook, Plus, Trash2, Save, Loader2, CheckCircle2,
  AlertTriangle, TestTube, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WebhookEntry {
  id: string;
  event: string;
  url: string;
  enabled: boolean;
  secret: string;
}

const EVENT_OPTIONS = [
  { value: 'new_conversation', label: 'New Conversation', desc: 'Fires when a new AI conversation starts' },
  { value: 'escalation', label: 'Escalation', desc: 'Fires when AI escalates to a human' },
  { value: 'new_lead', label: 'New Lead', desc: 'Fires when a new CRM lead is created' },
  { value: 'credit_low', label: 'Credit Low', desc: 'Fires when credits drop below threshold' },
  { value: 'review_queued', label: 'Review Queued', desc: 'Fires when a message is queued for review' },
];

interface WebhookSettingsClientProps {
  agencyId: string;
  initialConfig: Array<Record<string, unknown>>;
}

export function WebhookSettingsClient({ agencyId, initialConfig }: WebhookSettingsClientProps) {
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>(() =>
    initialConfig.map((w, i) => ({
      id: (w.id as string) || `wh-${i}`,
      event: (w.event as string) || 'new_conversation',
      url: (w.url as string) || '',
      enabled: w.enabled !== false,
      secret: (w.secret as string) || '',
    })),
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const addWebhook = () => {
    setWebhooks((prev) => [
      ...prev,
      {
        id: `wh-${Date.now()}`,
        event: 'new_conversation',
        url: '',
        enabled: true,
        secret: '',
      },
    ]);
  };

  const removeWebhook = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  const updateWebhook = (id: string, field: keyof WebhookEntry, value: string | boolean) => {
    setWebhooks((prev) =>
      prev.map((w) => (w.id === id ? { ...w, [field]: value } : w)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/agency/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            webhook_config: webhooks.map((w) => ({
              event: w.event,
              url: w.url,
              enabled: w.enabled,
              secret: w.secret || undefined,
            })),
          },
        }),
      });

      if (!res.ok) throw new Error('Save failed');
      setStatus({ type: 'success', message: 'Webhook configuration saved' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (webhook: WebhookEntry) => {
    if (!webhook.url) return;
    setTesting(webhook.id);
    setStatus(null);

    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.secret ? { 'X-Webhook-Secret': webhook.secret } : {}),
        },
        body: JSON.stringify({
          event: webhook.event,
          agency_id: agencyId,
          timestamp: new Date().toISOString(),
          data: { test: true, message: 'This is a test webhook from Kyra' },
        }),
        signal: AbortSignal.timeout(5_000),
      });

      if (res.ok) {
        setStatus({ type: 'success', message: `Test webhook sent successfully (${res.status})` });
      } else {
        setStatus({ type: 'error', message: `Webhook returned ${res.status}` });
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Test failed — check the URL',
      });
    } finally {
      setTesting(null);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between overflow-x-hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/agency/settings" className="text-sm text-gray-400 hover:text-white">
              Settings
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-sm text-white">Webhooks</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-indigo-400" />
            Outbound Webhooks
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Get notified when events happen. Kyra will POST JSON to your URL in real-time.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          Save
        </Button>
      </div>

      {/* Status */}
      {status && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            status.type === 'success'
              ? 'bg-green-900/30 border border-green-800 text-green-300'
              : 'bg-red-900/30 border border-red-800 text-red-300'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {status.message}
        </div>
      )}

      {/* Webhook entries */}
      {webhooks.length === 0 ? (
        <div className="text-center py-16 bg-gray-800 border border-gray-700 rounded-lg">
          <Webhook className="w-10 h-10 mx-auto mb-3 text-gray-500" />
          <p className="text-gray-400 mb-4">No webhooks configured yet</p>
          <Button onClick={addWebhook} variant="outline">
            <Plus className="w-4 h-4 mr-1" />
            Add Webhook
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className={`bg-gray-800 border rounded-lg p-4 space-y-3 ${
                webhook.enabled ? 'border-gray-700' : 'border-gray-800 opacity-60'
              }`}
            >
              {/* Row 1: Event + Enable toggle */}
              <div className="flex items-center gap-3">
                <select
                  value={webhook.event}
                  onChange={(e) => updateWebhook(webhook.id, 'event', e.target.value)}
                  className="bg-gray-900 border border-gray-600 text-white text-sm rounded-md px-3 py-2 flex-shrink-0"
                >
                  {EVENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <Badge
                  className={`cursor-pointer text-xs ${
                    webhook.enabled
                      ? 'bg-green-900/50 text-green-300 border-green-700'
                      : 'bg-gray-700 text-gray-400 border-gray-600'
                  }`}
                  onClick={() => updateWebhook(webhook.id, 'enabled', !webhook.enabled)}
                >
                  {webhook.enabled ? 'Enabled' : 'Disabled'}
                </Badge>

                <div className="flex-1" />

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTest(webhook)}
                  disabled={!webhook.url || testing === webhook.id}
                >
                  {testing === webhook.id ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <TestTube className="w-3 h-3 mr-1" />
                  )}
                  Test
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeWebhook(webhook.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Row 2: URL */}
              <Input
                value={webhook.url}
                onChange={(e) => updateWebhook(webhook.id, 'url', e.target.value)}
                placeholder="https://your-server.com/webhook"
                className="bg-gray-900 border-gray-600 text-white"
              />

              {/* Row 3: Optional secret */}
              <Input
                value={webhook.secret}
                onChange={(e) => updateWebhook(webhook.id, 'secret', e.target.value)}
                placeholder="Optional: signing secret (sent as X-Webhook-Secret header)"
                className="bg-gray-900 border-gray-600 text-gray-400 text-sm"
                type="password"
              />

              {/* Event description */}
              <p className="text-xs text-gray-500">
                {EVENT_OPTIONS.find((o) => o.value === webhook.event)?.desc}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      {webhooks.length > 0 && (
        <Button onClick={addWebhook} variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-1" />
          Add Another Webhook
        </Button>
      )}

      {/* Payload example */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-2">Payload Format</h3>
        <pre className="text-xs text-gray-400 bg-gray-900 rounded p-3 overflow-x-auto">
{`{
  "event": "new_conversation",
  "agency_id": "your-agency-id",
  "agency_name": "Your Agency",
  "timestamp": "2026-03-04T10:00:00.000Z",
  "data": {
    "client_name": "Client Name",
    "client_id": "client-uuid",
    "channel": "SMS",
    "user_message": "Customer message...",
    "ai_response": "AI reply..."
  }
}`}
        </pre>
      </div>
    </div>
  );
}
