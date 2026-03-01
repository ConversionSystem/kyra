'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  Settings,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ArrowRight,
  Clock,
  User,
  MessageSquare,
  AlertTriangle,
  Play,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface VoiceConfig {
  provider: string;
  apiKey?: string;
  assistantId?: string;
  phoneNumber?: string;
  phoneNumberId?: string;
  aiName?: string;
  voiceId?: string;
  language?: string;
  enabled?: boolean;
  syncedAt?: string;
}

interface CallLog {
  id: string;
  created_at: string;
  user_message: string;
  ai_response: string;
  metadata: {
    type?: string;
    callId?: string;
    provider?: string;
    phoneNumber?: string;
    callerNumber?: string;
    direction?: string;
    status?: string;
    durationSeconds?: number;
    recordingUrl?: string;
    endedReason?: string;
  };
}

interface Props {
  agencyId: string;
  clientId: string | null;
  clientName: string;
  voiceConfig: Record<string, string> | null;
  isSolo: boolean;
}

// ── Provider Cards ────────────────────────────────────────────────────────────

const PROVIDERS = [
  {
    id: 'vapi',
    name: 'VAPI',
    logo: '🔊',
    description: 'Most flexible, developer-friendly. Best API.',
    pricing: '~$0.15–0.20/min all-in',
    bestFor: 'Custom setups, full control',
    signupUrl: 'https://dashboard.vapi.ai',
    docsUrl: 'https://docs.vapi.ai',
    color: 'border-blue-500/30 bg-blue-500/5',
    badge: 'Recommended',
  },
  {
    id: 'synthflow',
    name: 'Synthflow',
    logo: '🎙️',
    description: 'Built for agencies — white-label, flat pricing.',
    pricing: '$1,400/mo (6K min, unlimited clients)',
    bestFor: 'Agencies with 10+ clients',
    signupUrl: 'https://app.synthflow.ai',
    docsUrl: 'https://docs.synthflow.ai',
    color: 'border-purple-500/30 bg-purple-500/5',
    badge: 'Best for Agencies',
  },
  {
    id: 'retell',
    name: 'Retell AI',
    logo: '📞',
    description: 'Enterprise-grade, high concurrency, analytics.',
    pricing: '~$0.13–0.31/min pay-as-you-go',
    bestFor: 'High call volume, enterprise',
    signupUrl: 'https://www.retellai.com',
    docsUrl: 'https://docs.retellai.com',
    color: 'border-green-500/30 bg-green-500/5',
    badge: 'Enterprise',
  },
] as const;

// ── Voice Presets ─────────────────────────────────────────────────────────────

const VOICE_PRESETS = [
  { id: 'default', name: 'Alex (Default)', gender: 'Male', accent: 'American', description: 'Warm, professional' },
  { id: 'female-1', name: 'Sarah', gender: 'Female', accent: 'American', description: 'Friendly, conversational' },
  { id: 'male-uk', name: 'James', gender: 'Male', accent: 'British', description: 'Polished, authoritative' },
  { id: 'female-uk', name: 'Emma', gender: 'Female', accent: 'British', description: 'Elegant, warm' },
  { id: 'male-au', name: 'Liam', gender: 'Male', accent: 'Australian', description: 'Casual, approachable' },
  { id: 'female-es', name: 'Sofia', gender: 'Female', accent: 'Spanish', description: 'Energetic, bilingual' },
];

// ── Main Component ────────────────────────────────────────────────────────────

