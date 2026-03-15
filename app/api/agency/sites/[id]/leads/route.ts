/**
 * GET /api/agency/sites/[id]/leads
 *
 * Returns leads (crm_contacts) for the client associated with this site.
 * Authenticated: agency must own the site.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const { id: siteId } = await params;
  const supabase = createServiceClientWithoutCookies();

  // Verify site belongs to this agency
  const { data: site } = await supabase
    .from('client_sites')
    .select('id, client_id, business_name')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  if (!site.client_id) {
    return NextResponse.json({ data: [], total: 0 });
  }

  const limit = Number(request.nextUrl.searchParams.get('limit') || '50');
  const offset = Number(request.nextUrl.searchParams.get('offset') || '0');

  const { data: contacts, count } = await supabase
    .from('crm_contacts')
    .select('id, first_name, last_name, email, phone, stage, source, created_at, custom_fields', { count: 'exact' })
    .eq('client_id', site.client_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return NextResponse.json({
    data: contacts || [],
    total: count || 0,
  });
}
