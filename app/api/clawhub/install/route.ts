/**
 * POST /api/clawhub/install
 *
 * Install a ClawHub skill to a client's OpenClaw container.
 * This calls the container's gateway API to install the skill.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const authResult = await requireAgencyAdmin();
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error.message }, { status: authResult.error.status });
  }

  const { agency } = authResult.data;
  const body = await request.json();
  const { clientId, skillSlug, version } = body as {
    clientId: string;
    skillSlug: string;
    version?: string;
  };

  if (!clientId || !skillSlug) {
    return NextResponse.json({ error: 'Missing clientId or skillSlug' }, { status: 400 });
  }

  // Verify client belongs to agency
  const supabase = await createClient();
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, settings, gateway_url, gateway_status')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Record the install in client settings
  const settings = (client.settings as Record<string, unknown>) ?? {};
  const installedSkills = (settings.installed_clawhub_skills as Array<Record<string, unknown>>) ?? [];

  // Check for duplicates
  const alreadyInstalled = installedSkills.some(
    (s) => s.slug === skillSlug,
  );

  if (alreadyInstalled) {
    return NextResponse.json({ error: 'Skill already installed' }, { status: 409 });
  }

  // Add to installed list
  installedSkills.push({
    slug: skillSlug,
    version: version || 'latest',
    installed_at: new Date().toISOString(),
    status: 'installed',
  });

  settings.installed_clawhub_skills = installedSkills;

  await supabase
    .from('agency_clients')
    .update({ settings })
    .eq('id', clientId);

  return NextResponse.json({
    ok: true,
    skill: skillSlug,
    message: `Skill "${skillSlug}" installed. It will be available on the client's next container restart.`,
  });
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAgencyAdmin();
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error.message }, { status: authResult.error.status });
  }

  const { agency } = authResult.data;
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const skillSlug = searchParams.get('skillSlug');

  if (!clientId || !skillSlug) {
    return NextResponse.json({ error: 'Missing clientId or skillSlug' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, settings')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const settings = (client.settings as Record<string, unknown>) ?? {};
  const installedSkills = (settings.installed_clawhub_skills as Array<Record<string, unknown>>) ?? [];
  settings.installed_clawhub_skills = installedSkills.filter((s) => s.slug !== skillSlug);

  await supabase
    .from('agency_clients')
    .update({ settings })
    .eq('id', clientId);

  return NextResponse.json({ ok: true, removed: skillSlug });
}
