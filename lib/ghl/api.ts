// ============================================================================
// GHL API Client — Token refresh, message sending, conversation lookup
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import type {
  GHLTokenResponse,
  GHLMessageChannel,
  GHLSendMessageResult,
  GHLConversation,
} from './types';

const GHL_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';
const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-04-15';

// ── Token Refresh ─────────────────────────────────────────────────────────────

/**
 * Refresh the GHL OAuth token and persist the new tokens to Supabase.
 * Returns the new token response.
 */
export async function refreshGHLToken(
  agencyClientId: string,
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
    throw new Error(`GHL token refresh failed (${res.status}): ${text}`);
  }

  const tokens = (await res.json()) as GHLTokenResponse;

  // Persist new tokens to Supabase
  const supabase = createServiceClientWithoutCookies();
  const { error } = await supabase
    .from('agency_clients')
    .update({
      ghl_access_token: tokens.access_token,
      ghl_refresh_token: tokens.refresh_token,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agencyClientId);

  if (error) {
    console.error(
      `[ghl/api] Failed to persist refreshed tokens for client ${agencyClientId}:`,
      error,
    );
    // Don't throw — the tokens are still valid even if persistence fails.
    // Next webhook will re-refresh if needed.
  }

  return tokens;
}

/**
 * Get a valid access token for an agency client.
 * Priority: Private Integration token (static, no refresh) → OAuth token → refresh.
 */
export async function getValidToken(agencyClientId: string): Promise<string> {
  const supabase = createServiceClientWithoutCookies();

  const { data: client, error } = await supabase
    .from('agency_clients')
    .select('ghl_private_token, ghl_access_token, ghl_refresh_token')
    .eq('id', agencyClientId)
    .single();

  if (error || !client) {
    throw new Error(`Agency client ${agencyClientId} not found`);
  }

  // Private Integration tokens take priority — they're static and never expire
  if (client.ghl_private_token) {
    return client.ghl_private_token;
  }

  // Fall back to OAuth access token. GHL tokens last 24h so we optimistically use it.
  // If it fails at call-time, the caller should catch 401 and call refreshGHLToken.
  if (client.ghl_access_token) {
    return client.ghl_access_token;
  }

  // No access token — try refreshing
  if (!client.ghl_refresh_token) {
    throw new Error(
      `Agency client ${agencyClientId} has no GHL tokens — OAuth not connected and no Private Integration token`,
    );
  }

  const tokens = await refreshGHLToken(agencyClientId, client.ghl_refresh_token);
  return tokens.access_token;
}

// ── Send Message ──────────────────────────────────────────────────────────────

/**
 * Send a message back to a GHL conversation.
 * Automatically retries once with a token refresh on 401.
 */
export async function sendGHLMessage(
  agencyClientId: string,
  accessToken: string,
  contactId: string,
  message: string,
  messageType: GHLMessageChannel | string = 'TYPE_SMS',
): Promise<GHLSendMessageResult> {
  // GHL Send Message API uses short type names (SMS, Email, WhatsApp, etc.)
  // but the Conversations API returns TYPE_SMS, TYPE_EMAIL, etc.
  const sendType = normalizeMessageType(messageType);

  const doSend = async (token: string): Promise<Response> => {
    return fetch(`${GHL_API_BASE}/conversations/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Version: GHL_API_VERSION,
      },
      body: JSON.stringify({
        type: sendType,
        contactId,
        message,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  };

  let res = await doSend(accessToken);

  // Retry with refreshed token on 401
  if (res.status === 401) {
    console.log('[ghl/api] Access token expired, refreshing…');
    const supabase = createServiceClientWithoutCookies();
    const { data: client } = await supabase
      .from('agency_clients')
      .select('ghl_refresh_token')
      .eq('id', agencyClientId)
      .single();

    if (client?.ghl_refresh_token) {
      const tokens = await refreshGHLToken(agencyClientId, client.ghl_refresh_token);
      res = await doSend(tokens.access_token);
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GHL sendMessage failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<GHLSendMessageResult>;
}

// ── Get Conversation ──────────────────────────────────────────────────────────

/**
 * Get conversation details from GHL.
 */
export async function getGHLConversation(
  accessToken: string,
  conversationId: string,
): Promise<GHLConversation> {
  const res = await fetch(
    `${GHL_API_BASE}/conversations/${conversationId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: GHL_API_VERSION,
      },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GHL getConversation failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.conversation ?? data;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalize message type for the GHL Send Message API.
 * The Conversations API returns TYPE_SMS, TYPE_EMAIL, etc.
 * But the Send Message API expects SMS, Email, WhatsApp, etc.
 */
function normalizeMessageType(type: string): string {
  const map: Record<string, string> = {
    TYPE_SMS: 'SMS',
    TYPE_EMAIL: 'Email',
    TYPE_WHATSAPP: 'WhatsApp',
    TYPE_FB_MESSENGER: 'FB',
    TYPE_INSTAGRAM: 'IG',
    TYPE_LIVE_CHAT: 'Live_Chat',
    TYPE_CALL: 'Call',
    // Already normalized values pass through
    SMS: 'SMS',
    Email: 'Email',
    WhatsApp: 'WhatsApp',
  };
  return map[type] || type.replace(/^TYPE_/, '');
}
