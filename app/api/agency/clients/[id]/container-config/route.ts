// GET /api/agency/clients/:id/container-config
// Returns base64-encoded workspace files + env vars for the per-client container.
// Called by the worker/bridge when booting a client's container.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireClientAccess } from '@/lib/agency/middleware';
import { syncIntegrationCredentials } from '@/lib/secrets/sync';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Authenticate with API secret (container → Vercel call)
  const authHeader = req.headers.get('authorization');
  const expectedSecret = process.env.KYRA_API_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClientWithoutCookies();

  const { data: client, error } = await supabase
    .from('agency_clients')
    .select('*, agency:agencies(name, ghl_client_id, ghl_client_secret)')
    .eq('id', id)
    .single();

  if (error || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Build SOUL.md
  const soulMd = client.soul_md || `# SOUL.md — ${client.name}\n\nYou are an AI assistant for ${client.name}. Be helpful and professional.`;

  // Build USER.md
  const userMd = client.user_md || `# USER.md — ${client.name}\n\nBusiness: ${client.name}\nIndustry: ${client.industry || 'General'}`;

  // Build AGENTS.md
  const agentsMd = `# Kyra Agent — ${client.name}
You are an AI worker working for ${client.name}.
Follow the instructions in SOUL.md for personality and behavior.
Use GHL tools to manage the CRM when needed.
`;

  // Encode workspace files as base64
  const workspaceFiles = {
    KYRA_SOUL_MD: Buffer.from(soulMd).toString('base64'),
    KYRA_USER_MD: Buffer.from(userMd).toString('base64'),
    KYRA_AGENTS_MD: Buffer.from(agentsMd).toString('base64'),
  };

  // GHL credentials (if connected)
  const ghlEnv: Record<string, string> = {};
  if (client.ghl_access_token) {
    ghlEnv.GHL_ACCESS_TOKEN = client.ghl_access_token;
    ghlEnv.GHL_REFRESH_TOKEN = client.ghl_refresh_token || '';
    ghlEnv.GHL_LOCATION_ID = client.ghl_location_id || '';
    // Agency-level app credentials
    if (client.agency?.ghl_client_id) {
      ghlEnv.GHL_CLIENT_ID = client.agency.ghl_client_id;
      ghlEnv.GHL_CLIENT_SECRET = client.agency.ghl_client_secret || '';
    }
  }

  return NextResponse.json({
    clientId: client.id,
    clientName: client.name,
    agencyId: client.agency_id,
    status: client.status,
    sessionKey: `agent:client:${client.id}`,
    workspace: workspaceFiles,
    env: ghlEnv,
  });
}

// PATCH /api/agency/clients/:id/container-config
// Merges keys into the client's container_config JSONB column.
// Called from the Setup tab in the dashboard.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // PATCH writes integration credentials (GHL, Stripe, Twilio, etc.) — must be
  // scoped to a client the caller actually owns. Previous check was
  // `requireAgencyMember` with no clientId comparison: any authenticated
  // member could PATCH ANY client's container_config and drop plaintext
  // secrets into someone else's .secrets.env. Closed here.
  const auth = await requireClientAccess(id);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const body = await req.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  // Fetch current container_config
  const { data: client, error: fetchError } = await supabase
    .from('agency_clients')
    .select('container_config')
    .eq('id', id)
    .single();

  if (fetchError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const merged = { ...(client.container_config as Record<string, unknown> || {}), ...body };

  const { error: updateError } = await supabase
    .from('agency_clients')
    .update({ container_config: merged })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }

  // Fire-and-forget: sync integration credentials to the container's .secrets.env
  syncIntegrationCredentials(id, merged as Record<string, unknown>).catch((err) => {
    console.warn('[container-config] Failed to sync integration credentials:', err);
  });

  return NextResponse.json({ ok: true, container_config: merged });
}
