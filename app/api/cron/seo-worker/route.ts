import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

/**
 * GET /api/cron/seo-worker
 *
 * Scheduled cron job that runs SEO worker tasks for all clients
 * with an active vet-seo-worker premium template.
 *
 * Schedule: Daily at 6:00 AM UTC (via Vercel cron)
 *
 * Day-of-week routing:
 *   Monday:    GEO visibility tests
 *   Tuesday:   Content creation triggers
 *   Wednesday: NAP consistency audits
 *   Thursday:  Content creation triggers
 *   Friday:    Weekly report compilation
 *   Daily:     Reddit/UGC monitoring (2x)
 */
export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat

  // Find all clients with active vet-seo-worker premium template
  const { data: clients, error } = await supabase
    .from('agency_clients')
    .select('id, name, agency_id, settings')
    .not('settings', 'is', null);

  if (error) {
    console.error('[seo-worker-cron] Failed to fetch clients:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  // Filter to clients with active premium template
  const seoClients = (clients || []).filter((c) => {
    const settings = c.settings as Record<string, unknown>;
    return (
      settings?.premium_template === 'vet-seo-worker' &&
      settings?.premium_template_status === 'active'
    );
  });

  if (seoClients.length === 0) {
    return NextResponse.json({
      ok: true,
      message: 'No active SEO worker clients',
      clients_processed: 0,
    });
  }

  console.log(
    `[seo-worker-cron] Processing ${seoClients.length} clients, day=${dayOfWeek}`,
  );

  const results: Array<{ clientId: string; clientName: string; tasks: string[]; errors: string[] }> = [];

  for (const client of seoClients) {
    const settings = client.settings as Record<string, unknown>;
    const setup = (settings.premium_template_setup as Record<string, unknown>) || {};
    const seoData = (settings.seo_data as Record<string, unknown>) || {};
    const tasks: string[] = [];
    const errors: string[] = [];

    try {
      // ── Daily: Reddit/UGC Monitoring ──
      tasks.push('ugc_monitor_scheduled');
      // The actual Reddit scanning runs inside the OpenClaw container.
      // This cron triggers the container's agent via the provisioner API.
      await triggerContainerTask(client.id, 'ugc_scan', setup);

      // ── Day-specific tasks ──
      switch (dayOfWeek) {
        case 1: // Monday — GEO Tests
          tasks.push('geo_test_scheduled');
          await triggerContainerTask(client.id, 'geo_test', setup);
          break;

        case 2: // Tuesday — Content Creation
        case 4: // Thursday — Content Creation
          tasks.push('content_creation_scheduled');
          await triggerContainerTask(client.id, 'content_create', setup);
          break;

        case 3: // Wednesday — NAP Audit
          tasks.push('nap_audit_scheduled');
          await triggerContainerTask(client.id, 'nap_audit', setup);
          break;

        case 5: // Friday — Weekly Report
          tasks.push('weekly_report_scheduled');
          await triggerContainerTask(client.id, 'weekly_report', {
            ...setup,
            seoData,
          });
          break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      console.error(`[seo-worker-cron] Error for client ${client.name}:`, msg);
    }

    results.push({
      clientId: client.id,
      clientName: client.name || 'Unknown',
      tasks,
      errors,
    });
  }

  return NextResponse.json({
    ok: true,
    day: dayOfWeek,
    clients_processed: seoClients.length,
    results,
  });
}

/**
 * Trigger a task on the client's OpenClaw container via the VPS provisioner.
 *
 * The provisioner sends a message to the container's agent,
 * which then executes the appropriate skill.
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
    // Non-fatal — log and continue
    console.error(
      `[seo-worker-cron] Failed to trigger ${task} on ${containerName}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Build the task message that the OpenClaw agent understands.
 */
function buildTaskMessage(
  task: string,
  context: Record<string, unknown>,
): string {
  switch (task) {
    case 'geo_test':
      return `[CRON] Run weekly GEO visibility test. Query ChatGPT and Perplexity with all 25 query variations. Log results and update the SEO dashboard. Client config: ${JSON.stringify({
        clinic_name: context.clinic_name,
        city: context.city,
        services: context.services,
      })}`;

    case 'nap_audit':
      return `[CRON] Run weekly NAP consistency audit. Scrape all 15 directories and compare against master NAP data. Flag mismatches. Client config: ${JSON.stringify({
        clinic_name: context.clinic_name,
        address: context.address,
        phone: context.phone,
        website: context.website,
      })}`;

    case 'content_create':
      return `[CRON] Content creation day. Generate 1-2 SEO-optimized content pieces based on the content calendar. Check GEO results for weak areas to target. Queue all content for review before publishing. Client: ${context.clinic_name} in ${context.city}.`;

    case 'ugc_scan':
      return `[CRON] Reddit/UGC scan. Check configured subreddits for vet-related discussions in ${context.city}. Draft helpful replies for any relevant posts found in the last 48 hours. Queue all drafts for review.`;

    case 'weekly_report':
      return `[CRON] Compile weekly SEO report. Include: GEO scores, NAP audit status, content published, outreach pipeline, Reddit activity, and top 3-5 action items for the agency.`;

    default:
      return `[CRON] Execute task: ${task}`;
  }
}
