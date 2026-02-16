// ============================================================================
// POST /api/crm/webhook (renamed from /api/ghl/webhook — GHL blocks "ghl" in URLs)
//
// Receives GHL webhooks (inbound messages, contact updates, opportunity
// changes, appointment events, etc.).
//
// Flow:
// 1. Parse the webhook payload
// 2. Identify which agency_client this belongs to (via ghl_location_id)
// 3. Forward relevant events to the client's OpenClaw container
// 4. Respond 200 OK quickly (GHL expects fast responses)
//
// Webhook types we handle:
// - InboundMessage   → Forward to AI for response
// - ContactCreate    → Log new contact
// - ContactUpdate    → Update AI's context
// - OpportunityStageUpdate → Notify AI of pipeline changes
// - AppointmentCreate/Update → Calendar sync
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import type { GHLWebhookPayload, GHLWebhookEventType } from '@/lib/ghl/types';

// Events that should be forwarded to the AI container
const FORWARDABLE_EVENTS: Set<GHLWebhookEventType> = new Set([
  'InboundMessage',
  'ContactCreate',
  'ContactUpdate',
  'ContactTagUpdate',
  'OpportunityCreate',
  'OpportunityStageUpdate',
  'OpportunityStatusUpdate',
  'AppointmentCreate',
  'AppointmentUpdate',
  'AppointmentDelete',
]);

export async function POST(request: NextRequest) {
  let payload: GHLWebhookPayload;

  try {
    payload = (await request.json()) as GHLWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, locationId } = payload;

  if (!type || !locationId) {
    console.warn('[ghl/webhook] Missing type or locationId:', { type, locationId });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  console.log(`[ghl/webhook] Received: ${type} for location ${locationId}`);

  // ── Look up the agency_client by GHL location ID ──────────────────────
  const supabase = createServiceClientWithoutCookies();

  const { data: agencyClient, error: lookupError } = await supabase
    .from('agency_clients')
    .select('id, agency_id, name, status, ghl_access_token')
    .eq('ghl_location_id', locationId)
    .single();

  if (lookupError || !agencyClient) {
    console.warn(
      `[ghl/webhook] No agency_client found for location ${locationId}`,
    );
    // Still return 200 so GHL doesn't retry
    return NextResponse.json({ received: true, matched: false }, { status: 200 });
  }

  // Skip if client is inactive
  if (agencyClient.status === 'inactive' || agencyClient.status === 'suspended') {
    console.log(
      `[ghl/webhook] Skipping — client ${agencyClient.id} is ${agencyClient.status}`,
    );
    return NextResponse.json({ received: true, skipped: true }, { status: 200 });
  }

  // ── Log the webhook event ─────────────────────────────────────────────
  try {
    await supabase.from('ghl_webhook_events').insert({
      id: crypto.randomUUID(),
      agency_client_id: agencyClient.id,
      event_type: type,
      location_id: locationId,
      payload: payload,
      processed: false,
      created_at: new Date().toISOString(),
    });
  } catch (logError) {
    // Non-fatal — don't block webhook processing
    console.error('[ghl/webhook] Failed to log event:', logError);
  }

  // ── Forward to the client's OpenClaw container ────────────────────────
  if (FORWARDABLE_EVENTS.has(type)) {
    try {
      await forwardToContainer(agencyClient.id, agencyClient.agency_id, payload);
    } catch (forwardError) {
      console.error(
        `[ghl/webhook] Failed to forward to container for client ${agencyClient.id}:`,
        forwardError,
      );
      // Still return 200 — we logged the event, we can retry later
    }
  }

  return NextResponse.json({ received: true, matched: true }, { status: 200 });
}

// ── Forward to Container ──────────────────────────────────────────────────────

async function forwardToContainer(
  clientId: string,
  agencyId: string,
  payload: GHLWebhookPayload,
): Promise<void> {
  const workerUrl = process.env.KYRA_WORKER_URL;
  const apiSecret = process.env.KYRA_API_SECRET;

  if (!workerUrl || !apiSecret) {
    console.warn(
      '[ghl/webhook] Missing KYRA_WORKER_URL or KYRA_API_SECRET — cannot forward',
    );
    return;
  }

  // Build message context based on event type
  let message: string;

  switch (payload.type) {
    case 'InboundMessage': {
      const from = payload.phone || payload.email || 'unknown';
      const channel = payload.messageType || 'unknown';
      message = [
        `[GHL Inbound Message]`,
        `From: ${from}`,
        `Channel: ${channel}`,
        `Contact ID: ${payload.contactId || 'unknown'}`,
        `Conversation ID: ${payload.conversationId || 'unknown'}`,
        `Message: ${payload.body || '(no body)'}`,
      ].join('\n');
      break;
    }

    case 'ContactCreate':
    case 'ContactUpdate':
    case 'ContactTagUpdate':
      message = [
        `[GHL ${payload.type}]`,
        `Contact ID: ${payload.contactId || payload.id || 'unknown'}`,
        `Location: ${payload.locationId}`,
        `Details: ${JSON.stringify(payload, null, 2)}`,
      ].join('\n');
      break;

    case 'OpportunityCreate':
    case 'OpportunityStageUpdate':
    case 'OpportunityStatusUpdate':
      message = [
        `[GHL ${payload.type}]`,
        `Opportunity ID: ${payload.id || 'unknown'}`,
        `Contact ID: ${payload.contactId || 'unknown'}`,
        `Details: ${JSON.stringify(payload, null, 2)}`,
      ].join('\n');
      break;

    case 'AppointmentCreate':
    case 'AppointmentUpdate':
    case 'AppointmentDelete':
      message = [
        `[GHL ${payload.type}]`,
        `Appointment ID: ${payload.id || 'unknown'}`,
        `Contact ID: ${payload.contactId || 'unknown'}`,
        `Details: ${JSON.stringify(payload, null, 2)}`,
      ].join('\n');
      break;

    default:
      message = `[GHL ${payload.type}] ${JSON.stringify(payload)}`;
  }

  // Forward to the worker which routes to the correct container
  const res = await fetch(`${workerUrl}/api/ghl/inbound`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiSecret}`,
      'X-Kyra-Agency-Id': agencyId,
      'X-Kyra-Client-Id': clientId,
    },
    body: JSON.stringify({
      clientId,
      agencyId,
      eventType: payload.type,
      message,
      contactId: payload.contactId || payload.id,
      conversationId: payload.conversationId,
      locationId: payload.locationId,
      rawPayload: payload,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Worker returned ${res.status}: ${text}`);
  }
}
