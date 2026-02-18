import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveGatewayUrl } from '@/lib/openclaw/gateway-resolver';

/**
 * POST /api/openclaw/channels/pair
 * Approve a pairing request by code on the user's agency gateway.
 * Body: { channel: string, code: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { url } = await resolveGatewayUrl(user.id);
    const body = await request.json();
    const res = await fetch(`${url}/channels/pair`, {
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
 * GET /api/openclaw/channels/pair
 * List pending pairing requests on the user's agency gateway.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { url } = await resolveGatewayUrl(user.id);
    const res = await fetch(`${url}/channels/pairings`, {
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await res.json());
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: String(error) } }, { status: 500 });
  }
}
