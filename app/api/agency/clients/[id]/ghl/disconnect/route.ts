// ============================================================================
// POST /api/agency/clients/[id]/ghl/disconnect
//
// Disconnects a client's GHL sub-account by clearing stored tokens.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify client exists and user has access
  const { data: agencyClient } = await supabase
    .from('agency_clients')
    .select('id, agency_id')
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
    return NextResponse.json(
      { error: 'You do not have access to this client' },
      { status: 403 },
    );
  }

  // Clear GHL tokens
  const { error } = await supabase
    .from('agency_clients')
    .update({
      ghl_access_token: null,
      ghl_refresh_token: null,
      ghl_location_id: null,
      ghl_connected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId);

  if (error) {
    console.error('[ghl/disconnect] Failed to clear tokens:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
