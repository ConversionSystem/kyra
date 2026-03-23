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

  const res = await fetch(`${GHL_AGENCY_API}/locations/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': API_VERSION,
    },
    body: JSON.stringify({
      companyId: process.env.GHL_COMPANY_ID || undefined,
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
    throw new Error(`GHL create sub-account failed: ${res.status} ${body}`);
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
