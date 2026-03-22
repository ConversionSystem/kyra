/**
 * Per-Client Gateway Resolver (OVH Architecture)
 *
 * Replaces lib/openclaw/gateway-resolver.ts for the new architecture.
 * Now resolves gateways per CLIENT (not per agency).
 *
 * Usage:
 *   import { resolveClientGateway, chatWithClient } from '@/lib/ovh/gateway-resolver';
 */

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export interface ClientGateway {
  url: string;
  token: string;
  containerId: string;
  status: string;
  clientId: string;
  clientName: string;
  agencyId: string;
}

export class GatewayNotProvisionedError extends Error {
  constructor(clientId: string) {
    super(`No gateway provisioned for client ${clientId}. Deploy the client's AI first.`);
    this.name = 'GatewayNotProvisionedError';
  }
}

/**
 * Get gateway details for a specific client.
 */
export async function getGatewayByClientId(clientId: string): Promise<ClientGateway | null> {
  const supabase = getSupabase();
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, name, agency_id, gateway_url, gateway_token, gateway_container_id, gateway_status')
    .eq('id', clientId)
    .single();

  if (!client?.gateway_url || !client?.gateway_token) return null;
  if (!['running', 'starting'].includes(client.gateway_status || '')) return null;

  return {
    url: client.gateway_url,
    token: client.gateway_token,
    containerId: client.gateway_container_id,
    status: client.gateway_status,
    clientId: client.id,
    clientName: client.name,
    agencyId: client.agency_id,
  };
}

/**
 * Get gateway by GHL location ID (for webhook/poller routing).
 * Maps: GHL location → client → client's gateway
 */
export async function getGatewayByGhlLocation(locationId: string): Promise<ClientGateway | null> {
  const supabase = getSupabase();
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, name, agency_id, gateway_url, gateway_token, gateway_container_id, gateway_status')
    .eq('ghl_location_id', locationId)
    .limit(1)
    .single();

  if (!client?.gateway_url || !client?.gateway_token) return null;
  if (!['running', 'starting'].includes(client.gateway_status || '')) return null;

  return {
    url: client.gateway_url,
    token: client.gateway_token,
    containerId: client.gateway_container_id,
    status: client.gateway_status,
    clientId: client.id,
    clientName: client.name,
    agencyId: client.agency_id,
  };
}

/**
 * Send a chat message to a client's gateway and get a reply.
 * This is the main entry point for customer → AI routing.
 */
