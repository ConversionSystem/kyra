import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

/**
 * GET /api/debug
 *
 * Returns env-presence info for debugging. Restricted to admin accounts only.
 * ⚠️ Never return actual key values — only booleans for whether they are set.
 */
export async function GET() {
  // Auth check — admin only
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    env: {
      hasCronSecret: !!process.env.CRON_SECRET,
      hasKyraApiSecret: !!process.env.KYRA_API_SECRET,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasGhlClientId: !!process.env.GHL_CLIENT_ID,
      nodeEnv: process.env.NODE_ENV,
    },
  });
}
