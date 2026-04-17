/**
 * GET /api/cron/follow-ups
 *
 * Vercel cron job — runs every hour.
 * Finds and sends all due follow-up messages.
 *
 * Protected by CRON_SECRET to prevent unauthorized access.
 */
import { NextRequest, NextResponse } from 'next/server';
import { processDueFollowUps } from '@/lib/pipeline/follow-up-engine';
import { requireCron } from '@/lib/auth/cron';

export const maxDuration = 60; // Allow up to 60 seconds for processing

export async function GET(req: NextRequest) {
  const unauthorized = requireCron(req);
  if (unauthorized) return unauthorized;

  try {
    const result = await processDueFollowUps();

    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[cron/follow-ups] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
