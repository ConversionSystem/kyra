// ============================================================================
// AI Booking Engine
//
// Handles appointment booking through natural conversation.
// Detects booking intent, extracts date/time/service preferences,
// checks availability, and creates bookings — all conversationally.
//
// When GHL is connected, also syncs to GHL calendar via executeCalendarTool.
// Falls back to Kyra's own client_bookings table when GHL is not connected.
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getAvailableSlots, isSlotAvailable, formatSlotsForAI } from './availability';
import { executeCalendarTool } from '@/lib/ghl/skills/calendar';
import { getValidToken } from '@/lib/ghl/api';
import type { BookingConfig, BookingResponse, Booking } from './types';

// ── Booking Intent Detection ────────────────────────────────────────────────

const BOOKING_KEYWORDS = [
  'book', 'appointment', 'schedule', 'reserve', 'booking',
  'available', 'availability', 'slot', 'time slot',
  'meet', 'meeting', 'consultation', 'session',
  'calendar', 'reschedule', 'cancel appointment',
  'come in', 'set up a time', 'make an appointment',
  'when can i', 'when are you open', 'what times',
];

const CANCEL_KEYWORDS = ['cancel', 'cancel appointment', 'cancel booking', 'nevermind', 'never mind'];
const CONFIRM_KEYWORDS = ['yes', 'confirm', 'book it', 'sounds good', 'perfect', 'that works', 'let\'s do it', 'ok', 'okay'];

/**
 * Detect if a message contains booking intent.
 * Simple keyword matching — no LLM needed for detection.
 */
export function detectBookingIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return BOOKING_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Detect if user is confirming a proposed time.
 */
function detectConfirmation(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return CONFIRM_KEYWORDS.some((kw) => lower.startsWith(kw) || lower === kw);
}

/**
 * Detect if user wants to cancel.
 */
function detectCancellation(message: string): boolean {
  const lower = message.toLowerCase();
  return CANCEL_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── Booking State Management ────────────────────────────────────────────────

interface BookingState {
  state: 'idle' | 'collecting_info' | 'confirming';
  service?: string;
  preferredDate?: string;   // ISO date string
  preferredTime?: string;   // "HH:mm"
  proposedSlot?: { start: string; end: string };
}

/**
 * Get current booking conversation state from recent history.
 * We look at the last few messages for a pending booking flow.
 */
async function getBookingState(
  clientId: string,
  contactPhone: string,
): Promise<BookingState> {
  const supabase = createServiceClientWithoutCookies();

  // Check if there's a pending booking state in recent conversations
  const { data } = await supabase
    .from('client_conversations')
    .select('ai_response, user_message')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!data || data.length === 0) return { state: 'idle' };

  // Look for booking state markers in recent AI responses
  const lastAiResponse = data[0]?.ai_response || '';

  if (lastAiResponse.includes('[BOOKING_CONFIRMING:')) {
    // Extract proposed slot from marker
    const match = lastAiResponse.match(/\[BOOKING_CONFIRMING:([^\]]+)\]/);
    if (match) {
      try {
        const proposed = JSON.parse(match[1]);
        return { state: 'confirming', proposedSlot: proposed };
      } catch {
        // Malformed marker, reset
      }
    }
    return { state: 'confirming' };
  }

  if (lastAiResponse.includes('[BOOKING_COLLECTING]')) {
    return { state: 'collecting_info' };
  }

  return { state: 'idle' };
}

// ── Date/Time Extraction ────────────────────────────────────────────────────

interface ExtractedDateTime {
  date?: Date;
  timeStr?: string;
}

/**
 * Extract date/time preferences from natural language message.
 * Simple pattern matching — handles common patterns.
 */
function extractDateTime(message: string): ExtractedDateTime {
  const lower = message.toLowerCase();
  const now = new Date();
  const result: ExtractedDateTime = {};

  // Day references
  if (lower.includes('today')) {
    result.date = new Date(now);
  } else if (lower.includes('tomorrow')) {
    result.date = new Date(now);
    result.date.setDate(result.date.getDate() + 1);
  } else if (lower.includes('next week')) {
    result.date = new Date(now);
    result.date.setDate(result.date.getDate() + 7);
  }

  // Day-of-week references
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(days[i])) {
      result.date = new Date(now);
      const currentDay = result.date.getDay();
      let daysUntil = i - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      result.date.setDate(result.date.getDate() + daysUntil);
      break;
    }
  }

  // Time patterns: "at 3pm", "at 3:30 PM", "2pm", "14:00"
  const timeMatch = lower.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3]?.toLowerCase();

    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    // Only accept reasonable hours (7am - 10pm)
    if (hour >= 7 && hour <= 22) {
      result.timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    }
  }

  return result;
}

// ── Main Booking Handler ────────────────────────────────────────────────────

