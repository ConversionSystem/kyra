'use client';

import { useState, useEffect, useCallback } from 'react';
import { Webhook, Plus, Trash2, Check, X, Loader2, TestTube, Zap, Settings, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  headers: Record<string, string>;
  is_active: boolean;
  secret: string | null;
  last_status: number | null;
  last_error: string | null;
  last_fired_at: string | null;
  created_at: string;
}

const ALL_EVENTS = [
  { value: 'campaign.created', label: 'Campaign Created', emoji: '📋' },
  { value: 'lead.found', label: 'Lead Found', emoji: '🔍' },
  { value: 'lead.approved', label: 'Lead Approved', emoji: '✅' },
  { value: 'lead.researched', label: 'Lead Researched', emoji: '🔬' },
  { value: 'lead.outreach_approved', label: 'Outreach Approved', emoji: '📝' },
  { value: 'lead.messaged', label: 'Outreach Sent', emoji: '🚀' },
  { value: 'lead.replied', label: 'Lead Replied', emoji: '💬' },
  { value: 'lead.interested', label: 'Lead Interested', emoji: '🔥' },
  { value: 'lead.booked', label: 'Demo Booked', emoji: '📅' },
  { value: 'lead.closed', label: 'Deal Closed', emoji: '🎉' },
  { value: 'lead.skipped', label: 'Lead Skipped', emoji: '⏭️' },
];

const TEMPLATES = [
  { name: 'Zapier', desc: 'Webhooks by Zapier — Catch Hook', urlHint: 'https://hooks.zapier.com/hooks/catch/...', icon: '⚡' },
  { name: 'Make', desc: 'Make (Integromat) — Custom Webhook', urlHint: 'https://hook.us1.make.com/...', icon: '🔗' },
  { name: 'n8n', desc: 'n8n Webhook Node', urlHint: 'https://your-n8n.app.n8n.cloud/webhook/...', icon: '🔄' },
  { name: 'GHL Workflow', desc: 'GoHighLevel Inbound Webhook', urlHint: 'https://services.leadconnectorhq.com/hooks/...', icon: '📊' },
  { name: 'Custom', desc: 'Any HTTP endpoint', urlHint: 'https://...', icon: '🌐' },
];

