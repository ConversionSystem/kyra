/**
 * GET /api/agency/pipeline/conversations?lead_id=xxx
 * Fetch GHL conversation messages for a pipeline lead
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getGhlIntegration } from '@/lib/pipeline/crm-sync';

const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-04-15';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leadId = req.nextUrl.searchParams.get('lead_id');
  if (!leadId) return NextResponse.json({ error: 'lead_id required' }, { status: 400 });

  const svc = createServiceClientWithoutCookies();

  // Get the lead
  const { data: lead } = await svc.from('pipeline_leads').select('ghl_contact_id, full_name, company').eq('id', leadId).single();
  if (!lead?.ghl_contact_id) {
    return NextResponse.json({ messages: [], error: 'No GHL contact linked' });
  }

  // Get agency ID for this lead
  const { data: member } = await svc.from('agency_members').select('agency_id').eq('user_id', user.id).single();
  if (!member) return NextResponse.json({ messages: [], error: 'No agency' });

  // Get GHL token from native integration (or legacy fallback)
  const ghlIntegration = await getGhlIntegration(member.agency_id);

  let token: string | null = null;
  let locationId: string | null = null;

  if (ghlIntegration?.access_token && ghlIntegration?.location_id) {
    token = ghlIntegration.access_token;
    locationId = ghlIntegration.location_id;
  } else {
    // Legacy fallback
    const { data: ghlClient } = await svc
      .from('agency_clients')
      .select('ghl_private_token, ghl_location_id')
      .eq('agency_id', member.agency_id)
      .not('ghl_private_token', 'is', null)
      .not('ghl_location_id', 'is', null)
      .limit(1)
      .single();
    token = (ghlClient?.ghl_private_token as string) || null;
    locationId = (ghlClient?.ghl_location_id as string) || null;
  }

  if (!token || !locationId) {
    return NextResponse.json({ messages: [], error: 'GHL not connected' });
  }

  try {
    // Search for conversations with this contact
    const searchRes = await fetch(
      `${GHL_API}/conversations/search?contactId=${lead.ghl_contact_id}&locationId=${locationId}`,
      {
        headers: { Authorization: `Bearer ${token}`, Version: GHL_VERSION },
        signal: AbortSignal.timeout(10_000),
      }
    );
    const searchData = await searchRes.json().catch(() => ({ conversations: [] }));
    const conversations = searchData.conversations || [];

    if (!conversations.length) {
      return NextResponse.json({ messages: [], contactName: lead.full_name });
    }

    // Get messages from the most recent conversation
    const convId = conversations[0].id;
    const msgRes = await fetch(
      `${GHL_API}/conversations/${convId}/messages`,
      {
        headers: { Authorization: `Bearer ${token}`, Version: GHL_VERSION },
        signal: AbortSignal.timeout(10_000),
      }
    );
    const msgData = await msgRes.json().catch(() => ({ messages: { messages: [] } }));
    const rawMessages = msgData.messages?.messages || msgData.messages || [];

    // Normalize messages
    const messages = rawMessages.map((m: Record<string, unknown>) => ({
      id: m.id,
      direction: m.direction, // 'inbound' or 'outbound'
      body: m.body || m.message || '',
      type: m.messageType || m.type || 'SMS',
      dateAdded: m.dateAdded || m.createdAt,
      status: m.status,
    })).sort((a: { dateAdded: string }, b: { dateAdded: string }) =>
      new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime()
    );

    return NextResponse.json({
      messages,
      conversationId: convId,
      contactName: lead.full_name,
      company: lead.company,
    });
  } catch (err) {
    return NextResponse.json({
      messages: [],
      error: err instanceof Error ? err.message : 'Failed to fetch conversations',
    });
  }
}
