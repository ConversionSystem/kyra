// ────────────────────────────────────────────────────────────────────────────
// Dispatcher Copilot — 15-minute background ops briefing agent
//
// Reads the last 30 min of Onfleet state + dispatch_events + agent_invocations,
// reasons about route/SLA risk, and emits a short briefing with 0-3
// non-destructive recommendations for the dispatcher to approve.
//
// Design notes:
// - Uses Anthropic prompt caching on the system prompt (long, stable).
// - Model = Sonnet (AGENT_MODELS.sonnet) — reasoning-heavy task.
// - Tool surface is read-only + non-destructive writes only. The Copilot
//   RECOMMENDS — Nick approves, at which point the dashboard's /approve
//   route executes via buildToolExecutor.
// - Output is structured via a terminal tool `submit_briefing` (Option B).
//   Free-text parsing is brittle; forcing a tool call gives us a typed
//   recommendations[] with zero regex.
// ────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'crypto';
import { runAgent, AGENT_MODELS, type AgentResult } from '@/lib/ai/agent-runner';
import type { ToolDefinition } from '@/lib/ai/claude';
import {
  DISPATCH_TOOLS,
  buildToolExecutor,
  type ToolCatalogContext,
  type ToolRiskLevel,
} from '@/lib/onfleet/tools';
import { createOnfleetClient } from '@/lib/onfleet/client';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// ─── Recommendation contract (shared with dashboard + approve/reject routes) ─

export type CopilotRecommendationAction =
  | 'assign_task'
  | 'update_deadline'
  | 'trigger_optimize'
  | 'send_customer_sms'
  | 'flag_sla_risk'
  | 'escalate_to_human';

export interface CopilotRecommendation {
  id: string;
  text: string;
  action?: CopilotRecommendationAction;
  toolInput?: Record<string, unknown>;
  risk: 'low' | 'medium' | 'high';
  approved?: boolean;
  approved_at?: string;
  rejected?: boolean;
  rejected_at?: string;
  reject_reason?: string;
}

export interface CopilotContext {
  clientId: string;
  agencyId: string;
  businessName: string;
  onfleetApiKey: string;
  autoExecuteRiskLevels: ToolRiskLevel[];
  /** Override window (ms). Default 30 minutes. */
  windowMs?: number;
  triggerType?: 'cron' | 'manual';
}

// ─── Local tool definition: submit_briefing (Option B — structured output) ───

const SUBMIT_BRIEFING_TOOL: ToolDefinition = {
  name: 'submit_briefing',
  description:
    'Call this EXACTLY ONCE at the end of your analysis to emit the final briefing. Do not emit any other text outside the tool call. The summary must be 2-3 sentences; recommendations is an array of 0-3 actionable items. If everything looks fine, pass an empty recommendations array with a summary of "Routes stable, no actions needed."',
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: '2-3 sentence plain-English briefing for the dispatcher.',
      },
      recommendations: {
        type: 'array',
        description: '0-3 recommended actions for the dispatcher to approve.',
        items: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description:
                'One-line human-readable description, e.g. "Pull Order #4821 to driver Sarah (12min closer)".',
            },
            action: {
              type: 'string',
              enum: [
                'assign_task',
                'update_deadline',
                'trigger_optimize',
                'send_customer_sms',
                'flag_sla_risk',
                'escalate_to_human',
              ],
              description:
                'The underlying tool name that will execute on approve. Omit if no concrete action — use escalate_to_human for "Nick should look at this".',
            },
            toolInput: {
              type: 'object',
              description:
                'Arguments ready to pass to the tool executor on approve. Include reason and taskId / workerId / body / etc as the tool requires.',
              additionalProperties: true,
            },
            risk: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description:
                'Risk of the proposed action. Reassigns = high, SMS = medium, flag/escalate = low.',
            },
          },
          required: ['text', 'risk'],
        },
        maxItems: 3,
      },
      activeRouteCount: {
        type: 'number',
        description: 'Number of active routes/drivers you observed.',
      },
      atRiskCount: {
        type: 'number',
        description: 'Number of tasks you judged at-risk for SLA breach.',
      },
    },
    required: ['summary', 'recommendations'],
  },
};

// ─── System prompt (cached) ─────────────────────────────────────────────────