/**
 * Handle a potential booking request within a conversation.
 *
 * Flow:
 * 1. Customer: "Can I book an appointment?"
 * 2. AI: "Sure! What service? Here are our available times..."
 * 3. Customer: "Tomorrow at 2pm for a consultation"
 * 4. AI: "I have Tuesday Jan 7 at 2:00 PM available. Shall I book it?"
 * 5. Customer: "Yes"
 * 6. AI: "Done! Your appointment is confirmed for..."
 */
export async function handleBookingRequest(params: {
  clientId: string;
  agencyId: string;
  contactPhone: string;
  contactName: string;
  contactEmail?: string;
  contactId?: string;
  message: string;
  conversationHistory: Array<{ role: string; content: string }>;
}): Promise<BookingResponse> {
  const { clientId, agencyId, message } = params;

  // ── Load booking config ───────────────────────────────────────────────
  const config = await getBookingConfig(clientId);
  if (!config || !config.enabled) {
    return { isBookingIntent: false, reply: '', state: 'idle' };
  }

  // ── Check current conversation state ──────────────────────────────────
  const bookingState = await getBookingState(clientId, params.contactPhone);

  // ── Handle cancellation ───────────────────────────────────────────────
  if (detectCancellation(message)) {
    return {
      isBookingIntent: true,
      reply: 'No problem! Let me know if you\'d like to book another time.',
      state: 'cancelled',
    };
  }

  // ── Handle confirmation of proposed slot ──────────────────────────────
  if (bookingState.state === 'confirming' && bookingState.proposedSlot && detectConfirmation(message)) {
    const slot = bookingState.proposedSlot;
    const startTime = new Date(slot.start);
    const endTime = new Date(slot.end);

    // Double-check availability
    const stillAvailable = await isSlotAvailable(clientId, config, startTime, endTime);
    if (!stillAvailable) {
      return {
        isBookingIntent: true,
        reply: 'I\'m sorry, that slot was just taken! Let me check what else is available...\n\n[BOOKING_COLLECTING]',
        state: 'collecting_info',
      };
    }

    // Create the booking
    const booking = await createBooking({
      agencyId,
      clientId,
      contactId: params.contactId,
      contactName: params.contactName,
      contactPhone: params.contactPhone,
      contactEmail: params.contactEmail,
      service: bookingState.service || null,
      startTime,
      endTime,
      durationMinutes: config.appointment_duration,
      bookedVia: 'ai',
    });

    // Sync to GHL if connected
    await syncToGHL(clientId, params.contactId, booking, startTime, endTime).catch((err) => {
      console.warn('[ai-booker] GHL sync failed (non-fatal):', err);
    });

    // Format confirmation
    const dateStr = startTime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const confirmation = config.confirmation_template
      .replace('{date}', dateStr)
      .replace('{time}', timeStr)
      .replace('{service}', bookingState.service || 'appointment')
      .replace('{name}', params.contactName);

    return {
      isBookingIntent: true,
      reply: confirmation,
      booking,
      state: 'booked',
    };
  }

  // ── Check if this is a new booking request or collecting info ─────────
  const isNewBookingRequest = detectBookingIntent(message);
  const isInBookingFlow = bookingState.state === 'collecting_info' || bookingState.state === 'confirming';

  if (!isNewBookingRequest && !isInBookingFlow) {
    return { isBookingIntent: false, reply: '', state: 'idle' };
  }

  // ── Extract date/time preferences ─────────────────────────────────────
  const extracted = extractDateTime(message);

  // ── Extract service if mentioned ──────────────────────────────────────
  let selectedService: string | undefined;
  if (config.services.length > 0) {
    const lower = message.toLowerCase();
    selectedService = config.services.find((s) => lower.includes(s.toLowerCase()));
  }

  // ── If we have both date and time, propose the slot ───────────────────
  if (extracted.date && extracted.timeStr) {
    const [hour, min] = extracted.timeStr.split(':').map(Number);
    const startTime = new Date(extracted.date);
    startTime.setHours(hour, min, 0, 0);
    const endTime = new Date(startTime.getTime() + config.appointment_duration * 60_000);

    const available = await isSlotAvailable(clientId, config, startTime, endTime);

    if (available) {
      const dateStr = startTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      const timeStr = startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });

      const proposedSlot = { start: startTime.toISOString(), end: endTime.toISOString() };
      const marker = `[BOOKING_CONFIRMING:${JSON.stringify(proposedSlot)}]`;

      return {
        isBookingIntent: true,
        reply: `I have ${dateStr} at ${timeStr} available${selectedService ? ` for ${selectedService}` : ''}. Would you like me to book it? ${marker}`,
        state: 'confirming',
      };
    } else {
      // Slot not available — show alternatives
      const dayStart = new Date(extracted.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(extracted.date);
      dayEnd.setHours(23, 59, 59, 999);

      const alternatives = await getAvailableSlots(clientId, config, dayStart, dayEnd);
      if (alternatives.length > 0) {
        const slotsText = formatSlotsForAI(alternatives, 3);
        return {
          isBookingIntent: true,
          reply: `Sorry, that time isn't available. Here's what I have on that day:\n\n${slotsText}\n\nWould any of these work? [BOOKING_COLLECTING]`,
          state: 'collecting_info',
        };
      } else {
        // No slots that day — check next 7 days
        const weekStart = new Date(extracted.date);
        weekStart.setDate(weekStart.getDate() + 1);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekSlots = await getAvailableSlots(clientId, config, weekStart, weekEnd);
        const slotsText = formatSlotsForAI(weekSlots, 5);
        return {
          isBookingIntent: true,
          reply: `Sorry, no availability on that day. Here are the next available times:\n\n${slotsText}\n\nWould any of these work? [BOOKING_COLLECTING]`,
          state: 'collecting_info',
        };
      }
    }
  }

  // ── If we only have a date, show slots for that day ───────────────────
  if (extracted.date) {
    const dayStart = new Date(extracted.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(extracted.date);
    dayEnd.setHours(23, 59, 59, 999);

    const daySlots = await getAvailableSlots(clientId, config, dayStart, dayEnd);
    const slotsText = formatSlotsForAI(daySlots, 5);

    const dateStr = extracted.date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    return {
      isBookingIntent: true,
      reply: `Here are the available times on ${dateStr}:\n\n${slotsText}\n\nWhat time works best for you? [BOOKING_COLLECTING]`,
      state: 'collecting_info',
    };
  }

  // ── No date/time — ask for preferences and show next available ────────
  const nextWeekStart = new Date();
  const nextWeekEnd = new Date();
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

  const upcoming = await getAvailableSlots(clientId, config, nextWeekStart, nextWeekEnd);
  const slotsText = formatSlotsForAI(upcoming, 5);

  let servicePrompt = '';
  if (config.services.length > 0 && !selectedService) {
    servicePrompt = `\n\nWe offer: ${config.services.join(', ')}. Which service are you interested in?`;
  }

  return {
    isBookingIntent: true,
    reply: `I'd be happy to help you book an appointment! Here are our next available times:\n\n${slotsText}${servicePrompt}\n\nWhat day and time works best for you? [BOOKING_COLLECTING]`,
    state: 'collecting_info',
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getBookingConfig(clientId: string): Promise<BookingConfig | null> {
  const supabase = createServiceClientWithoutCookies();
  const { data } = await supabase
    .from('client_booking_config')
    .select('*')
    .eq('client_id', clientId)
    .single();
  return data as BookingConfig | null;
}

async function createBooking(params: {
  agencyId: string;
  clientId: string;
  contactId?: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  service: string | null;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  bookedVia: 'ai' | 'manual' | 'widget';
}): Promise<Booking> {
  const supabase = createServiceClientWithoutCookies();

  const { data, error } = await supabase
    .from('client_bookings')
    .insert({
      agency_id: params.agencyId,
      client_id: params.clientId,
      contact_id: params.contactId || null,
      contact_name: params.contactName,
      contact_phone: params.contactPhone,
      contact_email: params.contactEmail || null,
      service: params.service,
      start_time: params.startTime.toISOString(),
      end_time: params.endTime.toISOString(),
      duration_minutes: params.durationMinutes,
      status: 'confirmed',
      booked_via: params.bookedVia,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create booking: ${error.message}`);
  return data as Booking;
}

/**
 * Sync a booking to GHL calendar if the client has GHL connected.
 */
async function syncToGHL(
  clientId: string,
  contactId: string | undefined,
  booking: Booking,
  startTime: Date,
  endTime: Date,
): Promise<void> {
  if (!contactId) return;

  const supabase = createServiceClientWithoutCookies();
  const { data: client } = await supabase
    .from('agency_clients')
    .select('ghl_location_id')
    .eq('id', clientId)
    .single();

  const locationId = (client as any)?.ghl_location_id;
  if (!locationId) return; // No GHL connected

  const token = await getValidToken(clientId);
  if (!token) return;

  const result = await executeCalendarTool(
    'book_appointment',
    {
      contact_id: contactId,
      calendar_id: 'default', // Will use first available calendar
      title: booking.service || 'Appointment',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      notes: `Booked via Kyra AI. Booking ID: ${booking.id}`,
    },
    token,
    locationId,
  );

  // Store GHL appointment ID if successful
  const resultData = result.data as Record<string, unknown> | undefined;
  if (result.success && resultData?.id) {
    await supabase
      .from('client_bookings')
      .update({ ghl_appointment_id: String(resultData.id) })
      .eq('id', booking.id);
  }
}

export { getBookingConfig };
