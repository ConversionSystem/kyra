// ============================================================================
// GET /api/crm/callback (renamed from /api/ghl/callback — GHL blocks "ghl" in redirect URLs)
//
// Shared GHL OAuth callback. Handles both:
//   1. Agency-level OAuth (state.type === "agency") — stores tokens on agencies table,
//      enables sub-account creation.
//   2. Per-client OAuth (state.type === "client" or no type) — stores tokens on
//      agency_clients table, enables per-client CRM features.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { decodeOAuthState, exchangeCodeForTokens } from '@/lib/ghl/oauth';
import { decodeAgencyOAuthState, exchangeAgencyCodeForTokens } from '@/lib/ghl/agency-oauth';
import { syncIntegrationsToContainer } from '@/lib/integrations/sync';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');

  // ── Handle GHL errors ──────────────────────────────────────────────────────
  if (error) {
    console.error('[crm/callback] GHL returned error:', error);
    return NextResponse.redirect(`${appUrl}/agency/clients?error=ghl_auth_denied`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/agency/clients?error=ghl_missing_params`);
  }

  // ── Detect flow type from state ────────────────────────────────────────────
  if (stateParam) {
    // Peek at the state payload to detect type without full verification
    try {
      const dotIndex = stateParam.lastIndexOf('.');
      if (dotIndex !== -1) {
        const payloadB64 = stateParam.slice(0, dotIndex);
        const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
        const parsed = JSON.parse(payloadStr) as { type?: string };

        if (parsed.type === 'agency') {
          return handleAgencyCallback(code, stateParam);
        }
      }
    } catch {
      // Fall through to per-client handler
    }
  }

  return handleClientCallback(code, stateParam);
}

// ── Agency-Level OAuth ────────────────────────────────────────────────────────

async function handleAgencyCallback(code: string, stateParam: string): Promise<NextResponse> {
  let agencyId: string | undefined;
  let userId: string | undefined;

  try {
    const state = decodeAgencyOAuthState(stateParam);
    agencyId = state.agencyId;
    userId = state.userId;
  } catch (err) {
    console.warn('[crm/callback] Invalid agency state:', err);
    return NextResponse.redirect(`${appUrl}/agency/settings?error=ghl_invalid_state`);
  }

  let tokens;
  try {
    tokens = await exchangeAgencyCodeForTokens(code);
  } catch (err) {
    console.error('[crm/callback] Agency token exchange failed:', err);
    return NextResponse.redirect(`${appUrl}/agency/settings?error=ghl_token_failed`);
  }

  const db = createServiceClientWithoutCookies();

  const { error: updateError } = await db
    .from('agencies')
    .update({
      ghl_access_token: tokens.access_token,
      ghl_refresh_token: tokens.refresh_token,
      ghl_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      ghl_company_id: tokens.companyId || null,
      ghl_connected_at: new Date().toISOString(),
      ghl_connected_by: userId || null,
    })
    .eq('id', agencyId!);

  if (updateError) {
    console.error('[crm/callback] Failed to store agency GHL tokens:', updateError);
    return NextResponse.redirect(`${appUrl}/agency/settings?error=ghl_store_failed`);
  }

  console.log(`[crm/callback] ✅ Agency GHL connected — agencyId: ${agencyId}, companyId: ${tokens.companyId}`);

  return NextResponse.redirect(`${appUrl}/agency/settings?success=ghl_agency_connected`);
}

// ── Per-Client OAuth ──────────────────────────────────────────────────────────

async function handleClientCallback(code: string, stateParam: string | null): Promise<NextResponse> {
  let clientId: string | undefined;
  let agencyId: string | undefined;
  let userId: string | undefined;

  if (stateParam) {
    try {
      const state = decodeOAuthState(stateParam);
      clientId = state.clientId;
      agencyId = state.agencyId;
      userId = state.userId;
    } catch (err) {
      console.warn('[crm/callback] Invalid client state param, using fallback:', err);
    }
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (err) {
    console.error('[crm/callback] Token exchange failed:', err);
    const redirectTo = clientId
      ? `${appUrl}/agency/clients/${clientId}?error=ghl_token_failed`
      : `${appUrl}/agency/clients?error=ghl_token_failed`;
    return NextResponse.redirect(redirectTo);
  }

  const supabase = createServiceClientWithoutCookies();
  let targetClientId = clientId;

  if (targetClientId && agencyId) {
    const { data: agencyClient, error: fetchError } = await supabase
      .from('agency_clients')
      .select('id, agency_id')
      .eq('id', targetClientId)
      .eq('agency_id', agencyId)
      .single();

    if (fetchError || !agencyClient) {
      console.warn('[crm/callback] Client not found with state, falling back to location match');
      targetClientId = undefined;
    }
  }

  if (!targetClientId) {
    const locationId = tokens.locationId;

    if (locationId) {
      const { data } = await supabase
        .from('agency_clients')
        .select('id')
        .eq('ghl_location_id', locationId)
        .limit(1)
        .single();
      if (data) targetClientId = data.id;
    }

    if (!targetClientId) {
      const { data } = await supabase
        .from('agency_clients')
        .select('id')
        .is('ghl_access_token', null)
        .limit(1)
        .single();
      if (data) targetClientId = data.id;
    }
  }

  if (!targetClientId) {
    console.error('[crm/callback] No matching client found');
    return NextResponse.redirect(`${appUrl}/agency/clients?error=ghl_client_not_found`);
  }

  const { error: updateError } = await supabase
    .from('agency_clients')
    .update({
      ghl_access_token: tokens.access_token,
      ghl_refresh_token: tokens.refresh_token,
      ghl_location_id: tokens.locationId,
      ghl_connected_at: new Date().toISOString(),
      ghl_connected_by: userId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetClientId);

  if (updateError) {
    console.error('[crm/callback] Failed to store tokens:', updateError);
    return NextResponse.redirect(
      `${appUrl}/agency/clients/${targetClientId}?error=ghl_store_failed`,
    );
  }

  console.log(`[crm/callback] ✅ Client GHL connected — client: ${targetClientId}, location: ${tokens.locationId}`);

  syncIntegrationsToContainer(targetClientId).catch((err) => {
    console.error('[crm/callback] Integration sync failed:', err);
  });

  return NextResponse.redirect(
    `${appUrl}/agency/clients/${targetClientId}?success=ghl_connected`,
  );
}
