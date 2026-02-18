import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { invokeTool, OPENCLAW_TOOLS, type OpenClawToolName } from '@/lib/openclaw/client';

/**
 * POST /api/openclaw/tools
 *
 * Invoke any OpenClaw tool from the dashboard.
 * Authenticated agencies can call real OpenClaw tools:
 * web_search, browser, cron, memory, sessions, tts, etc.
 *
 * Body: { tool: string, args?: object, action?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
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

    // Invoke via OpenClaw bridge
    const result = await invokeTool(tool, args || {}, action);

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
