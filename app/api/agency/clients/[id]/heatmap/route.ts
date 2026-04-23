// GET /api/agency/clients/[id]/heatmap
// Returns a 7-day × 24-hour conversation volume heatmap.
// Data sourced from ghl_message_log (same table as usage analytics).

import { NextRequest, NextResponse } from 'next/server';
import { requireClientAccess } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;

  const result = await requireClientAccess(clientId);
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const supabase = createServiceClientWithoutCookies();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: messages, error } = await supabase
    .from('ghl_message_log')
    .select('created_at')
    .eq('agency_client_id', clientId)
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: true });

  if (error) {
    // Table might not exist yet — return empty heatmap gracefully
    return NextResponse.json({ heatmap: [], maxCount: 0, totalMessages: 0 });
  }

  // Build a [dayOfWeek][hour] → count map
  // dayOfWeek: 0 = Sunday, 1 = Monday … 6 = Saturday
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));

  for (const msg of messages ?? []) {
    const d = new Date(msg.created_at);
    const day = d.getDay();   // 0 (Sun) – 6 (Sat)
    const hour = d.getHours(); // 0 – 23
    grid[day][hour]++;
  }

  // Flatten to sparse array: [day, hour, count] — only non-zero cells
  const heatmap: [number, number, number][] = [];
  let maxCount = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (grid[d][h] > 0) {
        heatmap.push([d, h, grid[d][h]]);
        if (grid[d][h] > maxCount) maxCount = grid[d][h];
      }
    }
  }

  return NextResponse.json({
    heatmap,
    maxCount,
    totalMessages: (messages ?? []).length,
  });
}
