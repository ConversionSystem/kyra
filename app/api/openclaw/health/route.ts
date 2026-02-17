import { NextResponse } from 'next/server';
import { healthCheck } from '@/lib/openclaw/client';

/**
 * GET /api/openclaw/health
 *
 * Check if the OpenClaw Gateway is running and connected.
 * Used by the dashboard to show gateway status.
 */
export async function GET() {
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
      error: String(error),
    }, { status: 500 });
  }
}
