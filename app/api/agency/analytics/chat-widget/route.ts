// ============================================================================
// GET /api/agency/analytics/chat-widget
//
// Analytics for the embeddable web chat widget.
// Shows conversations started, messages per session, leads captured,
// response times, and top pages driving engagement.
//
// Query: ?days=7|14|30 &clientId=optional
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
  const days = parseInt(url.searchParams.get('days') || '30', 10);
  const clientId = url.searchParams.get('clientId');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const supabase = createServiceClientWithoutCookies();

  // ── Conversations from web_chat channel ──────────────────────────────────
  let convoQuery = supabase
    .from('client_conversations')
    .select('id, client_id, user_message, ai_response, channel, created_at')
    .eq('agency_id', agency.id)
    .eq('channel', 'web_chat')
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (clientId) {
    convoQuery = convoQuery.eq('client_id', clientId);
  }

  const { data: conversations, error: convoErr } = await convoQuery;

  if (convoErr) {
    console.error('[chat-widget-analytics] Conversations error:', convoErr);
    return NextResponse.json({ error: convoErr.message }, { status: 500 });
  }

  const convos = conversations || [];

  // ── Web Chat Leads ───────────────────────────────────────────────────────
  let leadsTotal = 0;
  let leadsHot = 0;
  let leadsNew = 0;
  let topSources: Record<string, number> = {};

  try {
    let leadQuery = supabase
      .from('web_chat_leads')
      .select('id, urgency, status, source_url, created_at')
      .eq('agency_id', agency.id)
      .gte('created_at', since);

    if (clientId) {
      leadQuery = leadQuery.eq('client_id', clientId);
    }

    const { data: leads } = await leadQuery;

    if (leads) {
      leadsTotal = leads.length;
      leadsHot = leads.filter(l => l.urgency === 'hot').length;
      leadsNew = leads.filter(l => l.status === 'new').length;

      // Top source pages
      for (const lead of leads) {
        if (lead.source_url) {
          try {
            const pathname = new URL(lead.source_url).pathname;
            topSources[pathname] = (topSources[pathname] || 0) + 1;
          } catch {
            topSources[lead.source_url] = (topSources[lead.source_url] || 0) + 1;
          }
        }
      }
    }
  } catch {
    // web_chat_leads table might not exist yet — degrade gracefully
  }

  // ── Compute Analytics ────────────────────────────────────────────────────
  const totalMessages = convos.length;

  // Estimate unique sessions by grouping messages within 30-min windows
  const sessions = new Map<string, { messages: number; firstAt: number; lastAt: number }>();
  for (const c of convos) {
    const clientKey = c.client_id || 'unknown';
    const time = new Date(c.created_at).getTime();

    // Find if there's an active session for this client within 30 min
    let matched = false;
    for (const [key, session] of sessions) {
      if (key.startsWith(clientKey) && time - session.lastAt < 30 * 60 * 1000) {
        session.messages += 1;
        session.lastAt = time;
        matched = true;
        break;
      }
    }

    if (!matched) {
      const sessionKey = `${clientKey}:${time}`;
      sessions.set(sessionKey, { messages: 1, firstAt: time, lastAt: time });
    }
  }

  const totalSessions = sessions.size;
  const avgMessagesPerSession = totalSessions > 0 ? Math.round((totalMessages / totalSessions) * 10) / 10 : 0;

  // Average AI response length
  const avgResponseLength = convos.length > 0
    ? Math.round(convos.reduce((sum, c) => sum + (c.ai_response?.length || 0), 0) / convos.length)
    : 0;

  // Lead conversion rate
  const leadConversionRate = totalSessions > 0
    ? Math.round((leadsTotal / totalSessions) * 1000) / 10
    : 0;

  // Daily breakdown
  const dailyMap: Record<string, { messages: number; sessions: number; leads: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = { messages: 0, sessions: 0, leads: 0 };
  }

  for (const c of convos) {
    const day = new Date(c.created_at).toISOString().split('T')[0];
    if (dailyMap[day]) {
      dailyMap[day].messages++;
    }
  }

  for (const [, session] of sessions) {
    const day = new Date(session.firstAt).toISOString().split('T')[0];
    if (dailyMap[day]) {
      dailyMap[day].sessions++;
    }
  }

  const dailyData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));

  // Get client names for breakdown
  const clientIds = [...new Set(convos.map(c => c.client_id).filter(Boolean))];
  let clientBreakdown: Array<{ clientId: string; clientName: string; messages: number; sessions: number }> = [];

  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from('agency_clients')
      .select('id, name')
      .in('id', clientIds);

    const nameMap = Object.fromEntries((clients || []).map(c => [c.id, c.name]));

    const clientStats: Record<string, { messages: number; sessionIds: Set<string> }> = {};
    for (const c of convos) {
      const cid = c.client_id || 'unknown';
      if (!clientStats[cid]) clientStats[cid] = { messages: 0, sessionIds: new Set() };
      clientStats[cid].messages++;
    }

    clientBreakdown = Object.entries(clientStats).map(([cid, stats]) => ({
      clientId: cid,
      clientName: nameMap[cid] || 'Unknown',
      messages: stats.messages,
      sessions: stats.sessionIds.size || Math.ceil(stats.messages / avgMessagesPerSession) || 1,
    }));
  }

  // Top sources sorted
  const sortedSources = Object.entries(topSources)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([page, count]) => ({ page, count }));

  return NextResponse.json({
    period: { days, since },
    overview: {
      totalMessages,
      totalSessions,
      avgMessagesPerSession,
      avgResponseLength,
      leadsTotal,
      leadsHot,
      leadsNew,
      leadConversionRate,
    },
    daily: dailyData,
    clientBreakdown,
    topSources: sortedSources,
  });
}
