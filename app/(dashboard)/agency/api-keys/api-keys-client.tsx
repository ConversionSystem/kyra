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
  TestTube2,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Crown,
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
    activeModel: 'Claude Haiku',
    badge: 'Highest Priority',
    badgeColor: 'bg-violet-100 text-violet-700',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access 100+ models through one key',
    placeholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
    icon: '🌐',
    activeModel: 'Claude Sonnet (via OpenRouter)',
    badge: 'Most flexible',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o · GPT-4o mini · o1',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    icon: '🤖',
    activeModel: 'GPT-4o mini',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini Flash · Gemini Pro',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    icon: '🔷',
    activeModel: 'Gemini Flash',
    badge: null,
    badgeColor: '',
  },
] as const;

type ProviderId = (typeof AI_PROVIDERS)[number]['id'];

interface ActiveProvider {
  provider: ProviderId;
  model: string;
}

interface TestState {
  status: 'idle' | 'testing' | 'ok' | 'fail';
  latencyMs?: number;
  error?: string;
}

interface ApiKeysClientProps {
  agencyId: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ApiKeysClient({ agencyId: _agencyId }: ApiKeysClientProps) {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});
  const [activeProvider, setActiveProvider] = useState<ActiveProvider | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [testStates, setTestStates] = useState<Record<string, TestState>>({});
  const [deletingProvider, setDeletingProvider] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/api-keys');
      if (res.ok) {
        const data = await res.json();
        setSavedKeys(data.configured || {});
        setActiveProvider(data.active || null);
      }
    } catch {
      // Non-fatal
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  // ── Save keys ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const keysToSave = Object.fromEntries(
      Object.entries(keys).filter(([, v]) => v.trim())
    );

    if (Object.keys(keysToSave).length === 0) {
      setSaveMessage({ type: 'error', text: 'Enter at least one API key to save.' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

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

      const data = await res.json();
      setSavedKeys(data.configured || {});
      setActiveProvider(data.active || null);
      setKeys({});

      const count = Object.keys(keysToSave).length;
      setSaveMessage({
        type: 'success',
        text: `${count} key${count > 1 ? 's' : ''} saved. Containers are being updated (~30s).`,
      });

      // Clear success after 8s
      setTimeout(() => setSaveMessage(null), 8000);
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Test a saved key ───────────────────────────────────────────────────────

  const handleTest = async (providerId: string) => {
    setTestStates((prev) => ({ ...prev, [providerId]: { status: 'testing' } }));

    try {
      const res = await fetch('/api/agency/api-keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      });

      const data = await res.json();

      if (data.ok) {
        setTestStates((prev) => ({
          ...prev,
          [providerId]: { status: 'ok', latencyMs: data.latencyMs },
        }));
      } else {
        setTestStates((prev) => ({
          ...prev,
          [providerId]: { status: 'fail', error: data.error || 'Connection failed' },
        }));
      }

      // Reset after 10s
      setTimeout(() => {
        setTestStates((prev) => ({ ...prev, [providerId]: { status: 'idle' } }));
      }, 10000);
    } catch {
      setTestStates((prev) => ({
        ...prev,
        [providerId]: { status: 'fail', error: 'Request failed' },
      }));
    }
  };

  // ── Delete a saved key ─────────────────────────────────────────────────────

  const handleDelete = async (providerId: string) => {
    if (!window.confirm(`Remove the ${AI_PROVIDERS.find((p) => p.id === providerId)?.name} key? Your AI will fall back to the next configured provider.`)) return;

    setDeletingProvider(providerId);

    try {
      const res = await fetch('/api/agency/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      });

      if (!res.ok) throw new Error('Failed to remove key');

      const data = await res.json();
      setSavedKeys(data.configured || {});
      setActiveProvider(data.active || null);
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to remove key. Try again.' });
    } finally {
      setDeletingProvider(null);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────

  const hasAnyCustomKey = Object.values(savedKeys).some(Boolean);
  const hasUnsavedKeys = Object.values(keys).some((v) => v.trim());

  // ── Loading state ──────────────────────────────────────────────────────────

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
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Model Keys</h1>
          <p className="mt-1 text-gray-500">
            Control which AI model powers your terminals and your clients&apos; AIs.
          </p>
        </div>
        <button
          onClick={loadKeys}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          title="Refresh status"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* ── ACTIVE MODEL BANNER ── */}
      <div className={`rounded-xl border p-5 mb-8 ${
        activeProvider
          ? 'border-indigo-200 bg-indigo-50'
          : 'border-green-200 bg-green-50'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            activeProvider ? 'bg-indigo-100' : 'bg-green-100'
          }`}>
            {activeProvider
              ? <KeyRound className="h-5 w-5 text-indigo-600" />
              : <Zap className="h-5 w-5 text-green-600" />
            }
          </div>
          <div className="flex-1">
            <p className={`font-semibold text-base ${activeProvider ? 'text-indigo-900' : 'text-green-900'}`}>
              {activeProvider ? 'Your AI is using your key' : 'Your AI is live — using Kyra\'s key'}
            </p>
            <p className={`mt-1 text-sm ${activeProvider ? 'text-indigo-700' : 'text-green-700'}`}>
              {activeProvider
                ? `Currently routing all AI conversations through your ${AI_PROVIDERS.find(p => p.id === activeProvider.provider)?.name} key.`
                : 'Kyra provides a shared OpenAI key for all your AIs. Add your own to switch models and pay at cost.'}
            </p>

            {/* Active model pill */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
                activeProvider
                  ? 'bg-indigo-600 text-white'
                  : 'bg-green-600 text-white'
              }`}>
                <Crown className="h-3.5 w-3.5" />
                Active model: {activeProvider ? activeProvider.model : 'GPT-4o mini (Kyra default)'}
              </div>
              {activeProvider && (
                <span className="text-xs text-indigo-500">
                  via {AI_PROVIDERS.find(p => p.id === activeProvider.provider)?.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Priority note */}
        {hasAnyCustomKey && (
          <div className="mt-4 rounded-lg bg-white/70 border border-indigo-100 px-4 py-3 text-xs text-indigo-800">
            <strong>Priority order:</strong> Anthropic → OpenRouter → OpenAI → Google.
            The first configured provider always wins. Remove lower-priority keys if you only want one active.
          </div>
        )}
      </div>

      {/* Success / error message */}
      {saveMessage && (
        <div className={`rounded-md px-4 py-3 text-sm mb-6 flex items-start gap-2 ${
          saveMessage.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {saveMessage.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          }
          {saveMessage.text}
        </div>
      )}

      {/* Section title */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">
          {hasAnyCustomKey ? 'Manage your API keys' : 'Add your own key to upgrade'}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          You only need one provider. The highest-priority configured key will be used.
        </p>
      </div>

      {/* ── Provider cards ── */}
      <div className="space-y-3">
        {AI_PROVIDERS.map((provider) => {
          const isConfigured = savedKeys[provider.id];
          const isActive = activeProvider?.provider === provider.id;
          const currentValue = keys[provider.id] || '';
          const isVisible = showKey[provider.id];
          const testState = testStates[provider.id] || { status: 'idle' };
          const isDeleting = deletingProvider === provider.id;

          return (
            <Card
              key={provider.id}
              className={`transition-all ${
                isActive
                  ? 'border-indigo-400 bg-indigo-50/40 shadow-sm'
                  : isConfigured
                  ? 'border-gray-300 bg-gray-50/30'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{provider.icon}</span>
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                        {provider.name}
                        {provider.badge && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${provider.badgeColor}`}>
                            {provider.badge}
                          </span>
                        )}
                        {isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                            <Crown className="h-2.5 w-2.5" />
                            ACTIVE
                          </span>
                        )}
                        {isConfigured && !isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            <Check className="h-3 w-3" />
                            Saved (not active)
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {provider.description}
                        {isConfigured && (
                          <span className="ml-2 text-gray-400">→ routes to <strong>{provider.activeModel}</strong></span>
                        )}
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

              <CardContent className="pt-0 space-y-2">
                {/* Key input */}
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

                {/* Test + Delete buttons (only when key is saved) */}
                {isConfigured && (
                  <div className="flex items-center gap-2">
                    {/* Test button */}
                    <button
                      onClick={() => handleTest(provider.id)}
                      disabled={testState.status === 'testing'}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        testState.status === 'ok'
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : testState.status === 'fail'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {testState.status === 'testing' ? (
                        <><Loader2 className="h-3 w-3 animate-spin" /> Testing…</>
                      ) : testState.status === 'ok' ? (
                        <><CheckCircle2 className="h-3 w-3" /> Connected ({testState.latencyMs}ms)</>
                      ) : testState.status === 'fail' ? (
                        <><AlertCircle className="h-3 w-3" /> {testState.error}</>
                      ) : (
                        <><TestTube2 className="h-3 w-3" /> Test connection</>
                      )}
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(provider.id)}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      {isDeleting
                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Removing…</>
                        : <><Trash2 className="h-3 w-3" /> Remove key</>
                      }
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save button */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Shield className="h-3.5 w-3.5" />
          Keys are encrypted and never exposed
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasUnsavedKeys}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving & updating containers…
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
              desc: 'When you save or remove a key, all your running AI containers update automatically (~30s). Use "Test connection" to verify.',
            },
            {
              icon: '🏆',
              title: 'Priority order',
              desc: 'If you add multiple keys, Anthropic wins first, then OpenRouter, then OpenAI, then Google.',
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
