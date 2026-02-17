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
  // Try to fetch conversations to verify the token works and extract locationId
  let locationId: string | null = body.locationId?.trim() || null;

  try {
    // First, try searching conversations (this confirms conversations scope works)
    // We need a locationId — if not provided, try to get it from the token
    if (!locationId) {
      // Try fetching the location/business info from the token
      // Private Integration tokens are scoped to a location, so we can try
      // the contacts endpoint which returns locationId in results
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

      if (!contactsRes.ok) {
        const text = await contactsRes.text().catch(() => '');
        if (contactsRes.status === 401) {
          return NextResponse.json(
            {
              error:
                'Invalid token. Make sure you copied the full Private Integration token from GHL.',
            },
            { status: 400 },
          );
        }
        if (contactsRes.status === 403) {
          return NextResponse.json(
            {
              error:
                'Token does not have the required permissions. Please ensure Contacts (read) scope is enabled.',
            },
            { status: 400 },
          );
        }
        return NextResponse.json(
          {
            error: `GHL API error (${contactsRes.status}): ${text.substring(0, 200)}`,
          },
          { status: 400 },
        );
      }

      const contactsData = await contactsRes.json();
      // Try to extract locationId from the first contact or the meta
      if (contactsData.contacts?.[0]?.locationId) {
        locationId = contactsData.contacts[0].locationId;
      } else if (contactsData.meta?.locationId) {
        locationId = contactsData.meta.locationId;
      }
    }

    // If we still don't have locationId, try the conversations search
    if (!locationId) {
      // Try a broader approach — search conversations
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
        if (convData.conversations?.[0]?.locationId) {
          locationId = convData.conversations[0].locationId;
        }
      }
    }

    // Verify conversations scope works (this is critical for the AI loop)
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

      if (!verifyRes.ok) {
        if (verifyRes.status === 403) {
          return NextResponse.json(
            {
              error:
                'Token does not have Conversations permission. Please add Conversations (read + write) scope in GHL Private Integrations.',
            },
            { status: 400 },
          );
        }
      }
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: `Could not validate token: ${err instanceof Error ? err.message : 'Connection failed'}. Check your internet connection and try again.`,
      },
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

  return NextResponse.json({
    success: true,
    locationId: locationId || null,
    message: locationId
      ? `Connected to GHL location ${locationId}. AI will start responding to inbound messages.`
      : 'Token saved. Please enter your GHL Location ID to complete the connection.',
  });
}
