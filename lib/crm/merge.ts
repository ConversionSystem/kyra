/**
 * Kyra CRM — Contact Merge
 * Find duplicates and merge contacts
 */

import { createServiceClient } from '@/lib/supabase/server';

export interface DuplicateGroup {
  key: string;
  matchType: 'email' | 'phone';
  contacts: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    score: number;
    stage: string;
    created_at: string;
    activity_count: number;
  }>;
}

export async function findDuplicates(agencyId: string): Promise<DuplicateGroup[]> {
  const supabase = await createServiceClient();

  const { data: contacts } = await supabase
    .from('crm_contacts')
    .select('id, first_name, last_name, email, phone, score, stage, created_at')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: true });

  if (!contacts || contacts.length < 2) return [];

  // Get activity counts
  const { data: activities } = await supabase
    .from('crm_activities')
    .select('contact_id')
    .eq('agency_id', agencyId)
    .not('contact_id', 'is', null);

  const activityCounts: Record<string, number> = {};
  for (const a of activities || []) {
    if (a.contact_id) activityCounts[a.contact_id] = (activityCounts[a.contact_id] || 0) + 1;
  }

  const groups: Map<string, DuplicateGroup> = new Map();

  // Find email duplicates
  const emailMap: Map<string, typeof contacts> = new Map();
  for (const c of contacts) {
    if (!c.email) continue;
    const key = c.email.toLowerCase().trim();
    if (!emailMap.has(key)) emailMap.set(key, []);
    emailMap.get(key)!.push(c);
  }
  for (const [email, dupes] of emailMap) {
    if (dupes.length < 2) continue;
    groups.set(`email:${email}`, {
      key: `email:${email}`,
      matchType: 'email',
      contacts: dupes.map(c => ({ ...c, activity_count: activityCounts[c.id] || 0 })),
    });
  }

  // Find phone duplicates
  const phoneMap: Map<string, typeof contacts> = new Map();
  for (const c of contacts) {
    if (!c.phone) continue;
    const key = c.phone.replace(/\D/g, '').slice(-10);
    if (!key || key.length < 7) continue;
    if (!phoneMap.has(key)) phoneMap.set(key, []);
    phoneMap.get(key)!.push(c);
  }
  for (const [phone, dupes] of phoneMap) {
    if (dupes.length < 2) continue;
    const gkey = `phone:${phone}`;
    if (!groups.has(gkey)) {
      groups.set(gkey, {
        key: gkey,
        matchType: 'phone',
        contacts: dupes.map(c => ({ ...c, activity_count: activityCounts[c.id] || 0 })),
      });
    }
  }

  return Array.from(groups.values());
}

export async function mergeContacts(
  agencyId: string,
  primaryId: string,
  secondaryId: string,
  fieldOverrides?: Record<string, unknown>
): Promise<void> {
  const supabase = await createServiceClient();

  // Verify both contacts belong to this agency
  const { data: contacts } = await supabase
    .from('crm_contacts')
    .select('*')
    .eq('agency_id', agencyId)
    .in('id', [primaryId, secondaryId]);

  if (!contacts || contacts.length !== 2) throw new Error('Contacts not found');

  const primary = contacts.find(c => c.id === primaryId);
  const secondary = contacts.find(c => c.id === secondaryId);
  if (!primary || !secondary) throw new Error('Contact mismatch');

  // Apply field overrides to primary
  if (fieldOverrides && Object.keys(fieldOverrides).length > 0) {
    await supabase
      .from('crm_contacts')
      .update(fieldOverrides)
      .eq('id', primaryId);
  }

  // Merge tags
  const allTags = [...new Set([...(primary.tags || []), ...(secondary.tags || [])])];
  await supabase
    .from('crm_contacts')
    .update({ tags: allTags })
    .eq('id', primaryId);

  // Move activities from secondary to primary
  await supabase
    .from('crm_activities')
    .update({ contact_id: primaryId })
    .eq('contact_id', secondaryId)
    .eq('agency_id', agencyId);

  // Move deals from secondary to primary
  await supabase
    .from('crm_deals')
    .update({ contact_id: primaryId })
    .eq('contact_id', secondaryId)
    .eq('agency_id', agencyId);

  // Log the merge as activity
  await supabase
    .from('crm_activities')
    .insert({
      agency_id: agencyId,
      contact_id: primaryId,
      type: 'system',
      subject: 'Contacts merged',
      body: `Merged with ${secondary.first_name || ''} ${secondary.last_name || ''} (${secondary.email || secondary.phone || 'unknown'})`,
      actor: 'human',
    });

  // Delete secondary contact
  await supabase
    .from('crm_contacts')
    .delete()
    .eq('id', secondaryId)
    .eq('agency_id', agencyId);
}
