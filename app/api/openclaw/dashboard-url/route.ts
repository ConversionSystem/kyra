import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDashboardUrl } from '@/lib/openclaw/gateway-resolver';

/**
 * GET /api/openclaw/dashboard-url
 *
 * Returns the Gateway Dashboard URL for the user's agency.
 * Each agency has its own isolated gateway with its own dashboard.
 * Token is passed via hash fragment so it never hits server logs.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const dashboardUrl = await getDashboardUrl(user.id);
    return NextResponse.json(dashboardUrl);
  } catch (error) {
    console.error('[dashboard-url] Error resolving gateway:', error);

    // Fallback to legacy shared gateway
    const baseUrl = process.env.GATEWAY_CUSTOM_DOMAIN || 'https://gateway.conversionsystem.com';
    const token = process.env.OPENCLAW_GATEWAY_TOKEN || '';

    return NextResponse.json({
      url: `${baseUrl}/__openclaw__/#token=${encodeURIComponent(token)}`,
      baseUrl: `${baseUrl}/__openclaw__/`,
      warning: 'Using shared gateway — agency gateway not provisioned',
    });
  }
}
