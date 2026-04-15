'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Clock, AlertTriangle, CheckCircle2, XCircle, Zap, Copy, Loader2 } from 'lucide-react';

interface SmsConfig {
  enabled: boolean;
  provider: string;
  providerConfigured: boolean;
  templates: Template[];
  brandName: string;
  sendingHoursStart: number;
  sendingHoursEnd: number;
  timezone: string;
  webhookUrl: string;
}

interface Template {
  id: string;
  event: string;
  name: string;
  body: string;
  enabled: boolean;
  compliance_footer: string;
}

interface LogEntry {
  id: string;
  event: string;
  customerPhone: string;
  customerName: string;
  driverName: string;
  messageBody: string;
  status: string;
  sentAt: string;
}

interface Stats {
  total: number;
  sent: number;
  failed: number;
  byEvent: Record<string, number>;
}

const EVENT_LABELS: Record<string, { label: string; icon: string }> = {
  taskAssigned: { label: 'Order Packed', icon: '📦' },
  taskStarted: { label: 'Driver Departed', icon: '🚗' },
  taskArrival: { label: 'Arriving Soon', icon: '📍' },
  taskCompleted: { label: 'Delivered', icon: '✅' },
  taskDelayed: { label: 'Delayed', icon: '⏰' },
  taskFailed: { label: 'Failed', icon: '❌' },
};

