// ============================================================================
// /api/agency/knowledge
//
// CRUD for knowledge base documents.
// Documents get synced to the gateway as context for AI responses.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';

export const dynamic = 'force-dynamic';

// GET — List all knowledge documents
export async function GET(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const url = new URL(request.url);
  const clientId = url.searchParams.get('client');

  const supabase = createServiceClientWithoutCookies();

  let query = supabase
    .from('knowledge_documents')
    .select('*')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false });

  if (clientId) {
    // Filter by specific client OR agency-wide docs
    query = query.or(`client_id.eq.${clientId},client_id.is.null`);
  }

  const { data: documents, error } = await query;

  if (error) {
    console.error('[knowledge] List error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get client names for display
  const { data: clients } = await supabase
    .from('agency_clients')
    .select('id, name')
    .eq('agency_id', agency.id);

  const clientMap = Object.fromEntries((clients || []).map(c => [c.id, c.name]));

  const docs = (documents || []).map(d => ({
    ...d,
    clientName: d.client_id ? clientMap[d.client_id] || 'Unknown' : 'All Clients',
  }));

  // Stats
  const stats = {
    total: docs.length,
    enabled: docs.filter(d => d.enabled).length,
    totalChars: docs.reduce((sum, d) => sum + (d.char_count || 0), 0),
    synced: docs.filter(d => d.synced_at).length,
    unsynced: docs.filter(d => !d.synced_at || (d.updated_at > d.synced_at)).length,
  };

  return NextResponse.json({ documents: docs, stats });
}

// POST — Create a new knowledge document
export async function POST(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const body = await request.json();

  if (!body.title || !body.content) {
    return NextResponse.json(
      { error: 'Missing required fields: title, content' },
      { status: 400 },
    );
  }

  const supabase = createServiceClientWithoutCookies();

  const doc = {
    agency_id: agency.id,
    client_id: body.clientId || null,
    title: body.title.trim(),
    content: body.content.trim(),
    source_type: body.sourceType || 'text',
    source_url: body.sourceUrl || null,
    file_name: body.fileName || null,
    mime_type: body.mimeType || null,
    char_count: body.content.trim().length,
    enabled: true,
  };

  const { data, error } = await supabase
    .from('knowledge_documents')
    .insert(doc)
    .select()
    .single();

  if (error) {
    console.error('[knowledge] Create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ document: data });
}

// PATCH — Update a knowledge document
export async function PATCH(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const body = await request.json();

  if (!body.id) {
    return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  const updates: any = {};
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.content !== undefined) {
    updates.content = body.content.trim();
    updates.char_count = updates.content.length;
  }
  if (body.clientId !== undefined) updates.client_id = body.clientId || null;
  if (body.enabled !== undefined) updates.enabled = body.enabled;
  if (body.sourceUrl !== undefined) updates.source_url = body.sourceUrl;

  const { data, error } = await supabase
    .from('knowledge_documents')
    .update(updates)
    .eq('id', body.id)
    .eq('agency_id', agency.id)
    .select()
    .single();

  if (error) {
    console.error('[knowledge] Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ document: data });
}

// DELETE — Remove a knowledge document
export async function DELETE(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const { searchParams } = new URL(request.url);
  const docId = searchParams.get('id');

  if (!docId) {
    return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  const { error } = await supabase
    .from('knowledge_documents')
    .delete()
    .eq('id', docId)
    .eq('agency_id', agency.id);

  if (error) {
    console.error('[knowledge] Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
