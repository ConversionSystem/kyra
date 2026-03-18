import { NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

/**
 * GET /api/agency/build-requests
 * List all build requests (master only for now — all requests are global).
 */
export async function GET() {
  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createServiceClientWithoutCookies();

  const { data, error } = await supabase
    .from('build_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[build-requests] Failed to list:', error);
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
