import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  isGoogleConnected, 
  getTodayEvents, 
  getEventsInRange,
  createEvent,
  disconnectGoogle 
} from '@/lib/integrations/google';

/**
 * GET /api/calendar
 * 
 * Get calendar events for the authenticated user.
 * Query params:
 * - range: 'today' | 'week' | 'month' (default: 'today')
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connected = await isGoogleConnected(user.id);
    if (!connected) {
      return NextResponse.json({ 
        error: 'Google Calendar not connected',
        connect_url: '/api/auth/google',
      }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'today';

    let events;
    const now = new Date();

    switch (range) {
      case 'week': {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
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
 * POST /api/calendar
 * 
 * Create a new calendar event.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connected = await isGoogleConnected(user.id);
    if (!connected) {
      return NextResponse.json({ 
        error: 'Google Calendar not connected',
        connect_url: '/api/auth/google',
      }, { status: 400 });
    }

    const { summary, description, start, end, location, attendees } = await request.json();

    if (!summary || !start || !end) {
      return NextResponse.json({ 
        error: 'Missing required fields: summary, start, end' 
      }, { status: 400 });
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
 * DELETE /api/calendar
 * 
 * Disconnect Google Calendar integration.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await disconnectGoogle(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Calendar disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
