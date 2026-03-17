/**
 * GET /api/voice/usage?agencyId=XXX
 *
 * Returns current month voice usage for the agency.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  // Auth check
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = req.nextUrl.searchParams.get('agencyId');
  if (!agencyId) {
    return NextResponse.json({ error: 'Missing agencyId' }, { status: 400 });
  }

  // Verify user belongs to this agency
  const { data: member } = await sb
    .from('agency_members')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('user_id', user.id)
    .single();

  if (!member) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

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
