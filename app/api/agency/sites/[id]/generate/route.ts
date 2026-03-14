import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { generateSiteContent } from '@/lib/sites/content-engine';

// Allow up to 5 minutes — content generation calls multiple LLM APIs
export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agency/sites/[id]/generate
 * Triggers AI content generation for the site.
 * Uses waitUntil() so Vercel keeps the function alive until generation completes —
 * without waitUntil, Vercel kills the background promise immediately after response is sent.
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

  // Mark as generating
  const { error: updateError } = await supabase
    .from('client_sites')
    .update({ status: 'generating', updated_at: new Date().toISOString() })
    .eq('id', siteId);

  if (updateError) {
    console.error('[sites/generate] Failed to update status:', updateError);
    return NextResponse.json({ error: 'Failed to start generation' }, { status: 500 });
  }

  // waitUntil: keeps the Vercel function alive until generation completes,
  // even after the HTTP response has been sent. Without this, Vercel terminates
  // the background promise immediately and the site stays stuck on 'generating'.
  waitUntil(
    generateSiteContent(siteId).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[sites/generate] Content generation failed for site ${siteId}:`, message);
      // Mark site as error so the frontend stops polling
      supabase
        .from('client_sites')
        .update({ status: 'error', updated_at: new Date().toISOString() })
        .eq('id', siteId)
        .then(() => {}, () => {});
    })
  );

  return NextResponse.json({ ok: true, data: { status: 'generating' } });
}
