// ============================================================================
// GHL Tools — Function calling definitions + executors
//
// These tools give the AI real capabilities:
// - Book appointments via GHL calendar
// - Tag contacts
// - Create sales opportunities
// - Escalate to human (flag + notify)
// ============================================================================

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-04-15';

function ghlHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Version: GHL_API_VERSION,
    'Content-Type': 'application/json',
  };
}

// ── Tool Definitions (OpenAI function calling format) ─────────────────────────

export const GHL_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'book_appointment',
      description:
        'Book an appointment for the contact in GHL. Use when the customer asks to schedule, book, or set up a time. Always confirm the date/time with the customer first.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: {
            type: 'string',
            description: 'The GHL contact ID (provided in context)',
          },
          calendar_id: {
            type: 'string',
            description: 'The GHL calendar ID to book on (from business settings)',
          },
          title: {
            type: 'string',
            description: 'Appointment title (e.g. "Free Consultation with John")',
          },
          start_time: {
            type: 'string',
            description: 'Start time in ISO 8601 format (e.g. 2026-03-01T10:00:00-05:00)',
          },
          end_time: {
            type: 'string',
            description: 'End time in ISO 8601 format (e.g. 2026-03-01T10:30:00-05:00)',
          },
        },
        required: ['contact_id', 'title', 'start_time', 'end_time'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'tag_contact',
      description:
        'Add tags to the contact in GHL. Use to label the contact based on their interest, intent, or status (e.g. "hot-lead", "interested-in-pricing", "booked").',
      parameters: {
        type: 'object',
        properties: {
          contact_id: {
            type: 'string',
            description: 'The GHL contact ID',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags to add (e.g. ["hot-lead", "pricing-requested"])',
          },
        },
        required: ['contact_id', 'tags'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_opportunity',
      description:
        'Create a sales opportunity in GHL for this contact. Use when the customer has shown clear buying intent, asked for pricing, or wants to move forward.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: {
            type: 'string',
            description: 'The GHL contact ID',
          },
          location_id: {
            type: 'string',
            description: 'The GHL location ID',
          },
          title: {
            type: 'string',
            description: 'Opportunity title (e.g. "Consultation - John Smith")',
          },
          pipeline_stage_id: {
            type: 'string',
            description: 'Pipeline stage ID (optional — uses first available stage if not set)',
          },
          status: {
            type: 'string',
            enum: ['open', 'won', 'lost', 'abandoned'],
            description: 'Opportunity status (default: open)',
          },
          monetary_value: {
            type: 'number',
            description: 'Estimated deal value in dollars (optional)',
          },
        },
        required: ['contact_id', 'location_id', 'title'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'escalate_to_human',
      description:
        'Flag this conversation for human follow-up. Use when: the customer is angry, the issue is complex, the customer explicitly asks for a human, or you cannot help with their specific request.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Why this needs human attention (e.g. "Customer upset about billing", "Complex legal question")',
          },
          urgency: {
            type: 'string',
            enum: ['low', 'normal', 'high', 'urgent'],
            description: 'Urgency level',
          },
        },
        required: ['reason'],
      },
    },
  },
];

// ── Tool Execution Context ────────────────────────────────────────────────────

export interface ToolContext {
  token: string;
  contactId: string;
  locationId: string;
  clientId: string;
  calendarId?: string;
  pipelineId?: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  // Escalation flag — if set, mark conversation for human follow-up
  escalate?: { reason: string; urgency: string };
}

// ── Tool Executors ────────────────────────────────────────────────────────────

export async function executeBookAppointment(
  args: {
    contact_id: string;
    calendar_id?: string;
    title: string;
    start_time: string;
    end_time: string;
  },
  ctx: ToolContext,
): Promise<ToolResult> {
  const calendarId = args.calendar_id || ctx.calendarId;

  if (!calendarId) {
    // No calendar ID — return a soft failure with a helpful message
    return {
      success: false,
      error: 'No calendar configured. Provide the booking link instead.',
    };
  }

  try {
    const res = await fetch(`${GHL_API_BASE}/appointments/`, {
      method: 'POST',
      headers: ghlHeaders(ctx.token),
      body: JSON.stringify({
        calendarId,
        locationId: ctx.locationId,
        contactId: args.contact_id || ctx.contactId,
        title: args.title,
        startTime: args.start_time,
        endTime: args.end_time,
        appointmentStatus: 'confirmed',
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.message || `GHL returned ${res.status}` };
    }

    const data = await res.json();
    return { success: true, data: { appointmentId: data.id, title: args.title, startTime: args.start_time } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function executeTagContact(
  args: { contact_id: string; tags: string[] },
  ctx: ToolContext,
): Promise<ToolResult> {
  const contactId = args.contact_id || ctx.contactId;

  try {
    const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
      method: 'POST',
      headers: ghlHeaders(ctx.token),
      body: JSON.stringify({ tags: args.tags }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.message || `GHL returned ${res.status}` };
    }

    return { success: true, data: { tagged: args.tags } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function executeCreateOpportunity(
  args: {
    contact_id: string;
    location_id: string;
    title: string;
    pipeline_stage_id?: string;
    status?: string;
    monetary_value?: number;
  },
  ctx: ToolContext,
): Promise<ToolResult> {
  const contactId = args.contact_id || ctx.contactId;
  const locationId = args.location_id || ctx.locationId;

  // If no pipeline stage, look up the first available pipeline
  let pipelineStageId = args.pipeline_stage_id || ctx.pipelineId;

  if (!pipelineStageId) {
    try {
      const pipRes = await fetch(`${GHL_API_BASE}/opportunities/pipelines?locationId=${locationId}`, {
        headers: { Authorization: `Bearer ${ctx.token}`, Version: GHL_API_VERSION },
        signal: AbortSignal.timeout(8_000),
      });
      if (pipRes.ok) {
        const pipData = await pipRes.json();
        pipelineStageId = pipData?.pipelines?.[0]?.stages?.[0]?.id;
      }
    } catch {
      // Continue without pipeline stage
    }
  }

  try {
    const body: Record<string, unknown> = {
      locationId,
      contactId,
      name: args.title,
      status: args.status || 'open',
    };

    if (pipelineStageId) body.pipelineStageId = pipelineStageId;
    if (args.monetary_value) body.monetaryValue = args.monetary_value;

    const res = await fetch(`${GHL_API_BASE}/opportunities/`, {
      method: 'POST',
      headers: ghlHeaders(ctx.token),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.message || `GHL returned ${res.status}` };
    }

    const data = await res.json();
    return { success: true, data: { opportunityId: data.opportunity?.id, title: args.title } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export function executeEscalateToHuman(
  args: { reason: string; urgency?: string },
): ToolResult {
  return {
    success: true,
    escalate: {
      reason: args.reason,
      urgency: args.urgency || 'normal',
    },
  };
}

// ── Tool Dispatcher ───────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>,
  ctx: ToolContext,
): Promise<ToolResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = args as any;
  switch (name) {
    case 'book_appointment':
      return executeBookAppointment(a, ctx);
    case 'tag_contact':
      return executeTagContact(a, ctx);
    case 'create_opportunity':
      return executeCreateOpportunity(a, ctx);
    case 'escalate_to_human':
      return executeEscalateToHuman(a);
    default:
      return { success: false, error: `Unknown tool: ${name}` };
  }
}
