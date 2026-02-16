// ============================================================================
// GET /api/agency/clients/[id]/ghl/connect
//
// Initiates the GHL OAuth flow for connecting a client's GHL sub-account.
// Redirects the user to GHL's authorization page.
//
// Required environment variables:
//   GHL_CLIENT_ID       — GHL Marketplace app client ID
//   GHL_CLIENT_SECRET   — GHL Marketplace app client secret
//   GHL_REDIRECT_URI    — OAuth callback URL (e.g. https://kyra.app/api/crm/callback)
//   NEXT_PUBLIC_APP_URL — Base URL for redirects
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encodeOAuthState, buildAuthorizationUrl } from '@/lib/ghl/oauth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  // ── Auth check ──────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Verify the agency_client belongs to the user's agency ──────────────
  const { data: agencyClient, error: clientError } = await supabase
    .from('agency_clients')
    .select('id, agency_id')
    .eq('id', clientId)
    .single();

  if (clientError || !agencyClient) {
    return NextResponse.json(
      { error: 'Client not found' },
      { status: 404 },
    );
  }

  // Verify user belongs to this agency
  const { data: agencyMember } = await supabase
    .from('agency_members')
    .select('id')
    .eq('agency_id', agencyClient.agency_id)
    .eq('user_id', user.id)
    .single();

  if (!agencyMember) {
    return NextResponse.json(
      { error: 'You do not have access to this client' },
      { status: 403 },
    );
  }

  // ── Build state param ──────────────────────────────────────────────────
  const state = encodeOAuthState({
    clientId: agencyClient.id,
    agencyId: agencyClient.agency_id,
    userId: user.id,
    ts: Date.now(),
  });

  // ── Redirect to GHL ───────────────────────────────────────────────────
  const authUrl = buildAuthorizationUrl(state);

  return NextResponse.redirect(authUrl);
}
