// ============================================================================
// GET /api/cron/seo/gsc-sync
//
// Daily cron (5 AM UTC) — syncs GSC metrics for all sites with
// search_console_connected = true.
//
// Auth: CRON_SECRET bearer token (Vercel cron).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { syncGSCMetrics } from '@/lib/seo/gsc-sync';
import { requireCron } from '@/lib/auth/cron';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min for batch sync

export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request);
  if (unauthorized) return unauthorized;

  const supabase = createServiceClientWithoutCookies();

  // Find all sites with GSC connected
  const { data: sites, error } = await supabase
    .from('client_sites')
    .select('id, site_domain, site_subdomain')
    .eq('search_console_connected', true)
    .in('status', ['live', 'building', 'deploying']);

  if (error || !sites?.length) {
    return NextResponse.json({
      message: 'No sites with GSC connected',
      count: 0,
    });
  }

  console.log(`[gsc-sync cron] Syncing ${sites.length} sites`);

  const results: Array<{ siteId: string; success: boolean; rows: number; error?: string }> = [];

  // Process sequentially to avoid GSC rate limits
  for (const site of sites) {
    const siteUrl = `https://${site.site_domain || site.site_subdomain}`;
    const result = await syncGSCMetrics(site.id, siteUrl);
    results.push({
      siteId: site.id,
      success: result.success,
      rows: result.rowsUpserted,
      error: result.error,
    });
  }

  const successful = results.filter(r => r.success).length;
  const totalRows = results.reduce((sum, r) => sum + r.rows, 0);

  console.log(`[gsc-sync cron] Done: ${successful}/${sites.length} sites, ${totalRows} total rows`);

  return NextResponse.json({
    message: `Synced ${successful}/${sites.length} sites`,
    total_rows: totalRows,
    results,
  });
}
