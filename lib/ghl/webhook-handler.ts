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
import type { GHLWebhookPayload, GHLMessageChannel } from './types';
import type { AgencyClient, AgencyTemplate } from '@/lib/agency/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientWithTemplate extends AgencyClient {
  template?: AgencyTemplate | null;
}

// ── Main Handler ──────────────────────────────────────────────────────────────

/**
 * Process an inbound GHL message end-to-end:
 * 1. Build system context from client config
 * 2. Call Fly bridge for AI response
 * 3. Send AI response back via GHL API
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

  // Build the session key (unique per client + contact for conversation continuity)
  const sessionKey = `${getSessionKeyForClient(client.id)}:contact:${contactId}`;

  // Build system prompt with GHL context
  const systemContext = getSystemPromptForClient(client, client.template, {
    messageType: formatChannelName(messageType),
    contactName,
  });

  console.log(
    `[ghl/handler] Processing inbound from ${contactName} for client "${client.name}" via ${messageType}`,
  );

  // ── Call the agency's own gateway ────────────────────────────────────
  const clientGateway = await getGatewayByClientId(client.id);
  const bridgeUrl = clientGateway?.url;
  if (!bridgeUrl) {
    throw new Error(`No gateway provisioned for client ${client.id} (${client.name})`);
  }

  const aiResponse = await callBridge(bridgeUrl, {
    message: messageBody,
    sessionKey,
    systemContext,
  });

  if (!aiResponse || aiResponse.trim().length === 0) {
    console.warn('[ghl/handler] Empty AI response, not sending reply');
    return;
  }

  console.log(
    `[ghl/handler] AI response (${aiResponse.length} chars), sending via ${messageType}`,
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
}

// ── Bridge Communication ──────────────────────────────────────────────────────

interface BridgeRequest {
  message: string;
  sessionKey: string;
  systemContext: string;
}

/**
 * Call the Fly.io bridge and parse the SSE response.
 * The bridge streams events like:
 *   data: {"type":"content","text":"Hello"}
 *   data: {"type":"done"}
 *
 * We collect all content events and return the full response text.
 */
async function callBridge(bridgeUrl: string, req: BridgeRequest): Promise<string> {
  const res = await fetch(`${bridgeUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal: AbortSignal.timeout(120_000), // 2 min timeout for AI generation
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Bridge returned ${res.status}: ${text}`);
  }

  // Parse SSE stream
  const body = await res.text();
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
