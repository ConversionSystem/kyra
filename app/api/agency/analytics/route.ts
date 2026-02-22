// ============================================================================
// GET /api/agency/analytics
//
// Real analytics from client_conversations table.
// Returns daily conversation counts, escalation rate, proactive greetings,
// channel breakdown, and per-client stats.
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
  const days = Math.min(parseInt(url.searchParams.get('days') || '7'), 90);

  const supabase = createServiceClientWithoutCookies();

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Fetch all conversations in the window
  const { data: convos, error } = await supabase
    .from('client_conversations')
    .select('id, client_id, channel, user_message, ai_response, created_at')
    .eq('agency_id', agency.id)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    // Table may not exist yet
    return NextResponse.json({
      migrationRequired: error.message.includes('does not exist'),
      error: error.message,
      days,
      total: 0,
      escalations: 0,
      proactiveGreetings: 0,
      daily: [],
      byChannel: {},
      byClient: [],
    });
  }

  const all = convos ?? [];
  const total = all.length;

  // Escalations: AI said "I'll flag this for our team"
  const escalations = all.filter(c =>
    c.ai_response?.includes("I'll flag this for our team")
  ).length;

  // Proactive greetings: user_message starts with [NEW CONTACT]
  const proactiveGreetings = all.filter(c =>
    c.user_message?.startsWith('[NEW CONTACT]')
  ).length;

  // Daily breakdown
  const dailyMap: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    dailyMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const c of all) {
    const day = c.created_at.slice(0, 10);
    if (day in dailyMap) dailyMap[day]++;
  }
  const daily = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

  // Channel breakdown
  const byChannel: Record<string, number> = {};
  for (const c of all) {
    byChannel[c.channel] = (byChannel[c.channel] ?? 0) + 1;
  }

  // Per-client breakdown
  const clientMap: Record<string, { count: number; escalations: number; name?: string }> = {};
  for (const c of all) {
    if (!clientMap[c.client_id]) clientMap[c.client_id] = { count: 0, escalations: 0 };
    clientMap[c.client_id].count++;
    if (c.ai_response?.includes("I'll flag this for our team")) {
      clientMap[c.client_id].escalations++;
    }
  }

  // Enrich with client names
  const clientIds = Object.keys(clientMap);
  if (clientIds.length > 0) {
    const { data: clientRows } = await supabase
      .from('agency_clients')
      .select('id, name')
      .in('id', clientIds);
    for (const row of clientRows ?? []) {
      if (clientMap[row.id]) clientMap[row.id].name = row.name;
    }
  }

  const byClient = Object.entries(clientMap)
    .map(([id, stats]) => ({ id, name: stats.name || id.slice(0, 8), ...stats }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    days,
    total,
    escalations,
    proactiveGreetings,
    daily,
    byChannel,
    byClient,
  });
}
