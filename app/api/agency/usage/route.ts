// GET /api/agency/usage
// Returns aggregate usage across ALL clients for the agency

import { NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServiceClientWithoutCookies();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Get all clients and their message logs this month
  const { data: clients } = await supabase
    .from('agency_clients')
    .select('id, name, status')
    .in('status', ['active', 'setup']);

  if (!clients || clients.length === 0) {
    return NextResponse.json({ clients: [], totals: { messages: 0, estimatedCostCents: 0, estimatedCostFormatted: '$0.00' } });
  }

  const clientIds = clients.map(c => c.id);

  const { data: messages } = await supabase
    .from('ghl_message_log')
    .select('agency_client_id, inbound_message, ai_response, response_time_ms, created_at')
    .in('agency_client_id', clientIds)
    .gte('created_at', monthStart);

  // Aggregate per client
  const perClient: Record<string, { messages: number; estimatedCostCents: number; avgResponseTimeMs: number }> = {};
  let totalMessages = 0;
  let totalCostCents = 0;

  for (const msg of (messages || [])) {
    const cid = msg.agency_client_id;
    if (!perClient[cid]) perClient[cid] = { messages: 0, estimatedCostCents: 0, avgResponseTimeMs: 0 };
    perClient[cid].messages++;
    totalMessages++;

    const inTokens = Math.ceil((msg.inbound_message?.length || 0) / 4) + 500;
    const outTokens = Math.ceil((msg.ai_response?.length || 0) / 4);
    const cost = Math.round((inTokens * 3 / 1_000_000 + outTokens * 15 / 1_000_000) * 100);
    perClient[cid].estimatedCostCents += cost;
    totalCostCents += cost;
  }

  const clientUsage = clients.map(c => ({
    clientId: c.id,
    clientName: c.name,
    status: c.status,
    messagesThisMonth: perClient[c.id]?.messages || 0,
    estimatedCostCents: perClient[c.id]?.estimatedCostCents || 0,
    estimatedCostFormatted: `$${((perClient[c.id]?.estimatedCostCents || 0) / 100).toFixed(2)}`,
  })).sort((a, b) => b.messagesThisMonth - a.messagesThisMonth);

  return NextResponse.json({
    clients: clientUsage,
    totals: {
      messages: totalMessages,
      estimatedCostCents: totalCostCents,
      estimatedCostFormatted: `$${(totalCostCents / 100).toFixed(2)}`,
    },
  });
}