export function VoiceClient({ agencyId, clientId, clientName, voiceConfig: initialConfig, isSolo }: Props) {
  const [step, setStep] = useState<'provider' | 'setup' | 'active'>(
    initialConfig?.enabled ? 'active' : initialConfig?.provider ? 'setup' : 'provider'
  );
  const [selectedProvider, setSelectedProvider] = useState<string>(initialConfig?.provider ?? '');
  const [apiKey, setApiKey] = useState('');
  const [aiName, setAiName] = useState(initialConfig?.aiName ?? 'Alex');
  const [selectedVoice, setSelectedVoice] = useState(initialConfig?.voiceId ?? 'default');
  const [language, setLanguage] = useState(initialConfig?.language ?? 'en');
  const [saving, setSaving] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState<VoiceConfig | null>(
    initialConfig ? (initialConfig as unknown as VoiceConfig) : null
  );
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [testingCall, setTestingCall] = useState(false);

  // Load call logs
  const loadCallLogs = useCallback(async () => {
    if (!clientId) return;
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/agency/conversations?clientId=${clientId}&channel=voice&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setCallLogs(data.conversations ?? []);
      }
    } catch { /* ignore */ }
    setLoadingLogs(false);
  }, [clientId]);

  useEffect(() => {
    if (step === 'active') loadCallLogs();
  }, [step, loadCallLogs]);

  // ── Save config + create assistant ──────────────────────────────────────

  const handleSetup = async () => {
    if (!clientId) {
      setError('No client configured yet. Please set up your AI worker first.');
      return;
    }
    if (!apiKey.trim()) {
      setError('Please enter your API key.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/voice/assistants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          provider: selectedProvider,
          apiKey: apiKey.trim(),
          aiName,
          voiceId: selectedVoice !== 'default' ? selectedVoice : undefined,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set up voice assistant');

      setConfig({
        provider: selectedProvider,
        assistantId: data.assistantId,
        phoneNumber: data.phoneNumber,
        phoneNumberId: data.phoneNumberId,
        aiName,
        voiceId: selectedVoice,
        language,
        enabled: true,
        syncedAt: new Date().toISOString(),
      });
      setSuccess('Voice AI activated! Your AI worker can now handle phone calls.');
      setStep('active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    }
    setSaving(false);
  };

  // ── Test outbound call ──────────────────────────────────────────────────

  const handleTestCall = async (toNumber: string) => {
    if (!clientId) return;
    setTestingCall(true);
    setError(null);

    try {
      const res = await fetch('/api/voice/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          toNumber,
          customerName: 'Test Call',
          context: 'This is a test call to verify the voice AI is working correctly.',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate test call');
      setSuccess(`Test call initiated! Call ID: ${data.callId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test call failed');
    }
    setTestingCall(false);
  };

  // ── Copy webhook URL ────────────────────────────────────────────────────

  const entityId = clientId ?? agencyId;
  const webhookUrl = `https://kyra.conversionsystem.com/api/voice/webhook?provider=${selectedProvider || config?.provider || 'vapi'}&clientId=${entityId}`;

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Render: Provider Selection ──────────────────────────────────────────

  if (step === 'provider') {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Voice AI</h1>
          <p className="text-gray-400 mt-1">
            Give your AI worker a phone number. It answers calls, books appointments, and qualifies leads — 24/7.
          </p>
        </div>

        {/* How it works */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              How Voice AI Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { icon: '📞', title: 'Customer calls', desc: 'Your dedicated business number' },
                { icon: '🤖', title: 'AI answers', desc: 'Greets them by your business name' },
                { icon: '💬', title: 'Natural conversation', desc: 'Qualifies, answers questions, books' },
                { icon: '📋', title: 'Logged to CRM', desc: 'Transcript, summary, follow-up tagged' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <div className="font-medium text-white text-sm">{s.title}</div>
                  <div className="text-gray-500 text-xs mt-1">{s.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Provider selection */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Choose a Voice Provider</h2>
          <p className="text-gray-400 text-sm mb-4">
            You&apos;ll need an account with one of these providers. They handle the phone infrastructure — Kyra connects your AI brain.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedProvider(p.id); setStep('setup'); }}
                className={cn(
                  'text-left p-5 rounded-xl border-2 transition-all hover:scale-[1.02]',
                  p.color,
                  'hover:border-opacity-60'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{p.logo}</span>
                  <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                    {p.badge}
                  </Badge>
                </div>
                <h3 className="font-bold text-white text-lg">{p.name}</h3>
                <p className="text-gray-400 text-sm mt-1">{p.description}</p>
                <div className="mt-3 space-y-1">
                  <div className="text-xs text-gray-500">💰 {p.pricing}</div>
                  <div className="text-xs text-gray-500">⭐ Best for: {p.bestFor}</div>
                </div>
                <div className="mt-3 flex items-center text-sm text-blue-400 font-medium">
                  Select <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Already have voice? */}
        {config?.enabled && (
          <Button variant="ghost" onClick={() => setStep('active')} className="text-gray-400">
            ← Back to active configuration
          </Button>
        )}
      </div>
    );
  }

  // ── Render: Setup ───────────────────────────────────────────────────────

  if (step === 'setup') {
    const provider = PROVIDERS.find(p => p.id === selectedProvider)!;

    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <Button variant="ghost" size="sm" onClick={() => setStep('provider')} className="text-gray-400 -ml-2 mb-2">
            ← Back to providers
          </Button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">{provider.logo}</span>
            Set Up {provider.name}
          </h1>
          <p className="text-gray-400 mt-1">
            Connect your {provider.name} account to give your AI worker a phone line.
          </p>
        </div>

        {/* Step 1: API Key */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold">1</span>
              Connect Your Account
            </CardTitle>
            <CardDescription>
              Get your API key from{' '}
              <a href={provider.signupUrl} target="_blank" rel="noopener" className="text-blue-400 hover:underline">
                {provider.name} Dashboard <ExternalLink className="w-3 h-3 inline" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">API Key</label>
              <Input
                type="password"
                placeholder={`Paste your ${provider.name} API key...`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 2: AI Name & Voice */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold">2</span>
              Customize Your AI
            </CardTitle>
            <CardDescription>How should your AI introduce itself on calls?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">AI Name</label>
              <Input
                placeholder="Alex"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                &quot;Hi, thanks for calling {clientName}! This is {aiName || 'Alex'}, how can I help?&quot;
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Voice</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {VOICE_PRESETS.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all',
                      selectedVoice === v.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    )}
                  >
                    <div className="font-medium text-white text-sm">{v.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{v.gender} · {v.accent}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{v.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md p-2 text-sm"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="pt">Portuguese</option>
                <option value="it">Italian</option>
                <option value="nl">Dutch</option>
                <option value="hi">Hindi</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese (Mandarin)</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Webhook URL */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold">3</span>
              Set Up Webhook
            </CardTitle>
            <CardDescription>
              Add this URL in your {provider.name} dashboard under webhook/callback settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-300 overflow-x-auto">
                {webhookUrl}
              </code>
              <Button variant="outline" size="sm" onClick={copyWebhook} className="shrink-0">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This is where {provider.name} sends call events. Kyra logs every call to your CRM automatically.
            </p>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <Button
          onClick={handleSetup}
          disabled={saving || !apiKey.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Creating voice assistant & provisioning phone number...
            </>
          ) : (
            <>
              <Phone className="w-5 h-5 mr-2" />
              Activate Voice AI
            </>
          )}
        </Button>
      </div>
    );
  }

  // ── Render: Active Dashboard ────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Voice AI</h1>
          <p className="text-gray-400 mt-1">Your AI worker is answering phone calls for {clientName}.</p>
        </div>
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <Phone className="w-3 h-3 mr-1" /> Active
        </Badge>
      </div>

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Phone Number */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Phone className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400">Phone Number</div>
                <div className="text-white font-mono font-bold">
                  {config?.phoneNumber || 'Provisioning...'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Provider */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Mic className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400">Provider</div>
                <div className="text-white font-bold">
                  {PROVIDERS.find(p => p.id === config?.provider)?.name || config?.provider}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Name */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400">AI Name</div>
                <div className="text-white font-bold">{config?.aiName || 'Alex'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook URL */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-400">Webhook URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-300 overflow-x-auto">
              {webhookUrl}
            </code>
            <Button variant="outline" size="sm" onClick={copyWebhook} className="shrink-0">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Call */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-blue-400" />
            Test Outbound Call
          </CardTitle>
          <CardDescription>
            Send a test call to verify everything is working
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const number = (form.elements.namedItem('testNumber') as HTMLInputElement).value;
              if (number) handleTestCall(number);
            }}
            className="flex gap-2"
          >
            <Input
              name="testNumber"
              placeholder="+1 (555) 123-4567"
              className="bg-gray-800 border-gray-700 text-white"
            />
            <Button type="submit" disabled={testingCall} className="shrink-0 bg-green-600 hover:bg-green-700">
              {testingCall ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4 mr-1" />}
              Call
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Call Logs */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-400" />
              Call History
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadCallLogs}
              disabled={loadingLogs}
              className="text-gray-400"
            >
              {loadingLogs ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {callLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <PhoneOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No calls yet</p>
              <p className="text-xs mt-1">Calls will appear here once your AI starts taking them</p>
            </div>
          ) : (
            <div className="space-y-2">
              {callLogs.map((call) => (
                <button
                  key={call.id}
                  onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                  className="w-full text-left bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        call.metadata?.direction === 'inbound' ? 'bg-blue-500/20' : 'bg-orange-500/20'
                      )}>
                        {call.metadata?.direction === 'inbound'
                          ? <PhoneCall className="w-4 h-4 text-blue-400" />
                          : <Phone className="w-4 h-4 text-orange-400" />}
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">
                          {call.metadata?.callerNumber || 'Unknown number'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {call.metadata?.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                          {call.metadata?.durationSeconds ? ` · ${Math.floor(call.metadata.durationSeconds / 60)}m ${call.metadata.durationSeconds % 60}s` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          call.metadata?.status === 'completed' ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'
                        )}
                      >
                        {call.metadata?.status || 'unknown'}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(call.created_at).toLocaleString()}
                      </span>
                      {expandedCall === call.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </div>

                  {expandedCall === call.id && (
                    <div className="mt-3 pt-3 border-t border-gray-700 space-y-2" onClick={(e) => e.stopPropagation()}>
                      {call.ai_response && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Summary</div>
                          <div className="text-sm text-gray-300">{call.ai_response}</div>
                        </div>
                      )}
                      {call.user_message && call.user_message.includes('\n\n') && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Transcript</div>
                          <div className="text-sm text-gray-400 whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {call.user_message.split('\n\n').slice(1).join('\n\n')}
                          </div>
                        </div>
                      )}
                      {call.metadata?.recordingUrl && (
                        <a
                          href={call.metadata.recordingUrl}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline"
                        >
                          <Play className="w-3 h-3" /> Listen to recording
                        </a>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reconfigure */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setStep('provider')}
          className="text-gray-400 border-gray-700"
        >
          <Settings className="w-4 h-4 mr-1" /> Change Provider
        </Button>
      </div>
    </div>
  );
}
