import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveGatewayForUser } from '@/lib/ovh/gateway-resolver';

/**
 * GET /api/openclaw/channels?clientId=xxx
 * Get status of all connected channels for a client's gateway (OVH per-client isolation).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get('clientId');

  try {
    const resolved = await resolveGatewayForUser(user.id, clientId);
    if (!resolved) return NextResponse.json({ ok: false, error: { message: 'Gateway not provisioned' } }, { status: 503 });
    const res = await fetch(`${resolved.url}/channels/status`, {
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await res.json());
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: String(error) } }, { status: 500 });
  }
}

/**
 * POST /api/openclaw/channels
 * Connect a new channel on a client's gateway. Body: { channel: string, config: object, clientId?: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const clientId = body.clientId || request.nextUrl.searchParams.get('clientId');

    const resolved = await resolveGatewayForUser(user.id, clientId);
    if (!resolved) return NextResponse.json({ ok: false, error: { message: 'Gateway not provisioned' } }, { status: 503 });

    const res = await fetch(`${resolved.url}/channels/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    return NextResponse.json(await res.json());
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: String(error) } }, { status: 500 });
  }
}
