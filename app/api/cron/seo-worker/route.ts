import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { dispatchGeoTest, dispatchNapAudit, buildClientContext } from '@/lib/seo/worker-dispatcher';
import { requireCron } from '@/lib/auth/cron';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

/**
 * GET /api/cron/seo-worker
 *
 * Scheduled cron job that runs SEO worker tasks for ALL clients
 * on paid plans with an active site. No longer gated to vet-seo-worker only.
 *
 * Schedule: Daily at 6:00 AM UTC (via Vercel cron)
 *
 * Day-of-week routing:
 *   Monday:    GEO visibility tests (via worker-dispatcher)
 *   Tuesday:   Content creation triggers (via container)
 *   Wednesday: NAP consistency audits (via worker-dispatcher)
 *   Thursday:  Content creation triggers (via container)
 *   Friday:    Weekly report compilation (via container)
 *   Daily:     Reddit/UGC monitoring (via container, vet-seo-worker clients only)
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request);
  if (unauthorized) return unauthorized;

  const supabase = createServiceClientWithoutCookies();
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat

  // Find ALL clients with an active site on a paid plan
  const { data: sites, error } = await supabase
    .from('client_sites')
    .select('id, client_id, industry, business_name, agency_id')
    .in('status', ['live', 'building', 'deploying']);

  if (error) {
    console.error('[seo-worker-cron] Failed to fetch sites:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  if (!sites?.length) {
    return NextResponse.json({
      ok: true,
      message: 'No active sites',
      clients_processed: 0,
    });
  }

  // Deduplicate by client_id (a client may have multiple sites)
  const clientIds = [...new Set(sites.filter(s => s.client_id).map(s => s.client_id))];

  console.log(
    `[seo-worker-cron] Processing ${clientIds.length} clients from ${sites.length} sites, day=${dayOfWeek}`,
  );

  const results: Array<{ clientId: string; tasks: string[]; errors: string[] }> = [];

  for (const clientId of clientIds) {
    const tasks: string[] = [];
    const errors: string[] = [];

    try {
      const ctx = await buildClientContext(clientId);
      if (!ctx) {
        errors.push('Could not build client context');
        results.push({ clientId, tasks, errors });
        continue;
      }

      // ── Legacy vet-seo-worker: still trigger container tasks for UGC monitoring ──
      const { data: client } = await supabase
        .from('agency_clients')
        .select('settings')
        .eq('id', clientId)
        .single();

      const settings = (client?.settings || {}) as Record<string, unknown>;
      const hasVetWorker = settings.premium_template === 'vet-seo-worker' &&
                           settings.premium_template_status === 'active';

      if (hasVetWorker) {
        tasks.push('ugc_monitor_scheduled');
        await triggerContainerTask(clientId, 'ugc_scan', (settings.premium_template_setup || {}) as Record<string, unknown>);
      }

      // ── Day-specific tasks (ALL clients with sites) ──
      switch (dayOfWeek) {
        case 1: // Monday — GEO Tests
          tasks.push('geo_test');
          const geoResult = await dispatchGeoTest(ctx);
          if (!geoResult.success) errors.push(`geo_test: ${geoResult.error}`);
          break;

        case 2: // Tuesday — Content Creation (container only for vet-worker clients)
        case 4: // Thursday
          if (hasVetWorker) {
            tasks.push('content_creation_scheduled');
            await triggerContainerTask(clientId, 'content_create', (settings.premium_template_setup || {}) as Record<string, unknown>);
          }
          break;

        case 3: // Wednesday — NAP Audit
          tasks.push('nap_audit');
          const napResult = await dispatchNapAudit(ctx);
          if (!napResult.success) errors.push(`nap_audit: ${napResult.error}`);
          break;

        case 5: // Friday — Weekly Report (container only for vet-worker clients)
          if (hasVetWorker) {
            tasks.push('weekly_report_scheduled');
            await triggerContainerTask(clientId, 'weekly_report', {
              ...(settings.premium_template_setup || {}),
              seoData: settings.seo_data || {},
            } as Record<string, unknown>);
          }
          break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      console.error(`[seo-worker-cron] Error for client ${clientId}:`, msg);
    }

    results.push({ clientId, tasks, errors });
  }

  const totalTasks = results.reduce((sum, r) => sum + r.tasks.length, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

  return NextResponse.json({
    ok: true,
    day: dayOfWeek,
    clients_processed: clientIds.length,
    total_tasks: totalTasks,
    total_errors: totalErrors,
    results,
  });
}

/**
 * Trigger a task on the client's OpenClaw container via the VPS provisioner.
 * Legacy path — used for vet-seo-worker container skills (UGC, content, reports).
 */
async function triggerContainerTask(
  clientId: string,
  task: string,
  context: Record<string, unknown>,
): Promise<void> {
  const provisionerUrl = process.env.OVH_PROVISIONER_URL;
  const provisionerSecret = process.env.OVH_PROVISIONER_SECRET;

  if (!provisionerUrl || !provisionerSecret) {
    console.warn('[seo-worker-cron] Provisioner not configured, skipping container task');
    return;
  }

  const containerName = `kyra-cl-${clientId}`;

  try {
    const response = await fetch(
      `${provisionerUrl}/api/containers/${containerName}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provisionerSecret}`,
        },
        body: JSON.stringify({
          message: buildTaskMessage(task, context),
        }),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Provisioner returned ${response.status}: ${text}`);
    }
  } catch (err) {
    console.error(
      `[seo-worker-cron] Failed to trigger ${task} on ${containerName}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

function buildTaskMessage(
  task: string,
  context: Record<string, unknown>,
): string {
  switch (task) {
    case 'geo_test':
      return `[CRON] Run weekly GEO visibility test. Query ChatGPT and Perplexity with all query variations. Log results and update the SEO dashboard. Client: ${JSON.stringify({
        clinic_name: context.clinic_name,
        city: context.city,
        services: context.services,
      })}`;
    case 'nap_audit':
      return `[CRON] Run weekly NAP consistency audit. Scrape all directories and compare against master NAP data. Flag mismatches. Client: ${JSON.stringify({
        clinic_name: context.clinic_name,
        address: context.address,
        phone: context.phone,
        website: context.website,
      })}`;
    case 'content_create':
      return `[CRON] Content creation day. Generate 1-2 SEO-optimized content pieces. Check GEO results for weak areas. Queue for review. Client: ${context.clinic_name} in ${context.city}.`;
    case 'ugc_scan':
      return `[CRON] Reddit/UGC scan. Check configured subreddits for relevant discussions in ${context.city}. Draft helpful replies for posts found in the last 48 hours. Queue all drafts for review.`;
    case 'weekly_report':
      return `[CRON] Compile weekly SEO report. Include: GEO scores, NAP status, content published, outreach pipeline, Reddit activity, and top 3-5 action items.`;
    default:
      return `[CRON] Execute task: ${task}`;
  }
}
