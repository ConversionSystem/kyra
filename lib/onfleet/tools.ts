// ────────────────────────────────────────────────────────────────────────────
// Onfleet Tool Catalog — Anthropic tool definitions + executors
//
// Wraps lib/onfleet/client.ts with typed tool schemas that the four dispatch
// agents (Brain, SMS Writer, Copilot, Inbound Customer) use via agent-runner.
//
// Design:
// - Every tool carries a required `reason` string → forces the LLM to explain
//   why it's taking the action. Reason lands in dispatch_events / agent_invocations.
// - Write tools are gated by per-dispensary risk config (auto-execute vs propose).
// - Every tool returns a stringified result (Anthropic tool-use expects text).
// - Executor is build-once-per-request, closes over dispensary context.
// ────────────────────────────────────────────────────────────────────────────

import type { ToolDefinition, ToolExecutor } from '@/lib/ai/claude';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { scanOutput } from '@/lib/security/prompt-injection';
import { OnfleetClient } from './client';
import type { OnfleetTask, OnfleetWorker } from './types';

// PII patterns we REJECT from customer memory writes (P0.7).
// LLM-generated facts get stored and re-fed as prompt context forever — so
// we never want to persist SSN, credit card, or raw email/phone blocks.
const PII_PATTERNS: RegExp[] = [
  /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/,                   // SSN
  /\b(?:\d[ -]*?){13,16}\b/,                          // credit card digits
  /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i,      // email (over-cautious; okay)
];

const MAX_FACT_LENGTH = 200;

// ─── Risk Classification ────────────────────────────────────────────────────

export type ToolRiskLevel = 'low' | 'medium' | 'high';

/** Every tool's risk level. Used to decide auto-execute vs propose-for-approval. */
const TOOL_RISK: Record<string, ToolRiskLevel> = {
  // Read tools — always low
  list_active_tasks: 'low',
  list_active_drivers: 'low',
  get_task: 'low',
  get_driver_eta: 'low',
  read_customer_memory: 'low',
  read_order_status: 'low',
  read_last_sms: 'low',
  // Write tools — medium by default, high if they reassign or change routes
  assign_task: 'high',          // reassigns work — visible customer impact
  update_deadline: 'medium',     // quiet SLA bump — usually safe
  trigger_optimize: 'high',      // triggers Onfleet auto-dispatch — large blast radius
  send_customer_sms: 'medium',   // compliance-guarded separately
  flag_sla_risk: 'low',          // pure write to dispatch_events
  escalate_to_human: 'low',      // pings Nick, doesn't change anything
  update_customer_memory: 'low', // just enriches CRM
};

export function getToolRisk(name: string): ToolRiskLevel {
  return TOOL_RISK[name] ?? 'medium';
}

// ─── Tool Catalog Context ───────────────────────────────────────────────────

