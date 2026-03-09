import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { pushClientTemplates } from '@/lib/ovh/provisioner';
import { buildTemplatesFromQuickAnswers, QuickAnswers } from '@/lib/billing/template-builder';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const serviceClient = createServiceClientWithoutCookies();
  const { data: client } = await serviceClient
    .from('agency_clients')
    .select('settings')
    .eq('id', id)
    .eq('agency_id', result.agency.id)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const settings = (client.settings as Record<string, unknown>) ?? {};
  const quickAnswers = (settings.quick_answers as QuickAnswers) ?? {};
  return NextResponse.json({ quick_answers: quickAnswers });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyResult = await getAgencyForUser(user.id);
  if (!agencyResult) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = (await req.json()) as QuickAnswers;

  const serviceClient = createServiceClientWithoutCookies();

  // Load existing settings and merge quick_answers
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

  // Build and push templates to kyra-router
  const templates = buildTemplatesFromQuickAnswers(body);
  const count = Object.keys(templates).length;

  if (count > 0) {
    void pushClientTemplates(id, templates); // fire-and-forget, non-fatal
  }

  return NextResponse.json({ ok: true, count });
}
