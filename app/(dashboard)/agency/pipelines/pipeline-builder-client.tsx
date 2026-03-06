'use client';

import { useState } from 'react';
import {
  GitBranch, Plus, Trash2, Play, Pause, ChevronDown, ChevronRight,
  Bot, Shield, Zap, Clock, ArrowDown, CheckCircle2, Loader2,
  Sparkles, GripVertical, Settings, Copy, Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionNav } from '@/components/dashboard/section-nav';

// ── Types ──

interface PipelineStep {
  id: string;
  type: 'agent' | 'review_gate' | 'delay' | 'webhook' | 'condition';
  label: string;
  config: Record<string, string>;
}

interface Pipeline {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
  status: 'active' | 'paused' | 'draft';
  created_at: string;
}

const STEP_TYPES = [
  { type: 'agent', label: 'AI Agent', icon: Bot, color: 'bg-indigo-50 border-indigo-200 text-indigo-700', desc: 'Run an AI agent to process, write, or analyze' },
  { type: 'review_gate', label: 'Review Gate', icon: Shield, color: 'bg-amber-50 border-amber-200 text-amber-700', desc: 'Pause for human approval before continuing' },
  { type: 'delay', label: 'Wait', icon: Clock, color: 'bg-blue-50 border-blue-200 text-blue-700', desc: 'Wait a set amount of time before next step' },
  { type: 'webhook', label: 'Webhook', icon: Zap, color: 'bg-green-50 border-green-200 text-green-700', desc: 'Send data to an external URL' },
] as const;

const TEMPLATES: Pipeline[] = [
  {
    id: 'tpl-content',
    name: 'Content Pipeline',
    description: 'Research → Write → Review → Publish',
    status: 'draft',
    created_at: new Date().toISOString(),
    steps: [
      { id: 's1', type: 'agent', label: 'Research trending topics', config: { role: 'Researcher', prompt: 'Find 5 trending topics in my industry' } },
      { id: 's2', type: 'agent', label: 'Write post drafts', config: { role: 'Writer', prompt: 'Turn each topic into a LinkedIn post' } },
      { id: 's3', type: 'review_gate', label: 'Approve content', config: { reviewer: 'owner' } },
      { id: 's4', type: 'agent', label: 'Schedule posts', config: { role: 'Scheduler', prompt: 'Format and queue for publishing' } },
    ],
  },
  {
    id: 'tpl-lead',
    name: 'Lead Nurture Pipeline',
    description: 'Qualify → Follow up → Book → Close',
    status: 'draft',
    created_at: new Date().toISOString(),
    steps: [
      { id: 's1', type: 'agent', label: 'Qualify new lead', config: { role: 'Qualifier', prompt: 'Score lead based on their inquiry' } },
      { id: 's2', type: 'delay', label: 'Wait 1 day', config: { duration: '1', unit: 'days' } },
      { id: 's3', type: 'agent', label: 'Send follow-up', config: { role: 'Outreach', prompt: 'Draft personalized follow-up based on inquiry' } },
      { id: 's4', type: 'review_gate', label: 'Review before sending', config: { reviewer: 'owner' } },
      { id: 's5', type: 'agent', label: 'Book appointment', config: { role: 'Booker', prompt: 'Offer available time slots and confirm booking' } },
    ],
  },
  {
    id: 'tpl-onboarding',
    name: 'Client Onboarding',
    description: 'Welcome → Collect info → Setup → Deliver',
    status: 'draft',
    created_at: new Date().toISOString(),
    steps: [
      { id: 's1', type: 'agent', label: 'Send welcome message', config: { role: 'Onboarding', prompt: 'Welcome new client and set expectations' } },
      { id: 's2', type: 'delay', label: 'Wait 2 hours', config: { duration: '2', unit: 'hours' } },
      { id: 's3', type: 'agent', label: 'Collect business info', config: { role: 'Intake', prompt: 'Ask about services, hours, pricing, FAQs' } },
      { id: 's4', type: 'review_gate', label: 'Approve onboarding plan', config: { reviewer: 'owner' } },
      { id: 's5', type: 'agent', label: 'Deploy AI worker', config: { role: 'Deployer', prompt: 'Configure and launch client AI worker' } },
      { id: 's6', type: 'webhook', label: 'Notify via Slack', config: { url: '', event: 'client_onboarded' } },
    ],
  },
];

