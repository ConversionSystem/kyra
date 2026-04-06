/**
 * GET /api/agency/crm/analytics — Enhanced CRM Analytics
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const clientId = req.nextUrl.searchParams.get('clientId') || undefined;
  const svc = createServiceClientWithoutCookies();

  // ─── Contacts ───
  type ContactRow = { id: string; first_name: string | null; last_name: string | null; stage: string; score: number; score_label: string | null; source: string | null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contactsQuery: any = svc
    .from('crm_contacts')
    .select('id, first_name, last_name, stage, score, score_label, source')
    .eq('agency_id', agencyId);
  if (clientId) contactsQuery = contactsQuery.eq('client_id', clientId);
  const { data: allContacts } = await contactsQuery as { data: ContactRow[] | null };

  const contacts: ContactRow[] = allContacts || [];
  const byStage: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const byScore: Record<string, number> = {};
  for (const c of contacts) {
    byStage[c.stage] = (byStage[c.stage] || 0) + 1;
    bySource[c.source || 'unknown'] = (bySource[c.source || 'unknown'] || 0) + 1;
    byScore[c.score_label || 'new'] = (byScore[c.score_label || 'new'] || 0) + 1;
  }

  const topContacts = contacts
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(c => ({
      id: c.id,
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed',
      score: c.score,
      stage: c.stage,
    }));

  // ─── Deals ───
  const { data: allDeals } = await svc
    .from('crm_deals')
    .select('id, value, stage, probability')
    .eq('agency_id', agencyId);

  const deals = allDeals || [];
  const dealsByStage: Record<string, { count: number; value: number }> = {};
  let totalDealValue = 0;
  let weightedPipeline = 0;

  for (const d of deals) {
    const val = Number(d.value) || 0;
    totalDealValue += val;
    if (!dealsByStage[d.stage]) dealsByStage[d.stage] = { count: 0, value: 0 };
    dealsByStage[d.stage].count++;
    dealsByStage[d.stage].value += val;
    if (!['won', 'lost'].includes(d.stage)) {
      weightedPipeline += val * ((d.probability || 50) / 100);
    }
  }

  // ─── Activities (last 14 days) ───
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let activitiesQuery: any = svc
    .from('crm_activities')
    .select('type, created_at')
    .eq('agency_id', agencyId)
    .gte('created_at', fourteenDaysAgo);
  if (clientId) {
    const contactIds = contacts.map(c => c.id);
    if (contactIds.length === 0) {
      activitiesQuery = activitiesQuery.eq('id', 'no-match');
    } else {
      activitiesQuery = activitiesQuery.in('contact_id', contactIds);
    }
  }
  const { data: recentActivities } = await activitiesQuery;

  const actByType: Record<string, number> = {};
  const actByDay: Map<string, number> = new Map();

  // Initialize all 14 days
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    actByDay.set(d.toISOString().split('T')[0], 0);
  }

  for (const a of recentActivities || []) {
    actByType[a.type] = (actByType[a.type] || 0) + 1;
    const day = a.created_at.split('T')[0];
    actByDay.set(day, (actByDay.get(day) || 0) + 1);
  }

  const actByDayArr = Array.from(actByDay.entries()).map(([date, count]) => ({ date, count }));

  // ─── Conversions ───
  const totalLeads = byStage.lead || 0;
  const totalContactStage = byStage.contact || 0;
  const totalCustomers = byStage.customer || 0;
  const allNonChurned = contacts.length - (byStage.churned || 0);

  const leadToContact = totalLeads + totalContactStage + totalCustomers > 0
    ? (totalContactStage + totalCustomers) / (totalLeads + totalContactStage + totalCustomers)
    : 0;
  const contactToCustomer = totalContactStage + totalCustomers > 0
    ? totalCustomers / (totalContactStage + totalCustomers)
    : 0;
  const overall = allNonChurned > 0 ? totalCustomers / allNonChurned : 0;

  return NextResponse.json({
    contacts: {
      total: contacts.length,
      byStage,
      bySource,
      byScore,
    },
    deals: {
      total: deals.length,
      totalValue: totalDealValue,
      byStage: dealsByStage,
    },
    activities: {
      total: (recentActivities || []).length,
      byType: actByType,
      byDay: actByDayArr,
    },
    conversions: {
      lead_to_contact: leadToContact,
      contact_to_customer: contactToCustomer,
      overall,
    },
    forecast: {
      weighted_pipeline: weightedPipeline,
      expected_revenue: (dealsByStage.won?.value || 0) + weightedPipeline,
    },
    topContacts,
  });
}
