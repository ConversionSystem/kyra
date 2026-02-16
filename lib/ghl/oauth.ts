// ============================================================================
// GHL OAuth helpers — state encoding/decoding, URL building, token exchange
// ============================================================================

import { createHmac, timingSafeEqual } from 'crypto';
import type { GHLTokenResponse } from './types';

// ── Constants ─────────────────────────────────────────────────────────────────

const GHL_AUTHORIZE_URL =
  'https://marketplace.gohighlevel.com/oauth/chooselocation';
const GHL_TOKEN_URL =
  'https://services.leadconnectorhq.com/oauth/token';

const GHL_SCOPES = [
  'contacts.readonly',
  'contacts.write',
  'conversations.readonly',
  'conversations.write',
  'opportunities.readonly',
  'opportunities.write',
  'calendars.readonly',
  'calendars.write',
  'workflows.readonly',
].join(' ');

// ── State Param (signed JSON) ────────────────────────────────────────────────

export interface GHLOAuthState {
  clientId: string;     // agency_client id (our DB)
  agencyId: string;     // agency id (our DB)
  userId: string;       // Supabase user id
  ts: number;           // timestamp for expiry check
}

/**
 * Build & sign the OAuth state parameter.
 * Encoded as base64url( JSON + "." + HMAC-SHA256 signature ).
 */
export function encodeOAuthState(state: GHLOAuthState): string {
  const secret = getSigningSecret();
  const payload = JSON.stringify(state);
  const sig = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  const combined = `${Buffer.from(payload).toString('base64url')}.${sig}`;
  return combined;
}

/**
 * Decode & verify the OAuth state parameter.
 * Throws if the signature is invalid or the state has expired (>10 min).
 */
export function decodeOAuthState(raw: string): GHLOAuthState {
  const secret = getSigningSecret();

  const dotIndex = raw.lastIndexOf('.');
  if (dotIndex === -1) throw new Error('Invalid OAuth state format');

  const payloadB64 = raw.slice(0, dotIndex);
  const receivedSig = raw.slice(dotIndex + 1);

  const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
  const expectedSig = createHmac('sha256', secret)
    .update(payloadStr)
    .digest('base64url');

  // Constant-time comparison
  const a = Buffer.from(receivedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid OAuth state signature');
  }

  const state: GHLOAuthState = JSON.parse(payloadStr);

  // Expire after 10 minutes
  const MAX_AGE_MS = 10 * 60 * 1000;
  if (Date.now() - state.ts > MAX_AGE_MS) {
    throw new Error('OAuth state expired');
  }

  return state;
}

// ── URL Builder ──────────────────────────────────────────────────────────────

/**
 * Build the GHL OAuth authorization URL.
 */
export function buildAuthorizationUrl(state: string): string {
  const clientId = process.env.GHL_CLIENT_ID;
  const redirectUri = process.env.GHL_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('Missing GHL_CLIENT_ID or GHL_REDIRECT_URI env vars');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    redirect_uri: redirectUri,
    client_id: clientId,
    scope: GHL_SCOPES,
    state,
  });

  return `${GHL_AUTHORIZE_URL}?${params.toString()}`;
}

// ── Token Exchange ────────────────────────────────────────────────────────────

/**
 * Exchange the authorization code for tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
): Promise<GHLTokenResponse> {
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
    throw new Error(`GHL token exchange failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<GHLTokenResponse>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSigningSecret(): string {
  const secret = process.env.GHL_CLIENT_SECRET;
  if (!secret) throw new Error('Missing GHL_CLIENT_SECRET env var');
  return secret;
}
