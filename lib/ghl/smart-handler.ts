// ============================================================================
// Smart AI Employee Engine
//
// The brain that transforms a dumb chat relay into a real AI employee.
// Wires together: persona injection + conversation memory + relationship memory
// + function calling (GHL tools) + business hours awareness + escalation.
//
// This replaces the old bridge-relay approach in webhook-handler.ts.
// ============================================================================

import { getConversationHistory, saveConversationTurn } from './conversation-memory';
import { callLLMWithTools, type DirectLLMResult } from './direct-llm';
import { GHL_TOOL_DEFINITIONS, executeTool, type ToolContext, type ToolResult } from './ghl-tools';
import { getValidToken } from './api';
import { getMemories, buildMemoryContext } from '@/lib/crm/relationship-memory';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { logActivity } from '@/lib/crm/activities';
import type { AgencyClient, AgencyTemplate } from '@/lib/agency/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ContainerConfig {
  persona?: string;
  instructions?: string;
  greeting?: string;
  business_hours?: {
    enabled: boolean;
    start: string;   // "09:00"
    end: string;     // "17:00"
    timezone: string; // "America/New_York"
  };
  calendar_url?: string;
  response_language?: string;
  wake_words?: Array<{ keyword: string; action: string }>;
  proactive_enabled?: boolean;
  proactive_greeting?: string;
}

interface SmartHandlerContext {
  client: AgencyClient & { template?: AgencyTemplate | null };
  contactId: string;
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  conversationId?: string;
  messageType: string;
  messageBody: string;
}

