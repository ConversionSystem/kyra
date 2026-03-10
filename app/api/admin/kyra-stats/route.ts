// GET /api/admin/kyra-stats
// Granular admin metrics — MRR, growth, ARPU, activation, churn, referrals, usage.
// Restricted to ADMIN_EMAILS only.

import { NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

const ADMIN_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

const PLAN_MRR: Record<string, number> = {
  free: 0, solo_pro: 49, starter: 99, pro: 249, scale: 499, beta: 249,
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const db = createServiceClientWithoutCookies();
  const now = new Date();
  const day7ago  = new Date(now.getTime() - 7  * 86400_000).toISOString();
  const day30ago = new Date(now.getTime() - 30 * 86400_000).toISOString();
  const day60ago = new Date(now.getTime() - 60 * 86400_000).toISOString();
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd   = monthStart;

  // ── Agencies (full dataset for derived metrics) ───────────────────────────
  const { data: agencies } = await db
    .from('agencies')
    .select('id, name, plan, created_at, settings, owner_id')
    .order('created_at', { ascending: false });

  const allAgencies = agencies ?? [];

  // Filter out master/internal accounts
  const realAgencies = allAgencies.filter(a => {
    const s = (a.settings ?? {}) as Record<string, unknown>;
    return s.account_level !== 'master';
  });

  // Solo vs Agency breakdown
  const soloAgencies   = realAgencies.filter(a => (a.settings as Record<string,unknown>)?.account_type === 'solo');
  const agencyAccounts = realAgencies.filter(a => (a.settings as Record<string,unknown>)?.account_type !== 'solo');

  // Plan breakdown & MRR
  const planBreakdown = realAgencies.reduce<Record<string, number>>((acc, a) => {
    acc[a.plan] = (acc[a.plan] || 0) + 1;
    return acc;
  }, {});

  const mrr       = realAgencies.reduce((s, a) => s + (PLAN_MRR[a.plan] || 0), 0);
  const mrrPerPlan = Object.entries(planBreakdown).reduce<Record<string, number>>((acc, [plan, count]) => {
    acc[plan] = (PLAN_MRR[plan] || 0) * count;
    return acc;
  }, {});

  // MRR last month (snapshot — agencies that existed in last-30-day window)
  const lastMonthAgencies = realAgencies.filter(a => a.created_at < lastMonthEnd);
  const mrrLastMonth = lastMonthAgencies.reduce((s, a) => s + (PLAN_MRR[a.plan] || 0), 0);
  const mrrGrowthPct = mrrLastMonth > 0 ? Math.round(((mrr - mrrLastMonth) / mrrLastMonth) * 100) : null;

  const payingAgencies = realAgencies.filter(a => a.plan !== 'free').length;
  const freeAgencies   = realAgencies.filter(a => a.plan === 'free').length;
  const arpu = payingAgencies > 0 ? Math.round(mrr / payingAgencies) : 0;

  // Signup counts
  const newToday   = realAgencies.filter(a => a.created_at >= today).length;
  const newLast7d  = realAgencies.filter(a => a.created_at >= day7ago).length;
  const newLast30d = realAgencies.filter(a => a.created_at >= day30ago).length;
  const newSoloLast30d   = soloAgencies.filter(a => a.created_at >= day30ago).length;
  const newAgencyLast30d = agencyAccounts.filter(a => a.created_at >= day30ago).length;

  // Conversion rate (free → paid)
  const conversionRate = realAgencies.length > 0
    ? parseFloat(((payingAgencies / realAgencies.length) * 100).toFixed(1))
    : 0;

  // ── Clients ───────────────────────────────────────────────────────────────
  const { data: clients } = await db
    .from('agency_clients')
    .select('id, agency_id, status, created_at, usage_this_month');

  const allClients = clients ?? [];
  const activeClients = allClients.filter(c => c.status === 'active').length;
  const clientsLast7d = allClients.filter(c => c.created_at >= day7ago).length;

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

  const { count: convos30d } = await db
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', day30ago);

  // ── Activation rate (free users who sent ≥1 message) ─────────────────────
  // Proxied: agencies with at least one client conversation
  const agencyIdsWithConvos = new Set(
    (await db.from('client_conversations').select('agency_id').limit(5000)).data?.map(c => c.agency_id) ?? []
  );
  const activatedFreeCount = freeAgencies > 0
    ? realAgencies.filter(a => a.plan === 'free' && agencyIdsWithConvos.has(a.id)).length
    : 0;
  const activationRate = freeAgencies > 0
    ? parseFloat(((activatedFreeCount / freeAgencies) * 100).toFixed(1))
    : 0;

  // ── Referrals ─────────────────────────────────────────────────────────────
  const { data: referralRows } = await db
    .from('agency_referrals')
    .select('id, status, early_bird, created_at');

  const referrals = referralRows ?? [];
  const referralSignedUp  = referrals.filter(r => ['signed_up','activated','converted'].includes(r.status)).length;
  const referralActivated = referrals.filter(r => ['activated','converted'].includes(r.status)).length;
  const referralConverted = referrals.filter(r => r.status === 'converted').length;
  const referralEarlyBird = referrals.filter(r => r.early_bird).length;
  const referralLast7d    = referrals.filter(r => r.created_at >= day7ago).length;
  const referralConversionRate = referralSignedUp > 0
    ? parseFloat(((referralActivated / referralSignedUp) * 100).toFixed(1))
    : 0;

  // ── Credit usage ──────────────────────────────────────────────────────────
  const { data: creditTxns } = await db
    .from('credit_transactions')
    .select('amount, type, created_at')
    .gte('created_at', day30ago)
    .order('created_at', { ascending: false })
    .limit(2000);

  const credits = creditTxns ?? [];
  const creditsUsed30d     = credits.filter(c => c.type === 'usage').reduce((s, c) => s + Math.abs(c.amount), 0);
  const creditsPurchased30d = credits.filter(c => c.type === 'purchase').reduce((s, c) => s + c.amount, 0);
  const creditsGranted30d  = credits.filter(c => c.type === 'bonus').reduce((s, c) => s + c.amount, 0);

  // ── Daily signups (last 14 days for sparkline) ────────────────────────────
  const signupsByDay: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    signupsByDay[key] = 0;
  }
  realAgencies.forEach(a => {
    const key = a.created_at.slice(0, 10);
    if (key in signupsByDay) signupsByDay[key]++;
  });

  // ── Top agencies by conversation volume ───────────────────────────────────
  const agencyConvoCount: Record<string, number> = {};
  agencyIdsWithConvos.forEach(id => {
    agencyConvoCount[id] = (agencyConvoCount[id] || 0) + 1;
  });

  // ── Recent signups (last 15) ──────────────────────────────────────────────
  const recentSignups = realAgencies.slice(0, 15).map(a => {
    const s = (a.settings ?? {}) as Record<string, unknown>;
    return {
      id: a.id,
      name: a.name,
      plan: a.plan,
      mrr: PLAN_MRR[a.plan] || 0,
      createdAt: a.created_at,
      accountType: s.account_type === 'solo' ? 'solo' : 'agency',
      websiteUrl: (s.website_url as string) || null,
    };
  });

  // ── LTV estimate (simple: ARPU × 12) ─────────────────────────────────────
  const estimatedLtv = arpu * 12;

  return NextResponse.json({
    mrr,
    mrrLastMonth,
    mrrGrowthPct,
    mrrPerPlan,
    arpu,
    estimatedLtv,
    agencies: {
      total: realAgencies.length,
      solo: soloAgencies.length,
      agency: agencyAccounts.length,
      paying: payingAgencies,
      free: freeAgencies,
      newToday,
      newLast7d,
      newLast30d,
      newSoloLast30d,
      newAgencyLast30d,
      conversionRate,
      planBreakdown,
    },
    clients: {
      total: allClients.length,
      active: activeClients,
      newLast7d: clientsLast7d,
    },
    conversations: {
      total: totalConvos ?? 0,
      today: convosToday ?? 0,
      last7d: convos7d ?? 0,
      last30d: convos30d ?? 0,
    },
    activation: {
      rate: activationRate,
      activated: activatedFreeCount,
      total: freeAgencies,
    },
    referrals: {
      total: referrals.length,
      signedUp: referralSignedUp,
      activated: referralActivated,
      converted: referralConverted,
      earlyBird: referralEarlyBird,
      last7d: referralLast7d,
      conversionRate: referralConversionRate,
    },
    credits: {
      used30d: creditsUsed30d,
      purchased30d: creditsPurchased30d,
      granted30d: creditsGranted30d,
    },
    signupsByDay,
    recentSignups,
    generatedAt: now.toISOString(),
  });
}
