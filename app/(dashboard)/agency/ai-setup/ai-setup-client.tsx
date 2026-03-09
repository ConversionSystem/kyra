'use client';

// ============================================================================
// AI Templates — Unified Template Gallery
//
// Single place to browse and apply AI templates to client containers.
// Templates fall into two categories:
//   1. By Role  — what kind of job does the AI do (sales, support, intake, etc.)
//   2. By Industry — pre-built personas for specific verticals (plumbing, dental, etc.)
//
// Flow: Browse → "Apply" → pick client → fill variables → one API call deploys it live
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles, Search, Target, Shield, Smartphone, Phone, ClipboardList,
  MessageCircle, BarChart3, ArrowRight, CheckCircle2, Loader2, X,
  ChevronDown, User, Building2, Info, AlertTriangle, Star, ExternalLink,
  Zap,
} from 'lucide-react';
import { SectionNav } from '@/components/dashboard/section-nav';
import QuickAnswersEditor from '@/components/dashboard/quick-answers-editor';

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = 'all' | 'role' | 'industry' | 'premium';

interface TemplateCard {
  id: string;
  type: 'role' | 'industry';
  emoji: string;
  name: string;
  description: string;
  industry?: string;
  tags: string[];
  variableCount?: number;
  variables?: Array<{ key: string; label: string; placeholder: string; required: boolean }>;
}

interface Client {
  id: string;
  name: string;
  status: string;
  gateway_status?: string;
}

// ── Role Definitions ──────────────────────────────────────────────────────────

const ROLE_TEMPLATES: TemplateCard[] = [
  {
    id: 'researcher', type: 'role', emoji: '🔍', name: 'Researcher',
    description: 'Monitors trends, compiles reports, surfaces actionable insights daily.',
    tags: ['research', 'reports', 'analysis'],
    variables: [{ key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false }],
  },
  {
    id: 'sales-qualifier', type: 'role', emoji: '🎯', name: 'Sales Qualifier',
    description: 'Qualifies inbound leads, scores urgency, and books meetings automatically.',
    tags: ['leads', 'booking', 'qualification'],
    variables: [{ key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false }],
  },
  {
    id: 'brand-voice', type: 'role', emoji: '🛡️', name: 'Brand Voice Guard',
    description: 'Reviews content, flags off-brand language, suggests on-brand alternatives.',
    tags: ['content', 'branding', 'review'],
    variables: [{ key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false }],
  },
  {
    id: 'social-scout', type: 'role', emoji: '📱', name: 'Social Scout',
    description: 'Tracks social mentions, competitor activity, and trending topics.',
    tags: ['social', 'monitoring', 'competitors'],
    variables: [{ key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false }],
  },
  {
    id: 'appointment-setter', type: 'role', emoji: '📞', name: 'Appointment Setter',
    description: 'Books calls, sends reminders, handles reschedules with zero friction.',
    tags: ['scheduling', 'calendar', 'reminders'],
    variables: [{ key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false }],
  },
  {
    id: 'intake-specialist', type: 'role', emoji: '📋', name: 'Intake Specialist',
    description: 'Collects client info, fills intake forms, routes to the right team member.',
    tags: ['intake', 'onboarding', 'forms'],
    variables: [{ key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false }],
  },
  {
    id: 'community-manager', type: 'role', emoji: '💬', name: 'Community Manager',
    description: 'Answers FAQs, maintains brand tone, escalates complex issues to humans.',
    tags: ['community', 'support', 'FAQ'],
    variables: [{ key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false }],
  },
  {
    id: 'weekly-reporter', type: 'role', emoji: '📊', name: 'Weekly Reporter',
    description: 'Compiles weekly business activity into a clear, actionable summary report.',
    tags: ['reports', 'analytics', 'weekly'],
    variables: [{ key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false }],
  },
];

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  agencyId: string;
  businessName: string;
  clientId?: string | null;
}

