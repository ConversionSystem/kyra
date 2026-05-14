// ============================================================================
// GET /api/agency/clients/[id]/widget-stats?windowDays=7|30|90|all
//
// Comprehensive chat-widget analytics. Splits the data into two streams:
//   - "conversation" rows (channel != widget_event) — used for content
//     analytics: top queries, escalations, hour-of-day, channel mix,
//     bot fallback rate, avg messages per conversation, top categories.
//   - "telemetry" rows (channel = widget_event) — used for funnel + chip
//     click metrics: panel_open, first_message_sent, cards_shown,
//     card_click, chip_click, browse_more.
//
// Funnel: panel_open → first_message_sent → cards_shown → card_click +
// chip_click. Computed as counts; the dashboard renders drop-off rates.
//
// Window: query param `windowDays` accepts 7 | 30 | 90 | all. Default 30.
// All time-series fields adjust to the window.
//
// All access scoped by requireClientAccess (agency members only).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireClientAccess } from '@/lib/agency/middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Patterns shared with the chat route's escalation + fallback detection.
const ESCALATION_PATTERNS = /\b(refund|complain|cancel|dispute|lawsuit|delivery.*late|charged|wrong item|missing|frustrat|broken|talk to (a )?(human|manager|person))\b/i;

// Bot "fallback" replies are the ones that punt to the phone instead of
// answering — measures how often the bot gives up.
const FALLBACK_PATTERNS = /\b((408)\s*\)?\s*[-.]?\s*456[-.]?\s*0420|call us|please give us a call|give us a call|our team can help|reach out to our team|please contact)\b/i;

// Brand keywords for the "top brands" insight — same lift as categories,
// but at the brand level. Each entry:
//   - key:     display name shown in the UI chip
//   - pattern: detection regex (loose enough for casing/typo variations)
//   - search:  literal substring used by the drill-down endpoint. Must be
//              something that actually appears in user messages (matters
//              for stylized spellings like "Stiiizy" — we drill on "stii")
// Conservative on ambiguous tokens: "Select", "Cookies", and "Connected"
// are intentionally excluded because they collide with everyday words
// ("select an option", "are cookies enabled?", "I lost connection") and
// would inflate brand counts with noise.
const BRAND_KEYWORDS: Array<{ key: string; pattern: RegExp; search: string }> = [
  { key: 'Stiiizy',         pattern: /\b(stiiizy|stiizy|stizzy|stizy)\b/i,    search: 'stii' },
  { key: 'Raw Garden',      pattern: /\braw\s*garden\b/i,                     search: 'raw garden' },
  { key: 'Jeeter',          pattern: /\bjeeters?\b/i,                         search: 'jeeter' },
  { key: 'Wyld',            pattern: /\bwyld\b/i,                             search: 'wyld' },
  { key: 'Kiva',            pattern: /\bkiva\b/i,                             search: 'kiva' },
  { key: 'Camino',          pattern: /\bcamino\b/i,                           search: 'camino' },
  { key: 'Plus Gummies',    pattern: /\bplus\s*gumm/i,                        search: 'plus gumm' },
  { key: 'Heavy Hitters',   pattern: /\bheavy\s*hitters?\b/i,                 search: 'heavy hitter' },
  { key: 'Alien Labs',      pattern: /\balien\s*labs?\b/i,                    search: 'alien lab' },
  { key: 'Papa & Barkley',  pattern: /\bpapa\s*(&|and|\+)?\s*barkley\b/i,     search: 'papa' },
  // PAX is short and collides with names; require a product context word.
  { key: 'PAX',             pattern: /\bpax\s+(era|pod|battery|vape|3|plus)\b/i, search: 'pax' },
];

