'use client';

import { useState, useEffect, useCallback } from 'react';

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

export default function DeliverySmsTab({ clientId }: { clientId: string }) {
  const [config, setConfig] = useState<SmsConfig | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'templates' | 'log'>('overview');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

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
      setTestResult(data.testResult?.status === 'sent' ? '✅ Test SMS sent successfully!' : `❌ Test failed: ${data.testResult?.error || 'Unknown error'}`);
    } catch {
      setTestResult('❌ Test failed — network error');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-400">Loading SMS configuration...</div>;
  }

  if (!config) {
    return <div className="p-6 text-gray-400">SMS not configured for this client.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            📱 Delivery SMS
            {config.enabled ? (
              <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">Active</span>
            ) : (
              <span className="bg-gray-500/20 text-gray-400 text-xs px-2 py-0.5 rounded-full">Disabled</span>
            )}
          </h2>
          <p className="text-sm text-gray-400 mt-1">Automated delivery notifications via {config.provider}</p>
        </div>
        <button
          onClick={() => updateConfig({ enabled: !config.enabled })}
          disabled={saving}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            config.enabled
              ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
              : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
          }`}
        >
          {config.enabled ? 'Disable' : 'Enable'}
        </button>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1">
        {(['overview', 'templates', 'log'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
              activeView === view ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {view}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeView === 'overview' && (
        <div className="space-y-4">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-xs text-gray-400">Messages sent (30d)</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold text-green-400">{stats.sent}</div>
                <div className="text-xs text-gray-400">Delivered</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
                <div className="text-xs text-gray-400">Failed</div>
              </div>
            </div>
          )}

          {/* Webhook URL */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Onfleet Webhook URL</h3>
            <code className="text-xs text-indigo-300 bg-black/30 px-3 py-2 rounded-lg block break-all">
              {config.webhookUrl}
            </code>
            <p className="text-xs text-gray-500 mt-2">
              Add this URL in Onfleet → Settings → Webhooks. Select all task events.
            </p>
          </div>

          {/* Provider info */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">SMS Provider</h3>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${config.providerConfigured ? 'bg-green-400' : 'bg-yellow-400'}`} />
              <span className="text-sm text-gray-300 capitalize">{config.provider}</span>
              {!config.providerConfigured && (
                <span className="text-xs text-yellow-400">— API credentials needed</span>
              )}
            </div>
          </div>

          {/* Test button */}
          <button
            onClick={runTest}
            disabled={testing || !config.enabled}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-lg text-sm transition"
          >
            {testing ? 'Sending test...' : '🧪 Send Test Message'}
          </button>
          {testResult && (
            <p className="text-sm mt-2">{testResult}</p>
          )}
        </div>
      )}

      {/* Templates */}
      {activeView === 'templates' && (
        <div className="space-y-3">
          {config.templates.map((t) => (
            <div key={t.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${t.enabled ? 'bg-green-400' : 'bg-gray-500'}`} />
                  <h4 className="text-sm font-bold text-white">{t.name}</h4>
                  <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded">{t.event}</span>
                </div>
                <button
                  onClick={() => setEditingTemplate(editingTemplate?.id === t.id ? null : t)}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  {editingTemplate?.id === t.id ? 'Close' : 'Edit'}
                </button>
              </div>

              {editingTemplate?.id === t.id ? (
                <div className="space-y-2">
                  <textarea
                    defaultValue={t.body}
                    rows={3}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    onBlur={(e) => {
                      const updated = config.templates.map((tmpl) =>
                        tmpl.id === t.id ? { ...tmpl, body: e.target.value } : tmpl,
                      );
                      updateConfig({ templates: updated });
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    Variables: {'{customer_name}'} {'{driver_name}'} {'{eta_time}'} {'{eta_minutes}'} {'{tracking_link}'} {'{delivery_duration}'}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-300">{t.body}</p>
              )}

              <p className="text-xs text-gray-500 mt-1">{t.compliance_footer}</p>
            </div>
          ))}
        </div>
      )}

      {/* Log */}
      {activeView === 'log' && (
        <div className="space-y-2">
          {log.length === 0 ? (
            <p className="text-sm text-gray-400">No SMS messages sent yet.</p>
          ) : (
            log.map((entry) => (
              <div key={entry.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      entry.status === 'sent' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {entry.status}
                    </span>
                    <span className="text-xs text-gray-500">{entry.event}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(entry.sentAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-1">{entry.messageBody}</p>
                <p className="text-xs text-gray-500 mt-1">
                  → {entry.customerPhone} {entry.driverName && `| Driver: ${entry.driverName}`}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
