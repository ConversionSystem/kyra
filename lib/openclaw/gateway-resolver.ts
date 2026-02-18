/**
 * Agency Gateway Resolver
 *
 * Resolves the correct OpenClaw Gateway URL and token for a given agency/user.
 * Each agency has its own isolated gateway — this module ensures API routes
 * talk to the right one.
 *
 * Falls back to KYRA_WORKER_URL env var for legacy/development setups.
 */

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export interface AgencyGateway {
  url: string;
  token: string;
  appName: string;
  status: string;
  agencyId: string;
  agencyName: string;
}

const FALLBACK_URL = process.env.KYRA_WORKER_URL || 'https://kyra-gateway.fly.dev';
const FALLBACK_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

/**
 * Get gateway details for an agency by agency ID.
 */
export async function getGatewayByAgencyId(agencyId: string): Promise<AgencyGateway | null> {
  const supabase = getSupabase();
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, gateway_url, gateway_token, gateway_app_name, gateway_status')
    .eq('id', agencyId)
    .single();

  if (!agency?.gateway_url || !agency?.gateway_token) return null;
  if (!['running', 'starting'].includes(agency.gateway_status)) return null;

  return {
    url: agency.gateway_url,
    token: agency.gateway_token,
    appName: agency.gateway_app_name,
    status: agency.gateway_status,
    agencyId: agency.id,
    agencyName: agency.name,
  };
}

/**
 * Get gateway details for the agency that a user belongs to.
 * This is the primary resolver — used by most API routes.
 */
export async function getGatewayByUserId(userId: string): Promise<AgencyGateway | null> {
  const supabase = getSupabase();

  // Get user's agency membership
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
 * Get the gateway URL for an agency, with fallback to the legacy shared gateway.
 * Use this in API routes that need a gateway URL.
 */
export async function resolveGatewayUrl(userId: string): Promise<{ url: string; token: string }> {
  const gateway = await getGatewayByUserId(userId);

  if (gateway) {
    return { url: gateway.url, token: gateway.token };
  }

  // Fallback to legacy shared gateway (for development or agencies without own gateway)
  console.warn(`[gateway-resolver] No per-agency gateway for user ${userId}, using fallback`);
  return { url: FALLBACK_URL, token: FALLBACK_TOKEN };
}

/**
 * Get the OpenClaw Dashboard URL for an agency (for iframe embedding).
 * Token is passed via hash fragment (never in server logs).
 */
export async function getDashboardUrl(userId: string): Promise<{ url: string; baseUrl: string }> {
  const { url, token } = await resolveGatewayUrl(userId);
  return {
    url: `${url}/__openclaw__/#token=${encodeURIComponent(token)}`,
    baseUrl: `${url}/__openclaw__/`,
  };
}

/**
 * Get gateway for a specific agency client (for GHL poller/webhook routing).
 * Looks up which agency owns the client, then gets that agency's gateway.
 */
export async function getGatewayByClientId(clientId: string): Promise<AgencyGateway | null> {
  const supabase = getSupabase();
  const { data: client } = await supabase
    .from('agency_clients')
    .select('agency_id')
    .eq('id', clientId)
    .single();

  if (!client?.agency_id) return null;
  return getGatewayByAgencyId(client.agency_id);
}

/**
 * Get gateway for a GHL location ID (for webhook routing).
 * Maps GHL location → agency client → agency → gateway.
 */
export async function getGatewayByGhlLocation(locationId: string): Promise<AgencyGateway | null> {
  const supabase = getSupabase();
  const { data: client } = await supabase
    .from('agency_clients')
    .select('agency_id')
    .eq('ghl_location_id', locationId)
    .limit(1)
    .single();

  if (!client?.agency_id) return null;
  return getGatewayByAgencyId(client.agency_id);
}
