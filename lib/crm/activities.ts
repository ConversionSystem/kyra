/**
 * CRM Activities — Unified timeline, command feed, activity logging
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import type { CrmActivity, LogActivityData, CommandFeedItem, CrmFeedResponse } from './types';

export async function logActivity(agencyId: string, data: LogActivityData): Promise<CrmActivity | null> {
  const svc = createServiceClientWithoutCookies();

  const { data: activity, error } = await svc
    .from('crm_activities')
    .insert({
      agency_id: agencyId,
      contact_id: data.contact_id || null,
      company_id: data.company_id || null,
      deal_id: data.deal_id || null,
      type: data.type,
      subject: data.subject || null,
      body: data.body || null,
      direction: data.direction || null,
      channel: data.channel || null,
      actor: data.actor || 'human',
      actor_name: data.actor_name || null,
      metadata: data.metadata || {},
      needs_attention: data.needs_attention || false,
      attention_type: data.attention_type || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[crm/activities] log error:', error);
    return null;
  }

  // Update contact's last_activity_at
  if (data.contact_id) {
    await svc
      .from('crm_contacts')
      .update({
        last_activity_at: new Date().toISOString(),
        ...(data.direction === 'outbound' ? { last_contacted_at: new Date().toISOString() } : {}),
      })
      .eq('id', data.contact_id)
      .eq('agency_id', agencyId)
      .then(() => {}, () => {});
  }

  return activity as CrmActivity;
}

export async function getTimeline(
  agencyId: string,
  contactId: string,
  limit = 50,
): Promise<CrmActivity[]> {
  const svc = createServiceClientWithoutCookies();

  const { data } = await svc
    .from('crm_activities')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []) as CrmActivity[];
}

export async function getCommandFeed(agencyId: string): Promise<CrmFeedResponse> {
  const svc = createServiceClientWithoutCookies();

  // 1. Items needing attention
  const { data: attentionRaw } = await svc
    .from('crm_activities')
    .select('*, crm_contacts!crm_activities_contact_id_fkey(id, first_name, last_name)')
    .eq('agency_id', agencyId)
    .eq('needs_attention', true)
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(20);

  const attention_items: CommandFeedItem[] = (attentionRaw || []).map((row: Record<string, unknown>) => {
    const contact = row.crm_contacts as Record<string, unknown> | null;
    const item = { ...row } as Record<string, unknown>;
    delete item.crm_contacts;
    return {
      ...item,
      contact: contact ? {
        id: contact.id as string,
        first_name: contact.first_name as string | null,
        last_name: contact.last_name as string | null,
      } : null,
    } as CommandFeedItem;
  });

  // 2. AI handled today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: aiHandled } = await svc
    .from('crm_activities')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('actor', 'ai')
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  // 3. Recent activities
  const { data: recentRaw } = await svc
    .from('crm_activities')
    .select('*, crm_contacts!crm_activities_contact_id_fkey(first_name, last_name), crm_companies!crm_activities_company_id_fkey(name)')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(20);

  const recent_activities = (recentRaw || []).map((row: Record<string, unknown>) => {
    const contact = row.crm_contacts as Record<string, unknown> | null;
    const company = row.crm_companies as Record<string, unknown> | null;
    const item = { ...row } as Record<string, unknown>;
    delete item.crm_contacts;
    delete item.crm_companies;
    return {
      ...item,
      contact_name: contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : undefined,
      company_name: company ? (company.name as string) : undefined,
    };
  });

  // 4. Stats
  const { count: totalContacts } = await svc
    .from('crm_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId);

  const { data: dealStats } = await svc
    .from('crm_deals')
    .select('value')
    .eq('agency_id', agencyId)
    .in('stage', ['prospect', 'qualified', 'proposal', 'negotiation']);

  const pipelineValue = (dealStats || []).reduce((sum, d: Record<string, unknown>) => sum + (Number(d.value) || 0), 0);

  const { count: hotLeads } = await svc
    .from('crm_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .gte('score', 70);

  return {
    attention_items,
    ai_handled_today: (aiHandled || []) as CrmActivity[],
    recent_activities: recent_activities as CrmFeedResponse['recent_activities'],
    stats: {
      total_contacts: totalContacts || 0,
      pipeline_value: pipelineValue,
      hot_leads: hotLeads || 0,
      ai_handled_count: (aiHandled || []).length,
    },
  };
}

export async function resolveActivity(agencyId: string, activityId: string): Promise<boolean> {
  const svc = createServiceClientWithoutCookies();
  const { error } = await svc
    .from('crm_activities')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', activityId)
    .eq('agency_id', agencyId);
  return !error;
}

export async function getRecentActivities(agencyId: string, limit = 20): Promise<CrmActivity[]> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc
    .from('crm_activities')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []) as CrmActivity[];
}
