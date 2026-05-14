// ============================================================================
// GET /api/widget/[clientId]/poll
//
// Lightweight long-tail polling endpoint the embedded widget hits every ~6s
// while its panel is open. Returns any agent messages that arrived for this
// session since the cursor. The widget renders them as bubbles labeled with
// the agent's name + a "Team member just joined the chat" notice on the
// first such message.
//
// Query params:
//   - sessionId  (required) — the visitor's session_id
//   - since      (optional ISO timestamp) — return messages strictly after
//     this time. When omitted, returns the most recent agent message (if
//     any) so reloads don't lose context.
//
// Response shape:
//   { messages: [{ id, message, agentName, createdAt }, ...], paused: boolean,
//     cursor: <ISO timestamp of latest message returned, for next poll> }
//
// Cache: no-store. Polling needs fresh reads every time.
// CORS: same-origin-anywhere — widget embeds on external sites.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { fetchAgentMessagesSince, getRecentAgentMessage } from '@/lib/widget/agent-messages';
import { isRateLimited } from '@/lib/rate-limit';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params;
  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400, headers: CORS });
  }

  // Rate limit per (IP + session) — generous because widgets poll every ~6s.
  // 30 req/min is comfortably 2× the expected frequency, and per-session
  // means one chatty visitor can't starve another visitor's pollers.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId')?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400, headers: CORS });
  }
  const rateKey = `widget-poll:${ip}:${sessionId.slice(0, 64)}`;
  if (await isRateLimited(rateKey, 30, 60_000)) {
    // Return 200 with empty messages — widget shouldn't blow up, just back off.
    return NextResponse.json(
      { messages: [], paused: false, cursor: null, throttled: true },
      { headers: { ...CORS, 'Cache-Control': 'no-store' } },
    );
  }

  const sinceParam = url.searchParams.get('since');
  // Default cursor: 30 minutes ago. Long enough to catch recent agent activity
  // on a fresh page reload; short enough to avoid pulling ancient messages.
  const sinceIso = sinceParam && !Number.isNaN(Date.parse(sinceParam))
    ? new Date(sinceParam).toISOString()
    : new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const supabase = getSupabase();

  // Verify client exists (cheap sanity check; avoids leaking info to a
  // pinned random clientId).
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id')
    .eq('id', clientId)
    .single();
  if (!client) {
    return NextResponse.json(
      { messages: [], paused: false, cursor: null, error: 'unknown_client' },
      { headers: { ...CORS, 'Cache-Control': 'no-store' } },
    );
  }

  const messages = await fetchAgentMessagesSince(supabase, {
    clientId,
    sessionId,
    sinceIso,
  });

  // Determine pause status based on the most recent agent activity.
  // (Same window the chat-route gate uses — single source of truth.)
  const recent = await getRecentAgentMessage(supabase, sessionId);
  const paused = !!recent;

  // Latest cursor we should hand back. If there are new messages, advance
  // the cursor to the newest one; otherwise echo the input cursor so the
  // widget doesn't accidentally rewind.
  const lastCreatedAt = messages.length > 0
    ? messages[messages.length - 1].created_at
    : sinceIso;

  return NextResponse.json(
    {
      messages: messages.map(m => ({
        id: m.id,
        message: m.message,
        agentName: m.agent_name,
        createdAt: m.created_at,
      })),
      paused,
      cursor: lastCreatedAt,
    },
    { headers: { ...CORS, 'Cache-Control': 'no-store' } },
  );
}
