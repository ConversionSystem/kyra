// ────────────────────────────────────────────────────────────────────────────
// Agent Runner — generic tool-use loop with audit, credit metering, fallback
//
// Wraps lib/ai/claude.ts::streamChatWithTools with:
//  - Pre-flight credit check
//  - Per-invocation audit to `agent_invocations`
//  - Timeout + graceful fallback hook
//  - Daily cost cap enforcement (falls back to rule engine when exceeded)
//
// Used by all 4 dispatch agents:
//    Dispatch Brain     (Sonnet 4.6, heavy reasoning)
//    SMS Writer         (Haiku 4.5, fast + cheap)
//    Dispatcher Copilot (Sonnet 4.6 with prompt caching)
//    Inbound Customer   (Haiku 4.5, defensive)
// ────────────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk';
import { getAnthropic, type ChatMessage, type ToolDefinition, type ToolExecutor } from './claude';
import { requireCredits, deductCredits, type CreditAction } from '@/lib/billing/credit-engine';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import type { ToolCallRecord } from '@/lib/onfleet/tools';

// ─── Model Registry ─────────────────────────────────────────────────────────

/** Named model aliases so upgrades are a single-file change. */
export const AGENT_MODELS = {
  sonnet: 'claude-sonnet-4-5-20250929',   // Dispatch Brain, Copilot
  haiku: 'claude-haiku-4-5',              // SMS Writer, Inbound Customer
} as const;

export type AgentName = 'dispatch_brain' | 'sms_writer' | 'copilot' | 'inbound_customer';

/** Credit action per agent — maps to lib/billing/credit-engine CREDIT_COSTS keys. */
const AGENT_CREDIT_ACTION: Record<AgentName, CreditAction> = {
  dispatch_brain: 'dispatch.brain_call',
  sms_writer: 'dispatch.sms_writer_call',
  copilot: 'dispatch.copilot_call',
  inbound_customer: 'dispatch.inbound_customer_call',
};

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentRunOptions {
  agent: AgentName;
  agencyId: string;
  clientId: string;
  triggerType: 'onfleet_webhook' | 'cron' | 'inbound_sms' | 'manual';
  triggerRef?: string;

  model?: string;             // default per agent
  maxTokens?: number;         // default 2048
  timeoutMs?: number;         // default 30_000
  enableCaching?: boolean;    // Anthropic prompt caching for systemPrompt (Copilot)

  systemPrompt: string;
  messages: ChatMessage[];
  tools: ToolDefinition[];
  executeTool: ToolExecutor;

  /** Called with the completed tool-call record for audit. */
  getToolCalls?: () => ToolCallRecord[];

  /**
   * Invoked when the LLM call fails/times out or the budget is exceeded.
   * Return a safe deterministic result — typically the rule-engine fallback.
   */
  onFallback?: (reason: 'timeout' | 'error' | 'budget_exceeded' | 'blocked') => Promise<AgentResult>;
}

export interface AgentResult {
  outcome: 'success' | 'fallback' | 'error' | 'blocked' | 'budget_exceeded';
  text: string;              // final AI message (for SMS Writer = the body; for Brain = reasoning)
  toolCalls: ToolCallRecord[];
  tokens?: { in: number; out: number };
  costCents?: number;
  model: string;
  latencyMs: number;
  errorDetail?: string;
}

// ─── Main Runner ────────────────────────────────────────────────────────────

