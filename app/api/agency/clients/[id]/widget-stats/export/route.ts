// ============================================================================
// GET /api/agency/clients/[id]/widget-stats/export?windowDays=N
//
// Streams a CSV download of every conversation + widget_event row for the
// client in the given window. One row per record. Useful for operators
// who want to slice their own data in a spreadsheet or pipe into a
// BI tool without us building a full analytics suite.
//
// Columns:
//   created_at, channel, session_id, source_url, user_message, ai_response, tokens_used
//
// Auth: requireClientAccess (agency members only — never public).
// Row limit: 5000 to keep the download bounded.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireClientAccess } from '@/lib/agency/middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireClientAccess(clientId);
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const url = new URL(request.url);
  const windowDays = Math.max(1, Math.min(Number(url.searchParams.get('windowDays')) || 30, 365));
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const { data: rows } = await supabase
    .from('client_conversations')
    .select('created_at, channel, session_id, source_url, user_message, ai_response, tokens_used')
    .eq('client_id', clientId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(5000);

  // CSV escape: quote fields containing commas, quotes, or newlines.
  // Double up internal double-quotes (RFC 4180).
  const esc = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = ['created_at', 'channel', 'session_id', 'source_url', 'user_message', 'ai_response', 'tokens_used'];
  const lines = [header.join(',')];
  for (const r of rows ?? []) {
    lines.push([
      esc(r.created_at),
      esc(r.channel),
      esc(r.session_id),
      esc(r.source_url),
      esc(r.user_message),
      esc(r.ai_response),
      esc(r.tokens_used),
    ].join(','));
  }

  const csv = lines.join('\n');
  const filename = `widget-conversations-${clientId.slice(0, 8)}-${windowDays}d-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, must-revalidate',
    },
  });
}
