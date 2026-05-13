import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { regeneratePage } from '@/lib/sites/content-engine';
import type { ClientSite } from '@/lib/sites/types';

interface RouteContext {
  params: Promise<{ id: string; slug: string }>;
}

/**
 * Helper: verify site ownership and fetch the page by slug.
 */
async function getSiteAndPage(siteId: string, slug: string, agencyId: string) {
  const supabase = createServiceClientWithoutCookies();

  const { data: site } = await supabase
    .from('client_sites')
    .select('*')
    .eq('id', siteId)
    .eq('agency_id', agencyId)
    .single();

  if (!site) return { site: null, page: null, error: 'Site not found' as const };

  // Slugs arrive URL-encoded (e.g. "services%2Fac-repair"). Decode for DB lookup.
  const decodedSlug = decodeURIComponent(slug);

  const { data: page } = await supabase
    .from('site_pages')
    .select('*')
    .eq('site_id', siteId)
    .eq('slug', decodedSlug)
    .single();

  if (!page) return { site, page: null, error: 'Page not found' as const };

  return { site, page, error: null };
}

/**
 * GET /api/agency/sites/[id]/pages/[slug]
 * Get a single page's content.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id: siteId, slug } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const result = await getSiteAndPage(siteId, slug, auth.data.agency.id);
  if (result.error) {
    const status = result.error === 'Site not found' ? 404 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, data: result.page });
}

/**
 * PATCH /api/agency/sites/[id]/pages/[slug]
 * Save user edits to a page.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id: siteId, slug } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = await getSiteAndPage(siteId, slug, auth.data.agency.id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  // Allowlist of editable page fields. `slug` added 2026-05-13 with the
  // new Page Settings UI — needs extra validation below (normalize +
  // uniqueness + homepage protection).
  const allowedFields = [
    'title', 'slug', 'meta_title', 'meta_description',
    'hero_h1', 'hero_subtitle', 'hero_cta_text', 'hero_cta_link',
    'content_sections', 'faq', 'schema_markup',
    'hidden',
  ];

  const updates: Record<string, unknown> = {
    edited: true,
    edited_at: new Date().toISOString(),
  };
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  // ── Slug rename validation ─────────────────────────────────────────────
  // DB convention: slugs are stored without a leading slash. Homepage
  // row has slug='home' and page_type='homepage'. We protect the homepage
  // row via page_type (more reliable than slug comparison) and block any
  // other page from claiming the 'home' slot.
  if ('slug' in updates) {
    const rawSlug = String(updates.slug || '').trim().toLowerCase();
    // Normalize: no leading/trailing slashes, kebab-case, single dashes.
    const normalized = rawSlug
      .replace(/^\/+|\/+$/g, '')
      .replace(/[^a-z0-9\-/]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const currentPage = result.page!;
    const isHomepageRow = currentPage.page_type === 'homepage' || currentPage.slug === 'home';

    if (isHomepageRow && normalized !== currentPage.slug) {
      return NextResponse.json(
        { error: 'The homepage slot is reserved and its URL slug cannot be changed.' },
        { status: 400 },
      );
    }
    if (!isHomepageRow && (normalized === 'home' || normalized === '')) {
      return NextResponse.json(
        { error: 'Cannot rename a page to "home" — that slot is reserved for the homepage.' },
        { status: 400 },
      );
    }

    if (normalized !== currentPage.slug) {
      const supabaseCheck = createServiceClientWithoutCookies();
      const { data: collision } = await supabaseCheck
        .from('site_pages')
        .select('id')
        .eq('site_id', siteId)
        .eq('slug', normalized)
        .neq('id', currentPage.id)
        .maybeSingle();
      if (collision) {
        return NextResponse.json(
          { error: `Another page already uses the URL "${normalized}". Pick a different slug.` },
          { status: 409 },
        );
      }
      updates.slug = normalized;
    } else {
      // No-op slug change — drop so edited_at doesn't tick.
      delete updates.slug;
    }
  }

  const supabase = createServiceClientWithoutCookies();

  const { data: page, error } = await supabase
    .from('site_pages')
    .update(updates)
    .eq('id', result.page!.id)
    .select()
    .single();

  if (error || !page) {
    console.error('[sites/pages] Failed to update page:', error);
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
  }

  // NOTE: Rebuild is triggered explicitly by the user via the "Publish to Live Site" button
  // which calls POST /api/agency/sites/[id]/build — do NOT auto-trigger here.
  // Auto-triggering a full 5-min VPS build on every keystroke/save is too expensive.

  return NextResponse.json({ ok: true, data: page });
}

/**
 * POST /api/agency/sites/[id]/pages/[slug]
 * With action='regenerate': re-generate a single page with AI.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id: siteId, slug } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  let body: { action?: string; feedback?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.action !== 'regenerate') {
    return NextResponse.json({ error: 'Unknown action. Supported: regenerate' }, { status: 400 });
  }

  const result = await getSiteAndPage(siteId, slug, auth.data.agency.id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  const decodedSlug = decodeURIComponent(slug);

  // Fire-and-forget regeneration
  regeneratePage(result.site.id, decodedSlug, body.feedback).catch((err) => {
    console.error(`[sites/pages] Regeneration failed for page ${decodedSlug}:`, err);
  });

  return NextResponse.json({ ok: true, data: { status: 'regenerating', slug: decodedSlug } });
}

/**
 * DELETE /api/agency/sites/[id]/pages/[slug]
 * Delete a page from a site.
 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id: siteId, slug } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const result = await getSiteAndPage(siteId, slug, auth.data.agency.id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  const supabase = createServiceClientWithoutCookies();
  await supabase.from('site_pages').delete().eq('id', result.page!.id);

  // Update page count
  const { count } = await supabase
    .from('site_pages')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', siteId);

  await supabase
    .from('client_sites')
    .update({ page_count: count || 0 })
    .eq('id', siteId);

  return NextResponse.json({ ok: true });
}