export async function runAgent(opts: AgentRunOptions): Promise<AgentResult> {
  const startedAt = Date.now();
  const model = opts.model || defaultModelForAgent(opts.agent);
  const maxTokens = opts.maxTokens || 2048;
  const timeoutMs = opts.timeoutMs || 30_000;
  const action = AGENT_CREDIT_ACTION[opts.agent];

  // ─── Daily cost cap check ─────────────────────────────────────────────
  const capCheck = await checkDailyCostCap(opts.clientId, opts.agencyId);
  if (!capCheck.allowed) {
    const fb = await handleFallback(opts, 'budget_exceeded', model, startedAt);
    return fb;
  }

  // ─── Anthropic key check ──────────────────────────────────────────────
  // getAnthropic() uses process.env.ANTHROPIC_API_KEY! — unset values coerce
  // to a client that 401s on every call, which previously manifested as a
  // silent `outcome: 'fallback'`. Detect missing key and record a distinct
  // error so ops can see it in the dashboard.
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(`[agent-runner] ANTHROPIC_API_KEY missing; agent=${opts.agent} client=${opts.clientId} falling back`);
    const fb = await handleFallback(opts, 'error', model, startedAt);
    await recordInvocation(opts, {
      model, outcome: 'error',
      errorDetail: 'anthropic_key_missing',
      latencyMs: Date.now() - startedAt,
      toolCalls: [],
    });
    return fb;
  }

  // ─── Credit preflight ─────────────────────────────────────────────────
  const preflight = await requireCredits(opts.agencyId, action);
  if (!preflight.allowed) {
    const fb = await handleFallback(opts, 'budget_exceeded', model, startedAt);
    await recordInvocation(opts, {
      model, outcome: 'budget_exceeded',
      errorDetail: `Insufficient credits: need ${preflight.cost}, have ${preflight.balance}`,
      latencyMs: Date.now() - startedAt,
      toolCalls: [],
    });
    return fb;
  }

  // ─── Run the tool-use loop with timeout ───────────────────────────────
  const anthropic = getAnthropic();

  try {
    const result = await Promise.race([
      runToolLoop(anthropic, opts, model, maxTokens),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Agent timeout')), timeoutMs),
      ),
    ]);

    // Deduct credits on success (model-aware via lib/billing/model-credits)
    await deductCredits(opts.agencyId, action, {
      clientId: opts.clientId,
      description: `${opts.agent} invocation`,
    });

    const latencyMs = Date.now() - startedAt;
    const finalResult: AgentResult = {
      outcome: 'success',
      text: result.text,
      toolCalls: result.toolCalls,
      tokens: result.tokens,
      costCents: estimateCostCents(model, result.tokens?.in || 0, result.tokens?.out || 0),
      model,
      latencyMs,
    };

    await recordInvocation(opts, {
      model,
      outcome: 'success',
      latencyMs,
      toolCalls: result.toolCalls,
      tokensIn: result.tokens?.in,
      tokensOut: result.tokens?.out,
      costCents: finalResult.costCents,
      reasoningSummary: result.text.slice(0, 500),
    });

    return finalResult;
  } catch (err) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    const reason: 'timeout' | 'error' = errorDetail === 'Agent timeout' ? 'timeout' : 'error';

    const fb = await handleFallback(opts, reason, model, startedAt);
    await recordInvocation(opts, {
      model,
      outcome: 'fallback',
      errorDetail,
      latencyMs: Date.now() - startedAt,
      toolCalls: fb.toolCalls,
    });
    return fb;
  }
}

// ─── Tool-use Loop ──────────────────────────────────────────────────────────

async function runToolLoop(
  anthropic: Anthropic,
  opts: AgentRunOptions,
  model: string,
  maxTokens: number,
): Promise<{ text: string; toolCalls: ToolCallRecord[]; tokens?: { in: number; out: number } }> {
  const msgs: Anthropic.MessageParam[] = opts.messages.map((m) => ({
    role: m.role,
    content: m.content,
  })) as Anthropic.MessageParam[];

  const system = opts.enableCaching
    ? [{ type: 'text' as const, text: opts.systemPrompt, cache_control: { type: 'ephemeral' as const } }]
    : opts.systemPrompt;

  const MAX_ROUNDS = 5;
  const texts: string[] = [];
  let totalIn = 0;
  let totalOut = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: msgs,
      tools: opts.tools,
    });

    totalIn += response.usage.input_tokens;
    totalOut += response.usage.output_tokens;

    const toolUseBlocks: Anthropic.ToolUseBlock[] = [];
    for (const block of response.content) {
      if (block.type === 'text' && block.text) {
        texts.push(block.text);
      } else if (block.type === 'tool_use') {
        toolUseBlocks.push(block);
      }
    }

    if (response.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) {
      return {
        text: texts.join('\n\n'),
        toolCalls: opts.getToolCalls?.() || [],
        tokens: { in: totalIn, out: totalOut },
      };
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      let result: string;
      try {
        result = await opts.executeTool(block.name, block.input as Record<string, unknown>);
      } catch (err) {
        result = `Tool error: ${err instanceof Error ? err.message : String(err)}`;
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result,
      });
    }

    msgs.push({ role: 'assistant', content: response.content });
    msgs.push({ role: 'user', content: toolResults });
  }

  return {
    text: texts.join('\n\n'),
    toolCalls: opts.getToolCalls?.() || [],
    tokens: { in: totalIn, out: totalOut },
  };
}

// ─── Fallback ───────────────────────────────────────────────────────────────

