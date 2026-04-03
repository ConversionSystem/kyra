/**
 * GET /api/agency/clients/[id]/workflows/[workflowId]/runs — execution history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; workflowId: string }> }
) {
  const { id: clientId, workflowId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agency = await getAgencyForUser(user.id);
  if (!agency) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  // Verify workflow belongs to agency's client
  const { data: workflow } = await supabase
    .from('client_workflows')
    .select('id')
    .eq('id', workflowId)
    .eq('client_id', clientId)
    .eq('agency_id', agency.agency.id)
    .single();
  if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 20), 100);

  const { data: runs, error } = await supabase
    .from('workflow_runs')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ runs: runs || [] });
}
