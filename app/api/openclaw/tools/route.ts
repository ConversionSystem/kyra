import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { invokeTool, OPENCLAW_TOOLS } from '@/lib/openclaw/client';
import { resolveGatewayUrl } from '@/lib/openclaw/gateway-resolver';

/**
 * POST /api/openclaw/tools
 *
 * Invoke any OpenClaw tool on the user's agency gateway.
 * Each agency's tools run on their own isolated gateway.
 *
 * Body: { tool: string, args?: object, action?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tool, args, action } = body;

    if (!tool || typeof tool !== 'string') {
      return NextResponse.json({ error: 'Missing tool name' }, { status: 400 });
    }

    // Resolve agency's gateway
    const { url } = await resolveGatewayUrl(user.id);

    // Invoke via the agency's OpenClaw bridge
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
