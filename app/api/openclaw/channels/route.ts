import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveGatewayUrl } from '@/lib/openclaw/gateway-resolver';

/**
 * GET /api/openclaw/channels
 * Get status of all connected channels for the user's agency gateway.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { url } = await resolveGatewayUrl(user.id);
    const res = await fetch(`${url}/channels/status`, {
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await res.json());
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: String(error) } }, { status: 500 });
  }
}

/**
 * POST /api/openclaw/channels
 * Connect a new channel on the user's agency gateway. Body: { channel: string, config: object }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { url } = await resolveGatewayUrl(user.id);
    const body = await request.json();
    const res = await fetch(`${url}/channels/connect`, {
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
