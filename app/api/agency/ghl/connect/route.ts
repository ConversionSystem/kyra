// ============================================================================
// GET /api/agency/ghl/connect
//
// Initiates agency-level GHL OAuth flow.
// Angel connects once — Kyra gets a company-scoped token that can CREATE
// new sub-accounts for any client.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encodeAgencyOAuthState, buildAgencyAuthorizationUrl } from '@/lib/ghl/agency-oauth';

export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the agency this user belongs to (must be owner or admin)
  const { data: membership } = await supabase
    .from('agency_members')
    .select('agency_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.json(
      { error: 'Only agency owners and admins can connect GHL.' },
      { status: 403 },
    );
  }

  const state = encodeAgencyOAuthState({
    type: 'agency',
    agencyId: membership.agency_id,
    userId: user.id,
    ts: Date.now(),
  });

  const authUrl = buildAgencyAuthorizationUrl(state);
  return NextResponse.redirect(authUrl);
}
