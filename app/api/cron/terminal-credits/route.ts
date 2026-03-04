/**
 * POST /api/cron/terminal-credits
 *
 * Reconcile credits for OpenClaw terminal usage.
 *
 * OpenClaw terminals connect directly to containers via WebSocket — Kyra
 * never sees those messages, so credits are never auto-deducted.
 *
 * This cron runs every 10 minutes and:
 * 1. Lists all active containers (agency_clients with a provisioned gateway)
 * 2. Queries each container's sessions via WebSocket RPC to get total token usage
 * 3. Compares against last-known token count stored in agency_clients.settings
 * 4. Deducts 1 credit per CREDIT_TOKENS_THRESHOLD tokens used since last check
 */

import { NextResponse } from 'next/server';
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js';
import { deductCredits } from '@/lib/billing/credit-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET || '';
// How many tokens = 1 credit for terminal usage
const CREDIT_TOKENS_THRESHOLD = 2000;

interface GatewaySessionRow {
  key: string;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Query sessions.list via WebSocket RPC on an OpenClaw container.
 * Returns total tokens used across all sessions, or null if unreachable.
 */
async function getContainerTokenUsage(
  gatewayUrl: string,
  authToken: string,
): Promise<number | null> {
  // Convert HTTPS gateway URL to WSS for WebSocket connection
  const wsUrl = gatewayUrl.replace(/^https?:\/\//, 'wss://').replace(/\/$/, '');

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 10_000);

    try {
      const ws = new WebSocket(`${wsUrl}`, ['openclaw-v1']);
      let connected = false;
      let reqId: string | null = null;

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string);

          // Handle connect challenge
          if (msg.type === 'event' && msg.method === 'connect.challenge') {
            ws.send(JSON.stringify({
              type: 'req',
              id: crypto.randomUUID(),
              method: 'connect',
              params: { token: authToken },
            }));
            return;
          }

          // Handle connect success
          if (msg.type === 'res' && msg.ok && !connected && !reqId) {
            connected = true;
            reqId = crypto.randomUUID();
            ws.send(JSON.stringify({
              type: 'req',
              id: reqId,
              method: 'sessions.list',
              params: {},
            }));
            return;
          }

          // Handle sessions.list response
          if (msg.type === 'res' && msg.id === reqId) {
            clearTimeout(timeout);
            ws.close();

            if (!msg.ok || !msg.result?.sessions) {
              resolve(null);
              return;
            }

            const sessions = msg.result.sessions as GatewaySessionRow[];
            const totalTokens = sessions.reduce((sum: number, s: GatewaySessionRow) => {
              const t = s.totalTokens ?? (s.inputTokens ?? 0) + (s.outputTokens ?? 0);
              return sum + (t || 0);
            }, 0);

            resolve(totalTokens);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };

      ws.onclose = () => {
        clearTimeout(timeout);
        if (!connected) resolve(null);
      };
    } catch {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get all clients with an active gateway
  const { data: clients } = await supabase
    .from('agency_clients')
    .select('id, agency_id, name, settings')
    .not('settings->gateway_url', 'is', null);

  if (!clients || clients.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'No active gateways' });
  }

  const results = {
    checked: 0,
    deducted: 0,
    errors: 0,
    totalCreditsDeducted: 0,
  };

  for (const client of clients) {
    const settings = (client.settings as Record<string, unknown>) ?? {};
    const gatewayUrl = settings.gateway_url as string | undefined;
    const authToken = settings.gateway_token as string | undefined;

    if (!gatewayUrl || !authToken) continue;

    results.checked++;

    try {
      const currentTokens = await getContainerTokenUsage(gatewayUrl, authToken);

      if (currentTokens === null) {
        // Container unreachable — skip, try next time
        continue;
      }

      const lastKnownTokens = (settings.terminal_tokens_last_known as number) ?? 0;
      const deltaTokens = Math.max(0, currentTokens - lastKnownTokens);

      if (deltaTokens < CREDIT_TOKENS_THRESHOLD) {
        // Not enough new tokens for even 1 credit — save and skip
        await supabase
          .from('agency_clients')
          .update({
            settings: {
              ...settings,
              terminal_tokens_last_known: currentTokens,
              terminal_tokens_last_checked: new Date().toISOString(),
            },
          })
          .eq('id', client.id);
        continue;
      }

      // How many credits to deduct?
      const creditsToDeduct = Math.floor(deltaTokens / CREDIT_TOKENS_THRESHOLD);
      const tokensAccountedFor = creditsToDeduct * CREDIT_TOKENS_THRESHOLD;

      const deductResult = await deductCredits(client.agency_id, 'chat.message', {
        multiplier: creditsToDeduct,
        clientId: client.id,
        description: `Terminal usage: ${deltaTokens.toLocaleString()} tokens (${creditsToDeduct} credit${creditsToDeduct !== 1 ? 's' : ''}) — ${client.name}`,
      });

      // Save new baseline (only account for tokens we charged for)
      await supabase
        .from('agency_clients')
        .update({
          settings: {
            ...settings,
            terminal_tokens_last_known: lastKnownTokens + tokensAccountedFor,
            terminal_tokens_last_checked: new Date().toISOString(),
          },
        })
        .eq('id', client.id);

      results.deducted++;
      results.totalCreditsDeducted += creditsToDeduct;

      console.log(
        `[terminal-credits] ${client.name}: ${deltaTokens} new tokens → ${creditsToDeduct} credits deducted (balance: ${deductResult.newBalance})`,
      );
    } catch (err) {
      console.error(`[terminal-credits] Error processing ${client.name}:`, err);
      results.errors++;
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
