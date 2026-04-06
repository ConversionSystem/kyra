import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';

/**
 * GET /api/agency/email/nurture-stats
 * Returns aggregate stats from email_nurture_queue for the current agency.
 */
export async function GET() {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from('email_nurture_queue')
    .select('sequence_step, status')
    .eq('agency_id', agency.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = rows.length;
  const sent = rows.filter(r => r.status === 'sent').length;
  const pending = rows.filter(r => r.status === 'pending').length;
  const failed = rows.filter(r => r.status === 'failed').length;

  // Group by step
  const stepMap: Record<number, { sent: number; pending: number; failed: number }> = {};
  for (const row of rows) {
    if (!stepMap[row.sequence_step]) {
      stepMap[row.sequence_step] = { sent: 0, pending: 0, failed: 0 };
    }
    if (row.status === 'sent') stepMap[row.sequence_step].sent++;
    else if (row.status === 'pending') stepMap[row.sequence_step].pending++;
    else if (row.status === 'failed') stepMap[row.sequence_step].failed++;
  }

  const byStep = Object.entries(stepMap)
    .map(([step, counts]) => ({ step: Number(step), ...counts }))
    .sort((a, b) => a.step - b.step);

  return NextResponse.json({ total, sent, pending, failed, byStep });
}
