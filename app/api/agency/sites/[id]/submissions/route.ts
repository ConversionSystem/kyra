// ============================================================================
// GET /api/agency/sites/[id]/submissions
//
// Returns the latest form submissions for a site (paginated by simple
// limit + offset; default 50 / max 200). Optional `?pageSlug=...` filter
// scopes to a single page for the in-editor inbox modal.
//
// Sprint 5 — Form Builder (2026-05-14).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;
  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
  const offset = Number(url.searchParams.get('offset') || 0);
  const pageSlug = url.searchParams.get('pageSlug');

  const supabase = createServiceClientWithoutCookies();

  // Verify agency ownership before reading the submissions stream.
  const { data: site } = await supabase
    .from('client_sites')
    .select('id')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  let query = supabase
    .from('form_submissions')
    .select('id, page_slug, fields, name, email, phone, webhook_status, webhook_status_code, crm_contact_id, created_at', { count: 'exact' })
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (pageSlug) query = query.eq('page_slug', pageSlug);

  const { data: submissions, count, error } = await query;

  if (error) {
    console.error('[sites/submissions] fetch failed', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: submissions ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}
