// ────────────────────────────────────────────────────────────────────────────
// SMS Writer — Haiku-powered agent that drafts ONE customer-facing message
// per Onfleet webhook, then sends it through compliance-guard + provider.
//
// Tool access restricted to 5 read/write tools (see ALLOWED_TOOLS below).
// Budget: ~10s, 5 tool rounds (enforced by agent-runner).
// Fallback: lib/sms::processWebhook against DEFAULT_TEMPLATES + provider send.
// If compliance-guard rejects the Writer's message (opt-out, no-consent,
// outside-hours, duplicate) we log 'queued' or 'skipped' and do NOT retry.
// ────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';
import type { ChatMessage } from '@/lib/ai/claude';
import { runAgent, type AgentResult, AGENT_MODELS } from '@/lib/ai/agent-runner';
import {
  DISPATCH_TOOLS,
  buildToolExecutor,
  type ToolCatalogContext,
} from '@/lib/onfleet/tools';
import { OnfleetClient } from '@/lib/onfleet/client';
import {
  checkCompliance,
  type GuardDecision,
} from '@/lib/sms/compliance-guard';
import {
  createProvider,
  logDeliverySms,
  processWebhook,
  DEFAULT_TEMPLATES,
  isWithinSendingHours,
} from '@/lib/sms';
import type {
  ClientSmsConfig,
  DeliveryTemplate,
  OnfleetWebhookPayload,
  RenderedMessage,
} from '@/lib/sms/types';

// ─── Tool gating ────────────────────────────────────────────────────────────

const ALLOWED_TOOLS = new Set([
  'read_customer_memory',
  'read_order_status',
  'read_last_sms',
  'send_customer_sms',
  'escalate_to_human',
]);

const WRITER_TOOLS = DISPATCH_TOOLS.filter((t) => ALLOWED_TOOLS.has(t.name));

// ─── Context ────────────────────────────────────────────────────────────────

