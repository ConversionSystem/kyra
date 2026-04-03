'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Plus,
  Play,
  Pause,
  Trash2,
  Clock,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  ArrowRight,
  LayoutTemplate,
  History,
  MessageSquare,
  Mail,
  Brain,
  AlertTriangle,
  Tag,
  Webhook,
  ListTodo,
  GitBranch,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgencyClient } from '@/lib/agency/queries';
import type {
  Workflow,
  WorkflowRun,
  WorkflowStep,
  WorkflowTrigger,
  WorkflowTemplate,
} from '@/lib/automations/workflow-types';
import { triggerLabel, stepLabel } from '@/lib/automations/workflow-types';

// ── Step Icon Map ────────────────────────────────────────────────────────────

function StepIcon({ type, className }: { type: string; className?: string }) {
  const cls = className || 'h-3.5 w-3.5';
  switch (type) {
    case 'wait': return <Clock className={cls} />;
    case 'send_sms': return <MessageSquare className={cls} />;
    case 'send_email': return <Mail className={cls} />;
    case 'ai_respond': return <Brain className={cls} />;
    case 'escalate': return <AlertTriangle className={cls} />;
    case 'add_tag': return <Tag className={cls} />;
    case 'move_deal': return <ArrowRight className={cls} />;
    case 'create_task': return <ListTodo className={cls} />;
    case 'webhook': return <Webhook className={cls} />;
    case 'condition': return <GitBranch className={cls} />;
    default: return <Zap className={cls} />;
  }
}

// ── Step Color Map ───────────────────────────────────────────────────────────

