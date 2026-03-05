/**
 * GET /api/cron/terminal-credits
 * Runs EVERY MINUTE via Vercel cron (was: every 10 minutes).
 *
 * Does two things per container per run:
 * 1. CREDITS: Diff token usage since last run → deduct 1 credit per 2000 new tokens
 * 2. CONVERSATIONS: Pull new messages from terminal sessions → log to client_conversations
 *    so they appear in the Conversations page alongside widget/GHL messages
 *
 * Uses OpenClaw HTTP Tools Invoke API:
 *   POST {gatewayUrl}/tools/invoke  { tool: "sessions_list" }   → token counts
 *   POST {gatewayUrl}/tools/invoke  { tool: "sessions_history" } → messages
 *
 * BYOK: uses resolveAgencyApiKey() — agencies with own API keys skip credit deduction
 * (they pay their own LLM costs; we don't double-charge)
 */

import { NextResponse } from 'next/server';
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js';
import { deductCredits } from '@/lib/billing/credit-engine';
// NOTE: Do NOT import resolveAgencyApiKey or createServiceClientWithoutCookies here —
// both transitively import next/headers which crashes in Vercel cron context.
// BYOK check is inlined below using direct Supabase client.

// Use direct Supabase client for all DB ops — avoids next/headers cookies() in cron context
function getDb() {
  return createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET || '';
const CREDIT_TOKENS_THRESHOLD = 2000; // tokens per 1 credit

// ── Types ────────────────────────────────────────────────────────────────────

interface SessionRow {
  key: string;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
}

interface MessageContent { type: string; text?: string }
interface HistoryMessage {
  role: 'user' | 'assistant';
  content: MessageContent[];
  timestamp?: number;
  model?: string;
}

type GatewayTarget = {
  id: string;
  agency_id: string;
  name: string;
  settings: Record<string, unknown>;
  gateway_url: string;
  gateway_token: string;
  table: 'agency_clients' | 'agencies';
  // For agency_clients, this is the client_id. For agencies, null.
  client_id: string | null;
};

// ── OpenClaw HTTP helpers ─────────────────────────────────────────────────────

async function invokeGatewayTool(
  gatewayUrl: string,
  authToken: string,
  tool: string,
  args: Record<string, unknown> = {},
): Promise<unknown | null> {
  try {
    const res = await fetch(`${gatewayUrl.replace(/\/$/, '')}/tools/invoke`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, args }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.ok ? data.result?.details : null;
  } catch {
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getDb();
  const db = supabase; // Same client for conversations insert

  // Query BOTH tables — gateway_url is a TOP-LEVEL COLUMN, not inside settings JSONB
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
      client_id: c.id,
    })),
    ...(agencyContainers ?? []).map(a => ({
      id: a.id,
      agency_id: a.id,
      name: `${a.name} (Agency Terminal)`,
      settings: (a.settings ?? {}) as Record<string, unknown>,
      gateway_url: a.gateway_url as string,
      gateway_token: a.gateway_token as string,
      table: 'agencies' as const,
      client_id: null, // Agency terminals don't have a client_id
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
    conversationsLogged: 0,
    errors: 0,
    totalCreditsDeducted: 0,
  };

  // Pre-fetch BYOK status for all agencies in one query (no resolveAgencyApiKey — see import note)
  const allAgencyIds = [...new Set(allContainers.map(c => c.agency_id))];
  const { data: byokRows } = await supabase
    .from('agencies')
    .select('id, api_keys')
    .in('id', allAgencyIds);

  // Build a Set of agency IDs that have their own provider keys (BYOK)
  const byokMap = new Map<string, true>();
  for (const row of byokRows ?? []) {
    const keys = (row.api_keys as Record<string, unknown>) ?? {};
    const providers = ['openai', 'anthropic', 'openrouter', 'google'] as const;
    if (providers.some(p => keys[p] && String(keys[p]).startsWith('sk-'))) {
      byokMap.set(row.id, true);
    }
  }

  // Process all containers in parallel
  await Promise.all(allContainers.map(async (container) => {
    try {
      // ── BYOK check (inlined — can't import byok.ts/resolveAgencyApiKey, see note above) ──
      // An agency is BYOK if agencies.api_keys has openai/anthropic/openrouter/google key set
      const agencyForByok = byokMap.get(container.agency_id);
      const isByok = agencyForByok != null;

      // ── 1. Fetch token usage + session list ────────────────────────────────
      const sessionsResult = await invokeGatewayTool(
        container.gateway_url, container.gateway_token, 'sessions_list', {}
      ) as { sessions?: SessionRow[] } | null;

      if (!sessionsResult?.sessions) {
        results.skippedUnreachable++;
        return;
      }

      results.checked++;

      const sessions = sessionsResult.sessions;
      const currentTokens = sessions.reduce((sum, s) => {
        return sum + (s.totalTokens ?? (s.inputTokens ?? 0) + (s.outputTokens ?? 0));
      }, 0);

      // ── 2. Deduct credits (skip if BYOK) ───────────────────────────────────
      if (!isByok) {
        const lastKnownTokens = (container.settings.terminal_tokens_last_known as number) ?? 0;
        const deltaTokens = Math.max(0, currentTokens - lastKnownTokens);

        if (deltaTokens >= CREDIT_TOKENS_THRESHOLD) {
          const creditsToDeduct = Math.floor(deltaTokens / CREDIT_TOKENS_THRESHOLD);
          await deductCredits(container.agency_id, 'chat.message', {
            multiplier: creditsToDeduct,
            clientId: container.client_id,
            description: `Terminal: ${deltaTokens.toLocaleString()} tokens → ${creditsToDeduct} credit${creditsToDeduct !== 1 ? 's' : ''} (${container.name})`,
          });
          results.deducted++;
          results.totalCreditsDeducted += creditsToDeduct;
        }
      } else {
        results.skippedByok++;
      }

      // ── 3. Sync terminal conversations → client_conversations ──────────────
      // Pull messages from each session and log any we haven't seen before
      const lastSyncedTs = (container.settings.terminal_last_synced_ts as number) ?? 0;
      let latestTs = lastSyncedTs;
      let newConversations = 0;

      for (const session of sessions) {
        const history = await invokeGatewayTool(
          container.gateway_url, container.gateway_token, 'sessions_history',
          { sessionKey: session.key, limit: 50 }
        ) as { messages?: HistoryMessage[] } | null;

        if (!history?.messages) continue;

        // Find user→assistant pairs that happened AFTER our last sync
        const messages = history.messages;
        for (let i = 0; i < messages.length - 1; i++) {
          const userMsg = messages[i];
          const assistantMsg = messages[i + 1];

          if (userMsg.role !== 'user' || assistantMsg.role !== 'assistant') continue;

          const ts = userMsg.timestamp ?? 0;
          if (ts <= lastSyncedTs) continue; // Already logged

          const userText = userMsg.content.find(c => c.type === 'text')?.text ?? '';
          const aiText = assistantMsg.content.find(c => c.type === 'text')?.text ?? '';

          if (!userText || !aiText) continue;

          // Insert into client_conversations so it shows in the Conversations page
          const { error: convErr } = await db.from('client_conversations').insert({
            agency_id: container.agency_id,
            client_id: container.client_id,
            channel: 'terminal',
            user_message: userText,
            ai_response: aiText,
            session_id: session.key,
            source_url: container.gateway_url,
            created_at: new Date(ts).toISOString(),
          });
          if (!convErr) newConversations++;

          if (ts > latestTs) latestTs = ts;
          i++; // Skip the assistant message (already consumed)
        }
      }

      results.conversationsLogged += newConversations;

      // ── 4. Save updated state ──────────────────────────────────────────────
      await supabase.from(container.table).update({
        settings: {
          ...container.settings,
          terminal_tokens_last_known: currentTokens,
          terminal_tokens_last_checked: new Date().toISOString(),
          terminal_last_synced_ts: latestTs,
        },
      }).eq('id', container.id);

    } catch (err) {
      console.error(`[terminal-credits] Error processing ${container.name}:`, err);
      results.errors++;
    }
  }));

  return NextResponse.json({ ok: true, ...results });
}
