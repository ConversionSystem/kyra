import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agency/sites/[id]/deploy
 * Stub: triggers site deployment to VPS/nginx.
 * Sets status='deploying'. Full implementation coming in Sprint 2.
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createServiceClientWithoutCookies();

  // Verify site belongs to this agency
  const { data: site } = await supabase
    .from('client_sites')
    .select('id, status')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  // Update status
  const { error } = await supabase
    .from('client_sites')
    .update({ status: 'deploying', updated_at: new Date().toISOString() })
    .eq('id', siteId);

  if (error) {
    console.error('[sites/deploy] Failed to update status:', error);
    return NextResponse.json({ error: 'Failed to start deploy' }, { status: 500 });
  }

  // TODO: Trigger actual deploy pipeline (Sprint 2)
  // - Upload static files to VPS
  // - Configure nginx server block
  // - Set up Cloudflare DNS
  // - Update status to 'live' or 'error'

  return NextResponse.json({ ok: true, data: { status: 'deploying' } });
}
