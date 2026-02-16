// GET: Returns current permissions for a client
// PUT: Updates permissions for a client

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getClientPermissions, DEPLOYMENT_PRESETS, mergePermissions } from '@/lib/agency/permissions';
import type { ClientPermissions, DeploymentMode } from '@/lib/agency/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const supabase = createServiceClientWithoutCookies();
  
  const { data: client, error } = await supabase
    .from('agency_clients')
    .select('container_config')
    .eq('id', clientId)
    .single();
    
  if (error || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
  
  const permissions = getClientPermissions(client.container_config as Record<string, unknown>);
  return NextResponse.json({ permissions, presets: DEPLOYMENT_PRESETS });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const body = await request.json();
  const supabase = createServiceClientWithoutCookies();
  
  // Get current config
  const { data: client, error: fetchError } = await supabase
    .from('agency_clients')
    .select('container_config')
    .eq('id', clientId)
    .single();
    
  if (fetchError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
  
  const currentConfig = (client.container_config || {}) as Record<string, unknown>;
  let newPermissions: ClientPermissions;
  
  if (body.mode && !body.ghl && !body.ai) {
    // Just switching deployment mode preset
    newPermissions = DEPLOYMENT_PRESETS[body.mode as DeploymentMode] || DEPLOYMENT_PRESETS.supervised;
  } else if (body.mode && (body.ghl || body.ai)) {
    // Preset with overrides
    newPermissions = mergePermissions(body.mode as DeploymentMode, body);
  } else {
    // Full permissions object
    newPermissions = body as ClientPermissions;
  }
  
  const updatedConfig = {
    ...currentConfig,
    deploymentMode: newPermissions.mode,
    permissions: newPermissions,
  };
  
  const { error: updateError } = await supabase
    .from('agency_clients')
    .update({
      container_config: updatedConfig,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId);
    
  if (updateError) {
    return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
  }
  
  return NextResponse.json({ permissions: newPermissions, updated: true });
}
