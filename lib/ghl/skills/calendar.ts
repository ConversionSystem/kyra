// ============================================================================
// GHL Skills — Calendar & Appointments (7 skills)
// ============================================================================

import type { ToolResult } from '../ghl-tools';
import { validateGhlIds } from './validate';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-04-15';

function ghlHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Version: GHL_API_VERSION,
    'Content-Type': 'application/json',
  };
}

// ── Tool Definitions ─────────────────────────────────────────────────────────

export const calendarToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'book_appointment',
      description: 'Book a new appointment for a contact on a specific calendar. Always confirm date/time with the customer first.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
          calendar_id: { type: 'string', description: 'Calendar ID' },
          title: { type: 'string', description: 'Appointment title' },
          start_time: { type: 'string', description: 'Start time in ISO 8601' },
          end_time: { type: 'string', description: 'End time in ISO 8601' },
          notes: { type: 'string', description: 'Appointment notes' },
          assigned_user_id: { type: 'string', description: 'Assigned staff user ID' },
        },
        required: ['contact_id', 'calendar_id', 'title', 'start_time', 'end_time'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'reschedule_appointment',
      description: 'Reschedule an existing appointment to a new time.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'Appointment ID' },
          start_time: { type: 'string', description: 'New start time in ISO 8601' },
          end_time: { type: 'string', description: 'New end time in ISO 8601' },
        },
        required: ['appointment_id', 'start_time', 'end_time'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cancel_appointment',
      description: 'Cancel an existing appointment.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'Appointment ID to cancel' },
        },
        required: ['appointment_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_appointments',
      description: 'List appointments for a contact or calendar within a date range.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Filter by contact ID' },
          calendar_id: { type: 'string', description: 'Filter by calendar ID' },
          location_id: { type: 'string', description: 'Location ID' },
          start_date: { type: 'string', description: 'Start date (ISO 8601)' },
          end_date: { type: 'string', description: 'End date (ISO 8601)' },
        },
        required: ['location_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_available_slots',
      description: 'Get available time slots for a calendar on a date range.',
      parameters: {
        type: 'object',
        properties: {
          calendar_id: { type: 'string', description: 'Calendar ID' },
          start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          end_date: { type: 'string', description: 'End date (YYYY-MM-DD, default same as start)' },
        },
        required: ['calendar_id', 'start_date'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_calendars',
      description: 'List all calendars for a location.',
      parameters: {
        type: 'object',
        properties: {
          location_id: { type: 'string', description: 'Location ID' },
        },
        required: ['location_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'confirm_appointment',
      description: 'Confirm a pending appointment.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'Appointment ID to confirm' },
        },
        required: ['appointment_id'],
      },
    },
  },
];

// ── Executor ─────────────────────────────────────────────────────────────────

export async function executeCalendarTool(
  toolName: string,
  args: Record<string, unknown>,
  token: string,
  locationId: string,
): Promise<ToolResult> {
  const headers = ghlHeaders(token);

  const idCheck = validateGhlIds(args, ['appointment_id']);
  if (idCheck) return idCheck;

  try {
    switch (toolName) {
      case 'book_appointment': {
        const body: Record<string, unknown> = {
          calendarId: args.calendar_id,
          locationId: locationId,
          contactId: args.contact_id,
          title: args.title,
          startTime: args.start_time,
          endTime: args.end_time,
          appointmentStatus: 'confirmed',
        };
        if (args.notes) body.notes = args.notes;
        if (args.assigned_user_id) body.assignedUserId = args.assigned_user_id;

        const res = await fetch(`${GHL_API_BASE}/calendars/events/appointments`, {
          method: 'POST', headers, body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.event ?? data };
      }

      case 'reschedule_appointment': {
        const res = await fetch(`${GHL_API_BASE}/calendars/events/appointments/${args.appointment_id}`, {
          method: 'PUT', headers,
          body: JSON.stringify({
            startTime: args.start_time,
            endTime: args.end_time,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.event ?? data };
      }

      case 'cancel_appointment': {
        const res = await fetch(`${GHL_API_BASE}/calendars/events/appointments/${args.appointment_id}`, {
          method: 'DELETE', headers,
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        return { success: true, data: { cancelled: args.appointment_id } };
      }

      case 'get_appointments': {
        const params = new URLSearchParams();
        const locId = (args.location_id as string) || locationId;
        params.set('locationId', locId);
        if (args.contact_id) params.set('contactId', args.contact_id as string);
        if (args.calendar_id) params.set('calendarId', args.calendar_id as string);
        if (args.start_date) params.set('startDate', args.start_date as string);
        if (args.end_date) params.set('endDate', args.end_date as string);

        const res = await fetch(`${GHL_API_BASE}/calendars/events?${params}`, {
          headers, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.events ?? data };
      }

      case 'get_available_slots': {
        const params = new URLSearchParams({
          calendarId: args.calendar_id as string,
          startDate: args.start_date as string,
          endDate: (args.end_date as string) || (args.start_date as string),
        });
        const res = await fetch(`${GHL_API_BASE}/calendars/events/slots?${params}`, {
          headers, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data };
      }

      case 'get_calendars': {
        const locId = (args.location_id as string) || locationId;
        const res = await fetch(`${GHL_API_BASE}/calendars/?locationId=${locId}`, {
          headers, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.calendars ?? data };
      }

      case 'confirm_appointment': {
        const res = await fetch(`${GHL_API_BASE}/calendars/events/appointments/${args.appointment_id}`, {
          method: 'PUT', headers,
          body: JSON.stringify({ appointmentStatus: 'confirmed' }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.event ?? data };
      }

      default:
        return { success: false, error: `Unknown calendar tool: ${toolName}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function ghlError(res: Response): Promise<ToolResult> {
  const body = await res.json().catch(() => ({}));
  return { success: false, error: body?.message || `GHL returned ${res.status}` };
}
