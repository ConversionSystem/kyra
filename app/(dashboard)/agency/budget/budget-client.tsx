'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Wallet, MessageSquare, AlertTriangle, Users,
  Pencil, Check, X, Info,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/types';

const MODEL_OPTIONS = [
  { value: 'auto', label: 'Auto (Default)', badge: 'bg-gray-50 text-gray-600 border-gray-200' },
  { value: 'gpt-4o-mini', label: 'Fast & Cheap', badge: 'bg-blue-50 text-blue-600 border-blue-200' },
  { value: 'gpt-4o', label: 'Smart', badge: 'bg-purple-50 text-purple-600 border-purple-200' },
];

function getModelLabel(pref: string | undefined) {
  return MODEL_OPTIONS.find(m => m.value === pref) || MODEL_OPTIONS[0];
}

function usagePercent(usage: number, budget: number | undefined): number {
  if (!budget || budget <= 0) return 0;
  return Math.min(100, Math.round((usage / budget) * 100));
}

function usageBarColor(pct: number): string {
  if (pct > 80) return 'bg-red-500';
  if (pct > 60) return 'bg-yellow-500';
  return 'bg-green-500';
}

function InlineEditor({
  client,
  onSaved,
}: {
  client: AgencyClient;
  onSaved: (updated: Record<string, unknown>) => void;
}) {
  const settings = (client.settings ?? {}) as Record<string, unknown>;
  const [budget, setBudget] = useState(String(settings.monthly_budget ?? ''));
  const [model, setModel] = useState((settings.model_preference as string) || 'auto');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const newSettings: Record<string, unknown> = {
        monthly_budget: budget ? Number(budget) : null,
        model_preference: model,
      };
      const res = await fetch(`/api/agency/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings }),
      });
      if (res.ok) {
        onSaved(newSettings);
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Monthly Budget (conversations)</label>
        <Input
          type="number"
          min="0"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="No limit"
          className="h-8 w-32 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Model Preference</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="h-8 text-sm border border-gray-200 rounded-md px-2 bg-white text-gray-700 focus:outline-none focus:border-indigo-400"
        >
          {MODEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-1">
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 gap-1">
          <Check className="h-3.5 w-3.5" /> Save
        </Button>
      </div>
    </div>
  );
}

interface BudgetClientProps {
  clients: AgencyClient[];
}

export function BudgetClient({ clients: initialClients }: BudgetClientProps) {
  const [clientSettings, setClientSettings] = useState<Record<string, Record<string, unknown>>>(() => {
    const map: Record<string, Record<string, unknown>> = {};
    for (const c of initialClients) {
      map[c.id] = (c.settings ?? {}) as Record<string, unknown>;
    }
    return map;
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const getSettings = (id: string) => clientSettings[id] ?? {};

  const totalConversations = initialClients.reduce((sum, c) => sum + c.usage_this_month, 0);
  const clientsOverBudget = useMemo(() => {
    return initialClients.filter((c) => {
      const s = getSettings(c.id);
      const budget = s.monthly_budget as number | undefined;
      return budget && budget > 0 && usagePercent(c.usage_this_month, budget) > 80;
    }).length;
  }, [initialClients, clientSettings]); // eslint-disable-line react-hooks/exhaustive-deps
  const clientsWithBudgets = useMemo(() => {
    return initialClients.filter((c) => {
      const s = getSettings(c.id);
      return (s.monthly_budget as number) > 0;
    }).length;
  }, [initialClients, clientSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = [
    { label: 'Total Conversations', value: totalConversations, icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
    { label: 'Over 80% Budget', value: clientsOverBudget, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'Budgets Configured', value: clientsWithBudgets, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="h-6 w-6 text-indigo-500" />
          Token Budget
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Set monthly limits per client and track spend
        </p>
      </div>

      {/* Info callout */}
      <div className="mb-6 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          Usage counts represent conversations this month. Exact token tracking coming soon.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      {initialClients.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-400">No clients yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left border-b border-gray-200">
                  <th className="p-4 font-medium">Client</th>
                  <th className="p-4 font-medium">Usage</th>
                  <th className="p-4 font-medium">Budget</th>
                  <th className="p-4 font-medium min-w-[120px]">Usage Bar</th>
                  <th className="p-4 font-medium">Model</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialClients.map((client) => {
                  const settings = getSettings(client.id);
                  const budget = settings.monthly_budget as number | undefined;
                  const pct = usagePercent(client.usage_this_month, budget);
                  const modelInfo = getModelLabel(settings.model_preference as string | undefined);
                  const isEditing = editingId === client.id;

                  return (
                    <tr key={client.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors align-top">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-700 shrink-0">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{client.name}</p>
                            <p className="text-[10px] text-gray-400">{client.industry || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-700">
                        {client.usage_this_month.toLocaleString()}
                      </td>
                      <td className="p-4 text-gray-700">
                        {budget ? (
                          <span>{client.usage_this_month} / {budget}</span>
                        ) : (
                          <span className="text-gray-400">No limit</span>
                        )}
                      </td>
                      <td className="p-4">
                        {budget ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${usageBarColor(pct)}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge className={modelInfo.badge}>{modelInfo.label}</Badge>
                      </td>
                      <td className="p-4 text-right">
                        {isEditing ? (
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingId(client.id)}
                            className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 ml-auto"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Inline editor panel */}
          {editingId && (
            <div className="border-t border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500 mb-3">
                Editing: {initialClients.find(c => c.id === editingId)?.name}
              </p>
              <InlineEditor
                client={initialClients.find(c => c.id === editingId)!}
                onSaved={(newSettings) => {
                  setClientSettings(prev => ({
                    ...prev,
                    [editingId]: { ...prev[editingId], ...newSettings },
                  }));
                  setEditingId(null);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
