import { NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// GET /api/admin/orphaned-users
// Returns auth users who never created/joined an agency (no agency_members row)
export async function GET() {
  try {
    const service = createServiceClientWithoutCookies();
    const { data, error } = await service
      .from('orphaned_auth_users')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('[admin/orphaned-users] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to load orphaned users' }, { status: 500 });
    }

    return NextResponse.json({ users: data ?? [] });
  } catch (e: any) {
    console.error('[admin/orphaned-users] Unexpected error:', e.message);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
