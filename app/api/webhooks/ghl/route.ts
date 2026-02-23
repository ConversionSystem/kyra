import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getSessionKeyForClient } from '@/lib/agency/container';
import type {
  GHLWebhookPayload,
  GHLMessagePayload,
  GHLContactPayload,
  GHLOpportunityPayload,
  GHLAppointmentPayload,
  GHLCallPayload,
  GHLFormSubmissionPayload,
  GHLConversationPayload,
  GHLWebhookEventType,
} from '@/lib/ghl/webhook-types';

// ============================================================================
// GHL Webhook Handler — POST /api/webhooks/ghl
//
// Receives all inbound webhooks from GoHighLevel, routes them to the correct
// agency client's OpenClaw container based on locationId → agency_client mapping.
//
// For InboundMessage events, forwards to the client's container via the
// Fly.io bridge at KYRA_WORKER_URL/chat so the AI can respond.
// ============================================================================

import { getGatewayByClientId } from '@/lib/ovh/gateway-resolver';
import { sendGHLMessage, getValidToken } from '@/lib/ghl/api';

const API_SECRET = process.env.KYRA_API_SECRET;

/**
 * POST /api/webhooks/ghl
 *
 * GHL sends webhooks here for all registered events.
 * We return 200 immediately and process asynchronously where possible.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  let body: GHLWebhookPayload;
  try {
    body = (await request.json()) as GHLWebhookPayload;
  } catch {
    console.error('[ghl-webhook] Invalid JSON payload');
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { type, locationId } = body;

  if (!type || !locationId) {
    console.warn('[ghl-webhook] Missing type or locationId:', { type, locationId });
    return NextResponse.json({ error: 'Missing type or locationId' }, { status: 400 });
  }

  console.log(`[ghl-webhook] ${type} from location ${locationId}`);

  // --- Look up which agency client owns this GHL location ---
  const supabase = createServiceClientWithoutCookies();

  const { data: client, error: clientError } = await supabase
    .from('agency_clients')
    .select('id, agency_id, name, slug, industry, status, container_config, template_id')
    .eq('ghl_location_id', locationId)
    .single();

  if (clientError || !client) {
    console.warn(`[ghl-webhook] No client found for location ${locationId}`);
    // Still return 200 — don't make GHL retry for unmapped locations
    await logWebhookEvent(supabase, {
      locationId,
      eventType: type,
      clientId: null,
      status: 'unrouted',
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json({ ok: true, routed: false });
  }

  if (client.status !== 'active') {
    console.log(`[ghl-webhook] Client ${client.id} (${client.name}) is ${client.status}, skipping`);
    await logWebhookEvent(supabase, {
      locationId,
      eventType: type,
      clientId: client.id,
      status: 'skipped_inactive',
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json({ ok: true, routed: false, reason: 'client_inactive' });
  }

  // --- Route based on event type ---
  try {
    switch (type) {
      case 'InboundMessage':
        await handleInboundMessage(body as GHLMessagePayload, client);
        break;

      case 'OutboundMessage':
        // Log outbound messages for context but don't trigger AI
        await handleOutboundMessage(body as GHLMessagePayload, client);
        break;

      case 'ContactCreate':
      case 'ContactUpdate':
      case 'ContactDelete':
      case 'ContactDndUpdate':
      case 'ContactTagUpdate':
        await handleContactEvent(body as GHLContactPayload, client);
        break;

      case 'OpportunityCreate':
      case 'OpportunityUpdate':
      case 'OpportunityStageUpdate':
      case 'OpportunityMonetaryValueUpdate':
      case 'OpportunityAssignedToUpdate':
      case 'OpportunityDelete':
        await handleOpportunityEvent(body as GHLOpportunityPayload, client);
        break;

      case 'AppointmentCreate':
      case 'AppointmentUpdate':
      case 'AppointmentDelete':
        await handleAppointmentEvent(body as GHLAppointmentPayload, client);
        break;

      case 'CallCompleted':
        await handleCallCompleted(body as GHLCallPayload, client);
        break;

      case 'FormSubmission':
        await handleFormOrSurveySubmission(body as GHLFormSubmissionPayload, 'form', client);
        break;

      case 'SurveySubmission':
        await handleFormOrSurveySubmission(body as unknown as GHLFormSubmissionPayload, 'survey', client);
        break;

      case 'ConversationUnreadUpdate':
        await handleConversationUpdate(body as GHLConversationPayload, client);
        break;

      default:
        console.log(`[ghl-webhook] Unhandled event type: ${type}`);
    }

    await logWebhookEvent(supabase, {
      locationId,
      eventType: type,
      clientId: client.id,
      status: 'processed',
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error(`[ghl-webhook] Error processing ${type} for client ${client.id}:`, error);
    await logWebhookEvent(supabase, {
      locationId,
      eventType: type,
      clientId: client.id,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });
  }

  // Always return 200 — GHL retries on non-2xx and we don't want that
  return NextResponse.json({ ok: true, routed: true });
}

// ============================================================================
// Event handlers
// ============================================================================

interface ClientRecord {
  id: string;
  agency_id: string;
  name: string;
  slug: string;
  industry: string;
  status: string;
  container_config: Record<string, unknown>;
  template_id: string | null;
}

/**
 * Handle inbound messages — the core flow.
 * Extracts message details and forwards to the client's OpenClaw container.
 */
