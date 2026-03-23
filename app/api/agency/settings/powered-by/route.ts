import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyMember, requireAgencyAdmin } from '@/lib/agency/middleware';

/**
 * GET /api/agency/settings/powered-by
 * Returns { show_powered_by: boolean, can_toggle: boolean }
 *
 * Free/Lite → always true, cannot toggle
 * Pro/Scale → default true, can toggle off
 */
export async function GET() {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const settings = (agency.settings ?? {}) as Record<string, unknown>;
  const canToggle = agency.plan === 'pro' || agency.plan === 'scale';

  // Free/Lite always show badge
  const showPoweredBy = canToggle
    ? settings.show_powered_by !== false // default true
    : true;

  return NextResponse.json({ show_powered_by: showPoweredBy, can_toggle: canToggle });
}

/**
 * POST /api/agency/settings/powered-by
 * Body: { show_powered_by: boolean }
 * Only Pro/Scale can toggle.
 */
export async function POST(request: NextRequest) {
  const result = await requireAgencyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const canToggle = agency.plan === 'pro' || agency.plan === 'scale';

  if (!canToggle) {
    return NextResponse.json(
      { error: 'Upgrade to Pro or Scale to toggle the Powered by Kyra badge' },
      { status: 403 },
    );
  }

  let body: { show_powered_by?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const showPoweredBy = body.show_powered_by !== false;
  const currentSettings = (agency.settings ?? {}) as Record<string, unknown>;

  const supabase = await createClient();
  const { error } = await supabase
    .from('agencies')
    .update({
      settings: { ...currentSettings, show_powered_by: showPoweredBy },
      updated_at: new Date().toISOString(),
    })
    .eq('id', agency.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }

  return NextResponse.json({ show_powered_by: showPoweredBy, can_toggle: true });
}
