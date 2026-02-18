/**
 * POST /api/agency/gateway/destroy
 *
 * Destroys an agency's OpenClaw Gateway and all associated Fly.io resources.
 * Only agency owners can destroy gateways.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { destroyGateway } from '@/lib/fly/provisioner';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get user's agency (owner only)
    const { data: member } = await supabase
      .from('agency_members')
      .select('agency_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 });
    }

    if (member.role !== 'owner') {
      return NextResponse.json({ error: 'Only agency owners can destroy gateways' }, { status: 403 });
    }

    const result = await destroyGateway(member.agency_id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Gateway destroyed' });
  } catch (error) {
    console.error('[api/gateway-destroy] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
