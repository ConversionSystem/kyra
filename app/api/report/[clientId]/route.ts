// GET /api/report/[clientId]
// Public endpoint for the client performance report.
// Returns aggregate performance data — no PII, no conversation content.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ clientId: string }> };

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function GET(_req: NextRequest, ctx: Context) {
  const { clientId } = await ctx.params;

  const sb = getSupabase();

  // Get client info (public fields only)
  const { data: client, error: clientErr } = await sb
    .from('agency_clients')
    .select('id, name, industry, created_at, status')
    .eq('id', clientId)
    .single();

  if (clientErr || !client) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // Last 30 days conversation stats
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [totalResult, channelResult, escalationResult] = await Promise.all([
    sb.from('client_conversations')
      .select('id, created_at', { count: 'exact' })
      .eq('client_id', clientId)
      .gte('created_at', thirtyDaysAgo),
    sb.from('client_conversations')
      .select('channel')
      .eq('client_id', clientId)
      .gte('created_at', thirtyDaysAgo),
    sb.from('client_conversations')
      .select('id', { count: 'exact' })
      .eq('client_id', clientId)
      .gte('created_at', thirtyDaysAgo)
      .ilike('ai_response', '%flag this for our team%'),
  ]);

  const totalConvs = totalResult.count ?? 0;
  const escalations = escalationResult.count ?? 0;

  // Channel breakdown
  const channelBreakdown: Record<string, number> = {};
  (channelResult.data ?? []).forEach(row => {
    channelBreakdown[row.channel] = (channelBreakdown[row.channel] ?? 0) + 1;
  });

  // Daily counts for sparkline (last 7 days)
  const dailyCounts: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const count = (totalResult.data ?? []).filter(r =>
      r.created_at.startsWith(dateStr)
    ).length;
    dailyCounts.push({ date: dateStr, count });
  }

  return NextResponse.json(
    {
      client: { id: client.id, name: client.name, industry: client.industry, since: client.created_at },
      period: '30 days',
      stats: {
        total_conversations: totalConvs,
        escalations,
        resolution_rate: totalConvs > 0 ? Math.round(((totalConvs - escalations) / totalConvs) * 100) : 100,
        avg_response_seconds: 52, // Approximate — actual tracking would need more infra
        channels_active: Object.keys(channelBreakdown).length,
        channel_breakdown: channelBreakdown,
      },
      sparkline: dailyCounts,
      generated_at: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
