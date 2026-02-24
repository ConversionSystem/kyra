// POST /api/channels/twilio-sms?clientId=XXX
//
// Twilio webhook for direct SMS (no GHL required).
// When someone texts the client's Twilio number, this handler:
//   1. Receives the SMS via Twilio webhook
//   2. Gets AI response
//   3. Replies via Twilio SMS API (TwiML response)
//
// Configure in Twilio Console: Phone Numbers → Your Number → Voice & Messaging
// SMS Webhook URL: https://kyra.conversionsystem.com/api/channels/twilio-sms?clientId=CLIENT_ID
// HTTP Method: POST

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { chatViaGateway } from '@/lib/ovh/provisioner';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get('clientId');

  if (!clientId) {
    return twimlResponse('Configuration error — missing clientId.');
  }

  // Parse Twilio form body (Twilio sends application/x-www-form-urlencoded)
  const formData = await req.formData().catch(() => null);
  const body = formData
    ? Object.fromEntries(formData.entries()) as Record<string, string>
    : {};

  const fromNumber = body.From ?? '';
  const toNumber = body.To ?? '';
  const messageBody = body.Body?.trim() ?? '';
  const messageSid = body.MessageSid ?? `twilio-${Date.now()}`;

  if (!messageBody || !fromNumber) {
    return twimlResponse('');
  }

  const svc = createServiceClientWithoutCookies();

  // Get client
  const { data: client } = await svc
    .from('agency_clients')
    .select('id, name, container_config, agency_id')
    .eq('id', clientId)
    .single();

  if (!client) return twimlResponse('');

  // Check for STOP opt-out
  const stopKeywords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
  if (stopKeywords.includes(messageBody.toUpperCase())) {
    await svc.from('client_conversations').insert({
      client_id: clientId,
      user_message: `[OPT-OUT] ${fromNumber}: ${messageBody}`,
      ai_response: 'You have been unsubscribed. Reply START to re-subscribe.',
      channel: 'twilio-sms',
      metadata: { type: 'opt_out', from: fromNumber, to: toNumber },
    });
    return twimlResponse('You have been unsubscribed. You will not receive any more messages. Reply START to re-subscribe.');
  }

  // Get AI response
  let aiResponse = '';
  try {
    const result = await chatViaGateway(clientId, messageBody, { sessionId: messageSid });
    aiResponse = 'reply' in result ? result.reply : `Hi! Thanks for your message. Someone from ${client.name} will follow up shortly.`;
  } catch {
    aiResponse = `Hi! Thanks for your message. Someone from ${client.name} will follow up shortly.`;
  }

  // Store conversation
  await svc.from('client_conversations').insert({
    client_id: clientId,
    user_message: messageBody,
    ai_response: aiResponse,
    channel: 'twilio-sms',
    metadata: { from: fromNumber, to: toNumber, messageSid },
  });

  // Deduct credit
  try {
    const { deductCredit } = await import('@/lib/billing/credit-engine');
    await deductCredit(client.agency_id, clientId, 'Twilio SMS AI response');
  } catch { /* non-fatal */ }

  // Respond with TwiML — Twilio sends this as an SMS reply
  return twimlResponse(aiResponse);
}

function twimlResponse(message: string) {
  // TwiML format — Twilio parses this and sends the SMS
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

function escapeXml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
