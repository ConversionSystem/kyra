// GET /api/agency/clients/[id]/sparkline
// Returns last 28 days of daily conversation counts for a mini sparkline.
// Lightweight — only fetches created_at column.

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
  const now = new Date();
  const windowDays = 28;
  const startDate = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const { data: messages, error } = await supabase
    .from('ghl_message_log')
    .select('created_at')
    .eq('agency_client_id', clientId)
    .gte('created_at', startDate.toISOString());

  // Graceful fallback if table doesn't exist
  if (error) {
    return NextResponse.json({ counts: new Array(windowDays).fill(0), trend: 'flat' });
  }

  // Build counts array indexed by days-ago (0 = today)
  const counts = new Array(windowDays).fill(0);
  for (const msg of messages ?? []) {
    const daysAgo = Math.floor(
      (now.getTime() - new Date(msg.created_at).getTime()) / (24 * 60 * 60 * 1000)
    );
    if (daysAgo >= 0 && daysAgo < windowDays) {
      counts[windowDays - 1 - daysAgo]++; // index 0 = oldest, last = today
    }
  }

  // Simple trend: compare first half vs second half
  const half = Math.floor(windowDays / 2);
  const firstHalf = counts.slice(0, half).reduce((a, b) => a + b, 0);
  const secondHalf = counts.slice(half).reduce((a, b) => a + b, 0);
  const trend =
    secondHalf > firstHalf * 1.1 ? 'up' :
    secondHalf < firstHalf * 0.9 ? 'down' :
    'flat';

  return NextResponse.json({ counts, trend });
}