export interface ToolCatalogContext {
  clientId: string;                           // agency_clients.id
  agencyId: string;                           // agencies.id
  onfleet: OnfleetClient;                     // pre-authenticated
  autoExecuteRiskLevels: ToolRiskLevel[];     // from dispatch_agent_config
  agent: 'dispatch_brain' | 'sms_writer' | 'copilot' | 'inbound_customer';
  /** Called when a high-risk tool is called in propose-only mode — queues for approval */
  onProposal?: (toolCall: ProposedAction) => Promise<void>;
  /** Called for any SMS send — compliance-guarded upstream */
  sendSms?: (to: string, body: string, orderId?: string) => Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export interface ProposedAction {
  tool: string;
  input: Record<string, unknown>;
  risk: ToolRiskLevel;
  reason: string;
}

export interface ToolCallRecord {
  name: string;
  input: Record<string, unknown>;
  output: string;
  latency_ms: number;
  error?: string;
}

// ─── Tool Schemas ───────────────────────────────────────────────────────────

export const DISPATCH_TOOLS: ToolDefinition[] = [
  {
    name: 'list_active_tasks',
    description: 'List currently in-progress or assigned delivery tasks for the dispensary. Returns task ID, short ID, status, eta, recipient name, address, driver name, completeBefore.',
    input_schema: {
      type: 'object',
      properties: {
        includeUnassigned: {
          type: 'boolean',
          description: 'Include tasks in state=0 (created, not yet assigned). Default true.',
        },
        limit: { type: 'number', description: 'Max tasks to return. Default 20, max 50.' },
      },
      required: [],
    },
  },
  {
    name: 'list_active_drivers',
    description: 'List drivers on duty with their current location, active task count, and ETA on their current delivery.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_task',
    description: 'Get full details of a specific Onfleet task — destination, recipient, worker, timing, completion status, trackingURL.',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Onfleet task ID (from webhook or list_active_tasks)' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'assign_task',
    description: 'Reassign a task to a different driver. High-risk — visible customer impact. Must include a specific reason explaining why this driver is better than the current assignment.',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        workerId: { type: 'string', description: 'Target driver ID from list_active_drivers' },
        reason: { type: 'string', description: 'Why this reassignment? Logged to audit trail. Be specific.' },
      },
      required: ['taskId', 'workerId', 'reason'],
    },
  },
  {
    name: 'update_deadline',
    description: 'Update the completeBefore timestamp on a task. Use to bump SLA priority when a task is at risk of going late.',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        completeBeforeMsEpoch: {
          type: 'number',
          description: 'New deadline as Unix epoch milliseconds',
        },
        reason: { type: 'string' },
      },
      required: ['taskId', 'completeBeforeMsEpoch', 'reason'],
    },
  },
  {
    name: 'trigger_optimize',
    description: 'Trigger Onfleet auto-dispatch for a team (optimally reassigns all unassigned tasks to available drivers). High blast radius — only use when the whole route needs rebalancing.',
    input_schema: {
      type: 'object',
      properties: {
        teamId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['teamId', 'reason'],
    },
  },
  {
    name: 'flag_sla_risk',
    description: 'Flag a task as at-risk for SLA breach. Writes to dispatch_events for dashboard alerting. Does NOT change the task.',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        predictedOvershootMin: {
          type: 'number',
          description: 'How many minutes over SLA this task is predicted to run',
        },
        reason: { type: 'string' },
      },
      required: ['taskId', 'predictedOvershootMin', 'reason'],
    },
  },
  {
    name: 'read_customer_memory',
    description: 'Read customer profile — order history, preferences, tags, sentiment, lifetime value. Use for personalization.',
    input_schema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Customer phone in E.164 format (+1XXXXXXXXXX)' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'read_order_status',
    description: 'Get a customer-facing summary of an order status — driver name, ETA, delivered time, tracking link. Safe to paraphrase back to the customer.',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'read_last_sms',
    description: 'Get the most recent SMS sent to a customer for this order. Use to avoid duplicate notifications.',
    input_schema: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'send_customer_sms',
    description: 'Send an SMS to a customer. Will be rendered through compliance filters (sending hours, opt-out, consent). If rejected, returns a reason — do NOT retry with the same content.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Phone in E.164' },
        body: { type: 'string', description: 'Message body. Must include compliance footer if dispensary requires.' },
        orderId: { type: 'string', description: 'Associated order ID if applicable' },
      },
      required: ['to', 'body'],
    },
  },
  {
    name: 'escalate_to_human',
    description: 'Flag this situation for the dispatcher (Nick) to handle manually. Use when: customer is angry, payment dispute, unclear delivery instructions, anything outside routine operations.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
        taskId: { type: 'string' },
        customerPhone: { type: 'string' },
      },
      required: ['reason'],
    },
  },
  {
    name: 'update_customer_memory',
    description: 'Enrich customer memory with a new fact learned from this interaction. Use sparingly — only when the fact will matter on a future contact.',
    input_schema: {
      type: 'object',
      properties: {
        phone: { type: 'string' },
        fact: { type: 'string', description: 'The fact to remember. e.g. "Prefers delivery after 6pm weekdays."' },
      },
      required: ['phone', 'fact'],
    },
  },
];

// ─── Tool Executor Factory ──────────────────────────────────────────────────

