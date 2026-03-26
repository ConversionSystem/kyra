'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ArrowLeft, Loader2, Building2,
  Link2, CheckCircle2, Rocket, Sparkles,
  Bot, Settings, MessageSquare, ExternalLink,
  AlertCircle, SkipForward, Send, Users, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Types ──────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  name: string;
  industry: string | null;
  emoji?: string;
}

interface Props {
  agencyId: string;
  agencyName: string;
  plan: string;
}

const STEPS = ['welcome', 'industry', 'deploy', 'chat', 'ghl', 'done'] as const;
type Step = (typeof STEPS)[number];

// ── Helpers ────────────────────────────────────────────────────────────────

function saveOnboardingStep(step: string) {
  fetch('/api/agency/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings: { onboarding_step: step } }),
  }).catch(() => {});
}

const TEST_MESSAGES: Record<string, string> = {
  dental: 'Hi, I need to book a cleaning',
  'real estate': 'Tell me about available listings',
  healthcare: 'I need to schedule an appointment',
  restaurant: 'Can I make a reservation for tonight?',
  legal: 'I need help with a contract review',
  fitness: 'What memberships do you offer?',
  automotive: 'I want to schedule a service appointment',
  insurance: 'Can you help me get a quote?',
  salon: 'I want to book a haircut this week',
  default: 'What can you help me with?',
};