async function handleInboundMessage(
  payload: GHLMessagePayload,
  client: ClientRecord
): Promise<void> {
  const {
    body: messageText,
    messageType: channel,
    contactId,
    conversationId,
    messageId,
    firstName,
    lastName,
    contactName,
    email,
    phone,
    contentType,
    attachments,
  } = payload;

  // Build contact display name
  const name =
    contactName ||
    [firstName, lastName].filter(Boolean).join(' ') ||
    phone ||
    email ||
    'Unknown Contact';

  // For non-text content, describe the attachment
  let messageContent = messageText || '';
  if (contentType !== 'text' && attachments?.length) {
    const attachmentDesc = attachments
      .map((a) => `[${a.contentType || contentType}: ${a.fileName || a.url}]`)
      .join(', ');
    messageContent = messageContent
      ? `${messageContent}\n${attachmentDesc}`
      : attachmentDesc;
  }

  if (!messageContent) {
    console.log('[ghl-webhook] Empty inbound message, skipping');
    return;
  }

  // Format the message for the AI container
  const channelLabel = formatChannelName(channel);
  const formattedMessage = `[GHL] Inbound ${channelLabel} from ${name}: ${messageContent}`;

  // Build system context with all available contact info
  const systemContext = buildInboundSystemContext({
    clientName: client.name,
    clientIndustry: client.industry,
    contactName: name,
    contactEmail: email,
    contactPhone: phone,
    contactId,
    conversationId,
    channel: channelLabel,
    messageId,
  });

  console.log(
    `[ghl-webhook] 📨 Inbound ${channelLabel} for "${client.name}" from ${name}: ${messageContent.slice(0, 100)}...`
  );

  // Forward to container and send reply back via GHL
  await forwardToContainer(client.id, formattedMessage, systemContext, client.agency_id, {
    contactId: contactId ?? undefined,
    messageType: channel ?? 'TYPE_SMS',
  });
}

/**
 * Handle outbound messages — log for context, don't trigger AI.
 */
async function handleOutboundMessage(
  payload: GHLMessagePayload,
  client: ClientRecord
): Promise<void> {
  console.log(
    `[ghl-webhook] 📤 Outbound ${payload.messageType} for "${client.name}" to ${payload.contactName || payload.phone || 'unknown'}`
  );
  // Future: store in conversation history for the AI's context
}

/**
 * Handle contact events — notify the AI about new/updated contacts.
 */
async function handleContactEvent(
  payload: GHLContactPayload,
  client: ClientRecord
): Promise<void> {
  const contactName = payload.name || [payload.firstName, payload.lastName].filter(Boolean).join(' ') || 'Unknown';

  if (payload.type === 'ContactCreate') {
    const message = `[GHL] New contact created: ${contactName}${payload.email ? ` (${payload.email})` : ''}${payload.phone ? ` — ${payload.phone}` : ''}${payload.source ? ` — Source: ${payload.source}` : ''}`;

    const systemContext = `A new contact was created in the GHL CRM for "${client.name}". You may want to note this for future reference. Do NOT send any outbound messages unless specifically configured to do so for new leads.`;

    await forwardToContainer(client.id, message, systemContext, client.agency_id);
  }
  // ContactUpdate and ContactDelete are logged but don't trigger AI
}

