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
import { deductCredits } from '@/lib/billing/credit-engine';
import { getGatewayByClientId } from '@/lib/ovh/gateway-resolver';
import { logAndFire } from '@/lib/pipeline/webhooks';
import { syncLeadToCrm } from '@/lib/pipeline/crm-sync';
import { handleCloserReply } from '@/lib/pipeline/ai-closer';
import { cancelFollowUps } from '@/lib/pipeline/follow-up-engine';
import { logConversationToCrm } from '@/lib/crm/conversation-logger';
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
  // ── Webhook authentication ────────────────────────────────────────────
  const webhookSecret = process.env.GHL_WEBHOOK_SECRET;
  if (webhookSecret) {
    const providedSecret = request.headers.get('x-webhook-secret') || request.nextUrl.searchParams.get('secret');
    if (providedSecret !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

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
    await supabase.from('ghl_webhook_logs').insert({
      id: crypto.randomUUID(),
      client_id: agencyClient.id,
      event_type: type,
      location_id: locationId,
      payload_json: payload,
      status: 'received',
      created_at: new Date().toISOString(),
    });
  } catch (logError) {
    // Non-fatal — don't block webhook processing
    console.error('[ghl/webhook] Failed to log event:', logError);
  }

  // ── Pipeline inbound reply handler ─────────────────────────────────────
  // When a lead replies to outreach via GHL, auto-update pipeline:
  // messaged → replied, fire webhooks, trigger CRM sync
  if (type === 'InboundMessage' && payload.contactId) {
    try {
      await handlePipelineInboundReply(payload, locationId);
    } catch (err) {
      console.error('[ghl/webhook] Pipeline inbound handler error:', err);
    }
  }

  // ── Log to native CRM (non-blocking) ─────────────────────────────────
  if (type === 'InboundMessage' || type === 'OutboundMessage') {
    logConversationToCrm(agencyClient.agency_id, payload).catch(err =>
      console.error('[ghl/webhook] CRM log error:', err)
    );
  }

  // ── Forward to the client's OpenClaw container ────────────────────────
  if (FORWARDABLE_EVENTS.has(type)) {
    try {
      await forwardToContainer(agencyClient.id, agencyClient.agency_id, payload);
      try {
        await deductCredits(agencyClient.agency_id, 'channel.ghl_sms', {
          clientId: agencyClient.id,
          description: `CRM webhook AI response: ${type}`,
        });
      } catch { /* non-fatal */ }
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
  // Resolve the client's own gateway (OVH per-client isolation)
  const clientGateway = await getGatewayByClientId(clientId);
  const workerUrl = clientGateway?.url;
  const apiSecret = process.env.KYRA_API_SECRET;

  if (!workerUrl) {
    console.warn(
      `[ghl/webhook] No gateway provisioned for client ${clientId}`,
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

  // Forward to OpenClaw gateway via /v1/chat/completions
  const chatMessages: Array<{ role: string; content: string }> = [];
  chatMessages.push({ role: 'system', content: `You are an AI assistant for a business. Process this GHL webhook event and take appropriate action.\nClient ID: ${clientId}\nEvent type: ${payload.type}\nContact: ${payload.contactId || payload.id || 'unknown'}` });
  chatMessages.push({ role: 'user', content: message });

  const res = await fetch(`${workerUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${clientGateway?.token || apiSecret}`,
    },
    body: JSON.stringify({
      model: 'openrouter/anthropic/claude-haiku-4.5',
      messages: chatMessages,
      stream: false,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Worker returned ${res.status}: ${text}`);
  }
}

// ── Pipeline Inbound Reply Handler ────────────────────────────────────────────
//
// When a GHL contact replies (InboundMessage), check if they're a pipeline lead.
// If so: messaged → replied, fire webhooks, sync CRM, log activity.
// This is what makes the AI Closer truly autonomous.

async function handlePipelineInboundReply(
  payload: GHLWebhookPayload,
  locationId: string,
): Promise<void> {
  const contactId = payload.contactId;
  if (!contactId) return;

  const supabase = createServiceClientWithoutCookies();

  // Find pipeline lead(s) with this GHL contact ID that are in "messaged" stage
  const { data: leads } = await supabase
    .from('pipeline_leads')
    .select('*, pipeline_campaigns!inner(id, name)')
    .eq('ghl_contact_id', contactId)
    .eq('stage', 'messaged');

  if (!leads?.length) {
    // Also check by phone/email match if no direct contact ID match
    const phone = payload.phone;
    const email = payload.email;

    let fallbackLeads = null;
    if (phone) {
      const { data } = await supabase
        .from('pipeline_leads')
        .select('*, pipeline_campaigns!inner(id, name)')
        .eq('phone', phone)
        .eq('stage', 'messaged');
      fallbackLeads = data;
    }
    if (!fallbackLeads?.length && email) {
      const { data } = await supabase
        .from('pipeline_leads')
        .select('*, pipeline_campaigns!inner(id, name)')
        .eq('email', email)
        .eq('stage', 'messaged');
      fallbackLeads = data;
    }

    if (!fallbackLeads?.length) return; // Not a pipeline lead

    // Process fallback matches
    for (const lead of fallbackLeads) {
      await promotePipelineLead(supabase, lead, contactId, payload);
    }
    return;
  }

  // Process direct matches
  for (const lead of leads) {
    await promotePipelineLead(supabase, lead, contactId, payload);
  }
}

async function promotePipelineLead(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lead: any,
  contactId: string,
  payload: GHLWebhookPayload,
): Promise<void> {
  const campaign = lead.pipeline_campaigns as { id: string; name: string };
  const previousStage = lead.stage;

  // Update lead: messaged → replied
  const { error: updateErr } = await supabase
    .from('pipeline_leads')
    .update({
      stage: 'replied',
      replied_at: new Date().toISOString(),
      ghl_contact_id: contactId, // Ensure contact ID is linked
    })
    .eq('id', lead.id);

  if (updateErr) {
    console.error(`[pipeline/inbound] Failed to update lead ${lead.id}:`, updateErr);
    return;
  }

  console.log(`[pipeline/inbound] Lead ${lead.id} (${lead.company || lead.full_name}) moved messaged → replied`);

  // Cancel any pending follow-ups — lead replied, no need to follow up
  cancelFollowUps(lead.id).then((cancelled) => {
    if (cancelled > 0) {
      console.log(`[pipeline/inbound] Cancelled ${cancelled} pending follow-ups for lead ${lead.id}`);
    }
  }).catch((err) => {
    console.error(`[pipeline/inbound] Failed to cancel follow-ups for ${lead.id}:`, err);
  });

  // Store the reply message in enrichment_data
  if (payload.body) {
    const enrichment = (lead.enrichment_data || {}) as Record<string, unknown>;
    await supabase
      .from('pipeline_leads')
      .update({
        enrichment_data: {
          ...enrichment,
          last_reply: payload.body,
          last_reply_at: new Date().toISOString(),
          reply_channel: payload.messageType || 'unknown',
        },
      })
      .eq('id', lead.id);
  }

  // Fire webhook: lead.replied
  const leadPayload = {
    id: lead.id,
    full_name: lead.full_name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    website: lead.website,
    industry: lead.industry,
    location: lead.location,
    stage: 'replied',
    previous_stage: previousStage,
    personalized_subject: lead.personalized_subject,
    personalized_email: lead.personalized_email,
    personalized_opener: lead.personalized_opener,
    ghl_contact_id: contactId,
  };

  await logAndFire(
    lead.agency_id,
    'lead.replied',
    { id: campaign.id, name: campaign.name },
    leadPayload,
    'system',
    { reply_body: payload.body, reply_channel: payload.messageType },
  );

  // Sync to CRM (tags, pipeline stage move)
  syncLeadToCrm(lead.agency_id, {
    ...leadPayload,
    first_name: lead.first_name,
    last_name: lead.last_name,
    title: lead.title,
    campaign_id: campaign.id,
    campaign_name: campaign.name,
    enrichment_data: lead.enrichment_data,
  }).catch(err => console.error('[pipeline/inbound] CRM sync error:', err));

  // Update campaign reply count
  await supabase.rpc('increment_campaign_replies', { campaign_id: campaign.id }).catch(() => {
    // Fallback: direct update if RPC doesn't exist
    supabase
      .from('pipeline_campaigns')
      .update({ leads_replied: (lead.leads_replied || 0) + 1 })
      .eq('id', campaign.id)
      .then(() => {}, () => {});
  });

  // ── AI Closer: Generate and send autonomous response ──────────────────
  // This is where OpenClaw powers the pipeline.
  // The AI Closer reads the full context, generates a human-like response,
  // sends it via GHL, and auto-updates the pipeline stage.
  try {
    const closerResult = await handleCloserReply(
      lead.id,
      payload.body || '(no message body)',
      (payload.messageType as string) || 'SMS',
    );
    console.log(
      `[pipeline/closer] Lead ${lead.id} (${lead.company || lead.full_name}) → ` +
      `responded via ${closerResult.poweredBy}, sent=${closerResult.sentViaGhl}` +
      (closerResult.stageUpdate ? `, stage→${closerResult.stageUpdate}` : ''),
    );
  } catch (closerErr) {
    console.error(`[pipeline/closer] Failed for lead ${lead.id}:`, closerErr);
    // Non-fatal — the lead is already in 'replied' stage, human can intervene
  }
}
