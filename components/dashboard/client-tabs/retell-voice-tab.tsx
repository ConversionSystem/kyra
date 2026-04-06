'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, Mic, Clock,
  Loader2, Play, CheckCircle2, AlertTriangle, Settings,
  BarChart3, Globe, Volume2, Plus, RefreshCw, Zap,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';
import { RetellWebClient } from 'retell-client-js-sdk';

// ── Types ──────────────────────────────────────────────────────────────────────

interface VoiceConfig {
  enabled?: boolean;
  provider?: string;
  retell_agent_id?: string;
  retell_llm_id?: string;
  phone_number?: string;
  retell_phone_number_id?: string;
  voice_id?: string;
  language?: string;
}

interface CallLog {
  call_id: string;
  call_status: string;
  start_timestamp?: number;
  end_timestamp?: number;
  transcript?: string;
  recording_url?: string;
  from_number?: string;
  to_number?: string;
  direction?: string;
  call_analysis?: {
    call_summary?: string;
    user_sentiment?: string;
    call_successful?: boolean;
  };
}

const VOICES = [
  { id: '11labs-Adrian', name: 'Adrian', gender: 'Male', accent: 'American', style: 'Professional' },
  { id: '11labs-Marissa', name: 'Marissa', gender: 'Female', accent: 'American', style: 'Friendly' },
  { id: 'openai-Nova', name: 'Nova', gender: 'Female', accent: 'American', style: 'Warm' },
  { id: 'openai-Onyx', name: 'Onyx', gender: 'Male', accent: 'American', style: 'Deep & Confident' },
  { id: '11labs-Dorothy', name: 'Dorothy', gender: 'Female', accent: 'British', style: 'Professional' },
  { id: '11labs-Billy', name: 'Billy', gender: 'Male', accent: 'American', style: 'Casual' },
  { id: '11labs-Lily', name: 'Lily', gender: 'Female', accent: 'American', style: 'Gentle' },
  { id: 'openai-Alloy', name: 'Alloy', gender: 'Neutral', accent: 'American', style: 'Versatile' },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export default function RetellVoiceTab({ client }: { client: AgencyClient }) {
  const cfg = (client.container_config as Record<string, unknown>) ?? {};
  const voiceConfig = (cfg.voice_config as VoiceConfig) ?? {};
  const hasAgent = !!voiceConfig.retell_agent_id;
  const hasPhone = !!voiceConfig.phone_number;

  const [section, setSection] = useState<'overview' | 'setup' | 'calls' | 'settings'>(hasAgent ? 'overview' : 'setup');
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [creating, setCreating] = useState(false);
  const [buyingNumber, setBuyingNumber] = useState(false);
  const [calling, setCalling] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(voiceConfig.voice_id || '11labs-Adrian');
  const [areaCode, setAreaCode] = useState('');
  const [outboundNumber, setOutboundNumber] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [webCallActive, setWebCallActive] = useState(false);
  const [webCallStatus, setWebCallStatus] = useState<string>('');
  const [retellClient] = useState(() => typeof window !== 'undefined' ? new RetellWebClient() : null);

  // Load call logs
  const loadCalls = useCallback(async () => {
    if (!hasAgent) return;
    setLoadingCalls(true);
    try {
      const res = await fetch(`/api/voice/retell/calls?clientId=${client.id}`);
      if (res.ok) {
        const data = await res.json();
        setCalls(data.calls || []);
      }
    } catch (err) { console.error('[voice] load calls:', err); }
    finally { setLoadingCalls(false); }
  }, [client.id, hasAgent]);

  useEffect(() => { loadCalls(); }, [loadCalls]);

  // Set up Retell web call event listeners
  useEffect(() => {
    if (!retellClient) return;
    retellClient.on('call_started', () => { setWebCallStatus('Connected \u2014 speak now'); });
    retellClient.on('call_ended', () => { setWebCallActive(false); setWebCallStatus('Call ended'); setTimeout(() => setWebCallStatus(''), 3000); loadCalls(); });
    retellClient.on('agent_start_talking', () => { setWebCallStatus('Agent speaking...'); });
    retellClient.on('agent_stop_talking', () => { setWebCallStatus('Listening...'); });
    retellClient.on('error', (error) => { console.error('[retell-web]', error); setWebCallActive(false); setWebCallStatus('Call error'); });
  }, [retellClient, loadCalls]);

  // Create agent
  const handleCreateAgent = async () => {
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/voice/retell/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, voiceId: selectedVoice }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Voice agent created! Setting up...' });
        // Reload with voice tab preserved via URL hash
        setTimeout(() => {
          const url = new URL(window.location.href);
          url.searchParams.set('settingsTab', 'voice');
          window.location.href = url.toString();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create agent' });
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }); }
    finally { setCreating(false); }
  };

  // Buy phone number
  const handleBuyNumber = async () => {
    setBuyingNumber(true);
    setMessage(null);
    try {
      const res = await fetch('/api/voice/retell/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, areaCode: areaCode ? Number(areaCode) : undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Phone number assigned: ${data.phone_number}` });
        setTimeout(() => {
          const url = new URL(window.location.href);
          url.searchParams.set('settingsTab', 'voice');
          window.location.href = url.toString();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to buy number' });
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }); }
    finally { setBuyingNumber(false); }
  };

  // Make outbound call
  const handleOutboundCall = async () => {
    if (!outboundNumber.trim()) return;
    setCalling(true);
    setMessage(null);
    try {
      const res = await fetch('/api/voice/retell/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, toNumber: outboundNumber.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Call initiated! Call ID: ${data.call_id}` });
        setOutboundNumber('');
        setTimeout(loadCalls, 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to initiate call' });
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }); }
    finally { setCalling(false); }
  };

  // Web call — start real browser-based voice call
  const handleWebCall = async () => {
    if (webCallActive && retellClient) {
      retellClient.stopCall();
      setWebCallActive(false);
      setWebCallStatus('');
      return;
    }
    setCalling(true);
    setMessage(null);
    setWebCallStatus('Connecting...');
    try {
      const res = await fetch('/api/voice/retell/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, webCall: true }),
      });
      const data = await res.json();
      if (res.ok && data.access_token && retellClient) {
        await retellClient.startCall({ accessToken: data.access_token });
        setWebCallActive(true);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to start web call' });
        setWebCallStatus('');
      }
    } catch { setMessage({ type: 'error', text: 'Network error — check microphone permissions' }); setWebCallStatus(''); }
    finally { setCalling(false); }
  };

  const formatDuration = (startMs?: number, endMs?: number) => {
    if (!startMs || !endMs) return '—';
    const secs = Math.round((endMs - startMs) / 1000);
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return mins > 0 ? `${mins}m ${s}s` : `${s}s`;
  };

  const formatDate = (ms?: number) => {
    if (!ms) return '—';
    return new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Phone className="w-5 h-5 text-indigo-600" /> Voice AI
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">AI-powered phone calls for {client.name}</p>
        </div>
        {hasAgent && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Active
            </span>
            {hasPhone && <span className="text-sm font-mono text-gray-600">{voiceConfig.phone_number}</span>}
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-lg p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 inline mr-1" /> : <AlertTriangle className="w-4 h-4 inline mr-1" />}
          {message.text}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'overview' as const, label: 'Overview', icon: BarChart3, show: hasAgent },
          { id: 'setup' as const, label: hasAgent ? 'Phone Number' : 'Setup', icon: Settings, show: true },
          { id: 'calls' as const, label: 'Call Logs', icon: PhoneCall, show: hasAgent },
        ].filter(t => t.show).map(t => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              section === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ──────────────────────────────────────────────── */}
      {section === 'overview' && hasAgent && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Calls', value: calls.length, icon: Phone },
              { label: 'Inbound', value: calls.filter(c => c.direction !== 'outbound').length, icon: PhoneIncoming },
              { label: 'Outbound', value: calls.filter(c => c.direction === 'outbound').length, icon: PhoneOutgoing },
              { label: 'Avg Duration', value: calls.length > 0 ? Math.round(calls.reduce((s, c) => s + ((c.end_timestamp ?? 0) - (c.start_timestamp ?? 0)), 0) / calls.length / 1000) + 's' : '—', icon: Clock },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                  <s.icon className="w-3.5 h-3.5" /> {s.label}
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Outbound Call */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <PhoneOutgoing className="w-4 h-4 text-indigo-600" /> Make a Call
              </h3>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={outboundNumber}
                  onChange={e => setOutboundNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <button
                  onClick={handleOutboundCall}
                  disabled={calling || !outboundNumber.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {calling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                  Call
                </button>
              </div>
            </div>

            {/* Web Call Test */}
            <div className={`bg-white rounded-xl border p-5 ${webCallActive ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-gray-200'}`}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Globe className={`w-4 h-4 ${webCallActive ? 'text-emerald-600' : 'text-indigo-600'}`} /> Test Voice Agent
              </h3>
              {webCallStatus && (
                <div className={`text-xs font-medium mb-3 flex items-center gap-2 ${webCallActive ? 'text-emerald-700' : 'text-gray-500'}`}>
                  {webCallActive && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
                  {webCallStatus}
                </div>
              )}
              {!webCallActive && <p className="text-xs text-gray-500 mb-3">Start a browser-based voice call to test your AI agent.</p>}
              <button
                onClick={handleWebCall}
                disabled={calling}
                className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  webCallActive
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
                }`}
              >
                {calling ? <Loader2 className="w-4 h-4 animate-spin" /> : webCallActive ? <Phone className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {webCallActive ? 'End Call' : 'Start Web Call'}
              </button>
            </div>
          </div>

          {/* Agent Info */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-xs text-gray-500 space-y-1">
            <p><span className="font-medium text-gray-700">Voice:</span> {VOICES.find(v => v.id === voiceConfig.voice_id)?.name || voiceConfig.voice_id || 'Default'}</p>
            <p><span className="font-medium text-gray-700">Phone:</span> {voiceConfig.phone_number || 'No number assigned'}</p>
          </div>
        </div>
      )}

      {/* ── Setup / Phone Number ─────────────────────────────────── */}
      {section === 'setup' && (
        <div className="space-y-6">
          {!hasAgent ? (
            <>
              {/* Step 1: Select Voice */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Step 1: Choose a Voice</h3>
                <p className="text-xs text-gray-500 mb-4">Select the voice your AI will use on phone calls.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {VOICES.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVoice(v.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selectedVoice === v.id
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Volume2 className={`w-4 h-4 ${selectedVoice === v.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                        <span className="font-semibold text-sm text-gray-900">{v.name}</span>
                      </div>
                      <p className="text-xs text-gray-500">{v.gender} · {v.accent} · {v.style}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Create Agent */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Step 2: Create Voice Agent</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Your AI personality and business knowledge from the Train AI tab will be used automatically.
                </p>
                <button
                  onClick={handleCreateAgent}
                  disabled={creating}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {creating ? 'Creating...' : 'Create Voice Agent'}
                </button>
              </div>
            </>
          ) : !hasPhone ? (
            /* Buy Phone Number */
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Phone className="w-5 h-5 text-indigo-600" /> Assign a Phone Number
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Buy a phone number so customers can call your AI. The AI will answer instantly 24/7.
              </p>
              <div className="flex gap-3 items-end">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Area Code (optional)</label>
                  <input
                    type="text"
                    value={areaCode}
                    onChange={e => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="408"
                    maxLength={3}
                    className="w-24 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <button
                  onClick={handleBuyNumber}
                  disabled={buyingNumber}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {buyingNumber ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {buyingNumber ? 'Buying...' : 'Buy Number'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3">Phone numbers cost ~$3/mo. The AI answers all calls automatically.</p>
            </div>
          ) : (
            /* Already set up */
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-base font-semibold text-gray-900">Voice AI is fully set up!</h3>
              <p className="text-sm text-gray-600 mt-1">
                Phone number <span className="font-mono font-bold">{voiceConfig.phone_number}</span> is active and answering calls.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Call Logs ────────────────────────────────────────────── */}
      {section === 'calls' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Recent Calls</h3>
            <button onClick={loadCalls} className="text-gray-400 hover:text-gray-600 transition">
              <RefreshCw className={`w-4 h-4 ${loadingCalls ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingCalls ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : calls.length === 0 ? (
            <div className="text-center py-16">
              <Phone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No calls yet</p>
              <p className="text-xs text-gray-400 mt-1">Calls will appear here once your AI starts answering.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {calls.map(call => (
                <div key={call.call_id} className="border-b border-gray-100 last:border-0">
                  <button
                    onClick={() => setExpandedCall(expandedCall === call.call_id ? null : call.call_id)}
                    className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-gray-50 transition"
                  >
                    {call.direction === 'outbound'
                      ? <PhoneOutgoing className="w-4 h-4 text-blue-500 shrink-0" />
                      : <PhoneIncoming className="w-4 h-4 text-emerald-500 shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {call.from_number || call.to_number || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(call.start_timestamp)} · {formatDuration(call.start_timestamp, call.end_timestamp)}
                      </p>
                    </div>
                    {call.call_analysis?.user_sentiment && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        call.call_analysis.user_sentiment === 'Positive' ? 'bg-emerald-50 text-emerald-700' :
                        call.call_analysis.user_sentiment === 'Negative' ? 'bg-red-50 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {call.call_analysis.user_sentiment}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      call.call_status === 'ended' ? 'bg-gray-100 text-gray-600' :
                      call.call_status === 'error' ? 'bg-red-50 text-red-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {call.call_status}
                    </span>
                  </button>

                  {expandedCall === call.call_id && (
                    <div className="px-4 pb-4 space-y-3 bg-gray-50">
                      {call.call_analysis?.call_summary && (
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">Summary</p>
                          <p className="text-sm text-gray-600">{call.call_analysis.call_summary}</p>
                        </div>
                      )}
                      {call.transcript && (
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">Transcript</p>
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-white p-3 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                            {call.transcript}
                          </pre>
                        </div>
                      )}
                      {call.recording_url && (
                        <a
                          href={call.recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          <Play className="w-3.5 h-3.5" /> Listen to recording
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
