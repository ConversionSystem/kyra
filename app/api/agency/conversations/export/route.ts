// GET /api/agency/conversations/export?clientId=...&days=30
// Returns agency conversation data as a CSV download.
// Scoped to agency ownership — agencies can only export their own client data.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function escCsv(val: string | null | undefined): string {
  if (val == null) return '';
  const str = String(val).replace(/"/g, '""');
  return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
}

export async function GET(req: NextRequest) {
  const sb = await createClient();
  const sbService = await createServiceClient();

  // Use getUser() (cryptographically verified) instead of getSession() (cache-based)
  const { data: { user }, error: authError } = await sb.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Resolve agency via membership — supports owner + admin + member roles
  const { data: membership } = await sbService
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();
  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: agency } = await sbService
    .from('agencies')
    .select('id, name')
    .eq('id', membership.agency_id)
    .single();
  if (!agency) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const url = new URL(req.url);
  const clientId = url.searchParams.get('clientId');
  const days = parseInt(url.searchParams.get('days') ?? '30', 10);

  const since = new Date(Date.now() - Math.min(days, 365) * 24 * 60 * 60 * 1000).toISOString();

  let query = sbService.from('client_conversations')
    .select('id, client_id, channel, user_message, ai_response, tokens_used, created_at, agency_clients(name)')
    .eq('agency_id', agency.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (clientId) {
    // Verify the client belongs to this agency
    const { data: client } = await sbService.from('agency_clients').select('id').eq('id', clientId).eq('agency_id', agency.id).single();
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Query failed' }, { status: 500 });

  // Build CSV
  const header = ['id', 'client_name', 'channel', 'date', 'time', 'user_message', 'ai_response', 'tokens_used'].join(',');
  const rows = (data ?? []).map(row => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clients = Array.isArray((row as any).agency_clients) ? (row as any).agency_clients : [(row as any).agency_clients];
    const clientName = clients[0]?.name ?? '';
    const dt = new Date(row.created_at);
    return [
      escCsv(row.id),
      escCsv(clientName),
      escCsv(row.channel),
      escCsv(dt.toLocaleDateString('en-US')),
      escCsv(dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })),
      escCsv(row.user_message),
      escCsv(row.ai_response),
      escCsv(String(row.tokens_used ?? '')),
    ].join(',');
  });

  const csv = [header, ...rows].join('\n');
  const filename = `kyra-conversations-${clientId ? `client-${clientId.slice(0, 8)}` : 'all'}-${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache',
    },
  });
}
