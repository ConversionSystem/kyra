// ============================================================================
// GET /api/cron/seo/publish-queue
//
// Hourly cron — processes the seo_publish_queue table.
// Publishes pending content to Telegraph, WordPress, etc.
//
// Auth: CRON_SECRET bearer token (Vercel cron).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { processQueue } from '@/lib/seo/publish-scheduler';
import { requireCron } from '@/lib/auth/cron';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request);
  if (unauthorized) return unauthorized;

  const result = await processQueue(10);

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
