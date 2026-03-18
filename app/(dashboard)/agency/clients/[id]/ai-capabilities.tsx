'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Globe, Image, FileText, Brain, Zap,
  Loader2, RefreshCw, Lock, CheckCircle2, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Tool definitions ──────────────────────────────────────────────────────────

interface ToolDef {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  example: string;
  plan: 'all' | 'pro' | 'scale';
  color: string;
  iconBg: string;
  skillId: string;   // maps to OpenClaw skill / config key
}

const TOOLS: ToolDef[] = [
  {
    id: 'web_search',
    name: 'Web Search',
    icon: <Search className="h-5 w-5" />,
    description: 'AI can search the web to answer questions with up-to-date information.',
    example: '"What are your Monday hours?" → AI checks their website if unsure.',
    plan: 'all',
    color: 'from-blue-500 to-indigo-600',
    iconBg: 'bg-blue-50 text-blue-600',
    skillId: 'web_search',
  },
  {
    id: 'web_fetch',
    name: 'Browse Websites',
    icon: <Globe className="h-5 w-5" />,
    description: 'AI can read any webpage — menus, pricing pages, booking sites.',
    example: '"Do you have vegan options?" → AI reads the menu page to check.',
    plan: 'all',
    color: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-50 text-violet-600',
    skillId: 'web_fetch',
  },
  {
    id: 'image_analysis',
    name: 'Image Understanding',
    icon: <Image className="h-5 w-5" />,
    description: 'AI can look at photos customers send — products, receipts, documents.',
    example: '"Here\'s a photo of my issue" → AI analyzes and responds.',
    plan: 'pro',
    color: 'from-pink-500 to-rose-500',
    iconBg: 'bg-pink-50 text-pink-600',
    skillId: 'image_analysis',
  },
  {
    id: 'file_processing',
    name: 'File Processing',
    icon: <FileText className="h-5 w-5" />,
    description: 'AI can read PDFs, Word docs, and text files customers share.',
    example: '"Here\'s my insurance form" → AI extracts key info from the PDF.',
    plan: 'pro',
    color: 'from-amber-500 to-orange-500',
    iconBg: 'bg-amber-50 text-amber-600',
    skillId: 'file_processing',
  },
  {
    id: 'customer_memory',
    name: 'Customer Memory',
    icon: <Brain className="h-5 w-5" />,
    description: 'AI remembers each customer — their preferences, history, and facts.',
    example: '"You mentioned last time you prefer mornings" — AI recalls.',
    plan: 'all',
    color: 'from-indigo-500 to-violet-600',
    iconBg: 'bg-indigo-50 text-indigo-600',
    skillId: 'customer_memory',
  },
  {
    id: 'proactive',
    name: 'Proactive Outreach',
    icon: <Zap className="h-5 w-5" />,
    description: 'AI initiates conversations — reminders, follow-ups, reports — on a schedule.',
    example: 'AI sends appointment reminder at 9am without being asked.',
    plan: 'pro',
    color: 'from-emerald-500 to-green-600',
    iconBg: 'bg-emerald-50 text-emerald-600',
    skillId: 'proactive',
  },
];

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  all:   { label: 'All Plans',  color: 'bg-gray-100 text-gray-600' },
  pro:   { label: 'Pro+',       color: 'bg-indigo-100 text-indigo-700' },
  scale: { label: 'Scale',      color: 'bg-purple-100 text-purple-700' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function AICapabilities({ clientId }: { clientId: string }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/capabilities`);
      if (res.ok) {
        const d = await res.json();
        setEnabled(d.capabilities || {});
      }
    } catch (err) {
      console.error('[ai-capabilities] Failed to load:', err);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (toolId: string) => {
    const next = !enabled[toolId];
    setEnabled(prev => ({ ...prev, [toolId]: next }));
    setSaving(toolId);
    setError(null);

    try {
      const res = await fetch(`/api/agency/clients/${clientId}/capabilities`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId, enabled: next }),
      });
      if (!res.ok) {
        // Rollback
        setEnabled(prev => ({ ...prev, [toolId]: !next }));
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Failed to update capability');
      }
    } catch {
      setEnabled(prev => ({ ...prev, [toolId]: !next }));
      setError('Network error — please try again');
    } finally {
      setSaving(null);
    }
  };

  const enabledCount = Object.values(enabled).filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">AI Capabilities</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Control what your AI worker can do.{' '}
            <span className="font-semibold text-indigo-600">{enabledCount} of {TOOLS.length}</span> active.
          </p>
        </div>
        <button onClick={() => { setLoading(true); load(); }} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── Tools grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TOOLS.map(tool => {
          const isEnabled = !!enabled[tool.id];
          const isSaving = saving === tool.id;
          const planBadge = PLAN_LABELS[tool.plan];

          return (
            <div
              key={tool.id}
              className={cn(
                'relative bg-white rounded-2xl border p-5 transition-all',
                isEnabled ? 'border-indigo-200 shadow-sm' : 'border-gray-200'
              )}
            >
              {/* Plan badge */}
              {tool.plan !== 'all' && (
                <span className={cn('absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1', planBadge.color)}>
                  <Lock className="h-2.5 w-2.5" />
                  {planBadge.label}
                </span>
              )}

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', tool.iconBg)}>
                  {tool.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900">{tool.name}</h3>
                    {isEnabled && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{tool.description}</p>

                  {/* Example */}
                  <div
                    className="mt-2 text-[11px] text-gray-400 italic cursor-pointer hover:text-gray-600 transition-colors flex items-start gap-1"
                    onMouseEnter={() => setTooltip(tool.id)}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <Info className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                    Example: {tooltip === tool.id ? tool.example : tool.example.slice(0, 40) + (tool.example.length > 40 ? '…' : '')}
                  </div>
                </div>
              </div>

              {/* Toggle */}
              <div className="mt-4 flex items-center justify-between">
                <span className={cn('text-xs font-semibold', isEnabled ? 'text-emerald-600' : 'text-gray-400')}>
                  {isEnabled ? '● Active' : '○ Inactive'}
                </span>
                <button
                  onClick={() => toggle(tool.id)}
                  disabled={isSaving}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50',
                    isEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                  )}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin absolute top-0.5 left-0.5" />
                  ) : (
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200',
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Info footer ───────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 text-xs text-indigo-700 leading-relaxed">
        <span className="font-semibold">How it works:</span> When a capability is toggled on, your AI worker
        gains access to that tool in every conversation. Changes take effect after the gateway restarts (~30s).
        Customer Memory and Proactive Outreach are managed separately in their respective tabs.
      </div>
    </div>
  );
}
