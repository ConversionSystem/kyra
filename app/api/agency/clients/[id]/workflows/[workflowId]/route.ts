/**
 * PATCH  /api/agency/clients/[id]/workflows/[workflowId] — update workflow
 * DELETE /api/agency/clients/[id]/workflows/[workflowId] — delete workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; workflowId: string }> }
) {
  const { id: clientId, workflowId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agency = await getAgencyForUser(user.id);
  if (!agency) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  // Verify ownership
  const { data: existing } = await supabase
    .from('client_workflows')
    .select('id')
    .eq('id', workflowId)
    .eq('client_id', clientId)
    .eq('agency_id', agency.agency.id)
    .single();
  if (!existing) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.trigger !== undefined) updates.trigger = body.trigger;
  if (body.steps !== undefined) updates.steps = body.steps;
  if (body.status !== undefined) updates.status = body.status;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { data: workflow, error } = await supabase
    .from('client_workflows')
    .update(updates)
    .eq('id', workflowId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workflow });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; workflowId: string }> }
) {
  const { id: clientId, workflowId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agency = await getAgencyForUser(user.id);
  if (!agency) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const { error } = await supabase
    .from('client_workflows')
    .delete()
    .eq('id', workflowId)
    .eq('client_id', clientId)
    .eq('agency_id', agency.agency.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
