// POST /api/auth/signup-intent
//
// Called immediately after a user creates their auth account (step 1 of agency signup)
// but BEFORE they've named/created their agency (step 2).
//
// This fires a GHL webhook so a 1-hour delay workflow can follow up
// if the agency was never created — the hottest possible lead.
//
// GHL workflow: trigger type=signup_intent
//   → Wait 1 hour
//   → Check if contact has agency_created=true tag
//   → If NO: send "Complete your setup" email

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ ok: false }, { status: 400 });

  // Always log the intent to Supabase so we never "lose" a signup
  try {
    const service = createServiceClientWithoutCookies();
    await service
      .from('kyra_waitlist')
      .upsert({ email, source: 'signup_intent' }, { onConflict: 'email' });
  } catch (e) {
    console.warn('[signup-intent] Failed to log to kyra_waitlist (non-fatal):', (e as Error).message);
  }

  const webhookUrl = process.env.SIGNUP_WEBHOOK_URL;
  if (!webhookUrl) {
    // No GHL webhook configured — we still logged the intent above
    return NextResponse.json({ ok: true, webhook: 'skipped' });
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'signup_intent',
        email,
        timestamp: new Date().toISOString(),
        // GHL: create contact, add "signup_started" tag, start 1-hour delay workflow
        // After 1h: if no agency_created tag → send abandoned signup email
        notes: 'User created auth account but agency setup not yet completed. Follow up in 1 hour.',
        recoveryUrl: `https://kyra.conversionsystem.com/signup/agency`,
        urgency: 'high',
      }),
    });
  } catch {
    // Non-fatal — don't block the user experience
    console.warn('[signup-intent] Webhook failed');
  }

  return NextResponse.json({ ok: true });
}
