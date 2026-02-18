/**
 * POST /api/agency/gateway/restart
 *
 * Restarts the agency's OpenClaw Gateway machine.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { restartGateway } from '@/lib/fly/provisioner';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: member } = await supabase
      .from('agency_members')
      .select('agency_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 });
    }

    if (!['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Only owners/admins can restart gateways' }, { status: 403 });
    }

    const result = await restartGateway(member.agency_id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Gateway restarting. It takes ~2-3 minutes for the AI engine to fully boot.',
    });
  } catch (error) {
    console.error('[api/gateway-restart] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
