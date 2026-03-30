/**
 * GHL Agency-level API client.
 * Used to create sub-accounts (locations) under Angel's agency.
 */

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

export async function createGhlSubAccount(params: CreateSubAccountParams): Promise<SubAccountResult> {
  const apiKey = process.env.GHL_AGENCY_API_KEY;
  if (!apiKey) throw new Error('GHL_AGENCY_API_KEY not configured');

  // Private Integration Tokens (pit-...) are sub-account scoped and cannot create locations.
  // Sub-account creation requires the Agency API Key from GHL → Settings → API Keys.
  if (apiKey.startsWith('pit-')) {
    throw new Error(
      'GHL_AGENCY_API_KEY is set to a Private Integration Token (pit-…), which cannot create sub-accounts. ' +
      'Set GHL_AGENCY_API_KEY to your Agency API Key instead — found in GHL → Agency View → Settings → API Keys. ' +
      'The Agency API Key is a different credential from Private Integration tokens.'
    );
  }

  const companyId = process.env.GHL_COMPANY_ID;
  if (!companyId) {
    throw new Error(
      'GHL_COMPANY_ID is not configured. Sub-account creation requires a Company ID. ' +
      'Set GHL_COMPANY_ID in your environment variables.'
    );
  }

  const res = await fetch(`${GHL_AGENCY_API}/locations/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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
        'GHL Agency API key is invalid or expired. ' +
        'Go to GHL → Settings → API Keys and regenerate the Agency API key.'
      );
    }

    if (res.status === 403) {
      if (body.includes('Forbidden resource')) {
        throw new Error(
          'GHL Agency API key does not have permission to create sub-accounts. ' +
          'Go to GHL → Settings → API Keys → regenerate the Agency API key, or ' +
          'check that your GHL plan includes sub-account management.'
        );
      }
      throw new Error(
        'GHL permission denied (403). Your Agency API key may need to be regenerated or your plan may not support sub-account creation.'
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
      `GHL API error (${res.status}). Please try again or use the "Connect with API Token" option instead.`
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

export async function getGhlSubAccount(locationId: string): Promise<SubAccountResult | null> {
  const apiKey = process.env.GHL_AGENCY_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(`${GHL_AGENCY_API}/locations/${locationId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Version': API_VERSION,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const location = data.location || data;
  return { id: location.id, name: location.name };
}