export function PipelineBuilderClient({ initialPipelines }: { initialPipelines: Array<Record<string, unknown>> }) {
  const [pipelines, setPipelines] = useState<Pipeline[]>(
    (initialPipelines as unknown as Pipeline[]).length > 0
      ? (initialPipelines as unknown as Pipeline[])
      : []
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const selected = pipelines.find(p => p.id === selectedId) || null;

  const createPipeline = (template?: Pipeline) => {
    const newPipeline: Pipeline = template
      ? { ...template, id: `pipe-${Date.now()}`, name: template.name, status: 'draft' }
      : {
        id: `pipe-${Date.now()}`,
        name: 'New Pipeline',
        description: '',
        steps: [],
        status: 'draft',
        created_at: new Date().toISOString(),
      };
    setPipelines(prev => [...prev, newPipeline]);
    setSelectedId(newPipeline.id);
    setShowTemplates(false);
    setSaved(false);
  };

  const deletePipeline = (id: string) => {
    setPipelines(prev => prev.filter(p => p.id !== id));
    if (selectedId === id) setSelectedId(null);
    setSaved(false);
  };

  const updatePipeline = (id: string, updates: Partial<Pipeline>) => {
    setPipelines(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    setSaved(false);
  };

  const addStep = (pipelineId: string, type: string) => {
    const stepType = STEP_TYPES.find(t => t.type === type);
    if (!stepType) return;
    const newStep: PipelineStep = {
      id: `step-${Date.now()}`,
      type: type as PipelineStep['type'],
      label: stepType.label,
      config: {},
    };
    setPipelines(prev => prev.map(p =>
      p.id === pipelineId ? { ...p, steps: [...p.steps, newStep] } : p
    ));
    setSaved(false);
  };

  const removeStep = (pipelineId: string, stepId: string) => {
    setPipelines(prev => prev.map(p =>
      p.id === pipelineId ? { ...p, steps: p.steps.filter(s => s.id !== stepId) } : p
    ));
    setSaved(false);
  };

  const updateStep = (pipelineId: string, stepId: string, updates: Partial<PipelineStep>) => {
    setPipelines(prev => prev.map(p =>
      p.id === pipelineId
        ? { ...p, steps: p.steps.map(s => s.id === stepId ? { ...s, ...updates } : s) }
        : p
    ));
    setSaved(false);
  };

  const savePipelines = async () => {
    setSaving(true);
    await fetch('/api/agency/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipelines }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-0">
    <SectionNav currentHref="/agency/pipelines" />
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-indigo-600" /> Pipelines
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Chain AI agents together — one does research, the next writes, you review, it publishes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}>
            <Sparkles className="h-4 w-4 mr-1" /> Templates
          </Button>
          <Button variant="outline" size="sm" onClick={() => createPipeline()}>
            <Plus className="h-4 w-4 mr-1" /> New Pipeline
          </Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={savePipelines} disabled={saving || saved}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : saved ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            {saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Templates */}
      {showTemplates && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-indigo-700 mb-3">Start from a template</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => createPipeline(t)}
                className="text-left bg-white border border-indigo-200 rounded-lg p-4 hover:border-indigo-400 hover:shadow-sm transition"
              >
                <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                <p className="text-[10px] text-indigo-500 mt-2">{t.steps.length} steps</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Your Pipelines</h3>
          {pipelines.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <GitBranch className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No pipelines yet</p>
              <p className="text-xs text-gray-400 mt-1">Create one or use a template</p>
            </div>
          ) : (
            pipelines.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left bg-white border rounded-xl p-4 transition ${
                  selectedId === p.id ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    p.status === 'active' ? 'bg-green-100 text-green-700'
                    : p.status === 'paused' ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-500'
                  }`}>
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{p.steps.length} steps</p>
              </button>
            ))
          )}
        </div>

        {/* Pipeline Editor */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <GitBranch className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Select a pipeline to edit</p>
              <p className="text-sm text-gray-400 mt-1">Or create a new one to get started</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Pipeline Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <input
                    className="text-lg font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 w-full"
                    value={selected.name}
                    onChange={e => updatePipeline(selected.id, { name: e.target.value })}
                    placeholder="Pipeline name"
                  />
                  <input
                    className="text-xs text-gray-400 bg-transparent border-none focus:outline-none focus:ring-0 w-full mt-0.5"
                    value={selected.description}
                    onChange={e => updatePipeline(selected.id, { description: e.target.value })}
                    placeholder="Description (optional)"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => updatePipeline(selected.id, {
                      status: selected.status === 'active' ? 'paused' : 'active'
                    })}
                  >
                    {selected.status === 'active' ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                    {selected.status === 'active' ? 'Pause' : 'Activate'}
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs text-red-600 hover:bg-red-50"
                    onClick={() => deletePipeline(selected.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Steps */}
              <div className="p-5 space-y-0">
                {selected.steps.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No steps yet — add one below
                  </div>
                )}
                {selected.steps.map((step, i) => {
                  const stepType = STEP_TYPES.find(t => t.type === step.type);
                  const Icon = stepType ? stepType.icon : Zap;
                  const color = stepType?.color || 'bg-gray-50 border-gray-200 text-gray-700';

                  return (
                    <div key={step.id}>
                      {/* Step Card */}
                      <div className={`border rounded-xl p-4 ${color}`}>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-gray-400">
                            <span className="text-xs font-mono font-bold opacity-50">{i + 1}</span>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <input
                              className="text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 w-full"
                              value={step.label}
                              onChange={e => updateStep(selected.id, step.id, { label: e.target.value })}
                              placeholder="Step name"
                            />
                            <p className="text-[10px] opacity-60">{stepType?.desc}</p>
                          </div>
                          <button onClick={() => removeStep(selected.id, step.id)}
                            className="opacity-40 hover:opacity-100 transition">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {/* Connector */}
                      {i < selected.steps.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowDown className="h-4 w-4 text-gray-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Step */}
              <div className="px-5 pb-5 pt-2">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-3 font-medium">Add a step:</p>
                  <div className="flex flex-wrap gap-2">
                    {STEP_TYPES.map(t => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.type}
                          onClick={() => addStep(selected.id, t.type)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:border-indigo-200 hover:bg-indigo-50 transition"
                        >
                          <Icon className="h-3 w-3" /> {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
