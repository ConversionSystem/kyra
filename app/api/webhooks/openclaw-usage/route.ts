// ============================================================================
// POST /api/webhooks/openclaw-usage
//
// Webhook endpoint for OpenClaw containers to report message usage.
// Called after each AI message processed by the container.
//
// This closes the credit gap for direct terminal/gateway usage where
// messages bypass Kyra's chat API routes entirely.
//
// Headers: Authorization: Bearer <provisioner-secret>
// Body: { clientId, agencyId, channel, messageCount?, description? }
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { deductCredits } from '@/lib/billing/credit-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Validate auth
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.OVH_PROVISIONER_SECRET || process.env.PROVISIONER_SECRET;

  if (!expectedSecret || !authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  if (token !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const agencyId = body.agencyId as string | undefined;
  const clientId = body.clientId as string | undefined;
  const messageCount = (body.messageCount as number) || 1;
  const channel = (body.channel as string) || 'terminal';
  const description = (body.description as string) || `Terminal: ${channel}`;

  if (!agencyId) {
    return NextResponse.json({ error: 'agencyId is required' }, { status: 400 });
  }

  // Deduct credits
  const result = await deductCredits(agencyId, 'chat.message', {
    multiplier: messageCount,
    clientId: clientId || null,
    description,
  });

  return NextResponse.json({
    ok: result.ok,
    newBalance: result.newBalance,
    insufficient: result.insufficient,
    lowBalance: result.lowBalance,
  });
}
