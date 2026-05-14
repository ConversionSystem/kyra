// ============================================================================
// /api/agency/sites/[id]/pages/[slug]/revisions
//
// GET → returns the page's revision feed (newest first), capped at the same
//        retention window the writer enforces. Each row carries the snapshot
//        blob so the editor can preview a revision in-place before deciding
//        whether to restore.
//
// Sprint 4 — Page Version History (2026-05-14).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string; slug: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id: siteId, slug } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createServiceClientWithoutCookies();

  // Verify the site belongs to this agency before we leak page IDs.
  const { data: site } = await supabase
    .from('client_sites')
    .select('id')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  // Decoded slug — same encoding convention as the PATCH endpoint.
  const decodedSlug = decodeURIComponent(slug);
  const { data: page } = await supabase
    .from('site_pages')
    .select('id')
    .eq('site_id', siteId)
    .eq('slug', decodedSlug)
    .single();
  if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

  const { data: revisions, error } = await supabase
    .from('page_revisions')
    .select('id, snapshot, edited_by, note, created_at')
    .eq('page_id', page.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('[sites/pages/revisions] fetch failed', error);
    return NextResponse.json({ error: 'Failed to fetch revisions' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: revisions ?? [] });
}
