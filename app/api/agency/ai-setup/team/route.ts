// ============================================================================
// GET/POST /api/agency/ai-setup/team
//
// Manages AI Team configuration for a client.
// - GET: Returns current team config from container_config.worker_team
// - POST: Validates + saves team config, rebuilds SOUL.md with team context
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';
import { ROLE_WORKERS } from '@/lib/ai-workers/role-workers';
import { getPlanTeamLimit } from '@/lib/billing/plans';
import type { WorkerTeamConfig, TeamMember } from '@/lib/ai-workers/team-templates';

export const dynamic = 'force-dynamic';

// ── GET — Retrieve current team config ──────────────────────────────────────

export async function GET(request: NextRequest) {
  const result = await requireAgencyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }
  const { agency } = result.data;

  const clientId = request.nextUrl.searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: client, error: clientErr } = await supabase
    .from('agency_clients')
    .select('id, name, container_config')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (clientErr || !client) {
    return NextResponse.json({ error: 'Client not found or access denied' }, { status: 404 });
  }

  const cc = (client.container_config as Record<string, unknown>) ?? {};
  const workerTeam = (cc.worker_team as WorkerTeamConfig) ?? {
    enabled: false,
    primary_worker_id: '',
    members: [],
    handoff_style: 'seamless' as const,
  };

  const planLimit = getPlanTeamLimit((agency.plan as string) ?? 'free');

  return NextResponse.json({
    team: workerTeam,
    planLimit,
  });
}

// ── POST — Save team config ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const result = await requireAgencyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }
  const { agency } = result.data;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { clientId, team } = body as {
    clientId: string;
    team: {
      enabled: boolean;
      primary_worker_id: string;
      members: TeamMember[];
      handoff_style: 'seamless' | 'announced';
    };
  };

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  // Handle explicit disable: team is null, undefined, or { enabled: false }
  if (!team || (typeof team === 'object' && team.enabled === false)) {
    const supabase = await createClient();
    const { data: client } = await supabase
      .from('agency_clients')
      .select('id, container_config')
      .eq('id', clientId)
      .eq('agency_id', agency.id)
      .single();

    if (client) {
      const currentCfg = (client.container_config as Record<string, unknown>) ?? {};
      const existing = (currentCfg.worker_team as WorkerTeamConfig | undefined) ?? {
        enabled: false, primary_worker_id: '', members: [], handoff_style: 'seamless' as const,
      };
      await supabase
        .from('agency_clients')
        .update({ container_config: { ...currentCfg, worker_team: { ...existing, enabled: false } } })
        .eq('id', clientId)
        .eq('agency_id', agency.id);
    }
    return NextResponse.json({ success: true, team: { enabled: false } });
  }

  // ── Plan limit check ──────────────────────────────────────────────────
  const planLimit = getPlanTeamLimit((agency.plan as string) ?? 'free');
  if (team.enabled && planLimit === 0) {
    return NextResponse.json({
      error: 'AI Teams are not available on your current plan. Upgrade to Lite or higher.',
    }, { status: 403 });
  }

  if (team.enabled && team.members.length > planLimit) {
    return NextResponse.json({
      error: `Your plan allows up to ${planLimit} team members. You have ${team.members.length}.`,
    }, { status: 403 });
  }

  // ── Validate worker IDs ───────────────────────────────────────────────
  const validWorkerIds = new Set(ROLE_WORKERS.map(w => w.id));

  if (team.enabled) {
    if (!team.primary_worker_id) {
      return NextResponse.json({ error: 'primary_worker_id is required when team is enabled' }, { status: 400 });
    }
    if (!validWorkerIds.has(team.primary_worker_id)) {
      return NextResponse.json({ error: `Unknown primary worker: ${team.primary_worker_id}` }, { status: 400 });
    }

    for (const member of team.members) {
      if (!validWorkerIds.has(member.worker_id)) {
        return NextResponse.json({ error: `Unknown worker in team: ${member.worker_id}` }, { status: 400 });
      }
      if (member.worker_id === team.primary_worker_id) {
        return NextResponse.json({ error: `Primary worker cannot also be a team member` }, { status: 400 });
      }
      if (!['specialist', 'background'].includes(member.role)) {
        return NextResponse.json({ error: `Invalid role "${member.role}" for ${member.worker_id}` }, { status: 400 });
      }
    }

    if (!['seamless', 'announced'].includes(team.handoff_style)) {
      return NextResponse.json({ error: `Invalid handoff_style: ${team.handoff_style}` }, { status: 400 });
    }
  }

  // ── Load client ───────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: client, error: clientErr } = await supabase
    .from('agency_clients')
    .select('id, name, container_config, gateway_status')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (clientErr || !client) {
    return NextResponse.json({ error: 'Client not found or access denied' }, { status: 404 });
  }

  // ── Build team config ─────────────────────────────────────────────────
  const workerTeam: WorkerTeamConfig = {
    enabled: team.enabled,
    primary_worker_id: team.primary_worker_id,
    members: team.members.map(m => ({
      worker_id: m.worker_id,
      role: m.role,
      triggers: Array.isArray(m.triggers) ? m.triggers : [],
    })),
    handoff_style: team.handoff_style,
  };

  // ── Save to DB (JSONB merge) ──────────────────────────────────────────
  const currentCfg = (client.container_config as Record<string, unknown>) ?? {};

  // When enabling team mode, also update active_worker_id to the primary
  const configPatch: Record<string, unknown> = {
    worker_team: workerTeam,
  };
  if (team.enabled) {
    configPatch.active_worker_id = team.primary_worker_id;
  }

  const { error: dbErr } = await supabase
    .from('agency_clients')
    .update({ container_config: { ...currentCfg, ...configPatch } })
    .eq('id', clientId)
    .eq('agency_id', agency.id);

  if (dbErr) {
    console.error('[ai-setup/team] DB update error:', dbErr);
    return NextResponse.json({ error: 'Failed to save team configuration' }, { status: 500 });
  }

  // ── Rebuild SOUL.md with team context by re-applying the primary worker ─
  let containerPushed = false;
  let warning: string | undefined;

  if (team.enabled && team.primary_worker_id) {
    try {
      // Trigger re-apply of the primary worker to rebuild SOUL.md with team context
      const applyUrl = new URL('/api/agency/ai-setup/apply', request.url);
      const applyRes = await fetch(applyUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({
          clientId,
          type: 'role',
          templateId: team.primary_worker_id,
          variables: currentCfg, // Pass existing variables
        }),
      });

      if (applyRes.ok) {
        const applyData = await applyRes.json();
        containerPushed = applyData.containerPushed;
        if (applyData.warning) warning = applyData.warning;
      } else {
        warning = 'Team config saved but SOUL.md rebuild failed. Re-apply the primary worker manually.';
      }
    } catch (err) {
      console.warn('[ai-setup/team] SOUL.md rebuild error:', err);
      warning = 'Team config saved but SOUL.md rebuild failed. Re-apply the primary worker manually.';
    }
  }

  return NextResponse.json({
    success: true,
    team: workerTeam,
    containerPushed,
    ...(warning ? { warning } : {}),
  });
}
