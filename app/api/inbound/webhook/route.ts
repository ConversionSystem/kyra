// POST /api/inbound/webhook?clientId=XXX&token=YYY
//
// Universal inbound webhook — works with Zapier, Make, n8n, or any HTTP POST.
// Receives a lead/contact payload, runs it through the client AI, returns the response.
//
// Usage from Zapier:
//   Trigger: New Lead in HubSpot / Form submission in Typeform / etc.
//   Action: Webhooks by Zapier → POST to this URL
//   Output: AI response text (use in subsequent Zap steps to send SMS/email)
//
// Usage from Make (Integromat):
//   HTTP module → POST → use {{ai_response}} in next module

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { chatViaGateway } from '@/lib/ovh/provisioner';

export const dynamic = 'force-dynamic';

// Normalize various webhook payload shapes into a standard message
function extractMessage(body: Record<string, unknown>): {
  message: string;
  senderName?: string;
  senderPhone?: string;
  senderEmail?: string;
  source?: string;
} {
  // Common field names across CRMs and form tools
  const msg =
    (body.message ?? body.text ?? body.body ?? body.content ?? body.note ??
     body.description ?? body.inquiry ?? body.question ??
     // HubSpot form submission
     (body.properties as Record<string, {value?: string}>)?.message?.value ??
     // Typeform
     ((body.form_response as Record<string, Record<string, string>>)?.definition)?.title ??
     // ActiveCampaign
     (body.contact as Record<string, string>)?.note ??
     '') as string;

  const name =
    (body.name ?? body.full_name ?? body.contact_name ??
     (body.contact as Record<string, string>)?.firstName ??
     `${body.first_name ?? ''} ${body.last_name ?? ''}`.trim() ??
     '') as string;

  const phone =
    (body.phone ?? body.phone_number ?? body.mobile ??
     (body.contact as Record<string, string>)?.phone ?? '') as string;

  const email =
    (body.email ?? body.email_address ??
     (body.contact as Record<string, string>)?.email ?? '') as string;

  const source =
    (body.source ?? body.utm_source ?? body.form_name ?? body.trigger ?? '') as string;

  // Build a natural message if one wasn't provided
  const builtMessage = msg.trim() || [
    name ? `New lead: ${name}` : 'New inbound lead',
    phone ? `Phone: ${phone}` : '',
    email ? `Email: ${email}` : '',
    source ? `Source: ${source}` : '',
    'They are reaching out and need a response.',
  ].filter(Boolean).join('. ');

  return {
    message: builtMessage,
    senderName: name || undefined,
    senderPhone: phone || undefined,
    senderEmail: email || undefined,
    source: source || undefined,
  };
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get('clientId');
  const token = url.searchParams.get('token');

  if (!clientId) {
    return NextResponse.json({ error: 'clientId query param required' }, { status: 400 });
  }

  const svc = createServiceClientWithoutCookies();

  // Fetch client and verify token
  const { data: client } = await svc
    .from('agency_clients')
    .select('id, name, container_config, agency_id, gateway_status')
    .eq('id', clientId)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Token verification (webhook_token stored in container_config)
  const cfg = (client.container_config as Record<string, unknown>) ?? {};
  const expectedToken = cfg.webhook_token as string | undefined;
  if (expectedToken && token !== expectedToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Parse the payload
  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message, senderName, senderPhone, senderEmail, source } = extractMessage(body);

  // Get AI response via the gateway
  let aiResponse = '';
  const conversationId = `webhook-${Date.now()}`;

  try {
    const result = await chatViaGateway(client.id, message, { sessionId: conversationId });
    aiResponse = 'reply' in result ? result.reply : `Hi ${senderName ?? 'there'}! Thanks for reaching out to ${client.name}. A team member will follow up shortly.`;
  } catch (err) {
    aiResponse = `Hi ${senderName ?? 'there'}! Thanks for reaching out to ${client.name}. A team member will follow up with you shortly.`;
    console.warn('[webhook] Gateway error, using fallback:', err);
  }

  // Store in conversations
  await svc.from('client_conversations').insert({
    client_id: clientId,
    user_message: `[WEBHOOK${source ? ` via ${source}` : ''}${senderName ? ` from ${senderName}` : ''}]\n${message}`,
    ai_response: aiResponse,
    channel: 'webhook',
    metadata: {
      source: source ?? 'zapier',
      senderName, senderPhone, senderEmail,
      raw_payload: body,
    },
  });

  // Deduct credit (non-fatal)
  try {
    const { deductCredit } = await import('@/lib/billing/credit-engine');
    await deductCredit(client.agency_id, clientId, 'Webhook/Zapier AI response');
  } catch { /* non-fatal */ }

  // Return the AI response — Zapier can use it in next steps (SMS, email, CRM note, etc.)
  return NextResponse.json({
    ok: true,
    ai_response: aiResponse,
    client_name: client.name,
    sender_name: senderName,
    sender_phone: senderPhone,
    sender_email: senderEmail,
    // Convenience: pre-built SMS-ready response (trimmed to 160 chars)
    sms_response: aiResponse.length > 160 ? aiResponse.slice(0, 157) + '...' : aiResponse,
    timestamp: new Date().toISOString(),
  });
}

// GET handler for Zapier's webhook verification step
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  // Zapier sends a GET to verify the webhook before use
  return NextResponse.json({
    status: 'ok',
    service: 'Kyra AI Webhook',
    clientId: url.searchParams.get('clientId'),
    usage: 'POST to this endpoint with your lead data. Returns ai_response for use in next Zap steps.',
  });
}