/**
 * Build a tool executor closure bound to a dispensary + Onfleet client + agent.
 * Returns the executor (passed to streamChatWithTools) plus a record of all
 * tool calls made during the run (for agent_invocations audit).
 */
export function buildToolExecutor(ctx: ToolCatalogContext): {
  execute: ToolExecutor;
  getToolCalls: () => ToolCallRecord[];
} {
  const toolCalls: ToolCallRecord[] = [];
  const supabase = createServiceClientWithoutCookies();

  const execute: ToolExecutor = async (name, rawInput) => {
    const input = rawInput as Record<string, unknown>;
    const started = Date.now();
    let output = '';
    let error: string | undefined;

    try {
      const risk = getToolRisk(name);

      // Gate high-risk writes if the dispensary hasn't opted into auto-execute
      const isWrite = name === 'assign_task' || name === 'update_deadline'
        || name === 'trigger_optimize' || name === 'send_customer_sms';
      if (isWrite && !ctx.autoExecuteRiskLevels.includes(risk)) {
        if (ctx.onProposal) {
          await ctx.onProposal({
            tool: name,
            input,
            risk,
            reason: String(input.reason || ''),
          });
          output = `Proposed for approval. Action has NOT executed yet. The dispatcher will review.`;
        } else {
          output = `Tool blocked: risk level '${risk}' requires approval. No approval handler configured.`;
        }
      } else {
        output = await runTool(name, input, ctx, supabase);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      output = `Error: ${error}`;
    }

    toolCalls.push({
      name,
      input,
      output,
      latency_ms: Date.now() - started,
      error,
    });

    return output;
  };

  return { execute, getToolCalls: () => toolCalls };
}

// ─── Per-tool executors ─────────────────────────────────────────────────────

async function runTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolCatalogContext,
  supabase: ReturnType<typeof createServiceClientWithoutCookies>,
): Promise<string> {
  switch (name) {
    // ─── Reads ────────────────────────────────────────────────────────────
    case 'list_active_tasks': {
      const all = await ctx.onfleet.listTasks();
      const includeUnassigned = input.includeUnassigned !== false;
      const limit = Math.min(Number(input.limit) || 20, 50);
      const active = all.filter((t) => {
        const state = t.state ?? t.status ?? 0;
        return state === 1 || state === 2 || (includeUnassigned && state === 0);
      }).slice(0, limit);
      return JSON.stringify(active.map(summarizeTask), null, 2);
    }

    case 'list_active_drivers': {
      const drivers = await ctx.onfleet.getActiveWorkers();
      return JSON.stringify(drivers.map(summarizeDriver), null, 2);
    }

    case 'get_task': {
      const task = await ctx.onfleet.getTask(String(input.taskId));
      return JSON.stringify(summarizeTask(task), null, 2);
    }

    case 'get_driver_eta': {
      const driver = await ctx.onfleet.getWorker(String(input.workerId));
      return JSON.stringify({
        driver: driver.name,
        activeTask: driver.activeTask,
        taskCount: driver.tasks.length,
        location: driver.location,
      });
    }

    case 'read_customer_memory': {
      const phone = String(input.phone);
      const { data: contact } = await supabase
        .from('crm_contacts')
        .select('id')
        .eq('client_id', ctx.clientId)
        .eq('phone', phone)
        .maybeSingle();
      if (!contact) return 'No customer memory on file for this number.';

      const { data: memory } = await supabase
        .from('customer_memory')
        .select('*')
        .eq('client_id', ctx.clientId)
        .eq('contact_id', contact.id)
        .maybeSingle();

      if (!memory) return 'Contact exists but no structured memory yet.';
      return JSON.stringify({
        name: memory.name,
        totalInteractions: memory.total_interactions,
        tags: memory.tags,
        facts: memory.facts,
        sentiment: memory.sentiment,
        lifetimeValue: memory.lifetime_value,
        lastContact: memory.last_contact,
      }, null, 2);
    }

    case 'read_order_status': {
      const task = await ctx.onfleet.getTask(String(input.taskId));
      const state = task.state ?? task.status ?? 0;
      const stateLabels = ['Preparing', 'Assigned to driver', 'Out for delivery', 'Delivered'];
      return JSON.stringify({
        orderId: task.shortId || task.id,
        status: stateLabels[state],
        driver: task.worker ? '(assigned)' : '(unassigned)',
        etaMinutes: task.eta ? Math.round((task.eta * 1000 - Date.now()) / 60_000) : null,
        deliveredAt: task.completionDetails?.time
          ? new Date(task.completionDetails.time * 1000).toISOString()
          : null,
        trackingLink: task.trackingURL || null,
      });
    }

    case 'read_last_sms': {
      const { data } = await supabase
        .from('delivery_sms_log')
        .select('event, template_id, message_body, sent_at, status')
        .eq('client_id', ctx.clientId)
        .eq('order_id', String(input.orderId))
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return 'No prior SMS for this order.';
      return JSON.stringify(data);
    }

    // ─── Writes ───────────────────────────────────────────────────────────
    case 'assign_task': {
      const updated = await ctx.onfleet.assignTask(
        String(input.taskId),
        String(input.workerId),
      );
      await logDispatchEvent(supabase, ctx, 'rule_execution', {
        action: 'assign_task',
        taskId: input.taskId,
        workerId: input.workerId,
        reason: input.reason,
        agent: ctx.agent,
      }, 1, 1);
      return `Reassigned task ${updated.shortId || updated.id} to driver ${input.workerId}.`;
    }

    case 'update_deadline': {
      await ctx.onfleet.updateTask(String(input.taskId), {
        completeBefore: Math.floor(Number(input.completeBeforeMsEpoch) / 1000),
      });
      await logDispatchEvent(supabase, ctx, 'complete_before_set', {
        taskId: input.taskId,
        newDeadline: new Date(Number(input.completeBeforeMsEpoch)).toISOString(),
        reason: input.reason,
        agent: ctx.agent,
      }, 1, 0);
      return `Deadline updated for ${input.taskId}.`;
    }

    case 'trigger_optimize': {
      const result = await ctx.onfleet.autoAssign(String(input.teamId));
      await logDispatchEvent(supabase, ctx, 'optimization_run', {
        teamId: input.teamId,
        result,
        reason: input.reason,
        agent: ctx.agent,
      }, result.tasksAssigned, result.workersOptimized);
      return result.success
        ? `Route optimization triggered for team ${input.teamId}.`
        : `Optimization failed: ${result.error}`;
    }

    case 'flag_sla_risk': {
      await logDispatchEvent(supabase, ctx, 'sla_breach', {
        taskId: input.taskId,
        predictedOvershootMin: input.predictedOvershootMin,
        reason: input.reason,
        agent: ctx.agent,
        severity: Number(input.predictedOvershootMin) > 15 ? 'critical' : 'warning',
      }, 1, 0);
      return `Flagged ${input.taskId} as at-risk (${input.predictedOvershootMin} min overshoot predicted).`;
    }

    case 'send_customer_sms': {
      if (!ctx.sendSms) {
        return 'No SMS sender configured. Notification could not be sent.';
      }
      const result = await ctx.sendSms(
        String(input.to),
        String(input.body),
        input.orderId ? String(input.orderId) : undefined,
      );
      return result.success
        ? `SMS sent (messageId=${result.messageId}).`
        : `SMS rejected: ${result.error}`;
    }

    case 'escalate_to_human': {
      await logDispatchEvent(supabase, ctx, 'rule_execution', {
        action: 'escalate_to_human',
        reason: input.reason,
        taskId: input.taskId,
        customerPhone: input.customerPhone,
        agent: ctx.agent,
      }, 0, 0);
      return `Escalated to dispatcher. Reason: ${input.reason}`;
    }

    case 'update_customer_memory': {
      const phone = String(input.phone);
      const rawFact = String(input.fact ?? '');

      // P0.7 — sanitize LLM-influenced text before storage:
      //   1. Strip newlines + cap length.
      //   2. Reject PII (SSN / card / email) — these would get re-fed in
      //      future prompts, creating a compliance + leakage risk.
      //   3. Run scanOutput — blocks leaks of our own system internals
      //      (sk-*, pit-*, VPS IP, etc.).
      const fact = rawFact.replace(/[\r\n]+/g, ' ').trim().slice(0, MAX_FACT_LENGTH);
      if (!fact) return 'Memory update skipped — empty fact.';

      for (const re of PII_PATTERNS) {
        if (re.test(fact)) {
          console.warn(`[onfleet/tools] Memory update blocked — PII-like pattern in fact (client=${ctx.clientId})`);
          return 'Memory update blocked — fact contained PII (email/SSN/card). Skipped.';
        }
      }
      const scan = scanOutput(fact);
      if (!scan.safe) {
        console.warn(`[onfleet/tools] Memory update blocked — leak pattern (client=${ctx.clientId}, leaks=${scan.leaks.join(',')})`);
        return 'Memory update blocked — fact contained sensitive content. Skipped.';
      }

      const { data: contact } = await supabase
        .from('crm_contacts')
        .select('id')
        .eq('client_id', ctx.clientId)
        .eq('phone', phone)
        .maybeSingle();
      if (!contact) return 'Contact not found — memory not updated.';

      // P0.6 — fix upsert column clobber. If the row exists, UPDATE only the
      // two fields we know about; if it doesn't, INSERT a full row with
      // schema-default-compatible values so we don't nullify columns another
      // writer populated.
      const { data: existing } = await supabase
        .from('customer_memory')
        .select('id, facts')
        .eq('client_id', ctx.clientId)
        .eq('contact_id', contact.id)
        .maybeSingle();

      const now = new Date().toISOString();
      const nextFacts = [
        ...(Array.isArray(existing?.facts) ? existing.facts : []),
        { fact, source: `ai-extracted:${ctx.agent}`, date: now },
      ];

      if (existing?.id) {
        await supabase
          .from('customer_memory')
          .update({ facts: nextFacts, last_contact: now })
          .eq('id', existing.id);
      } else {
        await supabase.from('customer_memory').insert({
          client_id: ctx.clientId,
          contact_id: contact.id,
          facts: nextFacts,
          last_contact: now,
        });
      }

      return `Memory updated for ${phone}.`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function summarizeTask(t: OnfleetTask) {
  const state = t.state ?? t.status ?? 0;
  const stateLabel = ['created', 'assigned', 'active', 'completed'][state] || 'unknown';
  return {
    id: t.id,
    shortId: t.shortId,
    state: stateLabel,
    eta: t.eta ? new Date(t.eta * 1000).toISOString() : null,
    completeBefore: t.completeBefore
      ? new Date(t.completeBefore * 1000).toISOString()
      : null,
    worker: t.worker || null,
    recipient: t.recipients?.[0]?.name || null,
    phone: t.recipients?.[0]?.phone || null,
    address: t.destination?.address?.unparsed
      || [t.destination?.address?.number, t.destination?.address?.street, t.destination?.address?.city]
        .filter(Boolean).join(' '),
  };
}

function summarizeDriver(d: OnfleetWorker) {
  return {
    id: d.id,
    name: d.name,
    onDuty: d.onDuty,
    activeTask: d.activeTask,
    taskCount: d.tasks?.length || 0,
    location: d.location,
    timeLastSeen: d.timeLastSeen ? new Date(d.timeLastSeen).toISOString() : null,
  };
}

async function logDispatchEvent(
  supabase: ReturnType<typeof createServiceClientWithoutCookies>,
  ctx: ToolCatalogContext,
  eventType: string,
  details: Record<string, unknown>,
  tasksAffected: number,
  workersAffected: number,
): Promise<void> {
  try {
    await supabase.from('dispatch_events').insert({
      client_id: ctx.clientId,
      event_type: eventType,
      details,
      tasks_affected: tasksAffected,
      workers_affected: workersAffected,
    });
  } catch (err) {
    console.error('[onfleet/tools] Failed to log dispatch event:', err);
  }
}
