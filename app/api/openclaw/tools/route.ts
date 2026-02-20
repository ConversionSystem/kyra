import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { invokeTool, OPENCLAW_TOOLS } from '@/lib/openclaw/client';
import { resolveGatewayForUser } from '@/lib/ovh/gateway-resolver';

/**
 * POST /api/openclaw/tools
 *
 * Invoke any OpenClaw tool on a client's gateway (OVH per-client isolation).
 * Accepts optional clientId to target a specific client's gateway.
 * Falls back to the first active client gateway in the user's agency.
 *
 * Body: { tool: string, args?: object, action?: string, clientId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tool, args, action, clientId } = body;

    if (!tool || typeof tool !== 'string') {
      return NextResponse.json({ error: 'Missing tool name' }, { status: 400 });
    }

    // Resolve client's gateway — per-client isolation (OVH)
    const resolved = await resolveGatewayForUser(
      user.id,
      clientId || request.nextUrl.searchParams.get('clientId'),
    );
    if (!resolved) {
      return NextResponse.json(
        { ok: false, error: { type: 'gateway_not_provisioned', message: 'No AI gateway found. Deploy a client AI first.' } },
        { status: 503 }
      );
    }
    const { url } = resolved;

    // Invoke via the client's OpenClaw gateway
    const result = await invokeTool(url, tool, args || {}, action);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/openclaw/tools] Error:', error);
    return NextResponse.json(
      { ok: false, error: { type: 'server_error', message: String(error) } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/openclaw/tools
 *
 * List all available OpenClaw tools with descriptions.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tools = Object.entries(OPENCLAW_TOOLS).map(([id, info]) => ({
    id,
    ...info,
  }));

  return NextResponse.json({ tools });
}
