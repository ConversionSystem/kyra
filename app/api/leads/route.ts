// POST /api/leads
// Captures a prospective agency's email from the landing page.
// Stores in kyra_waitlist table (created by migration) and
// fires a Slack/GHL notification via Resend if configured.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { escapeHtml } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function POST(request: NextRequest) {
  let body: { email?: string; name?: string; industry?: string; source?: string; company?: string; size?: string; how?: string; message?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Upsert to kyra_waitlist (ignore if already exists)
  const { error: dbError } = await supabase
    .from('kyra_waitlist')
    .upsert(
      { email, name: body.name?.trim() || null, industry: body.industry?.trim() || null, source: body.source || 'landing' },
      { onConflict: 'email', ignoreDuplicates: true }
    );

  if (dbError) {
    // If table doesn't exist yet (migration not applied), log and return success anyway
    console.warn('[leads] DB error (migration may not be applied):', dbError.message);
  }

  // Notify Angel — fire-and-forget. All user-controlled fields escaped with
  // escapeHtml() to prevent HTML injection / mail-client XSS. Angel's inbox
  // is the one reading this.
  const safeEmail    = escapeHtml(email);
  const safeName     = escapeHtml(body.name);
  const safeCompany  = escapeHtml(body.company);
  const safeIndustry = escapeHtml(body.industry);
  const safeSize     = escapeHtml(body.size);
  const safeHow      = escapeHtml(body.how);
  const safeMessage  = escapeHtml(body.message);
  const safeSource   = escapeHtml(body.source || 'landing');
  const isDemo       = body.source === 'get-demo';
  const safeSubjectName = escapeHtml(body.name || email);

  void import('@/lib/email/ghl-platform-sender').then(({ sendPlatformEmail }) =>
    sendPlatformEmail({
      to: 'angel@conversionsystem.com',
      // Subject is plain text (not HTML), but we still strip control chars
      // by passing through escapeHtml (which becomes a no-op in plain-text
      // headers since the email lib sets Content-Type appropriately).
      subject: isDemo ? `🎯 Demo request: ${safeSubjectName}` : `🔔 New lead: ${safeEmail}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:20px 24px;border-radius:10px 10px 0 0;">
            <h2 style="margin:0;font-size:18px;font-weight:700;">${isDemo ? '🎯 Demo Request' : '🔔 New Lead'}</h2>
            <p style="margin:4px 0 0;opacity:0.85;font-size:13px;">Kyra Leads · kyra.conversionsystem.com</p>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 10px 10px;background:#f9fafb;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:10px 8px;color:#6b7280;font-weight:600;width:140px;">Email</td>
                <td style="padding:10px 8px;color:#111827;font-weight:700;">${safeEmail}</td>
              </tr>
              ${safeName ? `<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:10px 8px;color:#6b7280;font-weight:600;">Name</td><td style="padding:10px 8px;color:#111827;">${safeName}</td></tr>` : ''}
              ${safeCompany ? `<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:10px 8px;color:#6b7280;font-weight:600;">Company</td><td style="padding:10px 8px;color:#111827;">${safeCompany}</td></tr>` : ''}
              ${safeIndustry ? `<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:10px 8px;color:#6b7280;font-weight:600;">Industry</td><td style="padding:10px 8px;color:#111827;">${safeIndustry}</td></tr>` : ''}
              ${safeSize ? `<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:10px 8px;color:#6b7280;font-weight:600;">GHL clients</td><td style="padding:10px 8px;color:#111827;">${safeSize}</td></tr>` : ''}
              ${safeHow ? `<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:10px 8px;color:#6b7280;font-weight:600;">How they heard</td><td style="padding:10px 8px;color:#111827;">${safeHow}</td></tr>` : ''}
              ${safeMessage ? `<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:10px 8px;color:#6b7280;font-weight:600;vertical-align:top;">Message</td><td style="padding:10px 8px;color:#111827;">${safeMessage}</td></tr>` : ''}
              <tr>
                <td style="padding:10px 8px;color:#6b7280;font-weight:600;">Source</td>
                <td style="padding:10px 8px;color:#111827;">${safeSource}</td>
              </tr>
            </table>
          </div>
        </div>`,
      fromName: 'Kyra Leads',
    }).catch(() => {})
  );

  return NextResponse.json({ ok: true });
}
