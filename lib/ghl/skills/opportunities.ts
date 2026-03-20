// ============================================================================
// GHL Skills — Opportunities & Pipeline (8 skills)
// ============================================================================

import type { ToolResult } from '../ghl-tools';

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

export const opportunityToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'create_opportunity',
      description: 'Create a new opportunity/deal in a sales pipeline.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
          location_id: { type: 'string', description: 'Location ID' },
          name: { type: 'string', description: 'Opportunity name' },
          pipeline_id: { type: 'string', description: 'Pipeline ID' },
          pipeline_stage_id: { type: 'string', description: 'Pipeline stage ID' },
          status: { type: 'string', enum: ['open', 'won', 'lost', 'abandoned'], description: 'Status (default: open)' },
          monetary_value: { type: 'number', description: 'Deal value in dollars' },
          assigned_to: { type: 'string', description: 'Assigned user ID' },
        },
        required: ['contact_id', 'location_id', 'name', 'pipeline_id', 'pipeline_stage_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_opportunity',
      description: 'Update an opportunity (stage, value, status, assigned user).',
      parameters: {
        type: 'object',
        properties: {
          opportunity_id: { type: 'string', description: 'Opportunity ID' },
          name: { type: 'string' },
          pipeline_stage_id: { type: 'string', description: 'New stage ID' },
          status: { type: 'string', enum: ['open', 'won', 'lost', 'abandoned'] },
          monetary_value: { type: 'number' },
          assigned_to: { type: 'string' },
        },
        required: ['opportunity_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_opportunity',
      description: 'Get opportunity details by ID.',
      parameters: {
        type: 'object',
        properties: {
          opportunity_id: { type: 'string', description: 'Opportunity ID' },
        },
        required: ['opportunity_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_opportunities',
      description: 'Search/list opportunities with optional filters.',
      parameters: {
        type: 'object',
        properties: {
          location_id: { type: 'string', description: 'Location ID' },
          pipeline_id: { type: 'string', description: 'Filter by pipeline' },
          stage_id: { type: 'string', description: 'Filter by stage' },
          status: { type: 'string', enum: ['open', 'won', 'lost', 'abandoned'] },
          contact_id: { type: 'string', description: 'Filter by contact' },
          limit: { type: 'number', description: 'Max results (default 20)' },
          page: { type: 'number', description: 'Page number' },
        },
        required: ['location_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_opportunity',
      description: 'Delete an opportunity.',
      parameters: {
        type: 'object',
        properties: {
          opportunity_id: { type: 'string', description: 'Opportunity ID' },
        },
        required: ['opportunity_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'move_pipeline_stage',
      description: 'Move an opportunity to a different pipeline stage.',
      parameters: {
        type: 'object',
        properties: {
          opportunity_id: { type: 'string', description: 'Opportunity ID' },
          pipeline_stage_id: { type: 'string', description: 'Target stage ID' },
        },
        required: ['opportunity_id', 'pipeline_stage_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_pipelines',
      description: 'List all pipelines and their stages for a location.',
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
      name: 'mark_won_lost',
      description: 'Mark an opportunity as won or lost.',
      parameters: {
        type: 'object',
        properties: {
          opportunity_id: { type: 'string', description: 'Opportunity ID' },
          status: { type: 'string', enum: ['won', 'lost'], description: 'New status' },
        },
        required: ['opportunity_id', 'status'],
      },
    },
  },
];

// ── Executor ─────────────────────────────────────────────────────────────────

export async function executeOpportunityTool(
  toolName: string,
  args: Record<string, unknown>,
  token: string,
  locationId: string,
): Promise<ToolResult> {
  const headers = ghlHeaders(token);

  try {
    switch (toolName) {
      case 'create_opportunity': {
        const body: Record<string, unknown> = {
          contactId: args.contact_id,
          locationId: (args.location_id as string) || locationId,
          name: args.name,
          pipelineId: args.pipeline_id,
          pipelineStageId: args.pipeline_stage_id,
          status: args.status || 'open',
        };
        if (args.monetary_value) body.monetaryValue = args.monetary_value;
        if (args.assigned_to) body.assignedTo = args.assigned_to;

        const res = await fetch(`${GHL_API_BASE}/opportunities/`, {
          method: 'POST', headers, body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.opportunity ?? data };
      }

      case 'update_opportunity': {
        const body: Record<string, unknown> = {};
        if (args.name) body.name = args.name;
        if (args.pipeline_stage_id) body.pipelineStageId = args.pipeline_stage_id;
        if (args.status) body.status = args.status;
        if (args.monetary_value !== undefined) body.monetaryValue = args.monetary_value;
        if (args.assigned_to) body.assignedTo = args.assigned_to;

        const res = await fetch(`${GHL_API_BASE}/opportunities/${args.opportunity_id}`, {
          method: 'PUT', headers, body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.opportunity ?? data };
      }

      case 'get_opportunity': {
        const res = await fetch(`${GHL_API_BASE}/opportunities/${args.opportunity_id}`, {
          headers, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.opportunity ?? data };
      }

      case 'search_opportunities': {
        const params = new URLSearchParams();
        const locId = (args.location_id as string) || locationId;
        params.set('location_id', locId);
        if (args.pipeline_id) params.set('pipelineId', args.pipeline_id as string);
        if (args.stage_id) params.set('pipelineStageId', args.stage_id as string);
        if (args.status) params.set('status', args.status as string);
        if (args.contact_id) params.set('contactId', args.contact_id as string);
        params.set('limit', String(args.limit ?? 20));
        if (args.page) params.set('page', String(args.page));

        const res = await fetch(`${GHL_API_BASE}/opportunities/search?${params}`, {
          headers, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data };
      }

      case 'delete_opportunity': {
        const res = await fetch(`${GHL_API_BASE}/opportunities/${args.opportunity_id}`, {
          method: 'DELETE', headers, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        return { success: true, data: { deleted: args.opportunity_id } };
      }

      case 'move_pipeline_stage': {
        const res = await fetch(`${GHL_API_BASE}/opportunities/${args.opportunity_id}`, {
          method: 'PUT', headers,
          body: JSON.stringify({ pipelineStageId: args.pipeline_stage_id }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.opportunity ?? data };
      }

      case 'get_pipelines': {
        const locId = (args.location_id as string) || locationId;
        const res = await fetch(`${GHL_API_BASE}/opportunities/pipelines?locationId=${locId}`, {
          headers, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.pipelines ?? data };
      }

      case 'mark_won_lost': {
        const res = await fetch(`${GHL_API_BASE}/opportunities/${args.opportunity_id}`, {
          method: 'PUT', headers,
          body: JSON.stringify({ status: args.status }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.opportunity ?? data };
      }

      default:
        return { success: false, error: `Unknown opportunity tool: ${toolName}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function ghlError(res: Response): Promise<ToolResult> {
  const body = await res.json().catch(() => ({}));
  return { success: false, error: body?.message || `GHL returned ${res.status}` };
}