export default function WebhookSettings() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<Set<string>>(new Set(['*']));
  const [newSecret, setNewSecret] = useState('');
  const [saving, setSaving] = useState(false);

  const loadWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/pipeline/webhooks');
      const data = await res.json();
      setWebhooks(data.webhooks || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadWebhooks(); }, [loadWebhooks]);

  const createWebhook = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    setSaving(true);
    try {
      const events = newEvents.has('*') ? ['*'] : [...newEvents];
      await fetch('/api/agency/pipeline/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, url: newUrl, events, secret: newSecret || null }),
      });
      setShowCreate(false);
      setNewName(''); setNewUrl(''); setNewEvents(new Set(['*'])); setNewSecret('');
      await loadWebhooks();
    } finally { setSaving(false); }
  };

  const deleteWebhook = async (id: string) => {
    await fetch('/api/agency/pipeline/webhooks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await loadWebhooks();
  };

  const toggleWebhook = async (id: string, isActive: boolean) => {
    await fetch('/api/agency/pipeline/webhooks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !isActive }),
    });
    await loadWebhooks();
  };

  const testWebhook = async (webhook: WebhookConfig) => {
    setTesting(webhook.id);
    try {
      const res = await fetch('/api/agency/pipeline/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, url: webhook.url, secret: webhook.secret }),
      });
      const data = await res.json();
      if (data.ok) {
        alert(`✅ Webhook test successful! Status: ${data.status}`);
      } else {
        alert(`❌ Webhook test failed: ${data.error || `Status ${data.status}`}`);
      }
    } catch (err) {
      alert(`❌ Test error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally { setTesting(null); }
  };

  const toggleEvent = (event: string) => {
    setNewEvents(prev => {
      const next = new Set(prev);
      if (event === '*') {
        return next.has('*') ? new Set() : new Set(['*']);
      }
      next.delete('*');
      if (next.has(event)) next.delete(event); else next.add(event);
      return next;
    });
  };

  if (loading) return <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-indigo-500" />
          <h3 className="text-lg font-bold text-gray-900">Pipeline Webhooks</h3>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="text-xs bg-indigo-600 text-white">
          <Plus className="h-3 w-3 mr-1" /> Add Webhook
        </Button>
      </div>

      <p className="text-xs text-gray-500">
        Automatically sync pipeline data to Zapier, Make, n8n, GoHighLevel, or any CRM/app via webhooks.
        Every time a lead moves to a new stage, all matching webhooks fire with the lead data.
      </p>

      {/* Webhook list */}
      {webhooks.length === 0 && !showCreate && (
        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Webhook className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500 mb-1">No webhooks configured</p>
          <p className="text-xs text-gray-400 mb-4">Connect Zapier, Make, n8n, or any CRM to sync pipeline data automatically.</p>
          <Button size="sm" onClick={() => setShowCreate(true)} className="text-xs bg-indigo-600 text-white">
            <Plus className="h-3 w-3 mr-1" /> Add First Webhook
          </Button>
        </div>
      )}

      {webhooks.map((webhook) => (
        <div key={webhook.id} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${webhook.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                <p className="font-semibold text-gray-900 text-sm">{webhook.name}</p>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{webhook.url}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {webhook.events.includes('*') ? (
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">All Events</span>
                ) : webhook.events.map(ev => (
                  <span key={ev} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{ev}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-3">
              <Button size="sm" variant="outline" onClick={() => testWebhook(webhook)} disabled={testing === webhook.id} className="text-xs">
                {testing === webhook.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
              </Button>
              <Button size="sm" variant="outline" onClick={() => toggleWebhook(webhook.id, webhook.is_active)} className="text-xs">
                {webhook.is_active ? '⏸️' : '▶️'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => deleteWebhook(webhook.id)} className="text-xs text-red-500 hover:bg-red-50">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {/* Last delivery status */}
          {webhook.last_fired_at && (
            <div className={`mt-2 text-[10px] flex items-center gap-1 ${webhook.last_status && webhook.last_status >= 200 && webhook.last_status < 300 ? 'text-green-600' : 'text-red-500'}`}>
              {webhook.last_status && webhook.last_status >= 200 && webhook.last_status < 300 ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
              Last: {webhook.last_status || 'failed'} — {new Date(webhook.last_fired_at).toLocaleString()}
              {webhook.last_error && <span className="text-red-400 ml-1">({webhook.last_error})</span>}
            </div>
          )}
        </div>
      ))}

      {/* Create webhook modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !saving && setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Webhook className="h-5 w-5 text-indigo-500" /> Add Webhook</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            {/* Templates */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-600 mb-2">Quick Setup</p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map(t => (
                  <button key={t.name}
                    onClick={() => { setNewName(t.name); setNewUrl(t.urlHint); }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <span>{t.icon}</span> {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Name *</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Zapier — CRM Sync" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Webhook URL *</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  placeholder="https://hooks.zapier.com/hooks/catch/..." value={newUrl} onChange={e => setNewUrl(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Signing Secret (optional)</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  placeholder="whsec_..." value={newSecret} onChange={e => setNewSecret(e.target.value)} />
                <p className="text-[10px] text-gray-400 mt-0.5">HMAC-SHA256 signature in X-Kyra-Signature header for payload verification.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Events</label>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newEvents.has('*')} onChange={() => toggleEvent('*')}
                      className="h-3.5 w-3.5 text-indigo-600 rounded border-gray-300" />
                    <span className="text-xs font-medium text-gray-700">All Events</span>
                  </label>
                  <div className="border-t border-gray-100 my-1" />
                  <div className="grid grid-cols-2 gap-1">
                    {ALL_EVENTS.map(ev => (
                      <label key={ev.value} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={newEvents.has('*') || newEvents.has(ev.value)}
                          disabled={newEvents.has('*')}
                          onChange={() => toggleEvent(ev.value)}
                          className="h-3.5 w-3.5 text-indigo-600 rounded border-gray-300" />
                        <span className="text-xs text-gray-600">{ev.emoji} {ev.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={createWebhook} disabled={!newName.trim() || !newUrl.trim() || saving}
              className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : <><Webhook className="h-4 w-4 mr-2" /> Create Webhook</>}
            </Button>
          </div>
        </div>
      )}

      {/* Integration guide */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Payload Format</p>
        <pre className="text-[11px] text-gray-700 bg-white rounded-lg p-3 border overflow-x-auto">{`POST {your_webhook_url}
Content-Type: application/json
X-Kyra-Event: lead.messaged
X-Kyra-Signature: sha256=... (if secret set)

{
  "event": "lead.messaged",
  "timestamp": "2026-02-26T10:00:00Z",
  "campaign": { "id": "...", "name": "..." },
  "lead": {
    "full_name": "John Smith",
    "company": "Green Leaf",
    "email": "john@greenleaf.com",
    "phone": "+13105551234",
    "stage": "messaged"
  }
}`}</pre>
        <p className="text-[10px] text-gray-400 mt-2">
          Works with Zapier (Catch Hook), Make (Custom Webhook), n8n (Webhook node), GHL (Inbound Webhook), HubSpot, Salesforce, Airtable — any tool that accepts HTTP POST.
        </p>
      </div>
    </div>
  );
}
