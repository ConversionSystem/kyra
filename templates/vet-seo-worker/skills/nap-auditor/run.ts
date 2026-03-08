/**
 * NAP Auditor — Executable skill for the Vet SEO Worker
 *
 * Scrapes 15 veterinary directories and compares Name, Address, Phone
 * data against the clinic's master record. Flags inconsistencies.
 */

import directoriesConfig from '../../config/vet-directories.json';

interface MasterNAP {
  name: string;
  address: string;
  phone: string;
  website: string;
}

interface DirectoryResult {
  directory: string;
  status: 'match' | 'mismatch' | 'not_found' | 'error' | 'blocked';
  found_data: Partial<MasterNAP> | null;
  issues: string[];
  last_checked: string;
  listing_url?: string; // actual URL of the business listing page (not the search URL)
}

interface NAPAuditReport {
  audit_date: string;
  clinic: string;
  master_nap: MasterNAP;
  results: DirectoryResult[];
  summary: {
    total_directories: number;
    consistent: number;
    mismatches: number;
    not_found: number;
    errors: number;
  };
  action_items: string[];
}

// ── Normalization Helpers ──────────────────────────────────────────────────

const STREET_ABBREVIATIONS: Record<string, string> = {
  street: 'st', avenue: 'ave', drive: 'dr', boulevard: 'blvd',
  lane: 'ln', road: 'rd', court: 'ct', place: 'pl', circle: 'cir',
  highway: 'hwy', parkway: 'pkwy', suite: 'ste', apartment: 'apt',
};

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10); // Last 10 digits
}

