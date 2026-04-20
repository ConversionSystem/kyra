/**
 * GET /api/cron/idle-containers
 *
 * Runs daily at 4:00 AM UTC. Stops containers that have had
 * ZERO conversations in the last 3 days.
 *
 * - Checks all 'running' containers
 * - If no conversations in 3 days → stop the Docker container + set gateway_status='stopped'
 * - Containers auto-restart when the user opens their dashboard (on-demand provisioning)
 * - Never stops containers for paid plans (starter/pro/scale) — only free tier
 *
 * This prevents idle free-tier containers from burning API credits
 * on heartbeat calls ($3.36/day per idle container).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { requireCron } from '@/lib/auth/cron';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const PROVISIONER_URL = process.env.OVH_PROVISIONER_URL || 'https://provisioner.gw.kyra.conversionsystem.com';
const PROVISIONER_SECRET = process.env.OVH_PROVISIONER_SECRET;
const IDLE_DAYS = 3;

// Plans that are NEVER auto-stopped (paying customers)
const PROTECTED_PLANS = new Set(['starter', 'pro', 'scale', 'solo_pro']);

export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request);
  if (unauthorized) return unauthorized;

  const supabase = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - IDLE_DAYS);

  // Get all running containers
  const { data: clients, error: clientErr } = await supabase
    .from('agency_clients')
    .select('id, name, agency_id, gateway_status')
    .eq('gateway_status', 'running');

  if (clientErr || !clients) {
    return NextResponse.json({ error: clientErr?.message || 'Failed to query' }, { status: 500 });
  }

  // Get conversations in last N days
  const { data: convos } = await supabase
    .from('client_conversations')
    .select('client_id')
    .gte('created_at', cutoff.toISOString());

  const activeClientIds = new Set((convos ?? []).map(c => c.client_id));

  // Get agency plans to protect paid customers
  const agencyIds = [...new Set(clients.map(c => c.agency_id))];
  const { data: agencies } = await supabase
    .from('agencies')
    .select('id, plan')
    .in('id', agencyIds);

  const agencyPlanMap: Record<string, string> = {};
  for (const a of agencies ?? []) agencyPlanMap[a.id] = a.plan || 'free';

  let stopped = 0;
  let skipped = 0;
  let protected_ = 0;
  const results: Array<{ name: string; action: string; reason: string }> = [];

  for (const client of clients) {
    const plan = agencyPlanMap[client.agency_id] || 'free';

    // Skip paid plans
    if (PROTECTED_PLANS.has(plan)) {
      protected_++;
      results.push({ name: client.name, action: 'protected', reason: `Paid plan: ${plan}` });
      continue;
    }

    // Skip active clients
    if (activeClientIds.has(client.id)) {
      skipped++;
      results.push({ name: client.name, action: 'kept', reason: 'Active in last 3 days' });
      continue;
    }

    // Stop idle free container
    try {
      // Stop Docker container on VPS
      await fetch(`${PROVISIONER_URL}/containers/${client.id}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${PROVISIONER_SECRET}` },
        signal: AbortSignal.timeout(10000),
      }).catch(() => {}); // OK if container doesn't exist

      // Update DB status
      await supabase
        .from('agency_clients')
        .update({ gateway_status: 'stopped' })
        .eq('id', client.id);

      stopped++;
      results.push({ name: client.name, action: 'stopped', reason: `Idle ${IDLE_DAYS}+ days, free plan` });
      console.log(`[idle-containers] ✖ Stopped: ${client.name} (idle free)`);
    } catch (err) {
      results.push({ name: client.name, action: 'error', reason: String(err) });
    }
  }

  const summary = {
    ok: true,
    timestamp: new Date().toISOString(),
    totalRunning: clients.length,
    stopped,
    skipped,
    protected: protected_,
    idleDays: IDLE_DAYS,
    results,
  };

  console.log(`[idle-containers] Done: ${stopped} stopped, ${skipped} active, ${protected_} protected`);

  return NextResponse.json(summary);
}
