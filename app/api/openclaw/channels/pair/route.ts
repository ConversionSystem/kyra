import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const BRIDGE_URL = process.env.KYRA_WORKER_URL || 'https://kyra-gateway.fly.dev';

/**
 * POST /api/openclaw/channels/pair
 * Approve a pairing request by code.
 * Body: { channel: string, code: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const res = await fetch(`${BRIDGE_URL}/channels/pair`, {
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
 * List pending pairing requests.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await fetch(`${BRIDGE_URL}/channels/pairings`, {
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await res.json());
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: String(error) } }, { status: 500 });
  }
}
