/**
 * Cross-Contact Intelligence
 *
 * Analyzes contacts at the same company to surface:
 * - Decision-maker mapping (who's who)
 * - Relationship graph (who knows whom)
 * - Coverage gaps (who haven't we reached)
 * - Multi-threading suggestions
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import type { CrmContact } from './types';

export interface CompanyIntelligence {
  company_id: string;
  company_name: string;
  contacts: ContactRole[];
  coverage: 'single_thread' | 'multi_thread' | 'deep';
  suggestions: string[];
  decision_maker: string | null;
  influencers: string[];
  unengaged: string[];
}

interface ContactRole {
  id: string;
  name: string;
  title: string | null;
  role: 'decision_maker' | 'influencer' | 'end_user' | 'unknown';
  engagement: 'active' | 'passive' | 'unengaged';
  last_activity: string | null;
  score: number;
}

export async function getCompanyIntelligence(
  agencyId: string,
  companyId: string,
): Promise<CompanyIntelligence | null> {
  const svc = createServiceClientWithoutCookies();

  // Get company
  const { data: company } = await svc
    .from('crm_companies')
    .select('id, name')
    .eq('id', companyId)
    .eq('agency_id', agencyId)
    .single();

  if (!company) return null;

  // Get all contacts at this company
  const { data: contacts } = await svc
    .from('crm_contacts')
    .select('id, first_name, last_name, title, score, score_label, last_activity_at, enrichment_data, stage')
    .eq('agency_id', agencyId)
    .eq('company_id', companyId)
    .order('score', { ascending: false });

  if (!contacts?.length) return null;

  // Get activity counts per contact
  const contactIds = contacts.map(c => c.id);
  const { data: activities } = await svc
    .from('crm_activities')
    .select('contact_id')
    .eq('agency_id', agencyId)
    .in('contact_id', contactIds);

  const activityCounts = new Map<string, number>();
  for (const a of (activities || [])) {
    activityCounts.set(a.contact_id, (activityCounts.get(a.contact_id) || 0) + 1);
  }

  // Map contacts to roles
  const contactRoles: ContactRole[] = contacts.map(c => {
    const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown';
    const actCount = activityCounts.get(c.id) || 0;
    const daysSinceActivity = c.last_activity_at
      ? Math.floor((Date.now() - new Date(c.last_activity_at).getTime()) / 86400000)
      : null;

    // Determine role from title
    const role = inferRole(c.title);

    // Determine engagement
    let engagement: ContactRole['engagement'] = 'unengaged';
    if (actCount > 0 && daysSinceActivity !== null && daysSinceActivity <= 14) engagement = 'active';
    else if (actCount > 0) engagement = 'passive';

    // Check AI memory for role info
    const enrichment = (c.enrichment_data || {}) as Record<string, unknown>;
    const memories = (enrichment.ai_memory || []) as Array<{ type: string; content: string }>;
    const roleMemory = memories.find(m => m.type === 'relationship');

    return {
      id: c.id,
      name,
      title: c.title,
      role: roleMemory ? inferRoleFromMemory(roleMemory.content) : role,
      engagement,
      last_activity: c.last_activity_at,
      score: c.score || 0,
    };
  });

  // Analyze coverage
  const activeCount = contactRoles.filter(c => c.engagement === 'active').length;
  const coverage = activeCount === 0 ? 'single_thread' :
    activeCount === 1 ? 'single_thread' :
    activeCount <= 3 ? 'multi_thread' : 'deep';

  // Find decision maker
  const dm = contactRoles.find(c => c.role === 'decision_maker');
  const influencers = contactRoles.filter(c => c.role === 'influencer').map(c => c.name);
  const unengaged = contactRoles.filter(c => c.engagement === 'unengaged').map(c => c.name);

  // Generate suggestions
  const suggestions: string[] = [];

  if (!dm) {
    suggestions.push(`No identified decision-maker at ${company.name}. Look for C-level or VP contacts.`);
  }

  if (unengaged.length > 0) {
    suggestions.push(`${unengaged.length} contact${unengaged.length > 1 ? 's' : ''} at ${company.name} haven't been engaged yet: ${unengaged.join(', ')}. Consider reaching out for multi-threading.`);
  }

  if (coverage === 'single_thread' && contactRoles.length > 1) {
    suggestions.push(`Single-threaded at ${company.name} despite having ${contactRoles.length} contacts. Multi-threading reduces deal risk.`);
  }

  if (dm && dm.engagement !== 'active') {
    suggestions.push(`Decision-maker ${dm.name} is ${dm.engagement}. Re-engage them — deals stall without decision-maker involvement.`);
  }

  const highScorer = contactRoles.find(c => c.score >= 70 && c.role !== 'decision_maker');
  if (highScorer && dm) {
    suggestions.push(`${highScorer.name} (score: ${highScorer.score}) is highly engaged. They may champion your solution internally to ${dm.name}.`);
  }

  return {
    company_id: companyId,
    company_name: company.name,
    contacts: contactRoles,
    coverage,
    suggestions,
    decision_maker: dm?.name || null,
    influencers,
    unengaged,
  };
}

/**
 * Get intelligence for ALL companies with multiple contacts
 */
export async function getAllCompanyIntelligence(agencyId: string): Promise<CompanyIntelligence[]> {
  const svc = createServiceClientWithoutCookies();

  // Find companies with 2+ contacts
  const { data: companies } = await svc
    .from('crm_contacts')
    .select('company_id')
    .eq('agency_id', agencyId)
    .not('company_id', 'is', null);

  if (!companies?.length) return [];

  // Count per company
  const counts = new Map<string, number>();
  for (const c of companies) {
    counts.set(c.company_id, (counts.get(c.company_id) || 0) + 1);
  }

  const multiContactCompanies = [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([id]) => id);

  const results: CompanyIntelligence[] = [];
  for (const companyId of multiContactCompanies.slice(0, 20)) {
    const intel = await getCompanyIntelligence(agencyId, companyId);
    if (intel) results.push(intel);
  }

  return results;
}

function inferRole(title: string | null): ContactRole['role'] {
  if (!title) return 'unknown';
  const t = title.toLowerCase();
  if (/\b(ceo|cto|cfo|coo|cmo|founder|owner|president|chief)\b/.test(t)) return 'decision_maker';
  if (/\b(vp|vice president|director|head of|partner)\b/.test(t)) return 'decision_maker';
  if (/\b(manager|lead|senior|principal)\b/.test(t)) return 'influencer';
  return 'end_user';
}

function inferRoleFromMemory(content: string): ContactRole['role'] {
  const c = content.toLowerCase();
  if (/decision.?maker|final.?say|signs?.off|approv/i.test(c)) return 'decision_maker';
  if (/influenc|champion|advocate|recommend/i.test(c)) return 'influencer';
  return 'unknown';
}
