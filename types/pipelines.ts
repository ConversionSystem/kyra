/**
 * Task Pipelines — Multi-step work with checkpointing
 * 
 * No consumer AI does this. A user says "Research competitors, write a report, 
 * and email it to my team" — Kyra breaks it into steps, executes them sequentially,
 * checkpoints progress, and reports back.
 */

export type PipelineStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface PipelineStep {
  id: string;
  name: string;
  description: string;
  status: StepStatus;
  type: 'ai_task' | 'web_search' | 'file_create' | 'email' | 'approval' | 'custom';
  input?: Record<string, any>;  // Input from previous steps or user
  output?: Record<string, any>; // Result of this step
  error?: string;
  started_at?: string;
  completed_at?: string;
  requires_approval?: boolean;  // Pause and ask user before proceeding
  credit_cost: number;
}

export interface Pipeline {
  id: string;
  user_id: string;
  conversation_id: string;
  title: string;
  description: string;
  status: PipelineStatus;
  steps: PipelineStep[];
  current_step: number;
  total_credits: number;       // Estimated total credit cost
  credits_used: number;        // Credits consumed so far
  created_at: string;
  updated_at: string;
  completed_at?: string;
  metadata: Record<string, any>;
}

export interface PipelinePlan {
  title: string;
  description: string;
  steps: {
    name: string;
    description: string;
    type: PipelineStep['type'];
    credit_cost: number;
    requires_approval?: boolean;
  }[];
  estimated_credits: number;
  estimated_time: string; // "~5 minutes", "~20 minutes"
}
