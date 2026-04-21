/**
 * GET /api/cron/container-health
 *
 * Runs every 5 minutes. Two-way health sync:
 * 1. Checks "running" containers are actually healthy → marks failed ones as "error"
 * 2. Re-checks "error" containers → self-heals recovered ones back to "running"
 * 
 * Sends Telegram alerts for new failures AND recoveries.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { requireCron } from '@/lib/auth/cron';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const HEALTH_TIMEOUT_MS = 5000;

async function checkHealth(gatewayUrl: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await fetch(`${gatewayUrl}/__openclaw__/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const reason = msg.includes('timeout') || msg.includes('abort')
      ? 'Timeout (5s)'
      : `Network error: ${msg.slice(0, 80)}`;
    return { ok: false, reason };
  }
}

export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request);
  if (unauthorized) return unauthorized;

  const supabase = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // ── 1. Check "running" containers are still healthy ───────────────────────
  const { data: runningClients, error: runErr } = await supabase
    .from('agency_clients')
    .select('id, name, gateway_status, gateway_url')
    .eq('gateway_status', 'running');

  if (runErr) {
    return NextResponse.json({ error: runErr.message }, { status: 500 });
  }

  const failures: Array<{ name: string; id: string; reason: string }> = [];

  if (runningClients && runningClients.length > 0) {
    await Promise.all(
      runningClients.map(async (client) => {
        const gatewayUrl = (client as Record<string, unknown>).gateway_url as string | undefined;

        if (!gatewayUrl) {
          failures.push({ name: client.name, id: client.id, reason: 'No gateway_url configured' });
          return;
        }

        const result = await checkHealth(gatewayUrl);
        if (!result.ok) {
          failures.push({ name: client.name, id: client.id, reason: result.reason! });

          // Mark as error in DB so it gets re-checked for recovery
          await supabase
            .from('agency_clients')
            .update({
              gateway_status: 'error',
              gateway_error: result.reason,
            })
            .eq('id', client.id)
            .eq('gateway_status', 'running'); // guard against race
          
          console.warn(`[container-health] ${client.name} (${client.id}) failed → marked error: ${result.reason}`);
        }
      }),
    );
  }

  // ── 2. Self-heal: re-check "error" containers for recovery ────────────────
  const { data: errorClients } = await supabase
    .from('agency_clients')
    .select('id, name, gateway_status, gateway_url, gateway_error')
    .eq('gateway_status', 'error');

  const recoveries: Array<{ name: string; id: string }> = [];

  if (errorClients && errorClients.length > 0) {
    await Promise.all(
      errorClients.map(async (client) => {
        const gatewayUrl = (client as Record<string, unknown>).gateway_url as string | undefined;
        if (!gatewayUrl) return; // can't check without a URL

        const result = await checkHealth(gatewayUrl);
        if (result.ok) {
          // Container recovered! Update status back to running
          await supabase
            .from('agency_clients')
            .update({
              gateway_status: 'running',
              gateway_error: null,
            })
            .eq('id', client.id)
            .eq('gateway_status', 'error'); // guard against race

          recoveries.push({ name: client.name, id: client.id });
          console.log(`[container-health] ✅ ${client.name} (${client.id}) recovered → marked running`);
        }
      }),
    );
  }

  // ── 3. Check for clients stuck in 'setup' > 10 minutes ───────────────────
  const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: stuckClients } = await supabase
    .from('agency_clients')
    .select('id, name, created_at')
    .eq('status', 'setup')
    .lt('created_at', tenMinutesAgo);

  if (stuckClients && stuckClients.length > 0) {
    for (const sc of stuckClients) {
      await supabase
        .from('agency_clients')
        .update({ status: 'failed', gateway_status: 'failed' })
        .eq('id', sc.id)
        .eq('status', 'setup'); // guard against race
      console.warn(`[container-health] Client ${sc.id} (${sc.name}) stuck in setup > 10min — marked as failed`);
    }

    for (const sc of stuckClients) {
      failures.push({ name: sc.name, id: sc.id, reason: 'Stuck in setup > 10 minutes (marked failed)' });
    }
  }

  // ── 4. Alerts ─────────────────────────────────────────────────────────────
  if (failures.length > 0) {
    await sendTelegramAlert('failure', failures);
  }

  if (recoveries.length > 0) {
    await sendTelegramRecoveryAlert(recoveries);
  }

  const totalChecked = (runningClients?.length || 0) + (errorClients?.length || 0);

  if (failures.length === 0 && recoveries.length === 0) {
    return NextResponse.json({ ok: true, checked: totalChecked, failures: 0, recoveries: 0 });
  }

  console.log(`[container-health] checked=${totalChecked} failures=${failures.length} recoveries=${recoveries.length}`);

  return NextResponse.json({
    ok: failures.length === 0,
    checked: totalChecked,
    failures: failures.length,
    recoveries: recoveries.length,
    details: { failures, recoveries },
  });
}

async function sendTelegramAlert(
  _type: 'failure',
  items: Array<{ name: string; id: string; reason: string }>,
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
  if (!token || !chatId) return;

  const lines = items.map(f => `• ${f.name} (${f.id}) — ${f.reason}`);
  const message = [
    `🚨 Container Health Alert`,
    ``,
    `${items.length} container(s) failed health check:`,
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

async function sendTelegramRecoveryAlert(
  items: Array<{ name: string; id: string }>,
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
  if (!token || !chatId) return;

  const lines = items.map(r => `• ${r.name} (${r.id})`);
  const message = [
    `✅ Container Recovery`,
    ``,
    `${items.length} container(s) recovered and marked running:`,
    ...lines,
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
    console.error('[container-health] Failed to send Telegram recovery alert');
  }
}
