// GET: Returns current permissions for a client
// PUT: Updates permissions for a client

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getClientPermissions, DEPLOYMENT_PRESETS, mergePermissions } from '@/lib/agency/permissions';
import type { ClientPermissions, DeploymentMode } from '@/lib/agency/permissions';

// ── Auth helper: verify user owns this client via agency membership ─────────
async function requireClientAccess(clientId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401 };

  const admin = createServiceClientWithoutCookies();

  const { data: client } = await admin
    .from('agency_clients')
    .select('id, agency_id, container_config')
    .eq('id', clientId)
    .single();

  if (!client) return { error: 'Client not found', status: 404 };

  const { data: member } = await supabase
    .from('agency_members')
    .select('id')
    .eq('agency_id', client.agency_id)
    .eq('user_id', user.id)
    .single();

  if (!member) return { error: 'Access denied', status: 403 };

  return { client, admin };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const result = await requireClientAccess(clientId);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const permissions = getClientPermissions(result.client.container_config as Record<string, unknown>);
  return NextResponse.json({ permissions, presets: DEPLOYMENT_PRESETS });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const result = await requireClientAccess(clientId);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const body = await request.json();
  const currentConfig = (result.client.container_config || {}) as Record<string, unknown>;
  let newPermissions: ClientPermissions;

  if (body.mode && !body.ghl && !body.ai) {
    newPermissions = DEPLOYMENT_PRESETS[body.mode as DeploymentMode] || DEPLOYMENT_PRESETS.supervised;
  } else if (body.mode && (body.ghl || body.ai)) {
    newPermissions = mergePermissions(body.mode as DeploymentMode, body);
  } else {
    newPermissions = body as ClientPermissions;
  }

  const updatedConfig = {
    ...currentConfig,
    deploymentMode: newPermissions.mode,
    permissions: newPermissions,
  };

  const { error: updateError } = await result.admin
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
