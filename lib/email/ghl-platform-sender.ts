/**
 * GHL Platform Email Sender
 *
 * Sends all of Kyra's platform/transactional emails via the Conversion System
 * GHL sub-account (location: y1BFVhXMDNUPlbPxEpSA).
 *
 * Why GHL instead of Resend?
 * - conversionsystem.com domain is already verified + warmed in GHL
 * - hello@conversionsystem.com is a live, trusted sender
 * - All sent emails appear in GHL conversation history (audit trail)
 * - No extra DNS/domain setup needed
 *
 * Architecture:
 * - Creates or finds the recipient as a GHL contact
 * - Sends via GHL Conversations API (TYPE_EMAIL)
 * - Falls back to Resend (onboarding@resend.dev) if GHL fails
 *
 * Env vars used:
 *   GHL_PLATFORM_LOCATION_ID  — Kyra's own GHL location (y1BFVhXMDNUPlbPxEpSA)
 *   GHL_PLATFORM_TOKEN        — PIT token for the platform location
 *   RESEND_API_KEY             — fallback only
 */

import { Resend } from 'resend';

const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

// Platform GHL credentials — Kyra's own Conversion System sub-account
const PLATFORM_LOCATION_ID =
  process.env.GHL_PLATFORM_LOCATION_ID || 'y1BFVhXMDNUPlbPxEpSA';
const PLATFORM_TOKEN = process.env.GHL_PLATFORM_TOKEN;

// Verified sender in GHL
const PLATFORM_FROM_EMAIL =
  process.env.GHL_PLATFORM_FROM_EMAIL || 'hello@conversionsystem.com';
const PLATFORM_FROM_NAME =
  process.env.GHL_PLATFORM_FROM_NAME || 'Kyra';

// Fallback sender (Resend onboarding domain — no DNS setup needed)
const FALLBACK_FROM = 'Kyra <onboarding@resend.dev>';

export interface PlatformEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  fromName?: string;  // override sender name (keeps @conversionsystem.com)
}

export interface PlatformEmailResult {
  ok: boolean;
  provider: 'ghl' | 'resend' | 'none';
  messageId?: string;
  error?: string;
}

// ── GHL contact upsert ────────────────────────────────────────────────────────

async function getOrCreateContact(email: string, token: string): Promise<string | null> {
  // Search first
  const searchRes = await fetch(
    `${GHL_API}/contacts/search?locationId=${PLATFORM_LOCATION_ID}&query=${encodeURIComponent(email)}&limit=1`,
    { headers: { Authorization: `Bearer ${token}`, Version: GHL_VERSION }, signal: AbortSignal.timeout(8000) },
  );
  if (searchRes.ok) {
    const data = await searchRes.json() as { contacts?: Array<{ id: string }> };
    if (data.contacts?.[0]?.id) return data.contacts[0].id;
  }

  // Create if not found
  const createRes = await fetch(`${GHL_API}/contacts/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Version: GHL_VERSION },
    body: JSON.stringify({ locationId: PLATFORM_LOCATION_ID, email }),
    signal: AbortSignal.timeout(8000),
  });
  if (!createRes.ok) return null;
  const created = await createRes.json() as { contact?: { id: string } };
  return created.contact?.id ?? null;
}

// ── Main sender ───────────────────────────────────────────────────────────────

export async function sendPlatformEmail(params: PlatformEmailParams): Promise<PlatformEmailResult> {
  // Try GHL first
  if (PLATFORM_TOKEN) {
    try {
      const contactId = await getOrCreateContact(params.to, PLATFORM_TOKEN);
      if (contactId) {
        const fromName = params.fromName || PLATFORM_FROM_NAME;
        const res = await fetch(`${GHL_API}/conversations/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${PLATFORM_TOKEN}`,
            'Content-Type': 'application/json',
            Version: GHL_VERSION,
          },
          body: JSON.stringify({
            type: 'Email',
            contactId,
            locationId: PLATFORM_LOCATION_ID,
            subject: params.subject,
            html: params.html,
            emailFrom: `${fromName} <${PLATFORM_FROM_EMAIL}>`,
            emailTo: params.to,
            ...(params.replyTo ? { emailReplyMode: 'reply', replyToMessageId: undefined } : {}),
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok) {
          const data = await res.json() as { messageId?: string; emailMessageId?: string };
          console.log(`[platform-email] ✅ GHL → ${params.to} | ${params.subject}`);
          return { ok: true, provider: 'ghl', messageId: data.messageId || data.emailMessageId };
        }

        const errText = await res.text().catch(() => '');
        console.warn(`[platform-email] GHL failed (${res.status}): ${errText.slice(0, 200)}`);
      }
    } catch (err) {
      console.warn('[platform-email] GHL error, falling back to Resend:', err);
    }
  }

  // Fallback: Resend via onboarding@resend.dev (always works, no domain needed)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const { data, error } = await resend.emails.send({
        from: FALLBACK_FROM,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo,
      });
      if (error) throw new Error(error.message);
      console.log(`[platform-email] ✅ Resend fallback → ${params.to} | ${params.subject}`);
      return { ok: true, provider: 'resend', messageId: data?.id };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[platform-email] Resend fallback failed:', msg);
      return { ok: false, provider: 'resend', error: msg };
    }
  }

  return { ok: false, provider: 'none', error: 'No email provider configured (GHL_PLATFORM_TOKEN and RESEND_API_KEY both missing)' };
}

// ── Convenience wrappers (match existing sendEmailViaResend signature) ─────────

/**
 * Drop-in replacement for sendEmailViaResend — routes through GHL platform account.
 */
export async function sendPlatformEmailCompat(params: {
  to: string;
  subject: string;
  body: string;
  html?: string;
  replyTo?: string;
  fromName?: string;
  fromEmail?: string;
}): Promise<{ ok: boolean; provider: string; messageId?: string; error?: string }> {
  return sendPlatformEmail({
    to: params.to,
    subject: params.subject,
    html: params.html || `<p>${params.body.replace(/\n/g, '<br>')}</p>`,
    text: params.body,
    replyTo: params.replyTo,
    fromName: params.fromName,
  });
}