function getTestMessage(industry: string | null): string {
  if (!industry) return TEST_MESSAGES.default;
  const key = industry.toLowerCase();
  for (const [k, v] of Object.entries(TEST_MESSAGES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return TEST_MESSAGES.default;
}

function generateSlug(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'my-client'
  );
}

// ── Step dots ──────────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current
              ? 'w-10 bg-indigo-600'
              : i < current
              ? 'w-3 bg-indigo-300'
              : 'w-3 bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

// ── Step 1: Welcome ────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600 mb-6">
        <Rocket className="h-8 w-8 text-white" />
      </div>
      <h1 className="text-3xl font-black text-gray-900 mb-3">
        Your first AI worker goes live in 5 minutes.
      </h1>
      <p className="text-gray-500 text-sm mb-2 max-w-sm mx-auto leading-relaxed">
        Deploy an AI that handles every inbound lead — SMS, booking, follow-up — automatically.
      </p>
      <p className="text-indigo-600 text-xs font-semibold mb-8">
        47 agencies deployed this week
      </p>

      <Button onClick={onNext} size="lg" className="w-full bg-indigo-600 hover:bg-indigo-700 text-base h-12">
        Deploy My First AI Worker <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

// ── Step 2: Industry + Business Setup ──────────────────────────────────────

function StepIndustry({
  onNext,
}: {
  onNext: (data: { forClient: boolean; industry: string | null; businessName: string; templateId: string | null }) => void;
}) {
  const [forClient, setForClient] = useState<boolean | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then(data => {
        const list = (data.templates ?? data ?? []).slice(0, 12);
        setTemplates(list);
        setLoadingTemplates(false);
      })
      .catch(() => setLoadingTemplates(false));
  }, []);

  const selectedIndustry = templates.find(t => t.id === selectedTemplate)?.industry ?? null;
  const canContinue = forClient !== null && businessName.trim().length > 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Who is this AI worker for?</h2>
          <p className="text-sm text-gray-500">Tell us about the business so we can customize the AI.</p>
        </div>
      </div>

      {/* For whom */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">This AI worker is for:</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: false, label: 'My Agency', icon: Building2 },
            { value: true, label: 'For a Client', icon: Users },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setForClient(value)}
              className={`rounded-xl border p-3 text-left transition-all flex items-center gap-2.5 ${
                forClient === value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Industry */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">
          Industry <span className="text-gray-400 font-normal">(sets AI personality)</span>
        </p>
        {loadingTemplates ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(selectedTemplate === t.id ? null : t.id)}
                className={`rounded-lg border p-2.5 text-left transition-all ${
                  selectedTemplate === t.id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="block font-medium text-xs truncate">
                  {t.emoji ? `${t.emoji} ` : ''}{t.name}
                </span>
                {t.industry && (
                  <span className="block text-[10px] text-gray-400 mt-0.5 truncate">{t.industry}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Business name */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 block mb-1.5">
          Business name
        </label>
        <input
          type="text"
          placeholder="e.g. Purple Lotus Dispensary"
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
        />
      </div>

      {/* Template preview */}
      {selectedIndustry && businessName.trim() && (
        <div className="mb-5 rounded-xl bg-indigo-50 border border-indigo-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-semibold text-indigo-700">AI Preview</span>
          </div>
          <p className="text-xs text-indigo-600">
            Your AI will specialize in <strong>{selectedIndustry}</strong> for{' '}
            <strong>{businessName.trim()}</strong>
          </p>
        </div>
      )}

      <Button
        onClick={() =>
          onNext({
            forClient: forClient ?? false,
            industry: selectedIndustry,
            businessName: businessName.trim(),
            templateId: selectedTemplate,
          })
        }
        disabled={!canContinue}
        size="lg"
        className="w-full bg-indigo-600 hover:bg-indigo-700"
      >
        Continue <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

// ── Step 3: Instant Deploy ─────────────────────────────────────────────────

type ProvisionPhase =
  | 'creating'
  | 'provisioning'
  | 'polling'
  | 'running'
  | 'timeout'
  | 'error';

const DEPLOY_STEPS = [
  { phase: 'creating', label: 'Creating container', icon: '📦' },
  { phase: 'provisioning', label: 'Loading AI brain', icon: '🧠' },
  { phase: 'polling', label: 'Configuring skills', icon: '⚙️' },
  { phase: 'running', label: 'Going live', icon: '🚀' },
] as const;

function StepDeploy({
  businessName,
  industry,
  templateId,
  onDone,
}: {
  businessName: string;
  industry: string | null;
  templateId: string | null;
  onDone: (clientId: string) => void;
}) {
  const [phase, setPhase] = useState<ProvisionPhase>('creating');
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);

  const startPolling = useCallback(
    (clientId: string) => {
      setPhase('polling');

      timeoutRef.current = setTimeout(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        setPhase('timeout');
        // Even on timeout, let user continue
        setTimeout(() => onDone(clientId), 1500);
      }, 90_000);

      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/agency/gateway/status');
          if (!res.ok) return;
          const data = await res.json();
          const client = (data.clients ?? []).find(
            (c: { id: string; gateway: { status: string } }) => c.id === clientId
          );
          if (client?.gateway?.status === 'running') {
            clearInterval(pollRef.current!);
            clearTimeout(timeoutRef.current!);
            setPhase('running');
            setTimeout(() => onDone(clientId), 1500);
          }
        } catch {
          /* keep polling */
        }
      }, 3_000);
    },
    [onDone]
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const slug = generateSlug(businessName);
        const res = await fetch('/api/agency/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: businessName,
            slug,
            industry,
            template_id: templateId,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to create client');
        }
        const data = await res.json();
        const clientId: string = data.client?.id ?? data.id ?? '';
        if (!clientId) throw new Error('No client ID returned');

        setPhase('provisioning');
        setTimeout(() => startPolling(clientId), 4_000);
      } catch (e) {
        setPhase('error');
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    })();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [businessName, industry, templateId, startPolling]);

  const phaseIndex = DEPLOY_STEPS.findIndex(s => s.phase === phase);

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Spinning up your AI worker... 🚀
      </h2>
      <p className="text-sm text-gray-500 mb-8">
        Deploying <strong>{businessName}</strong>{industry ? ` with ${industry} skills` : ''}
      </p>

      {/* Animated steps */}
      <div className="space-y-3 mb-8 text-left max-w-xs mx-auto">
        {DEPLOY_STEPS.map((s, i) => {
          const isActive = s.phase === phase;
          const isDone = phaseIndex > i || phase === 'running';
          const isPending = phaseIndex < i && phase !== 'running';

          return (
            <div key={s.phase} className="flex items-center gap-3">
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                  isDone
                    ? 'bg-green-100'
                    : isActive
                    ? 'bg-indigo-100 animate-pulse'
                    : 'bg-gray-50'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <span>{s.icon}</span>
                )}
              </div>
              <span
                className={`text-sm font-medium transition-colors ${
                  isDone
                    ? 'text-green-700'
                    : isActive
                    ? 'text-indigo-700'
                    : isPending
                    ? 'text-gray-400'
                    : 'text-gray-700'
                }`}
              >
                {s.label}
                {isActive && s.phase === 'polling' && industry
                  ? ` — ${industry}`
                  : ''}
              </span>
              {isActive && !isDone && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400 ml-auto" />
              )}
            </div>
          );
        })}
      </div>

      {phase === 'running' && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 mb-4">
          <p className="text-lg font-bold text-green-700">🎉 Your AI is LIVE!</p>
          <p className="text-xs text-green-600 mt-1">Redirecting to your first conversation...</p>
        </div>
      )}

      {phase === 'timeout' && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-4">
          <p className="text-sm font-medium text-amber-700">
            Still deploying — this can take up to 90s on first provision.
          </p>
          <p className="text-xs text-amber-600 mt-1">Continuing to next step...</p>
        </div>
      )}

      {phase === 'error' && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">Deployment failed</span>
          </div>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

// ── Step 4: Send Your First Message (AHA moment) ──────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function StepChat({
  clientId,
  industry,
  businessName,
  onNext,
}: {
  clientId: string;
  industry: string | null;
  businessName: string;
  onNext: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(getTestMessage(industry));
  const [sending, setSending] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || sending) return;

    const userMsg: ChatMessage = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    // Add placeholder assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch(`/api/agency/clients/${clientId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: errData.message || 'Sorry, I couldn\'t respond right now. The AI is still warming up — try again in a moment.',
          };
          return updated;
        });
        setSending(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setSending(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content' && parsed.content) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + parsed.content,
                };
                return updated;
              });
            }
          } catch {
            /* skip unparseable */
          }
        }
      }

      setHasResponded(true);
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Connection error — the AI is still starting up. Try again in a moment.',
        };
        return updated;
      });
    }

    setSending(false);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
          <MessageSquare className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Send your first message</h2>
          <p className="text-sm text-gray-500">
            Talk to <strong>{businessName}</strong>&apos;s AI — this is what your customers will see.
          </p>
        </div>
      </div>

      {/* Chat window */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 mb-4 overflow-hidden">
        {/* Chat header */}
        <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center">
            <Bot className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-xs font-semibold text-gray-700">{businessName} AI</span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-green-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Live
          </span>
        </div>

        {/* Messages */}
        <div className="h-56 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-xs text-gray-400 text-center mt-16">
              Send a message to see your AI in action
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                {m.content || (
                  <span className="flex items-center gap-1 text-gray-400 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-100 p-3 flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={sending}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 disabled:bg-gray-50"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Success banner */}
      {hasResponded && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-3 mb-4 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-700">
              Your AI just responded!
            </p>
            <p className="text-xs text-green-600">
              This is exactly what your customers will see. You can keep chatting or continue setup.
            </p>
          </div>
        </div>
      )}

      <Button
        onClick={onNext}
        size="lg"
        className={`w-full ${
          hasResponded
            ? 'bg-indigo-600 hover:bg-indigo-700'
            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
        }`}
      >
        {hasResponded ? (
          <>Continue <ArrowRight className="h-4 w-4 ml-2" /></>
        ) : (
          <>Send a message first to continue</>
        )}
      </Button>
    </div>
  );
}