function buildSystemPrompt(businessName: string): string {
  return [
    `You are the Dispatcher Copilot for ${businessName}. Your job is to run every 15 minutes, inspect the state of active deliveries over the last 30 minutes, and produce a short ops briefing for the dispatcher (Nick).`,
    '',
    'You do NOT execute work yourself. You RECOMMEND — Nick approves, and only then do the underlying actions run. Never promise an action has happened.',
    '',
    'Workflow:',
    '1. Call list_active_tasks and list_active_drivers to understand the current state.',
    '2. If a specific task looks suspect, call get_task for detail.',
    '3. (Optional) read_customer_memory if a VIP/frequent customer is involved.',
    '4. Call flag_sla_risk for any task predicted to miss its completeBefore deadline. This is a pure write to dispatch_events — it does NOT change the task. Safe to do directly.',
    '5. Terminate by calling submit_briefing exactly once with the summary + 0-3 recommendations.',
    '',
    'Style rules for the briefing:',
    '- Be terse. One summary paragraph (2-3 sentences) + 0-3 numbered recommendations.',
    '- If everything is fine, set summary to "Routes stable, no actions needed." and return an empty recommendations array.',
    '- NEVER recommend more than 3 actions per briefing. Prioritize the most impactful.',
    '- Each recommendation must include: text (what + why in one line), risk level, and — where actionable — the tool name + toolInput ready to execute.',
    '- Prefer recommending over acting. Only call flag_sla_risk directly (it is non-destructive). Do NOT call assign_task, update_deadline, trigger_optimize, or send_customer_sms yourself — those are recommendation-only in your context.',
    '',
    'Risk classification for recommendations:',
    '- assign_task → high (reassigns work, visible to customer)',
    '- trigger_optimize → high (rebalances the whole team)',
    '- update_deadline → medium',
    '- send_customer_sms → medium',
    '- flag_sla_risk → low',
    '- escalate_to_human → low',
    '',
    'You must finish your turn with a submit_briefing tool call. No free text after it.',
  ].join('\n');
}

// ─── Main entry point ───────────────────────────────────────────────────────

