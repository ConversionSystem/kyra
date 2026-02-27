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

  // Full attribution chain: Source → AI Outreach → Reply → Meeting → Deal → Revenue
  const { data: chainDeals } = await svc
    .from('crm_deals')
    .select('id, name, value, stage, source, source_id, contact_id, created_at')
    .eq('agency_id', agencyId)
    .eq('stage', 'won')
    .order('created_at', { ascending: false })
    .limit(20);

  const attributionChain: Array<{
    deal_name: string;
    value: number;
    source: string;
    contact_id: string | null;
    stages: string[];
    created_at: string;
  }> = [];

  for (const deal of (chainDeals || [])) {
    // Get activities for this deal's contact to build the chain
    const stages: string[] = [];
    if (deal.source === 'pipeline') stages.push('AI Outreach');
    if (deal.source === 'ai') stages.push('AI Generated');
    if (deal.source === 'ghl_inbound') stages.push('GHL Inbound');
    if (deal.source === 'manual') stages.push('Manual Entry');

    if (deal.contact_id) {
      const { count: replies } = await svc
        .from('crm_activities')
        .select('id', { count: 'exact', head: true })
        .eq('contact_id', deal.contact_id)
        .eq('direction', 'inbound')
        .limit(1);
      if (replies && replies > 0) stages.push('Customer Replied');

      const { count: meetings } = await svc
        .from('crm_activities')
        .select('id', { count: 'exact', head: true })
        .eq('contact_id', deal.contact_id)
        .eq('type', 'meeting')
        .limit(1);
      if (meetings && meetings > 0) stages.push('Meeting Held');
    }

    stages.push('Deal Won');

    attributionChain.push({
      deal_name: deal.name,
      value: Number(deal.value) || 0,
      source: deal.source || 'manual',
      contact_id: deal.contact_id,
      stages,
      created_at: deal.created_at,
    });
  }

  // Autopilot digest (last run)
  const { data: lastDigest } = await svc
    .from('crm_activities')
    .select('body, metadata, created_at')
    .eq('agency_id', agencyId)
    .eq('type', 'system')
    .eq('actor', 'system')
    .order('created_at', { ascending: false })
    .limit(1);

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
    attribution_chain: attributionChain,
    last_autopilot_digest: lastDigest?.[0] || null,
  });
}
