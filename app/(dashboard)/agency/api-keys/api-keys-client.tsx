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
  AlertTriangle,
} from 'lucide-react';

// ── Provider definitions ──────────────────────────────────────────────────────

const AI_PROVIDERS = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models — Haiku, Sonnet, Opus',
    placeholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    icon: '🧠',
    models: ['Claude Haiku', 'Claude Sonnet', 'Claude Opus'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4, GPT-3.5',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    icon: '🤖',
    models: ['GPT-4o', 'GPT-4', 'GPT-3.5 Turbo'],
  },
  {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini Pro, Gemini Ultra',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    icon: '🔷',
    models: ['Gemini Pro', 'Gemini Ultra'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access 100+ models through one API key',
    placeholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
    icon: '🌐',
    models: ['Claude', 'GPT-4', 'Llama', 'Mistral', 'and 100+ more'],
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

  // Load existing keys on mount
  useEffect(() => {
    async function loadKeys() {
      try {
        const res = await fetch('/api/agency/api-keys');
        if (res.ok) {
          const data = await res.json();
          // Backend returns which providers have keys set (not the actual keys)
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
    // Only send keys that have values
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

      // Update saved state
      const newSaved = { ...savedKeys };
      for (const provider of Object.keys(keysToSave)) {
        newSaved[provider] = true;
      }
      setSavedKeys(newSaved);
      setKeys({}); // Clear input fields after saving

      setMessage({
        type: 'success',
        text: `Saved ${Object.keys(keysToSave).length} API key(s). Your client AIs will use these keys for responses.`,
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
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
        <p className="mt-1 text-gray-500">
          Connect your own AI provider keys. Your client AIs will use these
          models — you pay your provider directly, no middlemen.
        </p>
      </div>

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

      {/* Info card */}
      <Card className="mb-6 border-blue-200 bg-blue-50/50">
        <CardContent className="pt-5">
          <div className="flex gap-3">
            <KeyRound className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-medium">How it works</p>
              <p>
                Add your API key from any supported provider. When your client
                AIs generate responses, they&apos;ll use your key and model. You
                only need <strong>one provider</strong> — add whichever you
                prefer.
              </p>
              <p className="text-blue-600">
                Keys are encrypted and stored securely. We never share them.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider cards */}
      <div className="space-y-4">
        {AI_PROVIDERS.map((provider) => {
          const isConfigured = savedKeys[provider.id];
          const currentValue = keys[provider.id] || '';
          const isVisible = showKey[provider.id];

          return (
            <Card
              key={provider.id}
              className={
                isConfigured
                  ? 'border-green-200 bg-green-50/30'
                  : 'border-gray-200'
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {provider.name}
                        {isConfigured && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            <Check className="h-3 w-3" />
                            Connected
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {provider.description}
                      </CardDescription>
                    </div>
                  </div>
                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                  >
                    Get key
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={isVisible ? 'text' : 'password'}
                      placeholder={
                        isConfigured
                          ? '••••••••••••••• (key saved — enter new to replace)'
                          : provider.placeholder
                      }
                      value={currentValue}
                      onChange={(e) =>
                        setKeys((prev) => ({
                          ...prev,
                          [provider.id]: e.target.value,
                        }))
                      }
                      className="font-mono text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowKey((prev) => ({
                          ...prev,
                          [provider.id]: !prev[provider.id],
                        }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {isVisible ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Models: {provider.models.join(', ')}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save button */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          You only need one provider configured. Add more for model flexibility.
        </p>
        <Button
          onClick={handleSave}
          disabled={
            isSaving ||
            Object.values(keys).every((v) => !v.trim())
          }
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save API Keys
            </>
          )}
        </Button>
      </div>

      {/* Warning */}
      <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Beta Note</p>
            <p>
              During the beta, all your client AIs share the same API key(s) set
              here. Per-client key configuration is coming soon. You are
              responsible for usage costs on your own provider accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
