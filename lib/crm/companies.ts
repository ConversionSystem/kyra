/**
 * CRM Companies — CRUD + findOrCreate
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import type { CrmCompany, CreateCompanyData } from './types';

export async function getCompanies(
  agencyId: string,
  opts: { search?: string; page?: number; limit?: number } = {},
): Promise<{ companies: CrmCompany[]; total: number }> {
  const svc = createServiceClientWithoutCookies();
  const page = opts.page || 1;
  const limit = opts.limit || 50;
  const offset = (page - 1) * limit;

  let query = svc
    .from('crm_companies')
    .select('*', { count: 'exact' })
    .eq('agency_id', agencyId);

  if (opts.search) {
    const s = `%${opts.search}%`;
    query = query.or(`name.ilike.${s},website.ilike.${s},industry.ilike.${s}`);
  }

  query = query.order('name').range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return { companies: [], total: 0 };
  return { companies: (data || []) as CrmCompany[], total: count || 0 };
}

export async function getCompanyById(agencyId: string, companyId: string): Promise<CrmCompany | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc
    .from('crm_companies')
    .select('*')
    .eq('id', companyId)
    .eq('agency_id', agencyId)
    .single();
  return (data as CrmCompany) || null;
}

export async function createCompany(agencyId: string, input: CreateCompanyData): Promise<CrmCompany | null> {
  const svc = createServiceClientWithoutCookies();
  const { data, error } = await svc
    .from('crm_companies')
    .insert({
      agency_id: agencyId,
      name: input.name,
      website: input.website || null,
      industry: input.industry || null,
      size: input.size || null,
      phone: input.phone || null,
      email: input.email || null,
      city: input.city || null,
      state: input.state || null,
      country: input.country || 'US',
    })
    .select()
    .single();

  if (error) {
    console.error('[crm/companies] create error:', error);
    return null;
  }
  return data as CrmCompany;
}

export async function findOrCreateCompany(
  agencyId: string,
  name: string,
  website?: string,
): Promise<CrmCompany | null> {
  const svc = createServiceClientWithoutCookies();

  // Try to find by name (case-insensitive)
  const { data: existing } = await svc
    .from('crm_companies')
    .select('*')
    .eq('agency_id', agencyId)
    .ilike('name', name)
    .limit(1);

  if (existing?.length) return existing[0] as CrmCompany;

  // Try by website domain if provided
  if (website) {
    const domain = website.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    const { data: byDomain } = await svc
      .from('crm_companies')
      .select('*')
      .eq('agency_id', agencyId)
      .ilike('website', `%${domain}%`)
      .limit(1);
    if (byDomain?.length) return byDomain[0] as CrmCompany;
  }

  return createCompany(agencyId, { name, website });
}
