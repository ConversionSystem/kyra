'use client';

import { useState } from 'react';
import {
  Bell, Plus, Trash2, Zap, AlertTriangle, Clock, DollarSign,
  MessageSquare, Bot, Shield, CheckCircle2, Loader2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AISuggestButton } from '@/components/ai/suggest-button';

interface AlertRule {
  id: string;
  type: 'agent_offline' | 'token_spike' | 'no_activity' | 'review_stale' | 'error_rate';
  label: string;
  threshold: number;
  unit: string;
  enabled: boolean;
  notify_via: 'dashboard' | 'email';
}

const RULE_TEMPLATES: Omit<AlertRule, 'id'>[] = [
  { type: 'agent_offline', label: 'AI Worker goes offline', threshold: 10, unit: 'minutes', enabled: true, notify_via: 'dashboard' },
  { type: 'token_spike', label: 'Token usage exceeds daily limit', threshold: 50000, unit: 'tokens/day', enabled: true, notify_via: 'dashboard' },
  { type: 'no_activity', label: 'No conversations for extended period', threshold: 24, unit: 'hours', enabled: false, notify_via: 'dashboard' },
  { type: 'review_stale', label: 'Review queue item older than', threshold: 4, unit: 'hours', enabled: false, notify_via: 'dashboard' },
  { type: 'error_rate', label: 'Error rate exceeds threshold', threshold: 10, unit: '% of responses', enabled: false, notify_via: 'dashboard' },
];

const RULE_ICONS: Record<string, React.ElementType> = {
  agent_offline: Bot,
  token_spike: Zap,
  no_activity: Clock,
  review_stale: Shield,
  error_rate: AlertTriangle,
};

const RULE_COLORS: Record<string, string> = {
  agent_offline: 'bg-red-50 border-red-200 text-red-700',
  token_spike: 'bg-amber-50 border-amber-200 text-amber-700',
  no_activity: 'bg-blue-50 border-blue-200 text-blue-700',
  review_stale: 'bg-purple-50 border-purple-200 text-purple-700',
  error_rate: 'bg-orange-50 border-orange-200 text-orange-700',
};

export function AlertsClient({ initialRules }: { initialRules: Array<Record<string, unknown>> }) {
  const [rules, setRules] = useState<AlertRule[]>(() => {
    if (initialRules.length > 0) return initialRules as unknown as AlertRule[];
    // Seed with defaults
    return RULE_TEMPLATES.map((t, i) => ({ ...t, id: `rule-${i}` }));
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    setSaved(false);
  };

  const updateThreshold = (id: string, value: number) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, threshold: value } : r));
    setSaved(false);
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    setSaved(false);
  };

  const addRule = (template: Omit<AlertRule, 'id'>) => {
    setRules(prev => [...prev, { ...template, id: `rule-${Date.now()}` }]);
    setShowAdd(false);
    setSaved(false);
  };

  const saveRules = async () => {
    setSaving(true);
    await fetch('/api/agency/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert_rules: rules }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const activeCount = rules.filter(r => r.enabled).length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-indigo-600" /> Alert Rules
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Get notified when something needs your attention — agent down, cost spike, or stale reviews
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AISuggestButton type="alert_rules" label="Suggest Rules" />
          <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4 mr-1" /> Add Rule
          </Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={saveRules} disabled={saving || saved}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : saved ? <CheckCircle2 className="h-4 w-4 mr-1" /> : null}
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Rules'}
          </Button>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        <span className={`text-sm font-medium px-3 py-1.5 rounded-lg border ${activeCount > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
          {activeCount} active rule{activeCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Add Rule Panel */}
      {showAdd && (
        <div className="bg-white border border-indigo-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Alert Rule</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {RULE_TEMPLATES.filter(t => !rules.some(r => r.type === t.type)).map(t => {
              const Icon = RULE_ICONS[t.type] || Bell;
              return (
                <button
                  key={t.type}
                  onClick={() => addRule(t)}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/50 transition text-left"
                >
                  <Icon className="h-4 w-4 text-gray-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t.label}</p>
                    <p className="text-[10px] text-gray-400">Default: {t.threshold} {t.unit}</p>
                  </div>
                </button>
              );
            })}
            {RULE_TEMPLATES.filter(t => !rules.some(r => r.type === t.type)).length === 0 && (
              <p className="text-sm text-gray-400 col-span-2 text-center py-4">All rule types added</p>
            )}
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-3">
        {rules.map(rule => {
          const Icon = RULE_ICONS[rule.type] || Bell;
          const colorClass = RULE_COLORS[rule.type] || 'bg-gray-50 border-gray-200 text-gray-700';

          return (
            <div key={rule.id} className={`border rounded-xl p-4 transition ${rule.enabled ? colorClass : 'bg-gray-50 border-gray-200 opacity-60'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${rule.enabled ? 'bg-white/70' : 'bg-gray-100'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{rule.label}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs opacity-70">Threshold:</span>
                    <input
                      type="number"
                      value={rule.threshold}
                      onChange={e => updateThreshold(rule.id, Number(e.target.value))}
                      className="w-20 px-2 py-0.5 text-xs border rounded bg-white/80 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-xs opacity-70">{rule.unit}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={`relative w-10 h-5 rounded-full transition ${rule.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.enabled ? 'translate-x-5' : ''}`} />
                  </button>
                  <button onClick={() => deleteRule(rule.id)} className="text-gray-400 hover:text-red-500 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-indigo-700 mb-2">How Alert Rules Work</h3>
        <ul className="text-xs text-indigo-600 space-y-1.5">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Alerts appear in your dashboard notification bell and on the Overview page
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Rules are checked every 5 minutes automatically
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Set thresholds to match your business — higher limits = fewer alerts
          </li>
        </ul>
      </div>
    </div>
  );
}