async function handleFallback(
  opts: AgentRunOptions,
  reason: 'timeout' | 'error' | 'budget_exceeded' | 'blocked',
  model: string,
  startedAt: number,
): Promise<AgentResult> {
  if (opts.onFallback) {
    try {
      const result = await opts.onFallback(reason);
      return { ...result, model, latencyMs: Date.now() - startedAt };
    } catch (fbErr) {
      return {
        outcome: 'error',
        text: '',
        toolCalls: [],
        model,
        latencyMs: Date.now() - startedAt,
        errorDetail: `Fallback also failed: ${fbErr instanceof Error ? fbErr.message : String(fbErr)}`,
      };
    }
  }

  return {
    outcome: reason === 'budget_exceeded' ? 'budget_exceeded' : 'fallback',
    text: '',
    toolCalls: [],
    model,
    latencyMs: Date.now() - startedAt,
    errorDetail: `No fallback handler; agent reason=${reason}`,
  };
}

// ─── Daily cost cap ─────────────────────────────────────────────────────────

async function checkDailyCostCap(clientId: string, _agencyId: string): Promise<{ allowed: boolean; usedCents: number; capCents: number }> {
  const supabase = createServiceClientWithoutCookies();

  const { data: client } = await supabase
    .from('agency_clients')
    .select('container_config')
    .eq('id', clientId)
    .maybeSingle();

  const config = (client?.container_config || {}) as Record<string, unknown>;
  const agentConfig = (config.dispatch_agent_config || {}) as Record<string, unknown>;
  const capCents = Number(agentConfig.daily_cost_cap_cents ?? 1500); // default $15/day

  // capCents <= 0 means "unlimited" (operator explicitly disabled the cap).
  // Treating 0 as "always block" would be a surprise footgun.
  if (capCents <= 0) {
    return { allowed: true, usedCents: 0, capCents };
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data: invocations } = await supabase
    .from('agent_invocations')
    .select('cost_cents')
    .eq('client_id', clientId)
    .gte('created_at', start.toISOString());

  const usedCents = (invocations || []).reduce(
    (sum, r) => sum + (Number(r.cost_cents) || 0),
    0,
  );

  return { allowed: usedCents < capCents, usedCents, capCents };
}

// ─── Audit log ──────────────────────────────────────────────────────────────

async function recordInvocation(
  opts: AgentRunOptions,
  data: {
    model: string;
    outcome: 'success' | 'fallback' | 'error' | 'blocked' | 'budget_exceeded';
    tokensIn?: number;
    tokensOut?: number;
    costCents?: number;
    latencyMs: number;
    toolCalls: ToolCallRecord[];
    errorDetail?: string;
    reasoningSummary?: string;
  },
): Promise<void> {
  try {
    const supabase = createServiceClientWithoutCookies();
    await supabase.from('agent_invocations').insert({
      client_id: opts.clientId,
      agency_id: opts.agencyId,
      agent: opts.agent,
      trigger_type: opts.triggerType,
      trigger_ref: opts.triggerRef ?? null,
      model: data.model,
      input_tokens: data.tokensIn ?? null,
      output_tokens: data.tokensOut ?? null,
      cost_cents: data.costCents ?? null,
      tool_calls: data.toolCalls,
      outcome: data.outcome,
      error_detail: data.errorDetail ?? null,
      latency_ms: data.latencyMs,
      reasoning_summary: data.reasoningSummary ?? null,
    });
  } catch (err) {
    console.error('[agent-runner] Failed to record invocation:', err);
  }
}

// ─── Model cost estimation ──────────────────────────────────────────────────

/**
 * Rough cost estimation in cents. Keep in sync with Anthropic pricing.
 * Sonnet 4.5: $3 / $15 per 1M (in/out). Haiku 4.5: $1 / $5 per 1M.
 */
function estimateCostCents(model: string, inTokens: number, outTokens: number): number {
  if (model.includes('haiku')) {
    return Math.round(((inTokens / 1_000_000) * 100 + (outTokens / 1_000_000) * 500) * 1);
  }
  // Sonnet + Opus default
  return Math.round(((inTokens / 1_000_000) * 300 + (outTokens / 1_000_000) * 1500) * 1);
}

function defaultModelForAgent(agent: AgentName): string {
  if (agent === 'sms_writer' || agent === 'inbound_customer') return AGENT_MODELS.haiku;
  return AGENT_MODELS.sonnet;
}
