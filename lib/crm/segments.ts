/**
 * Kyra CRM — Saved Segments (Filters)
 * Stored in agency settings.crm_segments JSONB
 */

import { createServiceClient } from '@/lib/supabase/server';

export interface SegmentFilter {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'in' | 'not_in' | 'is_set' | 'not_set';
  value: string | string[] | number | boolean;
}

export interface CrmSegment {
  id: string;
  name: string;
  emoji: string;
  filters: SegmentFilter[];
  count?: number;
  created_at: string;
}

export async function getSegments(agencyId: string): Promise<CrmSegment[]> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from('agencies')
    .select('settings')
    .eq('id', agencyId)
    .single();

  const settings = (data?.settings || {}) as Record<string, unknown>;
  return (settings.crm_segments as CrmSegment[]) || [];
}

export async function saveSegments(agencyId: string, segments: CrmSegment[]): Promise<void> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from('agencies')
    .select('settings')
    .eq('id', agencyId)
    .single();

  const settings = (data?.settings || {}) as Record<string, unknown>;
  settings.crm_segments = segments;

  await supabase
    .from('agencies')
    .update({ settings })
    .eq('id', agencyId);
}
