'use client';

import { useState } from 'react';
import { CheckCircle2, Circle, Loader2, XCircle, PauseCircle, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PipelineStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: { result?: string };
  error?: string;
  credit_cost: number;
  requires_approval?: boolean;
}

interface PipelineProgressProps {
  pipelineId: string;
  title: string;
  status: string;
  steps: PipelineStep[];
  currentStep: number;
  totalCredits: number;
  creditsUsed: number;
  onApprove?: (pipelineId: string) => void;
}

const STATUS_ICONS: Record<string, typeof Circle> = {
  pending: Circle,
  running: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
  skipped: Circle,
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-zinc-600',
  running: 'text-indigo-400 animate-spin',
  completed: 'text-emerald-400',
  failed: 'text-red-400',
  skipped: 'text-zinc-700',
};

export function PipelineProgress({
  pipelineId,
  title,
  status,
  steps,
  currentStep,
  totalCredits,
  creditsUsed,
  onApprove,
}: PipelineProgressProps) {
  const [expanded, setExpanded] = useState(true);
  const [approving, setApproving] = useState(false);

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  const handleApprove = async () => {
    setApproving(true);
    try {
      await fetch(`/api/pipelines/${pipelineId}/approve`, { method: 'POST' });
      onApprove?.(pipelineId);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900/80">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-800/50"
      >
        <div className="flex items-center gap-3">
          <div className="relative h-8 w-8">
            <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="3" className="text-zinc-800" />
              <circle
                cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="3"
                strokeDasharray={`${progress * 0.754} 100`}
                className="text-indigo-500 transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-zinc-300">
              {completedSteps}/{steps.length}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">{title}</p>
            <p className="text-xs text-zinc-500">
              {status === 'completed' ? 'Completed' :
               status === 'paused' ? 'Waiting for approval' :
               status === 'running' ? `Step ${currentStep} of ${steps.length}` :
               status === 'failed' ? 'Failed' : 'Pending'}
              {' · '}{creditsUsed}/{totalCredits} credits
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-zinc-600" /> : <ChevronDown className="h-4 w-4 text-zinc-600" />}
      </button>

      {/* Steps */}
      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-3">
          <div className="space-y-1">
            {steps.map((step, i) => {
              const Icon = STATUS_ICONS[step.status] || Circle;
              const colorClass = STATUS_COLORS[step.status] || 'text-zinc-600';
              
              return (
                <div key={step.id} className="flex items-start gap-3 py-1.5">
                  <div className="mt-0.5 flex flex-col items-center">
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                    {i < steps.length - 1 && (
                      <div className={`mt-1 h-4 w-px ${step.status === 'completed' ? 'bg-emerald-500/30' : 'bg-zinc-800'}`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${step.status === 'completed' ? 'text-zinc-300' : step.status === 'running' ? 'text-zinc-200' : 'text-zinc-500'}`}>
                      {step.name}
                    </p>
                    {step.status === 'failed' && step.error && (
                      <p className="mt-0.5 text-xs text-red-400">{step.error}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] text-zinc-700">{step.credit_cost}cr</span>
                </div>
              );
            })}
          </div>

          {/* Approval Button */}
          {status === 'paused' && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <PauseCircle className="h-4 w-4 shrink-0 text-amber-400" />
              <p className="flex-1 text-xs text-amber-300">
                This step needs your approval before Kyra continues.
              </p>
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={approving}
                className="bg-amber-500 text-black hover:bg-amber-400"
              >
                {approving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                <span className="ml-1">Approve</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
