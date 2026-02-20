import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveGatewayForUser } from '@/lib/ovh/gateway-resolver';
import { execContainerCommand } from '@/lib/ovh/provisioner';

/**
 * POST /api/openclaw/channels/pair
 * Approve a Telegram (or other channel) pairing request by code.
 *
 * Uses `openclaw pairing approve <channel> <code>` via docker exec
 * instead of calling a non-existent REST API on the gateway.
 *
 * Body: { channel: string, code: string, clientId?: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { channel = 'telegram', code } = body;
    const clientId = body.clientId || request.nextUrl.searchParams.get('clientId');

    if (!code?.trim()) {
      return NextResponse.json({ ok: false, error: { message: 'Pairing code is required' } }, { status: 400 });
    }

    // Extract just the 8-char code if user pasted the full bot message
    const rawCode = code.trim();
    const codeMatch = rawCode.match(/\b([A-Z0-9]{8})\b/i);
    const cleanCode = codeMatch ? codeMatch[1].toUpperCase() : rawCode.toUpperCase();

    const resolved = await resolveGatewayForUser(user.id, clientId);
    if (!resolved) {
      return NextResponse.json({ ok: false, error: { message: 'Gateway not provisioned' } }, { status: 503 });
    }

    // Run: openclaw pairing approve <channel> <code> inside the container
    const result = await execContainerCommand(resolved.clientId, [
      'openclaw', 'pairing', 'approve', channel, cleanCode,
    ]);

    if (!result.ok) {
      const msg = result.stderr || result.stdout || result.error || 'Pairing failed';
      return NextResponse.json({ ok: false, error: { message: msg } }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: `Pairing approved! Your Telegram account is now connected to the bot.`,
      stdout: result.stdout,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: String(error) } }, { status: 500 });
  }
}

/**
 * GET /api/openclaw/channels/pair?clientId=xxx
 * List pending pairing requests for a client's gateway.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get('clientId');

  try {
    const resolved = await resolveGatewayForUser(user.id, clientId);
    if (!resolved) {
      return NextResponse.json({ ok: false, error: { message: 'Gateway not provisioned' } }, { status: 503 });
    }

    // Run: openclaw pairing list <channel> inside the container
    const result = await execContainerCommand(resolved.clientId, [
      'openclaw', 'pairing', 'list', 'telegram',
    ]);

    return NextResponse.json({
      ok: true,
      pairings: result.stdout || '',
      raw: result,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: String(error) } }, { status: 500 });
  }
}
