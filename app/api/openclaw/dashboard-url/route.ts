import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDashboardUrl } from '@/lib/openclaw/gateway-resolver';

/**
 * GET /api/openclaw/dashboard-url
 *
 * Returns the Gateway Dashboard URL for the user's agency.
 * Each agency has its own isolated gateway with its own dashboard.
 * Token is passed via hash fragment so it never hits server logs.
 *
 * ⚠️ NO FALLBACK — if no per-agency gateway exists, returns 503.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const dashboardUrl = await getDashboardUrl(user.id);

    if (!dashboardUrl) {
      return NextResponse.json(
        {
          error: 'Gateway not provisioned',
          message: 'Your AI gateway is being set up. This usually takes 2-3 minutes after signup. Please refresh shortly.',
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
        message: 'Unable to reach your AI gateway. It may be starting up — please try again in a minute.',
      },
      { status: 503 }
    );
  }
}
