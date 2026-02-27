/**
 * Email Sending Infrastructure
 *
 * Priority order:
 * 1. GHL API (if client has GHL connected) — sends from their GHL location
 * 2. Resend API (if RESEND_API_KEY is set) — sends from noreply@kyra.conversionsystem.com
 * 3. Fail gracefully with error
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.CRM_FROM_EMAIL || 'noreply@kyra.conversionsystem.com';
const FROM_NAME = process.env.CRM_FROM_NAME || 'Kyra CRM';

let resendClient: Resend | null = null;
function getResend(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(RESEND_API_KEY);
  return resendClient;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;       // plain text
  html?: string;      // optional HTML
  replyTo?: string;
  fromName?: string;  // override sender name
}

export interface SendSmsParams {
  to: string;
  body: string;
  ghlLocationId?: string;
  ghlContactId?: string;
}

export interface SendResult {
  ok: boolean;
  provider: 'ghl' | 'resend' | 'none';
  messageId?: string;
  error?: string;
}

/**
 * Send email via Resend (standalone, no GHL dependency)
 */
export async function sendEmailViaResend(params: SendEmailParams): Promise<SendResult> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, provider: 'none', error: 'No RESEND_API_KEY configured. Add it in Vercel env vars.' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${params.fromName || FROM_NAME} <${FROM_EMAIL}>`,
      to: [params.to],
      subject: params.subject,
      text: params.body,
      html: params.html || undefined,
      replyTo: params.replyTo || undefined,
    });

    if (error) {
      return { ok: false, provider: 'resend', error: error.message };
    }

    return { ok: true, provider: 'resend', messageId: data?.id };
  } catch (err) {
    return { ok: false, provider: 'resend', error: String(err) };
  }
}

/**
 * Send email — tries GHL first, falls back to Resend
 */
export async function sendEmail(
  params: SendEmailParams,
  ghlOptions?: { clientId: string; contactId: string },
): Promise<SendResult> {
  // Try GHL if available
  if (ghlOptions?.clientId && ghlOptions?.contactId) {
    try {
      const { sendGHLMessage, getValidToken } = await import('@/lib/ghl/api');
      const token = await getValidToken(ghlOptions.clientId);
      await sendGHLMessage(
        ghlOptions.clientId,
        token,
        ghlOptions.contactId,
        params.body,
        'TYPE_EMAIL',
      );
      return { ok: true, provider: 'ghl' };
    } catch {
      // GHL failed — fall through to Resend
    }
  }

  // Fallback to Resend
  return sendEmailViaResend(params);
}

/**
 * Send digest email to agency owner
 */
export async function sendDigestEmail(
  ownerEmail: string,
  agencyName: string,
  digestBody: string,
): Promise<SendResult> {
  return sendEmailViaResend({
    to: ownerEmail,
    subject: `🤖 ${agencyName} — Daily CRM Digest`,
    body: digestBody,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 24px; border-radius: 12px; margin-bottom: 20px;">
          <h1 style="margin: 0 0 4px 0; font-size: 20px;">🤖 Daily CRM Digest</h1>
          <p style="margin: 0; opacity: 0.85; font-size: 14px;">${agencyName}</p>
        </div>
        <div style="background: #f9fafb; padding: 20px; border-radius: 12px; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #374151;">
${digestBody}
        </div>
        <p style="text-align: center; margin-top: 20px;">
          <a href="https://kyra.conversionsystem.com/agency/crm" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Open CRM Dashboard →</a>
        </p>
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">Kyra AI — Your CRM on autopilot</p>
      </div>
    `,
    fromName: `${agencyName} via Kyra`,
  });
}
