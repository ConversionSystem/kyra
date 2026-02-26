/**
 * CSV Upload Lead Source — Agency provides their own lead list
 *
 * Agencies can upload a CSV/paste data with their own leads.
 * Leads skip the "find" step and go straight to the pipeline
 * for enrichment, outreach writing, and AI closing.
 *
 * Expected columns: company, website, phone, email, industry, location, full_name, title
 * Minimum required: company (everything else is optional)
 */

import type { RawLead, CsvLeadRow, LeadSourceResult, StreamCallback } from './types';

/**
 * Parse CSV text into lead rows.
 * Handles: comma-separated, tab-separated, and quoted fields.
 */
export function parseCsv(csvText: string): CsvLeadRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return []; // Need header + at least one row

  // Parse header
  const header = parseRow(lines[0]).map(h => h.toLowerCase().trim().replace(/[^a-z_]/g, ''));

  // Map common column name variations
  const colMap: Record<string, string> = {};
  for (let i = 0; i < header.length; i++) {
    const h = header[i];
    if (['company', 'business', 'company_name', 'business_name', 'name'].includes(h)) colMap.company = String(i);
    else if (['website', 'url', 'site', 'web'].includes(h)) colMap.website = String(i);
    else if (['phone', 'telephone', 'tel', 'phone_number'].includes(h)) colMap.phone = String(i);
    else if (['email', 'email_address', 'mail'].includes(h)) colMap.email = String(i);
    else if (['industry', 'category', 'type', 'vertical'].includes(h)) colMap.industry = String(i);
    else if (['location', 'city', 'address', 'area'].includes(h)) colMap.location = String(i);
    else if (['full_name', 'contact', 'contact_name', 'person'].includes(h)) colMap.full_name = String(i);
    else if (['title', 'role', 'job_title', 'position'].includes(h)) colMap.title = String(i);
  }

  if (!colMap.company) {
    // Try first column as company if no match
    colMap.company = '0';
  }

  const rows: CsvLeadRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    if (cols.length === 0) continue;

    const company = cols[Number(colMap.company)]?.trim();
    if (!company) continue;

    rows.push({
      company,
      website: colMap.website ? cols[Number(colMap.website)]?.trim() || undefined : undefined,
      phone: colMap.phone ? cols[Number(colMap.phone)]?.trim() || undefined : undefined,
      email: colMap.email ? cols[Number(colMap.email)]?.trim() || undefined : undefined,
      industry: colMap.industry ? cols[Number(colMap.industry)]?.trim() || undefined : undefined,
      location: colMap.location ? cols[Number(colMap.location)]?.trim() || undefined : undefined,
      full_name: colMap.full_name ? cols[Number(colMap.full_name)]?.trim() || undefined : undefined,
      title: colMap.title ? cols[Number(colMap.title)]?.trim() || undefined : undefined,
    });
  }

  return rows;
}

/**
 * Convert parsed CSV rows into RawLead format for the pipeline.
 */
export function csvToLeads(
  rows: CsvLeadRow[],
  defaults: { industry?: string; location?: string } = {},
  onLead?: StreamCallback,
): LeadSourceResult {
  const leads: RawLead[] = [];

  for (const row of rows) {
    const lead: RawLead = {
      company: row.company,
      website: row.website || null,
      phone: row.phone || null,
      email: row.email || null,
      industry: row.industry || defaults.industry || null,
      location: row.location || defaults.location || null,
      full_address: null,
      company_size: null,
      rating: null,
      reviews_count: null,
      description: null,
      social_links: null,
    };

    leads.push(lead);

    onLead?.('lead_found', {
      current: leads.length,
      total: rows.length,
      company: lead.company,
      website: lead.website,
      location: lead.location,
      phone: lead.phone ? '✓' : null,
      email: lead.email ? '✓' : null,
    });
  }

  return {
    source: 'csv_upload',
    leads,
    total: leads.length,
    cost_estimate: 'Free',
  };
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',' || ch === '\t') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }

  result.push(current);
  return result;
}
