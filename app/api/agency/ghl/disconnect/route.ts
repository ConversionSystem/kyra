// ============================================================================
// POST /api/agency/ghl/disconnect
//
// Disconnects the agency-level GHL OAuth connection.
// Clears tokens from the agencies table. Does NOT affect per-client connections.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from('agency_members')
    .select('agency_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.json(
      { error: 'Only agency owners and admins can disconnect GHL.' },
      { status: 403 },
    );
  }

  const db = createServiceClientWithoutCookies();
  const { error } = await db
    .from('agencies')
    .update({
      ghl_access_token: null,
      ghl_refresh_token: null,
      ghl_token_expires_at: null,
      ghl_company_id: null,
      ghl_connected_at: null,
      ghl_connected_by: null,
    })
    .eq('id', membership.agency_id);

  if (error) {
    console.error('[ghl/disconnect] Failed:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }

  console.log(`[ghl/disconnect] Agency ${membership.agency_id} disconnected GHL`);
  return NextResponse.json({ ok: true });
}
