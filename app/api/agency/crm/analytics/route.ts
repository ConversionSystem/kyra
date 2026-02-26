/**
 * GET /api/agency/crm/analytics — Revenue attribution + CRM analytics
 */
import { NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

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

  const svc = createServiceClientWithoutCookies();

  // Revenue by source
  const { data: dealsBySource } = await svc
    .from('crm_deals')
    .select('source, value, stage')
    .eq('agency_id', agencyId);

  const sourceRevenue: Record<string, { total: number; won: number; pipeline: number; count: number }> = {};
  for (const deal of (dealsBySource || [])) {
    const src = deal.source || 'manual';
    if (!sourceRevenue[src]) sourceRevenue[src] = { total: 0, won: 0, pipeline: 0, count: 0 };
    sourceRevenue[src].count++;
    const val = Number(deal.value) || 0;
    sourceRevenue[src].total += val;
    if (deal.stage === 'won') sourceRevenue[src].won += val;
    if (!['won', 'lost'].includes(deal.stage)) sourceRevenue[src].pipeline += val;
  }

  // Conversion funnel
  const { count: totalContacts } = await svc
    .from('crm_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId);

  const { count: leadsCount } = await svc
    .from('crm_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('stage', 'lead');

  const { count: contactsCount } = await svc
    .from('crm_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('stage', 'contact');

  const { count: customersCount } = await svc
    .from('crm_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('stage', 'customer');

  const { count: totalDeals } = await svc
    .from('crm_deals')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId);

  const { count: wonDeals } = await svc
    .from('crm_deals')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('stage', 'won');

  const { data: wonTotal } = await svc
    .from('crm_deals')
    .select('value')
    .eq('agency_id', agencyId)
    .eq('stage', 'won');

  const totalWonValue = (wonTotal || []).reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  // AI activity stats (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { count: aiActions } = await svc
    .from('crm_activities')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('actor', 'ai')
    .gte('created_at', thirtyDaysAgo);

  // Credits used on CRM
  const { data: creditUsage } = await svc
    .from('agency_credit_log')
    .select('credits_used, action')
    .eq('agency_id', agencyId)
    .like('action', 'crm%')
    .gte('created_at', thirtyDaysAgo);

  const crmCreditsUsed = (creditUsage || []).reduce((sum, c) => sum + (Number(c.credits_used) || 0), 0);

  // Score distribution
  const { data: scoreData } = await svc
    .from('crm_contacts')
    .select('score_label')
    .eq('agency_id', agencyId);

  const scoreDistribution: Record<string, number> = { new: 0, cold: 0, warm: 0, hot: 0 };
  for (const c of (scoreData || [])) {
    const label = c.score_label || 'new';
    scoreDistribution[label] = (scoreDistribution[label] || 0) + 1;
  }

  return NextResponse.json({
    revenue_by_source: sourceRevenue,
    funnel: {
      total_contacts: totalContacts || 0,
      leads: leadsCount || 0,
      contacts: contactsCount || 0,
      customers: customersCount || 0,
      deals: totalDeals || 0,
      won_deals: wonDeals || 0,
      won_value: totalWonValue,
    },
    ai_stats: {
      actions_30d: aiActions || 0,
      crm_credits_used_30d: crmCreditsUsed,
    },
    score_distribution: scoreDistribution,
  });
}
