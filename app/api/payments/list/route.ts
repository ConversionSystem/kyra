import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET — List payment requests for the current agency
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: membership } = await sb
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const status = req.nextUrl.searchParams.get('status');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);

  let query = sb
    .from('payment_requests')
    .select('*')
    .eq('agency_id', membership.agency_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[payments/list] DB error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }

  return NextResponse.json({ payments: data || [] });
}
