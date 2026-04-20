import { NextResponse } from 'next/server';
import { requireMaster } from '@/lib/auth/admin';

const VPS_URL = 'https://provisioner.gw.kyra.conversionsystem.com/health';
const VPS_TOKEN = process.env.OVH_PROVISIONER_SECRET;

export async function GET() {
  const auth = await requireMaster();
  if (!auth.ok) return auth.response;

  if (!VPS_TOKEN) {
    return NextResponse.json(
      { error: 'OVH_PROVISIONER_SECRET env var not configured' },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(VPS_URL, {
      headers: { Authorization: `Bearer ${VPS_TOKEN}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`VPS returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
