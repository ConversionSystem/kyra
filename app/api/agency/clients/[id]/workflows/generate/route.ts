/**
 * POST /api/agency/clients/[id]/workflows/generate — AI generates workflow from description
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { generateWorkflowFromDescription } from '@/lib/automations/ai-workflow-engine';
import { deductCredits, requireCredits } from '@/lib/billing/credit-engine';

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

  // Verify client belongs to agency
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, name, container_config')
    .eq('id', clientId)
    .eq('agency_id', agency.agency.id)
    .single();
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  // Check credits (using chat.message cost = 1 credit)
  const canAfford = await requireCredits(agency.agency.id, 'chat.message');
  if (!canAfford.allowed) {
    return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
  }

  const body = await req.json();
  const { description } = body;

  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return NextResponse.json({ error: 'Please provide a description of at least 10 characters' }, { status: 400 });
  }

  try {
    const cfg = (client.container_config || {}) as Record<string, unknown>;
    const workflow = await generateWorkflowFromDescription(description.trim(), {
      client_id: clientId,
      client_name: client.name,
      has_ghl: !!(cfg.ghl_location_id),
      has_email: !!(cfg.email_address),
    });

    // Deduct credit
    await deductCredits(agency.agency.id, 'chat.message', {
      description: `AI workflow generation: "${workflow.name}"`,
    });

    return NextResponse.json({ workflow });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to generate workflow';
    console.error('[workflows/generate] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