/**
 * Handle opportunity/pipeline events — important for sales-focused clients.
 */
async function handleOpportunityEvent(
  payload: GHLOpportunityPayload,
  client: ClientRecord
): Promise<void> {
  const { type: eventType, name: oppName, status, monetaryValue } = payload;

  if (eventType === 'OpportunityCreate') {
    const valueStr = monetaryValue ? ` ($${(monetaryValue / 100).toFixed(2)})` : '';
    const message = `[GHL] New opportunity created: "${oppName}"${valueStr} — Status: ${status}`;
    const systemContext = `A new opportunity was added to the pipeline for "${client.name}". Note this for pipeline tracking.`;
    await forwardToContainer(client.id, message, systemContext, client.agency_id);
  }

  if (eventType === 'OpportunityStageUpdate') {
    const message = `[GHL] Opportunity "${oppName}" moved to a new pipeline stage — Status: ${status}`;
    const systemContext = `An opportunity changed stages in the pipeline for "${client.name}". Track this for pipeline health reports.`;
    await forwardToContainer(client.id, message, systemContext, client.agency_id);
  }
}

/**
 * Handle appointment events — time-sensitive, may need reminders.
 */
async function handleAppointmentEvent(
  payload: GHLAppointmentPayload,
  client: ClientRecord
): Promise<void> {
  const { type: eventType, title, startTime, appointmentStatus, contactId } = payload;

  if (eventType === 'AppointmentCreate') {
    const message = `[GHL] New appointment booked: "${title || 'Untitled'}" at ${startTime} — Status: ${appointmentStatus}`;
    const systemContext = `A new appointment was booked via GHL for "${client.name}". Contact ID: ${contactId}. Consider sending a confirmation or reminder at the appropriate time.`;
    await forwardToContainer(client.id, message, systemContext, client.agency_id);
  }

  if (eventType === 'AppointmentUpdate') {
    const message = `[GHL] Appointment updated: "${title || 'Untitled'}" — now ${startTime}, status: ${appointmentStatus}`;
    await forwardToContainer(
      client.id,
      message,
      `An appointment was updated for "${client.name}".`,
      client.agency_id
    );
  }
}

/**
 * Handle completed calls — useful for follow-up automation.
 */
async function handleCallCompleted(
  payload: GHLCallPayload,
  client: ClientRecord
): Promise<void> {
  const durationStr = payload.duration ? `${Math.ceil(payload.duration / 60)} min` : 'unknown duration';
  const message = `[GHL] Call completed (${payload.direction}): ${payload.from} → ${payload.to} — ${payload.status}, ${durationStr}`;

  if (payload.direction === 'inbound' && payload.status === 'no-answer') {
    // Missed call — the AI might want to follow up
    const systemContext = `A call was missed for "${client.name}". Contact ID: ${payload.contactId}. Consider following up with the caller.`;
    await forwardToContainer(client.id, message, systemContext, client.agency_id);
  }
  // Other call events are logged but don't trigger AI
}

/**
 * Handle form/survey submissions — new lead intake.
 */
async function handleFormOrSurveySubmission(
  payload: GHLFormSubmissionPayload,
  kind: 'form' | 'survey',
  client: ClientRecord
): Promise<void> {
  const formName = payload.formName || payload.formId;
  const fields = Object.entries(payload.data || {})
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  const message = `[GHL] New ${kind} submission: "${formName}"\n${fields}`;
  const systemContext = `A new ${kind} was submitted for "${client.name}". Contact ID: ${payload.contactId}. This may be a new lead or inquiry.`;
  await forwardToContainer(client.id, message, systemContext, client.agency_id);
}

/**
 * Handle conversation unread updates — track response needs.
 */
