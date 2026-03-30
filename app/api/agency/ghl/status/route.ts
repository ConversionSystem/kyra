// ============================================================================
// GET /api/agency/ghl/status
//
// Returns the current GHL agency-level connection status.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
  }

  const { data: agency } = await supabase
    .from('agencies')
    .select('ghl_access_token, ghl_company_id, ghl_connected_at, ghl_token_expires_at')
    .eq('id', membership.agency_id)
    .single();

  const connected = !!agency?.ghl_access_token;
  const expiresAt = agency?.ghl_token_expires_at ?? null;
  const isExpired = expiresAt
    ? new Date(expiresAt).getTime() < Date.now()
    : false;

  return NextResponse.json({
    connected,
    companyId: agency?.ghl_company_id ?? null,
    connectedAt: agency?.ghl_connected_at ?? null,
    expiresAt,
    isExpired: connected ? isExpired : false,
  });
}
