/**
 * GET  /api/agency/clients/[id]/workflows — list workflows for client
 * POST /api/agency/clients/[id]/workflows — create workflow (from AI or template)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agency = await getAgencyForUser(user.id);
  if (!agency) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  // Verify client belongs to agency
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id')
    .eq('id', clientId)
    .eq('agency_id', agency.agency.id)
    .single();
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const { data: workflows, error } = await supabase
    .from('client_workflows')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workflows: workflows || [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agency = await getAgencyForUser(user.id);
  if (!agency) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const { data: client } = await supabase
    .from('agency_clients')
    .select('id')
    .eq('id', clientId)
    .eq('agency_id', agency.agency.id)
    .single();
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const body = await req.json();
  const { name, description, trigger, steps, status } = body;

  if (!name || !trigger || !steps?.length) {
    return NextResponse.json({ error: 'Name, trigger, and steps are required' }, { status: 400 });
  }

  const { data: workflow, error } = await supabase
    .from('client_workflows')
    .insert({
      client_id: clientId,
      agency_id: agency.agency.id,
      name,
      description: description || '',
      trigger,
      steps,
      status: status || 'draft',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workflow }, { status: 201 });
}
