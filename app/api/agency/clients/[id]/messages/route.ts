// ============================================================================
// GET /api/agency/clients/:id/messages
//
// Returns recent GHL AI conversation logs for a specific client.
// Used by the agency dashboard to show conversation activity.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const { agency } = auth.data;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const source = searchParams.get('source');
  const contactId = searchParams.get('contactId');

  const supabase = createServiceClientWithoutCookies();

  // Verify client belongs to this agency
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Web chat threads are spread across TWO tables:
  //   1. client_conversations  — every visitor↔AI exchange (one row = one
  //      visitor message paired with the AI's reply)
  //   2. widget_agent_messages — every reply a HUMAN agent sent from this
  //      Inbox via /reply (one row = one outbound message from a person)
  //
  // The Inbox UI renders messages with shape
  //   { inbound_message, ai_response, escalated, created_at, id }
  // and treats `inbound_message === '[HUMAN REPLY]'` as the discriminator
  // for "an agent sent this." We mirror the GHL convention here so the
  // existing UI render path Just Works for web-chat threads — no client
  // changes needed.
  //
  // 2026-05-15 fix: previously this path only queried client_conversations,
  // AND returned `user_message` (a field the UI doesn't read — it reads
  // `inbound_message`). Result: agents sent replies that never appeared
  // in the thread, so they re-clicked Send 20 times, the visitor saw the
  // same message stacked 20 times. Fix is interleaving the agent rows AND
  // mapping them to the field shape the UI actually consumes.
  if (source === 'webchat' && contactId) {
    const [convRes, agentRes] = await Promise.all([
      supabase
        .from('client_conversations')
        .select('id, user_message, ai_response, created_at, session_id')
        .eq('client_id', clientId)
        .eq('session_id', contactId)
        .order('created_at', { ascending: true }),
      supabase
        .from('widget_agent_messages')
        .select('id, message, agent_name, created_at, session_id')
        .eq('client_id', clientId)
        .eq('session_id', contactId)
        .order('created_at', { ascending: true }),
    ]);

    if (convRes.error) {
      console.error('[api/messages] webchat client_conversations query failed:', convRes.error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
    if (agentRes.error) {
      // Agent-message lookup failure is non-fatal — fall through to AI-only thread.
      console.warn('[api/messages] webchat widget_agent_messages query failed (rendering AI-only thread):', agentRes.error.message);
    }

    type Row = {
      id: string;
      contact_id: string;
      conversation_id: string;
      contact_name: string | null;
      contact_phone: string | null;
      contact_email: string | null;
      inbound_message: string;
      ai_response: string;
      message_type: string;
      escalated: boolean;
      escalation_reason: string | null;
      created_at: string;
      agent_name?: string | null;
    };

    const aiRows: Row[] = (convRes.data || []).map(m => ({
      id: m.id,
      contact_id: m.session_id,
      conversation_id: m.session_id,
      contact_name: 'Web Visitor',
      contact_phone: null,
      contact_email: null,
      inbound_message: m.user_message ?? '',
      ai_response: m.ai_response ?? '',
      message_type: 'Web Chat',
      escalated: false,
      escalation_reason: null,
      created_at: m.created_at,
    }));

    const agentRows: Row[] = (agentRes.data || []).map(m => ({
      id: m.id,
      contact_id: m.session_id,
      conversation_id: m.session_id,
      contact_name: 'Web Visitor',
      contact_phone: null,
      contact_email: null,
      // [HUMAN REPLY] is the same discriminator the GHL path uses; the
      // Inbox renders it as a "👤 You" indigo agent bubble (see
      // client-detail-view.tsx ~line 2201).
      inbound_message: '[HUMAN REPLY]',
      ai_response: m.message ?? '',
      message_type: 'Web Chat',
      escalated: false,
      escalation_reason: 'human_takeover',
      created_at: m.created_at,
      agent_name: m.agent_name ?? null,
    }));

    const merged = [...aiRows, ...agentRows].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    return NextResponse.json({
      messages: merged,
      total: merged.length,
      limit: 100,
      offset: 0,
    });
  }

  const { data: messages, error, count } = await supabase
    .from('ghl_message_log')
    .select('*', { count: 'exact' })
    .eq('agency_client_id', clientId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[api/messages] Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }

  return NextResponse.json({
    messages: messages || [],
    total: count || 0,
    limit,
    offset,
  });
}