export interface SmsWriterContext {
  agencyId: string;
  clientId: string;
  businessName: string;
  timezone: string;
  onfleetApiKey: string;
  smsConfig: ClientSmsConfig;                 // provider, templates, hours, footer
  webhookPayload: OnfleetWebhookPayload;
  webhookReceivedAt: string;                  // ISO timestamp — preserves the contract w/ delivery_sms_log
  /** Customer phone (E.164) — pulled out of the webhook by the orchestrator */
  customerPhone?: string;
  /** Order/Task ID — used for dedup + correlation */
  orderId?: string;
  /** Opt-out footer text, e.g. "Reply STOP to opt out." */
  complianceFooter?: string;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function runSmsWriter(ctx: SmsWriterContext): Promise<AgentResult> {
  const onfleet = new OnfleetClient(ctx.onfleetApiKey);

  // Every send_customer_sms call from the LLM routes through this closure,
  // which enforces compliance-guard + logs delivery_sms_log. The agent never
  // touches the SMS provider directly.
  const sendSms = async (to: string, body: string, orderId?: string) => {
    return sendCompliantSms(ctx, { to, body, orderId });
  };

  const toolCtx: ToolCatalogContext = {
    clientId: ctx.clientId,
    agencyId: ctx.agencyId,
    onfleet,
    // SMS Writer should not write to Onfleet directly; send_customer_sms is
    // compliance-guarded, so allow it to auto-execute (guard rejects unsafe sends).
    autoExecuteRiskLevels: ['low', 'medium'],
    agent: 'sms_writer',
    sendSms,
  };
  const { execute, getToolCalls } = buildToolExecutor(toolCtx);

  // Filter executor to the 5 allowed tools — returns a clean "not available"
  // message if the model tries anything else (defense-in-depth beyond the
  // restricted tool catalog).
  const gatedExecute = async (name: string, input: Record<string, unknown>) => {
    if (!ALLOWED_TOOLS.has(name)) {
      return `Tool '${name}' is not available to the SMS Writer. Available: ${[...ALLOWED_TOOLS].join(', ')}.`;
    }
    return execute(name, input);
  };

  const systemPrompt = buildWriterSystemPrompt(ctx);
  const userMessage = buildWriterUserMessage(ctx);
  const messages: ChatMessage[] = [{ role: 'user', content: userMessage }];

  return runAgent({
    agent: 'sms_writer',
    agencyId: ctx.agencyId,
    clientId: ctx.clientId,
    triggerType: 'onfleet_webhook',
    triggerRef: ctx.orderId || ctx.webhookPayload.triggerName || undefined,
    model: AGENT_MODELS.haiku,
    timeoutMs: 10_000,
    maxTokens: 512,
    systemPrompt,
    messages,
    tools: WRITER_TOOLS,
    executeTool: gatedExecute,
    getToolCalls,
    onFallback: async (reason) => runTemplateFallback(ctx, reason),
  });
}

// ─── Compliance-guarded send (invoked by the Writer's send_customer_sms) ────

async function sendCompliantSms(
  ctx: SmsWriterContext,
  msg: { to: string; body: string; orderId?: string },
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const decision: GuardDecision = await checkCompliance({
    clientId: ctx.clientId,
    agencyId: ctx.agencyId,
    phone: msg.to,
    orderId: msg.orderId,
    sendingHoursStart: ctx.smsConfig.sendingHoursStart,
    sendingHoursEnd: ctx.smsConfig.sendingHoursEnd,
    timezone: ctx.smsConfig.timezone,
  });

  if (!decision.allow) {
    // Log the intended send as queued/skipped for audit. DO NOT retry.
    await logDeliverySms({
      id: crypto.randomUUID(),
      clientId: ctx.clientId,
      orderId: msg.orderId || '',
      event: 'taskAssigned', // event type unknown in this path — safe default
      templateId: 'ai-sms-writer',
      customerPhone: msg.to,
      customerName: '',
      driverName: '',
      messageBody: msg.body,
      provider: ctx.smsConfig.provider,
      status: decision.reason === 'duplicate' ? 'queued' : 'queued',
      error: `compliance:${decision.reason} ${decision.detail || ''}`.trim(),
      sentAt: new Date().toISOString(),
      webhookReceivedAt: ctx.webhookReceivedAt,
    });
    return { success: false, error: `compliance_${decision.reason}: ${decision.detail || ''}`.trim() };
  }

  // Append opt-out footer if the dispensary requires one and the model didn't include it.
  const footer = ctx.complianceFooter?.trim();
  const finalBody = footer && !msg.body.includes(footer)
    ? `${msg.body.trim()} ${footer}`.trim()
    : msg.body;

  const provider = createProvider({
    provider: ctx.smsConfig.provider,
    apiUrl: ctx.smsConfig.providerApiUrl,
    apiKey: ctx.smsConfig.providerApiKey,
  });

  const rendered: RenderedMessage = {
    to: msg.to,
    body: finalBody,
    templateId: 'ai-sms-writer',
    event: 'taskAssigned',
    orderId: msg.orderId || '',
  };

  const result = await provider.sendMessage(rendered);

  await logDeliverySms({
    id: crypto.randomUUID(),
    clientId: ctx.clientId,
    orderId: msg.orderId || '',
    event: 'taskAssigned',
    templateId: 'ai-sms-writer',
    customerPhone: msg.to,
    customerName: '',
    driverName: '',
    messageBody: finalBody,
    provider: result.provider,
    providerMessageId: result.messageId,
    status: result.success ? 'sent' : 'failed',
    error: result.error,
    sentAt: result.timestamp,
    webhookReceivedAt: ctx.webhookReceivedAt,
  });

  return {
    success: result.success,
    messageId: result.messageId,
    error: result.error,
  };
}

// ─── Fallback: template-based send (preserves legacy path) ──────────────────

async function runTemplateFallback(
  ctx: SmsWriterContext,
  reason: 'timeout' | 'error' | 'budget_exceeded' | 'blocked',
): Promise<AgentResult> {
  const startedAt = Date.now();
  try {
    const templates: DeliveryTemplate[] = ctx.smsConfig.templates.length > 0
      ? ctx.smsConfig.templates
      : DEFAULT_TEMPLATES;

    const rendered = processWebhook(ctx.webhookPayload, templates);
    if (!rendered) {
      return {
        outcome: 'fallback',
        text: `Template fallback skipped: no matching template for event (reason=${reason}).`,
        toolCalls: [],
        model: AGENT_MODELS.haiku,
        latencyMs: Date.now() - startedAt,
        errorDetail: `agent_fallback:${reason}:no_template`,
      };
    }

    // Respect sending hours — mirrors the existing webhook route path.
    if (!isWithinSendingHours(
      ctx.smsConfig.sendingHoursStart,
      ctx.smsConfig.sendingHoursEnd,
      ctx.smsConfig.timezone,
    )) {
      await logDeliverySms({
        id: crypto.randomUUID(),
        clientId: ctx.clientId,
        orderId: rendered.orderId,
        event: rendered.event,
        templateId: rendered.templateId,
        customerPhone: rendered.to,
        customerName: '',
        driverName: '',
        messageBody: rendered.body,
        provider: ctx.smsConfig.provider,
        status: 'queued',
        error: 'Outside sending hours — queued (agent fallback)',
        sentAt: ctx.webhookReceivedAt,
        webhookReceivedAt: ctx.webhookReceivedAt,
      });
      return {
        outcome: 'fallback',
        text: `Template fallback queued: outside sending hours (reason=${reason}).`,
        toolCalls: [],
        model: AGENT_MODELS.haiku,
        latencyMs: Date.now() - startedAt,
      };
    }

    const provider = createProvider({
      provider: ctx.smsConfig.provider,
      apiUrl: ctx.smsConfig.providerApiUrl,
      apiKey: ctx.smsConfig.providerApiKey,
    });
    const result = await provider.sendMessage(rendered);

    await logDeliverySms({
      id: crypto.randomUUID(),
      clientId: ctx.clientId,
      orderId: rendered.orderId,
      event: rendered.event,
      templateId: rendered.templateId,
      customerPhone: rendered.to,
      customerName: '',
      driverName: '',
      messageBody: rendered.body,
      provider: result.provider,
      providerMessageId: result.messageId,
      status: result.success ? 'sent' : 'failed',
      error: result.error,
      sentAt: result.timestamp,
      webhookReceivedAt: ctx.webhookReceivedAt,
    });

    return {
      outcome: 'fallback',
      text: `Template fallback ${result.success ? 'sent' : 'failed'}: ${rendered.templateId} (reason=${reason}).`,
      toolCalls: [],
      model: AGENT_MODELS.haiku,
      latencyMs: Date.now() - startedAt,
      errorDetail: result.success ? undefined : result.error,
    };
  } catch (err) {
    return {
      outcome: 'error',
      text: '',
      toolCalls: [],
      model: AGENT_MODELS.haiku,
      latencyMs: Date.now() - startedAt,
      errorDetail: `Template fallback failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ─── Prompt builders ────────────────────────────────────────────────────────

function buildWriterSystemPrompt(ctx: SmsWriterContext): string {
  const footer = ctx.complianceFooter?.trim() || 'Reply STOP to opt out.';
  return `You write customer-facing SMS for ${ctx.businessName}, a cannabis delivery operator in ${ctx.timezone}.

CANNABIS COMPLIANCE (non-negotiable)
- On arrival messages, remind the customer to have a valid 21+ ID ready.
- End every outbound message with the dispensary's opt-out footer EXACTLY: "${footer}"
- Never include external URLs other than the Onfleet tracking link surfaced by read_order_status.

STYLE
- Target 160 characters including the footer.
- One emoji is fine; no emoji spam.
- Plain, warm, specific. Reference the driver's name or ETA when you have them.
- Never invent facts (driver names, ETAs, products). If you don't know, say "your driver" / "soon".

PROCESS
1. Call read_order_status(taskId) for the current order.
2. Call read_last_sms(orderId) — if the same information was already sent in the last message, do NOT send a duplicate. Stop.
3. Call read_customer_memory(phone) only if personalization meaningfully helps (repeat customer, known preference). Skip for routine notifications.
4. Compose the message.
5. Call send_customer_sms(to, body, orderId). If it returns a compliance rejection, DO NOT retry with different content — the send has already been logged.

WHEN TO ESCALATE
- Event is ambiguous (you can't tell from the data what happened).
- taskFailed with no completion notes, payment disputes, angry customer signals.
- Anything that isn't a routine status update.
Call escalate_to_human instead of guessing.

BUDGET
- 5 tool rounds. Usually 2-3 is plenty.
- You must send AT MOST ONE SMS per invocation. If the right answer is "nothing", say so and stop.`;
}

function buildWriterUserMessage(ctx: SmsWriterContext): string {
  const p = ctx.webhookPayload;
  const taskId = p.taskId || p.data?.task?.id || 'unknown';
  const phone = ctx.customerPhone || p.data?.task?.recipients?.[0]?.phone || '';
  const orderId = ctx.orderId || taskId;
  const recipient = p.data?.task?.recipients?.[0]?.name || '(unknown)';
  const driver = p.data?.task?.worker?.name || '(unassigned)';

  return `Onfleet webhook just fired.

EVENT
- trigger: ${p.triggerName || 'unknown'} (id=${p.triggerId ?? '?'})
- taskId: ${taskId}
- orderId: ${orderId}
- customer: ${recipient} (${phone})
- driver: ${driver}

Decide whether an SMS should go out. If yes, compose and send exactly one.`;
}
