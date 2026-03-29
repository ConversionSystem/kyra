// ============================================================================
// POST /api/agency/clients/[id]/ghl/test-connection
//
// Tests the GHL connection by making a lightweight API call to verify the
// stored token is still valid and has the required scopes.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user has access to this client
  const { data: agencyClient } = await supabase
    .from('agency_clients')
    .select('id, agency_id, ghl_location_id, ghl_private_token, ghl_access_token')
    .eq('id', clientId)
    .single();

  if (!agencyClient) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { data: agencyMember } = await supabase
    .from('agency_members')
    .select('id')
    .eq('agency_id', agencyClient.agency_id)
    .eq('user_id', user.id)
    .single();

  if (!agencyMember) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Get token (prefer private token over OAuth)
  const db = createServiceClientWithoutCookies();
  const { data: clientData } = await db
    .from('agency_clients')
    .select('ghl_private_token, ghl_access_token, ghl_location_id')
    .eq('id', clientId)
    .single();

  const token = clientData?.ghl_private_token || clientData?.ghl_access_token;
  const locationId = clientData?.ghl_location_id;

  if (!token || !locationId) {
    return NextResponse.json({
      ok: false,
      error: 'No GHL token or Location ID found. Please reconnect.',
    }, { status: 400 });
  }

  // Test: fetch contacts (limit 1) to verify token + scopes
  try {
    const contactsRes = await fetch(
      `${GHL_API_BASE}/contacts/?locationId=${locationId}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: GHL_API_VERSION,
        },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (contactsRes.status === 401) {
      return NextResponse.json({
        ok: false,
        error: 'Token is invalid or expired. Please reconnect with a new token.',
      });
    }

    if (contactsRes.status === 403) {
      return NextResponse.json({
        ok: false,
        error: 'Token lacks required permissions. Please regenerate with Contacts scope enabled.',
      });
    }

    if (!contactsRes.ok) {
      return NextResponse.json({
        ok: false,
        error: `GHL API returned ${contactsRes.status}. The connection may need to be refreshed.`,
      });
    }

    // Also check conversations scope
    const convRes = await fetch(
      `${GHL_API_BASE}/conversations/search?locationId=${locationId}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: GHL_API_VERSION,
        },
        signal: AbortSignal.timeout(10_000),
      },
    );

    const scopes: string[] = ['contacts'];
    if (convRes.ok) scopes.push('conversations');

    return NextResponse.json({
      ok: true,
      locationId,
      scopes,
      message: `Connection verified. Active scopes: ${scopes.join(', ')}.`,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: `Connection test failed: ${err instanceof Error ? err.message : 'Network error'}. Check your connection and try again.`,
    });
  }
}
