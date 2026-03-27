/**
 * POST /api/agent/ghl-tool
 *
 * Proxy endpoint that lets an OpenClaw container call GHL tools.
 * The container calls this endpoint with its client auth token,
 * Kyra authenticates the container, resolves GHL credentials,
 * and executes the tool on the container's behalf.
 *
 * This is Fix B: GHL tools available in the Terminal.
 * The container includes this URL in its openclaw.json as a custom tool endpoint.
 *
 * Auth: Bearer {gateway_token} from the container
 * Body: { tool: string, args: Record<string, unknown> }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { executeTool } from '@/lib/ghl/ghl-tools';
import { getValidToken } from '@/lib/ghl/api';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate via gateway token (container sends this as Bearer)
    const authHeader = req.headers.get('authorization');
    const gatewayToken = authHeader?.replace('Bearer ', '').trim();

    if (!gatewayToken) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401, headers: CORS });
    }

    // Resolve which client this container belongs to
    const supabase = createServiceClientWithoutCookies();
    const { data: client } = await supabase
      .from('agency_clients')
      .select('id, agency_id, name, ghl_location_id, ghl_private_token, ghl_access_token, gateway_token')
      .eq('gateway_token', gatewayToken)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Container not recognized' }, { status: 403, headers: CORS });
    }

    if (!client.ghl_location_id) {
      return NextResponse.json(
        { error: 'GHL not connected for this client. Connect GHL in the client Settings tab.' },
        { status: 400, headers: CORS }
      );
    }

    // Parse tool request
    const body = await req.json();
    const { tool, args = {}, contact_id } = body as {
      tool: string;
      args?: Record<string, unknown>;
      contact_id?: string;
    };

    if (!tool) {
      return NextResponse.json({ error: 'tool is required' }, { status: 400, headers: CORS });
    }

    // Get valid GHL token
    const ghlToken = await getValidToken(client.id).catch(() => null);
    if (!ghlToken) {
      return NextResponse.json(
        { error: 'GHL token unavailable. Re-connect GHL in client Settings.' },
        { status: 503, headers: CORS }
      );
    }

    // Execute the tool
    const result = await executeTool(tool, args, {
      token: ghlToken,
      contactId: (contact_id as string) || (args.contact_id as string) || '',
      locationId: client.ghl_location_id,
      clientId: client.id,
      calendarId: (args.calendar_id as string) || undefined,
      pipelineId: (args.pipeline_id as string) || undefined,
    });

    console.log(`[agent/ghl-tool] ${client.name} → ${tool}:`, result.success ? 'OK' : result.error);

    return NextResponse.json(result, { headers: CORS });
  } catch (err) {
    console.error('[agent/ghl-tool] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Tool execution failed' },
      { status: 500, headers: CORS }
    );
  }
}
