// ============================================================================
// GET /api/crm/callback (renamed from /api/ghl/callback — GHL blocks "ghl" in redirect URLs)
//
// GHL OAuth callback. Receives the authorization code, exchanges it for
// tokens, stores them on the agency_client record, and redirects back
// to the client detail page.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { decodeOAuthState, exchangeCodeForTokens } from '@/lib/ghl/oauth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

  // ── Handle GHL errors ─────────────────────────────────────────────────
  if (error) {
    console.error('[ghl/callback] GHL returned error:', error);
    return NextResponse.redirect(
      `${appUrl}/agency/clients?error=ghl_auth_denied`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${appUrl}/agency/clients?error=ghl_missing_params`,
    );
  }

  // ── Decode state (if present) or use fallback ─────────────────────────
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
      console.warn('[ghl/callback] Invalid state param, using fallback:', err);
    }
  }

  // ── Exchange code for tokens ──────────────────────────────────────────
  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (err) {
    console.error('[ghl/callback] Token exchange failed:', err);
    const redirectTo = clientId
      ? `${appUrl}/agency/clients/${clientId}?error=ghl_token_failed`
      : `${appUrl}/agency/clients?error=ghl_token_failed`;
    return NextResponse.redirect(redirectTo);
  }

  // ── Store tokens in database ──────────────────────────────────────────
  const supabase = createServiceClientWithoutCookies();

  // If we have clientId from state, verify and use it
  // Otherwise, find a client by locationId or use the first unconnected client
  let targetClientId = clientId;

  if (targetClientId && agencyId) {
    // Verify the client belongs to the agency
    const { data: agencyClient, error: fetchError } = await supabase
      .from('agency_clients')
      .select('id, agency_id')
      .eq('id', targetClientId)
      .eq('agency_id', agencyId)
      .single();

    if (fetchError || !agencyClient) {
      console.warn('[ghl/callback] Client not found with state, falling back to location match');
      targetClientId = undefined;
    }
  }

  // Fallback: find client by location ID or first unconnected
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
    console.error('[ghl/callback] No matching client found');
    return NextResponse.redirect(
      `${appUrl}/agency/clients?error=ghl_client_not_found`,
    );
  }

  // Update with GHL credentials
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
    console.error('[ghl/callback] Failed to store tokens:', updateError);
    return NextResponse.redirect(
      `${appUrl}/agency/clients/${targetClientId}?error=ghl_store_failed`,
    );
  }

  console.log(
    `[ghl/callback] Successfully connected GHL for client ${targetClientId} (location: ${tokens.locationId})`,
  );

  // ── Redirect back to client page with success ────────────────────────
  return NextResponse.redirect(
    `${appUrl}/agency/clients/${targetClientId}?success=ghl_connected`,
  );
}
