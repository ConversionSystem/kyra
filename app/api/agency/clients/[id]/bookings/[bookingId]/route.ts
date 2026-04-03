// ============================================================================
// PATCH /api/agency/clients/[id]/bookings/[bookingId]
// Update or cancel a booking
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bookingId: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const agencyId = await getAgencyId(user.id);
    if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

    const { id: clientId, bookingId } = await params;
    const body = await req.json();

    const allowedFields = [
      'status', 'start_time', 'end_time', 'duration_minutes',
      'service', 'notes', 'contact_name', 'contact_phone', 'contact_email',
    ];

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const svc = createServiceClientWithoutCookies();
    const { data, error } = await svc
      .from('client_bookings')
      .update(updates)
      .eq('id', bookingId)
      .eq('client_id', clientId)
      .eq('agency_id', agencyId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    return NextResponse.json({ booking: data });
  } catch (err) {
    console.error('[bookings PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
