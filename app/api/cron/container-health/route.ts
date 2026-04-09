/**
 * GET /api/cron/container-health
 *
 * Runs every 5 minutes. Checks all "running" containers are actually healthy
 * by hitting their OpenClaw health endpoint. Sends a Telegram alert if any fail.
 * Silent on success.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const HEALTH_TIMEOUT_MS = 5000;

export async function GET(request: NextRequest) {
  // Auth: Vercel CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Get all running containers with their gateway URLs
  const { data: clients, error: clientErr } = await supabase
    .from('agency_clients')
    .select('id, name, container_config, gateway_status, gateway_url')
    .eq('gateway_status', 'running');

  if (clientErr || !clients) {
    return NextResponse.json({ error: clientErr?.message || 'Failed to query' }, { status: 500 });
  }

  if (clients.length === 0) {
    return NextResponse.json({ ok: true, checked: 0 });
  }

  // Health-check each container in parallel
  const failures: Array<{ name: string; id: string; reason: string }> = [];

  await Promise.all(
    clients.map(async (client) => {
      // gateway_url is a column on agency_clients, NOT in container_config
      const gatewayUrl = (client as Record<string, unknown>).gateway_url as string | undefined;

      if (!gatewayUrl) {
        failures.push({ name: client.name, id: client.id, reason: 'No gateway_url configured' });
        return;
      }

      try {
        const res = await fetch(`${gatewayUrl}/__openclaw__/health`, {
          signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
        });
        if (!res.ok) {
          failures.push({ name: client.name, id: client.id, reason: `HTTP ${res.status}` });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const reason = msg.includes('timeout') || msg.includes('abort')
          ? 'Timeout (5s)'
          : `Network error: ${msg.slice(0, 80)}`;
        failures.push({ name: client.name, id: client.id, reason });
      }
    }),
  );

  // ── Check for clients stuck in 'setup' > 10 minutes ──────────────────────
  const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: stuckClients } = await supabase
    .from('agency_clients')
    .select('id, name, created_at')
    .eq('status', 'setup')
    .lt('created_at', tenMinutesAgo);

  if (stuckClients && stuckClients.length > 0) {
    // Mark stuck clients as 'failed' so the dashboard can show a retry button
    for (const sc of stuckClients) {
      await supabase
        .from('agency_clients')
        .update({ status: 'failed', gateway_status: 'failed' })
        .eq('id', sc.id)
        .eq('status', 'setup'); // guard against race
      console.warn(`[container-health] Client ${sc.id} (${sc.name}) stuck in setup > 10min — marked as failed`);
    }

    // Include stuck clients in the alert
    for (const sc of stuckClients) {
      failures.push({ name: sc.name, id: sc.id, reason: 'Stuck in setup > 10 minutes (marked failed)' });
    }
  }

  // If all healthy, silent success
  if (failures.length === 0) {
    return NextResponse.json({ ok: true, checked: clients.length, failures: 0 });
  }

  // Send Telegram alert for failures
  await sendTelegramAlert(failures);

  console.log(`[container-health] ${failures.length}/${clients.length} containers failed health check`);

  return NextResponse.json({
    ok: false,
    checked: clients.length,
    failures: failures.length,
    details: failures,
  });
}

async function sendTelegramAlert(failures: Array<{ name: string; id: string; reason: string }>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
  if (!token || !chatId) return;

  const lines = failures.map(f => `• ${f.name} (${f.id}) — ${f.reason}`);
  const message = [
    `🚨 Container Health Alert`,
    ``,
    `${failures.length} container(s) failed health check:`,
    ...lines,
    ``,
    `Check: kyra.conversionsystem.com/agency`,
  ].join('\n');

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch {
    console.error('[container-health] Failed to send Telegram alert');
  }
}
