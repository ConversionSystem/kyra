// ============================================================================
// GET /api/crm/test-callback
//
// Simplified OAuth callback for testing. No state validation.
// Exchanges the code for tokens and displays them + stores in a test client.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json({ error: `GHL returned error: ${error}` }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'No authorization code received' }, { status: 400 });
  }

  // Exchange code for tokens
  const clientId = process.env.GHL_CLIENT_ID!;
  const clientSecret = process.env.GHL_CLIENT_SECRET!;
  const redirectUri = process.env.GHL_REDIRECT_URI!;

  // Debug: show what we're sending (redact secrets)
  const debugInfo = {
    client_id_length: clientId?.length,
    client_id_preview: clientId ? `${clientId.substring(0, 10)}...${clientId.substring(clientId.length - 8)}` : 'MISSING',
    client_secret_set: !!clientSecret,
    redirect_uri: redirectUri,
    code_length: code.length,
    code_preview: `${code.substring(0, 10)}...`,
  };

  let tokens;
  try {
    const bodyParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const res = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams,
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({
        error: 'Token exchange failed',
        status: res.status,
        detail: text,
        debug: debugInfo,
      }, { status: 500 });
    }

    tokens = await res.json();
  } catch (err: any) {
    return NextResponse.json({
      error: 'Token exchange exception',
      detail: err.message,
      debug: debugInfo,
    }, { status: 500 });
  }

  // Store in the first agency_client that has no GHL connection,
  // or create a test record
  const supabase = createServiceClientWithoutCookies();

  // Try to find an existing unconnected agency client
  const { data: existingClient } = await supabase
    .from('agency_clients')
    .select('id, name')
    .is('ghl_access_token', null)
    .limit(1)
    .single();

  let savedTo = null;

  if (existingClient) {
    const { error: updateError } = await supabase
      .from('agency_clients')
      .update({
        ghl_access_token: tokens.access_token,
        ghl_refresh_token: tokens.refresh_token,
        ghl_location_id: tokens.locationId || null,
        ghl_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingClient.id);

    if (!updateError) {
      savedTo = { id: existingClient.id, name: existingClient.name };
    }
  }

  // Return success with token info (redact sensitive parts)
  return NextResponse.json({
    success: true,
    message: 'GHL OAuth tokens received successfully!',
    locationId: tokens.locationId || null,
    tokenType: tokens.token_type,
    expiresIn: tokens.expires_in,
    scope: tokens.scope,
    accessTokenPreview: tokens.access_token
      ? `${tokens.access_token.substring(0, 20)}...`
      : null,
    hasRefreshToken: !!tokens.refresh_token,
    savedTo,
  });
}
