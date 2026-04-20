import { NextResponse } from 'next/server';
import { requireMaster } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug
 *
 * Returns env-presence info for debugging. Restricted to admin accounts only.
 * ⚠️ Never return actual key values — only booleans for whether they are set.
 */
export async function GET() {
  const auth = await requireMaster();
  if (!auth.ok) return auth.response;

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
