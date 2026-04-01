'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Loader2, Save } from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';
import { ROLE_WORKERS } from '@/lib/ai-workers/role-workers';

// ── Languages ────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'auto', label: '🌐 Auto-detect (follows customer)' },
  { code: 'English', label: '🇺🇸 English' },
  { code: 'Spanish (Español)', label: '🇪🇸 Español (Spanish)' },
  { code: 'Portuguese (Português)', label: '🇧🇷 Português (Portuguese)' },
  { code: 'French (Français)', label: '🇫🇷 Français (French)' },
  { code: 'German (Deutsch)', label: '🇩🇪 Deutsch (German)' },
  { code: 'Italian (Italiano)', label: '🇮🇹 Italiano (Italian)' },
  { code: 'Dutch (Nederlands)', label: '🇳🇱 Nederlands (Dutch)' },
  { code: 'Polish (Polski)', label: '🇵🇱 Polski (Polish)' },
  { code: 'Arabic (العربية)', label: '🇸🇦 العربية (Arabic)' },
  { code: 'Chinese (中文)', label: '🇨🇳 中文 (Chinese)' },
  { code: 'Japanese (日本語)', label: '🇯🇵 日本語 (Japanese)' },
  { code: 'Korean (한국어)', label: '🇰🇷 한국어 (Korean)' },
  { code: 'Hindi (हिन्दी)', label: '🇮🇳 हिन्दी (Hindi)' },
  { code: 'Russian (Русский)', label: '🇷🇺 Русский (Russian)' },
  { code: 'Turkish (Türkçe)', label: '🇹🇷 Türkçe (Turkish)' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function IdentitySubTab({ client }: { client: AgencyClient }) {
  const cfg = (client.container_config as Record<string, unknown>) || {};

  // AI Identity
  const [persona, setPersona] = useState(cfg.persona as string || '');
  const [greeting, setGreeting] = useState(cfg.greeting as string || '');
  const [responseLanguage, setResponseLanguage] = useState((cfg.response_language as string) || 'auto');

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/agency/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          container_config: {
            ...cfg,
            greeting,
            persona,
            response_language: responseLanguage || 'auto',
          },
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error || 'Failed to save');
      }
      setMessage({ type: 'success', text: 'Identity saved. Changes are being pushed to your AI worker.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save. Try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const activeWorkerId = cfg.active_worker_id as string | undefined;
  const activeWorkerDef = activeWorkerId ? ROLE_WORKERS.find(w => w.id === activeWorkerId) : undefined;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Active worker banner — compact */}
      {activeWorkerDef && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
          <span>{activeWorkerDef.emoji}</span>
          <span><strong>{activeWorkerDef.name}</strong> active — editing identity may override the worker template.</span>
        </div>
      )}

      {/* Status message */}
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* ================================================================== */}
      {/* AI Identity                                                        */}
      {/* ================================================================== */}
      <Card className="border-gray-200 bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-gray-900">
            <Bot className="h-5 w-5 text-indigo-600" />
            AI Identity
          </CardTitle>
          <CardDescription className="text-gray-500">
            Define who the AI is — its name, personality, and how it greets customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Persona */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Persona</label>
            <p className="text-xs text-gray-400">A short description like &quot;Friendly dental receptionist named Sarah&quot;</p>
            <Input
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              placeholder="e.g., Professional dental receptionist named Sarah who is warm and helpful"
              className="bg-gray-50"
            />
          </div>

          {/* Greeting */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Greeting Message</label>
            <p className="text-xs text-gray-400">The first message sent to new contacts. Leave empty for an auto-greeting.</p>
            <Textarea
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="e.g., Hi! Thanks for reaching out to Smile Dental. How can I help you today?"
              rows={3}
              className="bg-gray-50"
            />
          </div>

          {/* Response Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Response Language</label>
            <p className="text-xs text-gray-400">The language your AI worker responds in to customers. Auto-detect follows the customer&apos;s language automatically.</p>
            <select
              value={responseLanguage}
              onChange={(e) => setResponseLanguage(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Save Identity                                                      */}
      {/* ================================================================== */}
      <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-indigo-600 hover:bg-indigo-700" size="lg">
        {isSaving ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
        ) : (
          <><Save className="h-4 w-4" /> Save Identity</>
        )}
      </Button>
    </div>
  );
}