// ── Step 5: Connect GHL ────────────────────────────────────────────────────

type GhlPhase = 'idle' | 'connecting' | 'needs_location' | 'success' | 'error';

function StepGHL({
  clientId,
  clientName,
  onNext,
  onSkip,
}: {
  clientId: string;
  clientName: string;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [token, setToken] = useState('');
  const [locationId, setLocationId] = useState('');
  const [phase, setPhase] = useState<GhlPhase>('idle');
  const [message, setMessage] = useState('');
  const [detectedLocation, setDetectedLocation] = useState('');

  const handleConnect = async () => {
    if (!token.trim()) return;
    setPhase('connecting');
    setMessage('');

    try {
      const body: Record<string, string> = { token: token.trim() };
      if (locationId.trim()) body.locationId = locationId.trim();

      const res = await fetch(`/api/agency/clients/${clientId}/ghl/connect-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setDetectedLocation(data.locationId ?? '');
        setMessage(data.message ?? 'Connected!');
        setPhase('success');
        setTimeout(() => onNext(), 1500);
        return;
      }

      if (data.needsLocationId || (res.status === 200 && !data.success)) {
        setPhase('needs_location');
        setMessage(data.message || 'Please enter your GHL Location ID.');
        return;
      }

      setMessage(data.error ?? 'Connection failed. Check your token and try again.');
      setPhase('error');
    } catch {
      setMessage('Network error — check your connection and try again.');
      setPhase('error');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
          <Link2 className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Connect GoHighLevel</h2>
          <p className="text-sm text-gray-500">
            Let your AI respond to real SMS for <strong>{clientName}</strong> automatically.
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 mb-5 space-y-2 text-sm text-amber-800">
        <p className="font-semibold">Where to find your token:</p>
        <ol className="list-decimal list-inside space-y-1 text-amber-700 text-xs leading-relaxed">
          <li>GHL → <span className="font-mono">Settings → Integrations → Private Integrations</span></li>
          <li>Click <strong>+ New Integration</strong> → give it a name</li>
          <li>Enable scopes: <strong>Contacts</strong> + <strong>Conversations</strong> (read + write)</li>
          <li>Copy the token — starts with <span className="font-mono bg-amber-100 px-1 rounded">pit-</span></li>
        </ol>
        <a
          href="https://app.gohighlevel.com/settings/integrations/private"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 mt-1"
        >
          Open GHL Integrations <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Inputs */}
      <div className="space-y-3 mb-5">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            GHL Private Integration Token
          </label>
          <input
            type="password"
            placeholder="pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={token}
            onChange={e => setToken(e.target.value)}
            disabled={phase === 'connecting' || phase === 'success'}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-mono disabled:bg-gray-50"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            GHL Location ID
            <span className="text-gray-400 font-normal ml-1">(optional — auto-detects if blank)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. ve9EPM428h8vShlRW1KT"
            value={locationId}
            onChange={e => setLocationId(e.target.value)}
            disabled={phase === 'connecting' || phase === 'success'}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-mono disabled:bg-gray-50 ${
              phase === 'needs_location' ? 'border-amber-400 bg-amber-50' : 'border-gray-200'
            }`}
          />
          {phase === 'needs_location' && (
            <p className="text-xs text-amber-600 mt-1">↑ Enter your Location ID and click Connect again</p>
          )}
        </div>
      </div>

      {/* Status messages */}
      {phase === 'error' && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 mb-4">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-600">{message}</p>
        </div>
      )}
      {phase === 'needs_location' && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 mb-4">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Couldn&apos;t auto-detect your Location ID. Enter it above and click Connect again.
          </p>
        </div>
      )}
      {phase === 'success' && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2.5 mb-4">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-xs text-green-700 font-medium">
            {message}{detectedLocation ? ` (${detectedLocation})` : ''}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <Button
          onClick={handleConnect}
          disabled={!token.trim() || phase === 'connecting' || phase === 'success'}
          size="lg"
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          {phase === 'connecting' ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Validating token...</>
          ) : phase === 'success' ? (
            <><CheckCircle2 className="h-4 w-4 mr-2" /> Connected!</>
          ) : (
            <>Connect GHL <ArrowRight className="h-4 w-4 ml-2" /></>
          )}
        </Button>
        <button
          onClick={onSkip}
          disabled={phase === 'connecting'}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
        >
          <SkipForward className="h-3.5 w-3.5" /> Skip for now
        </button>
      </div>
    </div>
  );
}

