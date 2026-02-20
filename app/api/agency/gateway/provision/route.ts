/**
 * POST /api/agency/gateway/provision
 *
 * LEGACY: Agency-level gateway provisioning.
 * In the new OVH architecture, gateways are provisioned per-client automatically
 * when a client is created. This route now returns guidance.
 *
 * For backward compatibility, it can optionally provision gateways for all
 * clients that don't have one yet.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { provisionClientGateway } from '@/lib/ovh/provisioner';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get user's agency
    const { data: member } = await supabase
      .from('agency_members')
      .select('agency_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Only agency owners/admins can provision gateways' }, { status: 403 });
    }

    // Find clients without gateways
    const { data: clients } = await supabase
      .from('agency_clients')
      .select('id, name, container_config')
      .eq('agency_id', member.agency_id)
      .is('gateway_status', null);

    if (!clients || clients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All clients already have gateways provisioned.',
      });
    }

    // Provision gateways for all unprovisioned clients
    const results = [];
    for (const client of clients) {
      const soulMd = (client.container_config as Record<string, unknown>)?.soul_template
        ? String((client.container_config as Record<string, unknown>).soul_template)
        : `You are an AI assistant for "${client.name}".`;

      const result = await provisionClientGateway(client.id, member.agency_id, { soulMd });
      results.push({ clientId: client.id, name: client.name, ...result });
    }

    return NextResponse.json({
      success: true,
      message: `Provisioned gateways for ${results.filter(r => r.success).length}/${results.length} clients.`,
      results,
    });
  } catch (error) {
    console.error('[api/provision] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
