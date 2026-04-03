// ============================================================================
// GET/PATCH /api/agency/clients/[id]/booking-config
// Get and save AI booking configuration for a client
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const agencyId = await getAgencyId(user.id);
    if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

    const { id: clientId } = await params;
    const svc = createServiceClientWithoutCookies();

    const { data } = await svc
      .from('client_booking_config')
      .select('*')
      .eq('client_id', clientId)
      .eq('agency_id', agencyId)
      .single();

    // Return default config if none exists
    if (!data) {
      return NextResponse.json({
        config: {
          client_id: clientId,
          agency_id: agencyId,
          enabled: false,
          available_hours: {
            monday:    { start: '09:00', end: '17:00', enabled: true },
            tuesday:   { start: '09:00', end: '17:00', enabled: true },
            wednesday: { start: '09:00', end: '17:00', enabled: true },
            thursday:  { start: '09:00', end: '17:00', enabled: true },
            friday:    { start: '09:00', end: '17:00', enabled: true },
            saturday:  { start: '09:00', end: '17:00', enabled: false },
            sunday:    { start: '09:00', end: '17:00', enabled: false },
          },
          timezone: 'America/New_York',
          appointment_duration: 60,
          buffer_minutes: 0,
          services: [],
          confirmation_template: 'Your appointment has been confirmed for {date} at {time}. See you then!',
          booking_link: null,
        },
      });
    }

    return NextResponse.json({ config: data });
  } catch (err) {
    console.error('[booking-config GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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

    const svc = createServiceClientWithoutCookies();

    // Upsert — create if doesn't exist, update if it does
    const { data, error } = await svc
      .from('client_booking_config')
      .upsert(
        {
          client_id: clientId,
          agency_id: agencyId,
          enabled: body.enabled ?? false,
          available_hours: body.available_hours,
          timezone: body.timezone ?? 'America/New_York',
          appointment_duration: body.appointment_duration ?? 60,
          buffer_minutes: body.buffer_minutes ?? 0,
          services: body.services ?? [],
          confirmation_template: body.confirmation_template ?? 'Your appointment has been confirmed for {date} at {time}. See you then!',
          booking_link: body.booking_link ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id' },
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ config: data });
  } catch (err) {
    console.error('[booking-config PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
