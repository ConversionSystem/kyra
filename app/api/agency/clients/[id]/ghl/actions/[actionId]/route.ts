import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { approveAction, rejectAction } from '@/lib/ghl/action-engine';

type RouteContext = { params: Promise<{ id: string; actionId: string }> };

/**
 * POST /api/agency/clients/[id]/ghl/actions/[actionId]
 * Approve or reject a pending action proposal.
 * Body: { decision: 'approve' | 'reject' }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { actionId } = await context.params;

  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { user } = result.data;

  let body: { decision: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.decision !== 'approve' && body.decision !== 'reject') {
    return NextResponse.json({ error: 'decision must be "approve" or "reject"' }, { status: 400 });
  }

  const handler = body.decision === 'approve' ? approveAction : rejectAction;
  const { data, error } = await handler(actionId, user.id);

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json(data);
}
