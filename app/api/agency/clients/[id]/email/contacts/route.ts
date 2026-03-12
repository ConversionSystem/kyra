import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';
import { importContacts } from '@/lib/email/marketing';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/agency/clients/[id]/email/contacts
 * List contacts with search, tag filter, status filter, pagination.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id: clientId } = await context.params;
  const result = await requireAgencyAdmin();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: result.error.status });

  const { agency } = result.data;
  const supabase = await createClient();
  const url = new URL(request.url);

  const search = url.searchParams.get('search') || '';
  const tag = url.searchParams.get('tag') || '';
  const status = url.searchParams.get('status') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;

  let query = supabase
    .from('email_contacts')
    .select('*', { count: 'exact' })
    .eq('agency_id', agency.id)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  }
  if (tag) {
    query = query.contains('tags', [tag]);
  }
  if (status) {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });

  return NextResponse.json({ contacts: data, total: count, page, limit });
}

/**
 * POST /api/agency/clients/[id]/email/contacts
 * Add single contact or bulk import (JSON array).
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: clientId } = await context.params;
  const result = await requireAgencyAdmin();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: result.error.status });

  const { agency } = result.data;
  const body = await request.json();

  // Bulk import if array
  if (Array.isArray(body)) {
    const importResult = await importContacts(agency.id, clientId, body);
    return NextResponse.json(importResult, { status: 201 });
  }

  // Single contact
  const { email, first_name, last_name, phone, tags } = body;
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('email_contacts')
    .upsert(
      {
        agency_id: agency.id,
        client_id: clientId,
        email: email.toLowerCase().trim(),
        first_name: first_name || null,
        last_name: last_name || null,
        phone: phone || null,
        tags: tags || [],
        source: 'manual',
      },
      { onConflict: 'agency_id,client_id,email' },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to add contact' }, { status: 500 });
  return NextResponse.json({ contact: data }, { status: 201 });
}

/**
 * DELETE /api/agency/clients/[id]/email/contacts
 * Remove contacts by IDs.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id: clientId } = await context.params;
  const result = await requireAgencyAdmin();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: result.error.status });

  const { agency } = result.data;
  const body = await request.json();
  const ids: string[] = body.ids;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Provide an array of contact IDs' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('email_contacts')
    .delete()
    .eq('agency_id', agency.id)
    .eq('client_id', clientId)
    .in('id', ids);

  if (error) return NextResponse.json({ error: 'Failed to delete contacts' }, { status: 500 });
  return NextResponse.json({ success: true, deleted: ids.length });
}