export async function chatWithClient(
  clientId: string,
  message: string,
  options: {
    sessionId?: string;
    apiKey?: string;
    model?: string;
  } = {}
): Promise<{ reply: string; sessionId: string }> {
  const gateway = await getGatewayByClientId(clientId);
  if (!gateway) {
    throw new GatewayNotProvisionedError(clientId);
  }

  // Use OpenClaw's /v1/chat/completions (OpenAI-compatible) HTTP API
  const messages: Array<{ role: string; content: string }> = [];
  messages.push({ role: 'user', content: message });

  const res = await fetch(`${gateway.url}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${gateway.token}`,
    },
    body: JSON.stringify({
      model: options.model || 'openai/gpt-4o-mini',
      messages,
      stream: false,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Gateway returned ${res.status}`);
  }

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content || '';
  return { reply, sessionId: options.sessionId || 'default' };
}

/**
 * Get the first running gateway for an agency by agency ID.
 * Used by routes that know the agency but not a specific client.
 * Checks: 1) client gateways, 2) agency's own gateway (solo users).
 */
export async function getGatewayByAgencyId(agencyId: string): Promise<ClientGateway | null> {
  const supabase = getSupabase();
  
  // Try client gateways first
  const { data: clients } = await supabase
    .from('agency_clients')
    .select('id, name, agency_id, gateway_url, gateway_token, gateway_container_id, gateway_status')
    .eq('agency_id', agencyId)
    .eq('gateway_status', 'running')
    .not('gateway_url', 'is', null)
    .not('gateway_token', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1);

  if (clients?.length) {
    const client = clients[0];
    return {
      url: client.gateway_url,
      token: client.gateway_token,
      containerId: client.gateway_container_id,
      status: client.gateway_status,
      clientId: client.id,
      clientName: client.name,
      agencyId: client.agency_id,
    };
  }

  // Fallback: check agency's own gateway (solo accounts + agencies with their own container)
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, gateway_url, gateway_token, gateway_status')
    .eq('id', agencyId)
    .single();

  if (agency?.gateway_url && agency?.gateway_token && agency.gateway_status === 'running') {
    return {
      url: agency.gateway_url,
      token: agency.gateway_token,
      containerId: `kyra-cl-${agency.id}`,
      status: agency.gateway_status,
      clientId: agency.id, // container is named kyra-cl-{agencyId}
      clientName: agency.name,
      agencyId: agency.id,
    };
  }

  return null;
}

/**
 * Get the first active client gateway for an agency (by user ID).
 * Used for the agency-level "OpenClaw Terminal" link.
 * Returns the first running client gateway found.
 */
export async function getFirstGatewayByUserId(userId: string): Promise<ClientGateway | null> {
  const supabase = getSupabase();

  // Get user's agency
  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (!member?.agency_id) return null;

  return getGatewayByAgencyId(member.agency_id);
}

/**
 * Resolve a gateway URL + token for a user.
 * Looks up the user's agency membership, then finds the first active gateway.
 * Used by routes that only have the auth user ID (dashboard, tools, channels).
 *
 * If clientId is provided, resolves that specific client's gateway.
 * Otherwise tries: 1) first active client gateway, 2) agency's own gateway (solo users).
 * 
 * NOTE: For solo accounts, the container is named kyra-cl-{agencyId}, not kyra-cl-{clientId}.
 * The clientId returned for agency gateways is actually the agencyId — this is correct
 * because the provisioner routes use it to find the container.
 */
export async function resolveGatewayForUser(
  userId: string,
  clientId?: string | null,
): Promise<{ url: string; token: string; clientId: string } | null> {
  if (clientId) {
    const gw = await getGatewayByClientId(clientId);
    if (!gw) return null;
    return { url: gw.url, token: gw.token, clientId: gw.clientId };
  }

  // Try client gateways first
  const gw = await getFirstGatewayByUserId(userId);
  if (gw) return { url: gw.url, token: gw.token, clientId: gw.clientId };

  // Fallback: check agency's own gateway (solo accounts + agencies with their own container)
  const supabase = getSupabase();
  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (!member?.agency_id) return null;

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, gateway_url, gateway_token, gateway_status')
    .eq('id', member.agency_id)
    .single();

  if (agency?.gateway_url && agency?.gateway_token && agency.gateway_status === 'running') {
    // For agency gateways, the "clientId" is the agencyId (container: kyra-cl-{agencyId})
    return { url: agency.gateway_url, token: agency.gateway_token, clientId: agency.id };
  }

  return null;
}

/**
 * Get the OpenClaw Dashboard URL for a client's gateway.
 * Token is passed via hash fragment (never in server logs).
 */
export async function getDashboardUrlForClient(
  clientId: string,
): Promise<{ url: string; baseUrl: string; clientId: string } | null> {
  const gw = await getGatewayByClientId(clientId);
  if (!gw) return null;

  // OpenClaw Control UI reads token from ?token= query param (not hash fragment)
  return {
    url: `${gw.url}/__openclaw__/#token=${encodeURIComponent(gw.token)}`,
    baseUrl: `${gw.url}/__openclaw__/`,
    clientId: gw.clientId,
  };
}

/**
 * Get dashboard URL for a user (resolves their agency → first active client).
 * Accepts optional clientId to target a specific client.
 */
export async function getDashboardUrl(
  userId: string,
  clientId?: string | null,
): Promise<{ url: string; baseUrl: string; clientId: string } | null> {
  const resolved = await resolveGatewayForUser(userId, clientId);
  if (!resolved) return null;

  // OpenClaw Control UI reads token from ?token= query param (not hash fragment)
  return {
    url: `${resolved.url}/__openclaw__/#token=${encodeURIComponent(resolved.token)}`,
    baseUrl: `${resolved.url}/__openclaw__/`,
    clientId: resolved.clientId,
  };
}

/**
 * Health check a client's gateway.
 */
export async function checkClientHealth(clientId: string): Promise<{
  healthy: boolean;
  uptime?: number;
  sessions?: number;
}> {
  const gateway = await getGatewayByClientId(clientId);
  if (!gateway) return { healthy: false };

  try {
    const res = await fetch(`${gateway.url}/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return { healthy: false };
    const data = await res.json();
    return {
      healthy: true,
      uptime: data.uptime,
      sessions: data.sessions,
    };
  } catch {
    return { healthy: false };
  }
}
