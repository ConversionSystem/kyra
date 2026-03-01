// ============================================================================
// GHL Webhook Handler — Core processing logic for inbound messages
//
// Extracted from the webhook route so it can run as background work
// via Vercel's waitUntil while the route returns 200 immediately.
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getSystemPromptForClient, getSessionKeyForClient } from '@/lib/agency/container';
import { sendGHLMessage, getValidToken } from './api';
import { getGatewayByClientId } from '@/lib/ovh/gateway-resolver';
import { logConversationToCrm } from '@/lib/crm/conversation-logger';
import { processWithSmartEngine } from './smart-handler';
import type { GHLWebhookPayload, GHLMessageChannel } from './types';
import type { AgencyClient, AgencyTemplate } from '@/lib/agency/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientWithTemplate extends AgencyClient {
  template?: AgencyTemplate | null;
}

// ── Main Handler ──────────────────────────────────────────────────────────────

/**
 * Process an inbound GHL message end-to-end:
 *
 * PRIMARY PATH (Smart Engine):
 *   1. Build rich system prompt from container_config (persona, instructions, hours, language)
 *   2. Fetch conversation history (last 10 messages for this contact)
 *   3. Fetch relationship memories from CRM
 *   4. Call LLM directly with GHL tools (function calling)
 *   5. Execute tool calls (book, tag, create opportunity, escalate)
 *   6. Save conversation turn for future memory
 *
 * FALLBACK PATH (Bridge relay — if Smart Engine fails):
 *   Same as before: gateway bridge → generic response
 */
export async function processInboundMessage(
  payload: GHLWebhookPayload,
  client: ClientWithTemplate,
): Promise<void> {
  const messageBody = payload.body;
  if (!messageBody) {
    console.log('[ghl/handler] No message body, skipping');
    return;
  }

  const contactId = payload.contactId;
  if (!contactId) {
    console.warn('[ghl/handler] No contactId in payload, skipping');
    return;
  }

  const messageType = payload.messageType || 'TYPE_SMS';
  const contactName = payload.phone || payload.email || 'Customer';

  console.log(
    `[ghl/handler] Processing inbound from ${contactName} for client "${client.name}" via ${messageType}`,
  );

  // ── Try Smart Engine first ────────────────────────────────────────────
  let aiResponse: string;
  let usedSmartEngine = false;

  try {
    const result = await processWithSmartEngine({
      client: { ...client, template: client.template ?? null },
      contactId,
      contactName,
      contactPhone: payload.phone,
      contactEmail: payload.email,
      conversationId: payload.conversationId,
      messageType: formatChannelName(messageType),
      messageBody,
    });

    aiResponse = result.reply;
    usedSmartEngine = true;

    console.log(
      `[ghl/handler] Smart Engine: ${result.responseTimeMs}ms | Tools: [${result.toolsUsed.join(', ')}] | Escalated: ${result.escalated}`,
    );
  } catch (smartErr) {
    // Smart Engine failed — fall back to bridge relay
    console.warn('[ghl/handler] Smart Engine failed, falling back to bridge:', smartErr);

    const sessionKey = `${getSessionKeyForClient(client.id)}:contact:${contactId}`;
    const systemContext = getSystemPromptForClient(client, client.template, {
      messageType: formatChannelName(messageType),
      contactName,
    });

    const clientGateway = await getGatewayByClientId(client.id);
    const bridgeUrl = clientGateway?.url;
    if (!bridgeUrl) {
      throw new Error(`No gateway provisioned for client ${client.id} (${client.name})`);
    }

    aiResponse = await callBridge(bridgeUrl, {
      message: messageBody,
      sessionKey,
      systemContext,
    });
  }

  if (!aiResponse || aiResponse.trim().length === 0) {
    console.warn('[ghl/handler] Empty AI response, not sending reply');
    return;
  }

  console.log(
    `[ghl/handler] AI response (${aiResponse.length} chars) via ${usedSmartEngine ? 'Smart Engine' : 'Bridge'}, sending via ${messageType}`,
  );

  // ── Send reply back through GHL ───────────────────────────────────────
  const accessToken = await getValidToken(client.id);

  await sendGHLMessage(
    client.id,
    accessToken,
    contactId,
    aiResponse,
    messageType,
  );

  // ── Mark webhook event as processed ───────────────────────────────────
  try {
    const supabase = createServiceClientWithoutCookies();
    await supabase
      .from('ghl_webhook_events')
      .update({ processed: true })
      .eq('agency_client_id', client.id)
      .eq('event_type', 'InboundMessage')
      .eq('processed', false)
      .order('created_at', { ascending: false })
      .limit(1);
  } catch (err) {
    // Non-fatal
    console.error('[ghl/handler] Failed to mark event processed:', err);
  }

  console.log(`[ghl/handler] ✅ Reply sent to ${contactName} for "${client.name}"`);

  // ── Log both sides to CRM ──────────────────────────────────────────────
  // (Smart Engine already saves to client_conversations, but CRM logging
  //  is separate — it creates CRM activities + extracts relationship memories)
  const agencyId = client.agency_id;
  if (agencyId) {
    logConversationToCrm(agencyId, {
      type: 'InboundMessage',
      contactId,
      phone: payload.phone,
      email: payload.email,
      body: messageBody,
      messageType: messageType,
      direction: 'inbound',
      firstName: payload.phone || undefined,
      name: contactName,
    }).catch((err) => console.error('[ghl/handler] CRM log inbound failed:', err));

    logConversationToCrm(agencyId, {
      type: 'OutboundMessage',
      contactId,
      phone: payload.phone,
      email: payload.email,
      body: aiResponse,
      messageType: messageType,
      direction: 'outbound',
      name: 'AI Worker',
    }).catch((err) => console.error('[ghl/handler] CRM log outbound failed:', err));
  }
}

