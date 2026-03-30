// ============================================================================
// GHL Agency-Level OAuth helpers
//
// Used to connect the agency owner's GHL account at the company level.
// This grants Kyra the ability to CREATE new GHL sub-accounts (locations)
// on behalf of the agency.
//
// SEPARATE from lib/ghl/oauth.ts which handles per-client/location OAuth.
// ============================================================================

import { createHmac, timingSafeEqual } from 'crypto';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import type { GHLTokenResponse } from './types';

const GHL_AUTHORIZE_URL = 'https://marketplace.gohighlevel.com/oauth/chooselocation';
const GHL_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';

// Agency-level scopes — includes locations.write for sub-account creation
// plus all per-client scopes so the agency token can do everything
export const GHL_AGENCY_SCOPES = [
  'locations.write',
  'locations.readonly',
  'businesses.readonly',
  'businesses.write',
  'contacts.readonly',
  'contacts.write',
  'conversations.readonly',
  'conversations.write',
  'conversations/message.readonly',
  'conversations/message.write',
  'opportunities.readonly',
  'opportunities.write',
  'calendars.readonly',
  'calendars.write',
  'workflows.readonly',
].join(' ');

// ── State Param ──────────────────────────────────────────────────────────────

export interface GHLAgencyOAuthState {
  type: 'agency';           // distinguishes from per-client state
  agencyId: string;
  userId: string;
  ts: number;
}

export function encodeAgencyOAuthState(state: GHLAgencyOAuthState): string {
  const secret = getSigningSecret();
  const payload = JSON.stringify(state);
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

export function decodeAgencyOAuthState(raw: string): GHLAgencyOAuthState {
  const secret = getSigningSecret();
  const dotIndex = raw.lastIndexOf('.');
  if (dotIndex === -1) throw new Error('Invalid OAuth state format');

  const payloadB64 = raw.slice(0, dotIndex);
  const receivedSig = raw.slice(dotIndex + 1);
  const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
  const expectedSig = createHmac('sha256', secret).update(payloadStr).digest('base64url');

  const a = Buffer.from(receivedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid OAuth state signature');
  }

  const state = JSON.parse(payloadStr) as GHLAgencyOAuthState;
  if (state.type !== 'agency') throw new Error('Not an agency OAuth state');

  const MAX_AGE_MS = 10 * 60 * 1000;
  if (Date.now() - state.ts > MAX_AGE_MS) throw new Error('OAuth state expired');

  return state;
}

// ── URL Builder ──────────────────────────────────────────────────────────────

export function buildAgencyAuthorizationUrl(state: string): string {
  const clientId = process.env.GHL_CLIENT_ID;
  const redirectUri = process.env.GHL_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('Missing GHL_CLIENT_ID or GHL_REDIRECT_URI env vars');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    redirect_uri: redirectUri,
    client_id: clientId,
    scope: GHL_AGENCY_SCOPES,
    state,
  });

  return `${GHL_AUTHORIZE_URL}?${params.toString()}`;
}

// ── Token Exchange ────────────────────────────────────────────────────────────

export async function exchangeAgencyCodeForTokens(code: string): Promise<GHLTokenResponse> {
  const clientId = process.env.GHL_CLIENT_ID!;
  const clientSecret = process.env.GHL_CLIENT_SECRET!;
  const redirectUri = process.env.GHL_REDIRECT_URI!;

  const res = await fetch(GHL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GHL agency token exchange failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<GHLTokenResponse>;
}

// ── Token Refresh ─────────────────────────────────────────────────────────────

export async function refreshAgencyToken(
  agencyId: string,
  refreshToken: string,
): Promise<GHLTokenResponse> {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing GHL_CLIENT_ID or GHL_CLIENT_SECRET env vars');
  }

  const res = await fetch(GHL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GHL agency token refresh failed (${res.status}): ${text}`);
  }

  const tokens = (await res.json()) as GHLTokenResponse;

  // Persist refreshed tokens
  const db = createServiceClientWithoutCookies();
  await db
    .from('agencies')
    .update({
      ghl_access_token: tokens.access_token,
      ghl_refresh_token: tokens.refresh_token,
      ghl_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq('id', agencyId);

  return tokens;
}

// ── Token Getter (auto-refresh) ───────────────────────────────────────────────

export async function getAgencyGHLToken(agencyId: string): Promise<string | null> {
  const db = createServiceClientWithoutCookies();

  const { data: agency } = await db
    .from('agencies')
    .select('ghl_access_token, ghl_refresh_token, ghl_token_expires_at')
    .eq('id', agencyId)
    .single();

  if (!agency?.ghl_access_token) return null;

  // Check if expired (with 5-min buffer)
  const expiresAt = agency.ghl_token_expires_at
    ? new Date(agency.ghl_token_expires_at).getTime()
    : null;
  const isExpired = expiresAt !== null && expiresAt - 5 * 60 * 1000 < Date.now();

  if (isExpired && agency.ghl_refresh_token) {
    try {
      const refreshed = await refreshAgencyToken(agencyId, agency.ghl_refresh_token);
      return refreshed.access_token;
    } catch (err) {
      console.error('[ghl/agency-oauth] Token refresh failed:', err);
      return null;
    }
  }

  return agency.ghl_access_token;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function getSigningSecret(): string {
  const secret = process.env.GHL_CLIENT_SECRET;
  if (!secret) throw new Error('Missing GHL_CLIENT_SECRET env var');
  return secret;
}
