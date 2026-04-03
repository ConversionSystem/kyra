/**
 * CRM Deals — CRUD, kanban stages, pipeline auto-creation
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { logActivity } from './activities';
import type { CrmDeal } from './types';

export const DEAL_STAGES = ['prospect', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;

export async function getDeals(
  agencyId: string,
  opts: { stage?: string; contactId?: string; clientId?: string; search?: string } = {},
): Promise<CrmDeal[]> {
  const svc = createServiceClientWithoutCookies();

  // If clientId provided, scope to contacts belonging to that client
  let clientContactIds: string[] | null = null;
  if (opts.clientId) {
    const { data: contacts } = await svc
      .from('crm_contacts')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('client_id', opts.clientId);
    clientContactIds = (contacts || []).map((c: { id: string }) => c.id);
    if (clientContactIds.length === 0) return [];
  }

  let query = svc
    .from('crm_deals')
    .select('*, crm_contacts!crm_deals_contact_id_fkey(id, first_name, last_name, email, avatar_color), crm_companies!crm_deals_company_id_fkey(id, name)')
    .eq('agency_id', agencyId);

  if (opts.stage) query = query.eq('stage', opts.stage);
  if (opts.contactId) query = query.eq('contact_id', opts.contactId);
  if (clientContactIds !== null) query = query.in('contact_id', clientContactIds);
  if (opts.search) {
    const s = `%${opts.search}%`;
    query = query.ilike('name', s);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error('[crm/deals] getDeals error:', error);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => {
    const contact = row.crm_contacts as Record<string, unknown> | null;
    const company = row.crm_companies as Record<string, unknown> | null;
    const deal = { ...row } as Record<string, unknown>;
    delete deal.crm_contacts;
    delete deal.crm_companies;
    return { ...deal, contact: contact || null, company: company || null } as CrmDeal & { contact: unknown; company: unknown };
  });
}

export async function getDealById(agencyId: string, dealId: string): Promise<CrmDeal | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc
    .from('crm_deals')
    .select('*')
    .eq('id', dealId)
    .eq('agency_id', agencyId)
    .single();
  return (data as CrmDeal) || null;
}

export interface CreateDealData {
  name: string;
  contact_id?: string;
  company_id?: string;
  value?: number;
  stage?: string;
  probability?: number;
  close_date?: string;
  source?: string;
  source_id?: string;
  notes?: string;
}

export async function createDeal(
  agencyId: string,
  input: CreateDealData,
  actorName?: string,
): Promise<CrmDeal | null> {
  const svc = createServiceClientWithoutCookies();

  const { data, error } = await svc
    .from('crm_deals')
    .insert({
      agency_id: agencyId,
      name: input.name,
      contact_id: input.contact_id || null,
      company_id: input.company_id || null,
      value: input.value || 0,
      stage: input.stage || 'prospect',
      probability: input.probability || 10,
      close_date: input.close_date || null,
      source: input.source || 'manual',
      source_id: input.source_id || null,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[crm/deals] create error:', error);
    return null;
  }

  const deal = data as CrmDeal;

  // Log activity
  await logActivity(agencyId, {
    contact_id: input.contact_id,
    company_id: input.company_id,
    deal_id: deal.id,
    type: 'deal_created',
    subject: `Deal created: ${input.name}`,
    body: `New deal worth $${(input.value || 0).toLocaleString()} in ${input.stage || 'prospect'} stage.`,
    actor: input.source === 'pipeline' ? 'ai' : 'human',
    actor_name: actorName || (input.source === 'pipeline' ? 'AI Pipeline' : undefined),
  });

  return deal;
}

export async function updateDeal(
  agencyId: string,
  dealId: string,
  updates: Partial<CrmDeal>,
): Promise<CrmDeal | null> {
  const svc = createServiceClientWithoutCookies();

  const { id: _id, agency_id: _aid, created_at: _ca, ...safeUpdates } = updates as Record<string, unknown>;

  const { data, error } = await svc
    .from('crm_deals')
    .update(safeUpdates)
    .eq('id', dealId)
    .eq('agency_id', agencyId)
    .select()
    .single();

  if (error) {
    console.error('[crm/deals] update error:', error);
    return null;
  }

  return data as CrmDeal;
}

export async function moveDealStage(
  agencyId: string,
  dealId: string,
  newStage: string,
  actorName?: string,
): Promise<CrmDeal | null> {
  const svc = createServiceClientWithoutCookies();

  // Get current deal
  const { data: current } = await svc
    .from('crm_deals')
    .select('*')
    .eq('id', dealId)
    .eq('agency_id', agencyId)
    .single();

  if (!current) return null;
  const deal = current as CrmDeal;
  const oldStage = deal.stage;

  // Update probability based on stage
  const probMap: Record<string, number> = {
    prospect: 10, qualified: 25, proposal: 50, negotiation: 75, won: 100, lost: 0,
  };

  const updated = await updateDeal(agencyId, dealId, {
    stage: newStage,
    probability: probMap[newStage] ?? deal.probability,
  } as Partial<CrmDeal>);

  if (updated) {
    await logActivity(agencyId, {
      contact_id: deal.contact_id || undefined,
      company_id: deal.company_id || undefined,
      deal_id: dealId,
      type: 'stage_change',
      subject: `Deal moved: ${oldStage} → ${newStage}`,
      body: `"${deal.name}" ($${Number(deal.value).toLocaleString()}) moved from ${oldStage} to ${newStage}.`,
      actor: actorName ? 'human' : 'system',
      actor_name: actorName,
      needs_attention: newStage === 'won' || newStage === 'lost',
      attention_type: newStage === 'won' ? 'review' : newStage === 'lost' ? 'review' : undefined,
    });
  }

  return updated;
}

export async function deleteDeal(agencyId: string, dealId: string): Promise<boolean> {
  const svc = createServiceClientWithoutCookies();
  const { error } = await svc
    .from('crm_deals')
    .delete()
    .eq('id', dealId)
    .eq('agency_id', agencyId);
  return !error;
}

export async function getDealStats(agencyId: string): Promise<{
  total: number;
  totalValue: number;
  byStage: Record<string, { count: number; value: number }>;
}> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc
    .from('crm_deals')
    .select('stage, value')
    .eq('agency_id', agencyId);

  const byStage: Record<string, { count: number; value: number }> = {};
  let totalValue = 0;

  for (const deal of (data || []) as { stage: string; value: number }[]) {
    if (!byStage[deal.stage]) byStage[deal.stage] = { count: 0, value: 0 };
    byStage[deal.stage].count++;
    byStage[deal.stage].value += Number(deal.value) || 0;
    if (deal.stage !== 'lost') totalValue += Number(deal.value) || 0;
  }

  return { total: (data || []).length, totalValue, byStage };
}
