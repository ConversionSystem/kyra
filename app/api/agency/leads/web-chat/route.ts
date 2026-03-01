// ============================================================================
// GET /api/agency/leads/web-chat
//
// List web chat leads for the authenticated agency.
// Shows leads captured via the embeddable chat widget.
// Supports filtering by status, urgency, client, and date range.
//
// Query: ?status=new&urgency=hot&clientId=xxx&days=7&page=1
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const url = new URL(request.url);

  const status = url.searchParams.get('status');
  const urgency = url.searchParams.get('urgency');
  const clientId = url.searchParams.get('clientId');
  const days = parseInt(url.searchParams.get('days') || '30', 10);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = 25;
  const offset = (page - 1) * limit;

  const supabase = createServiceClientWithoutCookies();

  // Check if table exists (graceful degradation)
  const { error: tableCheck } = await supabase
    .from('web_chat_leads')
    .select('id')
    .eq('agency_id', agency.id)
    .limit(0);

  if (tableCheck?.message?.includes('does not exist') || tableCheck?.code === '42P01') {
    return NextResponse.json({
      leads: [],
      total: 0,
      stats: { total: 0, new: 0, hot: 0, withEmail: 0, withPhone: 0 },
      migrationRequired: true,
    });
  }

  let query = supabase
    .from('web_chat_leads')
    .select('*', { count: 'exact' })
    .eq('agency_id', agency.id)
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (urgency) query = query.eq('urgency', urgency);
  if (clientId) query = query.eq('client_id', clientId);

  const { data: leads, count, error } = await query;

  if (error) {
    console.error('[web-chat-leads] List error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get client names
  const clientIds = [...new Set((leads || []).map(l => l.client_id).filter(Boolean))];
  let clientMap: Record<string, string> = {};
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from('agency_clients')
      .select('id, name')
      .in('id', clientIds);
    clientMap = Object.fromEntries((clients || []).map(c => [c.id, c.name]));
  }

  // Stats query (all leads, not filtered)
  const { data: allLeads } = await supabase
    .from('web_chat_leads')
    .select('urgency, status, email, phone')
    .eq('agency_id', agency.id)
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

  const stats = {
    total: allLeads?.length || 0,
    new: allLeads?.filter(l => l.status === 'new').length || 0,
    hot: allLeads?.filter(l => l.urgency === 'hot').length || 0,
    withEmail: allLeads?.filter(l => l.email).length || 0,
    withPhone: allLeads?.filter(l => l.phone).length || 0,
  };

  const enrichedLeads = (leads || []).map(l => ({
    ...l,
    clientName: l.client_id ? clientMap[l.client_id] || 'Unknown' : 'Agency',
  }));

  return NextResponse.json({
    leads: enrichedLeads,
    total: count || 0,
    stats,
    migrationRequired: false,
  });
}

// PATCH — Update lead status
export async function PATCH(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const body = await request.json();

  if (!body.id || !body.status) {
    return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
  }

  const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ error: `Invalid status. Must be: ${validStatuses.join(', ')}` }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  const { data, error } = await supabase
    .from('web_chat_leads')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('agency_id', agency.id)
    .select()
    .single();

  if (error) {
    console.error('[web-chat-leads] Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}
