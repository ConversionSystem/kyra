import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { buildReportData, sendWeeklyReport } from '@/lib/email/weekly-report';
import type { ClientReportData } from '@/lib/email/weekly-report';

/**
 * GET /api/cron/weekly-report
 *
 * Vercel cron job — runs every Monday at 09:00 CET (08:00 UTC).
 * Sends weekly performance reports to all agencies with weekly_report_enabled=true.
 *
 * Secured by Vercel's CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClientWithoutCookies();

  // Find all agencies with weekly reports enabled
  const { data: agencies, error: agencyError } = await supabase
    .from('agencies')
    .select('id, name, settings');

  if (agencyError) {
    console.error('[weekly-report cron] Failed to fetch agencies:', agencyError);
    return NextResponse.json({ error: 'Failed to fetch agencies' }, { status: 500 });
  }

  const enabledAgencies = (agencies ?? []).filter(a => {
    const settings = (a.settings ?? {}) as Record<string, unknown>;
    return settings.weekly_report_enabled === true && !!settings.weekly_report_email;
  });

  console.log(`[weekly-report cron] ${enabledAgencies.length} agencies opted in`);

  const results: Array<{ agencyId: string; agencyName: string; ok: boolean; error?: string }> = [];

  for (const agency of enabledAgencies) {
    const settings = (agency.settings ?? {}) as Record<string, unknown>;
    const reportEmail = settings.weekly_report_email as string;

    try {
      // Fetch clients for this agency
      const { data: clients, error: clientError } = await supabase
        .from('agency_clients')
        .select('id, name, industry, usage_this_month, gateway_status, billing_amount_cents')
        .eq('agency_id', agency.id);

      if (clientError) {
        results.push({ agencyId: agency.id, agencyName: agency.name, ok: false, error: clientError.message });
        continue;
      }

      const reportData = buildReportData(
        agency.name,
        agency.id,
        reportEmail,
        (clients ?? []) as ClientReportData[],
      );

      const sendResult = await sendWeeklyReport(reportData);
      results.push({ agencyId: agency.id, agencyName: agency.name, ...sendResult });

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ agencyId: agency.id, agencyName: agency.name, ok: false, error: message });
    }
  }

  const succeeded = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  console.log(`[weekly-report cron] Done: ${succeeded} sent, ${failed} failed`);

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    totalAgencies: enabledAgencies.length,
    succeeded,
    failed,
    results,
  });
}
