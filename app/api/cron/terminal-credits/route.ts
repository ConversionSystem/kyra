/**
 * GET /api/cron/terminal-credits
 * Runs every 10 minutes via Vercel cron.
 *
 * Charges credits for OpenClaw terminal (gateway) usage.
 * Covers BOTH agency-owned containers (agencies table) and
 * per-client AI worker containers (agency_clients table).
 *
 * Uses the OpenClaw HTTP Tools Invoke API:
 *   POST {gatewayUrl}/tools/invoke  { tool: "sessions_list" }
 * Returns totalTokens per session. We sum them, diff against last known,
 * and deduct 1 credit per CREDIT_TOKENS_THRESHOLD new tokens.
 *
 * PREVIOUS BUGS FIXED:
 * 1. Was querying settings->gateway_url (JSONB) — gateway_url is a TOP-LEVEL column
 * 2. Was only querying agency_clients — missed agency-owned containers in agencies table
 * 3. Was using WebSocket (slow, fragile, 10s timeout per container)
 *    → Replaced with HTTP POST /tools/invoke (fast, reliable, <1s per container)
 */

import { NextResponse } from 'next/server';
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js';
import { deductCredits } from '@/lib/billing/credit-engine';
import { resolveAgencyApiKey } from '@/lib/billing/byok';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET || '';
const CREDIT_TOKENS_THRESHOLD = 2000; // tokens per credit

interface SessionRow {
  key: string;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Query total token usage from an OpenClaw container via HTTP tools invoke API.
 * POST {gatewayUrl}/tools/invoke with tool=sessions_list
 * Returns total tokens across all sessions, or null if unreachable.
 */
async function getContainerTokenUsage(
  gatewayUrl: string,
  authToken: string,
): Promise<number | null> {
  try {
    const url = `${gatewayUrl.replace(/\/$/, '')}/tools/invoke`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tool: 'sessions_list', args: {} }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.ok || !data?.result?.details?.sessions) return null;

    const sessions = data.result.details.sessions as SessionRow[];
    const totalTokens = sessions.reduce((sum: number, s: SessionRow) => {
      const t = s.totalTokens ?? (s.inputTokens ?? 0) + (s.outputTokens ?? 0);
      return sum + (t || 0);
    }, 0);

    return totalTokens;
  } catch {
    return null; // timeout or network error — skip silently
  }
}

type GatewayTarget = {
  id: string;
  agency_id: string;
  name: string;
  settings: Record<string, unknown>;
  gateway_url: string;
  gateway_token: string;
  table: 'agency_clients' | 'agencies';
};

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Query BOTH tables in parallel — gateway_url is a TOP-LEVEL column, not settings JSONB
  const [{ data: clients }, { data: agencyContainers }] = await Promise.all([
    supabase
      .from('agency_clients')
      .select('id, agency_id, name, settings, gateway_url, gateway_token, gateway_status')
      .not('gateway_url', 'is', null)
      .eq('gateway_status', 'running'),
    supabase
      .from('agencies')
      .select('id, name, settings, gateway_url, gateway_token, gateway_status')
      .not('gateway_url', 'is', null)
      .eq('gateway_status', 'running'),
  ]);

  const allContainers: GatewayTarget[] = [
    ...(clients ?? []).map(c => ({
      id: c.id,
      agency_id: c.agency_id,
      name: c.name,
      settings: (c.settings ?? {}) as Record<string, unknown>,
      gateway_url: c.gateway_url as string,
      gateway_token: c.gateway_token as string,
      table: 'agency_clients' as const,
    })),
    ...(agencyContainers ?? []).map(a => ({
      id: a.id,
      agency_id: a.id, // agency's own container — agency_id = their own id
      name: a.name,
      settings: (a.settings ?? {}) as Record<string, unknown>,
      gateway_url: a.gateway_url as string,
      gateway_token: a.gateway_token as string,
      table: 'agencies' as const,
    })),
  ];

  if (allContainers.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'No active gateways' });
  }

  const results = {
    containers: allContainers.length,
    checked: 0,
    deducted: 0,
    skippedByok: 0,
    skippedUnreachable: 0,
    errors: 0,
    totalCreditsDeducted: 0,
  };

  // Process containers in parallel batches of 10 (avoid hammering all at once)
  const BATCH = 10;
  for (let i = 0; i < allContainers.length; i += BATCH) {
    const batch = allContainers.slice(i, i + BATCH);
    await Promise.all(batch.map(async (client) => {
      // BYOK bypass
      const resolved = await resolveAgencyApiKey(client.agency_id).catch(() => null);
      if (resolved?.isByok) {
        results.skippedByok++;
        return;
      }

      try {
        const currentTokens = await getContainerTokenUsage(client.gateway_url, client.gateway_token);

        if (currentTokens === null) {
          results.skippedUnreachable++;
          return;
        }

        results.checked++;

        const lastKnownTokens = (client.settings.terminal_tokens_last_known as number) ?? 0;
        const deltaTokens = Math.max(0, currentTokens - lastKnownTokens);

        // Always save the latest token count
        const newSettings = {
          ...client.settings,
          terminal_tokens_last_known: currentTokens,
          terminal_tokens_last_checked: new Date().toISOString(),
        };

        await supabase
          .from(client.table)
          .update({ settings: newSettings })
          .eq('id', client.id);

        if (deltaTokens < CREDIT_TOKENS_THRESHOLD) return; // Not enough for 1 credit yet

        const creditsToDeduct = Math.floor(deltaTokens / CREDIT_TOKENS_THRESHOLD);

        await deductCredits(client.agency_id, 'chat.message', {
          multiplier: creditsToDeduct,
          clientId: client.table === 'agency_clients' ? client.id : null,
          description: `Terminal: ${deltaTokens.toLocaleString()} tokens → ${creditsToDeduct} credit${creditsToDeduct !== 1 ? 's' : ''} (${client.name})`,
        });

        results.deducted++;
        results.totalCreditsDeducted += creditsToDeduct;

        console.log(`[terminal-credits] ${client.name} (${client.table}): +${deltaTokens} tokens → -${creditsToDeduct} credits`);
      } catch (err) {
        console.error(`[terminal-credits] Error processing ${client.name}:`, err);
        results.errors++;
      }
    }));
  }

  return NextResponse.json({ ok: true, ...results });
}