// Category keywords for the "top categories" insight. Matched against
// user_message because parseProductIntent runs in the chat route, not here.
const CATEGORY_KEYWORDS: Array<{ key: string; pattern: RegExp }> = [
  { key: 'flower',     pattern: /\b(flower|bud|nug|prerolls?|joints?|preroll)\b/i },
  { key: 'vape',       pattern: /\b(vape|vapes|cart|cartridges?|pen|disposable|510)\b/i },
  { key: 'edible',     pattern: /\b(edibles?|gummies?|gummys?|chocolates?|candy|candies|brownies?|drinks?)\b/i },
  { key: 'concentrate',pattern: /\b(concentrates?|wax|shatter|rosin|resin|hash|kief|crumble|badder|sugar|sauce)\b/i },
  { key: 'topical',    pattern: /\b(topicals?|cream|lotion|balm|salve|patch|patches)\b/i },
  { key: 'tincture',   pattern: /\b(tincture|drops?|oil|sublingual)\b/i },
  { key: 'accessory',  pattern: /\b(accessor(?:y|ies)|grinder|papers|lighter|battery|charger)\b/i },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireClientAccess(clientId);
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const url = new URL(request.url);
  const windowParam = url.searchParams.get('windowDays') || '30';
  const windowDays = windowParam === 'all' ? 365 * 5 : Math.max(1, Math.min(Number(windowParam) || 30, 365));

  // ── Totals (lifetime + today, not windowed) ────────────────────────────
  const { count: conversations } = await supabase
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: messagesToday } = await supabase
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .gte('created_at', today.toISOString());

  // ── Pull windowed rows (conversations + telemetry) ────────────────────
  // Cap at 2000 rows to bound the query — plenty for any sensible window.
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const { data: recentRows } = await supabase
    .from('client_conversations')
    .select('id, user_message, ai_response, created_at, channel, session_id')
    .eq('client_id', clientId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })
    .limit(2000);

  const allRows = recentRows ?? [];
  const eventRows = allRows.filter(r => r.channel === 'widget_event');
  const rows = allRows.filter(r => r.channel !== 'widget_event');

  // ── Daily volume (windowed) ───────────────────────────────────────────
  // For windows ≤ 30 days we render per-day. For larger windows we render
  // per-week so the chart doesn't become a confetti of tiny bars.
  const bucketDays = windowDays <= 30 ? 1 : windowDays <= 90 ? 7 : 30;
  const buckets = Math.max(1, Math.ceil(windowDays / bucketDays));
  const dailyVolume: Array<{ day: string; count: number }> = [];
  for (let i = buckets - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i * bucketDays);
    const next = new Date(d);
    next.setDate(d.getDate() + bucketDays);
    const count = rows.filter(r => {
      const ts = new Date(r.created_at).getTime();
      return ts >= d.getTime() && ts < next.getTime();
    }).length;
    dailyVolume.push({ day: d.toISOString().slice(0, 10), count });
  }

  // ── Top queries ───────────────────────────────────────────────────────
  const queryCounts = new Map<string, number>();
  for (const r of rows) {
    const msg = (r.user_message || '').trim();
    if (!msg || msg.length < 3) continue;
    queryCounts.set(msg.toLowerCase().slice(0, 60), (queryCounts.get(msg.toLowerCase().slice(0, 60)) ?? 0) + 1);
  }
  const topQueries = Array.from(queryCounts.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ── Escalation count + deflection rate ────────────────────────────────
  const escalationCount = rows.filter(r => ESCALATION_PATTERNS.test(r.user_message || '')).length;
  const totalRecent = rows.length;
  const deflectionRate = totalRecent === 0 ? 0 : Math.round(((totalRecent - escalationCount) / totalRecent) * 100);

  // ── Bot fallback rate (replies that punt to phone) ───────────────────
  // Strong proxy for "bot couldn't answer" — counts how often the AI's
  // response includes the canonical fallback phrases. Operators use this
  // to spot KB gaps in their training doc.
  const fallbackCount = rows.filter(r => FALLBACK_PATTERNS.test(r.ai_response || '')).length;
  const fallbackRate = totalRecent === 0 ? 0 : Math.round((fallbackCount / totalRecent) * 100);

  // ── Channel mix ───────────────────────────────────────────────────────
  const channelMix: Record<string, number> = {};
  for (const r of rows) {
    const ch = r.channel || 'web';
    channelMix[ch] = (channelMix[ch] ?? 0) + 1;
  }

  // ── Hour-of-day histogram + peak hour ─────────────────────────────────
  const hourBuckets = new Array(24).fill(0);
  for (const r of rows) {
    try {
      const h = new Date(r.created_at).getHours();
      if (h >= 0 && h < 24) hourBuckets[h]++;
    } catch { /* skip */ }
  }
  let peakHour = -1;
  let peakHourCount = 0;
  for (let h = 0; h < 24; h++) {
    if (hourBuckets[h] > peakHourCount) {
      peakHourCount = hourBuckets[h];
      peakHour = h;
    }
  }

  // ── Avg messages per conversation (engagement depth) ─────────────────
  // Conversation = sequence of rows sharing the same session_id. Count
  // messages per session, then average across sessions.
  const sessionMsgCounts = new Map<string, number>();
  for (const r of rows) {
    const sid = (r as { session_id?: string }).session_id || 'unknown';
    sessionMsgCounts.set(sid, (sessionMsgCounts.get(sid) ?? 0) + 1);
  }
  const sessionsCount = sessionMsgCounts.size;
  const totalMessages = Array.from(sessionMsgCounts.values()).reduce((a, b) => a + b, 0);
  const avgMessagesPerConv = sessionsCount === 0 ? 0 : Math.round((totalMessages / sessionsCount) * 10) / 10;

  // ── Top categories searched (intent inference from user_message) ─────
  const categoryHits = new Map<string, number>();
  for (const r of rows) {
    const msg = r.user_message || '';
    for (const { key, pattern } of CATEGORY_KEYWORDS) {
      if (pattern.test(msg)) {
        categoryHits.set(key, (categoryHits.get(key) ?? 0) + 1);
      }
    }
  }
  const topCategories = Array.from(categoryHits.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // ── Top brands searched ───────────────────────────────────────────────
  const brandHits = new Map<string, number>();
  for (const r of rows) {
    const msg = r.user_message || '';
    for (const { key, pattern } of BRAND_KEYWORDS) {
      if (pattern.test(msg)) {
        brandHits.set(key, (brandHits.get(key) ?? 0) + 1);
      }
    }
  }
  // Look up the `search` term so the UI can drill into matching
  // conversations even when the brand has a stylized spelling.
  const brandSearchByKey = new Map(BRAND_KEYWORDS.map(b => [b.key, b.search]));
  const topBrands = Array.from(brandHits.entries())
    .map(([brand, count]) => ({ brand, count, search: brandSearchByKey.get(brand) ?? brand.toLowerCase() }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ── Avg session duration (last message - first message per session) ───
  // Skip 1-message sessions (no duration). Cap at 60 minutes to drop the
  // long-tail of sessions that someone left open in a tab.
  const sessionTimes = new Map<string, { first: number; last: number }>();
  for (const r of rows) {
    const sid = (r as { session_id?: string }).session_id;
    if (!sid) continue;
    const ts = new Date(r.created_at).getTime();
    const cur = sessionTimes.get(sid);
    if (!cur) { sessionTimes.set(sid, { first: ts, last: ts }); continue; }
    if (ts < cur.first) cur.first = ts;
    if (ts > cur.last) cur.last = ts;
  }
  const sessionDurations = Array.from(sessionTimes.values())
    .map(({ first, last }) => Math.min(60 * 60 * 1000, last - first))
    .filter(d => d > 0);
  const avgSessionDurationMs = sessionDurations.length === 0 ? 0
    : Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length);
  const avgSessionDurationSec = Math.round(avgSessionDurationMs / 1000);

  // ── Returning visitors — sessions that appear on multiple distinct days ─
  const sessionDays = new Map<string, Set<string>>();
  for (const r of rows) {
    const sid = (r as { session_id?: string }).session_id;
    if (!sid) continue;
    const day = new Date(r.created_at).toISOString().slice(0, 10);
    if (!sessionDays.has(sid)) sessionDays.set(sid, new Set());
    sessionDays.get(sid)!.add(day);
  }
  const returningSessions = Array.from(sessionDays.values()).filter(s => s.size > 1).length;
  const returningRate = sessionTimes.size === 0 ? 0
    : Math.round((returningSessions / sessionTimes.size) * 100);

  // ── Telemetry event aggregations ──────────────────────────────────────
  // We count two things per event kind:
  //   - eventCounts   : raw event volume (one row = one event)
  //   - eventSessions : set of distinct session_ids that fired the event
  // The funnel uses eventSessions (so a single visitor clicking 5 cards
  // in one session counts as 1 "Card clicked", not 5) which keeps the
  // funnel monotonic by construction.
  const eventCounts: Record<string, number> = {};
  const eventSessions: Record<string, Set<string>> = {};
  const chipClickCounts = new Map<string, number>();
  const cardClickCounts = new Map<string, number>();
  for (const r of eventRows) {
    const raw = r.user_message || '';
    const idx = raw.indexOf(':');
    if (idx < 0) continue;
    const eventKind = raw.slice(0, idx);
    const label = raw.slice(idx + 1).trim();
    const sid = (r as { session_id?: string }).session_id || '';
    eventCounts[eventKind] = (eventCounts[eventKind] ?? 0) + 1;
    if (sid) {
      if (!eventSessions[eventKind]) eventSessions[eventKind] = new Set();
      eventSessions[eventKind].add(sid);
    }
    if (eventKind === 'chip_click' && label) {
      chipClickCounts.set(label, (chipClickCounts.get(label) ?? 0) + 1);
    }
    if (eventKind === 'card_click' && label) {
      cardClickCounts.set(label, (cardClickCounts.get(label) ?? 0) + 1);
    }
  }
  const sessionsFor = (k: string) => eventSessions[k]?.size ?? 0;
  const topChipClicks = Array.from(chipClickCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const topCardClicks = Array.from(cardClickCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ── Conversion funnel ────────────────────────────────────────────────
  // Five-stage funnel from widget open → final action, counted as
  // DISTINCT SESSIONS per stage. This guarantees the funnel is monotonic
  // (each later stage <= the earlier one) — a single visitor who clicks
  // five product cards counts once, not five times. Raw event counts are
  // still exposed separately for CTR + clicks-per-session math.
  //
  // Fallback: if session_id is missing on event rows (older events before
  // we wired sessionId through), fall back to raw event count so older
  // dashboards aren't blank.
  const cardsShownEvents = eventRows
    .filter(r => (r.user_message || '').startsWith('cards_shown:'));
  const cardsShownTotal = cardsShownEvents.reduce((sum, r) => {
    const n = Number((r.user_message || '').split(':')[1]);
    return Number.isFinite(n) ? sum + n : sum;
  }, 0);

  const stageCount = (kind: string) => {
    const s = sessionsFor(kind);
    return s > 0 ? s : (eventCounts[kind] ?? 0);
  };
  const funnel = [
    { stage: 'Widget opened',    count: stageCount('panel_open') },
    { stage: 'First message',    count: stageCount('first_message_sent') },
    { stage: 'Cards shown',      count: stageCount('cards_shown') },
    { stage: 'Card clicked',     count: stageCount('card_click') },
    { stage: 'CTA chip clicked', count: stageCount('chip_click') },
  ];

  // ── Cards-to-clicks CTR ───────────────────────────────────────────────
  // CTR uses total cards surfaced (not events) as denominator.
  const cardCTR = cardsShownTotal === 0 ? 0 : Math.round(((eventCounts.card_click ?? 0) / cardsShownTotal) * 100);

  // ── Period-over-period comparison (vs previous window of same length) ─
  // Same query shape, just offset by `windowDays`. We only re-fetch the
  // count + escalation + fallback signals for the prior window — no need
  // to recompute trends / categories / top queries since the UI just
  // shows a delta arrow for headline metrics.
  const prevSince = new Date(Date.now() - 2 * windowDays * 24 * 60 * 60 * 1000);
  const prevUntil = since;
  const { data: prevRows } = await supabase
    .from('client_conversations')
    .select('id, user_message, ai_response, channel')
    .eq('client_id', clientId)
    .gte('created_at', prevSince.toISOString())
    .lt('created_at', prevUntil.toISOString())
    .neq('channel', 'widget_event')
    .limit(2000);
  const prevConv = prevRows ?? [];
  const prevSample = prevConv.length;
  const prevEscalations = prevConv.filter(r => ESCALATION_PATTERNS.test(r.user_message || '')).length;
  const prevFallback = prevConv.filter(r => FALLBACK_PATTERNS.test(r.ai_response || '')).length;
  const prevDeflection = prevSample === 0 ? 0 : Math.round(((prevSample - prevEscalations) / prevSample) * 100);
  const prevFallbackRate = prevSample === 0 ? 0 : Math.round((prevFallback / prevSample) * 100);
  function delta(curr: number, prev: number) {
    if (prev === 0) return curr === 0 ? 0 : 100;
    return Math.round(((curr - prev) / prev) * 100);
  }
  const periodComparison = {
    sampleDelta: delta(totalRecent, prevSample),
    deflectionDelta: delta(deflectionRate, prevDeflection),
    escalationDelta: delta(escalationCount, prevEscalations),
    fallbackDelta: delta(fallbackRate, prevFallbackRate),
    prevSample,
    prevDeflection,
    prevEscalations,
    prevFallbackRate,
  };

  // ── KB-gap drill-down: questions that triggered bot fallback ─────────
  // Show operators the SPECIFIC questions where the bot punted to "call
  // us" — direct signal for what to add to the training doc.
  const fallbackQueryCounts = new Map<string, number>();
  for (const r of rows) {
    if (!FALLBACK_PATTERNS.test(r.ai_response || '')) continue;
    const msg = (r.user_message || '').trim().toLowerCase().slice(0, 80);
    if (!msg) continue;
    fallbackQueryCounts.set(msg, (fallbackQueryCounts.get(msg) ?? 0) + 1);
  }
  const fallbackQueries = Array.from(fallbackQueryCounts.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ── Today's pulse — separate from windowed stats ─────────────────────
  // Live-ish metrics for "what's happening right now": conversations
  // today, escalations today, active sessions in the last hour.
  const todayRows = rows.filter(r => new Date(r.created_at) >= today);
  const todayEscalations = todayRows.filter(r => ESCALATION_PATTERNS.test(r.user_message || '')).length;
  const todayDeflection = todayRows.length === 0 ? 0
    : Math.round(((todayRows.length - todayEscalations) / todayRows.length) * 100);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const activeNow = new Set(
    allRows
      .filter(r => new Date(r.created_at) >= oneHourAgo)
      .map(r => (r as { session_id?: string }).session_id || '')
      .filter(Boolean)
  ).size;

  // ── Source URL breakdown — where visitors start their chats ──────────
  const sourceCounts = new Map<string, number>();
  for (const r of rows) {
    const src = (r as { source_url?: string }).source_url || '';
    if (!src) continue;
    // Normalize to path-only for cleaner grouping (drops protocol + host)
    let path = src;
    try {
      const u = new URL(src);
      path = u.pathname || '/';
    } catch { /* keep raw */ }
    sourceCounts.set(path, (sourceCounts.get(path) ?? 0) + 1);
  }
  const topSources = Array.from(sourceCounts.entries())
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return NextResponse.json({
    // Lifetime stats (unchanged)
    conversations: conversations ?? 0,
    messagesToday: messagesToday ?? 0,
    avgResponseTime: '<3s',
    // Window-scoped stats
    windowDays,
    sampleSize: totalRecent,
    sessionsCount,
    avgMessagesPerConv,
    // Volume + trend
    dailyVolume,
    dailyBucketDays: bucketDays,
    // Content insights
    topQueries,
    topCategories,
    escalationCount,
    deflectionRate,
    fallbackRate,
    fallbackCount,
    channelMix,
    // Hour-of-day
    hourBuckets,
    peakHour,
    peakHourCount,
    // Telemetry funnel
    funnel,
    cardCTR,
    cardsShownTotal,
    totalChipClicks: eventCounts.chip_click ?? 0,
    totalCardClicks: eventCounts.card_click ?? 0,
    totalPanelOpens: eventCounts.panel_open ?? 0,
    totalFirstMessages: eventCounts.first_message_sent ?? 0,
    topChipClicks,
    topCardClicks,
    // v5 additions (2026-05-14): period comparison, KB gaps, today pulse, sources
    periodComparison,
    fallbackQueries,
    todayConversations: todayRows.length,
    todayEscalations,
    todayDeflection,
    activeNow,
    topSources,
    // v6 additions (2026-05-14): brands, session duration, returning visitors
    topBrands,
    avgSessionDurationSec,
    returningSessions,
    returningRate,
    totalSessions: sessionTimes.size,
  });
}
