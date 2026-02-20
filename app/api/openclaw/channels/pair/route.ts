import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveGatewayForUser } from '@/lib/ovh/gateway-resolver';

/**
 * POST /api/openclaw/channels/pair
 * Approve a pairing request by code on a client's gateway (OVH per-client isolation).
 * Body: { channel: string, code: string, clientId?: string }
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

    const res = await fetch(`${resolved.url}/channels/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    return NextResponse.json(await res.json());
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: String(error) } }, { status: 500 });
  }
}

/**
 * GET /api/openclaw/channels/pair?clientId=xxx
 * List pending pairing requests on a client's gateway.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get('clientId');

  try {
    const resolved = await resolveGatewayForUser(user.id, clientId);
    if (!resolved) return NextResponse.json({ ok: false, error: { message: 'Gateway not provisioned' } }, { status: 503 });

    const res = await fetch(`${resolved.url}/channels/pairings`, {
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await res.json());
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: String(error) } }, { status: 500 });
  }
}
