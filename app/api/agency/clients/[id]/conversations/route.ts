/**
 * Client Conversations API
 * GET /api/agency/clients/[id]/conversations — paginated list
 * POST /api/agency/clients/[id]/conversations — log a new message pair
 */
import { NextRequest } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { dispatchWebhookIfConfigured } from '@/lib/agency/webhook-dispatcher';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const page = parseInt(searchParams.get('page') || '0');

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response('Unauthorized', { status: 401 });

    // Verify membership
    const { data: client } = await supabase
      .from('agency_clients')
      .select('id, agency_id')
      .eq('id', clientId)
      .single();
    if (!client) return new Response('Not found', { status: 404 });

    const { data: membership } = await supabase
      .from('agency_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('agency_id', client.agency_id)
      .single();
    if (!membership) return new Response('Forbidden', { status: 403 });

    // Fetch conversations using service role (bypasses RLS complexity)
    const service = createServiceClientWithoutCookies();
    const { data, error, count } = await service
      .from('client_conversations')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (error) {
      // Table might not exist yet
      if (error.code === 'PGRST205' || error.message?.includes('client_conversations')) {
        return Response.json({ conversations: [], total: 0, migrationRequired: true });
      }
      throw error;
    }

    return Response.json({ conversations: data || [], total: count || 0 });
  } catch (err) {
    console.error('[conversations GET]', err);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;

  try {
    // Verify caller owns this client — don't trust agency_id from body
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return new Response('Unauthorized', { status: 401 });

    const { data: clientRow } = await supabase
      .from('agency_clients')
      .select('id, agency_id')
      .eq('id', clientId)
      .single();
    if (!clientRow) return new Response('Not found', { status: 404 });

    const { data: membership } = await supabase
      .from('agency_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('agency_id', clientRow.agency_id)
      .single();
    if (!membership) return new Response('Forbidden', { status: 403 });

    const body = await request.json();
    const { user_message, ai_response, channel, tokens_used } = body;

    if (!user_message || !ai_response) {
      return new Response('Missing required fields', { status: 400 });
    }

    const service = createServiceClientWithoutCookies();
    const { error } = await service.from('client_conversations').insert({
      client_id: clientId,
      agency_id: clientRow.agency_id,
      channel: channel || 'test_chat',
      user_message,
      ai_response,
      tokens_used: tokens_used || null,
    });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('client_conversations')) {
        return Response.json({ ok: false, migrationRequired: true });
      }
      throw error;
    }

    // Fire-and-forget GHL webhook
    void dispatchWebhookIfConfigured({
      clientId,
      agencyId: clientRow.agency_id,
      channel: channel || 'test_chat',
      userMessage: user_message,
      aiResponse: ai_response,
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('[conversations POST]', err);
    return new Response('Internal server error', { status: 500 });
  }
}