export function AISetupClient({ agencyId, businessName, clientId }: Props) {
  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');
  const [industryTemplates, setIndustryTemplates] = useState<TemplateCard[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Apply modal state
  const [applyTemplate, setApplyTemplate] = useState<TemplateCard | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{
    success: boolean;
    message: string;
    warning?: string;
    containerPushed?: boolean;
  } | null>(null);

  // Load industry templates from API
  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.ok ? r.json() : { templates: [] })
      .then(d => {
        const mapped: TemplateCard[] = (d.templates || []).map((t: {
          id: string; name: string; industry: string; emoji: string;
          description: string; tags: string[]; variableCount: number;
        }) => ({
          id: t.id,
          type: 'industry' as const,
          emoji: t.emoji,
          name: t.name,
          description: t.description,
          industry: t.industry,
          tags: t.tags || [],
          variableCount: t.variableCount,
        }));
        setIndustryTemplates(mapped);
      })
      .catch(() => {})
      .finally(() => setLoadingTemplates(false));
  }, []);

  // Load clients
  useEffect(() => {
    fetch('/api/agency/clients')
      .then(r => r.json())
      .then(d => {
        const list = (d.clients || []).filter((c: Client) =>
          c.status === 'active' || c.status === 'setup'
        );
        setClients(list);
        if (list.length === 1) setSelectedClient(list[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingClients(false));
  }, []);

  // Build full template list
  const allTemplates: TemplateCard[] = [
    ...ROLE_TEMPLATES,
    ...industryTemplates,
  ];

  // Filter
  const filtered = allTemplates.filter(t => {
    if (category === 'role' && t.type !== 'role') return false;
    if (category === 'industry' && t.type !== 'industry') return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.industry?.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Open apply modal
  const openApply = useCallback(async (template: TemplateCard) => {
    setApplyTemplate(template);
    setApplyResult(null);

    // Pre-load industry template variables if needed
    if (template.type === 'industry' && !template.variables) {
      try {
        const res = await fetch(`/api/templates?id=${template.id}`);
        const data = await res.json();
        if (data.template?.variables) {
          setIndustryTemplates(prev => prev.map(t =>
            t.id === template.id ? { ...t, variables: data.template.variables } : t
          ));
          setApplyTemplate(prev => prev ? { ...prev, variables: data.template.variables } : prev);
        }
      } catch { /* ignore */ }
    }

    // Init variables with business name if available
    const initVars: Record<string, string> = {};
    if (businessName) initVars.business_name = businessName;
    setVariables(initVars);
  }, [businessName]);

  const closeApply = () => {
    setApplyTemplate(null);
    setApplyResult(null);
    setVariables({});
  };

  const handleApply = async () => {
    if (!applyTemplate || !selectedClient) return;

    setApplying(true);
    setApplyResult(null);

    try {
      const res = await fetch('/api/agency/ai-setup/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient,
          type: applyTemplate.type,
          templateId: applyTemplate.id,
          variables,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApplyResult({ success: false, message: data.error || 'Failed to apply template' });
      } else {
        const clientName = clients.find(c => c.id === selectedClient)?.name || 'client';
        setApplyResult({
          success: true,
          message: `${applyTemplate.name} applied to ${clientName}.${data.containerPushed ? ' AI is live now.' : ''}`,
          warning: data.warning,
          containerPushed: data.containerPushed,
        });
      }
    } catch {
      setApplyResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setApplying(false);
    }
  };

  const roleCnt = ROLE_TEMPLATES.length;
  const industryCnt = industryTemplates.length;

  return (
    <div className="space-y-0">
    <SectionNav currentHref="/agency/ai-setup" />
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-600" />
          AI Templates
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Pick a template → choose which client to configure → it deploys instantly to their AI worker.
        </p>
      </div>

      {/* How it works banner */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-700">
          <strong>How it works:</strong> Click &quot;Apply&quot; on any template, select which client&apos;s AI worker to configure,
          fill in the details, and hit Apply. The AI&apos;s personality updates live on the container — no redeploy needed.
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Category pills */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {([
            { key: 'all' as Category, label: 'All', count: allTemplates.length },
            { key: 'role' as Category, label: '👤 By Role', count: roleCnt },
            { key: 'industry' as Category, label: '🏭 By Industry', count: industryCnt },
            { key: 'premium' as Category, label: '⭐ Premium', count: null },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                category === key
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {count !== null && count > 0 && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  category === key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Premium Templates tab — full-page embed ── */}
      {category === 'premium' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 sm:p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Star className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Premium Templates</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Specialized AI workers with everything included — LLM costs, industry tools, and infrastructure at a flat monthly rate per client.
                Free templates are in the By Role and By Industry tabs above.
              </p>
            </div>
          </div>
          {/* Inline iframe-free embed — redirect to premium templates page */}
          <a
            href="/agency/templates"
            className="flex items-center justify-between w-full bg-white border border-amber-200 rounded-xl px-5 py-4 hover:border-amber-400 hover:shadow-sm transition group"
          >
            <div>
              <p className="font-semibold text-gray-900 text-sm">Browse Premium Templates →</p>
              <p className="text-xs text-gray-500 mt-0.5">Vet SEO Worker, Cannabis AI, and more industry specialists</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-amber-500 transition" />
          </a>
        </div>
      )}

      {/* Template Grid — only shown when not on Premium tab */}
      {category !== 'premium' && loadingTemplates ? (
        <div className="py-16 text-center text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading templates...
        </div>
      ) : category !== 'premium' && filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No templates match your search</p>
        </div>
      ) : category !== 'premium' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(template => (
            <TemplateCardView
              key={`${template.type}:${template.id}`}
              template={template}
              onApply={() => openApply(template)}
            />
          ))}
        </div>
      ) : null}

      {/* No clients warning */}
      {!loadingClients && clients.length === 0 && (
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700">
            <strong>No active clients yet.</strong> You need to create a client first before applying a template.{' '}
            <Link href="/agency/clients/new" className="underline font-medium">Create your first client →</Link>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {applyTemplate && (
        <ApplyModal
          template={applyTemplate}
          clients={clients}
          selectedClient={selectedClient}
          setSelectedClient={setSelectedClient}
          variables={variables}
          setVariables={setVariables}
          applying={applying}
          result={applyResult}
          onApply={handleApply}
          onClose={closeApply}
        />
      )}
      {/* ── Business Info — zero-cost instant answers ── */}
      <div className="mt-10 pt-8 border-t border-gray-200">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Business Info</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              <strong>Different from templates above.</strong> These aren&apos;t AI responses —
              they&apos;re hardcoded facts your AI returns <em>instantly</em> at <strong>zero
              credits</strong>, before any AI model is called. Your hours, address, pricing, FAQs.
            </p>
          </div>
        </div>

        {clientId ? (
          <QuickAnswersEditor clientId={clientId} />
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
            <Zap className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-500">No active AI worker yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Apply a template above to activate your AI worker, then come back to add Business Info.
            </p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

// ── Template Card ─────────────────────────────────────────────────────────────

function TemplateCardView({
  template,
  onApply,
}: {
  template: TemplateCard;
  onApply: () => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-200 hover:shadow-sm transition-all flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{template.emoji}</span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
          template.type === 'role'
            ? 'bg-indigo-50 text-indigo-600'
            : 'bg-emerald-50 text-emerald-600'
        }`}>
          {template.type === 'role' ? '👤 Role' : `🏭 ${template.industry}`}
        </span>
      </div>

      {/* Content */}
      <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
      <p className="text-xs text-gray-500 mb-3 flex-1 line-clamp-2">{template.description}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {template.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">
            {tag}
          </span>
        ))}
      </div>

      {/* Action */}
      <button
        onClick={onApply}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Apply to Client
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Apply Modal ───────────────────────────────────────────────────────────────

function ApplyModal({
  template,
  clients,
  selectedClient,
  setSelectedClient,
  variables,
  setVariables,
  applying,
  result,
  onApply,
  onClose,
}: {
  template: TemplateCard;
  clients: Client[];
  selectedClient: string;
  setSelectedClient: (id: string) => void;
  variables: Record<string, string>;
  setVariables: (v: Record<string, string>) => void;
  applying: boolean;
  result: { success: boolean; message: string; warning?: string; containerPushed?: boolean } | null;
  onApply: () => void;
  onClose: () => void;
}) {
  const setVar = (key: string, value: string) =>
    setVariables({ ...variables, [key]: value });

  const selectedClientData = clients.find(c => c.id === selectedClient);
  const canApply = !!selectedClient && !applying;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!applying ? onClose : undefined} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{template.emoji}</span>
            <div>
              <h2 className="font-semibold text-gray-900">Apply: {template.name}</h2>
              <p className="text-xs text-gray-500">{template.description}</p>
            </div>
          </div>
          {!applying && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Success / Error result */}
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

          {/* Client picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="inline h-4 w-4 mr-1 text-gray-400" />
              Which client gets this AI?
            </label>
            {clients.length === 0 ? (
              <div className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
                No active clients found.{' '}
                <Link href="/agency/clients/new" className="underline">Create one first →</Link>
              </div>
            ) : clients.length === 1 ? (
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 border">
                <span className="text-xl">🤖</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{clients[0].name}</p>
                  <p className="text-xs text-gray-400">
                    {clients[0].gateway_status === 'running' ? '🟢 Running — changes apply instantly' : '⚪ Offline — changes saved for next start'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedClient}
                  onChange={e => setSelectedClient(e.target.value)}
                  className="w-full pl-4 pr-8 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none bg-white"
                >
                  <option value="">— Select a client —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.gateway_status === 'running' ? ' (live)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            )}
            {selectedClientData && clients.length > 1 && (
              <p className="text-xs text-gray-400 mt-1.5">
                {selectedClientData.gateway_status === 'running'
                  ? '🟢 Container is running — changes will apply instantly'
                  : '⚪ Container offline — config saved, applies on next start'}
              </p>
            )}
          </div>

          {/* Variables */}
          {template.variables && template.variables.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium">Configure</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              {template.variables.map(v => (
                <div key={v.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {v.label}
                    {v.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <input
                    type="text"
                    value={variables[v.key] || ''}
                    onChange={e => setVar(v.key, e.target.value)}
                    placeholder={v.placeholder}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Industry template variable loader (show a note + load variables) */}
          {template.type === 'industry' && !template.variables && (
            <div className="text-center py-4 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1" />
              <p className="text-xs">Loading template fields...</p>
            </div>
          )}

          {/* Apply / Close buttons */}
          <div className="flex gap-3 pt-2">
            {result?.success ? (
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                Done ✓
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
                  disabled={!canApply || !selectedClient}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {applying ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Applying...</>
                  ) : (
                    <>Apply Now <ArrowRight className="h-4 w-4" /></>
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
