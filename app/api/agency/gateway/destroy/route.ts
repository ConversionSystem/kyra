/**
 * POST /api/agency/gateway/destroy
 *
 * Destroys a client's gateway. Body: { clientId: string }
 * Updated for OVH per-client architecture.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { destroyClientGateway } from '@/lib/ovh/provisioner';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { clientId } = await request.json();
    if (!clientId) return NextResponse.json({ error: 'clientId is required' }, { status: 400 });

    // Verify ownership
    const { data: member } = await supabase
      .from('agency_members')
      .select('agency_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify client belongs to this agency
    const { data: client } = await supabase
      .from('agency_clients')
      .select('id, agency_id')
      .eq('id', clientId)
      .eq('agency_id', member.agency_id)
      .single();

    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const result = await destroyClientGateway(clientId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/gateway/destroy] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
