/**
 * POST /api/admin/batch-regen
 *
 * Admin-only endpoint to regenerate all live site content with the latest
 * content engine (Claude Sonnet 4.6). Auth via KYRA_API_SECRET bearer token.
 *
 * Query params:
 *   ?siteId=xxx   — regenerate a single site
 *   (no params)   — regenerate ALL live sites (sequential, ~3-5 min each)
 *
 * This deletes old site_pages, regenerates all content, then triggers a build.
 */

import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { generateSiteContent } from '@/lib/sites/content-engine';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const maxDuration = 300;

const KYRA_API_SECRET = process.env.KYRA_API_SECRET || '';

export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!KYRA_API_SECRET || token !== KYRA_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const singleSiteId = searchParams.get('siteId');

  const supabase = createServiceClientWithoutCookies();

  if (singleSiteId) {
    // Regenerate a single site
    waitUntil(regenSite(singleSiteId, supabase));
    return NextResponse.json({ ok: true, mode: 'single', siteId: singleSiteId });
  }

  // Regenerate all live sites
  const { data: sites } = await supabase
    .from('client_sites')
    .select('id, business_name')
    .eq('status', 'live');

  if (!sites?.length) {
    return NextResponse.json({ ok: true, message: 'No live sites found' });
  }

  // Start batch in background
  waitUntil(batchRegen(sites, supabase));
  return NextResponse.json({ ok: true, mode: 'batch', count: sites.length, sites: sites.map(s => s.business_name) });
}

async function regenSite(siteId: string, supabase: ReturnType<typeof createServiceClientWithoutCookies>) {
  try {
    console.log(`[batch-regen] Starting regeneration for site ${siteId}`);

    // Delete old pages
    await supabase.from('site_pages').delete().eq('site_id', siteId);

    // Mark as generating
    await supabase.from('client_sites').update({ status: 'generating' }).eq('id', siteId);

    // Generate new content with Claude Sonnet 4.6
    const result = await generateSiteContent(siteId);

    if (result.success) {
      console.log(`[batch-regen] Site ${siteId} regenerated: ${result.pageCount} pages`);
    } else {
      console.error(`[batch-regen] Site ${siteId} generation failed:`, result.error);
      await supabase.from('client_sites').update({ status: 'error' }).eq('id', siteId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[batch-regen] Site ${siteId} error:`, msg);
    await supabase.from('client_sites').update({ status: 'error' }).eq('id', siteId);
  }
}

async function batchRegen(
  sites: Array<{ id: string; business_name: string }>,
  supabase: ReturnType<typeof createServiceClientWithoutCookies>,
) {
  console.log(`[batch-regen] Starting batch regeneration of ${sites.length} sites`);

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    console.log(`[batch-regen] [${i + 1}/${sites.length}] ${site.business_name}`);

    await regenSite(site.id, supabase);

    // Pause between sites to avoid API rate limits (Claude Sonnet 4.6)
    if (i < sites.length - 1) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log(`[batch-regen] Batch complete: ${sites.length} sites processed`);
}
