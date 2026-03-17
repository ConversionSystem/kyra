// GET /api/agency/clients/[id]/usage
// Returns: messages today/week/month, estimated token cost, avg response time

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: clientId } = await params;
  const supabase = createServiceClientWithoutCookies();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [todayResult, weekResult, monthResult] = await Promise.all([
    supabase
      .from('ghl_message_log')
      .select('id, response_time_ms, inbound_message, ai_response', { count: 'exact' })
      .eq('agency_client_id', clientId)
      .gte('created_at', todayStart),
    supabase
      .from('ghl_message_log')
      .select('id, response_time_ms', { count: 'exact' })
      .eq('agency_client_id', clientId)
      .gte('created_at', weekStart),
    supabase
      .from('ghl_message_log')
      .select('id, response_time_ms, inbound_message, ai_response, message_type, created_at', { count: 'exact' })
      .eq('agency_client_id', clientId)
      .gte('created_at', monthStart),
  ]);

  // Estimate token usage from message lengths (rough: 1 token ≈ 4 chars)
  const monthMessages = monthResult.data || [];
  let estimatedInputTokens = 0;
  let estimatedOutputTokens = 0;
  for (const msg of monthMessages) {
    estimatedInputTokens += Math.ceil((msg.inbound_message?.length || 0) / 4) + 500; // +500 for system prompt
    estimatedOutputTokens += Math.ceil((msg.ai_response?.length || 0) / 4);
  }

  // Cost estimate (Claude Sonnet: $3/M input, $15/M output)
  const estimatedCostCents = Math.round(
    (estimatedInputTokens * 3 / 1_000_000 + estimatedOutputTokens * 15 / 1_000_000) * 100
  );

  // Average response time
  const responseTimes = monthMessages
    .map(m => m.response_time_ms)
    .filter((t): t is number => t !== null && t > 0);
  const avgResponseTimeMs = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;

  // Daily breakdown for chart (last 30 days)
  const dailyBreakdown: Record<string, { messages: number; estimatedCostCents: number }> = {};
  for (const msg of monthMessages) {
    const day = new Date(msg.created_at).toISOString().split('T')[0];
    if (!dailyBreakdown[day]) {
      dailyBreakdown[day] = { messages: 0, estimatedCostCents: 0 };
    }
    dailyBreakdown[day].messages++;
    const inTokens = Math.ceil((msg.inbound_message?.length || 0) / 4) + 500;
    const outTokens = Math.ceil((msg.ai_response?.length || 0) / 4);
    dailyBreakdown[day].estimatedCostCents += Math.round(
      (inTokens * 3 / 1_000_000 + outTokens * 15 / 1_000_000) * 100
    );
  }

  // Message type breakdown
  const channelBreakdown: Record<string, number> = {};
  for (const msg of monthMessages) {
    const channel = msg.message_type || 'Unknown';
    channelBreakdown[channel] = (channelBreakdown[channel] || 0) + 1;
  }

  return NextResponse.json({
    messages: {
      today: todayResult.count || 0,
      thisWeek: weekResult.count || 0,
      thisMonth: monthResult.count || 0,
    },
    tokens: {
      estimatedInput: estimatedInputTokens,
      estimatedOutput: estimatedOutputTokens,
      estimatedTotalCostCents: estimatedCostCents,
      estimatedTotalCostFormatted: `$${(estimatedCostCents / 100).toFixed(2)}`,
    },
    performance: {
      avgResponseTimeMs,
      avgResponseTimeSec: Math.round(avgResponseTimeMs / 100) / 10,
    },
    dailyBreakdown: Object.entries(dailyBreakdown)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data })),
    channelBreakdown,
  });
}
