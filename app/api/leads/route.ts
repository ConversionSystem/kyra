// POST /api/leads
// Captures a prospective agency's email from the landing page.
// Stores in kyra_waitlist table (created by migration) and
// fires a Slack/GHL notification via Resend if configured.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';

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

  // Notify Angel — fire-and-forget
  void import('@/lib/email/ghl-platform-sender').then(({ sendPlatformEmail }) =>
    sendPlatformEmail({
      to: 'angel@conversionsystem.com',
      subject: body.source === 'get-demo' ? `🎯 Demo request: ${body.name || email}` : `🔔 New lead: ${email}`,
      html: `<b>${body.source === 'get-demo' ? '🎯 Demo Request' : '🔔 New Lead'}</b><br><br>
<b>Email:</b> ${email}<br>
${body.name ? `<b>Name:</b> ${body.name}<br>` : ''}
${body.company ? `<b>Company:</b> ${body.company}<br>` : ''}
${body.industry ? `<b>Industry:</b> ${body.industry}<br>` : ''}
${body.size ? `<b>GHL clients:</b> ${body.size}<br>` : ''}
${body.how ? `<b>How they heard:</b> ${body.how}<br>` : ''}
${body.message ? `<b>Message:</b> ${body.message}<br>` : ''}
<b>Source:</b> ${body.source || 'landing'}`,
      fromName: 'Kyra Leads',
    }).catch(() => {})
  );

  return NextResponse.json({ ok: true });
}
