// ============================================================================
// POST /api/channels/email
//
// Send AI-personalized email to a contact via Resend.
// Used for: proactive outreach, follow-ups, nurture sequences.
//
// Auth: Bearer KYRA_API_SECRET (can be called from GHL poll, cron jobs, etc.)
//
// Body:
//   clientId: string        — which client's AI to personalize with
//   to: string              — recipient email
//   toName?: string         — recipient name (for personalization)
//   subject?: string        — email subject (AI-generated if omitted)
//   context?: string        — extra context for AI (e.g. "they just booked a demo")
//   templateId?: string     — preset template: 'follow_up' | 'welcome' | 'nurture'
//   fromName?: string       — override sender name
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const RESEND_API = 'https://api.resend.com/emails';

type Template = 'follow_up' | 'welcome' | 'nurture' | 'custom';

const TEMPLATE_PROMPTS: Record<Template, string> = {
  follow_up: 'Write a friendly follow-up email to check in on this prospect. Reference their interest. Keep it under 100 words. No salesy fluff.',
  welcome: 'Write a warm welcome email for a new customer. Be concise, personal, and help them know what to expect next. Under 100 words.',
  nurture: 'Write a short nurture email that provides one piece of useful advice or insight related to the business. No hard sell. Under 100 words.',
  custom: 'Write a professional, personalized email based on the provided context. Under 150 words. Conversational tone.',
};

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function POST(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token || token !== process.env.KYRA_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    clientId?: string;
    to?: string;
    toName?: string;
    subject?: string;
    context?: string;
    templateId?: Template;
    fromName?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    clientId,
    to,
    toName,
    subject,
    context = '',
    templateId = 'custom',
    fromName,
  } = body;

  if (!clientId || !to) {
    return NextResponse.json({ error: 'clientId and to are required' }, { status: 400 });
  }

  // Email now routes through GHL platform account — no RESEND_API_KEY check needed

  const supabase = getSupabase();

  // Get client + gateway
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, name, status, agency_id, gateway_url, gateway_token, gateway_status, container_config')
    .eq('id', clientId)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  if (!client.gateway_url || !['running', 'starting'].includes(client.gateway_status || '')) {
    return NextResponse.json({ error: 'Client AI not available' }, { status: 503 });
  }

  const cfg = (client.container_config as Record<string, unknown>) ?? {};
  const persona = (cfg.persona as string) || `AI assistant for ${client.name}`;
  const senderName = fromName || (cfg.email_sender_name as string) || client.name;
  const senderEmail = (cfg.email_from as string) || `hello@updates.conversionsystem.com`;

  const templatePrompt = TEMPLATE_PROMPTS[templateId] || TEMPLATE_PROMPTS.custom;
  const recipientInfo = toName ? `The recipient's name is ${toName}.` : '';

  // Generate email body via AI
  const aiPrompt = [
    `You are ${persona}.`,
    recipientInfo,
    context ? `Context: ${context}` : '',
    '',
    templatePrompt,
    '',
    'Format: Return ONLY the email body text (no subject line, no "Dear X:", no signature). Start directly with the content.',
  ].filter(Boolean).join('\n');

  let emailBody = '';
  let emailSubject = subject || '';

  try {
    // Generate body
    const bodyRes = await fetch(`${client.gateway_url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${client.gateway_token}`,
      },
      body: JSON.stringify({
        model: 'openrouter/anthropic/claude-haiku-4.5',
        messages: [{ role: 'user', content: aiPrompt }],
        stream: false,
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!bodyRes.ok) throw new Error(`Gateway ${bodyRes.status}`);
    const bodyData = await bodyRes.json();
    emailBody = bodyData?.choices?.[0]?.message?.content?.trim() || '';

    // Generate subject if not provided
    if (!emailSubject && emailBody) {
      const subjectRes = await fetch(`${client.gateway_url}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${client.gateway_token}`,
        },
        body: JSON.stringify({
          model: 'openrouter/anthropic/claude-haiku-4.5',
          messages: [
            { role: 'user', content: `Write a concise, compelling email subject line (under 60 chars) for this email body. Return ONLY the subject, no quotes:\n\n${emailBody}` },
          ],
          stream: false,
          max_tokens: 50,
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (subjectRes.ok) {
        const subjectData = await subjectRes.json();
        emailSubject = subjectData?.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, '') || `A message from ${senderName}`;
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: `AI generation failed: ${err.message}` }, { status: 503 });
  }

  if (!emailBody) {
    return NextResponse.json({ error: 'AI returned empty email body' }, { status: 503 });
  }

  // Build HTML email (minimal, clean)
  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" style="background:#fff;border-radius:12px;padding:40px;max-width:100%;">
        <tr><td>
          <p style="color:#111;font-size:15px;line-height:1.7;margin:0 0 24px;">${emailBody.replace(/\n/g, '</p><p style="color:#111;font-size:15px;line-height:1.7;margin:0 0 16px;">')}</p>
          <p style="color:#111;font-size:15px;line-height:1.7;margin:0;">
            ${toName ? `Hi ${toName},<br><br>` : ''}
            — ${senderName}
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">
            This email was sent by ${senderName} via Kyra AI.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Send via GHL platform account (hello@conversionsystem.com)
  const { sendPlatformEmail } = await import('@/lib/email/ghl-platform-sender');
  const sendResult = await sendPlatformEmail({
    to: toName ? `${toName} <${to}>` : to,
    subject: emailSubject,
    html: htmlBody,
    fromName: senderName,
  });

  if (!sendResult.ok) {
    return NextResponse.json({ error: `Email send failed: ${sendResult.error}` }, { status: 502 });
  }

  const sendData = { id: sendResult.messageId };

  // Log to client_conversations
  await supabase.from('client_conversations').insert({
    client_id: client.id,
    agency_id: client.agency_id,
    channel: 'email',
    user_message: `[OUTBOUND EMAIL] To: ${to} | Subject: ${emailSubject}`,
    ai_response: emailBody,
  });

  return NextResponse.json({
    ok: true,
    emailId: sendData.id,
    subject: emailSubject,
    to,
    from: `${senderName} <${senderEmail}>`,
    preview: emailBody.slice(0, 100),
  });
}
