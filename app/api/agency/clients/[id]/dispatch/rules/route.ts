import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import type { ClientDispatchConfig, SlaRule } from '@/lib/onfleet/types';

/**
 * SLA & Automation Rules API
 * GET  — Get current rules
 * PUT  — Update rules
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const { agency } = auth.data;
  const supabase = createServiceClientWithoutCookies();

  const { data, error } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const settings = (data.settings || {}) as Record<string, unknown>;
  const dispatch = (settings.dispatch || {}) as Partial<ClientDispatchConfig>;

  return NextResponse.json({
    rules: dispatch.rules ?? [],
    zones: dispatch.zones ?? [],
    defaultSlaTotalMinutes: dispatch.defaultSlaTotalMinutes ?? 60,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const { agency } = auth.data;
  const body = await req.json();
  const supabase = createServiceClientWithoutCookies();

  const { data: existing, error: fetchError } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const settings = (existing.settings || {}) as Record<string, unknown>;
  const currentDispatch = (settings.dispatch || {}) as Record<string, unknown>;

  const updatedDispatch = {
    ...currentDispatch,
    ...(body.rules && { rules: body.rules }),
  };

  const { error: updateError } = await supabase
    .from('agency_clients')
    .update({
      settings: { ...settings, dispatch: updatedDispatch },
    })
    .eq('id', clientId)
    .eq('agency_id', agency.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'updated', rules: body.rules });
}
