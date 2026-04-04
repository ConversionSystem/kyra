import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { submitSitemapToGSC } from '@/lib/integrations/gsc';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agency/sites/[id]/submit-sitemap
 * Manually submit this site's sitemap to Google Search Console.
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createServiceClientWithoutCookies();

  const { data: site } = await supabase
    .from('client_sites')
    .select('id, site_domain, site_subdomain')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  const domain = site.site_domain || site.site_subdomain;
  if (!domain) {
    return NextResponse.json({ error: 'No domain configured for this site' }, { status: 400 });
  }

  const result = await submitSitemapToGSC(`https://${domain}/`, `https://${domain}/sitemap.xml`);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
