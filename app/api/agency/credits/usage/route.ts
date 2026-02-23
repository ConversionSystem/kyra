// GET /api/agency/credits/usage — Per-client usage breakdown + monthly trends

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface ClientUsageStat {
  clientId: string;
  clientName: string;
  creditsUsed: number;
  conversationCount: number;
  lastActivity: string | null;
}

interface MonthlyTrend {
  month: string;    // e.g. "Feb 2026"
  credits: number;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();

  if (!member) return NextResponse.json({ error: 'No agency found' }, { status: 404 });

  const agencyId = member.agency_id;
  const svc = createServiceClientWithoutCookies();

  // ── Per-client usage (current month) ──────────────────────────────────
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: usageTx } = await svc
    .from('credit_transactions')
    .select('client_id, amount, created_at')
    .eq('agency_id', agencyId)
    .eq('type', 'usage')
    .gte('created_at', startOfMonth.toISOString());

  // ── Fetch client names ─────────────────────────────────────────────────
  const clientIds = [...new Set((usageTx || []).map((t) => t.client_id).filter(Boolean))];
  let clientMap: Record<string, string> = {};

  if (clientIds.length > 0) {
    const { data: clients } = await svc
      .from('agency_clients')
      .select('id, name')
      .in('id', clientIds);

    clientMap = Object.fromEntries((clients || []).map((c) => [c.id, c.name]));
  }

  // Group by client
  const clientStats: Record<string, ClientUsageStat> = {};
  for (const tx of usageTx || []) {
    const cid = tx.client_id || 'unknown';
    if (!clientStats[cid]) {
      clientStats[cid] = {
        clientId: cid,
        clientName: clientMap[cid] || 'Unknown Client',
        creditsUsed: 0,
        conversationCount: 0,
        lastActivity: null,
      };
    }
    clientStats[cid].creditsUsed += Math.abs(tx.amount);
    clientStats[cid].conversationCount += 1;
    if (!clientStats[cid].lastActivity || tx.created_at > clientStats[cid].lastActivity!) {
      clientStats[cid].lastActivity = tx.created_at;
    }
  }

  // Sort by usage desc
  const byClient = Object.values(clientStats).sort((a, b) => b.creditsUsed - a.creditsUsed);

  // ── Monthly trend (last 6 months) ──────────────────────────────────────
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const { data: trendTx } = await svc
    .from('credit_transactions')
    .select('amount, created_at')
    .eq('agency_id', agencyId)
    .eq('type', 'usage')
    .gte('created_at', sixMonthsAgo.toISOString());

  const monthlyMap: Record<string, number> = {};
  for (const tx of trendTx || []) {
    const d = new Date(tx.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + Math.abs(tx.amount);
  }

  // Fill in months with 0 if no data
  const trend: MonthlyTrend[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    trend.push({
      month: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      credits: monthlyMap[key] || 0,
    });
  }

  // ── This month vs last month ─────────────────────────────────────────────
  const thisMonthCredits = trend[5]?.credits || 0;
  const lastMonthCredits = trend[4]?.credits || 0;
  const monthOverMonthPct = lastMonthCredits > 0
    ? Math.round(((thisMonthCredits - lastMonthCredits) / lastMonthCredits) * 100)
    : 0;

  return NextResponse.json({
    thisMonth: thisMonthCredits,
    lastMonth: lastMonthCredits,
    monthOverMonthPct,
    byClient,
    trend,
  });
}
