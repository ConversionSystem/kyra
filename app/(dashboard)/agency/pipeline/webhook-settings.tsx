'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Webhook, Plus, Trash2, Check, X, Loader2, TestTube,
  Zap, ExternalLink, ChevronDown, ChevronUp, Info,
  ArrowRight, Mail, Phone, Building2, Globe,
} from 'lucide-react';
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

const USE_CASES = [
  {
    title: 'Auto-add leads to your CRM',
    desc: 'When a lead is found or approved, automatically create a contact in HubSpot, Salesforce, Pipedrive, or GHL.',
    events: ['lead.found', 'lead.approved'],
    tools: 'Zapier, Make, n8n',
    emoji: '📇',
  },
  {
    title: 'Notify your team on Slack',
    desc: 'Get a Slack message whenever a lead replies, books a demo, or a deal closes.',
    events: ['lead.replied', 'lead.booked', 'lead.closed'],
    tools: 'Zapier, Make, Slack webhook',
    emoji: '💬',
  },
  {
    title: 'Update Google Sheets / Airtable',
    desc: 'Keep a live spreadsheet of all pipeline activity — every stage change adds a row.',
    events: ['All Events'],
    tools: 'Zapier, Make, n8n',
    emoji: '📊',
  },
  {
    title: 'Trigger GHL workflows',
    desc: 'Start a GHL automation when outreach is sent — add tags, start drip sequences, assign to pipeline stage.',
    events: ['lead.messaged', 'lead.replied'],
    tools: 'GHL Workflow Webhook',
    emoji: '⚡',
  },
  {
    title: 'Send follow-up emails via Mailchimp / ActiveCampaign',
    desc: 'When a lead doesn\'t reply, trigger a drip sequence in your email marketing tool.',
    events: ['lead.messaged'],
    tools: 'Zapier, Make',
    emoji: '📧',
  },
];

