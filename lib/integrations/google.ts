/**
 * Google Calendar Integration
 * 
 * OAuth flow and calendar operations.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/auth/google/callback';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  token_expires_at: Date;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: string[];
}

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(userId: string): string {
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
  
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_expires_at: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();
  
  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // Keep the original refresh token
    token_expires_at: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Save Google tokens to integrations table
 */
export async function saveGoogleTokens(userId: string, tokens: GoogleTokens): Promise<void> {
  const supabase = createServiceClientWithoutCookies();
  
  const { error } = await supabase
    .from('integrations')
    .upsert({
      user_id: userId,
      provider: 'google',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.token_expires_at.toISOString(),
      metadata: { scopes: SCOPES },
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,provider',
    });

  if (error) {
    throw new Error(`Failed to save tokens: ${error.message}`);
  }
}

/**
 * Get valid access token for user (refreshes if needed)
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = createServiceClientWithoutCookies();
  
  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single();

  if (!integration) {
    return null;
  }

  const expiresAt = new Date(integration.token_expires_at);
  const now = new Date();

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    if (!integration.refresh_token) {
      return null;
    }

    try {
      const newTokens = await refreshAccessToken(integration.refresh_token);
      await saveGoogleTokens(userId, newTokens);
      return newTokens.access_token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  return integration.access_token;
}

/**
 * Check if user has Google Calendar connected
 */
export async function isGoogleConnected(userId: string): Promise<boolean> {
  const token = await getValidAccessToken(userId);
  return token !== null;
}

/**
 * Disconnect Google Calendar
 */
export async function disconnectGoogle(userId: string): Promise<void> {
  const supabase = createServiceClientWithoutCookies();
  
  await supabase
    .from('integrations')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'google');
}

/**
 * Get today's calendar events
 */
export async function getTodayEvents(userId: string): Promise<CalendarEvent[]> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return [];
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    console.error('Calendar fetch failed:', await response.text());
    return [];
  }

  const data = await response.json();
  
  return (data.items || []).map((event: any) => ({
    id: event.id,
    summary: event.summary || 'Untitled Event',
    description: event.description,
    start: new Date(event.start.dateTime || event.start.date),
    end: new Date(event.end.dateTime || event.end.date),
    location: event.location,
    attendees: event.attendees?.map((a: any) => a.email),
  }));
}

/**
 * Get events for a date range
 */
export async function getEventsInRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return [];
  }

  const params = new URLSearchParams({
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    console.error('Calendar fetch failed:', await response.text());
    return [];
  }

  const data = await response.json();
  
  return (data.items || []).map((event: any) => ({
    id: event.id,
    summary: event.summary || 'Untitled Event',
    description: event.description,
    start: new Date(event.start.dateTime || event.start.date),
    end: new Date(event.end.dateTime || event.end.date),
    location: event.location,
    attendees: event.attendees?.map((a: any) => a.email),
  }));
}

/**
 * Create a calendar event
 */
export async function createEvent(
  userId: string,
  event: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    location?: string;
    attendees?: string[];
  }
): Promise<CalendarEvent | null> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return null;
  }

  const eventData: any = {
    summary: event.summary,
    description: event.description,
    start: { dateTime: event.start.toISOString() },
    end: { dateTime: event.end.toISOString() },
  };

  if (event.location) {
    eventData.location = event.location;
  }

  if (event.attendees?.length) {
    eventData.attendees = event.attendees.map(email => ({ email }));
  }

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    }
  );

  if (!response.ok) {
    console.error('Event creation failed:', await response.text());
    return null;
  }

  const data = await response.json();
  
  return {
    id: data.id,
    summary: data.summary,
    description: data.description,
    start: new Date(data.start.dateTime || data.start.date),
    end: new Date(data.end.dateTime || data.end.date),
    location: data.location,
    attendees: data.attendees?.map((a: any) => a.email),
  };
}

/**
 * Format events for context injection
 */
export function formatEventsForContext(events: CalendarEvent[]): string {
  if (events.length === 0) {
    return "You have no events scheduled for today.";
  }

  const formatted = events.map(event => {
    const startTime = event.start.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const endTime = event.end.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    return `- ${startTime} - ${endTime}: ${event.summary}${event.location ? ` (at ${event.location})` : ''}`;
  }).join('\n');

  return `Today's calendar:\n${formatted}`;
}
