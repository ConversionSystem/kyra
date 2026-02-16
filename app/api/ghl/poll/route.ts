// ============================================================================
// GET /api/ghl/poll — Message Polling Endpoint
//
// Replaces webhook dependency. Polls GHL Conversations API for new inbound
// messages and processes them through AI. Called by Vercel Cron every minute.
//
// No webhooks needed. No GHL workflow needed. No marketplace approval needed.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { pollAllClients } from '@/lib/ghl/poller';

// Vercel cron config — run every minute
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for processing

export async function GET(request: NextRequest) {
  // ── Auth: Vercel Cron or API secret ─────────────────────────────────
  const authHeader = request.headers.get('authorization');
  const apiSecret = process.env.KYRA_API_SECRET;
  const cronSecret = process.env.CRON_SECRET;

  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  // Manual calls use Authorization: Bearer <KYRA_API_SECRET>
  const bearerToken = authHeader?.replace('Bearer ', '');
  const isAuthorized =
    (bearerToken && apiSecret && bearerToken === apiSecret) ||
    (bearerToken && cronSecret && bearerToken === cronSecret);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[ghl/poll] Starting poll cycle...');

  try {
    const results = await pollAllClients();

    const totalProcessed = results.reduce((sum, r) => sum + r.messagesProcessed, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(
      `[ghl/poll] Done. Clients: ${results.length}, Messages processed: ${totalProcessed}, Errors: ${totalErrors}`,
    );

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      clients: results.length,
      messagesProcessed: totalProcessed,
      errors: totalErrors,
      details: results,
    });
  } catch (err) {
    console.error('[ghl/poll] Fatal error:', err);
    return NextResponse.json(
      { error: 'Poll failed', message: String(err) },
      { status: 500 },
    );
  }
}