// ── Step 6: Done ───────────────────────────────────────────────────────────

function StepDone({
  clientId,
  clientName,
}: {
  clientId: string | null;
  clientName: string;
}) {
  const router = useRouter();
  const [going, setGoing] = useState(false);

  const handleGo = async (path?: string) => {
    setGoing(true);
    await fetch('/api/agency/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { onboarding_complete: true } }),
    }).catch(() => {});
    router.push(path ?? (clientId ? `/agency/clients/${clientId}` : '/agency'));
  };

  const nextActions = [
    {
      icon: BookOpen,
      label: 'Train your AI',
      desc: 'Upload knowledge, fine-tune responses',
      href: clientId ? `/agency/clients/${clientId}?tab=personality` : '/agency',
    },
    {
      icon: Users,
      label: 'Add more clients',
      desc: 'Grow your AI workforce',
      href: '/agency/clients/new',
    },
    {
      icon: MessageSquare,
      label: 'See conversations',
      desc: 'Watch AI handle leads live',
      href: clientId ? `/agency/clients/${clientId}?tab=conversations` : '/agency',
    },
  ];

  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
        <CheckCircle2 className="h-10 w-10 text-green-600" />
      </div>
      <h2 className="text-3xl font-black text-gray-900 mb-2">
        {clientName} is live! 🎉
      </h2>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto text-sm leading-relaxed">
        Your AI worker is deployed and ready to handle conversations. Here&apos;s what to do next:
      </p>

      {/* What next cards */}
      <div className="grid grid-cols-3 gap-2 mb-6 text-left">
        {nextActions.map(({ icon: Icon, label, desc, href }) => (
          <button
            key={href}
            onClick={() => handleGo(href)}
            disabled={going}
            className="rounded-xl border border-gray-200 bg-white hover:bg-gray-50 p-3 text-left transition-all hover:shadow-sm disabled:opacity-60"
          >
            <Icon className="h-5 w-5 text-indigo-600 mb-2" />
            <span className="block text-xs font-semibold text-gray-800">{label}</span>
            <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      <Button
        onClick={() => handleGo()}
        disabled={going}
        size="lg"
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-base h-12"
      >
        {going ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Opening...</>
        ) : (
          <>Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" /></>
        )}
      </Button>
    </div>
  );
}

