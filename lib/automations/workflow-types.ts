/**
 * AI Workflow Automation — Type Definitions
 *
 * Per-client workflow types, separate from agency-level automations.
 */

// ── Trigger Types ───────────────────────────────────────────────────────────

export type WorkflowTrigger =
  | { type: 'new_lead' }
  | { type: 'message_received'; filter?: string }
  | { type: 'booking_created' }
  | { type: 'deal_stage_changed'; from_stage?: string; to_stage?: string }
  | { type: 'schedule'; cron: string }
  | { type: 'tag_added'; tag: string }
  | { type: 'no_reply'; after_hours: number };

// ── Step Types ──────────────────────────────────────────────────────────────

export type WorkflowStep =
  | { type: 'wait'; minutes: number }
  | { type: 'send_email'; subject: string; body: string; to: 'contact' | 'agent' }
  | { type: 'send_sms'; message: string }
  | { type: 'ai_respond'; prompt: string }
  | { type: 'escalate'; reason: string }
  | { type: 'add_tag'; tag: string }
  | { type: 'move_deal'; stage: string }
  | { type: 'create_task'; title: string; assigned_to: string }
  | { type: 'webhook'; url: string; method: 'POST' | 'GET' }
  | { type: 'condition'; if: string; then: WorkflowStep[]; else?: WorkflowStep[] };

// ── Workflow ────────────────────────────────────────────────────────────────

export interface Workflow {
  id: string;
  client_id: string;
  agency_id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  status: 'active' | 'paused' | 'draft';
  created_at: string;
  updated_at: string;
}

// ── Workflow Run ────────────────────────────────────────────────────────────

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  trigger_event: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  error: string | null;
  step_results: StepResult[];
  created_at: string;
}

export interface StepResult {
  step_index: number;
  step_type: string;
  status: 'success' | 'failed' | 'skipped';
  output?: string;
  error?: string;
  executed_at: string;
}

// ── Template ────────────────────────────────────────────────────────────────

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
}

// ── Trigger display helpers ─────────────────────────────────────────────────

export function triggerLabel(trigger: WorkflowTrigger): string {
  switch (trigger.type) {
    case 'new_lead': return 'When a new lead comes in';
    case 'message_received': return trigger.filter
      ? `When a message contains "${trigger.filter}"`
      : 'When any message is received';
    case 'booking_created': return 'When a booking is created';
    case 'deal_stage_changed': return trigger.from_stage && trigger.to_stage
      ? `When deal moves from "${trigger.from_stage}" to "${trigger.to_stage}"`
      : 'When a deal stage changes';
    case 'schedule': return `On schedule: ${trigger.cron}`;
    case 'tag_added': return `When tag "${trigger.tag}" is added`;
    case 'no_reply': return `When no reply after ${trigger.after_hours} hours`;
    default: return 'Unknown trigger';
  }
}

export function stepLabel(step: WorkflowStep): string {
  switch (step.type) {
    case 'wait': return step.minutes >= 1440
      ? `Wait ${Math.round(step.minutes / 1440)} day(s)`
      : step.minutes >= 60
        ? `Wait ${Math.round(step.minutes / 60)} hour(s)`
        : `Wait ${step.minutes} minute(s)`;
    case 'send_email': return `Send email: "${step.subject}"`;
    case 'send_sms': return `Send SMS: "${step.message.slice(0, 50)}${step.message.length > 50 ? '...' : ''}"`;
    case 'ai_respond': return `AI responds: "${step.prompt.slice(0, 50)}${step.prompt.length > 50 ? '...' : ''}"`;
    case 'escalate': return `Escalate: ${step.reason}`;
    case 'add_tag': return `Add tag: "${step.tag}"`;
    case 'move_deal': return `Move deal to: "${step.stage}"`;
    case 'create_task': return `Create task: "${step.title}"`;
    case 'webhook': return `Call webhook: ${step.method} ${step.url}`;
    case 'condition': return `If ${step.if}`;
    default: return 'Unknown step';
  }
}
