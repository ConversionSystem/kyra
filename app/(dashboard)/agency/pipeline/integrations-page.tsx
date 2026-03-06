'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Webhook, Plus, ArrowRight, Check, X, Loader2,
  Link2, Unlink, Building2, Calendar, Tag, Users, MessageSquare,
  TrendingUp, Shield, Clock, ChevronDown, ChevronUp,
  Star, Lock, ExternalLink, Info, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import WebhookSettings from './webhook-settings';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GHLConnection {
  connected: boolean;
  location_id: string | null;
  location_name: string | null;
  connected_at: string | null;
}

// ─── Native Integration Cards ─────────────────────────────────────────────────
const GHL_CAPABILITIES = [
  { icon: Users, label: 'Auto-create contacts', desc: 'Pipeline leads become GHL contacts instantly — name, email, phone, enrichment notes', color: 'text-blue-600 bg-blue-50' },
  { icon: MessageSquare, label: 'Send messages', desc: 'AI sends emails & SMS directly through GHL — no Twilio needed', color: 'text-indigo-600 bg-indigo-50' },
  { icon: Calendar, label: 'Book appointments', desc: 'AI Closer books demos directly on your GHL calendar when leads are ready', color: 'text-green-600 bg-green-50' },
  { icon: TrendingUp, label: 'Move pipeline stages', desc: 'Lead stages auto-sync — Replied → Interested → Booked maps to your GHL pipeline', color: 'text-purple-600 bg-purple-50' },
  { icon: Tag, label: 'Add tags & triggers', desc: 'Auto-tag leads (e.g. "kyra-hot-lead") → triggers your GHL workflows & drip sequences', color: 'text-amber-600 bg-amber-50' },
  { icon: Building2, label: 'Create opportunities', desc: 'AI creates deals in your GHL pipeline with value estimates from enrichment data', color: 'text-emerald-600 bg-emerald-50' },
];

const COMING_SOON_CRMS = [
  {
    name: 'HubSpot', icon: '🧡', desc: 'Full OAuth — contacts, deals, meetings, email sequences',
    capabilities: ['Create/update contacts', 'Create deals', 'Book meetings', 'Trigger workflows', 'Log activity'],
  },
  {
    name: 'Salesforce', icon: '☁️', desc: 'Full OAuth — leads, opportunities, tasks, calendar',
    capabilities: ['Create leads & contacts', 'Create opportunities', 'Log tasks', 'Update pipeline', 'Sync calendar'],
  },
  {
    name: 'Pipedrive', icon: '📊', desc: 'API integration — deals, contacts, activities',
    capabilities: ['Create contacts', 'Create deals', 'Log activities', 'Move pipeline stages'],
  },
  {
    name: 'Close CRM', icon: '📞', desc: 'API integration — leads, opportunities, email sequences',
    capabilities: ['Create leads', 'Log calls & emails', 'Create opportunities', 'Trigger sequences'],
  },
];

