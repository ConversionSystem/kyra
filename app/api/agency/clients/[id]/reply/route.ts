/**
 * Manual Reply API — Send a human reply to a customer-facing conversation.
 *
 * Channel-aware (2026-05-14): branches on `messageType`.
 *   - 'Web Chat'   → write to widget_agent_messages, the open widget panel
 *                    polls and renders the reply in real time. NO GHL.
 *   - everything   → existing GHL path (SMS/Email/WhatsApp/FB/IG).
 *     else
 *
 * Why branch: GHL doesn't own our embedded widget — we do. Sending web-chat
 * replies through sendGHLMessage was returning 401 because GHL has no
 * record of those conversations. The widget speaks directly to our backend,
 * so the reply path should too.
 *
 * POST /api/agency/clients/[id]/reply
 * Body: {
 *   contactId: string,       // GHL contact ID, OR session_id for web chat
 *   conversationId: string,  // GHL conversation ID, OR session_id for web chat
 *   message: string,         // Reply text
 *   messageType?: string,    // SMS | Email | WhatsApp | Web Chat | etc.
 *   contactName?: string,    // For logging
 *   contactPhone?: string,
 *   contactEmail?: string,
 * }
 *
 * Returns: { ok: true, messageId: string, channel: 'web_chat' | 'ghl' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { sendGHLMessage, getValidToken } from '@/lib/ghl/api';
import { recordAgentMessage } from '@/lib/widget/agent-messages';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const { agency } = auth.data;
  const supabase = createServiceClientWithoutCookies();

  // Verify client belongs to this agency
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, name, agency_id, ghl_location_id')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Parse body
  const body = await request.json();
  const {
    contactId,
    conversationId,
    message,
    messageType = 'SMS',
    contactName,
    contactPhone,
    contactEmail,
  } = body;

  if (!contactId || !message?.trim()) {
    return NextResponse.json(
      { error: 'contactId and message are required' },
      { status: 400 },
    );
  }

  // ── Web Chat branch ──────────────────────────────────────────────────────
  // For web chat the contactId IS the session_id (see threads/route.ts where
  // webChatMap entries set contactId: msg.session_id). Persist to the
  // dedicated widget_agent_messages table; the visitor's open panel will
  // poll and pick the message up within ~6 seconds. AI is automatically
  // paused for the next 15 minutes (see lib/widget/agent-messages.ts).
  if (messageType === 'Web Chat') {
    const sessionId = String(contactId).trim();
    if (!sessionId) {
      return NextResponse.json(
        { error: 'contactId (session_id) is required for Web Chat' },
        { status: 400 },
      );
    }
    // Best-effort agent display name for the visitor-facing notice
    const agentMeta = (auth.data.user.user_metadata ?? {}) as { full_name?: string };
    const agentName =
      agentMeta.full_name?.trim() ||
      auth.data.user.email?.split('@')[0] ||
      null;
    const recorded = await recordAgentMessage(supabase, {
      clientId,
      agencyId: client.agency_id as string,
      sessionId,
      message: message.trim(),
      agentUserId: auth.data.user.id ?? null,
      agentName,
    });
    if (!recorded) {
      return NextResponse.json(
        { error: 'Failed to record web chat reply' },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      messageId: recorded.id,
      channel: 'web_chat',
    });
  }

  // ── GHL branch (SMS / Email / WhatsApp / FB / IG / etc.) ────────────────
  if (!client.ghl_location_id) {
    return NextResponse.json(
      { error: 'Client has no GHL connection — connect GHL first to send replies' },
      { status: 422 },
    );
  }

  try {
    // Get a valid GHL token
    const token = await getValidToken(clientId);

    // Send the message via GHL API
    const result = await sendGHLMessage(
      clientId,
      token,
      contactId,
      message.trim(),
      messageType,
    );

    // Log to ghl_message_log as a human reply
    try {
      await supabase.from('ghl_message_log').insert({
        agency_client_id: clientId,
        conversation_id: conversationId || 'manual',
        contact_id: contactId,
        contact_name: contactName || null,
        contact_phone: contactPhone || null,
        contact_email: contactEmail || null,
        inbound_message: '[HUMAN REPLY]',
        ai_response: message.trim(),
        message_type: messageType,
        response_time_ms: 0,
        escalated: false,
        escalation_reason: 'human_takeover',
      });
    } catch (logErr) {
      console.warn('[reply] Failed to log manual reply:', logErr);
    }

    return NextResponse.json({
      ok: true,
      messageId: (result as any)?.messageId || (result as any)?.id || 'sent',
      channel: 'ghl',
    });
  } catch (err: any) {
    console.error('[reply] Failed to send reply:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send reply via GHL' },
      { status: 500 },
    );
  }
}
