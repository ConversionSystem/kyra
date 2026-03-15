/**
 * POST /api/agency/sites/[id]/sync-status
 *
 * Checks if the site is actually live on the VPS and syncs the DB status.
 * Useful when DB is stuck at "deploying" but the site is already live.
 * Also called automatically when the dashboard loads a site stuck in deploying.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const { id: siteId } = await params;
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

  // Only self-heal if stuck in deploying/building/generating for too long
  if (!['deploying', 'building', 'generating'].includes(site.status)) {
    return NextResponse.json({ status: site.status, healed: false });
  }

  const domain = site.site_domain || site.site_subdomain;
  if (!domain) {
    return NextResponse.json({ status: site.status, healed: false });
  }

  // Check if the site is actually live by hitting the URL
  try {
    const siteUrl = `https://${domain}`;
    const res = await fetch(siteUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
    });

    if (res.ok || res.status === 200) {
      // Site is live — sync the DB
      const now = new Date().toISOString();
      await supabase
        .from('client_sites')
        .update({
          status: 'live',
          last_deployed_at: now,
          nginx_configured: true,
          ssl_active: true,
          updated_at: now,
        })
        .eq('id', siteId);

      return NextResponse.json({ status: 'live', healed: true, url: siteUrl });
    }
  } catch {
    // Couldn't reach the site — leave status as-is
  }

  return NextResponse.json({ status: site.status, healed: false });
}
