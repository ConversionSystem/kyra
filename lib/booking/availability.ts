// ============================================================================
// Booking Availability Engine
//
// Checks available time slots based on booking config + existing bookings.
// Works independently from GHL — uses Kyra's own client_bookings table.
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import type { BookingConfig, DayOfWeek, TimeSlot } from './types';

const DAY_NAMES: DayOfWeek[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

/**
 * Get available time slots for a given date range.
 */
export async function getAvailableSlots(
  clientId: string,
  config: BookingConfig,
  startDate: Date,
  endDate: Date,
): Promise<TimeSlot[]> {
  const supabase = createServiceClientWithoutCookies();

  // Fetch existing bookings in the range
  const { data: existingBookings } = await supabase
    .from('client_bookings')
    .select('start_time, end_time')
    .eq('client_id', clientId)
    .in('status', ['confirmed', 'pending'])
    .gte('start_time', startDate.toISOString())
    .lte('end_time', endDate.toISOString())
    .order('start_time');

  const booked = (existingBookings || []).map((b) => ({
    start: new Date(b.start_time),
    end: new Date(b.end_time),
  }));

  const slots: TimeSlot[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayName = DAY_NAMES[current.getDay()];
    const dayConfig = config.available_hours[dayName];

    if (dayConfig?.enabled) {
      const daySlots = generateDaySlots(
        current,
        dayConfig.start,
        dayConfig.end,
        config.appointment_duration,
        config.buffer_minutes,
        config.timezone,
      );

      // Filter out slots that overlap with existing bookings
      for (const slot of daySlots) {
        const hasConflict = booked.some(
          (b) => slot.start < b.end && slot.end > b.start,
        );
        // Only include future slots
        if (!hasConflict && slot.start > new Date()) {
          slots.push(slot);
        }
      }
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  return slots;
}

/**
 * Check if a specific time slot is available.
 */
export async function isSlotAvailable(
  clientId: string,
  config: BookingConfig,
  startTime: Date,
  endTime: Date,
): Promise<boolean> {
  const dayName = DAY_NAMES[startTime.getDay()];
  const dayConfig = config.available_hours[dayName];

  if (!dayConfig?.enabled) return false;

  // Check if within business hours
  const [startHour, startMin] = dayConfig.start.split(':').map(Number);
  const [endHour, endMin] = dayConfig.end.split(':').map(Number);

  const slotHour = startTime.getHours();
  const slotMin = startTime.getMinutes();
  const slotEndHour = endTime.getHours();
  const slotEndMin = endTime.getMinutes();

  const slotStartMinutes = slotHour * 60 + slotMin;
  const slotEndMinutes = slotEndHour * 60 + slotEndMin;
  const dayStartMinutes = startHour * 60 + startMin;
  const dayEndMinutes = endHour * 60 + endMin;

  if (slotStartMinutes < dayStartMinutes || slotEndMinutes > dayEndMinutes) {
    return false;
  }

  // Check for conflicts with existing bookings
  const supabase = createServiceClientWithoutCookies();
  const { data: conflicts } = await supabase
    .from('client_bookings')
    .select('id')
    .eq('client_id', clientId)
    .in('status', ['confirmed', 'pending'])
    .lt('start_time', endTime.toISOString())
    .gt('end_time', startTime.toISOString())
    .limit(1);

  return !conflicts || conflicts.length === 0;
}

/**
 * Generate time slots for a single day based on business hours.
 */
function generateDaySlots(
  date: Date,
  startTime: string,
  endTime: string,
  durationMinutes: number,
  bufferMinutes: number,
  _timezone: string,
): TimeSlot[] {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const slots: TimeSlot[] = [];
  const slotStart = new Date(date);
  slotStart.setHours(startHour, startMin, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(endHour, endMin, 0, 0);

  while (slotStart < dayEnd) {
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);
    if (slotEnd <= dayEnd) {
      slots.push({ start: new Date(slotStart), end: new Date(slotEnd) });
    }
    // Move to next slot (duration + buffer)
    slotStart.setTime(slotStart.getTime() + (durationMinutes + bufferMinutes) * 60_000);
  }

  return slots;
}

/**
 * Format available slots for AI to present to customer.
 */
export function formatSlotsForAI(slots: TimeSlot[], maxSlots = 5): string {
  if (slots.length === 0) return 'No available slots found.';

  const displayed = slots.slice(0, maxSlots);
  const lines = displayed.map((slot) => {
    const day = slot.start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const time = slot.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `- ${day} at ${time}`;
  });

  if (slots.length > maxSlots) {
    lines.push(`... and ${slots.length - maxSlots} more slots available`);
  }

  return lines.join('\n');
}
