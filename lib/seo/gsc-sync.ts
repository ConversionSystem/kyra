/**
 * GSC Sync — Google Search Console metrics sync
 *
 * Wraps lib/integrations/gsc.ts to pull performance data into
 * the normalized seo_page_metrics table. Called by daily cron.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getPerformance, getQuickWins, getRankingDrops } from '@/lib/integrations/gsc';
import type { QuickWinKeyword, RankDrop } from '@/lib/integrations/gsc';

// ── Types ────────────────────────────────────────────────────────────────

export interface PageMetricsSummary {
  total_clicks: number;
  total_impressions: number;
  avg_ctr: number;
  avg_position: number;
  page_count: number;
  top_pages: Array<{
    slug: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  quick_wins: QuickWinKeyword[];
  ranking_drops: RankDrop[];
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Sync GSC metrics for a site into seo_page_metrics table.
 * Pulls last 90 days of per-page performance data.
 */
export async function syncGSCMetrics(
  siteId: string,
  siteUrl: string,
): Promise<{ success: boolean; rowsUpserted: number; error?: string }> {
  const supabase = createServiceClientWithoutCookies();

  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];

    // Pull page-level performance data
    const result = await getPerformance(siteUrl, {
      startDate,
      endDate,
      dimensions: ['page', 'date' as 'query'],
      rowLimit: 5000,
    });

    if (result.mock) {
      return { success: false, rowsUpserted: 0, error: 'GSC not configured (mock data)' };
    }

    if (!result.data.length) {
      return { success: true, rowsUpserted: 0 };
    }

    // Transform GSC rows into seo_page_metrics records
    const records = result.data.map((row) => {
      // keys[0] = page URL, keys[1] = date
      const pageUrl = row.keys[0] || '';
      const date = row.keys[1] || endDate;

      // Extract slug from full URL
      const slug = extractSlugFromUrl(pageUrl, siteUrl);

      return {
        site_id: siteId,
        page_slug: slug,
        date,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: Math.round(row.ctr * 1000) / 1000,
        position: Math.round(row.position * 10) / 10,
      };
    });

    // Batch upsert (Supabase supports up to 1000 rows per upsert)
    let totalUpserted = 0;
    const batchSize = 500;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: upsertErr } = await supabase
        .from('seo_page_metrics')
        .upsert(batch, { onConflict: 'site_id,page_slug,date' });

      if (upsertErr) {
        console.error(`[gsc-sync] Batch upsert failed:`, upsertErr.message);
        continue;
      }
      totalUpserted += batch.length;
    }

    console.log(`[gsc-sync] Synced ${totalUpserted} metric rows for site ${siteId}`);
    return { success: true, rowsUpserted: totalUpserted };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[gsc-sync] Failed for site ${siteId}:`, message);
    return { success: false, rowsUpserted: 0, error: message };
  }
}

/**
 * Get aggregated page metrics for a site from the seo_page_metrics table.
 * Includes quick wins and ranking drops from live GSC data.
 */
export async function getPageMetricsSummary(
  siteId: string,
  siteUrl: string,
  days: number = 28,
): Promise<PageMetricsSummary> {
  const supabase = createServiceClientWithoutCookies();
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  // Get aggregated metrics from our cached table
  const { data: metrics } = await supabase
    .from('seo_page_metrics')
    .select('page_slug, clicks, impressions, ctr, position')
    .eq('site_id', siteId)
    .gte('date', startDate);

  // Aggregate by page
  const pageMap = new Map<string, { clicks: number; impressions: number; ctrSum: number; posSum: number; count: number }>();

  for (const row of (metrics || [])) {
    const existing = pageMap.get(row.page_slug) || { clicks: 0, impressions: 0, ctrSum: 0, posSum: 0, count: 0 };
    existing.clicks += row.clicks;
    existing.impressions += row.impressions;
    existing.ctrSum += row.ctr;
    existing.posSum += row.position;
    existing.count += 1;
    pageMap.set(row.page_slug, existing);
  }

  const topPages = Array.from(pageMap.entries())
    .map(([slug, data]) => ({
      slug,
      clicks: data.clicks,
      impressions: data.impressions,
      ctr: Math.round((data.ctrSum / data.count) * 1000) / 1000,
      position: Math.round((data.posSum / data.count) * 10) / 10,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 20);

  const totalClicks = topPages.reduce((sum, p) => sum + p.clicks, 0);
  const totalImpressions = topPages.reduce((sum, p) => sum + p.impressions, 0);
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgPosition = topPages.length > 0
    ? topPages.reduce((sum, p) => sum + p.position, 0) / topPages.length
    : 0;

  // Get live quick wins and ranking drops
  let quickWins: QuickWinKeyword[] = [];
  let rankingDrops: RankDrop[] = [];

  try {
    const [qw, rd] = await Promise.all([
      getQuickWins(siteUrl),
      getRankingDrops(siteUrl),
    ]);
    if (!qw.mock) quickWins = qw.data;
    if (!rd.mock) rankingDrops = rd.data;
  } catch {
    // Non-fatal — GSC might not be configured
  }

  return {
    total_clicks: totalClicks,
    total_impressions: totalImpressions,
    avg_ctr: Math.round(avgCtr * 1000) / 1000,
    avg_position: Math.round(avgPosition * 10) / 10,
    page_count: pageMap.size,
    top_pages: topPages,
    quick_wins: quickWins,
    ranking_drops: rankingDrops,
  };
}

/**
 * Get metrics for a specific page slug.
 */
export async function getPageMetrics(
  siteId: string,
  slug: string,
  days: number = 28,
): Promise<Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>> {
  const supabase = createServiceClientWithoutCookies();
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  const { data } = await supabase
    .from('seo_page_metrics')
    .select('date, clicks, impressions, ctr, position')
    .eq('site_id', siteId)
    .eq('page_slug', slug)
    .gte('date', startDate)
    .order('date');

  return (data || []) as Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>;
}

// ── Utilities ────────────────────────────────────────────────────────────

function extractSlugFromUrl(pageUrl: string, siteUrl: string): string {
  try {
    const url = new URL(pageUrl);
    const path = url.pathname;
    return path === '/' ? '/' : path.replace(/\/$/, '');
  } catch {
    // If URL parsing fails, strip the site URL prefix
    const cleaned = pageUrl.replace(siteUrl, '').replace(/^https?:\/\/[^/]+/, '');
    return cleaned || '/';
  }
}
