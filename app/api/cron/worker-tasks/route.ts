/**
 * GET /api/cron/worker-tasks
 *
 * Cron job — runs every 15 minutes via Vercel cron.
 * Checks for worker tasks that are due and executes them.
 *
 * Secured by Vercel's CRON_SECRET header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAndRunDueTasks } from '@/lib/tasks/task-scheduler';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min max — tasks can be long-running

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[worker-tasks cron] Starting task check...');

  try {
    const result = await checkAndRunDueTasks();

    console.log(
      `[worker-tasks cron] Done. Checked ${result.tasksChecked}, ran ${result.tasksRun}.`
    );

    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[worker-tasks cron] Error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
