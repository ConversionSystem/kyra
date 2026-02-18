/**
 * GET /api/agency/gateway/status
 *
 * Returns the status of the user's agency gateway.
 * Includes health check data if the gateway is starting/running.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayStatus } from '@/lib/fly/provisioner';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get user's agency
    const { data: member } = await supabase
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 });
    }

    const status = await getGatewayStatus(member.agency_id);
    return NextResponse.json(status);
  } catch (error) {
    console.error('[api/gateway-status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
