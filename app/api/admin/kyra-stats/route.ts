// GET /api/admin/kyra-stats
// Real-time MRR, signups, churn, and usage data for the Kyra admin dashboard.
// Restricted to ADMIN_EMAILS only.

import { NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

const ADMIN_EMAILS = ['angel@conversionsystem.com'];

const PLAN_MRR: Record<string, number> = {
  free: 0, starter: 97, pro: 247, scale: 497, beta: 247,
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const db = createServiceClientWithoutCookies();
  const now = new Date();
  const day7ago = new Date(now.getTime() - 7 * 86400_000).toISOString();
  const day30ago = new Date(now.getTime() - 30 * 86400_000).toISOString();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // ── Agencies ─────────────────────────────────────────────────────────────
  const { data: agencies } = await db
    .from('agencies')
    .select('id, name, plan, created_at')
    .order('created_at', { ascending: false });

  const allAgencies = agencies ?? [];
  const planBreakdown = allAgencies.reduce<Record<string, number>>((acc, a) => {
    acc[a.plan] = (acc[a.plan] || 0) + 1;
    return acc;
  }, {});
  const mrr = allAgencies.reduce((sum, a) => sum + (PLAN_MRR[a.plan] || 0), 0);
  const payingAgencies = allAgencies.filter(a => a.plan !== 'free').length;
  const newToday = allAgencies.filter(a => a.created_at >= today).length;
  const newLast7d = allAgencies.filter(a => a.created_at >= day7ago).length;
  const newLast30d = allAgencies.filter(a => a.created_at >= day30ago).length;

  // ── Clients ───────────────────────────────────────────────────────────────
  const { count: totalClients } = await db
    .from('agency_clients')
    .select('id', { count: 'exact', head: true });

  const { count: activeClients } = await db
    .from('agency_clients')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  // ── Conversations ─────────────────────────────────────────────────────────
  const { count: totalConvos } = await db
    .from('client_conversations')
    .select('id', { count: 'exact', head: true });

  const { count: convosToday } = await db
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', today);

  const { count: convos7d } = await db
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', day7ago);

  // ── Referrals ─────────────────────────────────────────────────────────────
  const { count: totalReferrals } = await db
    .from('agency_referrals')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'pending');

  const { count: convertedReferrals } = await db
    .from('agency_referrals')
    .select('id', { count: 'exact', head: true })
    .in('status', ['converted', 'paid_out']);

  // ── Recent signups (last 10) ──────────────────────────────────────────────
  const recentAgencies = allAgencies.slice(0, 10).map(a => ({
    id: a.id,
    name: a.name,
    plan: a.plan,
    mrr: PLAN_MRR[a.plan] || 0,
    createdAt: a.created_at,
  }));

  return NextResponse.json({
    mrr,
    agencies: {
      total: allAgencies.length,
      paying: payingAgencies,
      free: allAgencies.length - payingAgencies,
      newToday,
      newLast7d,
      newLast30d,
      planBreakdown,
    },
    clients: {
      total: totalClients ?? 0,
      active: activeClients ?? 0,
    },
    conversations: {
      total: totalConvos ?? 0,
      today: convosToday ?? 0,
      last7d: convos7d ?? 0,
    },
    referrals: {
      signedUp: totalReferrals ?? 0,
      converted: convertedReferrals ?? 0,
    },
    recentSignups: recentAgencies,
    generatedAt: now.toISOString(),
  });
}
