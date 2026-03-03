/**
 * POST /api/webhooks/openclaw-usage
 *
 * Webhook endpoint for OpenClaw containers to report message usage.
 * Called by containers after processing a message so Kyra can deduct credits.
 *
 * This solves the "terminal bypass" problem: when users chat directly through
 * the OpenClaw terminal, Kyra's API is bypassed entirely. This webhook
 * allows the container to report usage back to Kyra for credit deduction.
 *
 * Auth: Bearer token matching the client's gateway_token
 *
 * Body: {
 *   client_id: string,
 *   message_count?: number,  // defaults to 1
 *   channel?: string,        // e.g. 'terminal', 'telegram', 'web'
 *   user_message?: string,   // truncated for logging
 *   ai_response?: string,    // truncated for logging
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { deductCredits } from '@/lib/billing/credit-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Auth via Bearer token
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const clientId = body.client_id as string | undefined;
  const messageCount = Math.min(Math.max(Number(body.message_count) || 1, 1), 100); // cap at 100
  const channel = (body.channel as string) || 'terminal';
  const userMessage = ((body.user_message as string) || '').slice(0, 200);
  const aiResponse = ((body.ai_response as string) || '').slice(0, 200);

  if (!clientId) {
    return NextResponse.json({ error: 'client_id required' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  // Look up client and verify token matches
  const { data: client, error: clientErr } = await supabase
    .from('agency_clients')
    .select('id, agency_id, gateway_token, name')
    .eq('id', clientId)
    .single();

  if (clientErr || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Verify the token matches (the container knows its own gateway_token)
  if (client.gateway_token !== token) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }

  // Deduct credits
  const result = await deductCredits(client.agency_id, 'chat.message', {
    multiplier: messageCount,
    clientId: client.id,
    description: `${channel}: ${userMessage.slice(0, 60) || 'terminal message'}`,
  });

  // Also log to client_conversations if we have message content
  if (userMessage && aiResponse) {
    void supabase
      .from('client_conversations')
      .insert({
        client_id: client.id,
        agency_id: client.agency_id,
        channel,
        user_message: userMessage,
        ai_response: aiResponse,
      })
      .then(() => {}, () => {});
  }

  return NextResponse.json({
    ok: result.ok,
    balance: result.newBalance,
    insufficient: result.insufficient,
    deducted: messageCount,
  });
}