function normalizeAddress(address: string): string {
  let norm = address.toLowerCase().trim();
  // Replace common abbreviations
  for (const [full, abbr] of Object.entries(STREET_ABBREVIATIONS)) {
    norm = norm.replace(new RegExp(`\\b${full}\\b`, 'g'), abbr);
    norm = norm.replace(new RegExp(`\\b${abbr}\\.`, 'g'), abbr);
  }
  // Remove punctuation and extra spaces
  norm = norm.replace(/[.,#]/g, '').replace(/\s+/g, ' ');
  return norm;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(llc|inc|dba|corp|ltd|pllc)\b/gi, '')
    .replace(/[.,'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeWebsite(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

// ── Comparison Functions ──────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function compareName(master: string, found: string): { match: boolean; issue: string | null } {
  const normMaster = normalizeName(master);
  const normFound = normalizeName(found);

  if (normMaster === normFound) return { match: true, issue: null };

  // Handle common vet naming variations
  const vetVariations = [
    [/\bveterinary\b/, 'vet'],
    [/\bvet\b/, 'veterinary'],
    [/\bclinic\b/, 'hospital'],
    [/\bhospital\b/, 'clinic'],
    [/\banimal\b/, 'pet'],
  ] as const;

  let expandedMaster = normMaster;
  for (const [pattern, replacement] of vetVariations) {
    expandedMaster = expandedMaster.replace(pattern, replacement);
    if (expandedMaster === normFound) return { match: true, issue: null };
    expandedMaster = normMaster; // reset
  }

  // Fuzzy match
  if (levenshtein(normMaster, normFound) <= 3) return { match: true, issue: null };

  return { match: false, issue: `Name: '${found}' vs '${master}'` };
}

function compareAddress(master: string, found: string): { match: boolean; issue: string | null } {
  const normMaster = normalizeAddress(master);
  const normFound = normalizeAddress(found);

  if (normMaster === normFound) return { match: true, issue: null };

  // Extract street number and name for comparison
  const masterParts = normMaster.match(/^(\d+)\s+(.+?)(?:,|$)/);
  const foundParts = normFound.match(/^(\d+)\s+(.+?)(?:,|$)/);

  if (masterParts && foundParts) {
    if (masterParts[1] === foundParts[1] && masterParts[2] === foundParts[2]) {
      return { match: true, issue: null };
    }
  }

  // Check ZIP code
  const masterZip = normMaster.match(/\b(\d{5})\b/);
  const foundZip = normFound.match(/\b(\d{5})\b/);
  if (masterZip && foundZip && masterZip[1] !== foundZip[1]) {
    return { match: false, issue: `Address ZIP: '${foundZip[1]}' vs '${masterZip[1]}'` };
  }

  return { match: false, issue: `Address: '${found}' vs '${master}'` };
}

function comparePhone(master: string, found: string): { match: boolean; issue: string | null } {
  const normMaster = normalizePhone(master);
  const normFound = normalizePhone(found);

  if (normMaster === normFound) return { match: true, issue: null };
  return { match: false, issue: `Phone: '${found}' vs '${master}'` };
}

function compareWebsite(master: string, found: string): { match: boolean; issue: string | null } {
  const normMaster = normalizeWebsite(master);
  const normFound = normalizeWebsite(found);

  if (normMaster === normFound) return { match: true, issue: null };
  // Check if one is a subdomain/path of the other
  if (normFound.includes(normMaster) || normMaster.includes(normFound)) {
    return { match: true, issue: null };
  }
  return { match: false, issue: `Website: '${found}' vs '${master}'` };
}

// ── Scraping ──────────────────────────────────────────────────────────────

interface FirecrawlResult {
  content: string;
  url: string;
}

/**
 * Scrape a directory search page using Firecrawl API
 */
async function scrapeDirectory(
  url: string,
  firecrawlKey: string,
): Promise<FirecrawlResult | null> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${firecrawlKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        waitFor: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error('rate_limited');
      if (response.status === 403) throw new Error('blocked');
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.data?.markdown || '',
      url: data.data?.metadata?.url || url,
    };
  } catch (err) {
    throw err;
  }
}

/**
 * Extract NAP data from scraped content using pattern matching
 */
function extractNAPFromContent(
  content: string,
  clinicName: string,
): Partial<MasterNAP> | null {
  const lowerContent = content.toLowerCase();
  const lowerClinic = clinicName.toLowerCase();

  // Check if clinic is mentioned at all
  if (!lowerContent.includes(lowerClinic) &&
      levenshtein(lowerClinic, lowerContent.slice(0, 200)) > 10) {
    return null;
  }

  const result: Partial<MasterNAP> = {};

  // Extract name — look for the clinic name in headers or bold text
  const namePattern = new RegExp(
    `(?:^|\\n|\\*\\*|##?\\s*)(${clinicName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*?)(?:\\n|\\*\\*|$)`,
    'im',
  );
  const nameMatch = content.match(namePattern);
  if (nameMatch) result.name = nameMatch[1].trim();

  // Extract phone — US phone pattern
  const phonePattern = /\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/;
  const phoneMatch = content.match(phonePattern);
  if (phoneMatch) result.phone = `(${phoneMatch[1]}) ${phoneMatch[2]}-${phoneMatch[3]}`;

  // Extract address — street number + street name pattern
  const addressPattern = /(\d{1,5}\s+[A-Z][a-zA-Z\s]+(?:St|Street|Ave|Avenue|Dr|Drive|Blvd|Rd|Road|Ln|Lane|Way|Ct|Court|Pl|Place)[.,]?\s*(?:(?:Ste|Suite|Apt|Unit)\s*[#]?\d+[.,]?\s*)?[A-Z][a-z]+[.,]?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/;
  const addressMatch = content.match(addressPattern);
  if (addressMatch) result.address = addressMatch[1].trim();

  // Extract website
  const urlPattern = /https?:\/\/(?:www\.)?[a-zA-Z0-9.-]+\.[a-z]{2,}/g;
  const urls = content.match(urlPattern) || [];
  const clinicUrl = urls.find(
    (u) => !u.includes('yelp.com') && !u.includes('facebook.com') &&
           !u.includes('google.com') && !u.includes('yellowpages.com'),
  );
  if (clinicUrl) result.website = clinicUrl;

  return Object.keys(result).length > 0 ? result : null;
}

// ── Main Execution ──────────────────────────────────────────────────────────

export async function runNAPAudit(
  masterNAP: MasterNAP,
  clinicCity: string,
  firecrawlKey: string,
): Promise<NAPAuditReport> {
  const directories = directoriesConfig.directories;
  const results: DirectoryResult[] = [];
  const today = new Date().toISOString();
  const actionItems: string[] = [];

  for (const dir of directories) {
    const searchUrl = dir.url_pattern
      .replace(/\{\{CLINIC_NAME\}\}/g, encodeURIComponent(masterNAP.name))
      .replace(/\{\{CITY\}\}/g, encodeURIComponent(clinicCity));

    let result: DirectoryResult;

    try {
      const scraped = await scrapeDirectory(searchUrl, firecrawlKey);
      if (!scraped || !scraped.content) {
        result = {
          directory: dir.name,
          status: 'not_found',
          found_data: null,
          issues: [],
          last_checked: today,
        };
        actionItems.push(`Claim ${dir.name} listing — clinic not found`);
      } else {
        const foundData = extractNAPFromContent(scraped.content, masterNAP.name);

        if (!foundData) {
          result = {
            directory: dir.name,
            status: 'not_found',
            found_data: null,
            issues: [],
            last_checked: today,
          };
          actionItems.push(`Claim ${dir.name} listing — clinic not found in search results`);
        } else {
          const issues: string[] = [];

          if (foundData.name) {
            const nameCheck = compareName(masterNAP.name, foundData.name);
            if (!nameCheck.match && nameCheck.issue) issues.push(nameCheck.issue);
          }
          if (foundData.address) {
            const addrCheck = compareAddress(masterNAP.address, foundData.address);
            if (!addrCheck.match && addrCheck.issue) issues.push(addrCheck.issue);
          }
          if (foundData.phone) {
            const phoneCheck = comparePhone(masterNAP.phone, foundData.phone);
            if (!phoneCheck.match && phoneCheck.issue) issues.push(phoneCheck.issue);
          }
          if (foundData.website) {
            const webCheck = compareWebsite(masterNAP.website, foundData.website);
            if (!webCheck.match && webCheck.issue) issues.push(webCheck.issue);
          }

          const status = issues.length > 0 ? 'mismatch' : 'match';
          result = {
            directory: dir.name,
            status,
            found_data: foundData,
            issues,
            last_checked: today,
            // Store the actual listing URL (scraped.url is the final URL after redirects)
            listing_url: scraped.url !== searchUrl ? scraped.url : undefined,
          };

          if (status === 'mismatch') {
            actionItems.push(
              `Update ${dir.name} listing — ${issues.join('; ')}`,
            );
          }
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      result = {
        directory: dir.name,
        status: errMsg === 'blocked' ? 'blocked' : 'error',
        found_data: null,
        issues: [errMsg === 'blocked' ? 'Directory blocked scraping — manual check needed' : `Scrape error: ${errMsg}`],
        last_checked: today,
      };

      if (errMsg === 'blocked') {
        actionItems.push(`${dir.name} — blocked scraping, check manually`);
      }
    }

    results.push(result);

    // Rate limit: 500ms between scrapes
    await new Promise((r) => setTimeout(r, 500));
  }

  const summary = {
    total_directories: results.length,
    consistent: results.filter((r) => r.status === 'match').length,
    mismatches: results.filter((r) => r.status === 'mismatch').length,
    not_found: results.filter((r) => r.status === 'not_found').length,
    errors: results.filter((r) => r.status === 'error' || r.status === 'blocked').length,
  };

  return {
    audit_date: today.split('T')[0],
    clinic: masterNAP.name,
    master_nap: masterNAP,
    results,
    summary,
    action_items: actionItems,
  };
}
