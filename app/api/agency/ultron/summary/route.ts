import { NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';

// GET /api/agency/ultron/summary
// Returns high-level metrics for the "Agency Ops Brain" (Ultron) to build a CEO brief.
// Scoped to the current user's agency.

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await getAgencyForUser(user.id);
  if (!result) {
    return NextResponse.json({ error: 'No agency found for user' }, { status: 404 });
  }

  const { agency } = result;
  const db = createServiceClientWithoutCookies();

  const now = new Date();
  const day7ago = new Date(now.getTime() - 7 * 86400_000).toISOString();

  // ── Clients for this agency ───────────────────────────────────────────────
  const { data: clients, error: clientsError } = await db
    .from('agency_clients')
    .select('id, name, slug, status, gateway_status, gateway_error, created_at, updated_at')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false });

  if (clientsError) {
    console.error('[ultron] Failed to load clients:', clientsError.message);
    return NextResponse.json({ error: 'Failed to load clients' }, { status: 500 });
  }

  const clientList = clients ?? [];
  const clientIds = clientList.map((c) => c.id as string);

  if (clientIds.length === 0) {
    return NextResponse.json({
      agencyId: agency.id,
      generatedAt: now.toISOString(),
      summary: {
        totalClients: 0,
        activeClients: 0,
        clientsWithConvosLast7d: 0,
        totalConvosLast7d: 0,
        avgResponseMsLast7d: null,
        gateways: { running: 0, notRunning: 0 },
      },
      clients: [],
      atRisk: [],
    });
  }

  // ── Conversations per client (last 7 days) ────────────────────────────────
  const { data: convRows, error: convError } = await db
    .from('client_conversations')
    .select('client_id, agency_id, created_at')
    .eq('agency_id', agency.id)
    .gte('created_at', day7ago);

  if (convError) {
    console.error('[ultron] Failed to load conversation rows:', convError.message);
  }

  const convByClient: Record<string, number> = {};
  const lastConvByClient: Record<string, string> = {};
  let totalConvosLast7d = 0;

  (convRows ?? []).forEach((row: any) => {
    const clientId = row.client_id as string;
    const createdAt = row.created_at as string;
    convByClient[clientId] = (convByClient[clientId] ?? 0) + 1;
    totalConvosLast7d += 1;

    const prev = lastConvByClient[clientId];
    if (!prev || createdAt > prev) {
      lastConvByClient[clientId] = createdAt;
    }
  });

  // ── Response-time per client (last 7 days, GHL SMS/etc.) ──────────────────
  const { data: respRows, error: respError } = await db
    .from('ghl_message_log')
    .select('agency_client_id, response_time_ms, created_at')
    .in('agency_client_id', clientIds)
    .gte('created_at', day7ago);

  if (respError) {
    console.error('[ultron] Failed to load response-time rows:', respError.message);
  }

  const respByClient: Record<string, number> = {};
  const respCountByClient: Record<string, number> = {};
  let respSum = 0;
  let respCount = 0;

  (respRows ?? []).forEach((row: any) => {
    const clientId = row.agency_client_id as string;
    const ms = row.response_time_ms as number | null;
    if (ms == null) return;
    respByClient[clientId] = (respByClient[clientId] ?? 0) + ms;
    respCountByClient[clientId] = (respCountByClient[clientId] ?? 0) + 1;
    respSum += ms;
    respCount += 1;
  });

  // Convert per-client sums to averages
  Object.keys(respByClient).forEach((clientId) => {
    const totalMs = respByClient[clientId];
    const count = respCountByClient[clientId] ?? 1;
    respByClient[clientId] = Math.round(totalMs / count);
  });

  // ── Aggregate metrics and per-client risk flags ───────────────────────────
  const activeClients = clientList.filter((c: any) => c.status === 'active').length;
  const gatewaysRunning = clientList.filter((c: any) => c.gateway_status === 'running').length;
  const gatewaysNotRunning = clientList.length - gatewaysRunning;

  const clientsWithConvosLast7d = clientList.filter((c: any) => (convByClient[c.id] ?? 0) > 0).length;

  const clientMetrics = clientList.map((c: any) => {
    const convosLast7d = convByClient[c.id] ?? 0;
    const lastConversationAt = lastConvByClient[c.id] ?? null;
    const avgResponseMsLast7d = respByClient[c.id] ?? null;

    const riskReasons: string[] = [];

    if (c.status !== 'active') {
      riskReasons.push('Client is not active');
    }

    if (!lastConversationAt) {
      riskReasons.push('No conversations yet');
    } else if (lastConversationAt < day7ago) {
      riskReasons.push('No conversations in the last 7 days');
    }

    if (c.gateway_status && c.gateway_status !== 'running') {
      riskReasons.push('AI gateway is not running');
    }

    const riskLevel = riskReasons.length === 0
      ? 'ok'
      : riskReasons.length === 1
      ? 'warning'
      : 'critical';

    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: c.status,
      gatewayStatus: c.gateway_status,
      gatewayError: c.gateway_error,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      convosLast7d,
      lastConversationAt,
      avgResponseMsLast7d,
      riskLevel,
      riskReasons,
    };
  });

  const atRisk = clientMetrics.filter((c) => c.riskLevel !== 'ok');

  return NextResponse.json({
    agencyId: agency.id,
    generatedAt: now.toISOString(),
    summary: {
      totalClients: clientList.length,
      activeClients,
      clientsWithConvosLast7d,
      totalConvosLast7d,
      avgResponseMsLast7d: respCount > 0 ? Math.round(respSum / respCount) : null,
      gateways: {
        running: gatewaysRunning,
        notRunning: gatewaysNotRunning,
      },
    },
    clients: clientMetrics,
    atRisk,
  });
}
