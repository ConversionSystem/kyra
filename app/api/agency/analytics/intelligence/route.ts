// GET /api/agency/analytics/intelligence
// Returns hero metrics, top workers, recent conversations, and ROI data
// for the Agency Intelligence dashboard.

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

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Parallel: conversations, active workers, all workers, CRM pipeline, voice calls
  const [convosResult, activeWorkersResult, allWorkersResult, crmPipelineResult, voiceResult] = await Promise.all([
    supabase
      .from('client_conversations')
      .select('id, client_id, channel, user_message, ai_response, created_at')
      .eq('agency_id', agency.id)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false }),

    supabase
      .from('agency_clients')
      .select('id, name, industry, gateway_status, usage_this_month, conversations_today')
      .eq('agency_id', agency.id)
      .eq('status', 'active'),

    supabase
      .from('agency_clients')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agency.id),

    // CRM pipeline metrics
    supabase
      .from('crm_deals')
      .select('stage, value')
      .eq('agency_id', agency.id)
      .not('stage', 'in', '(won,lost)'),

    // Voice call metrics
    supabase
      .from('voice_call_logs')
      .select('id, recording_duration, updated_at', { count: 'exact' })
      .eq('agency_id', agency.id)
      .gte('updated_at', since.toISOString()),
  ]);

  const convos = convosResult.data ?? [];
  const workers = activeWorkersResult.data ?? [];
  const openDeals = crmPipelineResult.data ?? [];
  const pipelineValue = openDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const openDealCount = openDeals.length;
  const voiceLogs = voiceResult.data ?? [];
  const voiceCallCount = voiceResult.count ?? voiceLogs.length;
  const voiceTotalSeconds = voiceLogs.reduce((sum, v) => sum + (Number(v.recording_duration) || 0), 0);
  const voiceAvgDurationSeconds = voiceCallCount > 0 ? Math.round(voiceTotalSeconds / voiceCallCount) : 0;

  // ── Channel breakdown ──
  const channelCounts: Record<string, number> = {};
  for (const c of convos) {
    const ch = c.channel ?? 'unknown';
    channelCounts[ch] = (channelCounts[ch] ?? 0) + 1;
  }

  // ── Hero metrics ──
  const totalConversations = convos.length;
  // Each conversation row has a user_message + ai_response = 2 messages
  const totalMessages = totalConversations * 2;
  const activeWorkers = workers.filter(w => w.gateway_status === 'running').length;

  // ── Daily trend ──
  const dailyMap: Record<string, Record<string, number>> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    dailyMap[d.toISOString().slice(0, 10)] = {};
  }
  for (const c of convos) {
    const day = c.created_at.slice(0, 10);
    if (day in dailyMap) {
      dailyMap[day][c.client_id] = (dailyMap[day][c.client_id] ?? 0) + 1;
    }
  }

  // Build client name lookup
  const clientNameMap: Record<string, string> = {};
  for (const w of workers) {
    clientNameMap[w.id] = w.name;
  }

  const trend = Object.entries(dailyMap).map(([date, clients]) => ({
    date,
    total: Object.values(clients).reduce((s, n) => s + n, 0),
    byClient: clients,
  }));

  // ── Top workers ──
  const workerStats: Record<string, { conversations: number; messages: number }> = {};
  for (const c of convos) {
    if (!workerStats[c.client_id]) workerStats[c.client_id] = { conversations: 0, messages: 0 };
    workerStats[c.client_id].conversations++;
    workerStats[c.client_id].messages += 2;
  }

  const topWorkers = workers
    .map(w => ({
      id: w.id,
      name: w.name,
      industry: w.industry,
      status: w.gateway_status ?? 'offline',
      conversations: workerStats[w.id]?.conversations ?? 0,
      messages: workerStats[w.id]?.messages ?? 0,
    }))
    .sort((a, b) => b.conversations - a.conversations);

  // ── Recent conversations (last 10) ──
  const recent = convos.slice(0, 10).map(c => ({
    id: c.id,
    client_id: c.client_id,
    client_name: clientNameMap[c.client_id] ?? 'Unknown',
    channel: c.channel,
    preview: (c.user_message ?? '').slice(0, 120),
    created_at: c.created_at,
  }));

  // ── ROI calculation ──
  // 3 minutes saved per message, $50/hr labor rate
  const minutesSaved = totalMessages * 3;
  const hoursSaved = Math.round(minutesSaved / 60);
  const laborCostSaved = hoursSaved * 50;

  return NextResponse.json({
    days,
    hero: {
      totalConversations,
      totalMessages,
      activeWorkers,
      totalWorkers: allWorkersResult.count ?? workers.length,
    },
    trend,
    topWorkers,
    recent,
    roi: {
      hoursSaved,
      laborCostSaved,
    },
    crm: {
      pipelineValue,
      openDealCount,
    },
    voice: {
      callCount: voiceCallCount,
      totalMinutes: Math.round(voiceTotalSeconds / 60),
      avgDurationSeconds: voiceAvgDurationSeconds,
    },
    channelBreakdown: channelCounts,
    clientNames: clientNameMap,
  });
}
