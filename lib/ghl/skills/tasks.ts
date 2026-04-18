// ============================================================================
// GHL Skills — Tasks & Notes (5 skills)
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

export const taskToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'create_task',
      description: 'Create a task assigned to a user in the CRM.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID to associate with' },
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Task description' },
          due_date: { type: 'string', description: 'Due date (ISO 8601)' },
          assigned_to: { type: 'string', description: 'User ID to assign to' },
        },
        required: ['contact_id', 'title'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'complete_task',
      description: 'Mark a task as complete.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
          task_id: { type: 'string', description: 'Task ID to complete' },
        },
        required: ['contact_id', 'task_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_tasks',
      description: 'List tasks for a contact.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
        },
        required: ['contact_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_task',
      description: 'Update task details.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
          task_id: { type: 'string', description: 'Task ID' },
          title: { type: 'string', description: 'New title' },
          description: { type: 'string', description: 'New description' },
          due_date: { type: 'string', description: 'New due date (ISO 8601)' },
          assigned_to: { type: 'string', description: 'New assigned user ID' },
          status: { type: 'string', enum: ['incomplete', 'completed'], description: 'Task status' },
        },
        required: ['contact_id', 'task_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_task',
      description: 'Delete a task.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
          task_id: { type: 'string', description: 'Task ID to delete' },
        },
        required: ['contact_id', 'task_id'],
      },
    },
  },
];

// ── Executor ─────────────────────────────────────────────────────────────────

export async function executeTaskTool(
  toolName: string,
  args: Record<string, unknown>,
  token: string,
  _locationId: string,
): Promise<ToolResult> {
  const headers = ghlHeaders(token);

  const idCheck = validateGhlIds(args, ['contact_id', 'task_id']);
  if (idCheck) return idCheck;

  try {
    switch (toolName) {
      case 'create_task': {
        const body: Record<string, unknown> = {
          title: args.title,
        };
        if (args.description) body.description = args.description;
        if (args.due_date) body.dueDate = args.due_date;
        if (args.assigned_to) body.assignedTo = args.assigned_to;

        const res = await fetch(`${GHL_API_BASE}/contacts/${args.contact_id}/tasks`, {
          method: 'POST', headers, body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.task ?? data };
      }

      case 'complete_task': {
        const res = await fetch(`${GHL_API_BASE}/contacts/${args.contact_id}/tasks/${args.task_id}/completed`, {
          method: 'PUT', headers,
          body: JSON.stringify({ completed: true }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        return { success: true, data: { completed: args.task_id } };
      }

      case 'get_tasks': {
        const res = await fetch(`${GHL_API_BASE}/contacts/${args.contact_id}/tasks`, {
          headers, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.tasks ?? data };
      }

      case 'update_task': {
        const body: Record<string, unknown> = {};
        if (args.title) body.title = args.title;
        if (args.description) body.description = args.description;
        if (args.due_date) body.dueDate = args.due_date;
        if (args.assigned_to) body.assignedTo = args.assigned_to;
        if (args.status) body.status = args.status;

        const res = await fetch(`${GHL_API_BASE}/contacts/${args.contact_id}/tasks/${args.task_id}`, {
          method: 'PUT', headers, body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.task ?? data };
      }

      case 'delete_task': {
        const res = await fetch(`${GHL_API_BASE}/contacts/${args.contact_id}/tasks/${args.task_id}`, {
          method: 'DELETE', headers,
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        return { success: true, data: { deleted: args.task_id } };
      }

      default:
        return { success: false, error: `Unknown task tool: ${toolName}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function ghlError(res: Response): Promise<ToolResult> {
  const body = await res.json().catch(() => ({}));
  return { success: false, error: body?.message || `GHL returned ${res.status}` };
}
