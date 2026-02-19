// ============================================================================
// GET /api/agency/analytics
//
// Cross-client analytics for the agency dashboard.
// Aggregates ghl_message_log data across all clients.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const url = new URL(request.url);
  const days = Math.min(parseInt(url.searchParams.get('days') || '30'), 90);

  const supabase = createServiceClientWithoutCookies();

  // Get all active clients for this agency
  const { data: clients } = await supabase
    .from('agency_clients')
    .select('id, name, status')
    .eq('agency_id', agency.id)
    .in('status', ['active', 'setup']);

  if (!clients?.length) {
    return NextResponse.json({
      summary: { totalMessages: 0, aiHandled: 0, avgResponseTimeSec: 0, estimatedCostFormatted: '$0.00' },
      dailyMessages: [],
      channelBreakdown: {},
      clientBreakdown: [],
      topContacts: [],
      hourlyDistribution: Array(24).fill(0),
    });
  }

  const clientIds = clients.map(c => c.id);
  const clientNameMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Fetch all messages in date range for agency's clients
  const { data: messages, count } = await supabase
    .from('ghl_message_log')
    .select('*', { count: 'exact' })
    .in('agency_client_id', clientIds)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(5000);

  const allMsgs = messages || [];

  // ── Daily message counts ──────────────────────────────────────────────
  const dailyCounts: Record<string, number> = {};
  for (let d = 0; d < days; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    dailyCounts[date.toISOString().split('T')[0]] = 0;
  }
  allMsgs.forEach(m => {
    const day = m.created_at?.split('T')[0];
    if (day && dailyCounts[day] !== undefined) dailyCounts[day]++;
  });

  // ── Channel breakdown ─────────────────────────────────────────────────
  const channelBreakdown: Record<string, number> = {};
  allMsgs.forEach(m => {
    const ch = m.message_type || 'Unknown';
    channelBreakdown[ch] = (channelBreakdown[ch] || 0) + 1;
  });

  // ── Client breakdown ──────────────────────────────────────────────────
  const clientCounts: Record<string, number> = {};
  allMsgs.forEach(m => {
    clientCounts[m.agency_client_id] = (clientCounts[m.agency_client_id] || 0) + 1;
  });
  const clientBreakdown = Object.entries(clientCounts)
    .map(([id, count]) => ({ id, name: clientNameMap[id] || 'Unknown', messages: count }))
    .sort((a, b) => b.messages - a.messages);

  // ── Top contacts ──────────────────────────────────────────────────────
  const contactCounts: Record<string, { name: string; phone: string | null; count: number; lastAt: string }> = {};
  allMsgs.forEach(m => {
    const key = m.contact_id;
    if (!contactCounts[key]) {
      contactCounts[key] = {
        name: m.contact_name || m.contact_phone || m.contact_email || 'Unknown',
        phone: m.contact_phone,
        count: 0,
        lastAt: m.created_at,
      };
    }
    contactCounts[key].count++;
  });
  const topContacts = Object.entries(contactCounts)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ── Hourly distribution ───────────────────────────────────────────────
  const hourlyDistribution = Array(24).fill(0);
  allMsgs.forEach(m => {
    const h = new Date(m.created_at).getHours();
    hourlyDistribution[h]++;
  });

  // ── Response time stats ───────────────────────────────────────────────
  const responseTimes = allMsgs
    .map(m => m.response_time_ms)
    .filter((t): t is number => t !== null && t > 0);
  const avgResponseTimeMs = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;
  const medianResponseTimeMs = responseTimes.length > 0
    ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)]
    : 0;

  // ── Cost estimation (gpt-4o-mini: $0.15/M input, $0.60/M output) ─────
  let estimatedInputTokens = 0;
  let estimatedOutputTokens = 0;
  allMsgs.forEach(m => {
    estimatedInputTokens += Math.ceil((m.inbound_message?.length || 0) / 4) + 300;
    estimatedOutputTokens += Math.ceil((m.ai_response?.length || 0) / 4);
  });
  const estimatedCostCents = Math.round(
    (estimatedInputTokens * 0.15 / 1_000_000 + estimatedOutputTokens * 0.60 / 1_000_000) * 100
  );

  // ── Today / This Week counts ──────────────────────────────────────────
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const todayCount = allMsgs.filter(m => new Date(m.created_at) >= todayStart).length;
  const weekCount = allMsgs.filter(m => new Date(m.created_at) >= weekStart).length;

  return NextResponse.json({
    summary: {
      totalMessages: count || allMsgs.length,
      today: todayCount,
      thisWeek: weekCount,
      aiHandled: allMsgs.length, // all messages in log were AI-handled
      avgResponseTimeMs,
      avgResponseTimeSec: Math.round(avgResponseTimeMs / 100) / 10,
      medianResponseTimeMs,
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCostCents,
      estimatedCostFormatted: `$${(estimatedCostCents / 100).toFixed(2)}`,
    },
    dailyMessages: Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    channelBreakdown,
    clientBreakdown,
    topContacts,
    hourlyDistribution,
    period: { days, since: since.toISOString() },
  });
}
