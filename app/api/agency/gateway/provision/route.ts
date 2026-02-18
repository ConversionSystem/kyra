/**
 * POST /api/agency/gateway/provision
 *
 * Provisions a new isolated OpenClaw Gateway for the user's agency.
 * Creates a Fly.io app, volume, and machine — completely isolated
 * from all other agencies.
 *
 * Requires: FLY_API_TOKEN env var
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { provisionGateway } from '@/lib/fly/provisioner';

export async function POST() {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check FLY_API_TOKEN is configured
    if (!process.env.FLY_API_TOKEN) {
      return NextResponse.json(
        { error: 'Gateway provisioning not configured (missing FLY_API_TOKEN)' },
        { status: 503 }
      );
    }

    // Get user's agency (must be owner or admin)
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
      return NextResponse.json({ error: 'Only agency owners/admins can provision gateways' }, { status: 403 });
    }

    // Check if gateway already exists
    const { data: agency } = await supabase
      .from('agencies')
      .select('gateway_status, gateway_url, gateway_app_name')
      .eq('id', member.agency_id)
      .single();

    if (agency?.gateway_status && !['pending', 'error'].includes(agency.gateway_status)) {
      return NextResponse.json({
        error: `Gateway already ${agency.gateway_status}`,
        gatewayUrl: agency.gateway_url,
        appName: agency.gateway_app_name,
      }, { status: 409 });
    }

    // Provision the gateway
    console.log(`[api/provision] Provisioning gateway for agency ${member.agency_id} (user: ${user.id})`);
    const result = await provisionGateway(member.agency_id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Provisioning failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      appName: result.appName,
      gatewayUrl: result.gatewayUrl,
      message: 'Gateway provisioning started. It takes ~2-3 minutes for the AI engine to fully boot. Check /api/agency/gateway/status for updates.',
    });
  } catch (error) {
    console.error('[api/provision] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
