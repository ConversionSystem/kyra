// POST /api/voice/ghl-sync — Push Kyra's learned knowledge into GHL's Conversation AI agent

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getValidToken } from '@/lib/ghl/api';
import { syncKnowledgeToGHLAgent } from '@/lib/ghl/conversation-ai';
import { getClientPermissions } from '@/lib/agency/permissions';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { clientId } = await req.json();
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  const svc = createServiceClientWithoutCookies();

  // Verify the client belongs to an agency this user is a member of
  const { data: client } = await svc
    .from('agency_clients')
    .select('id, agency_id, ghl_location_id, container_config')
    .eq('id', clientId)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  // Check user is an agency member
  const { data: member } = await svc
    .from('agency_members')
    .select('id')
    .eq('agency_id', client.agency_id)
    .eq('user_id', user.id)
    .single();

  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Check permissions
  const cfg = (client.container_config as Record<string, unknown>) ?? {};
  const permissions = getClientPermissions(cfg);
  if (!permissions.ghl.writeConversationAI) {
    return NextResponse.json(
      { error: 'Conversation AI sync is not enabled for this client. Enable "Sync Training Data" in AI Permissions.' },
      { status: 403 },
    );
  }

  // Get the GHL location ID
  const locationId = (client.ghl_location_id as string) ?? (cfg.ghl_location_id as string) ?? null;

  if (!locationId) {
    return NextResponse.json(
      { error: 'No GHL location ID found. Make sure this client has GHL connected.' },
      { status: 400 },
    );
  }

  // Get a valid GHL token
  let token: string;
  try {
    token = await getValidToken(clientId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to get GHL token';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Run the sync
  const agentId = await syncKnowledgeToGHLAgent(token, locationId, clientId, client.agency_id);

  if (!agentId) {
    return NextResponse.json(
      {
        error:
          'Sync failed. If you see 404 errors, the "Conversation AI" scope may not be enabled on your GHL Private Integration Token. ' +
          'Go to GHL → Settings → Private Integrations → Edit your token → enable "Conversation AI".',
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, agentId });
}
