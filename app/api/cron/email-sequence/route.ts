// ============================================================================
// GET /api/cron/email-sequence
//
// Vercel cron — runs daily at 9am CET (08:00 UTC).
// Sends the right onboarding email based on how many days since agency signup.
//
// Schedule: days 1, 3, 5, 7 post-signup (configurable in SEQUENCE_DAYS)
// Skips: agencies that opted out, already paying (days 5+7), RESEND not set
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { sendSequenceEmail, SEQUENCE_DAYS } from '@/lib/email/sequences';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Auth: Vercel CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClientWithoutCookies();
  const now = new Date();

  // Fetch agencies created in the last 8 days (sequence runs days 1–7)
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - 8);

  const { data: agencies, error } = await supabase
    .from('agencies')
    .select(`
      id, name, plan, created_at, settings,
      agency_members!inner(user_id, role)
    `)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at');

  if (error) {
    console.error('[email-sequence] DB error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!agencies?.length) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No agencies in window' });
  }

  const results: Array<{ agencyId: string; day: number; result: string }> = [];

  for (const agency of agencies) {
    const settings = (agency.settings ?? {}) as Record<string, unknown>;

    // Check opt-out
    if (settings.email_sequence_optout === true) continue;

    const createdAt = new Date(agency.created_at);
    const daysSince = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    // Check if today matches a sequence day
    const sequenceDay = SEQUENCE_DAYS.find(d => d === daysSince);
    if (!sequenceDay) continue;

    // Check if already sent this day (stored in settings.email_sequence_sent)
    const sentDays = (settings.email_sequence_sent as number[]) ?? [];
    if (sentDays.includes(sequenceDay)) continue;

    // Get owner email from auth.users via agency_members
    const owner = (agency.agency_members as Array<{ user_id: string; role: string }>)
      .find(m => m.role === 'owner');
    if (!owner) continue;

    const { data: userData } = await supabase.auth.admin.getUserById(owner.user_id);
    const ownerEmail = userData?.user?.email;
    if (!ownerEmail) continue;

    // Get client count + GHL status
    const { count: clientCount } = await supabase
      .from('agency_clients')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agency.id);

    const { data: ghlClient } = await supabase
      .from('agency_clients')
      .select('ghl_location_id')
      .eq('agency_id', agency.id)
      .not('ghl_location_id', 'is', null)
      .limit(1)
      .maybeSingle();

    // Compose owner name from email or settings
    const ownerName = (settings.owner_name as string) || ownerEmail.split('@')[0];

    const agencyData = {
      id: agency.id,
      name: agency.name,
      plan: agency.plan ?? 'free',
      ownerEmail,
      ownerName,
      clientCount: clientCount ?? 0,
      ghlConnected: !!ghlClient,
      createdAt: agency.created_at,
    };

    const result = await sendSequenceEmail(agencyData, sequenceDay);

    if (result.ok) {
      // Mark as sent in settings
      const updatedSent = [...sentDays, sequenceDay];
      await supabase
        .from('agencies')
        .update({
          settings: { ...settings, email_sequence_sent: updatedSent },
        })
        .eq('id', agency.id);

      console.log(`[email-sequence] ✅ Day ${sequenceDay} → ${agencyData.name} (${ownerEmail})`);
      results.push({ agencyId: agency.id, day: sequenceDay, result: 'sent' });
    } else {
      console.log(`[email-sequence] ⚠️ Day ${sequenceDay} → ${agencyData.name}: ${result.skipped}`);
      results.push({ agencyId: agency.id, day: sequenceDay, result: result.skipped ?? 'failed' });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: agencies.length,
    sent: results.filter(r => r.result === 'sent').length,
    results,
    timestamp: now.toISOString(),
  });
}
