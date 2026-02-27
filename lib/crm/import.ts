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

// ─── HubSpot Import ─────────────────────────────────────────────────────────

export async function importFromHubSpot(agencyId: string, apiKey: string): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: 0, details: [] };

  if (!apiKey) {
    return { ...result, errors: 1, details: [{ name: 'HubSpot', status: 'error', reason: 'No API key provided' }] };
  }

  // Fetch HubSpot contacts (paginated)
  let contacts: Array<Record<string, unknown>> = [];
  let after: string | undefined;

  try {
    do {
      const url = new URL('https://api.hubapi.com/crm/v3/objects/contacts');
      url.searchParams.set('limit', '100');
      url.searchParams.set('properties', 'firstname,lastname,email,phone,company,jobtitle,hs_lead_status');
      if (after) url.searchParams.set('after', after);

      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      if (!res.ok) {
        const err = await res.text();
        return { ...result, errors: 1, details: [{ name: 'HubSpot', status: 'error', reason: `API error: ${res.status} ${err.slice(0, 200)}` }] };
      }

      const data = await res.json() as {
        results: Array<{ properties: Record<string, string>; id: string }>;
        paging?: { next?: { after?: string } };
      };
      contacts = contacts.concat(data.results || []);
      after = data.paging?.next?.after;

      // Safety cap
      if (contacts.length >= 1000) break;
    } while (after);
  } catch (err) {
    return { ...result, errors: 1, details: [{ name: 'HubSpot', status: 'error', reason: String(err) }] };
  }

  // Also fetch companies for association
  const companyMap = new Map<string, string>();
  try {
    const compRes = await fetch('https://api.hubapi.com/crm/v3/objects/companies?limit=100&properties=name', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (compRes.ok) {
      const compData = await compRes.json() as { results: Array<{ id: string; properties: { name: string } }> };
      for (const c of (compData.results || [])) {
        companyMap.set(c.id, c.properties.name);
      }
    }
  } catch {
    // Non-fatal — continue without company names
  }

  // Import each contact
  for (const hsContact of contacts) {
    try {
      const props = (hsContact as { properties: Record<string, string> }).properties;
      const hsId = (hsContact as { id: string }).id;
      const name = `${props.firstname || ''} ${props.lastname || ''}`.trim();

      const { contact, existing } = await createContact(agencyId, {
        first_name: props.firstname || undefined,
        last_name: props.lastname || undefined,
        email: props.email || undefined,
        phone: props.phone || undefined,
        title: props.jobtitle || undefined,
        company_name: props.company || undefined,
        source: 'hubspot_import',
        source_id: hsId,
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

  // Also import deals
  try {
    const dealsRes = await fetch('https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=dealname,amount,dealstage,closedate,pipeline', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (dealsRes.ok) {
      const { createDeal } = await import('./deals');
      const dealsData = await dealsRes.json() as { results: Array<{ properties: Record<string, string>; id: string }> };
      for (const hsDeal of (dealsData.results || [])) {
        const dp = hsDeal.properties;
        try {
          await createDeal(agencyId, {
            name: dp.dealname || `HubSpot Deal ${hsDeal.id}`,
            value: Number(dp.amount) || 0,
            stage: mapHubSpotStage(dp.dealstage),
            source: 'hubspot_import',
            source_id: hsDeal.id,
          });
        } catch {
          // Skip duplicate deals
        }
      }
    }
  } catch {
    // Non-fatal
  }

  await logActivity(agencyId, {
    type: 'system',
    subject: `HubSpot Import: ${result.imported} contacts`,
    body: `Imported ${result.imported} contacts from HubSpot. ${result.skipped} duplicates skipped. ${result.errors} errors.`,
    actor: 'system',
    actor_name: 'HubSpot Import',
    needs_attention: result.errors > 0,
    attention_type: result.errors > 0 ? 'review' : undefined,
  });

  return result;
}

function mapHubSpotStage(hsStage: string): string {
  const map: Record<string, string> = {
    'appointmentscheduled': 'prospect',
    'qualifiedtobuy': 'qualified',
    'presentationscheduled': 'proposal',
    'decisionmakerboughtin': 'negotiation',
    'contractsent': 'negotiation',
    'closedwon': 'won',
    'closedlost': 'lost',
  };
  return map[hsStage?.toLowerCase()] || 'prospect';
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