function stepColor(type: string): { bg: string; text: string; border: string } {
  switch (type) {
    case 'wait': return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
    case 'send_sms': return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
    case 'send_email': return { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' };
    case 'ai_respond': return { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' };
    case 'escalate': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' };
    case 'add_tag': return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' };
    case 'move_deal': return { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' };
    case 'create_task': return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' };
    case 'webhook': return { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' };
    case 'condition': return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' };
    default: return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
  }
}

// ── Workflow Step Timeline ───────────────────────────────────────────────────

function StepTimeline({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const colors = stepColor(step.type);
        return (
          <div key={i} className="flex items-start gap-2.5">
            {/* Timeline dot + line */}
            <div className="flex flex-col items-center pt-1">
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center', colors.bg, colors.text)}>
                <StepIcon type={step.type} className="h-3 w-3" />
              </div>
              {i < steps.length - 1 && (
                <div className="w-px h-4 bg-gray-200 mt-1" />
              )}
            </div>
            {/* Step content */}
            <div className={cn('flex-1 rounded-lg border px-3 py-2', colors.border, colors.bg)}>
              <span className={cn('text-xs font-semibold', colors.text)}>
                {stepLabel(step)}
              </span>
              {/* Nested condition steps */}
              {step.type === 'condition' && step.then && (
                <div className="mt-2 ml-2 pl-2 border-l-2 border-purple-200">
                  <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider">Then:</span>
                  <StepTimeline steps={step.then} />
                </div>
              )}
              {step.type === 'condition' && step.else && (
                <div className="mt-2 ml-2 pl-2 border-l-2 border-gray-300">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Else:</span>
                  <StepTimeline steps={step.else} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Run History ──────────────────────────────────────────────────────────────

function RunStatusBadge({ status }: { status: WorkflowRun['status'] }) {
  const config = {
    pending: { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="h-2.5 w-2.5" /> },
    running: { bg: 'bg-blue-50', text: 'text-blue-600', icon: <Loader2 className="h-2.5 w-2.5 animate-spin" /> },
    completed: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: <CheckCircle2 className="h-2.5 w-2.5" /> },
    failed: { bg: 'bg-red-50', text: 'text-red-600', icon: <XCircle className="h-2.5 w-2.5" /> },
  };
  const c = config[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', c.bg, c.text)}>
      {c.icon} {status}
    </span>
  );
}

function RunHistory({ workflowId, clientId }: { workflowId: string; clientId: string }) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/agency/clients/${clientId}/workflows/${workflowId}/runs?limit=10`);
        if (res.ok) {
          const d = await res.json();
          setRuns(d.runs || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [workflowId, clientId]);

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-gray-400 mx-auto my-4" />;

  if (!runs.length) {
    return (
      <p className="text-xs text-gray-400 text-center py-4">No runs yet. Activate this workflow to start.</p>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map(run => (
        <div key={run.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
          <RunStatusBadge status={run.status} />
          <span className="text-xs text-gray-500 flex-1">
            {new Date(run.started_at).toLocaleString()}
          </span>
          {run.error && (
            <span className="text-[10px] text-red-500 truncate max-w-[200px]" title={run.error}>
              {run.error}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface WorkflowsTabProps {
  client: AgencyClient;
}

export default function WorkflowsTab({ client }: WorkflowsTabProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [createTab, setCreateTab] = useState<'ai' | 'templates'>('ai');
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<{
    name: string;
    description: string;
    trigger: WorkflowTrigger;
    steps: WorkflowStep[];
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // Expanded workflow
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showRuns, setShowRuns] = useState<string | null>(null);

  const clientId = client.id;

  // ── Load ────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const [wfRes, tplRes] = await Promise.all([
        fetch(`/api/agency/clients/${clientId}/workflows`),
        fetch(`/api/agency/clients/${clientId}/workflows/templates`),
      ]);
      if (wfRes.ok) {
        const d = await wfRes.json();
        setWorkflows(d.workflows || []);
      }
      if (tplRes.ok) {
        const d = await tplRes.json();
        setTemplates(d.templates || []);
      }
    } catch {
      setError('Failed to load workflows');
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // ── AI Generate ─────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!aiPrompt.trim() || aiPrompt.trim().length < 10) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/workflows/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: aiPrompt.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to generate');
      setPreview(d.workflow);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate workflow');
    }
    setGenerating(false);
  };

  // ── Save workflow ───────────────────────────────────────────────────────

  const handleSave = async (wf: { name: string; description: string; trigger: WorkflowTrigger; steps: WorkflowStep[] }, status: 'draft' | 'active' = 'draft') => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...wf, status }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to save');
      setWorkflows(prev => [d.workflow, ...prev]);
      setShowCreate(false);
      setPreview(null);
      setAiPrompt('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    }
    setSaving(false);
  };

  // ── Toggle status ───────────────────────────────────────────────────────

  const handleToggle = async (workflow: Workflow) => {
    const newStatus = workflow.status === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/workflows/${workflow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setWorkflows(prev => prev.map(w => w.id === workflow.id ? { ...w, status: newStatus } : w));
      }
    } catch { /* ignore */ }
  };

  // ── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/workflows/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setWorkflows(prev => prev.filter(w => w.id !== id));
      }
    } catch { /* ignore */ }
  };

  // ── Use template ────────────────────────────────────────────────────────

  const handleUseTemplate = (tpl: WorkflowTemplate) => {
    setPreview({
      name: tpl.name,
      description: tpl.description,
      trigger: tpl.trigger,
      steps: tpl.steps,
    });
    setCreateTab('ai'); // switch to show the preview
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-gray-900">AI Workflows</h2>
          </div>
          <p className="text-sm text-gray-500">
            Describe what you want automated — the AI builds the workflow for you.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setLoading(true); load(); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={() => { setShowCreate(true); setPreview(null); setAiPrompt(''); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New Workflow
          </button>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="text-amber-500 hover:text-amber-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Create Modal ──────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {preview ? '✨ Review Workflow' : 'Create Workflow'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {preview ? 'Review the AI-generated workflow before saving' : 'Describe it in plain English or pick a template'}
                </p>
              </div>
              <button onClick={() => { setShowCreate(false); setPreview(null); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Preview mode */}
            {preview ? (
              <div className="p-6 space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{preview.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{preview.description}</p>
                </div>

                {/* Trigger */}
                <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3">
                  <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Trigger</span>
                  <p className="text-sm font-semibold text-indigo-700 mt-1 flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5" />
                    {triggerLabel(preview.trigger)}
                  </p>
                </div>

                {/* Steps */}
                <div>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Steps</span>
                  <StepTimeline steps={preview.steps} />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setPreview(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => handleSave(preview, 'draft')}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 disabled:opacity-50"
                  >
                    Save as Draft
                  </button>
                  <button
                    onClick={() => handleSave(preview, 'active')}
                    disabled={saving}
                    className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Activate
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="px-6 pt-4">
                  <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                    <button
                      onClick={() => setCreateTab('ai')}
                      className={cn('flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5', createTab === 'ai' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
                    >
                      <Sparkles className="h-3 w-3" /> AI Generate
                    </button>
                    <button
                      onClick={() => setCreateTab('templates')}
                      className={cn('flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5', createTab === 'templates' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
                    >
                      <LayoutTemplate className="h-3 w-3" /> Templates
                    </button>
                  </div>
                </div>

                {/* AI tab */}
                {createTab === 'ai' && (
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Describe what you want to automate
                      </label>
                      <textarea
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        rows={4}
                        placeholder="e.g., When a new lead comes in, wait 5 minutes, then send a welcome text, and follow up in 2 days if they don't reply..."
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none leading-relaxed"
                      />
                      <p className="text-xs text-gray-400 mt-1.5">
                        Write in plain English. The AI will figure out the triggers, timing, and actions.
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleGenerate}
                        disabled={generating || aiPrompt.trim().length < 10}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                      >
                        {generating ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</>
                        ) : (
                          <><Sparkles className="h-3.5 w-3.5" /> Generate Workflow</>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Templates tab */}
                {createTab === 'templates' && (
                  <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                    {templates.map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => handleUseTemplate(tpl)}
                        className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/30 text-left transition-all group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-900">{tpl.name}</span>
                            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{tpl.category}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{tpl.description}</p>
                          <div className="mt-2 flex items-center gap-1 text-[11px] text-gray-400">
                            {tpl.steps.length} step{tpl.steps.length !== 1 ? 's' : ''} · {triggerLabel(tpl.trigger)}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 shrink-0 mt-1 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Workflows List ────────────────────────────────────────────── */}
      {workflows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Workflows
            </h3>
            <span className="text-xs text-gray-400">
              {workflows.filter(w => w.status === 'active').length}/{workflows.length} active
            </span>
          </div>

          {workflows.map(wf => {
            const isExpanded = expanded === wf.id;
            return (
              <div
                key={wf.id}
                className={cn(
                  'rounded-2xl border bg-white transition-all',
                  wf.status === 'active' ? 'border-indigo-200 shadow-sm' : 'border-gray-200',
                  wf.status === 'paused' && 'opacity-70',
                )}
              >
                {/* Header row */}
                <div className="flex items-center gap-3 p-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    wf.status === 'active' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'
                  )}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">{wf.name}</span>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full',
                        wf.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                        wf.status === 'paused' ? 'bg-gray-100 text-gray-500' :
                        'bg-amber-50 text-amber-600'
                      )}>
                        {wf.status === 'active' ? '● Active' : wf.status === 'paused' ? '⏸ Paused' : '📝 Draft'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                      <Zap className="h-2.5 w-2.5" />
                      {triggerLabel(wf.trigger)}
                      <span className="text-gray-300">·</span>
                      {(wf.steps as WorkflowStep[]).length} step{(wf.steps as WorkflowStep[]).length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : wf.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleToggle(wf)}
                      title={wf.status === 'active' ? 'Pause' : 'Activate'}
                      className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100"
                    >
                      {wf.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(wf.id)}
                      title="Delete"
                      className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-5 border-t border-gray-100 pt-4 space-y-4">
                    {wf.description && (
                      <p className="text-xs text-gray-500 leading-relaxed">{wf.description}</p>
                    )}

                    {/* Trigger detail */}
                    <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3">
                      <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Trigger</span>
                      <p className="text-sm font-semibold text-indigo-700 mt-1 flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5" />
                        {triggerLabel(wf.trigger)}
                      </p>
                    </div>

                    {/* Steps */}
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Steps</span>
                      <StepTimeline steps={wf.steps as WorkflowStep[]} />
                    </div>

                    {/* Run History toggle */}
                    <div>
                      <button
                        onClick={() => setShowRuns(showRuns === wf.id ? null : wf.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700"
                      >
                        <History className="h-3 w-3" />
                        {showRuns === wf.id ? 'Hide' : 'Show'} Run History
                      </button>
                      {showRuns === wf.id && (
                        <div className="mt-2">
                          <RunHistory workflowId={wf.id} clientId={clientId} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Empty State ───────────────────────────────────────────────── */}
      {workflows.length === 0 && !showCreate && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-7 w-7 text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            No workflows yet
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            Describe what you want in plain English — the AI builds the automation for you.
            No drag-and-drop, no manual logic. Just tell it what to do.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => { setShowCreate(true); setCreateTab('ai'); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 font-semibold transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Describe a Workflow
            </button>
            <button
              onClick={() => { setShowCreate(true); setCreateTab('templates'); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-semibold transition-colors"
            >
              <LayoutTemplate className="h-4 w-4" />
              Use a Template
            </button>
          </div>
        </div>
      )}

      {/* ── Quick Templates (when workflows exist) ────────────────────── */}
      {workflows.length > 0 && !showCreate && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Add from Template</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.slice(0, 3).map(tpl => (
              <button
                key={tpl.id}
                onClick={() => { setShowCreate(true); handleUseTemplate(tpl); }}
                className="group flex flex-col p-4 bg-white border border-gray-200 rounded-2xl hover:border-indigo-200 hover:shadow-md text-left transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                  <Zap className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">{tpl.name}</h4>
                <p className="text-xs text-gray-500 mt-0.5 flex-1">{tpl.description}</p>
                <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:gap-2 transition-all">
                  Use template <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
