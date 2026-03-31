import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agency/sites/[id]/pages
 * List all pages for a site.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createServiceClientWithoutCookies();

  // Verify site belongs to this agency
  const { data: site } = await supabase
    .from('client_sites')
    .select('id')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  const { data: pages, error } = await supabase
    .from('site_pages')
    .select('*')
    .eq('site_id', siteId)
    .order('page_type', { ascending: true })
    .order('slug', { ascending: true });

  if (error) {
    console.error('[sites/pages] Failed to list pages:', error);
    return NextResponse.json({ error: 'Failed to list pages' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: pages });
}

/**
 * POST /api/agency/sites/[id]/pages
 * Create a new page for a site.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

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

  const { title, slug, page_type } = body as { title?: string; slug?: string; page_type?: string };
  if (!title || !slug) {
    return NextResponse.json({ error: 'title and slug required' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  // Verify site belongs to this agency
  const { data: site } = await supabase
    .from('client_sites')
    .select('id')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  // Build insert payload — support optional fields for page duplication
  const optionalFields = [
    'hero_h1', 'hero_subtitle', 'hero_cta_text', 'hero_cta_link',
    'meta_title', 'meta_description',
    'content_sections', 'faq', 'schema_markup',
  ];
  const insertData: Record<string, unknown> = {
    site_id: siteId,
    title,
    slug,
    page_type: page_type || 'utility',
    hero_h1: (body.hero_h1 as string) || title,
    content_sections: body.content_sections || [{ heading: 'About', body: '' }],
    source: body.source || 'manual',
  };
  for (const key of optionalFields) {
    if (key in body && !(key in insertData)) {
      insertData[key] = body[key];
    }
  }

  const { data: page, error } = await supabase
    .from('site_pages')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[sites/pages] Failed to create page:', error);
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }

  // Update page count on site
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
