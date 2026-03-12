'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ArrowLeft, Loader2, Building2,
  Link2, CheckCircle2, Rocket, Sparkles, Zap,
  Bot, Settings, MessageSquare, ExternalLink,
  AlertCircle, RefreshCw, SkipForward,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Types ──────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  name: string;
  industry: string | null;
}

interface Props {
  agencyId: string;
  agencyName: string;
  plan: string;
}

const STEPS = ['welcome', 'deploy', 'ghl', 'done'] as const;
type Step = (typeof STEPS)[number];

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

function StepWelcome({ agencyName, onNext }: { agencyName: string; onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600 mb-6">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h1 className="text-3xl font-black text-gray-900 mb-3">
        Welcome to Kyra, {agencyName.split(' ')[0]}.
      </h1>
      <p className="text-gray-500 text-base mb-8 max-w-sm mx-auto leading-relaxed">
        You&apos;re about to deploy your first AI worker.
        It takes 3 minutes and handles every lead automatically after that.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-8 text-left">
        {[
          { icon: '🤖', step: '1 min', title: 'Name + template', desc: 'Pick your industry' },
          { icon: '⚡', step: '60 sec', title: 'Instant deploy', desc: 'Container goes live' },
          { icon: '🔌', step: 'Optional', title: 'Connect GHL', desc: 'Plug into your CRM' },
        ].map((item) => (
          <div key={item.title} className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <span className="text-xl">{item.icon}</span>
            <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider mt-2">{item.step}</p>
            <p className="font-semibold text-sm text-gray-900 mt-0.5">{item.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>

      <Button onClick={onNext} size="lg" className="w-full bg-indigo-600 hover:bg-indigo-700">
        Let&apos;s deploy <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

// ── Step 2: Deploy + live provisioning ────────────────────────────────────

type ProvisionPhase =
  | 'idle'
  | 'creating'
  | 'provisioning'
  | 'polling'
  | 'running'
  | 'timeout'
  | 'error';

const PROVISION_MESSAGES: Record<ProvisionPhase, string> = {
  idle: '',
  creating: 'Creating AI worker record…',
  provisioning: 'Provisioning container on OVH…',
  polling: 'Container is starting up…',
  running: 'AI worker is live! 🎉',
  timeout: 'Taking longer than usual — it\'s still deploying in the background.',
  error: 'Provisioning hit an error.',
};

const PROVISION_BAR: Record<ProvisionPhase, number> = {
  idle: 0,
  creating: 15,
  provisioning: 35,
  polling: 60,
  running: 100,
  timeout: 85,
  error: 85,
};

function StepDeploy({
  onDone,
}: {
  onDone: (clientId: string, clientName: string) => void;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phase, setPhase] = useState<ProvisionPhase>('idle');
  const [error, setError] = useState('');
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/agency/templates')
      .then(r => r.json())
      .then(data => {
        setTemplates((data.templates ?? data ?? []).slice(0, 9));
        setLoadingTemplates(false);
      })
      .catch(() => setLoadingTemplates(false));
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const startPolling = useCallback((clientId: string, clientName: string) => {
    setPhase('polling');

    // 90-second timeout
    timeoutRef.current = setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      setPhase('timeout');
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
          setTimeout(() => onDone(clientId, clientName), 1200);
        }
      } catch { /* keep polling */ }
    }, 3_000);
  }, [onDone]);

  const handleDeploy = async () => {
    if (!name.trim()) { setError('Give your AI worker a name.'); return; }
    setError('');
    setPhase('creating');

    try {
      // Auto-generate slug from name
      const slug = name.trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'my-client';

      const res = await fetch('/api/agency/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          industry: templates.find(t => t.id === selected)?.industry ?? null,
          template_id: selected,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create client');
      }
      const data = await res.json();
      const clientId: string = data.client?.id ?? data.id ?? '';
      if (!clientId) throw new Error('No client ID returned');

      setCreatedClientId(clientId);
      setPhase('provisioning');

      // Small wait before polling so the provisioner has time to kick off
      setTimeout(() => startPolling(clientId, name.trim()), 4_000);
    } catch (e) {
      setPhase('error');
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    }
  };

  const isDeploying = phase !== 'idle' && phase !== 'error';
  const pct = PROVISION_BAR[phase];

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <Bot className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Deploy your first AI worker</h2>
          <p className="text-sm text-gray-500">Pick a name and industry. Live in 60 seconds.</p>
        </div>
      </div>

      {/* Name */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 block mb-1.5">
          Client name <span className="text-gray-400 font-normal">(your client&apos;s business)</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Purple Lotus Dispensary"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={isDeploying}
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
        />
      </div>

      {/* Templates */}
      <div className="mb-5">
        <p className="text-sm font-medium text-gray-700 mb-2">
          Industry <span className="text-gray-400 font-normal">(optional — sets AI personality)</span>
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
                onClick={() => !isDeploying && setSelected(selected === t.id ? null : t.id)}
                disabled={isDeploying}
                className={`rounded-lg border p-3 text-left transition-all disabled:opacity-50 ${
                  selected === t.id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="block font-medium text-xs truncate">{t.name}</span>
                {t.industry && (
                  <span className="block text-[10px] text-gray-400 mt-0.5 truncate">{t.industry}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Progress bar */}
      {phase !== 'idle' && phase !== 'error' && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-medium ${
              phase === 'running' ? 'text-green-600' :
              phase === 'timeout' ? 'text-amber-600' : 'text-indigo-600'
            }`}>
              {PROVISION_MESSAGES[phase]}
            </span>
            <span className="text-xs text-gray-400">{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                phase === 'running' ? 'bg-green-500' :
                phase === 'timeout' ? 'bg-amber-500' : 'bg-indigo-500'
              } ${phase === 'polling' ? 'animate-pulse' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {phase === 'timeout' && (
            <p className="text-xs text-amber-600 mt-2">
              Container deployment takes 60–90s on first provision.
              You can continue — it will be ready when you open the dashboard.
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {phase === 'idle' || phase === 'error' ? (
          <Button onClick={handleDeploy} className="w-full bg-indigo-600 hover:bg-indigo-700">
            <Rocket className="h-4 w-4 mr-2" /> Deploy AI Worker
          </Button>
        ) : phase === 'running' ? (
          <div className="flex items-center justify-center gap-2 py-3 text-green-600 font-semibold">
            <CheckCircle2 className="h-5 w-5" />
            AI worker is live — continuing…
          </div>
        ) : phase === 'timeout' ? (
          <Button
            onClick={() => createdClientId && onDone(createdClientId, name.trim())}
            className="w-full"
          >
            Continue anyway <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-2 py-3 text-indigo-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {PROVISION_MESSAGES[phase]}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 3: Connect GHL (proper connect-token API) ─────────────────────────

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

      // GHL couldn't auto-detect locationId — ask for it
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
          <h2 className="text-xl font-bold text-gray-900">Connect your CRM</h2>
          <p className="text-sm text-gray-500">
            Plug <span className="font-semibold text-gray-700">{clientName}</span> into your CRM so the AI handles inbound SMS automatically.
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
          <li>Copy the token — it starts with <span className="font-mono bg-amber-100 px-1 rounded">pit-</span></li>
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

      {/* Token input */}
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

        {/* Location ID — always visible so users can enter both at once */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            GHL Location ID
            <span className="text-gray-400 font-normal ml-1">
              (GHL → Settings → Business Info → scroll to &quot;Company ID&quot;)
            </span>
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
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          {phase === 'connecting' ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Validating token…</>
          ) : phase === 'success' ? (
            <><CheckCircle2 className="h-4 w-4 mr-2" /> Connected!</>
          ) : (
            <>Connect CRM <ArrowRight className="h-4 w-4 ml-2" /></>
          )}
        </Button>
        <button
          onClick={onSkip}
          disabled={phase === 'connecting'}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
        >
          <SkipForward className="h-3.5 w-3.5" /> Skip — I&apos;ll connect my CRM from the client settings
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Done ───────────────────────────────────────────────────────────

function StepDone({
  clientId,
  clientName,
  agencyName,
}: {
  clientId: string | null;
  clientName: string;
  agencyName: string;
}) {
  const router = useRouter();
  const [going, setGoing] = useState(false);
  const [sharedCredits, setSharedCredits] = useState(false);

  const shareText = `Just deployed my first AI worker with Kyra 🤖\n\nIt handles every inbound lead automatically — SMS, booking, CRM follow-up. All in under 60 seconds.\n\nFree to start → kyra.conversionsystem.com\n\n#AIWorker #AgencyLife #AIWorkforce`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://kyra.conversionsystem.com')}&summary=${encodeURIComponent(shareText)}`;

  const handleShare = async (platform: 'twitter' | 'linkedin') => {
    window.open(platform === 'twitter' ? twitterUrl : linkedinUrl, '_blank', 'width=600,height=500');
    if (!sharedCredits) {
      setSharedCredits(true);
      await fetch('/api/agency/credits/bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'social_share', amount: 500 }),
      }).catch(() => {});
    }
  };

  const handleGo = async (path?: string) => {
    setGoing(true);
    await fetch('/api/agency/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { onboarding_complete: true } }),
    }).catch(() => {});
    router.push(path ?? (clientId ? `/agency/clients/${clientId}` : '/agency'));
  };

  const actions = clientId
    ? [
        {
          icon: Bot,
          label: 'Open AI worker terminal',
          desc: 'Watch it handle conversations live',
          href: `/agency/clients/${clientId}`,
          primary: true,
        },
        {
          icon: MessageSquare,
          label: 'Connect channels',
          desc: 'SMS, Telegram, WhatsApp',
          href: `/agency/clients/${clientId}?tab=channels`,
          primary: false,
        },
        {
          icon: Settings,
          label: 'Customize personality',
          desc: 'Name, tone, instructions',
          href: `/agency/clients/${clientId}?tab=personality`,
          primary: false,
        },
        {
          icon: Zap,
          label: 'Add more clients',
          desc: 'Grow your AI workforce',
          href: '/agency/clients/new',
          primary: false,
        },
      ]
    : [];

  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
        <CheckCircle2 className="h-10 w-10 text-green-600" />
      </div>
      <h2 className="text-3xl font-black text-gray-900 mb-2">
        {clientId ? `${clientName} is live! 🚀` : 'Setup complete! 🎉'}
      </h2>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto text-sm leading-relaxed">
        {clientId
          ? 'Your AI worker is deployed and handling conversations. Here\'s what to do next:'
          : `Welcome to Kyra. You can deploy your first AI worker from the dashboard whenever you're ready.`}
      </p>

      {/* Action grid */}
      {actions.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-6 text-left">
          {actions.map(({ icon: Icon, label, desc, href, primary }) => (
            <button
              key={href}
              onClick={() => handleGo(href)}
              disabled={going}
              className={`rounded-xl border p-3 text-left transition-all hover:shadow-sm disabled:opacity-60 ${
                primary
                  ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 shrink-0 ${primary ? 'text-indigo-600' : 'text-gray-500'}`} />
                <span className={`text-xs font-semibold ${primary ? 'text-indigo-700' : 'text-gray-800'}`}>
                  {label}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 pl-6">{desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* Social share */}
      {!sharedCredits ? (
        <div className="mb-5 border border-amber-200 bg-amber-50 rounded-xl p-4 text-left">
          <div className="flex items-start gap-3">
            <span className="text-xl leading-none mt-0.5">🎁</span>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm mb-0.5">Share → get 500 free credits</p>
              <p className="text-xs text-gray-500 mb-3">Tell your network. Get $5 in AI conversations free.</p>
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  onClick={() => handleShare('twitter')}
                  className="flex items-center gap-1.5 bg-[#1da1f2] hover:bg-[#1a8fd1] text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                >
                  𝕏 Post on X
                </button>
                <button
                  onClick={() => handleShare('linkedin')}
                  className="flex items-center gap-1.5 bg-[#0077b5] hover:bg-[#006396] text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                >
                  in LinkedIn
                </button>
                <button
                  onClick={() => handleGo()}
                  className="text-xs text-gray-400 hover:text-gray-600 transition underline"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-5 border border-green-200 bg-green-50 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div className="text-left">
            <p className="font-bold text-green-800 text-sm">500 bonus credits added 🎉</p>
            <p className="text-xs text-green-600">Thanks for spreading the word.</p>
          </div>
        </div>
      )}

      <Button
        onClick={() => handleGo()}
        disabled={going}
        size="lg"
        className="w-full bg-indigo-600 hover:bg-indigo-700"
      >
        {going ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Opening…</>
        ) : clientId ? (
          <>Open dashboard <ArrowRight className="h-4 w-4 ml-2" /></>
        ) : (
          <>Go to dashboard <ArrowRight className="h-4 w-4 ml-2" /></>
        )}
      </Button>

      {/* Refresh hint if container still starting */}
      <p className="text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
        <RefreshCw className="h-3 w-3" />
        Container may still be warming up — refresh in 30s if it shows offline.
      </p>
    </div>
  );
}

// ── Main wizard ────────────────────────────────────────────────────────────

export function OnboardingWizard({ agencyId: _agencyId, agencyName, plan: _plan }: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [createdClientName, setCreatedClientName] = useState('');
  const currentIndex = STEPS.indexOf(step);

  const handleDeployDone = (clientId: string, name: string) => {
    setCreatedClientId(clientId);
    setCreatedClientName(name);
    setStep('ghl');
  };

  const router = useRouter();

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
          {step !== 'welcome' && step !== 'done' && step !== 'deploy' && (
            <button
              onClick={() => setStep(STEPS[currentIndex - 1])}
              className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          )}
          {step !== 'done' && (
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

      {step === 'welcome' && (
        <StepWelcome agencyName={agencyName} onNext={() => setStep('deploy')} />
      )}
      {step === 'deploy' && (
        <StepDeploy onDone={handleDeployDone} />
      )}
      {step === 'ghl' && (
        <StepGHL
          clientId={createdClientId ?? ''}
          clientName={createdClientName}
          onNext={() => setStep('done')}
          onSkip={() => setStep('done')}
        />
      )}
      {step === 'done' && (
        <StepDone
          clientId={createdClientId}
          clientName={createdClientName}
          agencyName={agencyName}
        />
      )}
    </div>
  );
}
