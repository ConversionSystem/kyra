import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agency/alerts
 * Returns recent alerts and unread count for the current agency.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const settings = (result.agency.settings as Record<string, unknown>) ?? {};
  const recentAlerts = (settings.recent_alerts as Array<Record<string, unknown>>) || [];
  const unreadCount = recentAlerts.filter((a) => a.read !== true).length;

  return NextResponse.json({
    alerts: recentAlerts,
    unread_count: unreadCount,
    total: recentAlerts.length,
  });
}

/**
 * POST /api/agency/alerts
 * Mark alerts as read or clear all.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const body = await request.json();
  const settings = (result.agency.settings as Record<string, unknown>) ?? {};
  const recentAlerts = (settings.recent_alerts as Array<Record<string, unknown>>) || [];

  if (body.action === 'mark_read') {
    // Mark all as read
    const updated = recentAlerts.map((a) => ({ ...a, read: true }));
    await supabase
      .from('agencies')
      .update({ settings: { ...settings, recent_alerts: updated } })
      .eq('id', result.agency.id);

    return NextResponse.json({ ok: true, marked: updated.length });
  }

  if (body.action === 'clear') {
    await supabase
      .from('agencies')
      .update({ settings: { ...settings, recent_alerts: [] } })
      .eq('id', result.agency.id);

    return NextResponse.json({ ok: true, cleared: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
