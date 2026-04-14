// ============================================================================
// GET  /api/agency/sites/[id]/seo        — Get SEO metrics + summary for site
// POST /api/agency/sites/[id]/seo        — GSC connect / trigger sync
//
// Site-centric SEO dashboard data. Pulls from normalized seo_* tables.
// Available to ALL paid plans (no vet-seo-worker gate).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getPageMetricsSummary, syncGSCMetrics } from '@/lib/seo/gsc-sync';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: siteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClientWithoutCookies();

  // Verify site ownership via agency
  const { data: site } = await service
    .from('client_sites')
    .select('id, agency_id, client_id, site_domain, site_subdomain, search_console_connected, seo_industry_pack_id, industry, ga4_id, gsc_site_url, gsc_metrics, last_gsc_sync')
    .eq('id', siteId)
    .single();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  // Verify user owns this agency
  const { data: agency } = await service
    .from('agencies')
    .select('id')
    .eq('id', site.agency_id)
    .eq('owner_id', user.id)
    .single();

  if (!agency) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const siteUrl = `https://${site.site_domain || site.site_subdomain}`;

  // Determine GSC connection status (handle missing columns gracefully)
  let gscConnected = false;
  let gscSiteUrl: string | null = null;
  let gscMetrics: Record<string, unknown> | null = null;
  let lastGscSync: string | null = null;
  try {
    gscConnected = !!(site as Record<string, unknown>).search_console_connected;
    gscSiteUrl = ((site as Record<string, unknown>).gsc_site_url as string) || null;
    gscMetrics = ((site as Record<string, unknown>).gsc_metrics as Record<string, unknown>) || null;
    lastGscSync = ((site as Record<string, unknown>).last_gsc_sync as string) || null;
  } catch {
    // GSC columns may not exist yet
  }

  // Fetch all data in parallel
  const [
    metricsSummary,
    geoResults,
    napAudits,
    contentGaps,
    keywordRankings,
    publishedContent,
    publishQueue,
  ] = await Promise.all([
    getPageMetricsSummary(siteId, siteUrl).catch(() => ({
      total_clicks: 0,
      total_impressions: 0,
      avg_ctr: 0,
      avg_position: 0,
      page_count: 0,
      top_pages: [],
      quick_wins: [],
      ranking_drops: [],
    })),
    service.from('seo_geo_results').select('*').eq('site_id', siteId).order('tested_at', { ascending: false }).limit(100),
    service.from('seo_nap_audits').select('*').eq('site_id', siteId).order('audited_at', { ascending: false }).limit(50),
    service.from('seo_content_gaps').select('*').eq('site_id', siteId).eq('resolved', false).order('priority_score', { ascending: false }).limit(20),
    service.from('seo_keyword_rankings').select('*').eq('site_id', siteId).order('date', { ascending: false }).limit(100),
    service.from('seo_published_content').select('*').eq('site_id', siteId).order('published_at', { ascending: false }).limit(50),
    service.from('seo_publish_queue').select('*').eq('site_id', siteId).eq('status', 'pending').order('scheduled_at').limit(20),
  ]);

  // Compute GEO score from recent results
  const recentGeo = (geoResults.data || []).filter(r => {
    const age = Date.now() - new Date(r.tested_at).getTime();
    return age < 14 * 86400000; // last 14 days
  });
  const geoTotal = recentGeo.length;
  const geoCited = recentGeo.filter(r => r.cited).length;
  const geoScore = geoTotal > 0 ? Math.round((geoCited / geoTotal) * 100) : null;

  // Compute NAP health
  const recentNap = (napAudits.data || []).slice(0, 20);
  const napMatches = recentNap.filter(r => r.status === 'match').length;
  const napHealth = recentNap.length > 0 ? Math.round((napMatches / recentNap.length) * 100) : null;

  return NextResponse.json({
    site_id: siteId,
    client_id: site.client_id || null,
    industry: site.industry,
    industry_pack_id: site.seo_industry_pack_id,
    gsc_connected: gscConnected,
    gsc_site_url: gscSiteUrl,
    gsc_metrics: gscMetrics,
    last_gsc_sync: lastGscSync,
    ga4_id: (site as Record<string, unknown>).ga4_id || null,
    metrics: metricsSummary,
    geo: {
      score: geoScore,
      total_queries: geoTotal,
      cited: geoCited,
      results: recentGeo.slice(0, 50),
    },
    nap: {
      health: napHealth,
      total: recentNap.length,
      matches: napMatches,
      audits: recentNap,
    },
    content_gaps: contentGaps.data || [],
    keywords: keywordRankings.data || [],
    published_content: publishedContent.data || [],
    publish_queue: publishQueue.data || [],
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: siteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = body.action as string;

  const service = createServiceClientWithoutCookies();

  // Verify site ownership
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

  if (action === 'gsc_connect') {
    // Mark site as GSC connected (OAuth flow happens client-side)
    await service
      .from('client_sites')
      .update({ search_console_connected: true })
      .eq('id', siteId);

    return NextResponse.json({ success: true, message: 'GSC connected' });
  }

  if (action === 'sync_gsc') {
    const siteUrl = `https://${site.site_domain || site.site_subdomain}`;
    const result = await syncGSCMetrics(siteId, siteUrl);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Unknown action. Use "gsc_connect" or "sync_gsc".' }, { status: 400 });
}
