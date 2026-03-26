import { NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

export const dynamic = 'force-dynamic';

export async function GET() {
  // Auth check (cookie-based)
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // All DB queries use service client (bypasses RLS — sees all rows)
  const db = createServiceClientWithoutCookies();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // All agencies
  const { data: agencies, error: agErr } = await db
    .from('agencies')
    .select('id, name, slug, plan, created_at, settings, gateway_status')
    .order('created_at', { ascending: false });

  if (agErr) {
    console.error('[master/stats] agencies query error:', agErr.message);
    return NextResponse.json({ error: agErr.message }, { status: 500 });
  }

  const allAgencies = agencies ?? [];
  const masterAgencyId = process.env.MASTER_AGENCY_ID ?? '';
  const realAgencies = allAgencies.filter(a =>
    a.id !== masterAgencyId && !(a.name ?? '').toLowerCase().includes('conversion system')
  );
  const soloAgencies = realAgencies.filter(a => (a.settings as Record<string, unknown>)?.account_type === 'solo');
  const agencyAccounts = realAgencies.filter(a => (a.settings as Record<string, unknown>)?.account_type !== 'solo');
  const agencyIds = realAgencies.map(a => a.id);

  // All clients
  const { data: clients } = await db
    .from('agency_clients')
    .select('id, agency_id, name, status, gateway_status, usage_this_month, billing_amount_cents, created_at')
    .in('agency_id', agencyIds.length ? agencyIds : ['00000000-0000-0000-0000-000000000000']);

  const allClients = clients ?? [];

  // Credits across all agencies
  const { data: creditTxns } = await db
    .from('credit_transactions')
    .select('agency_id, amount, type, created_at')
    .in('agency_id', agencyIds.length ? agencyIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false })
    .limit(200);

  const totalCreditsUsed = (creditTxns ?? [])
    .filter(t => t.type === 'usage')
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalCreditsPurchased = (creditTxns ?? [])
    .filter(t => t.type === 'purchase')
    .reduce((s, t) => s + t.amount, 0);
  const totalCreditsBonus = (creditTxns ?? [])
    .filter(t => t.type === 'bonus')
    .reduce((s, t) => s + t.amount, 0);

  // Conversations today
  let conversationsToday = 0;
  let conversationsThisWeek = 0;
  let recentConversations: { id: string; agency_id: string; channel: string; user_message: string; ai_response: string; created_at: string }[] = [];
  try {
    const { count: todayCount } = await db
      .from('client_conversations')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());
    conversationsToday = todayCount ?? 0;

    const { count: weekCount } = await db
      .from('client_conversations')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());
    conversationsThisWeek = weekCount ?? 0;

    const { data: recent } = await db
      .from('client_conversations')
      .select('id, agency_id, channel, user_message, ai_response, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    recentConversations = (recent ?? []) as typeof recentConversations;
  } catch {
    // table may not exist
  }

  // Recent signups (last 7 days)
  const recentSignups = realAgencies.filter(a => new Date(a.created_at) >= weekAgo);

  // Platform MRR
  const platformMrr = allClients.reduce((s, c) => s + (c.billing_amount_cents ?? 0), 0);
  const activeContainers = allClients.filter(c => c.gateway_status === 'running').length;
  const agencyContainers = realAgencies.filter(a => a.gateway_status === 'running').length;

  // Per-agency stats
  const agencyStats = realAgencies.map(a => {
    const ac = allClients.filter(c => c.agency_id === a.id);
    const settings = (a.settings as Record<string, unknown>) ?? {};
    return {
      id: a.id,
      name: a.name,
      slug: a.slug,
      plan: a.plan,
      type: settings.account_type === 'solo' ? 'solo' : 'agency',
      created_at: a.created_at,
      client_count: ac.length,
      running_clients: ac.filter(c => c.gateway_status === 'running').length,
      conversations: ac.reduce((s, c) => s + (c.usage_this_month ?? 0), 0),
      mrr_cents: ac.reduce((s, c) => s + (c.billing_amount_cents ?? 0), 0),
      has_gateway: a.gateway_status === 'running',
    };
  });

  return NextResponse.json({
    timestamp: now.toISOString(),
    kpis: {
      total_agencies: realAgencies.length,
      solo_accounts: soloAgencies.length,
      agency_accounts: agencyAccounts.length,
      total_clients: allClients.length,
      active_containers: activeContainers + agencyContainers,
      platform_mrr_cents: platformMrr,
      conversations_today: conversationsToday,
      conversations_this_week: conversationsThisWeek,
      conversations_this_month: allClients.reduce((s, c) => s + (c.usage_this_month ?? 0), 0),
      credits_used: totalCreditsUsed,
      credits_purchased: totalCreditsPurchased,
      credits_bonus: totalCreditsBonus,
      signups_this_week: recentSignups.length,
    },
    agencies: agencyStats,
    recent_conversations: recentConversations,
    recent_signups: recentSignups.map(a => ({
      id: a.id,
      name: a.name,
      type: (a.settings as Record<string, unknown>)?.account_type === 'solo' ? 'solo' : 'agency',
      created_at: a.created_at,
    })),
  });
}
