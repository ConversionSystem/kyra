import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { generateSiteContent } from '@/lib/sites/content-engine';
// ClientSite type used internally by generateSiteContent

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agency/sites/[id]/generate
 * Triggers content generation for the site.
 * Sets status='generating' and kicks off the content engine in the background.
 * Returns immediately.
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createServiceClientWithoutCookies();

  // Fetch site and verify ownership
  const { data: site, error: fetchError } = await supabase
    .from('client_sites')
    .select('*')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();

  if (fetchError || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  // Don't re-generate if already in progress
  if (site.status === 'generating') {
    return NextResponse.json(
      { error: 'Content generation already in progress' },
      { status: 409 }
    );
  }

  // Set status to generating
  const { error: updateError } = await supabase
    .from('client_sites')
    .update({ status: 'generating', updated_at: new Date().toISOString() })
    .eq('id', siteId);

  if (updateError) {
    console.error('[sites/generate] Failed to update status:', updateError);
    return NextResponse.json({ error: 'Failed to start generation' }, { status: 500 });
  }

  // Fire-and-forget: kick off content generation
  generateSiteContent(siteId).catch((err) => {
    console.error(`[sites/generate] Content generation failed for site ${siteId}:`, err);
    // Set status to error on failure
    supabase
      .from('client_sites')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('id', siteId)
      .then();
  });

  return NextResponse.json({ ok: true, data: { status: 'generating' } });
}