export default function WebhookSettings() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const [expandedUseCase, setExpandedUseCase] = useState<number | null>(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<Set<string>>(new Set(['*']));
  const [newSecret, setNewSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const loadWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/pipeline/webhooks');
      const data = await res.json();
      setWebhooks(data.webhooks || []);
      if (data.webhooks?.length > 0) setShowGuide(false);
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
      setSelectedTemplate(null);
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

  const testWebhookFn = async (webhook: WebhookConfig) => {
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
    <div className="space-y-6">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-gray-900">Pipeline Integrations</h3>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Connect your sales pipeline to any app. When leads move between stages, your tools stay in sync automatically.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="text-xs bg-indigo-600 text-white">
          <Plus className="h-3 w-3 mr-1" /> Add Integration
        </Button>
      </div>

      {/* ═══ WHAT IS THIS? EXPLAINER ═══ */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
            <Info className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h4 className="font-bold text-indigo-900 text-sm mb-1">What are Pipeline Integrations?</h4>
            <p className="text-sm text-indigo-700 leading-relaxed">
              Every time something happens in your sales pipeline — a lead is found, outreach is sent, someone replies — Kyra can <strong>automatically notify your other tools</strong>. 
              This means your CRM, spreadsheet, Slack, or marketing tools always have the latest data without any manual work.
            </p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-white/80 text-indigo-700 px-2 py-1 rounded-full border border-indigo-200 font-medium">⚡ Zapier</span>
              <span className="text-xs bg-white/80 text-indigo-700 px-2 py-1 rounded-full border border-indigo-200 font-medium">🔗 Make</span>
              <span className="text-xs bg-white/80 text-indigo-700 px-2 py-1 rounded-full border border-indigo-200 font-medium">🔄 n8n</span>
              <span className="text-xs bg-white/80 text-indigo-700 px-2 py-1 rounded-full border border-indigo-200 font-medium">📊 GoHighLevel</span>
              <span className="text-xs bg-white/80 text-indigo-700 px-2 py-1 rounded-full border border-indigo-200 font-medium">🧡 HubSpot</span>
              <span className="text-xs bg-white/80 text-indigo-700 px-2 py-1 rounded-full border border-indigo-200 font-medium">☁️ Salesforce</span>
              <span className="text-xs bg-white/80 text-indigo-700 px-2 py-1 rounded-full border border-indigo-200 font-medium">📊 Google Sheets</span>
              <span className="text-xs bg-white/80 text-indigo-700 px-2 py-1 rounded-full border border-indigo-200 font-medium">🗄️ Airtable</span>
              <span className="text-xs text-indigo-500">+ 5,000 more</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ HOW IT'S DIFFERENT FROM SETTINGS ═══ */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-bold text-amber-800 mb-2">💡 How is this different from the webhook in Settings?</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 border border-amber-100">
            <p className="text-xs font-bold text-amber-700 mb-1">⚡ Settings → GHL Workflow Trigger</p>
            <p className="text-xs text-gray-600">Fires when your <strong>AI worker has a conversation</strong> with a customer (inbound chat/SMS). Used for logging AI responses to GHL.</p>
            <p className="text-[10px] text-gray-400 mt-1">Trigger: Every AI chat response</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-indigo-200 ring-1 ring-indigo-100">
            <p className="text-xs font-bold text-indigo-700 mb-1">🔗 Pipeline → Integrations (this page)</p>
            <p className="text-xs text-gray-600">Fires when a <strong>lead moves through your sales pipeline</strong> — found, researched, messaged, replied, booked. Syncs lead data to any tool.</p>
            <p className="text-[10px] text-gray-400 mt-1">Trigger: Lead stage changes</p>
          </div>
        </div>
        <p className="text-[10px] text-amber-600 mt-2">Both can run at the same time. Use Settings for conversation logging, use this page for pipeline automation.</p>
      </div>

      {/* ═══ USE CASES — WHAT CAN I DO WITH THIS? ═══ */}
      <div>
        <h4 className="text-sm font-bold text-gray-900 mb-3">What can I do with this?</h4>
        <div className="space-y-2">
          {USE_CASES.map((uc, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedUseCase(expandedUseCase === i ? null : i)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition text-left"
              >
                <span className="text-xl">{uc.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{uc.title}</p>
                  <p className="text-xs text-gray-500 truncate">{uc.tools}</p>
                </div>
                {expandedUseCase === i ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </button>
              {expandedUseCase === i && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-600 mb-3">{uc.desc}</p>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">How to set it up</p>
                    {uc.tools.includes('Zapier') && (
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><strong>1.</strong> Go to <a href="https://zapier.com/app/zaps/create" target="_blank" rel="noopener" className="text-indigo-600 underline">zapier.com</a> → Create new Zap</p>
                        <p><strong>2.</strong> Trigger: search <strong>&quot;Webhooks by Zapier&quot;</strong> → select <strong>&quot;Catch Hook&quot;</strong></p>
                        <p><strong>3.</strong> Zapier gives you a URL like <code className="bg-gray-200 px-1 rounded text-[10px]">https://hooks.zapier.com/hooks/catch/123/abc</code></p>
                        <p><strong>4.</strong> Come back here → click <strong>&quot;Add Integration&quot;</strong> → paste that URL</p>
                        <p><strong>5.</strong> Choose which events to send (e.g. &quot;Lead Replied&quot;, &quot;Demo Booked&quot;)</p>
                        <p><strong>6.</strong> In Zapier, add your action step (e.g. &quot;Create HubSpot Contact&quot;, &quot;Send Slack Message&quot;)</p>
                      </div>
                    )}
                    {uc.tools.includes('GHL') && !uc.tools.includes('Zapier') && (
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><strong>1.</strong> In GHL: <strong>Automation → Create Workflow → Add Trigger → Inbound Webhook</strong></p>
                        <p><strong>2.</strong> Copy the webhook URL GHL gives you</p>
                        <p><strong>3.</strong> Come back here → click <strong>&quot;Add Integration&quot;</strong> → paste that URL</p>
                        <p><strong>4.</strong> Select events: <strong>&quot;Outreach Sent&quot;</strong> and <strong>&quot;Lead Replied&quot;</strong></p>
                        <p><strong>5.</strong> In GHL workflow: add actions like &quot;Add Tag&quot;, &quot;Move to Pipeline Stage&quot;, &quot;Start Drip&quot;</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 mt-2">
                    <span className="text-[10px] text-gray-400">Events to select:</span>
                    {uc.events.map(ev => (
                      <span key={ev} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">{ev}</span>
                    ))}
                  </div>
                  <Button size="sm" onClick={() => setShowCreate(true)} className="mt-3 text-xs bg-indigo-600 text-white">
                    <Plus className="h-3 w-3 mr-1" /> Set this up now
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ CONFIGURED WEBHOOKS ═══ */}
      {webhooks.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-3">Your integrations ({webhooks.length})</h4>
          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${webhook.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <p className="font-semibold text-gray-900 text-sm">{webhook.name}</p>
                      {!webhook.is_active && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Paused</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate font-mono">{webhook.url}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {webhook.events.includes('*') ? (
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">All Events</span>
                      ) : webhook.events.map(ev => (
                        <span key={ev} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{ev}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <Button size="sm" variant="outline" onClick={() => testWebhookFn(webhook)} disabled={testing === webhook.id} className="text-xs" title="Send test payload">
                      {testing === webhook.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleWebhook(webhook.id, webhook.is_active)} className="text-xs" title={webhook.is_active ? 'Pause' : 'Resume'}>
                      {webhook.is_active ? '⏸️' : '▶️'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { if (confirm('Delete this webhook?')) deleteWebhook(webhook.id); }} className="text-xs text-red-500 hover:bg-red-50" title="Delete">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {webhook.last_fired_at && (
                  <div className={`mt-2 text-[10px] flex items-center gap-1 ${webhook.last_status && webhook.last_status >= 200 && webhook.last_status < 300 ? 'text-green-600' : 'text-red-500'}`}>
                    {webhook.last_status && webhook.last_status >= 200 && webhook.last_status < 300 ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                    Last delivery: {webhook.last_status || 'failed'} — {new Date(webhook.last_fired_at).toLocaleString()}
                    {webhook.last_error && <span className="text-red-400 ml-1">({webhook.last_error})</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {webhooks.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Webhook className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-medium text-gray-600 mb-1">No integrations yet</p>
          <p className="text-xs text-gray-400 mb-4 max-w-sm mx-auto">Pick a use case above or click the button to connect your first tool.</p>
          <Button size="sm" onClick={() => setShowCreate(true)} className="text-xs bg-indigo-600 text-white">
            <Plus className="h-3 w-3 mr-1" /> Add First Integration
          </Button>
        </div>
      )}

      {/* ═══ CREATE WEBHOOK MODAL ═══ */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !saving && setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Webhook className="h-5 w-5 text-indigo-500" /> Add Integration</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            {/* Step 1: Choose your tool */}
            <div className="mb-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Step 1 — Which tool are you connecting?</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TEMPLATES.map(t => (
                  <button key={t.name}
                    onClick={() => { setSelectedTemplate(t.name); setNewName(t.name); setNewUrl(''); }}
                    className={`text-left px-3 py-2.5 rounded-xl border transition ${
                      selectedTemplate === t.name ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <p className="text-xs font-medium text-gray-900 mt-1">{t.name}</p>
                    <p className="text-[10px] text-gray-400">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Get your webhook URL */}
            {selectedTemplate && (
              <div className="mb-5 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-800 mb-2">Step 2 — Get your webhook URL from {selectedTemplate}</p>
                {selectedTemplate === 'Zapier' && (
                  <div className="text-xs text-blue-700 space-y-1">
                    <p>1. Go to <a href="https://zapier.com/app/zaps/create" target="_blank" rel="noopener" className="underline font-medium">zapier.com → Create Zap</a></p>
                    <p>2. For the trigger, search <strong>&quot;Webhooks by Zapier&quot;</strong></p>
                    <p>3. Choose <strong>&quot;Catch Hook&quot;</strong> as the trigger event</p>
                    <p>4. Zapier shows you a webhook URL — <strong>copy it</strong></p>
                    <p>5. Paste it below 👇</p>
                  </div>
                )}
                {selectedTemplate === 'Make' && (
                  <div className="text-xs text-blue-700 space-y-1">
                    <p>1. Go to <a href="https://www.make.com" target="_blank" rel="noopener" className="underline font-medium">make.com</a> → Create new Scenario</p>
                    <p>2. Add a <strong>&quot;Custom Webhook&quot;</strong> module as the trigger</p>
                    <p>3. Click <strong>&quot;Add&quot;</strong> → name it (e.g. &quot;Kyra Pipeline&quot;) → <strong>copy the URL</strong></p>
                    <p>4. Paste it below 👇</p>
                  </div>
                )}
                {selectedTemplate === 'n8n' && (
                  <div className="text-xs text-blue-700 space-y-1">
                    <p>1. In your n8n workflow, add a <strong>&quot;Webhook&quot;</strong> node</p>
                    <p>2. Set method to <strong>POST</strong></p>
                    <p>3. Copy the <strong>Production URL</strong> (or Test URL for testing)</p>
                    <p>4. Paste it below 👇</p>
                  </div>
                )}
                {selectedTemplate === 'GHL Workflow' && (
                  <div className="text-xs text-blue-700 space-y-1">
                    <p>1. In GHL: <strong>Automation → Workflows → Create Workflow</strong></p>
                    <p>2. Click <strong>&quot;Add New Trigger&quot;</strong> → choose <strong>&quot;Inbound Webhook&quot;</strong></p>
                    <p>3. GHL generates a webhook URL — <strong>copy it</strong></p>
                    <p>4. Paste it below 👇</p>
                  </div>
                )}
                {selectedTemplate === 'Custom' && (
                  <div className="text-xs text-blue-700 space-y-1">
                    <p>Paste any URL that accepts HTTP POST requests with JSON. Kyra will send lead data to it whenever a pipeline event occurs.</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Configure */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Step 3 — Configure</p>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Name</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Zapier — Add to HubSpot" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Webhook URL</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  placeholder={selectedTemplate ? TEMPLATES.find(t => t.name === selectedTemplate)?.urlHint : 'https://...'}
                  value={newUrl} onChange={e => setNewUrl(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">When should this fire?</label>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newEvents.has('*')} onChange={() => toggleEvent('*')}
                      className="h-3.5 w-3.5 text-indigo-600 rounded border-gray-300" />
                    <span className="text-xs font-medium text-gray-700">🔔 Every pipeline event (recommended for CRM sync)</span>
                  </label>
                  <div className="border-t border-gray-100 my-2" />
                  <p className="text-[10px] text-gray-400 mb-1">Or pick specific events:</p>
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
              <details className="text-xs">
                <summary className="text-gray-400 cursor-pointer hover:text-gray-600">Advanced: Signing secret (optional)</summary>
                <div className="mt-2">
                  <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                    placeholder="whsec_..." value={newSecret} onChange={e => setNewSecret(e.target.value)} />
                  <p className="text-[10px] text-gray-400 mt-1">If set, Kyra signs every payload with HMAC-SHA256 so you can verify it&apos;s really from us.</p>
                </div>
              </details>
            </div>

            <Button onClick={createWebhook} disabled={!newName.trim() || !newUrl.trim() || saving}
              className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : <><Check className="h-4 w-4 mr-2" /> Save Integration</>}
            </Button>
          </div>
        </div>
      )}

      {/* ═══ PAYLOAD FORMAT (collapsed by default) ═══ */}
      <details className="bg-gray-50 rounded-xl border border-gray-200">
        <summary className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700">
          🔧 Technical: Payload format (for developers)
        </summary>
        <div className="px-4 pb-4">
          <pre className="text-[11px] text-gray-700 bg-white rounded-lg p-3 border overflow-x-auto">{`POST {your_webhook_url}
Content-Type: application/json
X-Kyra-Event: lead.messaged
X-Kyra-Signature: sha256=... (if secret set)
X-Kyra-Timestamp: 1708948800

{
  "event": "lead.messaged",
  "timestamp": "2026-02-26T10:00:00Z",
  "agency_id": "uuid",
  "campaign": {
    "id": "uuid",
    "name": "Cannabis Dispensaries — LA"
  },
  "lead": {
    "id": "uuid",
    "full_name": "John Smith",
    "company": "Green Leaf Dispensary",
    "email": "john@greenleaf.com",
    "phone": "+13105551234",
    "website": "greenleaf.com",
    "industry": "Cannabis Dispensary",
    "location": "Los Angeles, CA",
    "stage": "messaged",
    "previous_stage": "outreach_approved",
    "personalized_subject": "Quick question about Green Leaf",
    "personalized_email": "...",
    "personalized_opener": "...",
    "ghl_contact_id": "abc123"
  }
}`}</pre>
          <p className="text-[10px] text-gray-400 mt-2">
            Works with Zapier (Catch Hook), Make (Custom Webhook), n8n (Webhook node), GHL (Inbound Webhook), HubSpot, Salesforce, Airtable — any tool that accepts HTTP POST.
          </p>
        </div>
      </details>
    </div>
  );
}
