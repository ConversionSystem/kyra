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
  ChevronDown,
} from 'lucide-react';
import { PROVIDER_MODELS, DEFAULT_MODEL_ID } from '@/lib/agency/ai-models';

// ── Provider definitions ──────────────────────────────────────────────────────

const AI_PROVIDERS = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude Haiku · Sonnet · Opus',
    placeholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    icon: '🧠',
    badge: 'Highest Priority',
    badgeColor: 'bg-violet-100 text-violet-700',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: '100+ models through one key',
    placeholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
    icon: '🌐',
    badge: 'Most flexible',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o · GPT-4o mini · o1 · o3',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    icon: '🤖',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini Flash · Gemini Pro · Gemini 2.0',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    icon: '🔷',
    badge: null,
    badgeColor: '',
  },
] as const;

type ProviderId = (typeof AI_PROVIDERS)[number]['id'];

interface ActiveProvider {
  provider: ProviderId;
  model: string;
  modelId: string;
}

interface TestState {
  status: 'idle' | 'testing' | 'ok' | 'fail';
  latencyMs?: number;
  error?: string;
}

import { OpenAIEndpointSection } from './openai-endpoint-section';

interface ApiKeysClientProps {
  agencyId: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ApiKeysClient({ agencyId: _agencyId }: ApiKeysClientProps) {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});
  const [activeProvider, setActiveProvider] = useState<ActiveProvider | null>(null);
  // selectedModels tracks what's saved; pendingModels tracks UI selections not yet saved
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [pendingModels, setPendingModels] = useState<Record<string, string>>({});
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
        setSelectedModels(data.selectedModels || {});
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

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const keysToSave = Object.fromEntries(
      Object.entries(keys).filter(([, v]) => v.trim())
    );

    // Collect model changes: pending overrides + any new keys' model choices
    const modelsToSave: Record<string, string> = { ...pendingModels };

    const hasKeyChanges = Object.keys(keysToSave).length > 0;
    const hasModelChanges = Object.keys(modelsToSave).length > 0;

    if (!hasKeyChanges && !hasModelChanges) {
      setSaveMessage({ type: 'error', text: 'Nothing to save. Enter a key or change a model.' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/agency/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: keysToSave, selectedModels: modelsToSave }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }

      const data = await res.json();
      setSavedKeys(data.configured || {});
      setSelectedModels(data.selectedModels || {});
      setActiveProvider(data.active || null);
      setKeys({});
      setPendingModels({});

      setSaveMessage({
        type: 'success',
        text: `Saved! Active model: ${data.active?.model || 'Kyra default'}. Containers updating (~30s).`,
      });
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

  // ── Test ──────────────────────────────────────────────────────────────────

  const handleTest = async (providerId: string) => {
    setTestStates((prev) => ({ ...prev, [providerId]: { status: 'testing' } }));
    try {
      const res = await fetch('/api/agency/api-keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      });
      const data = await res.json();

      setTestStates((prev) => ({
        ...prev,
        [providerId]: data.ok
          ? { status: 'ok', latencyMs: data.latencyMs }
          : { status: 'fail', error: data.error || 'Connection failed' },
      }));

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

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (providerId: string) => {
    const providerName = AI_PROVIDERS.find((p) => p.id === providerId)?.name;
    if (!window.confirm(`Remove the ${providerName} key? Your AI will fall back to the next configured provider.`)) return;

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
      setSelectedModels(data.selectedModels || {});
      setActiveProvider(data.active || null);
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to remove key. Try again.' });
    } finally {
      setDeletingProvider(null);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const hasAnyCustomKey = Object.values(savedKeys).some(Boolean);
  const hasUnsavedChanges =
    Object.values(keys).some((v) => v.trim()) ||
    Object.keys(pendingModels).length > 0;

  // ── Loading ───────────────────────────────────────────────────────────────

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
      <div className="mb-8 flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Model Keys</h1>
          <p className="mt-1 text-gray-500">
            Pick the provider and exact model that powers your AI workers.
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

      {/* ── Active Model Banner ── */}
      <div className={`rounded-xl border p-5 mb-8 ${
        activeProvider ? 'border-indigo-200 bg-indigo-50' : 'border-green-200 bg-green-50'
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
              {activeProvider ? 'Using your own key' : 'Using Kyra\'s default key'}
            </p>
            <p className={`mt-1 text-sm ${activeProvider ? 'text-indigo-700' : 'text-green-700'}`}>
              {activeProvider
                ? `All AI conversations route through your ${AI_PROVIDERS.find((p) => p.id === activeProvider.provider)?.name} key.`
                : 'Kyra provides a shared OpenAI key. Add your own to pick any model and pay at cost.'}
            </p>

            {/* Active model pill */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
                activeProvider ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'
              }`}>
                <Crown className="h-3.5 w-3.5" />
                {activeProvider ? activeProvider.model : 'GPT-4o mini (Kyra default)'}
              </div>
              {activeProvider && (
                <span className="text-xs text-indigo-500">
                  via {AI_PROVIDERS.find((p) => p.id === activeProvider.provider)?.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {hasAnyCustomKey && (
          <div className="mt-4 rounded-lg bg-white/70 border border-indigo-100 px-4 py-3 text-xs text-indigo-800">
            <strong>Priority:</strong> Anthropic → OpenRouter → OpenAI → Google.
            The first configured provider always wins. Use the model selector on each card to choose the exact model.
          </div>
        )}
      </div>

      {/* Save message */}
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

      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">
          {hasAnyCustomKey ? 'Manage your keys & models' : 'Add your own key'}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          You only need one provider. Change the model at any time — no need to re-enter the key.
        </p>
      </div>

      {/* ── Provider Cards ── */}
      <div className="space-y-3">
        {AI_PROVIDERS.map((provider) => {
          const isConfigured = savedKeys[provider.id];
          const isActive = activeProvider?.provider === provider.id;
          const currentKeyValue = keys[provider.id] || '';
          const isVisible = showKey[provider.id];
          const testState = testStates[provider.id] || { status: 'idle' };
          const isDeleting = deletingProvider === provider.id;
          const models = PROVIDER_MODELS[provider.id] || [];

          // Current model: pending change > saved > default
          const savedModelId = selectedModels[provider.id] || DEFAULT_MODEL_ID[provider.id];
          const pendingModelId = pendingModels[provider.id];
          const displayModelId = pendingModelId || savedModelId;
          const hasModelChange = pendingModelId && pendingModelId !== savedModelId;

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
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                            <Check className="h-3 w-3" />
                            Saved
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
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0"
                  >
                    Get key <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                {/* Key input */}
                <div className="relative">
                  <Input
                    type={isVisible ? 'text' : 'password'}
                    placeholder={
                      isConfigured
                        ? '••••••••••••••• (saved — enter new to replace)'
                        : provider.placeholder
                    }
                    value={currentKeyValue}
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

                {/* Model selector — shown when key is saved OR being added */}
                {(isConfigured || currentKeyValue.trim()) && models.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Model
                      {hasModelChange && (
                        <span className="ml-2 text-amber-600 font-medium">● unsaved change</span>
                      )}
                    </label>
                    <div className="relative">
                      <select
                        value={displayModelId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPendingModels((prev) => ({ ...prev, [provider.id]: val }));
                        }}
                        className="w-full appearance-none rounded-md border border-gray-200 bg-white px-3 py-2 pr-8 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      >
                        {models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                            {m.badge ? ` — ${m.badge}` : ''}
                            {' · '}
                            {m.desc}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>

                    {/* Selected model detail */}
                    {(() => {
                      const sel = models.find((m) => m.id === displayModelId);
                      if (!sel) return null;
                      return (
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          {sel.badge && (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sel.badgeColor}`}>
                              {sel.badge}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">{sel.desc}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Test + Delete buttons */}
                {isConfigured && (
                  <div className="flex items-center gap-2 pt-1">
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
          disabled={isSaving || !hasUnsavedChanges}
          className="gap-2"
        >
          {isSaving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving & updating…</>
          ) : (
            <><Save className="h-4 w-4" /> Save & Apply</>
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
              title: 'Default',
              desc: 'Kyra provides a shared GPT-4o mini key. No setup needed — your AI works immediately.',
            },
            {
              icon: '🔑',
              title: 'Your key + model',
              desc: 'Add a key and pick any model (Claude Opus, GPT-4o, Gemini 2.0…). Billed directly by your provider.',
            },
            {
              icon: '⚡',
              title: 'Instant rollout',
              desc: 'Save a key or change a model → all containers update automatically in ~30s.',
            },
            {
              icon: '🏆',
              title: 'Priority',
              desc: 'Anthropic → OpenRouter → OpenAI → Google. First configured provider wins. Active model shown at top.',
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

      {/* ── OpenAI-Compatible Endpoint ───────────────────────────────────── */}
      <OpenAIEndpointSection agencyId={_agencyId} clients={[]} />
    </div>
  );
}
