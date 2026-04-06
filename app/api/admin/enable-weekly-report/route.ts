// ============================================================================
// POST /api/admin/enable-weekly-report
//
// Enables weekly report for a specific agency by setting:
//   settings.weekly_report_enabled = true
//   settings.weekly_report_email   = email
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json() as { agencyId?: string; email?: string };
  const { agencyId, email } = body;

  if (!agencyId || !email) {
    return NextResponse.json({ error: 'agencyId and email are required' }, { status: 400 });
  }

  const admin = createServiceClientWithoutCookies();

  // Fetch existing settings to merge
  const { data: agency, error: fetchErr } = await admin
    .from('agencies')
    .select('settings')
    .eq('id', agencyId)
    .single();

  if (fetchErr || !agency) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
  }

  const updatedSettings = {
    ...(agency.settings as Record<string, unknown> ?? {}),
    weekly_report_enabled: true,
    weekly_report_email: email,
  };

  const { error: updateErr } = await admin
    .from('agencies')
    .update({ settings: updatedSettings })
    .eq('id', agencyId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, agencyId, email });
}
