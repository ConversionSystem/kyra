// ============================================================================
// GET /api/agency/clients/:id/messages
//
// Returns recent GHL AI conversation logs for a specific client.
// Used by the agency dashboard to show conversation activity.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const supabase = createServiceClientWithoutCookies();

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
