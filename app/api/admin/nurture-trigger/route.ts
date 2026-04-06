// ============================================================================
// POST /api/admin/nurture-trigger
//
// Manually triggers the email sequence cron for testing purposes.
// Runs the same logic as GET /api/cron/email-sequence without CRON_SECRET.
// ============================================================================

import { NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getNurtureEmail } from '@/lib/email/nurture-sequence';

export const dynamic = 'force-dynamic';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

export async function POST() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createServiceClientWithoutCookies();
  const now = new Date();

  const { data: pendingEmails, error: queueError } = await supabase
    .from('email_nurture_queue')
    .select('id, agency_id, email, sequence_step')
    .eq('status', 'pending')
    .lte('send_at', now.toISOString())
    .order('send_at')
    .limit(50);

  if (queueError) {
    return NextResponse.json({ error: queueError.message }, { status: 500 });
  }

  if (!pendingEmails?.length) {
    return NextResponse.json({ ok: true, processed: 0, sent: 0, message: 'Queue empty' });
  }

  const { sendPlatformEmail } = await import('@/lib/email/ghl-platform-sender');
  const results: Array<{ id: string; step: number; result: string }> = [];
  let sent = 0;

  for (const row of pendingEmails) {
    const emailContent = getNurtureEmail(row.sequence_step as 1|2|3|4|5|6|7, row.email);

    if (!emailContent) {
      await supabase
        .from('email_nurture_queue')
        .update({ status: 'skipped', sent_at: now.toISOString() })
        .eq('id', row.id);
      results.push({ id: row.id, step: row.sequence_step, result: 'skipped' });
      continue;
    }

    try {
      const result = await sendPlatformEmail({
        to: row.email,
        subject: emailContent.subject,
        html: emailContent.html,
        fromName: 'Angel from Kyra',
      });

      if (!result.ok) throw new Error(result.error || 'Send failed');

      await supabase
        .from('email_nurture_queue')
        .update({ status: 'sent', sent_at: now.toISOString() })
        .eq('id', row.id);

      results.push({ id: row.id, step: row.sequence_step, result: 'sent' });
      sent++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase
        .from('email_nurture_queue')
        .update({ status: 'failed' })
        .eq('id', row.id);
      results.push({ id: row.id, step: row.sequence_step, result: `failed: ${msg}` });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: pendingEmails.length,
    sent,
    results,
    timestamp: now.toISOString(),
  });
}
