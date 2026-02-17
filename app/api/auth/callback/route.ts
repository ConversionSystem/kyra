import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawRedirect = searchParams.get('redirect') || '/agency';
  const redirect = decodeURIComponent(rawRedirect);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  // Return to login if there was an error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
