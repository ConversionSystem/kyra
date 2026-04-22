// ────────────────────────────────────────────────────────────────────────────
// Dispatch Brain — Sonnet-powered reasoning agent fired on Onfleet webhooks
//
// Decides routing actions: reassign, bump deadline, flag SLA risk, optimize,
// escalate. Uses the full 13-tool catalog from lib/onfleet/tools.ts.
//
// Budget: ~30s, 5 tool rounds (enforced by agent-runner).
// Fallback: deterministic rule-engine (lib/onfleet/rule-engine.ts::executeRules)
//           — same contract, no LLM. Used on timeout/error/budget/blocked.
// ────────────────────────────────────────────────────────────────────────────

import type { ChatMessage } from '@/lib/ai/claude';
import { runAgent, type AgentResult, AGENT_MODELS } from '@/lib/ai/agent-runner';
import {
  DISPATCH_TOOLS,
  buildToolExecutor,
  type ToolCatalogContext,
  type ToolRiskLevel,
  type ProposedAction,
} from '@/lib/onfleet/tools';
import { OnfleetClient } from '@/lib/onfleet/client';
import { executeRules } from '@/lib/onfleet/rule-engine';
import type {
  ClientDispatchConfig,
  OnfleetTask,
  RuleExecutionContext,
} from '@/lib/onfleet/types';
import type { OnfleetWebhookPayload } from '@/lib/sms/types';

// ─── Context ────────────────────────────────────────────────────────────────

