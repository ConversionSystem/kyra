// ============================================================================
// POST /api/agency/sites/[id]/pages/[slug]/revisions/[revisionId]/restore
//
// One-click restore: write the revision's snapshot back into the page row.
// Before writing, we ALSO snapshot the current state so the customer can
// undo the restore itself (every action is reversible — that's the whole
// promise of version history).
//
// Sprint 4 — Page Version History (2026-05-14).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string; slug: string; revisionId: string }>;
}

/** Same surface PATCH writes; must match PAGE_REVISION_FIELDS in
 *  /pages/[slug]/route.ts. Duplicated here so this endpoint doesn't have
 *  to import from a sibling route module (Next.js doesn't always like
 *  cross-route imports for tree-shaking reasons). */
const RESTORABLE_FIELDS = [
  'title', 'slug', 'meta_title', 'meta_description',
  'hero_h1', 'hero_subtitle', 'hero_cta_text', 'hero_cta_link',
  'content_sections', 'faq', 'schema_markup',
  'hidden',
] as const;

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { id: siteId, slug, revisionId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createServiceClientWithoutCookies();

  // Verify agency owns site
  const { data: site } = await supabase
    .from('client_sites')
    .select('id')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const decodedSlug = decodeURIComponent(slug);
  const { data: page } = await supabase
    .from('site_pages')
    .select('*')
    .eq('site_id', siteId)
    .eq('slug', decodedSlug)
    .single();
  if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

  // Fetch the target revision — must belong to this page (defense in depth
  // against ID-swap attempts even though RLS already enforces it).
  const { data: revision } = await supabase
    .from('page_revisions')
    .select('id, snapshot, page_id')
    .eq('id', revisionId)
    .eq('page_id', page.id)
    .single();
  if (!revision) return NextResponse.json({ error: 'Revision not found' }, { status: 404 });

  // Snapshot CURRENT state first so the restore itself is reversible.
  const currentSnapshot: Record<string, unknown> = {};
  for (const f of RESTORABLE_FIELDS) {
    currentSnapshot[f] = (page as Record<string, unknown>)[f];
  }
  await supabase.from('page_revisions').insert({
    site_id: siteId,
    page_id: page.id,
    snapshot: currentSnapshot,
    edited_by: auth.data.user.id,
    note: `Pre-restore snapshot (restoring to ${new Date().toISOString()})`,
  }).then(() => {}, (err) => console.error('[restore] pre-snapshot failed', err));

  // Build the update from the snapshot. Reject snapshots that try to
  // smuggle non-allowlisted fields by projecting only RESTORABLE_FIELDS.
  const snapshot = (revision.snapshot || {}) as Record<string, unknown>;
  const updates: Record<string, unknown> = {
    edited: true,
    edited_at: new Date().toISOString(),
  };
  for (const f of RESTORABLE_FIELDS) {
    if (f in snapshot) updates[f] = snapshot[f];
  }

  const { data: restored, error: updErr } = await supabase
    .from('site_pages')
    .update(updates)
    .eq('id', page.id)
    .select()
    .single();
  if (updErr || !restored) {
    console.error('[restore] update failed', updErr);
    return NextResponse.json({ error: 'Failed to restore revision' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: restored });
}
