// ============================================================================
// GET/POST /api/agency/clients/[id]/bookings
// List and create bookings for a client
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const agencyId = await getAgencyId(user.id);
    if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

    const { id: clientId } = await params;
    const url = req.nextUrl;
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const svc = createServiceClientWithoutCookies();
    let query = svc
      .from('client_bookings')
      .select('*')
      .eq('client_id', clientId)
      .eq('agency_id', agencyId)
      .order('start_time', { ascending: true });

    if (status) query = query.eq('status', status);
    if (startDate) query = query.gte('start_time', startDate);
    if (endDate) query = query.lte('start_time', endDate);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ bookings: data || [] });
  } catch (err) {
    console.error('[bookings GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const agencyId = await getAgencyId(user.id);
    if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

    const { id: clientId } = await params;
    const body = await req.json();

    const {
      contact_name,
      contact_phone,
      contact_email,
      contact_id,
      service,
      start_time,
      end_time,
      duration_minutes = 60,
      notes,
      status = 'confirmed',
    } = body;

    if (!start_time || !end_time) {
      return NextResponse.json({ error: 'start_time and end_time are required' }, { status: 400 });
    }

    const svc = createServiceClientWithoutCookies();
    const { data, error } = await svc
      .from('client_bookings')
      .insert({
        agency_id: agencyId,
        client_id: clientId,
        contact_id: contact_id || null,
        contact_name: contact_name || null,
        contact_phone: contact_phone || null,
        contact_email: contact_email || null,
        service: service || null,
        start_time,
        end_time,
        duration_minutes,
        status,
        notes: notes || null,
        booked_via: 'manual',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ booking: data }, { status: 201 });
  } catch (err) {
    console.error('[bookings POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
