// ============================================================================
// POST /api/agency/sites/[id]/pages/from-template
//
// Create a new page pre-populated from one of the curated PAGE_TEMPLATES.
// Customers pick a template (About / Pricing / Services / Contact /
// Landing) and we hydrate hero, content_sections, faq, and meta from the
// library server-side. Client only sends { template, slug, title }.
//
// Sprint 6 — Page Templates Library (2026-05-14).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getPageTemplate, PAGE_TEMPLATES } from '@/lib/sites/page-templates';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Same normalization rule as the PATCH endpoint to keep slug discipline. */
function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9\-/]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  let body: { template?: string; slug?: string; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const templateId = (body.template || '').trim();
  const rawSlug = (body.slug || '').trim();
  const rawTitle = (body.title || '').trim();

  if (!templateId || !rawSlug || !rawTitle) {
    return NextResponse.json(
      { error: 'template, slug, and title are required' },
      { status: 400 },
    );
  }

  const tpl = getPageTemplate(templateId);
  if (!tpl) {
    return NextResponse.json(
      { error: `Unknown template "${templateId}". Available: ${PAGE_TEMPLATES.map((t) => t.id).join(', ')}` },
      { status: 400 },
    );
  }

  const slug = normalizeSlug(rawSlug);
  if (!slug || slug === 'home') {
    return NextResponse.json(
      { error: 'Invalid slug. The "home" slot is reserved.' },
      { status: 400 },
    );
  }

  const supabase = createServiceClientWithoutCookies();

  // Verify site ownership
  const { data: site } = await supabase
    .from('client_sites')
    .select('id')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  // Slug collision check — same pattern as the PATCH endpoint.
  const { data: collision } = await supabase
    .from('site_pages')
    .select('id')
    .eq('site_id', siteId)
    .eq('slug', slug)
    .maybeSingle();
  if (collision) {
    return NextResponse.json(
      { error: `A page with slug "${slug}" already exists. Pick a different URL.` },
      { status: 409 },
    );
  }

  // Hydrate from the template. The customer-supplied title overrides the
  // template's hero.h1 default — that's the one piece of personalization
  // we expect agencies to do upfront. Everything else they edit after.
  const insertData = {
    site_id: siteId,
    title: rawTitle,
    slug,
    page_type: tpl.pageType,
    hero_h1: tpl.hero.h1.replace('[Your Business]', rawTitle) || rawTitle,
    hero_subtitle: tpl.hero.subtitle,
    hero_cta_text: tpl.hero.ctaText,
    hero_cta_link: tpl.hero.ctaLink || '#contact',
    meta_title: tpl.metaTitle,
    meta_description: tpl.metaDescription,
    content_sections: tpl.contentSections,
    faq: tpl.faq || null,
    source: 'template',
    hidden: true, // Start in Draft so the agency can edit placeholders before going live.
  };

  const { data: page, error } = await supabase
    .from('site_pages')
    .insert(insertData)
    .select()
    .single();

  if (error || !page) {
    console.error('[sites/pages/from-template] insert failed', error);
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }

  // Keep client_sites.page_count in sync.
  const { count } = await supabase
    .from('site_pages')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', siteId);
  await supabase
    .from('client_sites')
    .update({ page_count: count || 0 })
    .eq('id', siteId);

  return NextResponse.json({ ok: true, data: page }, { status: 201 });
}

/**
 * GET /api/agency/sites/[id]/pages/from-template
 * Returns the public-facing template catalog for the UI picker. Agency
 * scope is enforced even though the catalog is shared, so we can later
 * scope templates per-agency without breaking the contract.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;
  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  // We don't return contentSections / faq blobs in the catalog — too heavy
  // for a picker UI. The client only needs id/label/description/icon.
  const data = PAGE_TEMPLATES.map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description,
    icon: t.icon,
    pageType: t.pageType,
  }));

  return NextResponse.json({ ok: true, data, siteId });
}