export interface DispatchBrainContext {
  agencyId: string;
  clientId: string;
  businessName: string;        // e.g. "Purple Lotus"
  timezone: string;            // e.g. "America/Los_Angeles"
  onfleetApiKey: string;
  dispatchConfig: ClientDispatchConfig;       // used by rule-engine fallback
  autoExecuteRiskLevels: ToolRiskLevel[];     // from container_config.dispatch_agent_config
  /** Onfleet webhook that triggered this run */
  webhookPayload: OnfleetWebhookPayload;
  /** Pre-built task summary from the webhook (same shape the rule-engine consumes) */
  task?: OnfleetTask;
  /** Compliance-guarded SMS send. Invoked if the Brain calls send_customer_sms. */
  sendSms?: (to: string, body: string, orderId?: string) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
  /** Called when a high-risk tool needs human approval. Default: no-op (tool returns blocked). */
  onProposal?: (action: ProposedAction) => Promise<void>;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function runDispatchBrain(ctx: DispatchBrainContext): Promise<AgentResult> {
  const onfleet = new OnfleetClient(ctx.onfleetApiKey);

  const toolCtx: ToolCatalogContext = {
    clientId: ctx.clientId,
    agencyId: ctx.agencyId,
    onfleet,
    autoExecuteRiskLevels: ctx.autoExecuteRiskLevels,
    agent: 'dispatch_brain',
    onProposal: ctx.onProposal,
    sendSms: ctx.sendSms,
  };
  const { execute, getToolCalls } = buildToolExecutor(toolCtx);

  const systemPrompt = buildBrainSystemPrompt(ctx);
  const userMessage = buildBrainUserMessage(ctx);

  const messages: ChatMessage[] = [{ role: 'user', content: userMessage }];

  // Scope the Brain's tool surface: it REASONS about dispatch and can modify
  // tasks, but should NOT send customer SMS. The Writer owns customer comms
  // — giving Brain the same power would race with the Writer under Promise.all
  // (see audit P1.1) since both paths can pass compliance-guard dedup before
  // either write lands in delivery_sms_log.
  const brainTools = DISPATCH_TOOLS.filter((t) => t.name !== 'send_customer_sms');

  return runAgent({
    agent: 'dispatch_brain',
    agencyId: ctx.agencyId,
    clientId: ctx.clientId,
    triggerType: 'onfleet_webhook',
    triggerRef: ctx.webhookPayload.taskId
      || ctx.webhookPayload.data?.task?.id
      || ctx.webhookPayload.triggerName
      || undefined,
    model: AGENT_MODELS.sonnet,
    timeoutMs: 30_000,
    maxTokens: 2048,
    systemPrompt,
    messages,
    tools: brainTools,
    executeTool: execute,
    getToolCalls,
    onFallback: async (reason) => runRuleEngineFallback(ctx, reason),
  });
}

// ─── Fallback: deterministic rule-engine ────────────────────────────────────

async function runRuleEngineFallback(
  ctx: DispatchBrainContext,
  reason: 'timeout' | 'error' | 'budget_exceeded' | 'blocked',
): Promise<AgentResult> {
  const startedAt = Date.now();
  try {
    const ruleCtx: RuleExecutionContext = {
      clientId: ctx.clientId,
      config: ctx.dispatchConfig,
      trigger: 'webhook',
      eventType: ctx.webhookPayload.triggerName,
      triggerId: ctx.webhookPayload.triggerId,
      task: ctx.task,
      webhookPayload: ctx.webhookPayload,
    };
    const results = await executeRules(ruleCtx);
    const fired = results.filter((r) => r.fired).length;

    return {
      outcome: 'fallback',
      text: `Rule engine fallback: ${fired}/${results.length} rules fired (reason=${reason}).`,
      toolCalls: [],
      model: AGENT_MODELS.sonnet,
      latencyMs: Date.now() - startedAt,
      errorDetail: `agent_fallback:${reason}`,
    };
  } catch (err) {
    return {
      outcome: 'error',
      text: '',
      toolCalls: [],
      model: AGENT_MODELS.sonnet,
      latencyMs: Date.now() - startedAt,
      errorDetail: `Rule-engine fallback failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ─── Prompt builders ────────────────────────────────────────────────────────

function buildBrainSystemPrompt(ctx: DispatchBrainContext): string {
  return `You are the dispatch brain for ${ctx.businessName}, a cannabis delivery operator in ${ctx.timezone}. Your job is to reason about the current delivery state and take actions to minimize SLA breaches, balance driver load, and keep customers informed.

OPERATING RULES
- Never assign a task to a driver who already has 3 or more active tasks.
- Prefer drivers within 15 minutes of the customer address.
- When an SLA breach is inevitable, flag it (flag_sla_risk) AND send a proactive SMS to the customer.
- Prefer quiet adjustments (update_deadline) over visible ones (assign_task) when both would solve the problem.
- trigger_optimize has a large blast radius — only use it when the whole route needs rebalancing, never for a single late task.
- If the situation is ambiguous, non-routine, or the customer sounds upset, call escalate_to_human instead of guessing.
- Every write tool requires a concrete \`reason\` string. Be specific — this lands in the dispatch audit trail.

HOW TO REASON
1. Start by reading state: call list_active_tasks and list_active_drivers. Use get_task on the webhook task for full detail.
2. Decide whether this event actually requires action. Many webhook events are informational — taking no action is a valid outcome.
3. If you act, take at most 2-3 concrete actions. Don't chain speculative writes.
4. Summarize your reasoning in 1-2 sentences at the end, naming the actions you took and why.

HARD LIMITS
- You have 5 tool rounds. Plan accordingly.
- High-risk writes (reassign, optimize) may be routed to human approval — if a tool response says "Proposed for approval", the action has NOT executed. Do not retry the same action.`;
}

function buildBrainUserMessage(ctx: DispatchBrainContext): string {
  const p = ctx.webhookPayload;
  const task = ctx.task;
  const taskId = p.taskId || p.data?.task?.id || task?.id || 'unknown';
  const shortId = task?.shortId || p.data?.task?.id || '';
  const recipient = task?.recipients?.[0]?.name || p.data?.task?.recipients?.[0]?.name || '(unknown)';
  const address = task?.destination?.address?.unparsed
    || p.data?.task?.destination?.address?.unparsed
    || '(unknown)';
  const state = task?.state ?? p.data?.task?.status ?? 'unknown';
  const worker = task?.worker || p.data?.task?.worker?.id || '(unassigned)';
  const eta = task?.eta || p.data?.task?.eta;
  const completeBefore = task?.completeBefore;

  return `A webhook just fired from Onfleet.

EVENT
- trigger: ${p.triggerName || 'unknown'} (id=${p.triggerId ?? '?'})
- task: ${taskId}${shortId ? ` (shortId=${shortId})` : ''}
- state: ${state}
- recipient: ${recipient}
- address: ${address}
- worker: ${worker}
- eta: ${eta ? new Date(eta * 1000).toISOString() : 'n/a'}
- completeBefore: ${completeBefore ? new Date(completeBefore * 1000).toISOString() : 'n/a'}

Decide what — if anything — to do. Use tools to investigate first.`;
}
