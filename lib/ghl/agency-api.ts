/**
 * GHL Agency-level API client.
 * Used to create sub-accounts (locations) under the agency.
 *
 * Token priority:
 *   1. Agency OAuth token from DB (ghl_access_token on agencies table)
 *   2. GHL_AGENCY_API_KEY env var (fallback for backward compatibility)
 */

import { getAgencyGHLToken } from './agency-oauth';

const GHL_AGENCY_API = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

interface CreateSubAccountParams {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  settings?: {
    allowDuplicateContact?: boolean;
    allowDuplicateOpportunity?: boolean;
    allowFacebookNameMerge?: boolean;
  };
}

interface SubAccountResult {
  id: string;
  name: string;
  apiKey?: string;
  settings?: Record<string, unknown>;
}

export async function createGhlSubAccount(
  params: CreateSubAccountParams,
  agencyId?: string,
): Promise<SubAccountResult> {
  // ── Resolve API token ────────────────────────────────────────────────────
  let apiToken: string | null = null;
  let companyId: string | null = null;

  // Priority 1: agency OAuth token from DB
  if (agencyId) {
    apiToken = await getAgencyGHLToken(agencyId);

    if (apiToken) {
      // Also fetch the company ID stored during OAuth
      const { createServiceClientWithoutCookies } = await import('@/lib/supabase/server');
      const db = createServiceClientWithoutCookies();
      const { data } = await db
        .from('agencies')
        .select('ghl_company_id')
        .eq('id', agencyId)
        .single();
      companyId = data?.ghl_company_id ?? null;
    }
  }

  // Priority 2: env var fallback
  if (!apiToken) {
    apiToken = process.env.GHL_AGENCY_API_KEY ?? null;
  }

  if (!companyId) {
    companyId = process.env.GHL_COMPANY_ID ?? null;
  }

  if (!apiToken) {
    throw new Error(
      'GHL is not connected at the agency level. ' +
      'Go to Settings → Integrations → GoHighLevel → Connect GHL Agency Account ' +
      'to enable automatic sub-account creation.',
    );
  }

  if (!companyId) {
    throw new Error(
      'GHL Company ID is not configured. ' +
      'Reconnect your GHL agency account from Settings → Integrations.',
    );
  }

  // ── Create sub-account ───────────────────────────────────────────────────
  const res = await fetch(`${GHL_AGENCY_API}/locations/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      'Version': API_VERSION,
    },
    body: JSON.stringify({
      companyId,
      name: params.name,
      email: params.email,
      phone: params.phone || undefined,
      address: params.address || undefined,
      city: params.city || undefined,
      state: params.state || undefined,
      country: params.country || 'US',
      postalCode: params.postalCode || undefined,
      timezone: params.timezone || 'America/New_York',
      settings: params.settings || {
        allowDuplicateContact: false,
        allowDuplicateOpportunity: false,
        allowFacebookNameMerge: true,
      },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');

    if (res.status === 401) {
      throw new Error(
        'GHL token is invalid or expired. ' +
        'Reconnect your GHL agency account from Settings → Integrations.',
      );
    }

    if (res.status === 403) {
      throw new Error(
        'GHL token does not have permission to create sub-accounts. ' +
        'Reconnect your GHL agency account — the new connection includes the required scopes.',
      );
    }

    if (res.status === 422) {
      let detail = body;
      try {
        const parsed = JSON.parse(body);
        detail = JSON.stringify(parsed.message || parsed);
      } catch { /* use raw body */ }
      throw new Error(`GHL validation error: ${detail}`);
    }

    throw new Error(
      `GHL API error (${res.status}). Please try again or use the "Connect with API Token" option instead.`,
    );
  }

  const data = await res.json();
  const location = data.location || data;

  return {
    id: location.id,
    name: location.name,
    apiKey: location.apiKey,
    settings: location.settings,
  };
}

export async function getGhlSubAccount(locationId: string, agencyId?: string): Promise<SubAccountResult | null> {
  let apiToken: string | null = null;

  if (agencyId) {
    apiToken = await getAgencyGHLToken(agencyId);
  }
  if (!apiToken) {
    apiToken = process.env.GHL_AGENCY_API_KEY ?? null;
  }
  if (!apiToken) return null;

  const res = await fetch(`${GHL_AGENCY_API}/locations/${locationId}`, {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Version': API_VERSION,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const location = data.location || data;
  return { id: location.id, name: location.name };
}
