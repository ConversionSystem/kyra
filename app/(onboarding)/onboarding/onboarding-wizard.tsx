'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ArrowLeft, Loader2, Building2,
  Link2, Users, CheckCircle2, Rocket, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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

const STEPS = ['welcome', 'ghl', 'client', 'done'] as const;
type Step = (typeof STEPS)[number];

// ── Step dots ──────────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current
              ? 'w-8 bg-indigo-600'
              : i < current
              ? 'w-2 bg-indigo-300'
              : 'w-2 bg-gray-200'
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
        Welcome to Kyra — the AI workforce platform.
      </h1>
      <p className="text-gray-500 text-base mb-8 max-w-sm mx-auto">
        You&apos;re about to deploy your first AI worker. This takes about 3 minutes.
      </p>
      <div className="grid grid-cols-3 gap-3 mb-8 text-left">
        {[
          { icon: '⚡', title: 'Connect GHL', desc: 'Optional — skip if not ready' },
          { icon: '🤖', title: 'Deploy AI', desc: 'Pick a template, name your client' },
          { icon: '🚀', title: 'Go live', desc: 'Handling conversations in 60s' },
        ].map((item) => (
          <div key={item.title} className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <span className="text-2xl">{item.icon}</span>
            <p className="font-semibold text-sm text-gray-900 mt-2">{item.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>
      <Button onClick={onNext} size="lg" className="w-full">
        Let&apos;s go <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

// ── Step 2: GHL ────────────────────────────────────────────────────────────

function StepGHL({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [locationId, setLocationId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim() || !locationId.trim()) {
      onSkip();
      return;
    }
    setSaving(true);
    await fetch('/api/agency/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: { ghl_api_key: apiKey.trim(), ghl_location_id: locationId.trim() },
      }),
    });
    setSaving(false);
    onNext();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
          <Link2 className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Connect GoHighLevel</h2>
          <p className="text-sm text-gray-500">Connect your first GHL sub-account to deploy an AI worker.</p>
        </div>
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 mb-5 text-sm text-amber-700">
        <strong>Where to find these:</strong> GHL → Settings → Business Info (Location ID).
        API Key: Settings → Integrations → API Keys → Create Private key.
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">GHL Private API Key</label>
          <input
            type="password"
            placeholder="pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-mono"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">GHL Location ID</label>
          <input
            type="text"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-mono"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
          ) : (
            <>Connect GHL <ArrowRight className="h-4 w-4 ml-2" /></>
          )}
        </Button>
        <button
          onClick={onSkip}
          className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
        >
          Skip for now — connect GHL later in Settings
        </button>
      </div>
    </div>
  );
}

// ── Step 3: First client ───────────────────────────────────────────────────