// ── Bridge Communication ──────────────────────────────────────────────────────

interface BridgeRequest {
  message: string;
  sessionKey: string;
  systemContext: string;
}

/**
 * Call the OpenClaw gateway's /v1/chat/completions endpoint.
 * Translates from Kyra's bridge format to OpenAI-compatible format.
 */
async function callBridge(bridgeUrl: string, req: BridgeRequest): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [];
  if (req.systemContext) {
    messages.push({ role: 'system', content: req.systemContext });
  }
  messages.push({ role: 'user', content: req.message });

  const res = await fetch(`${bridgeUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages,
      stream: false,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Bridge returned ${res.status}: ${text}`);
  }

  // Parse the response — non-streaming returns OpenAI JSON directly
  const body = await res.text();
  try {
    const json = JSON.parse(body);
    // OpenAI format: { choices: [{ message: { content: "..." } }] }
    if (json.choices?.[0]?.message?.content) {
      return json.choices[0].message.content;
    }
  } catch {
    // Fall through to SSE parsing
  }
  return parseSSEResponse(body);
}

/**
 * Parse an SSE text body into the full AI response.
 * Lines look like: `data: {"type":"content","text":"chunk"}`
 */
function parseSSEResponse(sseBody: string): string {
  const chunks: string[] = [];

  for (const line of sseBody.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;

    const jsonStr = trimmed.slice(5).trim();
    if (!jsonStr || jsonStr === '[DONE]') continue;

    try {
      const event = JSON.parse(jsonStr);

      // Content chunks — bridge sends { type: "content", content: "..." }
      if (event.type === 'content' && (event.content || event.text)) {
        chunks.push(event.content || event.text);
      }

      // Done event includes the full concatenated response
      if (event.type === 'done' && event.fullResponse) {
        return event.fullResponse;
      }

      if (event.type === 'done') {
        break;
      }
    } catch {
      // Skip malformed SSE lines
      console.warn('[ghl/handler] Malformed SSE line:', trimmed);
    }
  }

  return chunks.join('');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert GHL message channel enum to a human-readable name.
 */
function formatChannelName(channel: GHLMessageChannel): string {
  const map: Record<GHLMessageChannel, string> = {
    TYPE_SMS: 'SMS',
    TYPE_EMAIL: 'Email',
    TYPE_WHATSAPP: 'WhatsApp',
    TYPE_FB_MESSENGER: 'Facebook Messenger',
    TYPE_INSTAGRAM: 'Instagram DM',
    TYPE_LIVE_CHAT: 'Live Chat',
    TYPE_CALL: 'Phone Call',
  };
  return map[channel] || channel;
}
