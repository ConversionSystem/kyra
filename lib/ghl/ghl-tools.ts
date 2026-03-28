// ============================================================================
// GHL Tools — Function calling definitions + executors
//
// This file provides backward compatibility with the original 4-tool API.
// The full 50-skill system lives in lib/ghl/skills/.
//
// New code should import from './skills' directly:
//   import { ALL_GHL_TOOLS, executeGHLTool } from './skills';
// ============================================================================

import { ALL_GHL_TOOLS, executeGHLTool } from './skills';

// ── Types (used by skill domain files) ───────────────────────────────────────

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

// ── Backward-compatible exports ──────────────────────────────────────────────

/** escalate_to_human — special tool that doesn't call GHL API */
const ESCALATE_TOOL = {
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
          description: 'Why this needs human attention',
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
};

/** All GHL tool definitions (50 skills + escalate_to_human) in OpenAI function-calling format */
export const GHL_TOOL_DEFINITIONS = [...ALL_GHL_TOOLS, ESCALATE_TOOL];

/**
 * Execute any GHL tool by name.
 * Supports all 50 skills plus the legacy escalate_to_human.
 */
export async function executeTool(
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>,
  ctx: ToolContext,
): Promise<ToolResult> {
  // Handle escalate_to_human locally (it doesn't call GHL API)
  if (name === 'escalate_to_human') {
    return {
      success: true,
      escalate: {
        reason: args.reason,
        urgency: args.urgency || 'normal',
      },
    };
  }

  // Inject default calendar_id / pipeline_id from context if LLM didn't provide them
  const enrichedArgs = { ...args };
  if (!enrichedArgs.calendar_id && ctx.calendarId && CALENDAR_TOOLS.has(name)) {
    enrichedArgs.calendar_id = ctx.calendarId;
  }
  if (!enrichedArgs.pipeline_id && ctx.pipelineId && name === 'create_opportunity') {
    enrichedArgs.pipeline_id = ctx.pipelineId;
  }

  // Route to the new skills system
  return executeGHLTool(name, enrichedArgs, ctx.token, ctx.locationId);
}

/** Calendar tools that benefit from default calendar_id injection */
const CALENDAR_TOOLS = new Set([
  'book_appointment', 'get_available_slots', 'get_appointments',
]);

// Re-export the new skills system for direct access
export { ALL_GHL_TOOLS, executeGHLTool } from './skills';
