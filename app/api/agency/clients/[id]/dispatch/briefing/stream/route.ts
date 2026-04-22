// ────────────────────────────────────────────────────────────────────────────
// SSE — Dispatcher Copilot briefing stream
//
// GET /api/agency/clients/[id]/dispatch/briefing/stream
//
// Polls dispatch_briefings every 10s for rows where client_id = :id AND
// expires_at > NOW(). Emits new rows as SSE events (tracked by lastSeenId).
// Heartbeat every 30s. Connection closes cleanly after 10 min.
//
// Auth: requireAgencyMember + client-belongs-to-agency check.
// Route uses `[id]` rather than `[clientId]` because the existing
// /api/agency/clients/[id]/** tree already claims that dynamic segment
// (Next.js forbids sibling dynamic-segment name conflicts). Internally the
// value is treated as clientId.
// ────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { requireClientAccess } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 minutes

const POLL_MS = 10_000;
const HEARTBEAT_MS = 30_000;
const MAX_LIFETIME_MS = 10 * 60 * 1000;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireClientAccess(clientId);
  if (auth.error) {
    return new Response(JSON.stringify({ error: auth.error.message }), {
      status: auth.error.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createServiceClientWithoutCookies();
  const agencyId = auth.data.agency.id;
  const encoder = new TextEncoder();
  const startedAt = Date.now();

  // Track the latest briefing we've sent. We cache BOTH the id and its
  // created_at so a poll tick doesn't need to re-fetch the cursor row on
  // every iteration — which would otherwise race the TTL cleanup and
  // replay rows if the cursor row gets pruned.
  let lastSeenId: string | null = null;
  let lastSeenCreatedAt: string | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      // Initial hello — keeps proxies from buffering.
      safeEnqueue(': connected\n\n');

      const heartbeat = setInterval(() => {
        safeEnqueue(`: heartbeat\n\n`);
      }, HEARTBEAT_MS);

      const poll = setInterval(async () => {
        if (closed) return;
        if (Date.now() - startedAt > MAX_LIFETIME_MS) {
          cleanup();
          return;
        }

        try {
          // Tenant guard on every poll — prevents cross-agency leak even if
          // clientId happens to match another agency's client.
          let query = supabase
            .from('dispatch_briefings')
            .select('id, summary, recommendations, active_route_count, at_risk_count, created_at, expires_at')
            .eq('client_id', clientId)
            .eq('agency_id', agencyId)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: true })
            .limit(10);

          if (lastSeenCreatedAt) {
            // Use the locally-cached timestamp — no extra round-trip. Survives
            // if the cursor row itself gets TTL-pruned between ticks.
            query = query.gt('created_at', lastSeenCreatedAt);
          }

          const { data: rows } = await query;
          for (const row of rows ?? []) {
            safeEnqueue(`data: ${JSON.stringify(row)}\n\n`);
            lastSeenId = row.id as string;
            lastSeenCreatedAt = row.created_at as string;
          }
        } catch (err) {
          console.error('[briefing/stream] poll error:', err);
        }
      }, POLL_MS);

      // Run one poll immediately so the dashboard gets the current briefing
      // without waiting 10 seconds.
      try {
        const { data: initial } = await supabase
          .from('dispatch_briefings')
          .select('id, summary, recommendations, active_route_count, at_risk_count, created_at, expires_at')
          .eq('client_id', clientId)
          .eq('agency_id', agencyId)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1);
        if (initial && initial.length > 0) {
          safeEnqueue(`data: ${JSON.stringify(initial[0])}\n\n`);
          lastSeenId = initial[0].id as string;
          lastSeenCreatedAt = initial[0].created_at as string;
        }
      } catch (err) {
        console.error('[briefing/stream] initial fetch error:', err);
      }

      const lifetime = setTimeout(() => cleanup(), MAX_LIFETIME_MS);

      function cleanup() {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearInterval(poll);
        clearTimeout(lifetime);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
