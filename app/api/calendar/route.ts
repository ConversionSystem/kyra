import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  isGoogleConnected, 
  getTodayEvents, 
  getEventsInRange,
  createEvent,
  updateEvent,
  deleteEvent,
  disconnectGoogle 
} from '@/lib/integrations/google';

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

async function ensureConnected(userId: string) {
  const connected = await isGoogleConnected(userId);
  if (!connected) {
    return NextResponse.json({ 
      error: 'Google Calendar not connected',
      connect_url: '/api/auth/google',
    }, { status: 400 });
  }
  return null;
}

/**
 * GET /api/calendar
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const err = await ensureConnected(user.id);
    if (err) return err;

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'today';

    let events;
    const now = new Date();

    switch (range) {
      case 'week': {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        events = await getEventsInRange(user.id, startOfWeek, endOfWeek);
        break;
      }
      case 'month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        events = await getEventsInRange(user.id, startOfMonth, endOfMonth);
        break;
      }
      default:
        events = await getTodayEvents(user.id);
    }

    return NextResponse.json({ events, range });
  } catch (error) {
    console.error('Calendar fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

/**
 * POST /api/calendar — Create event
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const err = await ensureConnected(user.id);
    if (err) return err;

    const { summary, description, start, end, location, attendees } = (await request.json()) as any;

    if (!summary || !start || !end) {
      return NextResponse.json({ error: 'Missing required fields: summary, start, end' }, { status: 400 });
    }

    const event = await createEvent(user.id, {
      summary,
      description,
      start: new Date(start),
      end: new Date(end),
      location,
      attendees,
    });

    if (!event) {
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Calendar create error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

/**
 * PUT /api/calendar — Update event
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const err = await ensureConnected(user.id);
    if (err) return err;

    const { eventId, summary, description, start, end, location, attendees } = (await request.json()) as any;

    if (!eventId) {
      return NextResponse.json({ error: 'Missing required field: eventId' }, { status: 400 });
    }

    const event = await updateEvent(user.id, eventId, {
      summary,
      description,
      start: start ? new Date(start) : undefined,
      end: end ? new Date(end) : undefined,
      location,
      attendees,
    });

    if (!event) {
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Calendar update error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

/**
 * DELETE /api/calendar
 * ?eventId=xxx → delete specific event
 * ?disconnect=true → disconnect Google Calendar
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const disconnect = searchParams.get('disconnect');

    if (disconnect === 'true') {
      await disconnectGoogle(user.id);
      return NextResponse.json({ success: true });
    }

    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId or disconnect param' }, { status: 400 });
    }

    const err = await ensureConnected(user.id);
    if (err) return err;

    const success = await deleteEvent(user.id, eventId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Calendar delete error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
