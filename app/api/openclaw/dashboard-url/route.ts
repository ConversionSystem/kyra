import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDashboardUrl } from '@/lib/ovh/gateway-resolver';

/**
 * GET /api/openclaw/dashboard-url?clientId=xxx
 *
 * Returns the Gateway Dashboard URL for a client's gateway (OVH per-client isolation).
 * Accepts optional clientId query param to target a specific client.
 * Falls back to the first active client gateway in the user's agency.
 * Token is passed via hash fragment so it never hits server logs.
 *
 * ⚠️ NO FALLBACK — if no client gateway exists, returns 503.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get('clientId');

  try {
    const dashboardUrl = await getDashboardUrl(user.id, clientId);

    if (!dashboardUrl) {
      return NextResponse.json(
        {
          error: 'Gateway not provisioned',
          message: 'No AI gateway found. Deploy a client AI first, then the dashboard will be available.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(dashboardUrl);
  } catch (error) {
    console.error('[dashboard-url] Error resolving gateway:', error);
    return NextResponse.json(
      {
        error: 'Gateway error',
        message: 'Unable to reach the AI gateway. It may be starting up — please try again in a minute.',
      },
      { status: 503 }
    );
  }
}
