/**
 * Kyra CRM — CSV Export
 */

import { createServiceClient } from '@/lib/supabase/server';

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportContactsCsv(agencyId: string): Promise<string> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from('crm_contacts')
    .select('*, company:crm_companies(name)')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(10000);

  const headers = [
    'First Name', 'Last Name', 'Email', 'Phone', 'Title', 'Company',
    'Stage', 'Score', 'Score Label', 'Source', 'Tags',
    'AI Summary', 'AI Next Action',
    'Last Contacted', 'Last Activity', 'Created',
  ];

  const rows = (data || []).map((c: Record<string, unknown>) => {
    const company = c.company as Record<string, unknown> | null;
    return [
      c.first_name, c.last_name, c.email, c.phone, c.title,
      company?.name || '',
      c.stage, c.score, c.score_label, c.source,
      ((c.tags as string[]) || []).join('; '),
      c.ai_summary, c.ai_next_action,
      c.last_contacted_at, c.last_activity_at, c.created_at,
    ].map(escapeCsv).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export async function exportDealsCsv(agencyId: string): Promise<string> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from('crm_deals')
    .select('*, contact:crm_contacts(first_name, last_name, email), company:crm_companies(name)')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(10000);

  const headers = [
    'Name', 'Value', 'Currency', 'Stage', 'Probability',
    'Close Date', 'Contact', 'Contact Email', 'Company',
    'Source', 'Notes', 'Created',
  ];

  const rows = (data || []).map((d: Record<string, unknown>) => {
    const contact = d.contact as Record<string, unknown> | null;
    const company = d.company as Record<string, unknown> | null;
    const contactName = contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : '';
    return [
      d.name, d.value, d.currency, d.stage, d.probability,
      d.close_date, contactName, contact?.email || '',
      company?.name || '',
      d.source, d.notes, d.created_at,
    ].map(escapeCsv).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
