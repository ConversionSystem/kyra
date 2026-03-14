import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agency/sites/[id]/deploys
 * Returns deploy history for a site (last 20).
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createServiceClientWithoutCookies();

  // Verify ownership
  const { data: site } = await supabase
    .from('client_sites')
    .select('id')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  const { data: deploys, error } = await supabase
    .from('site_deploys')
    .select('*')
    .eq('site_id', siteId)
    .order('deployed_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch deploy history' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: deploys ?? [] });
}
