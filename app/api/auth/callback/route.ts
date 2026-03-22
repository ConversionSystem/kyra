import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAndActivateReferral } from '@/lib/billing/referral-activation';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Support both ?redirect= (our convention) and ?next= (Supabase default)
  const rawRedirect = searchParams.get('redirect') || searchParams.get('next') || '/agency';
  const redirect = decodeURIComponent(rawRedirect);

  // Detect password reset flow — Supabase sets type=recovery in the URL
  const type = searchParams.get('type');
  const isRecovery = type === 'recovery' || redirect.includes('reset-password');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // ── Referral activation gate ─────────────────────────────────────────
      if (data?.user?.id && !isRecovery) {
        void checkAndActivateReferral(data.user.id);
      }

      // For password recovery, always go to reset-password page
      const destination = isRecovery ? '/reset-password' : redirect;
      return NextResponse.redirect(`${origin}${destination}`);
    }

    // Log the error for debugging
    console.error('[auth/callback] exchangeCodeForSession error:', error.message, '| code present:', !!code, '| redirect:', redirect);
  }

  // Return to login if there was an error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
