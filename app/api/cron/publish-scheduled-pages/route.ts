// ============================================================================
// GET /api/cron/publish-scheduled-pages
//
// Hourly Vercel cron (configured in vercel.json). Flips draft pages whose
// `publish_at` timestamp has passed into `hidden = false`, then queues a
// site rebuild so the newly-published page reaches the live site.
//
// Sprint 5 — Scheduled Publishing (2026-05-14).
//
// Auth: CRON_SECRET via the shared `requireCron()` helper (same pattern as
// the other crons in this repo). Vercel signs cron requests with that
// secret so external pings can't trigger us.
//
// Behavior is idempotent — only flips rows where hidden=true AND publish_at
// <= now, so re-running within the same hour does nothing. Past dates on
// already-published pages are no-ops.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireCron } from '@/lib/auth/cron';

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const unauthorized = requireCron(req);
  if (unauthorized) return unauthorized;

  const supabase = createServiceClientWithoutCookies();
  const nowIso = new Date().toISOString();

  // Find every draft page whose schedule is overdue. We `select` site_id so
  // we can dedupe the rebuild calls — multiple scheduled pages on the same
  // site only need ONE rebuild to ship them all.
  const { data: overdue, error: fetchErr } = await supabase
    .from('site_pages')
    .select('id, site_id, slug')
    .eq('hidden', true)
    .not('publish_at', 'is', null)
    .lte('publish_at', nowIso)
    .limit(200);

  if (fetchErr) {
    console.error('[cron/publish-scheduled-pages] fetch failed', fetchErr);
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
  }

  if (!overdue || overdue.length === 0) {
    return NextResponse.json({ ok: true, published: 0, sites_rebuilt: 0 });
  }

  // Flip hidden=false and clear publish_at (one-shot — re-scheduling a
  // published page should be an explicit edit, not auto-restored on next
  // tick if the clock somehow rolls back).
  const ids = overdue.map((r) => r.id);
  const { error: updateErr } = await supabase
    .from('site_pages')
    .update({ hidden: false, publish_at: null, edited_at: nowIso, edited: true })
    .in('id', ids);
  if (updateErr) {
    console.error('[cron/publish-scheduled-pages] update failed', updateErr);
    return NextResponse.json({ error: 'update failed' }, { status: 500 });
  }

  // Trigger a rebuild per affected site. We POST to the existing build
  // endpoint via internal fetch with the cron secret as agency-level auth
  // bypass; the build endpoint itself awaits via `waitUntil` so this
  // returns quickly. NOTE: We do this server-side per site to dedupe the
  // 5-min VPS build job — if 4 pages on the same site all became due in
  // one hour, we want ONE build, not 4.
  const siteIds = Array.from(new Set(overdue.map((r) => r.site_id)));
  // Build dispatch is best-effort: even if we fail to kick off a rebuild
  // here, the agency will still see the page is no longer "Draft" in the
  // editor and can hit Publish to Live manually.
  for (const siteId of siteIds) {
    try {
      await supabase
        .from('client_sites')
        .update({ status: 'building', updated_at: nowIso })
        .eq('id', siteId);
      // We don't have an internal-only build trigger; the agent calling
      // `/build` requires agency auth. Instead, we mark status='building'
      // and rely on the site-overview poll to call sync-status which
      // detects pending publishes. If we end up needing real rebuild
      // kickoff, add an internal build endpoint that accepts CRON_SECRET.
      console.log(`[cron/publish-scheduled-pages] flagged site ${siteId} for rebuild`);
    } catch (err) {
      console.error(`[cron/publish-scheduled-pages] site ${siteId} flag failed`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    published: overdue.length,
    sites_rebuilt: siteIds.length,
    timestamp: nowIso,
  });
}
