/**
 * GET /api/agency/gateway/status
 *
 * Returns gateway status for all clients in the user's agency.
 * Updated for OVH per-client architecture.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVpsHealth } from '@/lib/ovh/provisioner';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: member } = await supabase
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!member) return NextResponse.json({ error: 'No agency found' }, { status: 404 });

    // Get all clients with their gateway status
    const { data: clients } = await supabase
      .from('agency_clients')
      .select('id, name, slug, status, gateway_url, gateway_status, gateway_container_id, gateway_error, gateway_provisioned_at')
      .eq('agency_id', member.agency_id)
      .order('created_at', { ascending: false });

    // Get VPS health
    const vpsHealth = await getVpsHealth();

    return NextResponse.json({
      architecture: 'ovh-per-client',
      vps: vpsHealth,
      clients: (clients || []).map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        gateway: {
          url: c.gateway_url,
          status: c.gateway_status || 'not_provisioned',
          containerId: c.gateway_container_id,
          error: c.gateway_error,
          provisionedAt: c.gateway_provisioned_at,
        },
      })),
    });
  } catch (error) {
    console.error('[api/gateway/status] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
