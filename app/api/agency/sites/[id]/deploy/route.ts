import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agency/sites/[id]/deploy
 * Redeploys a site that's already been built.
 * Triggers a rebuild with the latest content from site_pages.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createServiceClientWithoutCookies();

  const { data: site } = await supabase
    .from('client_sites')
    .select('id, status, site_domain, site_subdomain, agency_id')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  if (!site.site_domain && !site.site_subdomain) {
    return NextResponse.json({ error: 'No domain configured' }, { status: 400 });
  }

  // Forward to build endpoint (build = deploy for static sites)
  const buildUrl = new URL(`/api/agency/sites/${siteId}/build`, request.url);
  const buildRes = await fetch(buildUrl, {
    method: 'POST',
    headers: Object.fromEntries(request.headers),
  });

  const data = await buildRes.json();
  return NextResponse.json(data, { status: buildRes.status });
}
