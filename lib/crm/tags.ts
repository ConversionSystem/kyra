/**
 * Kyra CRM — Tag Manager
 * Tags stored in agency settings.crm_tags JSONB
 */

import { createServiceClient } from '@/lib/supabase/server';

export interface CrmTag {
  id: string;
  name: string;
  color: string;
  count?: number;
}

const TAG_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
];

export { TAG_COLORS };

export async function getAgencyTags(agencyId: string): Promise<CrmTag[]> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from('agencies')
    .select('settings')
    .eq('id', agencyId)
    .single();

  const settings = (data?.settings || {}) as Record<string, unknown>;
  return (settings.crm_tags as CrmTag[]) || [];
}

export async function saveAgencyTags(agencyId: string, tags: CrmTag[]): Promise<void> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from('agencies')
    .select('settings')
    .eq('id', agencyId)
    .single();

  const settings = (data?.settings || {}) as Record<string, unknown>;
  settings.crm_tags = tags;

  await supabase
    .from('agencies')
    .update({ settings })
    .eq('id', agencyId);
}

export async function getTagCounts(agencyId: string): Promise<Record<string, number>> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from('crm_contacts')
    .select('tags')
    .eq('agency_id', agencyId);

  const counts: Record<string, number> = {};
  for (const row of data || []) {
    for (const tag of (row.tags || []) as string[]) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }
  return counts;
}
