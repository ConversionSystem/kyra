/**
 * GET /api/cron/terminal-credits
 * Runs EVERY MINUTE via Vercel cron.
 *
 * Two jobs per run:
 * 1. CREDITS — diff token usage since last run → deduct 1 credit per 2000 new tokens
 * 2. CONVERSATIONS — pull new terminal messages → write to client_conversations
 *    so they show up in the Conversations page
 *
 * IMPORTANT: This file must NOT import anything that transitively imports next/headers.
 * All @/lib imports (credit-engine, byok, server.ts) pull in next/headers → 500 crash.
 * All DB and billing logic is inlined here using only @supabase/supabase-js directly.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET || '';

// Model credit rates — must match lib/billing/model-credits.ts
// (duplicated here to avoid next/headers transitive import)
const MODEL_CREDITS_PER_TURN: Record<string, number> = {
  'gpt-4o-mini':       1,
  'claude-haiku-3-5':  1,
  'gemini-2.0-flash':  1,
  'gpt-4o':            5,
  'claude-sonnet-3-7': 5,
  'claude-sonnet-4-6': 5,
  'gemini-2.0-pro':    5,
  'o3-mini':          10,
  'o1':               10,
  'claude-opus-4-6':  25,
  'gpt-4.5':          25,
  'o3':               25,
};
const DEFAULT_CREDITS_PER_TURN = 1;

// ── Types ─────────────────────────────────────────────────────────────────────

interface GatewayTarget {
  id: string;
  agency_id: string;
  name: string;
  settings: Record<string, unknown>;
  gateway_url: string;
  gateway_token: string;
  table: 'agency_clients' | 'agencies';
  client_id: string | null;
  ai_model: string | null;
}

interface SessionRow {
  key: string;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
}

interface MsgContent { type: string; text?: string }
interface HistoryMessage {
  role: 'user' | 'assistant';
  content: MsgContent[];
  timestamp?: number;
}

// ── OpenClaw HTTP helper ──────────────────────────────────────────────────────

async function invokeGatewayTool(
  gatewayUrl: string,
  authToken: string,
  tool: string,
  args: Record<string, unknown> = {},
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${gatewayUrl.replace(/\/$/, '')}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tool, args }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { ok?: boolean; result?: { details?: Record<string, unknown> } };
    return data?.ok ? (data.result?.details ?? null) : null;
  } catch {
    return null;
  }
}

// ── Inline credit deduction (avoids next/headers transitive import) ───────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deductTerminalCredits(
  supabase: ReturnType<typeof createClient<any>>,
  agencyId: string,
  clientId: string | null,
  credits: number,
  description: string,
) {
  const { data: current } = await supabase
    .from('agency_credits')
    .select('balance, lifetime_used')
    .eq('agency_id', agencyId)
    .single();

  const currentBalance = (current?.balance as number) ?? 0;
  if (currentBalance < credits) return false; // insufficient

  const newBalance = currentBalance - credits;
  const newLifetime = ((current?.lifetime_used as number) ?? 0) + credits;

  const { error } = await supabase
    .from('agency_credits')
    .update({
      balance: newBalance,
      lifetime_used: newLifetime,
      updated_at: new Date().toISOString(),
    })
    .eq('agency_id', agencyId);

  if (error) return false;

  // Log transaction
  await supabase.from('credit_transactions').insert({
    agency_id: agencyId,
    amount: -credits,
    type: 'usage',
    description,
    client_id: clientId,
  });

  return true;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Direct Supabase service client — NO next/headers, NO cookies
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Query BOTH tables — gateway_url is a TOP-LEVEL COLUMN, not inside settings JSONB
  const [{ data: clientRows }, { data: agencyRows }] = await Promise.all([
    supabase
      .from('agency_clients')
      .select('id, agency_id, name, settings, gateway_url, gateway_token, ai_model')
      .not('gateway_url', 'is', null)
      .eq('gateway_status', 'running'),
    supabase
      .from('agencies')
      .select('id, name, settings, gateway_url, gateway_token')
      .not('gateway_url', 'is', null)
      .eq('gateway_status', 'running'),
  ]);

  const allContainers: GatewayTarget[] = [
    ...(clientRows ?? []).map(c => ({
      id: c.id as string,
      agency_id: c.agency_id as string,
      name: c.name as string,
      settings: ((c.settings ?? {}) as Record<string, unknown>),
      gateway_url: c.gateway_url as string,
      gateway_token: c.gateway_token as string,
      table: 'agency_clients' as const,
      client_id: c.id as string,
      ai_model: (c.ai_model as string | null) ?? 'gpt-4o-mini',
    })),
    ...(agencyRows ?? []).map(a => ({
      id: a.id as string,
      agency_id: a.id as string,
      name: `${a.name as string} (Agency Terminal)`,
      settings: ((a.settings ?? {}) as Record<string, unknown>),
      gateway_url: a.gateway_url as string,
      gateway_token: a.gateway_token as string,
      table: 'agencies' as const,
      client_id: null,
      ai_model: 'gpt-4o-mini', // agency terminals bill at base rate
    })),
  ];

  if (allContainers.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'No active gateways' });
  }

  // Pre-fetch BYOK flags — one batch query, no resolveAgencyApiKey (next/headers)
  // skipCredits = true only for PAID BYOK agencies (free plan BYOK still pays credits)
  const PAID_PLANS = new Set(['starter', 'pro', 'scale', 'solo_pro', 'beta']);
  const allAgencyIds = [...new Set(allContainers.map(c => c.agency_id))];
  const { data: byokRows } = await supabase
    .from('agencies')
    .select('id, api_keys, plan')
    .in('id', allAgencyIds);

  const skipCreditsSet = new Set<string>();
  for (const row of byokRows ?? []) {
    const keys = ((row.api_keys ?? {}) as Record<string, unknown>);
    const providers = ['openai', 'anthropic', 'openrouter', 'google'] as const;
    const hasByok = providers.some(p => typeof keys[p] === 'string' && (keys[p] as string).startsWith('sk-'));
    const isPaid = PAID_PLANS.has(row.plan as string);
    if (hasByok && isPaid) {
      skipCreditsSet.add(row.id as string);
    }
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

  // Process all containers in parallel (HTTP tools/invoke is ~200ms each)
  await Promise.all(allContainers.map(async (container) => {
    try {
      const isByok = skipCreditsSet.has(container.agency_id);

      // ── 1. Fetch sessions list → token count ──────────────────────────────
      const sessionsResult = await invokeGatewayTool(
        container.gateway_url, container.gateway_token, 'sessions_list', {},
      ) as { sessions?: SessionRow[] } | null;

      if (!sessionsResult?.sessions) {
        results.skippedUnreachable++;
        return;
      }

      results.checked++;
      const sessions = sessionsResult.sessions;

      // ── 2 + 3. Sync conversations AND bill per turn ───────────────────────
      // Billing is now PER CONVERSATION TURN using the client's selected model rate.
      // This replaces the old token-threshold approach (which missed short conversations).
      const creditsPerTurn = MODEL_CREDITS_PER_TURN[container.ai_model ?? ''] ?? DEFAULT_CREDITS_PER_TURN;
      const lastSyncedTs = (container.settings.terminal_last_synced_ts as number) ?? 0;
      let latestTs = lastSyncedTs;
      let newConversations = 0;
      let newTurns = 0;

      for (const session of sessions) {
        const history = await invokeGatewayTool(
          container.gateway_url, container.gateway_token, 'sessions_history',
          { sessionKey: session.key, limit: 50 },
        ) as { messages?: HistoryMessage[] } | null;

        if (!history?.messages) continue;

        const messages = history.messages;
        for (let i = 0; i < messages.length - 1; i++) {
          const userMsg = messages[i];
          const asstMsg = messages[i + 1];
          if (userMsg.role !== 'user' || asstMsg.role !== 'assistant') continue;

          const ts = userMsg.timestamp ?? 0;
          if (ts <= lastSyncedTs) continue;

          const userText = userMsg.content.find(c => c.type === 'text')?.text ?? '';
          const aiText = asstMsg.content.find(c => c.type === 'text')?.text ?? '';
          if (!userText || !aiText) continue;

          // Record the conversation
          const { error: convErr } = await supabase.from('client_conversations').insert({
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
          newTurns++;
          i++; // consumed assistant message
        }
      }

      results.conversationsLogged += newConversations;

      // ── Deduct credits for new turns (model-rate based) ──────────────────
      if (!isByok && newTurns > 0) {
        const credits = newTurns * creditsPerTurn;
        const ok = await deductTerminalCredits(
          supabase,
          container.agency_id,
          container.client_id,
          credits,
          `Terminal: ${newTurns} turn${newTurns !== 1 ? 's' : ''} × ${creditsPerTurn} credit${creditsPerTurn !== 1 ? 's' : ''} (${container.ai_model ?? 'gpt-4o-mini'}) · ${container.name}`,
        );
        if (ok) {
          results.deducted++;
          results.totalCreditsDeducted += credits;
        }
      } else if (isByok) {
        results.skippedByok++;
      }

      // ── 4. Persist updated state ──────────────────────────────────────────
      await supabase.from(container.table).update({
        settings: {
          ...container.settings,
          terminal_last_checked: new Date().toISOString(),
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
