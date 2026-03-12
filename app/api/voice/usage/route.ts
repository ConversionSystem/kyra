/**
 * GET /api/voice/usage?agencyId=XXX
 *
 * Returns current month voice usage for the agency.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  const agencyId = req.nextUrl.searchParams.get('agencyId');
  if (!agencyId) {
    return NextResponse.json({ error: 'Missing agencyId' }, { status: 400 });
  }

  const month = currentMonth();
  const supabase = createServiceClientWithoutCookies();

  const { data } = await supabase
    .from('voice_usage')
    .select('minutes_used, minute_limit')
    .eq('agency_id', agencyId)
    .eq('month', month)
    .single();

  const minutesUsed = Number(data?.minutes_used ?? 0);
  const minuteLimit = Number(data?.minute_limit ?? 300);
  const percentUsed = minuteLimit > 0 ? Math.round((minutesUsed / minuteLimit) * 100) : 0;

  return NextResponse.json({
    minutesUsed,
    minuteLimit,
    month,
    percentUsed,
  });
}
