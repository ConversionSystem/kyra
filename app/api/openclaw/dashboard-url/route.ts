import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/openclaw/dashboard-url
 * Returns the Gateway Dashboard URL with embedded auth token.
 * Token is passed via hash fragment so it never hits server logs.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const baseUrl = process.env.GATEWAY_CUSTOM_DOMAIN || 'https://gateway.conversionsystem.com';
  const token = process.env.OPENCLAW_GATEWAY_TOKEN || '';

  return NextResponse.json({
    url: `${baseUrl}/__openclaw__/#token=${encodeURIComponent(token)}`,
    baseUrl: `${baseUrl}/__openclaw__/`,
  });
}
