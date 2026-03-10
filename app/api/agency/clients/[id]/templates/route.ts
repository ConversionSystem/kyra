import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { pushClientTemplates } from '@/lib/ovh/provisioner';
import { buildTemplatesFromQuickAnswers, QuickAnswers } from '@/lib/billing/template-builder';

type RouteParams = { params: Promise<{ id: string }> };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolves whether [id] belongs to an agency_client row OR a solo account's container.
 * Solo accounts store quick_answers in agency.settings and have no agency_clients row.
 * Returns { source: 'client'|'solo', quickAnswers, agencyId }.
 */
async function resolveTemplateSource(
  agencyId: string,
  clientId: string
): Promise<{ source: 'client' | 'solo'; quickAnswers: QuickAnswers; settings?: Record<string, unknown> }> {
  const serviceClient = createServiceClientWithoutCookies();

  // Try agency_clients first
  const { data: client } = await serviceClient
    .from('agency_clients')
    .select('settings')
    .eq('id', clientId)
    .eq('agency_id', agencyId)
    .single();

  if (client) {
    const settings = (client.settings as Record<string, unknown>) ?? {};
    return {
      source: 'client',
      quickAnswers: (settings.quick_answers as QuickAnswers) ?? {},
      settings,
    };
  }

  // Not found in agency_clients — check if it's the solo_client_id for this agency
  const { data: agency } = await serviceClient
    .from('agencies')
    .select('settings')
    .eq('id', agencyId)
    .single();

  const agencySettings = (agency?.settings as Record<string, unknown>) ?? {};
  const soloClientId = agencySettings.solo_client_id as string | undefined;

  if (soloClientId === clientId) {
    return {
      source: 'solo',
      quickAnswers: (agencySettings.quick_answers as QuickAnswers) ?? {},
      settings: agencySettings,
    };
  }

  // Not found anywhere
  return { source: 'client', quickAnswers: {} };
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { quickAnswers } = await resolveTemplateSource(result.agency.id, id);
  return NextResponse.json({ quick_answers: quickAnswers });
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyResult = await getAgencyForUser(user.id);
  if (!agencyResult) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = (await req.json()) as QuickAnswers;
  const serviceClient = createServiceClientWithoutCookies();

  const { source, settings } = await resolveTemplateSource(agencyResult.agency.id, id);

  if (source === 'solo') {
    // ── Solo account: save to agency.settings.quick_answers ──
    const updatedSettings = { ...(settings ?? {}), quick_answers: body };
    await serviceClient
      .from('agencies')
      .update({ settings: updatedSettings })
      .eq('id', agencyResult.agency.id);
  } else {
    // ── Agency client: save to agency_clients.settings.quick_answers ──
    const { data: client } = await serviceClient
      .from('agency_clients')
      .select('settings')
      .eq('id', id)
      .eq('agency_id', agencyResult.agency.id)
      .single();

    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const existingSettings = (client.settings as Record<string, unknown>) ?? {};
    const updatedSettings = { ...existingSettings, quick_answers: body };

    await serviceClient
      .from('agency_clients')
      .update({ settings: updatedSettings })
      .eq('id', id);
  }

  // Build templates and push to provisioner (writes to disk + live router)
  const templates = buildTemplatesFromQuickAnswers(body);
  const count = Object.keys(templates).length;

  if (count > 0) {
    // Awaited — not fire-and-forget, so we can log errors properly
    const ok = await pushClientTemplates(id, templates);
    if (!ok) {
      console.warn(`[templates] Failed to push ${count} templates for container ${id}`);
    }
  }

  return NextResponse.json({ ok: true, count, source });
}
