// ============================================================================
// POST /api/widget/[clientId]/event
//
// Fire-and-forget event logger for the embedded chat widget. The widget
// script POSTs here when the visitor takes an action worth tracking:
//   - chip_click   (URL chip clicked → leaving the page)
//   - panel_open   (widget panel opened — usually first interaction)
//   - panel_close  (widget panel closed without sending a message)
//
// Events are stored as rows in `client_conversations` with channel='widget_event'
// so we don't need a new migration. The user_message field carries the event
// kind + label (e.g. "click:⚡ LOTUS NOW") and ai_response carries the URL
// or other payload. The Insights endpoint aggregates these into the
// "Top clicked chips" card.
//
// CORS: public (widget is embedded on external sites).
// Rate-limited per-IP to prevent log-spam abuse.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { isRateLimited } from '@/lib/rate-limit';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  // Per-IP rate limit — same window as the chat endpoint
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  if (await isRateLimited(`widget-event:${ip}`, 120, 60_000)) {
    return NextResponse.json({ ok: false, reason: 'rate_limit' }, { status: 429, headers: CORS });
  }

  const { clientId } = await params;
  if (!clientId) {
    return NextResponse.json({ ok: false }, { status: 400, headers: CORS });
  }

  let body: { event?: string; label?: string; url?: string; sessionId?: string } = {};
  try { body = await request.json(); } catch { /* tolerate empty */ }

  const event = (body.event || '').slice(0, 40);
  const label = (body.label || '').slice(0, 120);
  const url = (body.url || '').slice(0, 500);

  if (!event) {
    return NextResponse.json({ ok: false, reason: 'missing_event' }, { status: 400, headers: CORS });
  }

  // Resolve agency_id from the client. Reject if not found — prevents
  // unauthenticated event logging against arbitrary client IDs.
  const supabase = getSupabase();
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, agency_id')
    .eq('id', clientId)
    .single();
  if (!client) {
    return NextResponse.json({ ok: false, reason: 'unknown_client' }, { status: 404, headers: CORS });
  }

  // Insert as a "synthetic" conversation row with channel='widget_event'.
  // user_message = "<event>:<label>" so aggregations group cleanly.
  // ai_response = the URL (when relevant) for click-through analysis.
  // session_id ties the event to the visitor's conversation for funnel attribution.
  //
  // AWAITED on purpose (was fire-and-forget — caused telemetry loss).
  // Vercel kills the function the moment we return, and `void promise`
  // doesn't keep the runtime alive. Worst case the visitor waits ~50ms;
  // the widget calls this via sendBeacon anyway so there's no UI block.
  const sessionId = (body.sessionId || '').slice(0, 80) || null;
  const { error: insertErr } = await supabase
    .from('client_conversations')
    .insert({
      client_id: clientId,
      agency_id: (client as { agency_id: string }).agency_id,
      channel: 'widget_event',
      user_message: `${event}:${label}`.slice(0, 200),
      ai_response: url,
      tokens_used: 0,
      session_id: sessionId,
    });
  if (insertErr) {
    console.warn(`[widget/event] insert failed: ${insertErr.message}`);
    // Don't surface a 500 — the widget UX shouldn't break because
    // analytics are momentarily down. Return ok:false for visibility.
    return NextResponse.json({ ok: false, reason: 'insert_failed' }, { status: 200, headers: CORS });
  }

  return NextResponse.json({ ok: true }, { headers: CORS });
}