export default function DeliverySmsTab({ clientId }: { clientId: string }) {
  const [config, setConfig] = useState<SmsConfig | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'templates' | 'log'>('overview');
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/sms`);
      const data = await res.json();
      setConfig(data.config);
      setStats(data.stats);
      setLog(data.recentLog || []);
    } catch (err) {
      console.error('Failed to load SMS config:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateConfig = async (updates: Record<string, unknown>) => {
    setSaving(true);
    try {
      await fetch(`/api/agency/clients/${clientId}/sms`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });
      const data = await res.json();
      setTestResult(
        data.testResult?.status === 'sent'
          ? 'success'
          : `error:${data.testResult?.error || 'Unknown error'}`,
      );
    } catch {
      setTestResult('error:Network error');
    } finally {
      setTesting(false);
    }
  };

  const copyWebhookUrl = () => {
    if (config?.webhookUrl) {
      navigator.clipboard.writeText(config.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
        Loading SMS configuration...
      </div>
    );
  }

  if (!config) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        SMS not configured for this client.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              Delivery SMS
              {config.enabled ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
              ) : (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Disabled</span>
              )}
            </h2>
            <p className="text-sm text-gray-500">
              Automated delivery notifications via {config.provider === 'mock' ? 'Mock (testing)' : config.provider}
            </p>
          </div>
        </div>
        <button
          onClick={() => updateConfig({ enabled: !config.enabled })}
          disabled={saving}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            config.enabled
              ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {saving ? 'Saving...' : config.enabled ? 'Disable' : 'Enable'}
        </button>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {(['overview', 'templates', 'log'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition ${
              activeView === view
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {view}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────── */}
      {activeView === 'overview' && (
        <div className="space-y-4">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Send className="h-4 w-4" /> Messages sent (30d)
                </div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 className="h-4 w-4 text-green-500" /> Delivered
                </div>
                <div className="mt-1 text-2xl font-bold text-green-600">{stats.sent}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <XCircle className="h-4 w-4 text-red-500" /> Failed
                </div>
                <div className="mt-1 text-2xl font-bold text-red-600">{stats.failed}</div>
              </div>
            </div>
          )}

          {/* Provider */}
          <ProviderSettings clientId={clientId} config={config} onUpdate={() => loadData()} />

          {/* Sending hours */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Clock className="h-4 w-4 text-indigo-600" />
              Sending Hours (TCPA Compliance)
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {config.sendingHoursStart}:00 AM – {config.sendingHoursEnd}:00 PM ({config.timezone})
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Messages outside these hours are queued automatically.
            </p>
          </div>

          {/* Test */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900">Test Message</h3>
            <p className="mt-1 text-sm text-gray-500">Send a mock &quot;Delivered&quot; notification through the full pipeline.</p>
            <button
              onClick={runTest}
              disabled={testing || !config.enabled}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition"
            >
              <Send className="h-4 w-4" />
              {testing ? 'Sending...' : 'Send Test Message'}
            </button>
            {testResult === 'success' && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" /> Test SMS sent successfully!
              </div>
            )}
            {testResult?.startsWith('error:') && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4" /> {testResult.replace('error:', '')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Templates ────────────────────────────────────────── */}
      {activeView === 'templates' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Customize the message your customers receive at each delivery stage.
          </p>
          {config.templates.map((t) => {
            const eventInfo = EVENT_LABELS[t.event] || { label: t.event, icon: '📨' };
            const isEditing = editingTemplate === t.id;

            return (
              <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{eventInfo.icon}</span>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{t.name}</h4>
                      <span className="text-xs text-gray-400">{eventInfo.label} · {t.event}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${t.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <button
                      onClick={() => setEditingTemplate(isEditing ? null : t.id)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {isEditing ? 'Close' : 'Edit'}
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-3 space-y-3">
                    <textarea
                      defaultValue={t.body}
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      onBlur={(e) => {
                        const updated = config.templates.map((tmpl) =>
                          tmpl.id === t.id ? { ...tmpl, body: e.target.value } : tmpl,
                        );
                        updateConfig({ templates: updated });
                      }}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {['{customer_name}', '{driver_name}', '{eta_time}', '{eta_minutes}', '{tracking_link}', '{delivery_duration}'].map((v) => (
                        <span key={v} className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-mono text-indigo-600">{v}</span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">Click outside the text area to save changes.</p>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">{t.body}</p>
                    <p className="mt-1 text-xs text-gray-400">{t.compliance_footer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Log ──────────────────────────────────────────────── */}
      {activeView === 'log' && (
        <div className="space-y-3">
          {log.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No SMS messages sent yet.</p>
              <p className="text-xs text-gray-400">Messages will appear here once delivery notifications start.</p>
            </div>
          ) : (
            log.map((entry) => {
              const eventInfo = EVENT_LABELS[entry.event] || { label: entry.event, icon: '📨' };
              return (
                <div key={entry.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{eventInfo.icon}</span>
                      <span className="text-sm font-medium text-gray-900">{eventInfo.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        entry.status === 'sent'
                          ? 'bg-green-100 text-green-700'
                          : entry.status === 'queued'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {entry.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(entry.sentAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{entry.messageBody}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    → {entry.customerPhone}
                    {entry.driverName && ` · Driver: ${entry.driverName}`}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Provider Settings Component ─────────────────────────────────────────────

const PROVIDERS = [
  { value: 'mock', label: 'Mock (testing)', description: 'Logs messages without sending' },
  { value: 'twilio', label: 'Twilio', description: 'Industry-standard SMS API' },
  { value: 'telnyx', label: 'Telnyx', description: 'Programmable SMS API' },
  { value: 'custom', label: 'Custom API', description: 'Any REST-based SMS provider' },
];

function ProviderSettings({
  clientId,
  config,
  onUpdate,
}: {
  clientId: string;
  config: SmsConfig;
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [provider, setProvider] = useState(config.provider || 'mock');
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/sms`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          ...(apiKey && { providerApiKey: apiKey }),
          ...(apiUrl && { providerApiUrl: apiUrl }),
        }),
      });
      if (res.ok) {
        setMsg('Saved');
        setEditing(false);
        setApiKey('');
        setApiUrl('');
        onUpdate();
      } else {
        const data = await res.json();
        setMsg(`Error: ${data.error || 'Failed to save'}`);
      }
    } catch {
      setMsg('Network error');
    } finally {
      setSaving(false);
    }
  };

  const defaultUrls: Record<string, string> = {
    twilio: 'https://api.twilio.com/2010-04-01/Accounts/{ACCOUNT_SID}/Messages.json',
    telnyx: 'https://api.telnyx.com/v2/messages',
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">SMS Provider</h3>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Configure
          </button>
        )}
      </div>

      {!editing ? (
        <div className="mt-2 flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${config.providerConfigured ? 'bg-green-500' : 'bg-amber-400'}`} />
          <span className="text-sm text-gray-700 capitalize">{config.provider}</span>
          {!config.providerConfigured && (
            <span className="text-xs text-amber-600">— API credentials needed</span>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                if (defaultUrls[e.target.value]) setApiUrl(defaultUrls[e.target.value]);
              }}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label} — {p.description}</option>
              ))}
            </select>
          </div>

          {provider !== 'mock' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">API Key / Auth Token</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={config.providerConfigured ? '••••••••••• (already set)' : 'Enter API key'}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">API URL</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.provider.com/messages"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Save Provider
            </button>
            <button
              onClick={() => { setEditing(false); setMsg(null); }}
              className="rounded-lg px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
            {msg && (
              <span className={`text-xs ${msg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{msg}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
