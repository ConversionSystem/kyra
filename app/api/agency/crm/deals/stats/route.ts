import { NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getDealStats } from '@/lib/crm/deals';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const stats = await getDealStats(agencyId);

  // Calculate win rate
  const wonCount = stats.byStage['won']?.count ?? 0;
  const lostCount = stats.byStage['lost']?.count ?? 0;
  const closedCount = wonCount + lostCount;
  const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;
  const avgDealSize = stats.total > 0 ? Math.round(stats.totalValue / stats.total) : 0;

  return NextResponse.json({
    ok: true,
    data: {
      ...stats,
      winRate,
      avgDealSize,
      wonCount,
      lostCount,
    },
  });
}
