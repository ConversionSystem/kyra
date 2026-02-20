import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFirstGatewayByUserId } from '@/lib/ovh/gateway-resolver';

/**
 * GET /api/openclaw/dashboard-url
 *
 * Returns the Gateway Dashboard URL for the agency's first active client.
 * Each client has its own isolated gateway on OVH — this returns the first
 * running one for the agency-level terminal link.
 *
 * ⚠️ NO FALLBACK — if no per-client gateway exists, returns 503.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const gateway = await getFirstGatewayByUserId(user.id);

    if (!gateway) {
      return NextResponse.json(
        {
          error: 'Gateway not provisioned',
          message: 'No active client gateways found. Create a client and provision their AI first.',
        },
        { status: 503 }
      );
    }

    const dashboardUrl = `${gateway.url}/__openclaw__/#token=${encodeURIComponent(gateway.token)}`;

    return NextResponse.json({
      url: dashboardUrl,
      baseUrl: `${gateway.url}/__openclaw__/`,
      clientId: gateway.clientId,
      clientName: gateway.clientName,
    });
  } catch (error) {
    console.error('[dashboard-url] Error resolving gateway:', error);
    return NextResponse.json(
      {
        error: 'Gateway error',
        message: 'Unable to reach AI gateway. It may be starting up — please try again in a minute.',
      },
      { status: 503 }
    );
  }
}