export default function IntegrationsPage() {
  const [ghlConnection, setGhlConnection] = useState<GHLConnection | null>(null);
  const [loadingGhl, setLoadingGhl] = useState(true);
  const [showGhlConnect, setShowGhlConnect] = useState(false);
  const [ghlToken, setGhlToken] = useState('');
  const [ghlLocationId, setGhlLocationId] = useState('');
  const [connectingGhl, setConnectingGhl] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [expandedCrm, setExpandedCrm] = useState<string | null>(null);

  // Load GHL connection status
  const loadGhlStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/pipeline/integrations/ghl');
      if (res.ok) {
        const data = await res.json();
        setGhlConnection(data);
      } else {
        setGhlConnection({ connected: false, location_id: null, location_name: null, connected_at: null });
      }
    } catch {
      setGhlConnection({ connected: false, location_id: null, location_name: null, connected_at: null });
    } finally { setLoadingGhl(false); }
  }, []);

  useEffect(() => { loadGhlStatus(); }, [loadGhlStatus]);

  const connectGhl = async () => {
    if (!ghlToken.trim()) return;
    setConnectingGhl(true);
    try {
      const res = await fetch('/api/agency/pipeline/integrations/ghl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: ghlToken.trim(), location_id: ghlLocationId.trim() || undefined }),
      });
      if (res.ok) {
        setShowGhlConnect(false);
        setGhlToken('');
        setGhlLocationId('');
        await loadGhlStatus();
      } else {
        const data = await res.json();
        alert(`Failed: ${data.error || 'Unknown error'}`);
      }
    } finally { setConnectingGhl(false); }
  };

  const disconnectGhl = async () => {
    if (!confirm('Disconnect GHL? The AI pipeline will no longer be able to create contacts, send messages, or book appointments in GHL.')) return;
    await fetch('/api/agency/pipeline/integrations/ghl', { method: 'DELETE' });
    await loadGhlStatus();
  };

  return (
    <div className="space-y-8">

      {/* ═══ HEADER ═══ */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="h-5 w-5 text-indigo-500" />
          Pipeline Integrations
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Connect your CRM so the AI pipeline can create contacts, send messages, book appointments, and move deals — automatically.
        </p>
      </div>

      {/* ═══ NATIVE VS WEBHOOK EXPLAINER ═══ */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5">
        <button onClick={() => setShowComparison(!showComparison)} className="w-full flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Info className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Two types of integrations — and why it matters for revenue</p>
              <p className="text-xs text-gray-500">Native Integrations vs Webhook Automations</p>
            </div>
          </div>
          {showComparison ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>

        {showComparison && (
          <div className="mt-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Native */}
              <div className="bg-white rounded-xl p-4 border border-indigo-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="h-4 w-4 text-indigo-600" />
                  <p className="font-bold text-indigo-700 text-sm">Native Integrations</p>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">RECOMMENDED</span>
                </div>
                <p className="text-xs text-gray-600 mb-3">Two-way connection. Kyra <strong>operates inside</strong> your CRM — reads data, creates records, takes actions.</p>
                <ul className="space-y-1.5">
                  {['Auto-create CRM contacts', 'Book appointments on your calendar', 'Move deals through pipeline stages', 'Add tags that trigger your workflows', 'Send messages through your CRM', 'Zero extra cost — no Zapier needed'].map(item => (
                    <li key={item} className="text-xs text-gray-700 flex items-start gap-1.5">
                      <Check className="h-3 w-3 text-green-500 shrink-0 mt-0.5" /> {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <p className="text-xs font-bold text-indigo-700">💰 This is a $500/mo product</p>
                  <p className="text-[10px] text-gray-500">AI that operates your CRM = high value</p>
                </div>
              </div>

              {/* Webhooks */}
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Webhook className="h-4 w-4 text-gray-500" />
                  <p className="font-bold text-gray-700 text-sm">Webhook Automations</p>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">BASIC</span>
                </div>
                <p className="text-xs text-gray-600 mb-3">One-way notifications. Kyra <strong>tells</strong> your tools what happened — they handle the rest.</p>
                <ul className="space-y-1.5">
                  {['Notify when a lead is found', 'Alert when someone replies', 'Push data to Google Sheets', 'Trigger Zapier/Make workflows', 'Good for tools without native support'].map(item => (
                    <li key={item} className="text-xs text-gray-700 flex items-start gap-1.5">
                      <Check className="h-3 w-3 text-gray-400 shrink-0 mt-0.5" /> {item}
                    </li>
                  ))}
                  <li className="text-xs text-red-500 flex items-start gap-1.5">
                    <X className="h-3 w-3 shrink-0 mt-0.5" /> Can&apos;t act inside your CRM
                  </li>
                </ul>
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-500">💸 Requires Zapier ($20-50/mo)</p>
                  <p className="text-[10px] text-gray-400">Good fallback, not ideal</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-3 border border-indigo-100 text-center">
              <p className="text-xs text-indigo-700">
                <strong>Bottom line:</strong> Set up a native integration first. Use webhooks only for tools that don&apos;t have native support yet (Slack notifications, Google Sheets logging, etc.)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ═══ SECTION 1: NATIVE INTEGRATIONS ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="h-4 w-4 text-indigo-600" />
          <h3 className="text-base font-bold text-gray-900">Native CRM Integrations</h3>
          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">TWO-WAY</span>
        </div>

        {/* GHL — The main one */}
        <div className="bg-white border-2 border-indigo-200 rounded-xl overflow-hidden shadow-sm mb-4">
          {/* GHL Header */}
          <div className="p-5 bg-gradient-to-r from-indigo-50 to-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border text-2xl">📊</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900">GoHighLevel</h4>
                    {ghlConnection?.connected ? (
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Connected
                      </span>
                    ) : (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">Not connected</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Full two-way integration — contacts, messages, calendar, pipeline, tags, workflows</p>
                </div>
              </div>
              {loadingGhl ? (
                <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
              ) : ghlConnection?.connected ? (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={disconnectGhl} className="text-xs text-red-500 border-red-200 hover:bg-red-50">
                    <Unlink className="h-3 w-3 mr-1" /> Disconnect
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={() => setShowGhlConnect(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  <Link2 className="h-3 w-3 mr-1" /> Connect GHL
                </Button>
              )}
            </div>

            {ghlConnection?.connected && ghlConnection.location_id && (
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span>Location: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{ghlConnection.location_id}</code></span>
                {ghlConnection.connected_at && <span>Connected {new Date(ghlConnection.connected_at).toLocaleDateString()}</span>}
              </div>
            )}
          </div>

          {/* GHL Capabilities */}
          <div className="p-5 border-t border-indigo-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">What this enables for your AI pipeline</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {GHL_CAPABILITIES.map((cap) => {
                const Icon = cap.icon;
                return (
                  <div key={cap.label} className="flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cap.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{cap.label}</p>
                      <p className="text-[10px] text-gray-500 leading-relaxed">{cap.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Revenue callout */}
          {!ghlConnection?.connected && (
            <div className="px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-100">
              <p className="text-xs text-amber-800">
                <strong>💡 Revenue impact:</strong> Agencies with GHL connected sell AI workers at $300-500/mo per client.
                Without it, the AI can only notify — it can&apos;t act. That&apos;s the difference between a $99 tool and a $500 AI employee.
              </p>
            </div>
          )}
        </div>

        {/* Coming Soon CRMs */}
        <div className="grid sm:grid-cols-2 gap-3">
          {COMING_SOON_CRMS.map((crm) => (
            <div key={crm.name} className="bg-white border border-gray-200 rounded-xl p-4 opacity-75">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{crm.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{crm.name}</p>
                    <p className="text-[10px] text-gray-400">{crm.desc}</p>
                  </div>
                </div>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">COMING SOON</span>
              </div>
              <button onClick={() => setExpandedCrm(expandedCrm === crm.name ? null : crm.name)} className="text-[10px] text-indigo-600 hover:underline">
                {expandedCrm === crm.name ? 'Hide capabilities' : 'See capabilities →'}
              </button>
              {expandedCrm === crm.name && (
                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                  {crm.capabilities.map(cap => (
                    <p key={cap} className="text-[10px] text-gray-500 flex items-center gap-1.5">
                      <Lock className="h-2.5 w-2.5 text-gray-300" /> {cap}
                    </p>
                  ))}
                  <p className="text-[10px] text-indigo-500 mt-1.5">Want this sooner? Let us know — most requested ships first.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ SECTION 2: WEBHOOK AUTOMATIONS ═══ */}
      <div className="border-t border-gray-200 pt-8">
        <div className="flex items-center gap-2 mb-1">
          <Webhook className="h-4 w-4 text-gray-500" />
          <h3 className="text-base font-bold text-gray-900">Webhook Automations</h3>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">ONE-WAY</span>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          For tools without native support — push pipeline events to Zapier, Make, n8n, Slack, Google Sheets, or any HTTP endpoint.
        </p>
        <WebhookSettings />
      </div>

      {/* ═══ GHL CONNECT MODAL ═══ */}
      {showGhlConnect && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !connectingGhl && setShowGhlConnect(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="text-2xl">📊</span> Connect GoHighLevel
              </h2>
              <button onClick={() => setShowGhlConnect(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            {/* Step-by-step guide */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
              <p className="text-xs font-bold text-blue-800 mb-2">How to get your Private Integration Token</p>
              <div className="text-xs text-blue-700 space-y-1.5">
                <p><strong>1.</strong> Log into your GHL sub-account (the one you want to connect)</p>
                <p><strong>2.</strong> Go to <strong>Settings → Integrations → Private Integrations</strong></p>
                <p><strong>3.</strong> Click <strong>&quot;Create Private Integration&quot;</strong></p>
                <p><strong>4.</strong> Name it <strong>&quot;Kyra AI Pipeline&quot;</strong></p>
                <p><strong>5.</strong> In <strong>Scopes</strong>, enable these permissions:</p>
                <div className="bg-white/70 rounded-lg p-2 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {[
                    'contacts.write', 'contacts.readonly',
                    'conversations.write', 'conversations.readonly',
                    'calendars.write', 'calendars.readonly',
                    'opportunities.write', 'opportunities.readonly',
                    'campaigns.readonly', 'businesses.readonly',
                  ].map(scope => (
                    <span key={scope} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono">{scope}</span>
                  ))}
                </div>
                <p><strong>6.</strong> Click <strong>&quot;Save&quot;</strong> → copy the <strong>API Key</strong></p>
                <p><strong>7.</strong> Paste it below 👇</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Private Integration Token *</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={ghlToken} onChange={e => setGhlToken(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Location ID <span className="text-amber-600">(recommended)</span></label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. ve9EPM428h8vShlRW1KT"
                  value={ghlLocationId} onChange={e => setGhlLocationId(e.target.value)} />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  How to find it: In GHL, go to <strong>Settings → Business Profile</strong> and scroll down, or look at the URL — it&apos;s the ID after <code className="bg-gray-100 px-1 rounded">/location/</code> in the address bar.
                </p>
              </div>
            </div>

            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg p-3">
              <p className="text-xs text-amber-700 flex items-start gap-1.5">
                <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Your token is encrypted at rest and only used by your AI pipeline. It&apos;s never shared with other agencies or exposed in the browser.</span>
              </p>
            </div>

            <Button onClick={connectGhl} disabled={!ghlToken.trim() || connectingGhl}
              className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white">
              {connectingGhl ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Connecting...</> : <><Link2 className="h-4 w-4 mr-2" /> Connect GoHighLevel</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