export async function runCopilot(ctx: CopilotContext): Promise<AgentResult> {
  const windowMs = ctx.windowMs ?? 30 * 60 * 1000;
  const windowStart = new Date(Date.now() - windowMs);
  const windowEnd = new Date();
  const supabase = createServiceClientWithoutCookies();

  // ─── Assemble the user message with 30-min context ──────────────────────
  const recentContext = await loadRecentContext(ctx.clientId, windowStart);
  const userMessage = [
    `Time window: ${windowStart.toISOString()} → ${windowEnd.toISOString()} (last ${Math.round(windowMs / 60000)} minutes).`,
    '',
    'Recent dispatch events:',
    recentContext.events.length > 0
      ? recentContext.events.map((e) => `- [${e.event_type}] ${e.created_at}: ${JSON.stringify(e.details).slice(0, 200)}`).join('\n')
      : '(none)',
    '',
    'Recent agent activity (last 30 min):',
    recentContext.invocations.length > 0
      ? recentContext.invocations.map((i) => `- ${i.agent} (${i.outcome}) @ ${i.created_at}`).join('\n')
      : '(none)',
    '',
    'Now inspect live Onfleet state via your tools and produce the briefing.',
  ].join('\n');

  // ─── Build tool executor + local tool list ──────────────────────────────
  const toolCtx: ToolCatalogContext = {
    clientId: ctx.clientId,
    agencyId: ctx.agencyId,
    onfleet: createOnfleetClient(ctx.onfleetApiKey),
    autoExecuteRiskLevels: ctx.autoExecuteRiskLevels,
    agent: 'copilot',
  };
  const { execute, getToolCalls } = buildToolExecutor(toolCtx);

  // Copilot gets read tools + non-destructive writes. We specifically EXCLUDE
  // assign_task, update_deadline, trigger_optimize, send_customer_sms —
  // those are recommendation-only; the approve route executes them.
  const COPILOT_READ_WRITE_NAMES = new Set([
    'list_active_tasks',
    'list_active_drivers',
    'get_task',
    'read_customer_memory',
    'flag_sla_risk',
    'escalate_to_human',
  ]);
  const filteredTools = DISPATCH_TOOLS.filter((t) => COPILOT_READ_WRITE_NAMES.has(t.name));
  const tools: ToolDefinition[] = [...filteredTools, SUBMIT_BRIEFING_TOOL];

  // ─── Capture the submit_briefing payload ────────────────────────────────
  interface CapturedBriefing {
    summary: string;
    recommendations: Array<{ text: string; action?: string; toolInput?: Record<string, unknown>; risk?: string }>;
    activeRouteCount?: number;
    atRiskCount?: number;
  }
  // Box in a holder so TS can't narrow via closure flow analysis.
  const capturedRef: { value: CapturedBriefing | null } = { value: null };

  const wrappedExecute = async (name: string, input: Record<string, unknown>) => {
    if (name === 'submit_briefing') {
      capturedRef.value = {
        summary: String(input.summary ?? ''),
        recommendations: Array.isArray(input.recommendations)
          ? (input.recommendations as Array<Record<string, unknown>>).map((r) => ({
              text: String(r.text ?? ''),
              action: typeof r.action === 'string' ? r.action : undefined,
              toolInput: (r.toolInput && typeof r.toolInput === 'object')
                ? (r.toolInput as Record<string, unknown>)
                : undefined,
              risk: typeof r.risk === 'string' ? r.risk : 'low',
            }))
          : [],
        activeRouteCount: typeof input.activeRouteCount === 'number' ? input.activeRouteCount : undefined,
        atRiskCount: typeof input.atRiskCount === 'number' ? input.atRiskCount : undefined,
      };
      return 'Briefing submitted.';
    }
    return execute(name, input);
  };

  // ─── Run the agent ──────────────────────────────────────────────────────
  const result = await runAgent({
    agent: 'copilot',
    agencyId: ctx.agencyId,
    clientId: ctx.clientId,
    triggerType: ctx.triggerType ?? 'cron',
    model: AGENT_MODELS.sonnet,
    maxTokens: 2048,
    timeoutMs: 45_000,
    enableCaching: true,
    systemPrompt: buildSystemPrompt(ctx.businessName),
    messages: [{ role: 'user', content: userMessage }],
    tools,
    executeTool: wrappedExecute,
    getToolCalls,
  });

  // ─── Persist the briefing ───────────────────────────────────────────────
  const captured = capturedRef.value;
  const summary = captured?.summary
    || (result.outcome === 'success' ? (result.text || 'Briefing completed.') : 'Copilot fell back to safe mode — no summary available.');

  const recommendations: CopilotRecommendation[] = (captured?.recommendations ?? [])
    .slice(0, 3)
    .map((r) => {
      const risk: CopilotRecommendation['risk'] =
        r.risk === 'low' || r.risk === 'medium' || r.risk === 'high' ? r.risk : 'low';
      const action = isKnownAction(r.action) ? r.action : undefined;
      return {
        id: randomUUID(),
        text: r.text,
        action,
        toolInput: r.toolInput,
        risk,
      };
    });

  try {
    await supabase.from('dispatch_briefings').insert({
      client_id: ctx.clientId,
      agency_id: ctx.agencyId,
      summary,
      recommendations,
      active_route_count: captured?.activeRouteCount ?? null,
      at_risk_count: captured?.atRiskCount ?? null,
      prevented_breaches: null,
      time_window_start: windowStart.toISOString(),
      time_window_end: windowEnd.toISOString(),
      model: result.model,
      tokens_in: result.tokens?.in ?? null,
      tokens_out: result.tokens?.out ?? null,
      cost_cents: result.costCents ?? null,
    });
  } catch (err) {
    console.error('[copilot] Failed to persist briefing:', err);
  }

  return result;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isKnownAction(v: unknown): v is CopilotRecommendationAction {
  return (
    v === 'assign_task'
    || v === 'update_deadline'
    || v === 'trigger_optimize'
    || v === 'send_customer_sms'
    || v === 'flag_sla_risk'
    || v === 'escalate_to_human'
  );
}

async function loadRecentContext(clientId: string, since: Date) {
  const supabase = createServiceClientWithoutCookies();

  const [eventsRes, invRes] = await Promise.all([
    supabase
      .from('dispatch_events')
      .select('event_type, details, created_at')
      .eq('client_id', clientId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(25),
    supabase
      .from('agent_invocations')
      .select('agent, outcome, created_at')
      .eq('client_id', clientId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(25),
  ]);

  return {
    events: (eventsRes.data ?? []) as Array<{ event_type: string; details: unknown; created_at: string }>,
    invocations: (invRes.data ?? []) as Array<{ agent: string; outcome: string; created_at: string }>,
  };
}
