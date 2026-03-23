/**
 * CRM Contacts — CRUD, search, dedup, timeline
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import type { CrmContact, ContactWithCompany, ContactFilters, CreateContactData } from './types';
import { getAvatarColor } from './types';

const PAGE_SIZE = 50;

export async function getContacts(
  agencyId: string,
  filters: ContactFilters = {},
  clientId?: string,
): Promise<{ contacts: ContactWithCompany[]; total: number }> {
  const svc = createServiceClientWithoutCookies();
  const page = filters.page || 1;
  const limit = filters.limit || PAGE_SIZE;
  const offset = (page - 1) * limit;

  let query = svc
    .from('crm_contacts')
    .select('*, crm_companies!crm_contacts_company_id_fkey(id, name, website, industry)', { count: 'exact' })
    .eq('agency_id', agencyId);

  if (clientId) query = query.eq('client_id', clientId);

  if (filters.search) {
    const s = `%${filters.search}%`;
    query = query.or(`first_name.ilike.${s},last_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`);
  }
  if (filters.stage) query = query.eq('stage', filters.stage);
  if (filters.score_label) query = query.eq('score_label', filters.score_label);
  if (filters.tag) query = query.contains('tags', [filters.tag]);
  if (filters.startDate) query = query.gte('created_at', filters.startDate);
  if (filters.endDate) query = query.lte('created_at', filters.endDate);

  const sortMap: Record<string, string> = {
    name: 'first_name',
    score: 'score',
    last_activity: 'last_activity_at',
    created: 'created_at',
  };
  const sortCol = sortMap[filters.sort || 'created'] || 'created_at';
  const ascending = filters.order === 'asc';
  query = query.order(sortCol, { ascending, nullsFirst: false });

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    console.error('[crm/contacts] getContacts error:', error);
    return { contacts: [], total: 0 };
  }

  const contacts = (data || []).map((row: Record<string, unknown>) => {
    const company = row.crm_companies as Record<string, unknown> | null;
    const contact = { ...row } as Record<string, unknown>;
    delete contact.crm_companies;
    return {
      ...contact,
      company: company || null,
    } as ContactWithCompany;
  });

  return { contacts, total: count || 0 };
}

export async function getContactById(agencyId: string, contactId: string): Promise<ContactWithCompany | null> {
  const svc = createServiceClientWithoutCookies();
  const { data, error } = await svc
    .from('crm_contacts')
    .select('*, crm_companies!crm_contacts_company_id_fkey(*)')
    .eq('id', contactId)
    .eq('agency_id', agencyId)
    .single();

  if (error || !data) return null;

  const company = (data as Record<string, unknown>).crm_companies as Record<string, unknown> | null;
  const contact = { ...data } as Record<string, unknown>;
  delete contact.crm_companies;
  return { ...contact, company: company || null } as ContactWithCompany;
}

export async function createContact(
  agencyId: string,
  input: CreateContactData,
  clientId?: string,
): Promise<{ contact: CrmContact | null; existing: boolean; error?: string }> {
  const svc = createServiceClientWithoutCookies();
  const scopedClientId = input.client_id || clientId || null;

  // Dedup check by email or phone
  if (input.email || input.phone) {
    let dupQuery = svc.from('crm_contacts').select('id').eq('agency_id', agencyId);
    if (scopedClientId) dupQuery = dupQuery.eq('client_id', scopedClientId);
    if (input.email && input.phone) {
      dupQuery = dupQuery.or(`email.eq.${input.email},phone.eq.${input.phone}`);
    } else if (input.email) {
      dupQuery = dupQuery.eq('email', input.email);
    } else {
      dupQuery = dupQuery.eq('phone', input.phone!);
    }
    const { data: existing } = await dupQuery.limit(1);
    if (existing?.length) {
      return { contact: existing[0] as CrmContact, existing: true };
    }
  }

  // Auto-find/create company
  let companyId = input.company_id || null;
  if (!companyId && input.company_name) {
    const { findOrCreateCompany } = await import('./companies');
    const company = await findOrCreateCompany(agencyId, input.company_name);
    companyId = company?.id || null;
  }

  const avatarColor = getAvatarColor(input.first_name, input.last_name);

  const { data, error } = await svc
    .from('crm_contacts')
    .insert({
      agency_id: agencyId,
      client_id: scopedClientId,
      company_id: companyId,
      first_name: input.first_name || null,
      last_name: input.last_name || null,
      email: input.email || null,
      phone: input.phone || null,
      title: input.title || null,
      source: input.source || 'manual',
      source_id: input.source_id || null,
      stage: input.stage || 'lead',
      score: 0,
      score_label: 'new',
      avatar_color: avatarColor,
      tags: input.tags || [],
      enrichment_data: input.enrichment_data || {},
    })
    .select()
    .single();

  if (error) {
    console.error('[crm/contacts] create error:', error);
    return { contact: null, existing: false, error: error.message };
  }

  return { contact: data as CrmContact, existing: false };
}

export async function updateContact(
  agencyId: string,
  contactId: string,
  updates: Partial<CrmContact>,
): Promise<CrmContact | null> {
  const svc = createServiceClientWithoutCookies();

  // Don't allow updating these fields
  const { id: _id, agency_id: _aid, created_at: _ca, ...safeUpdates } = updates as Record<string, unknown>;

  const { data, error } = await svc
    .from('crm_contacts')
    .update(safeUpdates)
    .eq('id', contactId)
    .eq('agency_id', agencyId)
    .select()
    .single();

  if (error) {
    console.error('[crm/contacts] update error:', error);
    return null;
  }

  return data as CrmContact;
}

export async function deleteContact(agencyId: string, contactId: string): Promise<boolean> {
  const svc = createServiceClientWithoutCookies();
  const { error } = await svc
    .from('crm_contacts')
    .delete()
    .eq('id', contactId)
    .eq('agency_id', agencyId);
  return !error;
}

export async function searchContacts(agencyId: string, query: string, limit = 10, clientId?: string): Promise<ContactWithCompany[]> {
  const { contacts } = await getContacts(agencyId, { search: query, limit }, clientId);
  return contacts;
}