// ── Main wizard ────────────────────────────────────────────────────────────

export function OnboardingWizard({ agencyId: _agencyId, agencyName, plan: _plan }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);

  const currentIndex = STEPS.indexOf(step);

  const goTo = (s: Step) => {
    setStep(s);
    saveOnboardingStep(s);
  };

  const handleIndustryDone = (data: {
    forClient: boolean;
    industry: string | null;
    businessName: string;
    templateId: string | null;
  }) => {
    setBusinessName(data.businessName);
    setIndustry(data.industry);
    setTemplateId(data.templateId);
    goTo('deploy');
  };

  const handleDeployDone = (clientId: string) => {
    setCreatedClientId(clientId);
    goTo('chat');
  };

  const handleSkipSetup = async () => {
    await fetch('/api/agency/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { onboarding_complete: true } }),
    }).catch(() => {});
    router.push('/agency');
  };

  return (
    <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl ring-1 ring-black/5 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-indigo-600" />
          <span className="font-bold text-gray-900 text-sm">Kyra Setup</span>
        </div>
        <div className="flex items-center gap-3">
          {step === 'industry' && (
            <button
              onClick={() => goTo('welcome')}
              className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          )}
          {step !== 'done' && step !== 'deploy' && step !== 'chat' && (
            <button
              onClick={handleSkipSetup}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Skip setup →
            </button>
          )}
        </div>
      </div>

      <StepDots current={currentIndex} />

      {step === 'welcome' && <StepWelcome onNext={() => goTo('industry')} />}

      {step === 'industry' && <StepIndustry onNext={handleIndustryDone} />}

      {step === 'deploy' && (
        <StepDeploy
          businessName={businessName}
          industry={industry}
          templateId={templateId}
          onDone={handleDeployDone}
        />
      )}

      {step === 'chat' && createdClientId && (
        <StepChat
          clientId={createdClientId}
          industry={industry}
          businessName={businessName}
          onNext={() => goTo('ghl')}
        />
      )}

      {step === 'ghl' && (
        <StepGHL
          clientId={createdClientId ?? ''}
          clientName={businessName}
          onNext={() => goTo('done')}
          onSkip={() => goTo('done')}
        />
      )}

      {step === 'done' && (
        <StepDone clientId={createdClientId} clientName={businessName} />
      )}
    </div>
  );
}
