// ============================================================================
// POST /api/agency/clients/[id]/ghl/connect-token
//
// Connects a GHL sub-account using a Private Integration token.
// Validates the token against GHL API, extracts locationId, and stores it.
// No marketplace approval required.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { syncIntegrationsToContainer } from '@/lib/integrations/sync';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-04-15';

export async function POST(
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

  // ── Parse body ──────────────────────────────────────────────────────────
  let body: { token?: string; locationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json(
      { error: 'Token is required' },
      { status: 400 },
    );
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

  // ── Validate token against GHL API ─────────────────────────────────────
  // GHL Private Integration tokens are scoped to a location.
  // Many endpoints REQUIRE locationId — without it they return 403.
  // This is NOT a permissions issue, just a missing parameter.
  let locationId: string | null = body.locationId?.trim() || null;

  try {
    // Strategy 1: If locationId provided, validate directly
    if (locationId) {
      const contactsRes = await fetch(
        `${GHL_API_BASE}/contacts/?locationId=${locationId}&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Version: GHL_API_VERSION,
          },
          signal: AbortSignal.timeout(15_000),
        },
      );

      if (!contactsRes.ok) {
        if (contactsRes.status === 401) {
          return NextResponse.json(
            { error: 'Invalid token. Make sure you copied the full Private Integration token from GHL.' },
            { status: 400 },
          );
        }
        // 403 WITH locationId = genuine permissions issue
        if (contactsRes.status === 403) {
          return NextResponse.json(
            { error: 'Token does not have Contacts permission. In GHL → Settings → Integrations → your integration → enable Contacts (read + write) scope.' },
            { status: 400 },
          );
        }
        if (contactsRes.status === 422) {
          return NextResponse.json(
            { error: 'Invalid Location ID. Check GHL → Settings → Business Info → Location ID.' },
            { status: 400 },
          );
        }
        const text = await contactsRes.text().catch(() => '');
        return NextResponse.json(
          { error: `GHL API error (${contactsRes.status}): ${text.substring(0, 200)}` },
          { status: 400 },
        );
      }
    }

    // Strategy 2: No locationId — try to auto-detect it
    if (!locationId) {
      // Method A: contacts endpoint without locationId (works on some API versions)
      const contactsRes = await fetch(
        `${GHL_API_BASE}/contacts/?limit=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Version: GHL_API_VERSION,
          },
          signal: AbortSignal.timeout(15_000),
        },
      );

      if (contactsRes.status === 401) {
        return NextResponse.json(
          { error: 'Invalid token. Make sure you copied the full Private Integration token from GHL.' },
          { status: 400 },
        );
      }

      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        locationId = contactsData.contacts?.[0]?.locationId
          || contactsData.meta?.locationId
          || null;
      }

      // Method B: Try conversations search
      if (!locationId) {
        const convRes = await fetch(
          `${GHL_API_BASE}/conversations/search?limit=1`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Version: GHL_API_VERSION,
            },
            signal: AbortSignal.timeout(15_000),
          },
        );
        if (convRes.ok) {
          const convData = await convRes.json();
          locationId = convData.conversations?.[0]?.locationId || null;
        }
      }

      // Method C: Try the location endpoint directly
      if (!locationId) {
        const locRes = await fetch(
          `${GHL_API_BASE}/locations/search`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              Version: GHL_API_VERSION,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ limit: 1 }),
            signal: AbortSignal.timeout(15_000),
          },
        );
        if (locRes.ok) {
          const locData = await locRes.json();
          locationId = locData.locations?.[0]?.id || null;
        }
      }

      // If still no locationId, the token is valid but we need it from the user
      // DON'T return an error about permissions — the token works, we just need locationId
      if (!locationId) {
        return NextResponse.json({
          success: false,
          message: 'Token accepted but we couldn\'t auto-detect your Location ID. Please enter it manually.',
          needsLocationId: true,
        }, { status: 200 });
      }
    }

    // Final verification: confirm conversations scope works (critical for AI loop)
    if (locationId) {
      const verifyRes = await fetch(
        `${GHL_API_BASE}/conversations/search?locationId=${locationId}&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Version: GHL_API_VERSION,
          },
          signal: AbortSignal.timeout(15_000),
        },
      );

      if (verifyRes.status === 401) {
        return NextResponse.json(
          { error: 'Invalid token. Make sure you copied the full Private Integration token from GHL.' },
          { status: 400 },
        );
      }
      // Only flag as permissions issue if we have locationId AND get 403
      if (verifyRes.status === 403) {
        return NextResponse.json(
          { error: 'Token does not have Conversations permission. In GHL → Settings → Integrations → your integration → enable Conversations (read + write) scope.' },
          { status: 400 },
        );
      }
      // 422 or other errors with locationId = bad locationId
      if (!verifyRes.ok && verifyRes.status === 422) {
        return NextResponse.json(
          { error: 'Invalid Location ID. Double-check it in GHL → Settings → Business Info.' },
          { status: 400 },
        );
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Could not validate token: ${err instanceof Error ? err.message : 'Connection failed'}. Check your connection and try again.` },
      { status: 400 },
    );
  }

  // ── Save to database ───────────────────────────────────────────────────
  // Use service client to bypass RLS for this update
  const serviceClient = createServiceClientWithoutCookies();

  const updateData: Record<string, unknown> = {
    ghl_private_token: token,
    ghl_connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (locationId) {
    updateData.ghl_location_id = locationId;
  }

  const { error: updateError } = await serviceClient
    .from('agency_clients')
    .update(updateData)
    .eq('id', clientId);

  if (updateError) {
    console.error('[ghl/connect-token] DB update failed:', updateError);
    return NextResponse.json(
      { error: 'Failed to save connection. Please try again.' },
      { status: 500 },
    );
  }

  // Sync integrations to container (fire-and-forget)
  syncIntegrationsToContainer(clientId).catch((err) => {
    console.error('[ghl/connect-token] Integration sync failed:', err);
  });

  return NextResponse.json({
    success: true,
    locationId: locationId || null,
    message: locationId
      ? `Connected to GHL location ${locationId}. AI will start responding to inbound messages.`
      : 'Token saved. Please enter your GHL Location ID to complete the connection.',
  });
}
