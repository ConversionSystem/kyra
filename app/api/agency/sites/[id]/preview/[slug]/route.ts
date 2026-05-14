// ============================================================================
// GET /api/agency/sites/[id]/preview/[slug]
//
// Returns the assembled HTML for a single page rendered from the CURRENT
// draft state in Supabase — no VPS build, no provisioner. The editor's
// preview iframe points here so customers can see edits live without
// waiting on a 3-5 min rebuild.
//
// Sprint 6 — Live Preview (2026-05-14).
//
// Auth: agency member who owns the site. Hidden pages render too (the
// whole point is to preview drafts).
//
// Caching: no-store. Stale previews are confusing — re-renders are cheap
// (no LLM, no provisioner), so we always reflect the latest DB state.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { assembleSitePages } from '@/lib/sites/build-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

  const { data: site } = await supabase
    .from('client_sites')
    .select('*')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const decodedSlug = decodeURIComponent(slug);

  // Pull every page so the assembler can build proper nav links from the
  // full site graph. The assembler filters hidden pages from sitemap/nav
  // but we still need them in the pages list for self-reference.
  const { data: pages } = await supabase
    .from('site_pages')
    .select('*')
    .eq('site_id', siteId)
    .order('page_type');

  if (!pages || pages.length === 0) {
    return new NextResponse(
      `<!doctype html><html><body style="font-family: system-ui; padding: 2rem; color: #6b7280;">
       <h1>No pages yet</h1>
       <p>This site has no pages to preview. Generate content or add a page first.</p>
       </body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
    );
  }

  const target = pages.find((p: { slug: string }) => p.slug === decodedSlug);
  if (!target) {
    return new NextResponse(
      `<!doctype html><html><body style="font-family: system-ui; padding: 2rem; color: #6b7280;">
       <h1>Page not found</h1>
       <p>Slug <code>${decodedSlug}</code> has no row yet. Save the page from the editor first.</p>
       </body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
    );
  }

  // Reuse the shared build-helpers assembler so the preview looks IDENTICAL
  // to what the VPS will eventually deploy. The function returns assembled
  // pages keyed by slug — we just pluck the requested one.
  try {
    const { assembledPages } = await assembleSitePages(site, pages, supabase);
    const hit = assembledPages.find((p) => p.slug === decodedSlug);
    if (!hit) {
      return new NextResponse(
        `<!doctype html><html><body style="font-family: system-ui; padding: 2rem; color: #ef4444;">
         <h1>Preview unavailable</h1>
         <p>The assembler skipped this page (it may be in a custom template branch). Hit Publish to Live to see the production render.</p>
         </body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
      );
    }
    return new NextResponse(hit.html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        // Prevent the preview from being clickjacked into other surfaces.
        // We DON'T set X-Frame-Options to ALLOW our own dashboard origin
        // because the iframe is same-origin (same Vercel host) so default
        // sameorigin is fine. If we ever serve previews from a different
        // origin, add ALLOW-FROM here.
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  } catch (err) {
    console.error('[sites/preview] assemble failed', err);
    return new NextResponse(
      `<!doctype html><html><body style="font-family: system-ui; padding: 2rem; color: #ef4444;">
       <h1>Preview render failed</h1>
       <pre style="white-space: pre-wrap; background: #fef2f2; border: 1px solid #fecaca; padding: 1rem; border-radius: 8px; font-size: 12px;">${
         (err instanceof Error ? err.message : String(err)).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))
       }</pre>
       </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
    );
  }
}