async function handleConversationUpdate(
  payload: GHLConversationPayload,
  client: ClientRecord
): Promise<void> {
  if (payload.unreadCount && payload.unreadCount > 0) {
    console.log(
      `[ghl-webhook] 💬 Unread count for client "${client.name}": ${payload.unreadCount}`
    );
  }
  // Logged for heartbeat tracking; don't trigger AI directly
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Forward a message to the client's OpenClaw container via the bridge.
 * Fire-and-forget — we don't wait for the AI response.
 */
async function forwardToContainer(
  clientId: string,
  message: string,
  systemContext: string,
  agencyId?: string,
  reply?: { contactId?: string; messageType?: string }
): Promise<void> {
  // Shared Supabase service client for conversation logging
  const supabase = createServiceClientWithoutCookies();

  // Resolve the client's own gateway (OVH per-client isolation)
  const clientGateway = await getGatewayByClientId(clientId);
  const workerUrl = clientGateway?.url;

  if (!workerUrl) {
    console.warn(`[ghl-webhook] No gateway provisioned for client ${clientId}`);
    return;
  }

  const sessionKey = getSessionKeyForClient(clientId);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    // Build OpenAI-compatible messages for /v1/chat/completions
    const chatMessages: Array<{ role: string; content: string }> = [];
    if (systemContext) {
      chatMessages.push({ role: 'system', content: systemContext });
    }
    chatMessages.push({ role: 'user', content: message });

    const response = await fetch(`${workerUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientGateway?.token || API_SECRET}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: chatMessages,
        stream: false,
        tool_choice: 'none',  // Disable tool/function calls — GHL responses must be plain text
        max_tokens: 500,       // Keep responses concise for SMS/messaging channels
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown');
      console.error(
        `[ghl-webhook] Bridge returned ${response.status} for client ${clientId}: ${errorText}`
      );
      return;
    }

    // Parse AI response and send back via GHL
    const completion = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const aiText = completion?.choices?.[0]?.message?.content?.trim();

    if (!aiText) {
      console.warn(`[ghl-webhook] Empty AI response for client ${clientId}`);
      return;
    }

    console.log(`[ghl-webhook] ✅ AI response (${aiText.length} chars) for client ${clientId}`);

    // ── Log conversation to client_conversations ──────────────────────────────
    if (agencyId) {
      const channelLabel = reply?.messageType
        ? (reply.messageType.replace('TYPE_', '').toLowerCase())
        : 'sms';
      const tokensUsed = (completion as { usage?: { total_tokens?: number } })
        .usage?.total_tokens ?? null;

      supabase
        .from('client_conversations')
        .insert({
          client_id: clientId,
          agency_id: agencyId,
          channel: channelLabel,
          user_message: message,
          ai_response: aiText,
          tokens_used: tokensUsed,
          created_at: new Date().toISOString(),
        })
        .then(({ error: logErr }) => {
          if (logErr) console.warn('[ghl-webhook] Failed to log conversation:', logErr.message);
          else console.log(`[ghl-webhook] 📝 Conversation logged for client ${clientId}`);
        });
    }

    // ── Send reply back via GHL ───────────────────────────────────────────────
    if (reply?.contactId) {
      try {
        const accessToken = await getValidToken(clientId);
        await sendGHLMessage(
          clientId,
          accessToken,
          reply.contactId,
          aiText,
          reply.messageType ?? 'TYPE_SMS',
        );
        console.log(`[ghl-webhook] 📤 Sent AI reply to contact ${reply.contactId} via ${reply.messageType}`);
      } catch (sendErr) {
        console.error(`[ghl-webhook] Failed to send GHL reply for client ${clientId}:`, sendErr);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[ghl-webhook] Bridge request timed out for client ${clientId}`);
    } else {
      console.error(`[ghl-webhook] Bridge request failed for client ${clientId}:`, error);
    }
  }
}

/**
 * Build rich system context for inbound messages.
 */
