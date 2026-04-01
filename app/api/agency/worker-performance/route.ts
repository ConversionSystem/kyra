// ============================================================================
// GET /api/agency/worker-performance?clientId=xxx
//
// Returns the worker performance scorecard for a specific client.
// Used by the Worker Performance Card in the Insights tab.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';
import { getWorkerScorecard } from '@/lib/ai-workers/performance-tracker';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAgencyAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const clientId = req.nextUrl.searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  try {
    const scorecard = await getWorkerScorecard(clientId);
    return NextResponse.json({ scorecard });
  } catch (err) {
    console.error('[worker-performance] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 });
  }
}
