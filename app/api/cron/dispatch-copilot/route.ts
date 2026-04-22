// ────────────────────────────────────────────────────────────────────────────
// Cron — Dispatcher Copilot
//
// Runs every 15 min (see vercel.json). For each agency_client where
// container_config.dispatch_agent_enabled = true AND
// container_config.dispatch_agent_config.copilot_interval_minutes > 0,
// invoke runCopilot() which persists a dispatch_briefings row.
//
// Auth: requireCron (fails closed if CRON_SECRET unset).
// ────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { requireCron } from '@/lib/auth/cron';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { runCopilot } from '@/lib/agents/copilot';
import type { ToolRiskLevel } from '@/lib/onfleet/tools';
import type { ClientDispatchConfig } from '@/lib/onfleet/types';

export const runtime = 'nodejs';
// Copilot fan-out can touch several tenants; give it headroom.
export const maxDuration = 300;

interface CronResultRow {
  clientId: string;
  outcome: 'success' | 'fallback' | 'error' | 'blocked' | 'budget_exceeded' | 'skipped';
  latencyMs?: number;
  errorDetail?: string;
}

export async function GET(req: NextRequest) {
  const unauthorized = requireCron(req);
  if (unauthorized) return unauthorized;

  const supabase = createServiceClientWithoutCookies();

  // Load candidate clients. We over-fetch (dispatch-enabled) then filter in
  // JS — container_config is JSONB and Supabase's filter DSL on nested bools
  // is awkward for arbitrary paths.
  const { data: clients, error } = await supabase
    .from('agency_clients')
    .select('id, agency_id, name, container_config, settings')
    .not('container_config', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ─── Pass 1: filter eligible clients ────────────────────────────────
  interface EligibleClient {
    clientId: string;
    agencyId: string;
    businessName: string;
    onfleetApiKey: string;
    autoExecuteRiskLevels: ToolRiskLevel[];
  }

  const eligible: EligibleClient[] = [];
  const skipped: CronResultRow[] = [];

  for (const row of clients ?? []) {
    const containerConfig = (row.container_config || {}) as Record<string, unknown>;
    // Accept both boolean `true` and stringy `"true"` (P1.11).
    const enabled =
      containerConfig.dispatch_agent_enabled === true ||
      containerConfig.dispatch_agent_enabled === 'true';
    if (!enabled) continue;

    const agentConfig = (containerConfig.dispatch_agent_config || {}) as Record<string, unknown>;
    const intervalMin = Number(agentConfig.copilot_interval_minutes ?? 0);
    if (!(intervalMin > 0)) continue;

    const settings = (row.settings || {}) as Record<string, unknown>;
    const dispatch = settings.dispatch as Partial<ClientDispatchConfig> | undefined;
    if (!dispatch?.onfleetApiKey) {
      skipped.push({ clientId: row.id, outcome: 'skipped', errorDetail: 'onfleetApiKey missing' });
      continue;
    }

    const autoRaw = Array.isArray(agentConfig.auto_execute_risk_levels)
      ? (agentConfig.auto_execute_risk_levels as unknown[])
      : ['low', 'medium'];
    const autoExecuteRiskLevels = autoRaw.filter(
      (v): v is ToolRiskLevel => v === 'low' || v === 'medium' || v === 'high',
    );

    const businessName = String(
      (containerConfig.business_name as string | undefined)
        || (row.name as string | null | undefined)
        || 'the dispensary',
    );

    eligible.push({
      clientId: row.id,
      agencyId: row.agency_id,
      businessName,
      onfleetApiKey: String(dispatch.onfleetApiKey),
      autoExecuteRiskLevels,
    });
  }

  // ─── Pass 2: run with bounded concurrency (P1.4) ────────────────────
  // Sequential iteration would blow the 300s maxDuration at 7+ tenants
  // (45s per-agent budget × N). Use a small concurrency pool so Anthropic
  // rate limits don't get hit either.
  const CONCURRENCY = 5;
  const results: CronResultRow[] = [...skipped];

  async function worker(client: EligibleClient): Promise<void> {
    try {
      const result = await runCopilot({
        clientId: client.clientId,
        agencyId: client.agencyId,
        businessName: client.businessName,
        onfleetApiKey: client.onfleetApiKey,
        autoExecuteRiskLevels: client.autoExecuteRiskLevels,
        triggerType: 'cron',
      });
      results.push({
        clientId: client.clientId,
        outcome: result.outcome,
        latencyMs: result.latencyMs,
        errorDetail: result.errorDetail,
      });
    } catch (err) {
      results.push({
        clientId: client.clientId,
        outcome: 'error',
        errorDetail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const queue = [...eligible];
  const pool = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      await worker(next);
    }
  });
  await Promise.all(pool);

  return NextResponse.json({ processed: eligible.length, briefings: results });
}
