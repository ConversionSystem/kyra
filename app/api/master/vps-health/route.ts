import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];
const VPS_URL = 'http://192.99.43.7:9090/health';
const VPS_TOKEN = process.env.OVH_PROVISIONER_SECRET ?? 'kyra-provisioner-2026';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
