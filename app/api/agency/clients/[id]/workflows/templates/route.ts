/**
 * GET /api/agency/clients/[id]/workflows/templates — list available templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { WORKFLOW_TEMPLATES } from '@/lib/automations/workflow-templates';

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

  // Verify client
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id')
    .eq('id', clientId)
    .eq('agency_id', agency.agency.id)
    .single();
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  return NextResponse.json({ templates: WORKFLOW_TEMPLATES });
}
