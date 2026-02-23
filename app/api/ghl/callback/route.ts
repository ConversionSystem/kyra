// ============================================================================
// GET /api/ghl/callback
//
// GHL OAuth callback. Receives the authorization code, exchanges it for
// tokens, stores them on the agency_client record, and redirects back
// to the client detail page.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { decodeOAuthState, exchangeCodeForTokens } from '@/lib/ghl/oauth';
import { registerWebhooks, getKyraWebhookUrl } from '@/lib/ghl/webhooks';

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

  if (!code || !stateParam) {
    return NextResponse.redirect(
      `${appUrl}/agency/clients?error=ghl_missing_params`,
    );
  }

  // ── Decode & verify state ─────────────────────────────────────────────
  let state;
  try {
    state = decodeOAuthState(stateParam);
  } catch (err) {
    console.error('[ghl/callback] Invalid state param:', err);
    return NextResponse.redirect(
      `${appUrl}/agency/clients?error=ghl_invalid_state`,
    );
  }

  const { clientId, agencyId, userId } = state;

  // ── Exchange code for tokens ──────────────────────────────────────────
  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (err) {
    console.error('[ghl/callback] Token exchange failed:', err);
    return NextResponse.redirect(
      `${appUrl}/agency/clients/${clientId}?error=ghl_token_failed`,
    );
  }

  // ── Store tokens in database ──────────────────────────────────────────
  const supabase = createServiceClientWithoutCookies();

  // Verify the client still belongs to the agency
  const { data: agencyClient, error: fetchError } = await supabase
    .from('agency_clients')
    .select('id, agency_id')
    .eq('id', clientId)
    .eq('agency_id', agencyId)
    .single();

  if (fetchError || !agencyClient) {
    console.error('[ghl/callback] Client not found:', fetchError);
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
      ghl_connected_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId);

  if (updateError) {
    console.error('[ghl/callback] Failed to store tokens:', updateError);
    return NextResponse.redirect(
      `${appUrl}/agency/clients/${clientId}?error=ghl_store_failed`,
    );
  }

  console.log(
    `[ghl/callback] Successfully connected GHL for client ${clientId} (location: ${tokens.locationId})`,
  );

  // ── Auto-register Kyra webhooks with GHL ─────────────────────────────
  // Fire-and-forget: don't block the redirect if webhook registration fails.
  // The agency can re-trigger via the GHL Setup tab if needed.
  void (async () => {
    try {
      const webhookUrl = getKyraWebhookUrl();
      const registration = await registerWebhooks(
        tokens.access_token,
        tokens.locationId,
        webhookUrl,
      );
      if (registration) {
        console.log(
          `[ghl/callback] ✅ Auto-registered GHL webhooks for location ${tokens.locationId} (id=${registration.id})`,
        );
      }
    } catch (err) {
      console.warn('[ghl/callback] Webhook auto-registration failed (non-fatal):', err);
    }
  })();

  // ── Redirect back to client page with success ────────────────────────
  return NextResponse.redirect(
    `${appUrl}/agency/clients/${clientId}?success=ghl_connected`,
  );
}
