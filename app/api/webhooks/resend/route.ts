import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { unsubscribeContact } from '@/lib/email/marketing';

export const runtime = 'nodejs'; // raw body + node:crypto

/**
 * Verify a Svix webhook signature (Resend, Clerk, Svix Portal, …).
 *
 * Headers sent by Svix:
 *   svix-id          — unique message id (UUID)
 *   svix-timestamp   — unix seconds of the send
 *   svix-signature   — space-separated list of `v1,<base64-hmac>` values
 *
 * Signed payload: `${svix-id}.${svix-timestamp}.${raw-body}`
 * HMAC key:       base64-decoded(secret without `whsec_` prefix)
 *
 * Timestamp is checked against a ±5 minute window to prevent replays.
 *
 * Returns null on success, or a NextResponse on failure.
 */
function verifySvixSignature(
  headers: Headers,
  rawBody: string,
  secret: string,
): NextResponse | null {
  const svixId = headers.get('svix-id');
  const svixTimestamp = headers.get('svix-timestamp');
  const svixSignature = headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix signature headers' }, { status: 401 });
  }

  // Replay window: ±5 minutes
  const timestampSec = Number.parseInt(svixTimestamp, 10);
  const nowSec = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(timestampSec) || Math.abs(nowSec - timestampSec) > 300) {
    return NextResponse.json({ error: 'Signature timestamp outside window' }, { status: 401 });
  }

  // Strip `whsec_` prefix, base64-decode to get the raw HMAC key
  const keyB64 = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let keyBuf: Buffer;
  try {
    keyBuf = Buffer.from(keyB64, 'base64');
  } catch {
    return NextResponse.json({ error: 'Invalid webhook secret format' }, { status: 500 });
  }

  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', keyBuf).update(signedPayload).digest('base64');

  // svixSignature is space-separated: "v1,<sig1> v1,<sig2>". Accept if ANY v1 sig matches.
  const candidates = svixSignature.split(' ').map((s) => s.trim()).filter(Boolean);
  const expectedBuf = Buffer.from(expected, 'base64');

  for (const candidate of candidates) {
    const [version, sig] = candidate.split(',');
    if (version !== 'v1' || !sig) continue;
    let sigBuf: Buffer;
    try {
      sigBuf = Buffer.from(sig, 'base64');
    } catch {
      continue;
    }
    if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null; // match
    }
  }

  return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
}

/**
 * POST /api/webhooks/resend
 * Resend webhook handler for tracking email events. Verified via Svix signature.
 */
export async function POST(request: NextRequest) {
  // Fail-closed: webhook cannot operate without the signing secret configured.
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhooks/resend] RESEND_WEBHOOK_SECRET not configured — rejecting');
    return NextResponse.json(
      { error: 'Webhook signing secret not configured' },
      { status: 500 },
    );
  }

  // Raw body first — we need exact bytes for HMAC before JSON parsing.
  const rawBody = await request.text();

  const sigError = verifySvixSignature(request.headers, rawBody, secret);
  if (sigError) return sigError;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { type, data } = body;

  if (!type || !data) {
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  // Map Resend event types to our event names
  const eventMap: Record<string, string> = {
    'email.delivered': 'delivered',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
  };

  const event = eventMap[type];
  if (!event) {
    // Event type we don't track
    return NextResponse.json({ ok: true });
  }

  const resendEmailId = data.email_id;
  const recipientEmail = data.to?.[0] || data.email;

  if (!resendEmailId) {
    return NextResponse.json({ ok: true });
  }

  // Find the analytics record by resend_email_id to get campaign_id
  const { data: existing } = await supabase
    .from('email_analytics')
    .select('campaign_id, contact_id')
    .eq('resend_email_id', resendEmailId)
    .eq('event', 'sent')
    .limit(1)
    .single();

  if (!existing) {
    // Not from a campaign we track
    return NextResponse.json({ ok: true });
  }

  // Insert analytics event
  await supabase.from('email_analytics').insert({
    campaign_id: existing.campaign_id,
    contact_id: existing.contact_id,
    email: recipientEmail || '',
    event,
    resend_email_id: resendEmailId,
    metadata: data,
  });

  // Update campaign counters
  const counterField = `total_${event}`;
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', existing.campaign_id)
    .single();

  if (campaign) {
    const current = (campaign as unknown as Record<string, number>)[counterField] || 0;
    await supabase
      .from('email_campaigns')
      .update({ [counterField]: current + 1 })
      .eq('id', existing.campaign_id);
  }

  // Handle bounces — mark contact as bounced
  if (event === 'bounced' && recipientEmail) {
    await supabase
      .from('email_contacts')
      .update({ status: 'bounced' })
      .eq('id', existing.contact_id);
  }

  // Handle complaints — unsubscribe the contact
  if (event === 'complained' && recipientEmail) {
    // Get agency_id from campaign
    const { data: camp } = await supabase
      .from('email_campaigns')
      .select('agency_id')
      .eq('id', existing.campaign_id)
      .single();

    if (camp) {
      await unsubscribeContact(camp.agency_id, recipientEmail, 'complaint', existing.campaign_id);
    }
  }

  // ── FIX 5: Sync email engagement → CRM contact activity + score ──────────
  // Opens and clicks increase contact engagement score.
  // Bounces and complaints reduce it and update contact status.
  if (existing.contact_id && ['opened', 'clicked', 'bounced'].includes(event)) {
    try {
      // Get campaign agency_id
      const { data: camp } = await supabase
        .from('email_campaigns')
        .select('agency_id, client_id')
        .eq('id', existing.campaign_id)
        .single();

      if (camp?.agency_id) {
        // Find CRM contact linked to this email_contact
        const { data: emailContact } = await supabase
          .from('email_contacts')
          .select('email')
          .eq('id', existing.contact_id)
          .single();

        if (emailContact?.email) {
          const { data: crmContact } = await supabase
            .from('crm_contacts')
            .select('id')
            .eq('agency_id', camp.agency_id)
            .eq('email', emailContact.email)
            .maybeSingle();

          if (crmContact) {
            // Log as CRM activity
            await supabase.from('crm_activities').insert({
              agency_id: camp.agency_id,
              contact_id: crmContact.id,
              type: 'email',
              actor: 'system',
              direction: event === 'opened' || event === 'clicked' ? 'inbound' : 'outbound',
              subject: `Email ${event}`,
              body: `Email from campaign was ${event}`,
              needs_attention: false,
            });

            // Boost score on engagement: opened +5, clicked +10
            if (event === 'opened' || event === 'clicked') {
              const { data: c } = await supabase
                .from('crm_contacts')
                .select('score')
                .eq('id', crmContact.id)
                .single();
              if (c) {
                const bonus = event === 'clicked' ? 10 : 5;
                const newScore = Math.min(100, (c.score || 0) + bonus);
                await supabase
                  .from('crm_contacts')
                  .update({ score: newScore, last_activity_at: new Date().toISOString() })
                  .eq('id', crmContact.id);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('[webhooks/resend] CRM sync error:', err);
    }
  }

  return NextResponse.json({ ok: true });
}
