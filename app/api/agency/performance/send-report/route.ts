import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';
import { getAgencyClients } from '@/lib/agency/queries';
import { buildReportData, sendWeeklyReport } from '@/lib/email/weekly-report';

/**
 * POST /api/agency/performance/send-report
 *
 * Sends a weekly performance report email to the configured address.
 * Called from the Performance page "Send Test Report" button, and by the weekly cron.
 *
 * Body: { email?: string }  — optional override; falls back to agency settings.
 */
export async function POST(request: NextRequest) {
  const result = await requireAgencyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const settings = (agency.settings ?? {}) as Record<string, unknown>;

  // Resolve recipient email: body override → settings → agency owner email
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* no body */ }

  const recipientEmail =
    (body.email as string | undefined) ||
    (settings.weekly_report_email as string | undefined) ||
    null;

  if (!recipientEmail) {
    return NextResponse.json(
      { error: 'No report email configured. Set one on the Performance page.' },
      { status: 400 },
    );
  }

  // Fetch clients
  const clients = await getAgencyClients(agency.id);

  const reportData = buildReportData(agency.name, agency.id, recipientEmail, clients);

  const sendResult = await sendWeeklyReport(reportData);

  if (!sendResult.ok) {
    return NextResponse.json(
      {
        error: sendResult.error,
        hint: sendResult.error?.includes('RESEND_API_KEY')
          ? 'Add RESEND_API_KEY to your Vercel environment variables. Get a free key at resend.com.'
          : undefined,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    sentTo: recipientEmail,
    clientCount: clients.length,
  });
}
