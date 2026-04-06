// ============================================================================
// GET /api/cron/email-sequence
//
// Vercel cron — runs daily at 9am CET (08:00 UTC).
// Processes the email_nurture_queue: sends pending nurture emails whose
// send_at timestamp has passed.
//
// Agencies are enrolled into the queue via enrollInNurtureSequence() on signup.
// The unified 7-email sequence lives in lib/email/nurture-sequence.ts.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getNurtureEmail } from '@/lib/email/nurture-sequence';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Auth: Vercel CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    console.error('[email-sequence] DB error:', queueError.message);
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

      console.log(`[email-sequence] ✅ Step ${row.sequence_step} → ${row.email}`);
      results.push({ id: row.id, step: row.sequence_step, result: 'sent' });
      sent++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase
        .from('email_nurture_queue')
        .update({ status: 'failed' })
        .eq('id', row.id);
      console.error(`[email-sequence] ❌ Step ${row.sequence_step} → ${row.email}:`, msg);
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
