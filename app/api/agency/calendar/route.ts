// ============================================================================
// GET /api/agency/calendar
// Agency-wide calendar view — all bookings across all clients
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const agencyId = await getAgencyId(user.id);
    if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

    const url = req.nextUrl;
    const clientId = url.searchParams.get('clientId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const status = url.searchParams.get('status');

    const svc = createServiceClientWithoutCookies();
    let query = svc
      .from('client_bookings')
      .select('*, agency_clients!inner(name)')
      .eq('agency_id', agencyId)
      .order('start_time', { ascending: true });

    if (clientId) query = query.eq('client_id', clientId);
    if (status) query = query.eq('status', status);
    if (startDate) query = query.gte('start_time', startDate);
    if (endDate) query = query.lte('start_time', endDate);

    const { data, error } = await query;
    if (error) throw error;

    // Get list of clients for filter dropdown
    const { data: clients } = await svc
      .from('agency_clients')
      .select('id, name')
      .eq('agency_id', agencyId)
      .eq('status', 'active')
      .order('name');

    return NextResponse.json({
      bookings: data || [],
      clients: clients || [],
    });
  } catch (err) {
    console.error('[calendar GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
