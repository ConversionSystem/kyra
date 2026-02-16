// ============================================================================
// POST /api/ghl/webhook
//
// Receives GHL webhooks from:
// 1. Marketplace app webhooks (when approved)
// 2. GHL Workflow "Custom Webhook" actions (works immediately)
//
// GHL Workflow payloads have different field names than marketplace webhooks.
// We normalize both formats and process InboundMessage events.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { processInboundMessage } from '@/lib/ghl/webhook-handler';
import type { GHLWebhookPayload } from '@/lib/ghl/types';
import type { AgencyClient, AgencyTemplate } from '@/lib/agency/types';

export async function POST(request: NextRequest) {
  let raw: Record<string, unknown>;

  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Log EVERYTHING for debugging
  console.log('[ghl/webhook] Raw payload:', JSON.stringify(raw).substring(0, 2000));

  // ── Normalize the payload ─────────────────────────────────────────────
  // GHL Workflow webhooks use different field names than marketplace webhooks.
  // Normalize to our standard format.
  const payload = normalizePayload(raw);

  if (!payload.locationId) {
    console.warn('[ghl/webhook] No locationId found in payload');
    return NextResponse.json({ received: true, debug: 'no_location_id' }, { status: 200 });
  }

  if (!payload.type) {
    // If no type but we have a body/message, treat as InboundMessage
    if (payload.body) {
      payload.type = 'InboundMessage';
    } else {
      console.warn('[ghl/webhook] No event type and no message body');
      return NextResponse.json({ received: true, debug: 'no_type_no_body' }, { status: 200 });
    }
  }

  console.log(`[ghl/webhook] Normalized: type=${payload.type} location=${payload.locationId} contact=${payload.contactId} body="${(payload.body || '').substring(0, 80)}"`);

  // ── Look up the agency_client by GHL location ID ──────────────────────
  const supabase = createServiceClientWithoutCookies();

  const { data: agencyClient, error: lookupError } = await supabase
    .from('agency_clients')
    .select('*, agency_templates(*)')
    .eq('ghl_location_id', payload.locationId)
    .single();

  if (lookupError || !agencyClient) {
    console.warn(`[ghl/webhook] No client for location ${payload.locationId}`);
    return NextResponse.json({ received: true, matched: false }, { status: 200 });
  }

  const client = agencyClient as unknown as AgencyClient & {
    agency_templates?: AgencyTemplate | null;
  };

  // Skip inactive clients
  if (client.status !== 'active' && client.status !== 'setup') {
    console.log(`[ghl/webhook] Skipping — client ${client.id} is ${client.status}`);
    return NextResponse.json({ received: true, skipped: true }, { status: 200 });
  }

  // ── Handle InboundMessage ─────────────────────────────────────────────
  if (payload.type === 'InboundMessage') {
    if (payload.direction === 'outbound') {
      return NextResponse.json({ received: true, skipped: 'outbound' }, { status: 200 });
    }

    if (!payload.body || payload.body.trim().length === 0) {
      console.log('[ghl/webhook] Empty message body, skipping');
      return NextResponse.json({ received: true, skipped: 'empty_body' }, { status: 200 });
    }

    const clientWithTemplate = {
      ...client,
      template: client.agency_templates ?? null,
    };

    console.log(`[ghl/webhook] Processing inbound for client "${client.name}" from ${payload.contactId}`);

    await processInboundMessage(payload as GHLWebhookPayload, clientWithTemplate).catch((err) => {
      console.error(`[ghl/webhook] Processing failed:`, err);
    });
  }

  return NextResponse.json({ received: true, matched: true }, { status: 200 });
}

// ── Payload Normalization ───────────────────────────────────────────────────

function normalizePayload(raw: Record<string, unknown>): GHLWebhookPayload {
  // Already in our format (marketplace webhook or manual test)
  if (raw.type && raw.locationId) {
    return raw as unknown as GHLWebhookPayload;
  }

  // GHL Workflow "Custom Webhook" format — try to extract fields
  // GHL workflows send data with their own field naming conventions
  const payload: Record<string, unknown> = {
    type: raw.type || raw.event_type || raw.eventType || 'InboundMessage',
    locationId: raw.locationId || raw.location_id || raw.locationID,
    contactId: raw.contactId || raw.contact_id || raw.contactID,
    conversationId: raw.conversationId || raw.conversation_id || raw.conversationID,
    body: raw.body || raw.message || raw.message_body || raw.messageBody || raw.text || raw.content,
    direction: raw.direction || 'inbound',
    messageType: raw.messageType || raw.message_type || raw.channel || 'TYPE_SMS',
    phone: raw.phone || raw.contact_phone || raw.from || raw.fromNumber,
    email: raw.email || raw.contact_email,
  };

  // GHL workflow might nest contact data
  if (raw.contact && typeof raw.contact === 'object') {
    const contact = raw.contact as Record<string, unknown>;
    payload.contactId = payload.contactId || contact.id || contact.contactId;
    payload.phone = payload.phone || contact.phone;
    payload.email = payload.email || contact.email;
    payload.locationId = payload.locationId || contact.locationId || contact.location_id;
  }

  // GHL workflow might nest message data
  if (raw.message && typeof raw.message === 'object') {
    const msg = raw.message as Record<string, unknown>;
    payload.body = payload.body || msg.body || msg.text || msg.content;
    payload.direction = msg.direction || payload.direction;
    payload.messageType = msg.messageType || msg.type || payload.messageType;
    payload.conversationId = payload.conversationId || msg.conversationId;
  }

  // Last resort: check nested workflow data fields
  if (raw.workflow_data && typeof raw.workflow_data === 'object') {
    const wd = raw.workflow_data as Record<string, unknown>;
    payload.body = payload.body || wd.message || wd.body;
    payload.contactId = payload.contactId || wd.contactId || wd.contact_id;
  }

  return payload as unknown as GHLWebhookPayload;
}
