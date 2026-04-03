'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Loader2, Play, Pause, Send, Sparkles,
  ChevronUp, ChevronDown, Trash2, Clock, Mail,
  Save, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EmailTemplateEditor } from './email-template-editor';

// ─── Types ──────────────────────────────────────────────────────────────

interface SequenceStep {
  id: string;
  sequence_id: string;
  position: number;
  subject: string;
  preview_text: string;
  html_body: string;
  delay_days: number;
  delay_hours: number;
  step_type: 'intro' | 'follow-up' | 'value-add' | 'closing' | 'custom';
  status: 'draft' | 'active' | 'paused';
  total_sent: number;
  total_opened: number;
  total_clicked: number;
}

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'paused';
  steps: SequenceStep[];
  active_enrollments: number;
}

interface SequenceBuilderProps {
  sequenceId: string;
}

const stepTypeLabels: Record<string, { label: string; color: string }> = {
  intro: { label: 'Intro', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'follow-up': { label: 'Follow-up', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  'value-add': { label: 'Value Add', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  closing: { label: 'Closing', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  custom: { label: 'Custom', color: 'bg-gray-50 text-gray-600 border-gray-200' },
};

const statusConfig = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  paused: { label: 'Paused', className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

// ─── Component ──────────────────────────────────────────────────────────

export function SequenceBuilder({ sequenceId }: SequenceBuilderProps) {
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingStep, setAddingStep] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [aiWriting, setAiWriting] = useState<string | null>(null);
  const [testSending, setTestSending] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSequence = useCallback(async () => {
    try {
      const res = await fetch(`/api/agency/email/sequences/${sequenceId}`);
      if (res.ok) {
        const data = await res.json();
        setSequence(data.sequence);
        setEditName(data.sequence.name);
        setEditDescription(data.sequence.description || '');
      }
    } catch (err) {
      console.error('Failed to fetch sequence:', err);
    } finally {
      setLoading(false);
    }
  }, [sequenceId]);

  useEffect(() => {
    fetchSequence();
  }, [fetchSequence]);

  const handleAddStep = async () => {
    setAddingStep(true);
    try {
      const res = await fetch(`/api/agency/email/sequences/${sequenceId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setSequence(prev => prev ? {
          ...prev,
          steps: [...prev.steps, data.step],
        } : prev);
        setEditingStepId(data.step.id);
      }
    } catch (err) {
      console.error('Failed to add step:', err);
    } finally {
      setAddingStep(false);
    }
  };

  const handleUpdateStep = async (stepId: string, updates: Partial<SequenceStep>) => {
    try {
      const res = await fetch(`/api/agency/email/sequences/${sequenceId}/steps/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setSequence(prev => prev ? {
          ...prev,
          steps: prev.steps.map(s => s.id === stepId ? data.step : s),
        } : prev);
        showToast('Step saved');
      }
    } catch (err) {
      console.error('Failed to update step:', err);
      showToast('Failed to save', 'error');
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    try {
      const res = await fetch(`/api/agency/email/sequences/${sequenceId}/steps/${stepId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSequence(prev => prev ? {
          ...prev,
          steps: prev.steps.filter(s => s.id !== stepId),
        } : prev);
        if (editingStepId === stepId) setEditingStepId(null);
        showToast('Step deleted');
      }
    } catch (err) {
      console.error('Failed to delete step:', err);
    }
  };

  const handleMoveStep = async (stepId: string, direction: 'up' | 'down') => {
    if (!sequence) return;
    const steps = [...sequence.steps];
    const idx = steps.findIndex(s => s.id === stepId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= steps.length) return;

    // Swap positions
    [steps[idx], steps[newIdx]] = [steps[newIdx], steps[idx]];

    // Update positions locally
    const reordered = steps.map((s, i) => ({ ...s, position: i }));
    setSequence(prev => prev ? { ...prev, steps: reordered } : prev);

    // Save both position changes
    await Promise.all([
      handleUpdateStep(reordered[idx].id, { position: idx }),
      handleUpdateStep(reordered[newIdx].id, { position: newIdx }),
    ]);
  };

  const handleAiWrite = async (stepId: string) => {
    setAiWriting(stepId);
    try {
      const res = await fetch(`/api/agency/email/sequences/${sequenceId}/ai-write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId,
          businessName: sequence?.name || '',
          industry: 'general',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Save the generated content to the step
        await handleUpdateStep(stepId, {
          subject: data.subject,
          html_body: data.htmlBody,
          preview_text: data.previewText || '',
        });
        showToast('AI generated email content! 🎉');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'AI generation failed', 'error');
      }
    } catch (err) {
      console.error('AI write failed:', err);
      showToast('AI generation failed', 'error');
    } finally {
      setAiWriting(null);
    }
  };

  const handleTestSend = async (stepId: string) => {
    setTestSending(stepId);
    try {
      const res = await fetch(`/api/agency/email/sequences/${sequenceId}/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Test sent to ${data.sentTo} ✉️`);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to send test', 'error');
      }
    } catch (err) {
      console.error('Test send failed:', err);
      showToast('Failed to send test email', 'error');
    } finally {
      setTestSending(null);
    }
  };

  const handleToggleStatus = async () => {
    if (!sequence) return;
    const newStatus = sequence.status === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch(`/api/agency/email/sequences/${sequenceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setSequence(prev => prev ? { ...prev, status: newStatus } : prev);
        showToast(newStatus === 'active' ? 'Sequence activated! 🚀' : 'Sequence paused');
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleSaveName = async () => {
    setSavingName(true);
    try {
      const res = await fetch(`/api/agency/email/sequences/${sequenceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDescription || null }),
      });
      if (res.ok) {
        setSequence(prev => prev ? { ...prev, name: editName, description: editDescription || null } : prev);
        setShowNameEdit(false);
        showToast('Saved');
      }
    } catch (err) {
      console.error('Failed to save name:', err);
    } finally {
      setSavingName(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!sequence) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Sequence not found</p>
      </div>
    );
  }

  const seqStatus = statusConfig[sequence.status];

  // ─── Editor View ──────────────────────────────────────────────────────

  if (editingStepId) {
    const step = sequence.steps.find(s => s.id === editingStepId);
    if (step) {
      return (
        <div className="max-w-4xl mx-auto px-6 py-6">
          <button
            onClick={() => setEditingStepId(null)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
          >
            ← Back to steps
          </button>
          <EmailTemplateEditor
            step={step}
            onSave={(updates) => {
              handleUpdateStep(step.id, updates);
            }}
            onAiWrite={() => handleAiWrite(step.id)}
            aiWriting={aiWriting === step.id}
            onTestSend={() => handleTestSend(step.id)}
            testSending={testSending === step.id}
          />
        </div>
      );
    }
  }

  // ─── Builder View ─────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all',
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white',
        )}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          {showNameEdit ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-xl font-semibold text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
                className="text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveName} disabled={savingName}>
                  {savingName ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  <span className="ml-1">Save</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowNameEdit(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div onClick={() => setShowNameEdit(true)} className="cursor-pointer group">
              <h1 className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                {sequence.name}
              </h1>
              {sequence.description && (
                <p className="text-sm text-gray-500 mt-0.5">{sequence.description}</p>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge className={cn('text-[10px] px-1.5 py-0 border', seqStatus.className)}>
              {seqStatus.label}
            </Badge>
            <span className="text-xs text-gray-400">
              {sequence.steps.length} step{sequence.steps.length !== 1 ? 's' : ''} · {sequence.active_enrollments} enrolled
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            className={sequence.status === 'active' ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}
          >
            {sequence.status === 'active'
              ? <><Pause className="h-3.5 w-3.5 mr-1" /> Pause</>
              : <><Play className="h-3.5 w-3.5 mr-1" /> Activate</>}
          </Button>
        </div>
      </div>

      {/* Steps Timeline */}
      <div className="space-y-0">
        {sequence.steps.map((step, idx) => {
          const typeConfig = stepTypeLabels[step.step_type] || stepTypeLabels.custom;
          const isFirst = idx === 0;
          const isLast = idx === sequence.steps.length - 1;

          return (
            <div key={step.id}>
              {/* Delay indicator (between steps) */}
              {!isFirst && (
                <div className="flex items-center gap-2 py-2 pl-6">
                  <div className="w-0.5 h-4 bg-gray-200" />
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {step.delay_days > 0
                      ? `${step.delay_days} day${step.delay_days !== 1 ? 's' : ''}`
                      : ''}
                    {step.delay_hours > 0
                      ? `${step.delay_days > 0 ? ' ' : ''}${step.delay_hours}h`
                      : ''}
                    {step.delay_days === 0 && step.delay_hours === 0 ? 'Immediately' : ''} after previous
                  </span>
                </div>
              )}

              {/* Step Card */}
              <div
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-200 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  {/* Step number */}
                  <div className="flex flex-col items-center gap-0.5 pt-0.5">
                    <button
                      onClick={() => handleMoveStep(step.id, 'up')}
                      disabled={isFirst}
                      className={cn('p-0.5 rounded text-gray-300 transition-colors', !isFirst && 'hover:text-gray-600 hover:bg-gray-100')}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-semibold">
                      {idx + 1}
                    </div>
                    <button
                      onClick={() => handleMoveStep(step.id, 'down')}
                      disabled={isLast}
                      className={cn('p-0.5 rounded text-gray-300 transition-colors', !isLast && 'hover:text-gray-600 hover:bg-gray-100')}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn('text-[10px] px-1.5 py-0 border', typeConfig.color)}>
                        {typeConfig.label}
                      </Badge>
                      {step.subject ? (
                        <span className="text-sm font-medium text-gray-900 truncate">{step.subject}</span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No subject yet</span>
                      )}
                    </div>
                    {step.preview_text && (
                      <p className="text-xs text-gray-500 truncate mb-1">{step.preview_text}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {isFirst && (
                        <span>Sent on enrollment</span>
                      )}
                      {step.total_sent > 0 && (
                        <>
                          <span>{step.total_sent} sent</span>
                          <span>{step.total_sent > 0 ? Math.round((step.total_opened / step.total_sent) * 100) : 0}% opened</span>
                          <span>{step.total_sent > 0 ? Math.round((step.total_clicked / step.total_sent) * 100) : 0}% clicked</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleAiWrite(step.id)}
                      disabled={aiWriting === step.id}
                      className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-50 transition-colors"
                      title="AI Write"
                    >
                      {aiWriting === step.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Sparkles className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setEditingStepId(step.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      title="Edit"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleTestSend(step.id)}
                      disabled={testSending === step.id || !step.subject || !step.html_body}
                      className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-30"
                      title="Send test"
                    >
                      {testSending === step.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Send className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteStep(step.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Delay Editor */}
                {!isFirst && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">Wait</span>
                    <input
                      type="number"
                      min={0}
                      value={step.delay_days}
                      onChange={(e) => handleUpdateStep(step.id, { delay_days: parseInt(e.target.value) || 0 })}
                      className="w-14 px-2 py-1 border border-gray-200 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-gray-500">days</span>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={step.delay_hours}
                      onChange={(e) => handleUpdateStep(step.id, { delay_hours: parseInt(e.target.value) || 0 })}
                      className="w-14 px-2 py-1 border border-gray-200 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-gray-500">hours after previous</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Step */}
      <div className="mt-4">
        <button
          onClick={handleAddStep}
          disabled={addingStep}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors flex items-center justify-center gap-2"
        >
          {addingStep
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Plus className="h-4 w-4" />}
          Add Email Step
        </button>
      </div>

      {/* Empty state */}
      {sequence.steps.length === 0 && (
        <div className="text-center py-12">
          <Mail className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-900 mb-1">No steps yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Add your first email step to get started. Use AI to generate content.
          </p>
        </div>
      )}
    </div>
  );
}
