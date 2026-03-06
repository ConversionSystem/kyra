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
    id: 'openclaw',
    name: 'Kyra Native',
    logo: '🦞',
    description: 'Built on Deepgram + OpenClaw TTS. No third-party account needed. Billed through Kyra credits.',
    pricing: '~5 credits/min (vs $0.25+ elsewhere)',
    bestFor: 'Agencies who want one bill. Simplest setup.',
    signupUrl: '',
    docsUrl: '',
    color: 'border-indigo-200 bg-indigo-50/50 hover:border-indigo-300',
    badge: '🔥 Best Value',
    badgeColor: 'bg-indigo-100 text-indigo-700',
  },
  {
    id: 'vapi',
    name: 'VAPI',
    logo: '🔊',
    description: 'Most flexible, developer-friendly. Best API.',
    pricing: '~$0.25+ elsewhere',
    bestFor: 'Custom setups, full control',
    signupUrl: 'https://dashboard.vapi.ai',
    docsUrl: 'https://docs.vapi.ai',
    color: 'border-blue-200 bg-blue-50/50 hover:border-blue-300',
    badge: 'Most Popular',
    badgeColor: 'bg-blue-100 text-blue-700',
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
    color: 'border-purple-200 bg-purple-50/50 hover:border-purple-300',
    badge: 'Best for Agencies',
    badgeColor: 'bg-purple-100 text-purple-700',
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
    color: 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300',
    badge: 'Enterprise',
    badgeColor: 'bg-emerald-100 text-emerald-700',
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
  const [areaCode, setAreaCode] = useState('');
  const [aiName, setAiName] = useState(initialConfig?.aiName ?? 'Alex');
  const [selectedVoice, setSelectedVoice] = useState(initialConfig?.voiceId ?? 'default');
  const [language, setLanguage] = useState(initialConfig?.language ?? 'en');
  const [saving, setSaving] = useState(false);
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
  const [provisioning, setProvisioning] = useState(false);

  const loadCallLogs = useCallback(async () => {
    const id = clientId ?? agencyId;
    if (!id) return;
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/voice/call-logs?entityId=${id}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setCallLogs(data.calls ?? []);
      }
    } catch { /* ignore */ }
    setLoadingLogs(false);
  }, [clientId]);

  useEffect(() => {
    if (step === 'active') loadCallLogs();
  }, [step, loadCallLogs]);

  const handleSetup = async () => {
    if (!clientId) {
      setError('No client configured yet. Please set up your AI worker first.');
      return;
    }
    // Kyra Native doesn't need an external API key
    if (selectedProvider !== 'openclaw' && !apiKey.trim()) {
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
          areaCode: areaCode.replace(/\D/g, '').slice(0, 3) || undefined,
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

  const provisionPhone = async () => {
    if (!entityId) return;
    setProvisioning(true);
    setError(null);
    try {
      const res = await fetch('/api/voice/assistants/provision-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: entityId, areaCode: undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to provision phone number');
      setConfig(prev => prev ? { ...prev, phoneNumber: data.phoneNumber, phoneNumberId: data.phoneNumberId } : prev);
      setSuccess(`Phone number ${data.phoneNumber} provisioned!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Provisioning failed');
    }
    setProvisioning(false);
  };

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
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Voice AI</h1>
          <p className="text-sm text-gray-500 mt-1">
            Give your AI worker a phone number. It answers calls, books appointments, and qualifies leads — 24/7.
          </p>
        </div>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              How Voice AI Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: '📞', title: 'Customer calls', desc: 'Your dedicated business number' },
                { icon: '🤖', title: 'AI answers', desc: 'Greets them by your business name' },
                { icon: '💬', title: 'Natural conversation', desc: 'Qualifies, answers questions, books' },
                { icon: '📋', title: 'Logged to CRM', desc: 'Transcript, summary, follow-up tagged' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <div className="font-medium text-gray-900 text-sm">{s.title}</div>
                  <div className="text-gray-500 text-xs mt-1">{s.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Provider selection */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Choose a Voice Provider</h2>
          <p className="text-gray-500 text-sm mb-4">
            You&apos;ll need an account with one of these providers. They handle the phone infrastructure — Kyra connects your AI brain.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedProvider(p.id); setStep('setup'); }}
                className={cn(
                  'text-left p-5 rounded-xl border-2 transition-all hover:shadow-md',
                  p.color,
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{p.logo}</span>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', p.badgeColor)}>
                    {p.badge}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg">{p.name}</h3>
                <p className="text-gray-600 text-sm mt-1">{p.description}</p>
                <div className="mt-3 space-y-1">
                  <div className="text-xs text-gray-500">💰 {p.pricing}</div>
                  <div className="text-xs text-gray-500">⭐ Best for: {p.bestFor}</div>
                </div>
                <div className="mt-3 flex items-center text-sm text-blue-600 font-medium">
                  Select <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {config?.enabled && (
          <Button variant="ghost" onClick={() => setStep('active')} className="text-gray-500">
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
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-2xl">
        <div>
          <Button variant="ghost" size="sm" onClick={() => setStep('provider')} className="text-gray-500 -ml-2 mb-2">
            ← Back to providers
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-3xl">{provider.logo}</span>
            Set Up {provider.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {provider.id === 'openclaw'
              ? 'Customize your AI voice worker. No external accounts or API keys needed.'
              : `Connect your ${provider.name} account to give your AI worker a phone line.`}
          </p>
        </div>

        {/* Step 1: API Key (skipped for Kyra Native) */}
        {provider.id === 'openclaw' ? (
          <Card className="border-indigo-200 bg-indigo-50/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">✓</span>
                No External Account Needed
              </CardTitle>
              <CardDescription>
                Kyra Native is built directly into your platform. Voice is handled by Deepgram + OpenClaw TTS — billed through your Kyra credits (~5 credits/min). No third-party signup required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-lg px-3 py-1.5">
                  🎙️ Deepgram STT — best-in-class accuracy
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-lg px-3 py-1.5">
                  🔊 OpenClaw TTS — natural voices
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-lg px-3 py-1.5">
                  💳 ~5 credits/min (vs $0.25+ elsewhere)
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Area Code <span className="text-gray-400">(optional — for your phone number)</span></label>
                <Input
                  placeholder="e.g. 415"
                  maxLength={3}
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-32"
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank for any US number</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">1</span>
                Connect Your Account
              </CardTitle>
              <CardDescription>
                Get your API key from{' '}
                <a href={provider.signupUrl} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                  {provider.name} Dashboard <ExternalLink className="w-3 h-3 inline" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">API Key</label>
                <Input
                  type="password"
                  placeholder={`Paste your ${provider.name} API key...`}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: AI Name & Voice */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">2</span>
              Customize Your AI
            </CardTitle>
            <CardDescription>How should your AI introduce itself on calls?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">AI Name</label>
              <Input
                placeholder="Alex"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                &quot;Hi, thanks for calling {clientName}! This is {aiName || 'Alex'}, how can I help?&quot;
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-2 block">Voice</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {VOICE_PRESETS.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all',
                      selectedVoice === v.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    )}
                  >
                    <div className="font-medium text-gray-900 text-sm">{v.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{v.gender} · {v.accent}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{v.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-900 rounded-md p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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

        {/* Step 3: Webhook URL (Kyra Native handles this automatically) */}
        {provider.id === 'openclaw' ? (
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold">✓</span>
                Webhooks Handled Automatically
              </CardTitle>
              <CardDescription>
                Because Kyra Native is built into your platform, call events are captured automatically — no webhook setup needed. Every call is transcribed and logged to your CRM in real time.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">3</span>
                Set Up Webhook
              </CardTitle>
              <CardDescription>
                Add this URL in your {provider.name} dashboard under webhook/callback settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-blue-700 font-mono overflow-x-auto">
                  {webhookUrl}
                </code>
                <Button variant="outline" size="sm" onClick={copyWebhook} className="shrink-0">
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                This is where {provider.name} sends call events. Kyra logs every call to your CRM automatically.
              </p>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <Button
          onClick={handleSetup}
          disabled={saving || (selectedProvider !== 'openclaw' && !apiKey.trim())}
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

  const isKyraNative = config?.provider === 'openclaw';

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Voice AI</h1>
          <p className="text-sm text-gray-500 mt-1">Your AI worker is answering phone calls for {clientName}.</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
          <Phone className="w-3 h-3 mr-1" /> Active
        </Badge>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-gray-400">Phone Number</div>
                {isKyraNative && (!config?.phoneNumber || config.phoneNumber === 'pending') ? (
                  <button
                    onClick={provisionPhone}
                    disabled={provisioning}
                    className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-1.5 mt-0.5 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {provisioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Phone className="w-3 h-3" />}
                    {provisioning ? 'Provisioning...' : 'Get Phone Number'}
                  </button>
                ) : (
                  <div className="text-gray-900 font-mono font-bold">
                    {config?.phoneNumber || 'Provisioning...'}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Mic className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-xs text-gray-400">Provider</div>
                <div className="text-gray-900 font-bold">
                  {PROVIDERS.find(p => p.id === config?.provider)?.name || config?.provider}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-gray-400">AI Name</div>
                <div className="text-gray-900 font-bold">{config?.aiName || 'Alex'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook URL — only for external providers, not Kyra Native */}
      {!isKyraNative && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-500">Webhook URL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-blue-700 font-mono overflow-x-auto">
                {webhookUrl}
              </code>
              <Button variant="outline" size="sm" onClick={copyWebhook} className="shrink-0">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Call */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-blue-600" />
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
            />
            <Button type="submit" disabled={testingCall} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
              {testingCall ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4 mr-1" />}
              Call
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Call Logs */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-400" />
              Call History
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadCallLogs}
              disabled={loadingLogs}
              className="text-gray-500"
            >
              {loadingLogs ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {callLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
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
                  className="w-full text-left bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        call.metadata?.direction === 'inbound' ? 'bg-blue-50' : 'bg-orange-50'
                      )}>
                        {call.metadata?.direction === 'inbound'
                          ? <PhoneCall className="w-4 h-4 text-blue-600" />
                          : <Phone className="w-4 h-4 text-orange-600" />}
                      </div>
                      <div>
                        <div className="text-gray-900 text-sm font-medium">
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
                          call.metadata?.status === 'completed' ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-600'
                        )}
                      >
                        {call.metadata?.status || 'unknown'}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(call.created_at).toLocaleString()}
                      </span>
                      {expandedCall === call.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {expandedCall === call.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2" onClick={(e) => e.stopPropagation()}>
                      {call.ai_response && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Summary</div>
                          <div className="text-sm text-gray-700">{call.ai_response}</div>
                        </div>
                      )}
                      {call.user_message && call.user_message.includes('\n\n') && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Transcript</div>
                          <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {call.user_message.split('\n\n').slice(1).join('\n\n')}
                          </div>
                        </div>
                      )}
                      {call.metadata?.recordingUrl && (
                        <a
                          href={call.metadata.recordingUrl}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
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
        >
          <Settings className="w-4 h-4 mr-1" /> Change Provider
        </Button>
      </div>
    </div>
  );
}
