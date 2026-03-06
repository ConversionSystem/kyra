import { NextResponse } from 'next/server';
import { healthCheck } from '@/lib/openclaw/client';
import { requireAgencyMember } from '@/lib/agency/middleware';

/**
 * GET /api/openclaw/health
 *
 * Check if the OpenClaw Gateway is running and connected.
 * Used by the dashboard to show gateway status.
 * Requires an authenticated agency member.
 */
export async function GET() {
  // Auth check — must be a logged-in agency member
  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  try {
    const status = await healthCheck();

    if (!status) {
      return NextResponse.json({
        connected: false,
        realOpenClaw: false,
        error: 'Gateway unreachable',
      }, { status: 503 });
    }

    return NextResponse.json({
      connected: status.gatewayConnected,
      realOpenClaw: status.realOpenClaw === true,
      status: status.status,
      activeSessions: status.activeSessions,
      bridge: status.status === 'ok' ? 'healthy' : 'degraded',
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      realOpenClaw: false,
      error: 'Health check failed',
    }, { status: 500 });
  }
}
