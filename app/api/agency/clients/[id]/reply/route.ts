/**
 * Manual Reply API — Send a human reply to a GHL conversation
 *
 * POST /api/agency/clients/[id]/reply
 * Body: {
 *   contactId: string,       // GHL contact ID
 *   conversationId: string,  // GHL conversation ID
 *   message: string,         // Reply text
 *   messageType?: string,    // SMS, Email, WhatsApp, etc. — defaults to SMS
 *   contactName?: string,    // For logging
 *   contactPhone?: string,   // For logging
 *   contactEmail?: string,   // For logging
 * }
 *
 * Returns: { ok: true, messageId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { sendGHLMessage, getValidToken } from '@/lib/ghl/api';

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
    });
  } catch (err: any) {
    console.error('[reply] Failed to send reply:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send reply via GHL' },
      { status: 500 },
    );
  }
}
