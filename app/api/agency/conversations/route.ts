// ============================================================================
// GET /api/agency/conversations
//
// Fetches conversations across all clients for the agency.
// Combines GHL live conversations + logged message data from Supabase.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-04-15';

interface ConversationItem {
  id: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  clientId: string;
  clientName: string;
  channel: string;
  lastInbound: string;
  lastAiResponse: string;
  lastMessageAt: string;
  unreadCount: number;
  status: 'ai_handled' | 'needs_human' | 'active';
  responseTimeMs: number | null;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const url = new URL(request.url);
  const clientFilter = url.searchParams.get('client');
  const channelFilter = url.searchParams.get('channel');

  const serviceClient = createServiceClientWithoutCookies();

  // Get all clients for this agency with GHL tokens
  let clientQuery = serviceClient
    .from('agency_clients')
    .select('id, name, ghl_location_id, ghl_private_token, ghl_access_token, status')
    .eq('agency_id', agency.id)
    .in('status', ['active', 'setup']);

  if (clientFilter) {
    clientQuery = clientQuery.eq('id', clientFilter);
  }

  const { data: clients, error: clientError } = await clientQuery;

  if (clientError || !clients?.length) {
    return NextResponse.json({ conversations: [], stats: { today: 0, thisWeek: 0, aiHandled: 0 } });
  }

  const conversations: ConversationItem[] = [];

  // For each client, fetch GHL conversations + our logged messages
  for (const client of clients) {
    const token = client.ghl_private_token || client.ghl_access_token;
    if (!token || !client.ghl_location_id) continue;

    try {
      // Fetch conversations from GHL
      const ghlRes = await fetch(
        `${GHL_API_BASE}/conversations/search?locationId=${client.ghl_location_id}&limit=20`,
        {
          headers: { Authorization: `Bearer ${token}`, Version: GHL_API_VERSION },
          signal: AbortSignal.timeout(10_000),
        }
      );

      if (!ghlRes.ok) continue;

      const ghlData = await ghlRes.json();
      const ghlConvs = ghlData.conversations || [];

      // Get our logged messages for this client
      const { data: logs } = await serviceClient
        .from('ghl_message_log')
        .select('*')
        .eq('agency_client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const logsByConv = new Map<string, typeof logs>();
      for (const log of logs || []) {
        const existing = logsByConv.get(log.conversation_id) || [];
        existing.push(log);
        logsByConv.set(log.conversation_id, existing);
      }

      for (const conv of ghlConvs) {
        const convLogs = logsByConv.get(conv.id) || [];
        const latestLog = convLogs[0];

        const contactName = conv.contactName || conv.phone || conv.email || 'Unknown';
        const channel = formatChannel(conv.lastMessageType);

        if (channelFilter && channel.toLowerCase() !== channelFilter.toLowerCase()) continue;

        const hasAiReply = conv.lastMessageDirection === 'outbound' || convLogs.length > 0;
        const isUnread = conv.lastMessageDirection === 'inbound' && (conv.unreadCount || 0) > 0;

        conversations.push({
          id: conv.id,
          contactName,
          contactPhone: conv.phone || latestLog?.contact_phone || null,
          contactEmail: conv.email || latestLog?.contact_email || null,
          clientId: client.id,
          clientName: client.name,
          channel,
          lastInbound: latestLog?.inbound_message || conv.lastMessageBody || '',
          lastAiResponse: latestLog?.ai_response || '',
          lastMessageAt: conv.lastMessageDate || latestLog?.created_at || '',
          unreadCount: conv.unreadCount || 0,
          status: isUnread ? 'needs_human' : hasAiReply ? 'ai_handled' : 'active',
          responseTimeMs: latestLog?.response_time_ms || null,
        });
      }
    } catch (err) {
      console.error(`[conversations] Error fetching for ${client.name}:`, err);
    }
  }

  // Sort by most recent first
  conversations.sort((a, b) =>
    new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  // Calculate stats
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const stats = {
    today: conversations.filter(c => new Date(c.lastMessageAt) >= todayStart).length,
    thisWeek: conversations.filter(c => new Date(c.lastMessageAt) >= weekStart).length,
    aiHandled: conversations.filter(c => c.status === 'ai_handled').length,
    total: conversations.length,
    avgResponseMs: conversations.reduce((sum, c) => sum + (c.responseTimeMs || 0), 0) /
      (conversations.filter(c => c.responseTimeMs).length || 1),
  };

  return NextResponse.json({ conversations, stats });
}

function formatChannel(messageType: string | null): string {
  if (!messageType) return 'Unknown';
  const map: Record<string, string> = {
    'TYPE_SMS': 'SMS',
    'TYPE_EMAIL': 'Email',
    'TYPE_WHATSAPP': 'WhatsApp',
    'TYPE_FB_MESSENGER': 'Facebook',
    'TYPE_INSTAGRAM': 'Instagram',
    'TYPE_LIVE_CHAT': 'Live Chat',
    'TYPE_WEBCHAT': 'Web Chat',
    'TYPE_GMB': 'Google',
    'TYPE_CALL': 'Phone',
  };
  return map[messageType] || messageType.replace('TYPE_', '');
}
