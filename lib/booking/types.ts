// ============================================================================
// Booking Types
// ============================================================================

export interface Booking {
  id: string;
  agency_id: string;
  client_id: string;
  contact_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  service: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  notes: string | null;
  booked_via: 'ai' | 'manual' | 'widget';
  ghl_appointment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DaySchedule {
  start: string; // "09:00"
  end: string;   // "17:00"
  enabled: boolean;
}

export interface AvailableHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface BookingConfig {
  id: string;
  client_id: string;
  agency_id: string;
  enabled: boolean;
  available_hours: AvailableHours;
  timezone: string;
  appointment_duration: number;
  buffer_minutes: number;
  services: string[];
  confirmation_template: string;
  booking_link: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingResponse {
  /** Whether the message was a booking-related request */
  isBookingIntent: boolean;
  /** The AI reply to send back to the customer */
  reply: string;
  /** If an appointment was created, its details */
  booking?: Booking;
  /** Current state of the booking conversation */
  state: 'idle' | 'collecting_info' | 'confirming' | 'booked' | 'cancelled';
}

export interface TimeSlot {
  start: Date;
  end: Date;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
