// ============================================================================
// GET /api/agency/clients/[id]/widget-stats/conversations
//
// Drill-down endpoint for the Insights tab. Returns recent conversations
// matching one of several filters so the operator can READ what the bot
// actually said — not just see aggregate counts.
//
// Query params (one filter at a time):
//   - query        : substring match against user_message (top-query drill-down)
//   - fallback=1   : conversations where ai_response triggered fallback pattern
//   - escalation=1 : conversations where user_message hit escalation pattern
//   - session_id   : specific session full transcript (sorted asc)
//   - windowDays   : how far back (default 30)
//   - limit        : max rows (default 20, capped at 100)
//
// Returns: { conversations: [{ user_message, ai_response, created_at,
//   session_id, source_url }], total }
//
// Auth: requireClientAccess (agency members only).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireClientAccess } from '@/lib/agency/middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Same regex shapes as widget-stats route — kept in sync intentionally.
const ESCALATION_PATTERNS = /\b(refund|complain|cancel|dispute|lawsuit|delivery.*late|charged|wrong item|missing|frustrat|broken|talk to (a )?(human|manager|person))\b/i;
const FALLBACK_PATTERNS = /\b((408)\s*\)?\s*[-.]?\s*456[-.]?\s*0420|call us|please give us a call|give us a call|our team can help|reach out to our team|please contact)\b/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireClientAccess(clientId);
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const url = new URL(request.url);
  const queryParam = (url.searchParams.get('query') || '').slice(0, 200);
  const fallbackOnly = url.searchParams.get('fallback') === '1';
  const escalationOnly = url.searchParams.get('escalation') === '1';
  const sessionIdParam = (url.searchParams.get('session_id') || '').slice(0, 80);
  // source: substring match on source_url path — powers the Top Sources
  // drill-down. e.g. ?source=/products/flower → show conversations that
  // started on any flower page.
  const sourceParam = (url.searchParams.get('source') || '').slice(0, 200);
  const windowDays = Math.max(1, Math.min(Number(url.searchParams.get('windowDays')) || 30, 365));
  const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit')) || 20, 100));

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  // Session-specific drill-down — full transcript, ascending
  if (sessionIdParam) {
    const { data: rows } = await supabase
      .from('client_conversations')
      .select('user_message, ai_response, created_at, session_id, source_url, channel')
      .eq('client_id', clientId)
      .eq('session_id', sessionIdParam)
      .order('created_at', { ascending: true })
      .limit(100);
    return NextResponse.json({ conversations: rows ?? [], total: (rows ?? []).length });
  }

  // Everything else: pull a wider net of recent rows then filter in-memory.
  // Avoids server-side LIKE pattern dance + lets us share regex constants
  // with widget-stats. Capped at 1000 rows so the filter stays bounded.
  const { data: poolRows } = await supabase
    .from('client_conversations')
    .select('user_message, ai_response, created_at, session_id, source_url, channel')
    .eq('client_id', clientId)
    .gte('created_at', since.toISOString())
    .neq('channel', 'widget_event')
    .order('created_at', { ascending: false })
    .limit(1000);

  const pool = poolRows ?? [];

  let filtered = pool;
  if (queryParam) {
    const needle = queryParam.toLowerCase();
    filtered = pool.filter(r => (r.user_message || '').toLowerCase().includes(needle));
  } else if (fallbackOnly) {
    filtered = pool.filter(r => FALLBACK_PATTERNS.test(r.ai_response || ''));
  } else if (escalationOnly) {
    filtered = pool.filter(r => ESCALATION_PATTERNS.test(r.user_message || ''));
  } else if (sourceParam) {
    const needle = sourceParam.toLowerCase();
    filtered = pool.filter(r => {
      const src = (r as { source_url?: string }).source_url || '';
      if (!src) return false;
      // Normalize source_url to path for cleaner matching (matches the
      // grouping used by topSources in widget-stats route).
      let path = src.toLowerCase();
      try { path = new URL(src).pathname.toLowerCase() || '/'; } catch { /* keep raw */ }
      return path.includes(needle) || src.toLowerCase().includes(needle);
    });
  }

  const conversations = filtered.slice(0, limit);
  return NextResponse.json({ conversations, total: filtered.length });
}
