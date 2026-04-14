// ============================================================================
// POST /api/agency/sites/[id]/seo/submit
// Submits the site's sitemap to all search engines and LLMs
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { submitToSearchEngines } from '@/lib/sites/seo-helpers';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: siteId } = await params;

  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClientWithoutCookies();

  // Verify site ownership via agency
  const { data: site } = await service
    .from('client_sites')
    .select('id, agency_id, site_domain, site_subdomain')
    .eq('id', siteId)
    .single();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const { data: agency } = await service
    .from('agencies')
    .select('id')
    .eq('id', site.agency_id)
    .eq('owner_id', user.id)
    .single();

  if (!agency) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const domain = site.site_domain || site.site_subdomain;
  if (!domain) {
    return NextResponse.json({ error: 'Site has no domain configured' }, { status: 400 });
  }

  const result = await submitToSearchEngines(domain);

  return NextResponse.json({
    site_id: siteId,
    domain,
    submitted_at: new Date().toISOString(),
    ...result,
  });
}
