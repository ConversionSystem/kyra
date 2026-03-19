'use client';

import { useState, useCallback } from 'react';
import {
  ArrowRight, Loader2, X, ChevronDown, CheckCircle2, AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';
import { ROLE_WORKERS, type RoleWorker } from '@/lib/ai-workers/role-workers';

// ── Channel badge colors ─────────────────────────────────────────────────────

const CHANNEL_STYLES: Record<string, string> = {
  sms: 'bg-green-50 text-green-700 border-green-200',
  voice: 'bg-blue-50 text-blue-700 border-blue-200',
  chat: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  telegram: 'bg-sky-50 text-sky-700 border-sky-200',
};

const CHANNEL_LABELS: Record<string, string> = {
  sms: 'SMS',
  voice: 'Voice',
  chat: 'Chat',
  telegram: 'Telegram',
};

// ── Props ────────────────────────────────────────────────────────────────────

interface AIWorkersTabProps {
  client: AgencyClient;
  agencyId: string;
}

export default function AIWorkersTab({ client, agencyId }: AIWorkersTabProps) {
  const [applyWorker, setApplyWorker] = useState<RoleWorker | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{
    success: boolean;
    message: string;
    warning?: string;
  } | null>(null);
  const [industryExpanded, setIndustryExpanded] = useState(false);
  const [industryTemplates, setIndustryTemplates] = useState<{
    id: string; emoji: string; name: string; description: string; industry: string; tags: string[];
  }[]>([]);
  const [loadingIndustry, setLoadingIndustry] = useState(false);
  const [industryLoaded, setIndustryLoaded] = useState(false);

  // Detect currently active worker from container config
  const cc = (client.container_config as Record<string, unknown>) ?? {};
  const activeWorkerId = cc.active_worker_id as string | undefined;
  const activeWorker = activeWorkerId
    ? ROLE_WORKERS.find(w => w.id === activeWorkerId)
    : undefined;

  const openApply = useCallback((worker: RoleWorker) => {
    setApplyWorker(worker);
    setApplyResult(null);
    const initVars: Record<string, string> = {};
    if (client.name) initVars.business_name = client.name;
    setVariables(initVars);
  }, [client.name]);

  const closeApply = () => {
    setApplyWorker(null);
    setApplyResult(null);
    setVariables({});
  };

  const handleApply = async () => {
    if (!applyWorker) return;
    setApplying(true);
    setApplyResult(null);

    try {
      const res = await fetch('/api/agency/ai-setup/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          type: 'role',
          templateId: applyWorker.id,
          variables,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApplyResult({ success: false, message: data.error || 'Failed to apply worker' });
      } else {
        setApplyResult({
          success: true,
          message: `${applyWorker.name} applied to ${client.name}.${data.containerPushed ? ' AI is live now.' : ''}`,
          warning: data.warning,
        });
      }
    } catch {
      setApplyResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setApplying(false);
    }
  };

  const loadIndustryTemplates = async () => {
    if (industryLoaded) { setIndustryExpanded(e => !e); return; }
    setIndustryExpanded(true);
    setLoadingIndustry(true);
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setIndustryTemplates(data.templates || []);
      setIndustryLoaded(true);
    } catch { /* ignore */ }
    finally { setLoadingIndustry(false); }
  };

  return (
    <div className="space-y-6">
      {/* Currently Active Worker */}
      {activeWorker && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{activeWorker.emoji}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Currently Active:</span>
                <span className="text-sm font-bold text-green-700">{activeWorker.name}</span>
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Live</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{activeWorker.roleBadge}</p>
            </div>
          </div>
        </div>
      )}

      {/* Section header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">AI Workers</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Pre-built AI roles you can deploy to this client in one click.
        </p>
      </div>

      {/* Worker cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {ROLE_WORKERS.map(worker => (
          <WorkerCard
            key={worker.id}
            worker={worker}
            isActive={activeWorkerId === worker.id}
            onApply={() => openApply(worker)}
          />
        ))}
      </div>

      {/* Industry Workers — collapsible */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={loadIndustryTemplates}
          className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🏭</span>
            <span className="text-sm font-semibold text-gray-900">Industry Workers</span>
            {industryLoaded && (
              <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                {industryTemplates.length}
              </span>
            )}
          </div>
          <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${industryExpanded ? 'rotate-90' : ''}`} />
        </button>

        {industryExpanded && (
          <div className="p-4">
            {loadingIndustry ? (
              <div className="py-8 text-center text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1" />
                <p className="text-xs">Loading industry workers...</p>
              </div>
            ) : industryTemplates.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No industry workers available yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {industryTemplates.map(t => (
                  <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all">
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-2xl">{t.emoji}</span>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{t.name}</h4>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full">
                          {t.industry}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{t.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply slide-over modal */}
      {applyWorker && (
        <ApplyPanel
          worker={applyWorker}
          variables={variables}
          setVariables={setVariables}
          applying={applying}
          result={applyResult}
          onApply={handleApply}
          onClose={closeApply}
        />
      )}
    </div>
  );
}

// ── Rich Worker Card ─────────────────────────────────────────────────────────

function WorkerCard({
  worker,
  isActive,
  onApply,
}: {
  worker: RoleWorker;
  isActive: boolean;
  onApply: () => void;
}) {
  return (
    <div className={`bg-white border rounded-xl p-5 transition-all hover:shadow-sm ${
      isActive ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-200 hover:border-indigo-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{worker.emoji}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{worker.name}</h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
              {worker.roleBadge}
            </span>
          </div>
        </div>
        {isActive && (
          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            Active
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{worker.description}</p>

      {/* What this worker does */}
      <div className="mb-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">What this worker does</p>
        <ul className="space-y-1">
          {worker.whatItDoes.map((item, i) => (
            <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-indigo-400 shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Channels */}
      <div className="mb-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Works on</p>
        <div className="flex flex-wrap gap-1.5">
          {worker.channels.map(ch => (
            <span key={ch} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${CHANNEL_STYLES[ch]}`}>
              {CHANNEL_LABELS[ch]}
            </span>
          ))}
        </div>
      </div>

      {/* Tools */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Tools used</p>
        <div className="flex flex-wrap gap-1.5">
          {worker.tools.map(tool => (
            <span key={tool} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
              {tool}
            </span>
          ))}
        </div>
      </div>

      {/* Apply button */}
      <button
        onClick={onApply}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Apply to this client
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Apply Panel (slide-in modal) ─────────────────────────────────────────────

function ApplyPanel({
  worker,
  variables,
  setVariables,
  applying,
  result,
  onApply,
  onClose,
}: {
  worker: RoleWorker;
  variables: Record<string, string>;
  setVariables: (v: Record<string, string>) => void;
  applying: boolean;
  result: { success: boolean; message: string; warning?: string } | null;
  onApply: () => void;
  onClose: () => void;
}) {
  const setVar = (key: string, value: string) =>
    setVariables({ ...variables, [key]: value });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!applying ? onClose : undefined} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{worker.emoji}</span>
            <div>
              <h2 className="font-semibold text-gray-900">Deploy: {worker.name}</h2>
              <p className="text-xs text-gray-500">{worker.roleBadge}</p>
            </div>
          </div>
          {!applying && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Result */}
          {result && (
            <div className={`rounded-xl p-4 flex gap-3 ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.message}
                </p>
                {result.warning && (
                  <p className="text-xs text-amber-600 mt-1">{result.warning}</p>
                )}
              </div>
            </div>
          )}

          {/* Variables */}
          {worker.variables && worker.variables.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium">Configure</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              {worker.variables.map(v => (
                <div key={v.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {v.label}
                    {v.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {v.type === 'textarea' ? (
                    <textarea
                      value={variables[v.key] || ''}
                      onChange={e => setVar(v.key, e.target.value)}
                      placeholder={v.placeholder}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y"
                    />
                  ) : v.type === 'select' && v.options ? (
                    <div className="relative">
                      <select
                        value={variables[v.key] || ''}
                        onChange={e => setVar(v.key, e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none bg-white"
                      >
                        <option value="">{v.placeholder || '— Select —'}</option>
                        {v.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={variables[v.key] || ''}
                      onChange={e => setVar(v.key, e.target.value)}
                      placeholder={v.placeholder}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            {result?.success ? (
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  disabled={applying}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onApply}
                  disabled={applying}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {applying ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Deploying...</>
                  ) : (
                    <>Deploy Worker <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
