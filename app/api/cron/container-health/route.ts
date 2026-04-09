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
    .select('id, name, container_config, gateway_status')
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
      const cfg = (client.container_config as Record<string, unknown>) ?? {};
      const gatewayUrl = cfg.gateway_url as string | undefined;

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
