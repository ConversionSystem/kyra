/**
 * Outscraper Lead Source — Real businesses from Google Maps
 *
 * Calls the Outscraper API to search Google Maps in real-time.
 * Returns actual businesses with verified phone, email, website, rating.
 *
 * Pricing: $3/1,000 leads (first 500/mo free)
 * A 25-lead campaign costs $0.075.
 *
 * API docs: https://app.outscraper.com/api-docs#tag/Google-Maps
 * Endpoint: GET https://api.app.outscraper.com/maps/search-v2
 */

import type { RawLead, LeadSourceResult, StreamCallback } from './types';

const OUTSCRAPER_API = 'https://api.app.outscraper.com/maps/search-v2';

/**
 * Search Google Maps for real businesses via Outscraper.
 *
 * @param query    - What to search, e.g. "cannabis dispensaries"
 * @param location - Where, e.g. "Los Angeles, CA"
 * @param limit    - Max results (default 25)
 * @param apiKey   - Outscraper API key (from env or agency settings)
 * @param onLead   - Optional SSE callback for real-time UI updates
 */
export async function searchOutscraper(
  query: string,
  location: string,
  limit: number = 25,
  apiKey: string,
  onLead?: StreamCallback,
): Promise<LeadSourceResult> {
  if (!apiKey) {
    return {
      source: 'google_maps',
      leads: [],
      total: 0,
      warning: 'Outscraper API key not configured. Go to Pipeline Settings to add your key, or use AI Discovery.',
    };
  }

  // Build the search query — Outscraper expects "what + where" in one string
  const searchQuery = `${query} ${location}`.trim();

  const params = new URLSearchParams({
    query: searchQuery,
    limit: String(Math.min(limit * 2, 100)), // Request 2x to account for filtering
    async: 'false',
    language: 'en',
    region: 'us',
  });

  try {
    onLead?.('step', { label: `Searching Google Maps for "${query}" in ${location}...`, status: 'running' });

    const res = await fetch(`${OUTSCRAPER_API}?${params}`, {
      headers: { 'X-API-KEY': apiKey },
      signal: AbortSignal.timeout(60_000), // Outscraper can take up to 30s
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[outscraper] API error: ${res.status} ${errText}`);

      if (res.status === 401 || res.status === 403) {
        return {
          source: 'google_maps',
          leads: [],
          total: 0,
          warning: 'Outscraper API key is invalid or expired. Check your key in Pipeline Settings.',
        };
      }

      return {
        source: 'google_maps',
        leads: [],
        total: 0,
        warning: `Google Maps search failed (HTTP ${res.status}). Try AI Discovery as a fallback.`,
      };
    }

    const data = await res.json();

    // Outscraper returns { data: [[...places]] } for search-v2
    // The outer array is per-query, inner array is results
    const rawPlaces: Record<string, unknown>[] = Array.isArray(data?.data?.[0])
      ? data.data[0]
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];

    const leads: RawLead[] = [];

    for (const place of rawPlaces) {
      if (leads.length >= limit) break;

      const name = String(place.name || '').trim();
      if (!name) continue;

      // Skip results that are just map listings without useful data
      const website = cleanUrl(place.site as string || place.website as string || '');
      const phone = cleanPhone(place.phone as string || place.phone_1 as string || '');
      const email = cleanEmail(place.email_1 as string || place.email_2 as string || '');

      // Must have at least a website OR phone OR email to be useful
      if (!website && !phone && !email) continue;

      const lead: RawLead = {
        company: name,
        website,
        phone,
        email,
        industry: String(place.category || place.type || '').trim() || null,
        location: buildLocation(place),
        full_address: String(place.full_address || place.address || '').trim() || null,
        company_size: null, // Google Maps doesn't provide this
        rating: typeof place.rating === 'number' ? place.rating : null,
        reviews_count: typeof place.reviews === 'number' ? place.reviews : null,
        description: String(place.description || '').trim() || null,
        social_links: extractSocialLinks(place),
      };

      leads.push(lead);

      // Stream each lead to the UI
      onLead?.('lead_found', {
        current: leads.length,
        total: limit,
        company: lead.company,
        website: lead.website,
        location: lead.location,
        rating: lead.rating,
        phone: lead.phone ? '✓' : null,
        email: lead.email ? '✓' : null,
      });
    }

    const costEstimate = leads.length <= 500
      ? 'Free (within monthly free tier)'
      : `~$${(leads.length * 0.003).toFixed(2)}`;

    return {
      source: 'google_maps',
      leads,
      total: leads.length,
      cost_estimate: costEstimate,
    };
  } catch (err) {
    console.error('[outscraper] Search error:', err);
    return {
      source: 'google_maps',
      leads: [],
      total: 0,
      warning: `Google Maps search failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanUrl(raw: string): string | null {
  if (!raw || raw === 'None' || raw === 'null') return null;
  const url = raw.trim();
  if (!url) return null;
  // Remove trailing slashes for consistency
  return url.replace(/\/+$/, '') || null;
}

function cleanPhone(raw: string): string | null {
  if (!raw || raw === 'None' || raw === 'null') return null;
  const phone = raw.trim().replace(/[^\d+\-() ]/g, '');
  return phone.length >= 7 ? phone : null;
}

function cleanEmail(raw: string): string | null {
  if (!raw || raw === 'None' || raw === 'null') return null;
  const email = raw.trim().toLowerCase();
  if (!email.includes('@') || !email.includes('.')) return null;
  // Filter out generic/noreply
  if (/^(noreply|no-reply|info@|support@|admin@|webmaster@)/.test(email)) return null;
  return email;
}

function buildLocation(place: Record<string, unknown>): string | null {
  const parts: string[] = [];
  if (place.city) parts.push(String(place.city));
  if (place.state) parts.push(String(place.state));
  if (place.country && String(place.country) !== 'United States of America') {
    parts.push(String(place.country));
  } else if (place.state_code) {
    // Use state code for US
    if (parts.length > 0 && place.city) {
      parts.pop(); // Remove full state name
      parts.push(String(place.state_code)); // Use abbreviation
    }
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

function extractSocialLinks(place: Record<string, unknown>): Record<string, string> | null {
  const links: Record<string, string> = {};
  const socialFields = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'];

  for (const field of socialFields) {
    const val = place[field] || place[field.charAt(0).toUpperCase() + field.slice(1)];
    if (val && typeof val === 'string' && val.startsWith('http')) {
      links[field] = val;
    }
  }

  return Object.keys(links).length > 0 ? links : null;
}
