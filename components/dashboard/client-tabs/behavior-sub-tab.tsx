'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Zap, Loader2, Save, Plus, X } from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';
import AISuggestionsCard from '@/components/dashboard/ai-suggestions-card';

// ── Wake word types ──────────────────────────────────────────────────────────

type WakeWordAction = 'pause' | 'escalate' | 'custom';
interface WakeWord { keyword: string; action: WakeWordAction; response: string }

// ── Component ────────────────────────────────────────────────────────────────

export default function BehaviorSubTab({ client }: { client: AgencyClient }) {
  const cfg = (client.container_config as Record<string, unknown>) || {};

  // Behavior Triggers
  const [proactiveEnabled, setProactiveEnabled] = useState((cfg.proactive_enabled as boolean) ?? false);
  const [proactiveGreeting, setProactiveGreeting] = useState((cfg.proactive_greeting as string) ?? '');
  const [wakeWords, setWakeWords] = useState<WakeWord[]>((cfg.wake_words as WakeWord[]) ?? []);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Wake word helpers ──────────────────────────────────────────────────────

  const addWakeWord = () => setWakeWords((prev) => [...prev, { keyword: '', action: 'escalate', response: '' }]);
  const removeWakeWord = (i: number) => setWakeWords((prev) => prev.filter((_, idx) => idx !== i));
  const updateWakeWord = (i: number, patch: Partial<WakeWord>) =>
    setWakeWords((prev) => prev.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));

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
            proactive_enabled: proactiveEnabled,
            proactive_greeting: proactiveGreeting.trim() || undefined,
            wake_words: wakeWords.filter((w) => w.keyword.trim()),
          },
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error || 'Failed to save');
      }
      setMessage({ type: 'success', text: 'Behavior settings saved. Changes are being pushed to your AI worker.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save. Try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Status message */}
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* AI Performance Analysis */}
      <AISuggestionsCard clientId={client.id} />

      {/* ================================================================== */}
      {/* Behavior Triggers                                                  */}
      {/* ================================================================== */}
      <Card className="border-gray-200 bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-gray-900">
            <Zap className="h-5 w-5 text-indigo-600" />
            Behavior Triggers
          </CardTitle>
          <CardDescription className="text-gray-500">
            Proactive greetings and keyword-triggered actions for your AI worker.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Proactive Greeting */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Proactive Greeting</h4>
            <p className="text-xs text-gray-400">When a new GHL contact is added, the AI can reach out first.</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setProactiveEnabled(!proactiveEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${proactiveEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${proactiveEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {proactiveEnabled ? 'AI reaches out to new contacts' : 'Proactive greeting disabled'}
              </span>
            </div>
            {proactiveEnabled && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Opening message</label>
                <Textarea
                  value={proactiveGreeting}
                  onChange={(e) => setProactiveGreeting(e.target.value)}
                  placeholder={`Hi {{firstName}}, this is ${client.name}'s AI assistant! How can I help you today?`}
                  className="bg-gray-50 min-h-[80px] text-sm"
                />
                <p className="text-xs text-gray-400">Use {'{{firstName}}'} and {'{{lastName}}'} to personalize with GHL contact data.</p>
              </div>
            )}
          </div>

          {/* Wake Words */}
          <div className="space-y-3 border-t border-gray-100 pt-6">
            <h4 className="text-sm font-semibold text-gray-900">Wake Words</h4>
            <p className="text-xs text-gray-400">Keywords that trigger a specific AI behavior when a customer says them.</p>
            {wakeWords.length === 0 && (
              <p className="text-sm text-gray-400 italic">No wake words configured.</p>
            )}
            {wakeWords.map((w, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Keyword (e.g. STOP)"
                    value={w.keyword}
                    onChange={(e) => updateWakeWord(i, { keyword: e.target.value })}
                    className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400 uppercase"
                  />
                  <select
                    value={w.action}
                    onChange={(e) => updateWakeWord(i, { action: e.target.value as WakeWordAction })}
                    className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
                  >
                    <option value="pause">Pause AI responses</option>
                    <option value="escalate">Escalate to human</option>
                    <option value="custom">Reply with custom text</option>
                  </select>
                  {w.action === 'custom' && (
                    <input
                      type="text"
                      placeholder="Custom reply text..."
                      value={w.response}
                      onChange={(e) => updateWakeWord(i, { response: e.target.value })}
                      className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeWakeWord(i)}
                  className="shrink-0 mt-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addWakeWord}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              <Plus className="h-4 w-4" /> Add wake word
            </button>
            <p className="text-xs text-gray-400">
              Common: STOP (pause), UNSUBSCRIBE (pause), HUMAN / AGENT (escalate), PRICE (custom reply).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Save Behavior Settings                                             */}
      {/* ================================================================== */}
      <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-indigo-600 hover:bg-indigo-700" size="lg">
        {isSaving ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
        ) : (
          <><Save className="h-4 w-4" /> Save Behavior Settings</>
        )}
      </Button>
    </div>
  );
}
