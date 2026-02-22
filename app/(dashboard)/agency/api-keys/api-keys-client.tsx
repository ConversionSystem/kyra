'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Save,
  Loader2,
  KeyRound,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Zap,
  Shield,
} from 'lucide-react';

// ── Provider definitions ──────────────────────────────────────────────────────

const AI_PROVIDERS = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude Haiku · Sonnet · Opus',
    placeholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    icon: '🧠',
    recommendedModel: 'Claude Haiku',
    badge: 'Recommended',
    badgeColor: 'bg-violet-100 text-violet-700',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o · GPT-4o mini · o1',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    icon: '🤖',
    recommendedModel: 'GPT-4o mini',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access 100+ models through one key',
    placeholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
    icon: '🌐',
    recommendedModel: 'Any model',
    badge: 'Most flexible',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini Flash · Gemini Pro',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    icon: '🔷',
    recommendedModel: 'Gemini Flash',
    badge: null,
    badgeColor: '',
  },
] as const;

type ProviderId = (typeof AI_PROVIDERS)[number]['id'];

interface ApiKeysClientProps {
  agencyId: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ApiKeysClient({ agencyId }: ApiKeysClientProps) {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const hasAnyCustomKey = Object.values(savedKeys).some(Boolean);
  const configuredProviders = AI_PROVIDERS.filter((p) => savedKeys[p.id]);

  useEffect(() => {
    async function loadKeys() {
      try {
        const res = await fetch('/api/agency/api-keys');
        if (res.ok) {
          const data = await res.json();
          setSavedKeys(data.configured || {});
        }
      } catch {
        // Non-fatal
      } finally {
        setIsLoading(false);
      }
    }
    loadKeys();
  }, []);

  const handleSave = async () => {
    const keysToSave = Object.fromEntries(
      Object.entries(keys).filter(([, v]) => v.trim())
    );

    if (Object.keys(keysToSave).length === 0) {
      setMessage({ type: 'error', text: 'Enter at least one API key to save.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/agency/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: keysToSave }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }

      const newSaved = { ...savedKeys };
      for (const provider of Object.keys(keysToSave)) {
        newSaved[provider] = true;
      }
      setSavedKeys(newSaved);
      setKeys({});

      const count = Object.keys(keysToSave).length;
      setMessage({
        type: 'success',
        text: `✅ ${count} API key${count > 1 ? 's' : ''} saved. All your AI containers are being updated now — takes ~30 seconds.`,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">AI Model Keys</h1>
        <p className="mt-1 text-gray-500">
          Control which AI model powers your terminals and your clients&apos; AIs.
        </p>
      </div>

      {/* ── Current Status Card ── */}
      {!hasAnyCustomKey ? (
        /* Default state — Kyra's key is active */
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 mb-8">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-green-900 text-base">
                Your AI is live — no setup needed
              </p>
              <p className="mt-1 text-sm text-green-700">
                Kyra provides a default <strong>OpenAI GPT-4o mini</strong> key for all your
                terminals and your clients&apos; AIs. Everything works out of the box.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-green-200/60 px-3 py-1 text-xs font-medium text-green-800">
                <Zap className="h-3 w-3" />
                GPT-4o mini · Powered by Kyra
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-white/70 border border-green-200 px-4 py-3 text-sm text-green-800">
            <strong>Want more power?</strong> Add your own API key below to switch to Claude, GPT-4o,
            Gemini, or any other model — and pay your provider directly at cost.
          </div>
        </div>
      ) : (
        /* Custom key active */
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 mb-8">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
              <KeyRound className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-indigo-900 text-base">
                Using your own API key
              </p>
              <p className="mt-1 text-sm text-indigo-700">
                Your terminals and client AIs are running on your own key — you pay your provider directly.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {configuredProviders.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-indigo-200/60 px-3 py-1 text-xs font-medium text-indigo-800"
                  >
                    <Check className="h-3 w-3" />
                    {p.name} · {p.recommendedModel}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success / error message */}
      {message && (
        <div
          className={`rounded-md px-4 py-3 text-sm mb-6 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ── Add / Update Keys ── */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">
          {hasAnyCustomKey ? 'Update or add a provider' : 'Add your own key to upgrade'}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          You only need one provider. Your choice of key determines the model used across all AI terminals.
        </p>
      </div>

      <div className="space-y-3">
        {AI_PROVIDERS.map((provider) => {
          const isConfigured = savedKeys[provider.id];
          const currentValue = keys[provider.id] || '';
          const isVisible = showKey[provider.id];

          return (
            <Card
              key={provider.id}
              className={`transition-colors ${
                isConfigured
                  ? 'border-indigo-200 bg-indigo-50/20'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{provider.icon}</span>
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        {provider.name}
                        {provider.badge && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${provider.badgeColor}`}>
                            {provider.badge}
                          </span>
                        )}
                        {isConfigured && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            <Check className="h-3 w-3" />
                            Connected
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {provider.description}
                      </CardDescription>
                    </div>
                  </div>
                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors shrink-0"
                  >
                    Get key
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="relative flex-1">
                  <Input
                    type={isVisible ? 'text' : 'password'}
                    placeholder={
                      isConfigured
                        ? '••••••••••••••• (saved — enter new to replace)'
                        : provider.placeholder
                    }
                    value={currentValue}
                    onChange={(e) =>
                      setKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))
                    }
                    className="font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowKey((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save button */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Shield className="h-3.5 w-3.5" />
          Keys are encrypted and never shared
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || Object.values(keys).every((v) => !v.trim())}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving & updating containers...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save & Apply Key
            </>
          )}
        </Button>
      </div>

      {/* How it works */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">How it works</p>
        <div className="space-y-2.5">
          {[
            {
              icon: '🟢',
              title: 'Default (no key needed)',
              desc: 'Kyra provides a shared OpenAI key — GPT-4o mini — for all your AIs. No cost to you.',
            },
            {
              icon: '🔑',
              title: 'Your own key',
              desc: 'Add your key to switch models (Claude, GPT-4o, Gemini…). Costs billed directly to your provider account.',
            },
            {
              icon: '⚡',
              title: 'Instant rollout',
              desc: 'When you save a key, all your running AI containers are updated automatically within ~30 seconds.',
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-3 text-sm">
              <span className="text-base leading-5">{item.icon}</span>
              <div>
                <span className="font-medium text-gray-700">{item.title} — </span>
                <span className="text-gray-500">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
