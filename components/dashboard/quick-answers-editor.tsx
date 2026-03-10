'use client';

import { useEffect, useState } from 'react';
import { Clock, MapPin, Briefcase, DollarSign, Plus, Trash2, Zap, CheckCircle } from 'lucide-react';
import { QuickAnswers } from '@/lib/billing/template-builder';

interface Props {
  clientId: string;
}

function FreeBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
      <Zap className="w-2.5 h-2.5" />
      FREE
    </span>
  );
}

export default function QuickAnswersEditor({ clientId }: Props) {
  const [qa, setQa] = useState<QuickAnswers>({ hours: '', address: '', services: '', pricing: '', custom: [] });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/agency/clients/${clientId}/templates`)
      .then(r => r.json())
      .then(d => {
        if (d.quick_answers) setQa({ custom: [], ...d.quick_answers });
      })
      .catch(() => {});
  }, [clientId]);

  const addCustom = () => setQa(q => ({ ...q, custom: [...(q.custom ?? []), { trigger: '', response: '' }] }));
  const removeCustom = (i: number) => setQa(q => ({ ...q, custom: (q.custom ?? []).filter((_, idx) => idx !== i) }));
  const updateCustom = (i: number, field: 'trigger' | 'response', val: string) =>
    setQa(q => ({ ...q, custom: (q.custom ?? []).map((c, idx) => idx === i ? { ...c, [field]: val } : c) }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/templates`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qa),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      setSaved(data.count ?? 0);
      setTimeout(() => setSaved(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const fields: Array<{ key: keyof QuickAnswers; label: string; icon: React.ElementType; placeholder: string }> = [
    { key: 'hours',    label: 'Business Hours',    icon: Clock,       placeholder: 'e.g. Monday–Friday 9am–6pm EST' },
    { key: 'address',  label: 'Location / Address', icon: MapPin,      placeholder: 'e.g. 123 Main St, Miami FL — or "Fully remote"' },
    { key: 'services', label: 'Services Offered',   icon: Briefcase,   placeholder: 'e.g. SEO, web design, paid ads, social media' },
    { key: 'pricing',  label: 'Pricing',             icon: DollarSign,  placeholder: 'e.g. Packages starting at $499/month' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-900">Quick Answers</h3>
          <FreeBadge />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          These answers are delivered instantly at <strong>0 credits</strong> — no AI call, no cost.
          Fill in what you know; leave blank to let the AI handle it.
        </p>
      </div>

      <div className="space-y-3">
        {fields.map(({ key, label, icon: Icon, placeholder }) => (
          <div key={key}>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
              <Icon className="w-3.5 h-3.5 text-gray-400" />
              {label}
              <FreeBadge />
            </label>
            <input
              type="text"
              value={(qa[key] as string) ?? ''}
              onChange={e => setQa(q => ({ ...q, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-gray-300"
            />
          </div>
        ))}
      </div>

      {/* Custom FAQs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
            Custom FAQs
            <FreeBadge />
          </label>
          <button
            onClick={addCustom}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add FAQ
          </button>
        </div>

        {(qa.custom ?? []).length === 0 && (
          <p className="text-xs text-gray-400 italic">No custom FAQs yet — click "Add FAQ" to add one.</p>
        )}

        <div className="space-y-2">
          {(qa.custom ?? []).map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={item.trigger}
                  onChange={e => updateCustom(i, 'trigger', e.target.value)}
                  placeholder="Question / trigger phrase"
                  className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300 placeholder:text-gray-300"
                />
                <input
                  type="text"
                  value={item.response}
                  onChange={e => updateCustom(i, 'response', e.target.value)}
                  placeholder="Answer to send"
                  className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300 placeholder:text-gray-300"
                />
              </div>
              <button onClick={() => removeCustom(i)} className="mt-1 p-1 text-gray-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save button + feedback */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Quick Answers'}
        </button>

        {saved !== null && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            {saved} answers now free!
          </span>
        )}
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  );
}
