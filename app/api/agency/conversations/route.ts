/**
 * Agency Conversations Feed
 * GET /api/agency/conversations — all conversations across all clients for the agency
 * Query params: ?limit=50&page=0&clientId=xxx&channel=telegram&q=keyword
 */
import { NextRequest } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const page = parseInt(searchParams.get('page') || '0');
  const filterClientId = searchParams.get('clientId') || null;
  const filterChannel = searchParams.get('channel') || null;
  const filterQuery = searchParams.get('q')?.trim() || null;

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response('Unauthorized', { status: 401 });

    // Get user's agency
    const { data: membership } = await supabase
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();
    if (!membership) return new Response('No agency found', { status: 403 });

    const service = createServiceClientWithoutCookies();

    // Get all clients for this agency (for name lookup)
    const { data: clients } = await service
      .from('agency_clients')
      .select('id, name, industry')
      .eq('agency_id', membership.agency_id);

    const clientMap = Object.fromEntries((clients || []).map(c => [c.id, c]));

    // Build query
    let query = service
      .from('client_conversations')
      .select('*', { count: 'exact' })
      .eq('agency_id', membership.agency_id)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (filterClientId) query = query.eq('client_id', filterClientId);
    if (filterChannel) query = query.eq('channel', filterChannel);
    if (filterQuery) {
      const escaped = filterQuery.replace(/[%_]/g, '\\$&');
      query = query.or(`user_message.ilike.%${escaped}%,ai_response.ilike.%${escaped}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('client_conversations')) {
        return Response.json({ conversations: [], total: 0, clients: clients || [], migrationRequired: true });
      }
      throw error;
    }

    // Enrich with client name
    const enriched = (data || []).map(conv => ({
      ...conv,
      client_name: clientMap[conv.client_id]?.name || 'Unknown',
      client_industry: clientMap[conv.client_id]?.industry || null,
    }));

    return Response.json({
      conversations: enriched,
      total: count || 0,
      clients: clients || [],
    });
  } catch (err) {
    console.error('[agency/conversations]', err);
    return new Response('Internal server error', { status: 500 });
  }
}
