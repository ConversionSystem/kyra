// ============================================================================
// /api/agency/automations
//
// CRUD for OpenClaw cron jobs via the gateway's HTTP API.
// Each client can have scheduled automations (follow-ups, reports, etc.)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { getGatewayByClientId, getGatewayByAgencyId } from '@/lib/ovh/gateway-resolver';

export const dynamic = 'force-dynamic';

// Helper: resolve gateway — prefer clientId, fall back to first active in agency
async function resolveGateway(agencyId: string, clientId?: string | null) {
  if (clientId) {
    return getGatewayByClientId(clientId);
  }
  return getGatewayByAgencyId(agencyId);
}

// Helper: call gateway HTTP API
async function gatewayFetch(
  gatewayUrl: string,
  token: string,
  path: string,
  method = 'GET',
  body?: any,
): Promise<any> {
  const url = `${gatewayUrl}/api${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gateway ${method} ${path}: ${res.status} ${text}`);
  }

  return res.json();
}

// GET — List all cron jobs
export async function GET(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const clientId = request.nextUrl.searchParams.get('clientId');
  const gateway = await resolveGateway(agency.id, clientId);

  if (!gateway) {
    return NextResponse.json({
      jobs: [],
      error: 'Gateway not provisioned. Deploy a client AI first.',
    });
  }

  try {
    const data = await gatewayFetch(gateway.url, gateway.token, '/cron');
    const jobs = (data.jobs || []).map((job: any) => ({
      id: job.id || job.jobId,
      name: job.name || 'Unnamed',
      schedule: job.schedule,
      payload: job.payload,
      delivery: job.delivery,
      enabled: job.enabled !== false,
      sessionTarget: job.sessionTarget || 'isolated',
      lastRun: job.lastRun || null,
      nextRun: job.nextRun || null,
      createdAt: job.createdAt,
    }));

    return NextResponse.json({ jobs, gatewayStatus: gateway.status });
  } catch (err: any) {
    console.error('[automations] Gateway cron list error:', err.message);
    return NextResponse.json({
      jobs: [],
      error: `Failed to fetch automations: ${err.message}`,
      gatewayStatus: gateway.status,
    });
  }
}

// POST — Create a new cron job
export async function POST(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;

  const body = await request.json();
  const clientId = body.clientId || request.nextUrl.searchParams.get('clientId');
  const gateway = await resolveGateway(agency.id, clientId);
  if (!gateway) {
    return NextResponse.json({ error: 'Gateway not provisioned. Deploy a client AI first.' }, { status: 400 });
  }

  // Validate required fields
  if (!body.name || !body.schedule || !body.task) {
    return NextResponse.json(
      { error: 'Missing required fields: name, schedule, task' },
      { status: 400 },
    );
  }

  // Build the cron job spec for OpenClaw
  const job: any = {
    name: body.name,
    schedule: parseSchedule(body.schedule, body.scheduleValue, body.timezone),
    payload: {
      kind: 'agentTurn',
      message: body.task,
      model: body.model || undefined,
    },
    sessionTarget: 'isolated',
    enabled: body.enabled !== false,
  };

  if (body.delivery) {
    job.delivery = body.delivery;
  }

  try {
    const data = await gatewayFetch(gateway.url, gateway.token, '/cron', 'POST', { job });
    return NextResponse.json({ success: true, job: data });
  } catch (err: any) {
    console.error('[automations] Create error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — Update an existing cron job
export async function PATCH(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;

  const body = await request.json();
  const clientId = body.clientId || request.nextUrl.searchParams.get('clientId');
  const gateway = await resolveGateway(agency.id, clientId);
  if (!gateway) {
    return NextResponse.json({ error: 'Gateway not provisioned. Deploy a client AI first.' }, { status: 400 });
  }

  if (!body.jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  }

  const patch: any = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.enabled !== undefined) patch.enabled = body.enabled;
  if (body.task !== undefined) {
    patch.payload = { kind: 'agentTurn', message: body.task };
  }
  if (body.schedule !== undefined) {
    patch.schedule = parseSchedule(body.schedule, body.scheduleValue, body.timezone);
  }

  try {
    const data = await gatewayFetch(
      gateway.url, gateway.token,
      `/cron/${body.jobId}`, 'PATCH',
      { patch },
    );
    return NextResponse.json({ success: true, job: data });
  } catch (err: any) {
    console.error('[automations] Update error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — Remove a cron job
export async function DELETE(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const gateway = await resolveGateway(agency.id, clientId);
  if (!gateway) {
    return NextResponse.json({ error: 'Gateway not provisioned. Deploy a client AI first.' }, { status: 400 });
  }

  const jobId = searchParams.get('jobId');
  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  }

  try {
    await gatewayFetch(gateway.url, gateway.token, `/cron/${jobId}`, 'DELETE');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[automations] Delete error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function parseSchedule(type: string, value: string, timezone?: string): any {
  switch (type) {
    case 'cron':
      return { kind: 'cron', expr: value, tz: timezone || 'UTC' };
    case 'every': {
      // Parse interval like "5m", "1h", "30s"
      const match = value.match(/^(\d+)(s|m|h|d)$/);
      if (!match) return { kind: 'cron', expr: value, tz: timezone || 'UTC' };
      const num = parseInt(match[1]);
      const unit = match[2];
      const ms = num * ({ s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit] || 60000);
      return { kind: 'every', everyMs: ms };
    }
    case 'at':
      return { kind: 'at', at: value };
    default:
      return { kind: 'cron', expr: value || '0 9 * * *', tz: timezone || 'UTC' };
  }
}
