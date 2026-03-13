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