function StepClient({
  onNext,
  onSkip,
}: {
  onNext: (clientId: string) => void;
  onSkip: () => void;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/agency/templates')
      .then((r) => r.json())
      .then((data) => {
        const all: Template[] = data.templates ?? data ?? [];
        setTemplates(all.slice(0, 9));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Give your client a name first.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/agency/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          industry: templates.find((t) => t.id === selected)?.industry ?? null,
          template_id: selected,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      onNext(data.client?.id ?? data.id ?? '');
    } catch {
      setError('Something went wrong — try again.');
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <Users className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Deploy your first AI client</h2>
          <p className="text-sm text-gray-500">Pick an industry template. Your OpenClaw AI worker goes live in 5 minutes.</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 block mb-1.5">Client name</label>
        <input
          type="text"
          placeholder="e.g. Purple Lotus Dispensary"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
        />
      </div>

      <div className="mb-5">
        <p className="text-sm font-medium text-gray-700 mb-2">
          Industry template <span className="text-gray-400 font-normal">(optional)</span>
        </p>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(selected === t.id ? null : t.id)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  selected === t.id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="block font-medium text-xs truncate">{t.name}</span>
                {t.industry && (
                  <span className="block text-[10px] text-gray-400 mt-0.5">{t.industry}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      <div className="space-y-3">
        <Button onClick={handleCreate} disabled={creating} className="w-full">
          {creating ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Deploying...</>
          ) : (
            <>Deploy AI Employee <Rocket className="h-4 w-4 ml-2" /></>
          )}
        </Button>
        <button
          onClick={onSkip}
          className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
        >
          Skip — I&apos;ll add clients from the dashboard
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Done ───────────────────────────────────────────────────────────

function StepDone({ clientId, agencyName }: { clientId: string | null; agencyName: string }) {
  const router = useRouter();
  const [going, setGoing] = useState(false);
  const [sharedCredits, setSharedCredits] = useState(false);

  const shareText = `Just set up ${agencyName}'s AI employee with Kyra 🤖\n\nIt responds to every lead in under 60 seconds, books appointments, and updates GHL automatically. Free to start → kyra.conversionsystem.com\n\n#GHL #GoHighLevel #AIEmployee #AgencyLife`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://kyra.conversionsystem.com')}&summary=${encodeURIComponent(shareText)}`;

  const handleShare = async (platform: 'twitter' | 'linkedin') => {
    const url = platform === 'twitter' ? twitterUrl : linkedinUrl;
    window.open(url, '_blank', 'width=600,height=500');
    if (!sharedCredits) {
      setSharedCredits(true);
      // Grant 500 bonus credits for sharing
      await fetch('/api/agency/credits/bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'social_share', amount: 500 }),
      }).catch(() => {});
    }
  };

  const handleGo = async () => {
    setGoing(true);
    await fetch('/api/agency/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { onboarding_complete: true } }),
    });
    router.push(clientId ? `/agency/clients/${clientId}` : '/agency');
  };

  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
        <CheckCircle2 className="h-10 w-10 text-green-600" />
      </div>
      <h2 className="text-3xl font-black text-gray-900 mb-3">
        {clientId ? "You're live! 🚀" : 'Setup complete! 🎉'}
      </h2>
      <p className="text-gray-500 mb-8 max-w-sm mx-auto">
        {clientId
          ? 'Your AI worker is live. Watch it operate autonomously.'
          : `Welcome to ${agencyName}'s dashboard. Add your first AI client whenever you're ready.`}
      </p>

      {clientId && (
        <div className="grid grid-cols-2 gap-3 mb-8 text-left">
          {[
            { icon: '🔌', title: 'Connect channels', desc: 'SMS, WhatsApp, Telegram' },
            { icon: '🎨', title: 'Set personality', desc: 'Name, tone, wake words' },
            { icon: '📚', title: 'Add knowledge', desc: 'FAQs and product info' },
            { icon: '💬', title: 'Watch it work', desc: 'Monitor live conversations' },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl bg-gray-50 border border-gray-100 p-3 flex gap-3 items-start"
            >
              <span className="text-lg shrink-0">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Social share bonus */}
      {!sharedCredits ? (
        <div className="mb-5 border border-amber-200 bg-amber-50 rounded-xl p-4 text-left">
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none">🎁</span>
            <div>
              <p className="font-bold text-gray-900 text-sm mb-1">Share to unlock 500 bonus credits</p>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                Tell your network you're using Kyra. Get 500 extra credits ($5) — free, instantly.
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleShare('twitter')}
                  className="flex items-center gap-1.5 bg-[#1da1f2] hover:bg-[#1a8fd1] text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                >
                  𝕏 Share on Twitter
                </button>
                <button
                  onClick={() => handleShare('linkedin')}
                  className="flex items-center gap-1.5 bg-[#0077b5] hover:bg-[#006396] text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                >
                  in Share on LinkedIn
                </button>
                <button onClick={handleGo} className="text-xs text-gray-400 hover:text-gray-600 transition underline">
                  Skip →
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-5 border border-green-200 bg-green-50 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="font-bold text-green-800 text-sm">500 bonus credits added! 🎉</p>
            <p className="text-xs text-green-700">Thanks for spreading the word.</p>
          </div>
        </div>
      )}

      <Button onClick={handleGo} disabled={going} size="lg" className="w-full">
        {going ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...</>
        ) : clientId ? (
          <>Go to my AI employee <ArrowRight className="h-4 w-4 ml-2" /></>
        ) : (
          <>Open dashboard <ArrowRight className="h-4 w-4 ml-2" /></>
        )}
      </Button>
    </div>
  );
}

// ── Main wizard ────────────────────────────────────────────────────────────

export function OnboardingWizard({ agencyId: _agencyId, agencyName, plan: _plan }: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const currentIndex = STEPS.indexOf(step);

  return (
    <Card className="w-full max-w-lg p-8 shadow-xl border-0 ring-1 ring-black/5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-indigo-600" />
          <span className="font-bold text-gray-900 text-sm">Kyra Setup</span>
        </div>
        {step !== 'welcome' && step !== 'done' && (
          <button
            onClick={() => setStep(STEPS[currentIndex - 1])}
            className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}
      </div>

      <StepDots current={currentIndex} />

      {step === 'welcome' && (
        <StepWelcome agencyName={agencyName} onNext={() => setStep('ghl')} />
      )}
      {step === 'ghl' && (
        <StepGHL onNext={() => setStep('client')} onSkip={() => setStep('client')} />
      )}
      {step === 'client' && (
        <StepClient
          onNext={(id) => { setCreatedClientId(id); setStep('done'); }}
          onSkip={() => setStep('done')}
        />
      )}
      {step === 'done' && (
        <StepDone clientId={createdClientId} agencyName={agencyName} />
      )}
    </Card>
  );
}
