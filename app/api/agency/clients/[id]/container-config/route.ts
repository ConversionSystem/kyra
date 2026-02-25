// GET /api/agency/clients/:id/container-config
// Returns base64-encoded workspace files + env vars for the Fly.io container.
// Called by the worker/bridge when booting a client's container.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

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
