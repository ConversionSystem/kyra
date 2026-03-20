import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { proposeAction } from '@/lib/ghl/action-engine';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/agency/clients/[id]/ghl/actions
 * List pending action proposals for a client.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ghl_action_proposals')
    .select('*')
    .eq('client_id', id)
    .eq('agency_id', agency.id)
    .eq('status', 'pending')
    .order('proposed_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch proposals' }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/agency/clients/[id]/ghl/actions
 * Create a new action proposal.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;

  let body: { action_type: string; parameters?: Record<string, unknown>; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.action_type) {
    return NextResponse.json({ error: 'action_type is required' }, { status: 400 });
  }

  const { data, error } = await proposeAction(
    id,
    agency.id,
    body.action_type,
    body.parameters ?? {},
    body.description ?? '',
  );

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
