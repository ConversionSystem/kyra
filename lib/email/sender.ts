/**
 * Email Sending Infrastructure
 *
 * Priority order:
 * 1. GHL API (if client has GHL connected) — sends from their GHL location
 * 2. GHL Platform account (Conversion System) — sends from hello@conversionsystem.com
 * 3. Resend fallback via onboarding@resend.dev
 * 4. Fail gracefully with error
 *
 * NOTE: conversionsystem.com / kyra.conversionsystem.com are NOT verified in Resend.
 * All platform emails now route through GHL (lib/email/ghl-platform-sender.ts).
 */

import { sendPlatformEmailCompat } from './ghl-platform-sender';

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;       // plain text
  html?: string;      // optional HTML
  replyTo?: string;
  fromName?: string;  // override sender name
  fromEmail?: string; // override full from address e.g. "Name <addr@domain.com>"
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
 * Send platform email — routes through GHL Conversion System account,
 * falls back to Resend (onboarding@resend.dev) if GHL unavailable.
 *
 * Previously sent via Resend with unverified domain (broken).
 * Now sends from hello@conversionsystem.com via GHL (verified + warmed).
 */
export async function sendEmailViaResend(params: SendEmailParams): Promise<SendResult> {
  const result = await sendPlatformEmailCompat(params);
  return {
    ok: result.ok,
    provider: result.provider as SendResult['provider'],
    messageId: result.messageId,
    error: result.error,
  };
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
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">Kyra AI — Your AI Workforce Platform</p>
      </div>
    `,
    fromName: `${agencyName} via Kyra`,
  });
}
