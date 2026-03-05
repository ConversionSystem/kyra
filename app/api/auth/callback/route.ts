import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAndActivateReferral } from '@/lib/billing/referral-activation';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawRedirect = searchParams.get('redirect') || '/agency';
  const redirect = decodeURIComponent(rawRedirect);

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // ── Referral activation gate ─────────────────────────────────────────
      // This fires when a user confirms their email (Supabase redirects here).
      // If they came via a referral link, this is the moment we grant the referrer credits.
      // Fire-and-forget — don't block the redirect on this.
      if (data?.user?.id) {
        void checkAndActivateReferral(data.user.id);
      }

      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  // Return to login if there was an error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