export interface SmartHandlerResult {
  reply: string;
  toolsUsed: string[];
  escalated: boolean;
  escalationReason?: string;
  responseTimeMs: number;
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

/**
 * Process an inbound message with full AI employee capabilities:
 * 1. Build rich system prompt (persona + instructions + business hours + language)
 * 2. Fetch conversation history (last 10 messages)
 * 3. Fetch relationship memories from CRM
 * 4. Call LLM with GHL tools (function calling)
 * 5. Execute any tool calls (book appointment, tag contact, etc.)
 * 6. Multi-turn: feed tool results back to AI for final response
 * 7. Save conversation turn for future memory
 * 8. Handle escalation if triggered
 */
export async function processWithSmartEngine(
  ctx: SmartHandlerContext,
): Promise<SmartHandlerResult> {
  const startTime = Date.now();
  const cc = (ctx.client.container_config || {}) as ContainerConfig;

  // ── 1. Build rich system prompt ───────────────────────────────────────
  const systemPrompt = buildSmartSystemPrompt(ctx.client, cc, ctx);

  // ── 2. Fetch conversation history ─────────────────────────────────────
  const history = await getConversationHistory(
    ctx.client.id,
    ctx.contactId,
    10,
  ).catch(() => []);

  // ── 3. Fetch relationship memories ────────────────────────────────────
  const memories = await fetchRelationshipMemories(
    ctx.client.agency_id,
    ctx.contactId,
    ctx.contactPhone,
    ctx.contactEmail,
  );

  // ── 4. Build messages array ───────────────────────────────────────────
  const messages = buildMessagesArray(systemPrompt, memories, history, ctx.messageBody);

  // ── 5. Check for wake words (instant actions) ─────────────────────────
  const wakeWordMatch = checkWakeWords(ctx.messageBody, cc.wake_words);

  // ── 6. Call LLM with tools ────────────────────────────────────────────
  const ghlToken = await getValidToken(ctx.client.id).catch(() => null);
  const toolContext: ToolContext | null = ghlToken
    ? {
        token: ghlToken,
        contactId: ctx.contactId,
        locationId: (ctx.client as any).ghl_location_id || '',
        clientId: ctx.client.id,
        calendarId: undefined,
        pipelineId: undefined,
      }
    : null;

  // Only include tools if we have a valid GHL token (can actually execute them)
  const tools = toolContext ? GHL_TOOL_DEFINITIONS : [];

  let result = await callLLMWithTools({
    agencyId: ctx.client.agency_id,
    messages,
    tools,
  });

  // ── 7. Tool execution loop (max 3 rounds) ────────────────────────────
  const toolsUsed: string[] = [];
  let escalated = false;
  let escalationReason: string | undefined;
  let rounds = 0;
  const MAX_TOOL_ROUNDS = 3;

  while (result.toolCalls && result.toolCalls.length > 0 && rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    // Add assistant message with tool calls to conversation
    messages.push({
      role: 'assistant',
      content: result.reply || '',
      tool_calls: result.toolCalls.map((tc) => ({
        id: tc.id || `call_${Date.now()}_${tc.name}`,
        type: 'function' as const,
        function: { name: tc.name, arguments: JSON.stringify(tc.args) },
      })),
    });

    // Execute each tool call
    for (const tc of result.toolCalls) {
      toolsUsed.push(tc.name);
      const callId = tc.id || `call_${Date.now()}_${tc.name}`;

      if (toolContext) {
        const toolResult = await executeTool(tc.name, tc.args, toolContext);

        // Check for escalation
        if (toolResult.escalate) {
          escalated = true;
          escalationReason = toolResult.escalate.reason;
        }

        messages.push({
          role: 'tool',
          content: JSON.stringify(toolResult),
          tool_call_id: callId,
        });
      } else {
        messages.push({
          role: 'tool',
          content: JSON.stringify({ success: false, error: 'GHL not connected — cannot execute tools' }),
          tool_call_id: callId,
        });
      }
    }

    // Call LLM again with tool results
    result = await callLLMWithTools({
      agencyId: ctx.client.agency_id,
      messages,
      tools,
    });
  }

  const reply = result.reply || "I'm sorry, I'm having trouble processing your message right now. Let me connect you with a team member.";
  const responseTimeMs = Date.now() - startTime;

  // ── 8. Save conversation turn ─────────────────────────────────────────
  saveConversationTurn({
    clientId: ctx.client.id,
    agencyId: ctx.client.agency_id,
    contactId: ctx.contactId,
    contactName: ctx.contactName,
    contactPhone: ctx.contactPhone,
    contactEmail: ctx.contactEmail,
    conversationId: ctx.conversationId || '',
    userMessage: ctx.messageBody,
    aiResponse: reply,
    channel: ctx.messageType,
    responseTimeMs,
  }).catch((err) => console.error('[smart-handler] Failed to save conversation:', err));

  // ── 9. Handle escalation ──────────────────────────────────────────────
  if (escalated && escalationReason) {
    handleEscalation(ctx, escalationReason).catch((err) =>
      console.error('[smart-handler] Escalation handling failed:', err),
    );
  }

  // ── 10. Log wake word action (if matched) ─────────────────────────────
  if (wakeWordMatch) {
    console.log(
      `[smart-handler] Wake word matched: "${wakeWordMatch.keyword}" → ${wakeWordMatch.action}`,
    );
  }

  console.log(
    `[smart-handler] ✅ Processed in ${responseTimeMs}ms | Tools: [${toolsUsed.join(', ')}] | Escalated: ${escalated} | History: ${history.length} turns`,
  );

  return { reply, toolsUsed, escalated, escalationReason, responseTimeMs };
}

// ── System Prompt Builder ─────────────────────────────────────────────────────

function buildSmartSystemPrompt(
  client: AgencyClient,
  cc: ContainerConfig,
  ctx: SmartHandlerContext,
): string {
  const sections: string[] = [];

  // ── Core Identity ──────────────────────────────────────────────────────
  if (cc.persona) {
    sections.push(`# Your Identity\n${cc.persona}`);
  } else {
    sections.push(`# Your Identity\nYou are the AI assistant for "${client.name}".`);
  }

  // ── Detailed Instructions ──────────────────────────────────────────────
  if (cc.instructions) {
    sections.push(`# Instructions\n${cc.instructions}`);
  }

  // ── Template (agency-level defaults) ───────────────────────────────────
  if (ctx.client.template?.soul_template) {
    sections.push(`# Agency Guidelines\n${ctx.client.template.soul_template}`);
  }

  // ── Business Context ───────────────────────────────────────────────────
  const bizContext: string[] = [];

  if (client.industry) {
    bizContext.push(`Industry: ${client.industry}`);
  }

  if (cc.calendar_url) {
    bizContext.push(
      `Booking link: ${cc.calendar_url}`,
      'When a customer wants to schedule, share this link or use the book_appointment tool if you have their preferred time.',
    );
  }

  if (cc.business_hours?.enabled) {
    const { start, end, timezone } = cc.business_hours;
    const isOpen = isWithinBusinessHours(start, end, timezone);
    bizContext.push(
      `Business hours: ${start} – ${end} (${timezone})`,
      isOpen
        ? 'The business is currently OPEN.'
        : 'The business is currently CLOSED. Let the customer know when they can expect a response from the team, but still help them now.',
    );
  }

  if (bizContext.length > 0) {
    sections.push(`# Business Context\n${bizContext.join('\n')}`);
  }

  // ── Communication Channel ──────────────────────────────────────────────
  const channelRules: string[] = [
    `You are responding via ${ctx.messageType}.`,
    `The customer's name/identifier: ${ctx.contactName}`,
  ];

  if (ctx.messageType === 'SMS' || ctx.messageType === 'WhatsApp') {
    channelRules.push(
      'Keep responses concise — SMS/WhatsApp messages should be brief and conversational.',
      'Use short paragraphs. No walls of text.',
      'Avoid markdown formatting (no **bold**, no headers, no bullet lists).',
    );
  } else if (ctx.messageType === 'Email') {
    channelRules.push(
      'Email responses can be more detailed and structured.',
      'Use a professional but friendly tone.',
    );
  } else if (ctx.messageType === 'Live Chat') {
    channelRules.push(
      'Keep responses conversational and quick.',
      'Break long answers into multiple short messages if needed.',
    );
  }

  sections.push(`# Communication\n${channelRules.join('\n')}`);

  // ── Language ───────────────────────────────────────────────────────────
  if (cc.response_language && cc.response_language !== 'English') {
    sections.push(
      `# Language\nAlways respond in ${cc.response_language}. If the customer writes in a different language, still respond in ${cc.response_language} unless they explicitly ask otherwise.`,
    );
  }

  // ── Tool Usage Guidelines ──────────────────────────────────────────────
  sections.push(`# Tools Available
You have access to the following tools:
- **book_appointment**: Book a time on the calendar. Confirm date/time with the customer first.
- **tag_contact**: Label this contact (e.g., "hot-lead", "interested-in-pricing"). Use proactively based on conversation signals.
- **create_opportunity**: Create a sales opportunity when the customer shows buying intent.
- **escalate_to_human**: Flag for human follow-up when you can't help, the customer is upset, or they ask for a person.

Use tools naturally — don't announce "I'm using a tool." Just take the action and confirm the result to the customer.`);

  // ── Core Rules ─────────────────────────────────────────────────────────
  sections.push(`# Core Rules
- Never make up information about the business (services, pricing, hours) that isn't in your instructions.
- If you don't know something, say so honestly and offer to connect them with the team.
- Never reveal that you're an AI unless directly asked. If asked, be honest.
- Be warm, helpful, and professional — like the best employee they've ever interacted with.
- Your goal: help the customer, book appointments, qualify leads, and create a great experience.`);

  return sections.join('\n\n');
}

// ── Messages Array Builder ────────────────────────────────────────────────────

function buildMessagesArray(
  systemPrompt: string,
  memories: string,
  history: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>,
  currentMessage: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [];

  // System prompt with memories injected
  let fullSystem = systemPrompt;
  if (memories) {
    fullSystem += `\n\n# What You Remember About This Customer\n${memories}`;
  }
  messages.push({ role: 'system', content: fullSystem });

  // Conversation history (last N turns)
  for (const turn of history) {
    messages.push({ role: turn.role, content: turn.content });
  }

  // Current message
  messages.push({ role: 'user', content: currentMessage });

  return messages;
}

// ── Relationship Memory Fetcher ───────────────────────────────────────────────

async function fetchRelationshipMemories(
  agencyId: string,
  ghlContactId: string,
  phone?: string | null,
  email?: string | null,
): Promise<string> {
  try {
    const svc = createServiceClientWithoutCookies();

    // Find CRM contact by phone or email (GHL contactId ≠ CRM contactId)
    let crmContactId: string | null = null;

    if (phone) {
      const { data } = await svc
        .from('crm_contacts')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('phone', phone)
        .limit(1);
      if (data?.length) crmContactId = data[0].id;
    }

    if (!crmContactId && email) {
      const { data } = await svc
        .from('crm_contacts')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('email', email)
        .limit(1);
      if (data?.length) crmContactId = data[0].id;
    }

    if (!crmContactId) return '';

    const memories = await getMemories(agencyId, crmContactId);
    return buildMemoryContext(memories);
  } catch {
    return '';
  }
}

// ── Escalation Handler ────────────────────────────────────────────────────────

async function handleEscalation(
  ctx: SmartHandlerContext,
  reason: string,
): Promise<void> {
  const svc = createServiceClientWithoutCookies();

  // Find CRM contact
  let crmContactId: string | null = null;
  if (ctx.contactPhone) {
    const { data } = await svc
      .from('crm_contacts')
      .select('id')
      .eq('agency_id', ctx.client.agency_id)
      .eq('phone', ctx.contactPhone)
      .limit(1);
    if (data?.length) crmContactId = data[0].id;
  }

  if (!crmContactId) return;

  // Log escalation as high-priority CRM activity
  await logActivity(ctx.client.agency_id, {
    contact_id: crmContactId,
    type: 'note',
    subject: `🚨 AI Escalation: ${reason}`,
    body: `The AI assistant flagged this conversation for human follow-up.\n\nReason: ${reason}\nChannel: ${ctx.messageType}\nContact: ${ctx.contactName}\nLast message: "${ctx.messageBody.slice(0, 200)}"`,
    direction: 'inbound',
    channel: 'system',
    actor: 'ai',
    actor_name: 'AI Worker',
    needs_attention: true,
    attention_type: 'escalation',
    metadata: {
      escalation_reason: reason,
      ghl_contact_id: ctx.contactId,
      message_type: ctx.messageType,
    },
  });

  console.log(`[smart-handler] 🚨 Escalation logged for ${ctx.contactName}: ${reason}`);
}

// ── Wake Word Checker ─────────────────────────────────────────────────────────

function checkWakeWords(
  message: string,
  wakeWords?: Array<{ keyword: string; action: string }>,
): { keyword: string; action: string } | null {
  if (!wakeWords || wakeWords.length === 0) return null;

  const lower = message.toLowerCase();
  for (const ww of wakeWords) {
    if (ww.keyword && lower.includes(ww.keyword.toLowerCase())) {
      return ww;
    }
  }
  return null;
}

// ── Business Hours Helper ─────────────────────────────────────────────────────

function isWithinBusinessHours(
  start: string,
  end: string,
  timezone: string,
): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const currentTime = formatter.format(now); // "14:30"

    return currentTime >= start && currentTime <= end;
  } catch {
    // If timezone is invalid, assume open
    return true;
  }
}
