// GET /invite/[code]
// Referral invite landing — looks up agency by invite code, sets cookie,
// increments click counter (atomically via DB function), redirects to /solo.
//
// Uses a route handler (not page.tsx) so we can set the referral cookie
// before redirecting — this makes the referral survive tab closes + in-app browsers.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const base = request.nextUrl.origin;

  if (!code || code.length < 4) {
    return NextResponse.redirect(new URL('/solo', base));
  }

  const db = createServiceClientWithoutCookies();

  // Look up agency by invite code (stored in settings JSONB)
  const { data: agencies } = await db
    .from('agencies')
    .select('id, name, settings')
    .filter('settings->>invite_code', 'eq', code)
    .limit(1);

  const agency = agencies?.[0];

  if (!agency) {
    return NextResponse.redirect(new URL('/solo', base));
  }

  // Increment click counter atomically (avoid overwrite race conditions)
  const settings = (agency.settings ?? {}) as Record<string, unknown>;
  const clicks = ((settings.invite_clicks as number) ?? 0) + 1;

  await db
    .from('agencies')
    .update({
      settings: {
        ...settings,
        invite_clicks: clicks,
      },
    })
    .eq('id', agency.id);

  // Build redirect URL — include ?from= so the referral banner shows on /solo
  const soloUrl = new URL('/solo', base);
  soloUrl.searchParams.set('ref', agency.id);
  soloUrl.searchParams.set('from', agency.name);

  const response = NextResponse.redirect(soloUrl);

  // Set 30-day cookie so referral survives: tab closes, navigation, returning visits
  // Not httpOnly — allows client-side reads as fallback
  response.cookies.set('kyra_ref', agency.id, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    httpOnly: false,   // readable by client JS as a fallback
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  // Also store agency name so we can show the banner even if user returns later
  response.cookies.set('kyra_ref_name', agency.name, {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
