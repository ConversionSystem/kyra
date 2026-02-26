/**
 * CRM Import — GHL contacts + CSV upload
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { createContact } from './contacts';
import { findOrCreateCompany } from './companies';
import { logActivity } from './activities';

interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
  details: Array<{ name: string; status: 'imported' | 'skipped' | 'error'; reason?: string }>;
}

// ─── GHL Import ──────────────────────────────────────────────────────────────

export async function importFromGHL(agencyId: string): Promise<ImportResult> {
  const svc = createServiceClientWithoutCookies();
  const result: ImportResult = { imported: 0, skipped: 0, errors: 0, details: [] };

  // Get GHL integration
  const { data: integration } = await svc
    .from('pipeline_integrations')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('provider', 'ghl')
    .eq('enabled', true)
    .limit(1)
    .single();

  if (!integration) {
    return { ...result, errors: 1, details: [{ name: 'GHL', status: 'error', reason: 'No GHL integration connected' }] };
  }

  const token = integration.access_token;
  const locationId = integration.config?.location_id;

  if (!token) {
    return { ...result, errors: 1, details: [{ name: 'GHL', status: 'error', reason: 'GHL token missing' }] };
  }

  // Fetch GHL contacts (paginated)
  let contacts: Array<Record<string, unknown>> = [];
  let nextPageUrl: string | null = `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=100`;

  while (nextPageUrl) {
    const fetchRes: Response = await fetch(nextPageUrl, {
      headers: { 'Authorization': `Bearer ${token}`, 'Version': '2021-04-15' },
    });
    if (!fetchRes.ok) break;

    const fetchData: Record<string, unknown> = await fetchRes.json();
    contacts = contacts.concat((fetchData.contacts as Array<Record<string, unknown>>) || []);
    nextPageUrl = ((fetchData.meta as Record<string, unknown>)?.nextPageUrl as string) || null;

    // Safety cap at 1000 contacts per import
    if (contacts.length >= 1000) break;
  }

  // Import each contact
  for (const ghlContact of contacts) {
    try {
      const name = `${ghlContact.firstName || ''} ${ghlContact.lastName || ''}`.trim();
      const { contact, existing } = await createContact(agencyId, {
        first_name: (ghlContact.firstName as string) || undefined,
        last_name: (ghlContact.lastName as string) || undefined,
        email: (ghlContact.email as string) || undefined,
        phone: (ghlContact.phone as string) || undefined,
        title: undefined,
        company_name: (ghlContact.companyName as string) || undefined,
        source: 'ghl_import',
        source_id: ghlContact.id as string,
        tags: (ghlContact.tags as string[]) || [],
      });

      if (existing) {
        result.skipped++;
        result.details.push({ name: name || 'Unknown', status: 'skipped', reason: 'Already exists' });
      } else if (contact) {
        result.imported++;
        result.details.push({ name: name || 'Unknown', status: 'imported' });
      } else {
        result.errors++;
        result.details.push({ name: name || 'Unknown', status: 'error', reason: 'Create failed' });
      }
    } catch (err) {
      result.errors++;
      result.details.push({ name: 'Unknown', status: 'error', reason: err instanceof Error ? err.message : 'Unknown' });
    }
  }

  // Log import activity
  await logActivity(agencyId, {
    type: 'system',
    subject: `GHL Import: ${result.imported} contacts`,
    body: `Imported ${result.imported} contacts from GoHighLevel. ${result.skipped} duplicates skipped. ${result.errors} errors.`,
    actor: 'system',
    actor_name: 'GHL Import',
    needs_attention: result.errors > 0,
    attention_type: result.errors > 0 ? 'review' : undefined,
  });

  return result;
}

// ─── CSV Import ──────────────────────────────────────────────────────────────

interface CsvRow {
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  company_name?: string;
  title?: string;
  tags?: string;
  [key: string]: string | undefined;
}

export async function importFromCsv(agencyId: string, rows: CsvRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: 0, details: [] };

  for (const row of rows) {
    try {
      // Parse name if full name provided
      let firstName = row.first_name;
      let lastName = row.last_name;
      if (!firstName && row.name) {
        const parts = row.name.split(' ');
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
      }

      const companyName = row.company || row.company_name;
      const tags = row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const name = `${firstName || ''} ${lastName || ''}`.trim();

      const { contact, existing } = await createContact(agencyId, {
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        email: row.email || undefined,
        phone: row.phone || undefined,
        title: row.title || undefined,
        company_name: companyName || undefined,
        source: 'csv_import',
        tags,
      });

      if (existing) {
        result.skipped++;
        result.details.push({ name: name || 'Unknown', status: 'skipped', reason: 'Duplicate' });
      } else if (contact) {
        result.imported++;
        result.details.push({ name: name || 'Unknown', status: 'imported' });
      } else {
        result.errors++;
        result.details.push({ name: name || 'Unknown', status: 'error' });
      }
    } catch (err) {
      result.errors++;
      result.details.push({ name: 'Row', status: 'error', reason: err instanceof Error ? err.message : 'Unknown' });
    }
  }

  // Log import activity
  await logActivity(agencyId, {
    type: 'system',
    subject: `CSV Import: ${result.imported} contacts`,
    body: `Imported ${result.imported} contacts from CSV. ${result.skipped} duplicates. ${result.errors} errors.`,
    actor: 'system',
    actor_name: 'CSV Import',
  });

  return result;
}
