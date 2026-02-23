'use client';

// Full-stack Voice AI channel configuration
// Supports VAPI, Synthflow, and Retell AI
// Features: provider selection, API key, phone provisioning, call history, outbound calls

import { useState, useEffect } from 'react';
import {
  Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Mic, Settings, ExternalLink, Copy, CheckCircle2, Loader2,
  ChevronDown, ChevronUp, Zap, Clock, BarChart2, ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { VoiceProvider } from '@/lib/voice/types';
import { VOICE_PROVIDERS } from '@/lib/voice/provider';

interface Props {
  client: {
    id: string;
    name: string;
    container_config?: Record<string, unknown> | null;
  };
}

interface VoiceConfig {
  provider?: VoiceProvider;
  assistantId?: string;
  phoneNumber?: string;
  phoneNumberId?: string;
  aiName?: string;
  enabled?: boolean;
  syncedAt?: string;
  voiceId?: string;
  language?: string;
}

interface CallLog {
  id: string;
  user_message: string;
  ai_response: string;
  created_at: string;
  metadata: {
    type: string;
    direction: 'inbound' | 'outbound';
    callerNumber?: string;
    durationSeconds?: number;
    status: string;
    recordingUrl?: string;
  };
}

const PROVIDER_COLORS: Record<VoiceProvider, string> = {
  vapi: 'bg-purple-600',
  synthflow: 'bg-blue-600',
  retell: 'bg-green-600',
};

const PROVIDER_LOGOS: Record<VoiceProvider, string> = {
  vapi: '🎙️',
  synthflow: '⚡',
  retell: '🔄',
};

export function VoiceChannelCard({ client }: Props) {
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({});
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showOutbound, setShowOutbound] = useState(false);
  const [copied, setCopied] = useState(false);

  // Config form state
  const [selectedProvider, setSelectedProvider] = useState<VoiceProvider>('vapi');
  const [apiKey, setApiKey] = useState('');
  const [aiName, setAiName] = useState('');
  const [areaCode, setAreaCode] = useState('415');
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState('');

  // Outbound call form
  const [outboundPhone, setOutboundPhone] = useState('');
  const [outboundName, setOutboundName] = useState('');
  const [outboundContext, setOutboundContext] = useState('');
  const [calling, setCalling] = useState(false);
  const [callResult, setCallResult] = useState('');

  const isConfigured = !!(voiceConfig.phoneNumber && voiceConfig.enabled);

  // Load voice config on mount
  useEffect(() => {
    fetch(`/api/voice/assistants?clientId=${client.id}`)
      .then(r => r.json())
      .then(d => { if (d.voiceConfig) setVoiceConfig(d.voiceConfig); })
      .catch(() => {});
  }, [client.id]);

  const loadCallLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/conversations?clientId=${client.id}&channel=voice&limit=10`);
      const data = await res.json();
      setCallLogs(data.conversations ?? []);
    } catch { /* ignore */ } finally {
      setLoadingLogs(false);
    }
  };

  const handleSync = async () => {
    if (!apiKey) { setSyncError('API key required'); return; }
    setSyncing(true);
    setSyncError('');
    setSyncSuccess('');
    try {
      const res = await fetch('/api/voice/assistants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          provider: selectedProvider,
          apiKey,
          aiName: aiName || undefined,
          areaCode: areaCode || '415',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to configure voice');
      setVoiceConfig({
        provider: selectedProvider,
        assistantId: data.assistantId,
        phoneNumber: data.phoneNumber,
        phoneNumberId: data.phoneNumberId,
        enabled: true,
        aiName: aiName || undefined,
        syncedAt: new Date().toISOString(),
      });
      setSyncSuccess(`✅ Voice AI live! Phone: ${data.phoneNumber}`);
      setShowConfig(false);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Setup failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleOutboundCall = async () => {
    if (!outboundPhone) { setCallResult('Enter a phone number'); return; }
    setCalling(true);
    setCallResult('');
    try {
      const res = await fetch('/api/voice/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          toNumber: outboundPhone,
          customerName: outboundName || undefined,
          context: outboundContext || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Call failed');
      setCallResult(`📞 Call initiated! ID: ${data.callId}`);
      setOutboundPhone('');
    } catch (e) {
      setCallResult(`❌ ${e instanceof Error ? e.message : 'Failed'}`);
    } finally {
      setCalling(false);
    }
  };

  const copyPhone = () => {
    if (!voiceConfig.phoneNumber) return;
    navigator.clipboard.writeText(voiceConfig.phoneNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <Card className={isConfigured ? 'border-purple-200' : 'border-gray-200'}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isConfigured ? 'bg-purple-100' : 'bg-gray-100'}`}>
            <Phone className={`h-5 w-5 ${isConfigured ? 'text-purple-600' : 'text-gray-500'}`} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Voice AI — Inbound &amp; Outbound Calls</CardTitle>
            <CardDescription className="text-xs">
              AI answers every call, books appointments, qualifies leads · VAPI · Synthflow · Retell
            </CardDescription>
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            isConfigured
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {isConfigured ? `✅ Live · ${voiceConfig.provider?.toUpperCase()}` : '⚙️ Setup Required'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* Active phone number */}
        {isConfigured && (
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs text-purple-600 font-semibold mb-1">
                  {PROVIDER_LOGOS[voiceConfig.provider!]} {VOICE_PROVIDERS[voiceConfig.provider!].name} · {voiceConfig.aiName ?? 'AI'} is live
                </p>
                <p className="text-2xl font-black text-purple-900 font-mono tracking-wider">
                  {voiceConfig.phoneNumber}
                </p>
                <p className="text-xs text-purple-500 mt-0.5">
                  Share this number — your AI answers every call instantly
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={copyPhone} className="text-xs gap-1.5">
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5"
                  onClick={() => {
                    setShowOutbound(!showOutbound);
                    if (!showOutbound) setShowConfig(false);
                  }}
                >
                  <PhoneOutgoing className="h-3.5 w-3.5" />
                  Outbound Call
                </Button>
              </div>
            </div>

            {/* Call stats */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { icon: PhoneIncoming, label: 'Inbound calls', value: '—' },
                { icon: Clock, label: 'Avg duration', value: '—' },
                { icon: BarChart2, label: 'Bookings made', value: '—' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <s.icon className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                  <p className="text-lg font-black text-purple-900">{s.value}</p>
                  <p className="text-[10px] text-purple-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What voice AI does (if not configured) */}
        {!isConfigured && (
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { icon: '📞', title: 'Answers every call', desc: 'Responds instantly, 24/7 — no more missed calls to voicemail' },
              { icon: '📅', title: 'Books appointments', desc: 'Checks availability and books during the call, in real time' },
              { icon: '🎯', title: 'Qualifies leads', desc: 'Asks the right questions, captures info, routes hot leads' },
              { icon: '📱', title: 'Follows up via SMS', desc: 'Sends a text recap after every call automatically' },
            ].map(f => (
              <div key={f.title} className="flex gap-2.5 bg-gray-50 rounded-xl p-3">
                <span className="text-xl shrink-0">{f.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{f.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ROI callout */}
        {!isConfigured && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            <strong>Real results:</strong> Voice AI generates 6–12× ROI. A law firm case study showed +$85K/month from near-zero missed calls. Home services: 2,967% ROI by capturing emergency calls.
          </div>
        )}

        {/* Outbound call panel */}
        {isConfigured && showOutbound && (
          <div className="border border-purple-100 rounded-xl p-4 space-y-3 bg-purple-50/50">
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <PhoneOutgoing className="h-4 w-4 text-purple-600" />
              Make an outbound AI call
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                value={outboundPhone}
                onChange={e => setOutboundPhone(e.target.value)}
                placeholder="+1 415 555 0100"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
              <input
                value={outboundName}
                onChange={e => setOutboundName(e.target.value)}
                placeholder="Customer name (optional)"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <input
              value={outboundContext}
              onChange={e => setOutboundContext(e.target.value)}
              placeholder="Why we're calling (e.g. 'following up on your appointment request from yesterday')"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={handleOutboundCall}
                disabled={calling}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
              >
                {calling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PhoneCall className="h-3.5 w-3.5" />}
                {calling ? 'Calling…' : 'Start Call'}
              </Button>
              {callResult && <p className="text-xs text-gray-700">{callResult}</p>}
            </div>
          </div>
        )}

        {/* Call history */}
        {isConfigured && (
          <button
            onClick={() => {
              const next = !showLogs;
              setShowLogs(next);
              if (next && callLogs.length === 0) loadCallLogs();
            }}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900 transition"
          >
            <span className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-purple-500" />
              Call history
            </span>
            {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}

        {showLogs && (
          <div className="space-y-2">
            {loadingLogs && (
              <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading calls…
              </div>
            )}
            {!loadingLogs && callLogs.length === 0 && (
              <p className="text-xs text-gray-400 py-2 text-center border border-dashed rounded-lg">
                No calls yet — share the phone number to start receiving calls
              </p>
            )}
            {callLogs.map(log => (
              <div key={log.id} className="border border-gray-100 rounded-xl p-3 bg-white">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    {log.metadata?.direction === 'outbound'
                      ? <PhoneOutgoing className="h-3.5 w-3.5 text-blue-500" />
                      : log.metadata?.status === 'failed'
                        ? <PhoneMissed className="h-3.5 w-3.5 text-red-400" />
                        : <PhoneIncoming className="h-3.5 w-3.5 text-green-500" />}
                    <span className="text-xs font-semibold text-gray-700">
                      {log.metadata?.callerNumber ?? 'Unknown caller'}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {formatDuration(log.metadata?.durationSeconds)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.metadata?.recordingUrl && (
                      <a href={log.metadata.recordingUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3" /> Recording
                      </a>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{log.ai_response}</p>
              </div>
            ))}
          </div>
        )}

        {/* Provider selection + setup */}
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900 transition"
        >
          <span className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {isConfigured ? 'Reconfigure voice AI' : 'Set up voice AI'}
          </span>
          {showConfig ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showConfig && (
          <div className="space-y-4 border border-gray-200 rounded-xl p-4">

            {/* Provider cards */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Choose your voice AI provider</p>
              <div className="grid sm:grid-cols-3 gap-2">
                {(Object.entries(VOICE_PROVIDERS) as [VoiceProvider, typeof VOICE_PROVIDERS[VoiceProvider]][]).map(([key, prov]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedProvider(key)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      selectedProvider === key
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs font-black text-white px-2 py-0.5 rounded-full ${PROVIDER_COLORS[key]}`}>
                        {prov.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-snug">{prov.description}</p>
                    <p className="text-[10px] text-gray-400 mt-1 leading-snug">{prov.pricing}</p>
                    <a
                      href={prov.signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-0.5 text-[10px] text-indigo-600 hover:underline mt-1.5"
                    >
                      Get API key <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </button>
                ))}
              </div>
            </div>

            {/* API key */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                {VOICE_PROVIDERS[selectedProvider].name} API Key *
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={selectedProvider === 'vapi' ? 'vapi-...' : selectedProvider === 'retell' ? 'key_...' : 'sf_...'}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 font-mono"
              />
            </div>

            {/* AI name + area code */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">AI Employee Name</label>
                <input
                  value={aiName}
                  onChange={e => setAiName(e.target.value)}
                  placeholder="Alex"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone Area Code</label>
                <input
                  value={areaCode}
                  onChange={e => setAreaCode(e.target.value)}
                  placeholder="415"
                  maxLength={3}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 font-mono"
                />
              </div>
            </div>

            {syncError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl">
                {syncError}
              </div>
            )}
            {syncSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2 rounded-xl">
                {syncSuccess}
              </div>
            )}

            <Button
              onClick={handleSync}
              disabled={syncing || !apiKey}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              {syncing
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up…</>
                : <><Zap className="h-4 w-4" /> {isConfigured ? 'Update Voice AI' : 'Activate Voice AI & Get Phone Number'}</>}
            </Button>

            <p className="text-[11px] text-gray-400 text-center">
              This will create an AI assistant on {VOICE_PROVIDERS[selectedProvider].name} and provision a phone number.
              Your API key is stored securely and never exposed to the client.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
