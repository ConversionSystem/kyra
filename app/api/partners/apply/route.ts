// POST /api/partners/apply — store partner application + notify via GHL webhook

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, website, audience, ghlTier, hearAbout } = body;

  if (!name || !email || !audience) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Store in partner_applications table (or agencies.settings as fallback)
  // Use a simple Supabase upsert into a generic table — graceful fallback if table doesn't exist
  try {
    const svc = createServiceClientWithoutCookies();
    await svc.from('partner_applications').insert({
      name, email, website, audience, ghl_tier: ghlTier,
      hear_about: hearAbout, status: 'pending', created_at: new Date().toISOString(),
    });
  } catch {
    // Table might not exist yet — log and continue (we still send the webhook)
    console.warn('[partners/apply] Could not insert into partner_applications — table may not exist yet');
  }

  // Notify via SIGNUP_WEBHOOK_URL (GHL workflow) if configured
  const webhookUrl = process.env.SIGNUP_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'partner_application',
          name, email, website, audience, ghlTier, hearAbout,
          submittedAt: new Date().toISOString(),
        }),
      });
    } catch {
      console.warn('[partners/apply] Webhook notification failed');
    }
  }

  return NextResponse.json({ ok: true });
}