function buildInboundSystemContext(info: {
  clientName: string;
  clientIndustry: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  contactId: string;
  conversationId: string;
  channel: string;
  messageId: string;
}): string {
  // Build accurate current date/time context so the AI knows exactly when it is
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const dayName = days[now.getUTCDay()];
  const monthName = months[now.getUTCMonth()];
  const dateStr = `${dayName}, ${monthName} ${now.getUTCDate()}, ${now.getUTCFullYear()}`;
  const timeStr = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  const lines = [
    `You are the AI assistant for "${info.clientName}" (industry: ${info.clientIndustry}).`,
    `This is an inbound ${info.channel} message from a customer via GoHighLevel.`,
    '',
    '--- Current Date & Time ---',
    `Today is: ${dateStr}`,
    `Current time: ${timeStr}`,
    `ISO 8601: ${now.toISOString()}`,
    'IMPORTANT: Always use the current year and date above when scheduling appointments.',
    'Never use dates from the past. If a customer mentions a day like "Tuesday the 24th",',
    'calculate the correct upcoming date relative to today\'s date shown above.',
    '',
    '--- Contact Info ---',
    `Name: ${info.contactName}`,
  ];

  if (info.contactEmail) lines.push(`Email: ${info.contactEmail}`);
  if (info.contactPhone) lines.push(`Phone: ${info.contactPhone}`);
  lines.push(`GHL Contact ID: ${info.contactId}`);
  lines.push(`GHL Conversation ID: ${info.conversationId}`);
  lines.push(`GHL Message ID: ${info.messageId}`);

  lines.push('');
  lines.push('--- Scheduling & Appointments ---');
  lines.push('If a customer asks to book, schedule, or set up a meeting/appointment:');
  lines.push('1. DO NOT use any internal calendar or scheduling tools (schedule.at, cron, etc.)');
  lines.push('2. DO NOT say "I will schedule your meeting" — you cannot book directly via SMS.');
  lines.push('3. INSTEAD: Send them the booking link and invite them to pick a time.');
  lines.push('4. Keep it short: "Great! Book here: [link] — takes 2 min."');
  lines.push('5. NEVER include error messages, tool output, or system text in your reply.');
  lines.push('6. Your reply must ONLY contain what the customer should read.');
  lines.push('');
  lines.push('--- Response Guidelines ---');
  lines.push(`Channel: ${info.channel}`);

  if (info.channel === 'SMS') {
    lines.push('Keep your response SHORT — SMS has character limits. Be concise and actionable.');
    lines.push('Max ~160 characters per segment. Stay under 320 characters if possible.');
    lines.push('No markdown, no asterisks, no bullet points — plain text only for SMS.');
  } else if (info.channel === 'Email') {
    lines.push('You may write a longer, more detailed response for email.');
    lines.push('Use professional formatting with greeting and sign-off.');
  } else if (info.channel === 'WhatsApp') {
    lines.push('WhatsApp allows longer messages but keep it conversational.');
    lines.push('You can use basic formatting: *bold*, _italic_, ~strikethrough~.');
  } else {
    lines.push('Respond naturally and helpfully. Match the tone of the channel.');
  }

  lines.push('');
  lines.push('CRITICAL: Your response is sent DIRECTLY to the customer. It must be clean,');
  lines.push('professional, and contain ONLY what a human would want to read. No system');
  lines.push('messages, no error text, no tool output, no internal notes. Just your reply.');

  return lines.join('\n');
}

/**
 * Format GHL channel type to a human-readable label.
 */
function formatChannelName(channel: string): string {
  const channelMap: Record<string, string> = {
    SMS: 'SMS',
    Email: 'Email',
    WhatsApp: 'WhatsApp',
    GMB: 'Google Business',
    FB: 'Facebook Messenger',
    IG: 'Instagram DM',
    Live_Chat: 'Live Chat',
  };
  return channelMap[channel] || channel;
}

/**
 * Log webhook event to the database for monitoring and debugging.
 */
async function logWebhookEvent(
  supabase: ReturnType<typeof createServiceClientWithoutCookies>,
  event: {
    locationId: string;
    eventType: GHLWebhookEventType | string;
    clientId: string | null;
    status: 'processed' | 'unrouted' | 'skipped_inactive' | 'error';
    error?: string;
    durationMs: number;
  }
): Promise<void> {
  try {
    await supabase.from('ghl_webhook_logs').insert({
      location_id: event.locationId,
      event_type: event.eventType,
      client_id: event.clientId,
      status: event.status,
      error_message: event.error || null,
      duration_ms: event.durationMs,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Don't fail the webhook if logging fails
    console.error('[ghl-webhook] Failed to log event:', err);
  }
}
