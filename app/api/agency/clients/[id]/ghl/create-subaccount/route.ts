/**
 * POST /api/agency/clients/[id]/ghl/create-subaccount
 *
 * Creates a free GHL sub-account under the master agency for this client.
 * Only works if GHL_AGENCY_API_KEY is set.
 * Saves the location_id to the client record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { createGhlSubAccount } from '@/lib/ghl/agency-api';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;

  // Auth check
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  if (!process.env.GHL_AGENCY_API_KEY) {
    return NextResponse.json({ error: 'GHL integration not configured. Contact support.' }, { status: 500 });
  }

  const db = createServiceClientWithoutCookies();
  const { agency } = result.data;

  // Get the client and verify ownership
  const { data: client, error: clientError } = await db
    .from('agency_clients')
    .select('id, name, agency_id, ghl_location_id')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Already has a GHL sub-account
  if (client.ghl_location_id) {
    return NextResponse.json({
      error: 'This client already has a GHL sub-account connected.',
      locationId: client.ghl_location_id,
    }, { status: 409 });
  }

  try {
    const subAccount = await createGhlSubAccount({
      name: client.name || `Client ${clientId.substring(0, 8)}`,
      country: 'US',
    });

    // Save location_id to client
    await db
      .from('agency_clients')
      .update({ ghl_location_id: subAccount.id })
      .eq('id', clientId);

    console.log(`[ghl-create] ✅ Created sub-account ${subAccount.id} for client ${clientId} (${client.name})`);

    return NextResponse.json({
      ok: true,
      locationId: subAccount.id,
      message: `GHL sub-account created for ${client.name}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ghl-create] ❌ Failed for client ${clientId}:`, msg);
    return NextResponse.json({ error: `Failed to create sub-account: ${msg}` }, { status: 500 });
  }
}
