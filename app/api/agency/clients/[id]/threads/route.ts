/**
 * Conversation Threads API — Groups messages by contact for the inbox view
 *
 * GET /api/agency/clients/[id]/threads
 * Query: ?limit=30&offset=0&q=search
 *
 * Returns threads grouped by contact_id with latest message preview
 */

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
  const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 50);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const q = searchParams.get('q')?.trim() || '';

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

  // Get all messages ordered by time (most recent first)
  let query = supabase
    .from('ghl_message_log')
    .select('*', { count: 'exact' })
    .eq('agency_client_id', clientId)
    .order('created_at', { ascending: false });

  if (q) {
    const escaped = q.replace(/[%_]/g, '\\$&');
    query = query.or(`inbound_message.ilike.%${escaped}%,ai_response.ilike.%${escaped}%,contact_name.ilike.%${escaped}%`);
  }

  const { data: allMessages, error } = await query.limit(500);

  if (error) {
    console.error('[threads] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 });
  }

  // Group by contact_id into threads
  const threadMap = new Map<string, {
    contactId: string;
    contactName: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    conversationId: string;
    messageType: string;
    lastMessage: string;
    lastMessageAt: string;
    messageCount: number;
    hasEscalation: boolean;
    hasHumanReply: boolean;
    unread: boolean;
  }>();

  for (const msg of allMessages || []) {
    const key = msg.contact_id;
    if (!threadMap.has(key)) {
      threadMap.set(key, {
        contactId: msg.contact_id,
        contactName: msg.contact_name,
        contactPhone: msg.contact_phone,
        contactEmail: msg.contact_email,
        conversationId: msg.conversation_id,
        messageType: msg.message_type || 'SMS',
        lastMessage: msg.inbound_message === '[HUMAN REPLY]' ? `You: ${msg.ai_response}` : msg.inbound_message,
        lastMessageAt: msg.created_at,
        messageCount: 1,
        hasEscalation: !!msg.escalated,
        hasHumanReply: msg.inbound_message === '[HUMAN REPLY]',
        unread: false,
      });
    } else {
      const thread = threadMap.get(key)!;
      thread.messageCount++;
      // Use latest contact info
      if (msg.contact_name && !thread.contactName) thread.contactName = msg.contact_name;
      if (msg.contact_phone && !thread.contactPhone) thread.contactPhone = msg.contact_phone;
      if (msg.contact_email && !thread.contactEmail) thread.contactEmail = msg.contact_email;
      if (msg.escalated) thread.hasEscalation = true;
      if (msg.inbound_message === '[HUMAN REPLY]') thread.hasHumanReply = true;
    }
  }

  // Sort by most recent message
  const threads = Array.from(threadMap.values())
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  const totalThreads = threads.length;
  const paged = threads.slice(offset, offset + limit);

  return NextResponse.json({
    threads: paged,
    total: totalThreads,
    limit,
    offset,
  });
}
