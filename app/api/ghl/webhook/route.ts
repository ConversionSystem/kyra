// ============================================================================
// POST /api/ghl/webhook
//
// Receives GHL webhooks (inbound messages, contact updates, etc.).
//
// Flow:
// 1. Parse the webhook payload
// 2. Identify which agency_client this belongs to (via ghl_location_id)
// 3. For InboundMessage: fire-and-forget AI processing via waitUntil
// 4. Respond 200 OK immediately (GHL retries on slow responses)
//
// The actual AI → reply logic lives in lib/ghl/webhook-handler.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { processInboundMessage } from '@/lib/ghl/webhook-handler';
import type { GHLWebhookPayload, GHLWebhookEventType } from '@/lib/ghl/types';
import type { AgencyClient, AgencyTemplate } from '@/lib/agency/types';

// Events we care about
const HANDLED_EVENTS: Set<GHLWebhookEventType> = new Set([
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
    .select('*, agency_templates(*)')
    .eq('ghl_location_id', locationId)
    .single();

  if (lookupError || !agencyClient) {
    console.warn(
      `[ghl/webhook] No agency_client found for location ${locationId}`,
    );
    return NextResponse.json({ received: true, matched: false }, { status: 200 });
  }

  // Cast from Supabase response to our types
  const client = agencyClient as unknown as AgencyClient & {
    agency_templates?: AgencyTemplate | null;
  };

  // Skip if client is paused or not active
  if (client.status !== 'active') {
    console.log(
      `[ghl/webhook] Skipping — client ${client.id} is ${client.status}`,
    );
    return NextResponse.json({ received: true, skipped: true }, { status: 200 });
  }

  // ── Log the webhook event ─────────────────────────────────────────────
  try {
    await supabase.from('ghl_webhook_events').insert({
      id: crypto.randomUUID(),
      agency_client_id: client.id,
      event_type: type,
      location_id: locationId,
      payload: payload as unknown as Record<string, unknown>,
      processed: false,
      created_at: new Date().toISOString(),
    });
  } catch (logError) {
    console.error('[ghl/webhook] Failed to log event:', logError);
  }

  // ── Handle InboundMessage — the AI reply loop ─────────────────────────
  if (type === 'InboundMessage') {
    // Skip outbound messages that GHL sometimes echoes back
    if (payload.direction === 'outbound') {
      return NextResponse.json({ received: true, skipped: true }, { status: 200 });
    }

    // Attach template to client object for the handler
    const clientWithTemplate = {
      ...client,
      template: client.agency_templates ?? null,
    };

    // Process the inbound message (call AI bridge → send reply via GHL).
    // We await this before returning — GHL allows up to 20s for webhook responses,
    // and the AI bridge typically responds in 5-15s. If this becomes too slow,
    // we can move to a queue-based approach later.
    await processInboundMessage(payload, clientWithTemplate).catch((err) => {
      console.error(
        `[ghl/webhook] Failed to process inbound message for client ${client.id}:`,
        err,
      );
    });
  }

  return NextResponse.json({ received: true, matched: true }, { status: 200 });
}
