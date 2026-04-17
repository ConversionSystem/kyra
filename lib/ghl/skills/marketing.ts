// ============================================================================
// GHL Skills — Marketing & Content (6 skills)
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

export const marketingToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'create_blog_post',
      description: 'Create a blog post in the CMS.',
      parameters: {
        type: 'object',
        properties: {
          location_id: { type: 'string', description: 'Location ID' },
          title: { type: 'string', description: 'Blog post title' },
          content: { type: 'string', description: 'Blog post content (HTML)' },
          status: { type: 'string', enum: ['draft', 'published'], description: 'Status (default: draft)' },
          author: { type: 'string', description: 'Author name' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Blog tags' },
        },
        required: ['location_id', 'title', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'schedule_social_post',
      description: 'Schedule a social media post.',
      parameters: {
        type: 'object',
        properties: {
          location_id: { type: 'string', description: 'Location ID' },
          content: { type: 'string', description: 'Post content/caption' },
          platforms: {
            type: 'array',
            items: { type: 'string', enum: ['facebook', 'instagram', 'twitter', 'linkedin', 'google'] },
            description: 'Target platforms',
          },
          scheduled_at: { type: 'string', description: 'Scheduled publish time (ISO 8601)' },
          image_url: { type: 'string', description: 'Image URL to attach' },
        },
        required: ['location_id', 'content', 'platforms'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_email_campaign',
      description: 'Trigger an email campaign for a list of contacts or a tag.',
      parameters: {
        type: 'object',
        properties: {
          location_id: { type: 'string', description: 'Location ID' },
          campaign_id: { type: 'string', description: 'Campaign/email template ID' },
        },
        required: ['location_id', 'campaign_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_form_submission',
      description: 'Submit a form entry programmatically.',
      parameters: {
        type: 'object',
        properties: {
          location_id: { type: 'string', description: 'Location ID' },
          form_id: { type: 'string', description: 'Form ID' },
          fields: {
            type: 'object',
            description: 'Key-value pairs of form fields',
          },
        },
        required: ['location_id', 'form_id', 'fields'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'trigger_workflow',
      description: 'Trigger a GHL workflow for a specific contact.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
          workflow_id: { type: 'string', description: 'Workflow ID to trigger' },
        },
        required: ['contact_id', 'workflow_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_to_workflow',
      description: 'Add a contact to a specific workflow (enrolls them).',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
          workflow_id: { type: 'string', description: 'Workflow ID' },
        },
        required: ['contact_id', 'workflow_id'],
      },
    },
  },
];

// ── Executor ─────────────────────────────────────────────────────────────────

export async function executeMarketingTool(
  toolName: string,
  args: Record<string, unknown>,
  token: string,
  locationId: string,
): Promise<ToolResult> {
  const headers = ghlHeaders(token);
  const locId = (args.location_id as string) || locationId;

  const idCheck = validateGhlIds(args, ['campaign_id', 'workflow_id', 'contact_id']);
  if (idCheck) return idCheck;

  try {
    switch (toolName) {
      case 'create_blog_post': {
        const body: Record<string, unknown> = {
          locationId: locId,
          title: args.title,
          content: args.content,
          status: args.status || 'draft',
        };
        if (args.author) body.author = args.author;
        if (args.tags) body.tags = args.tags;

        const res = await fetch(`${GHL_API_BASE}/blogs/posts`, {
          method: 'POST', headers, body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.post ?? data };
      }

      case 'schedule_social_post': {
        const body: Record<string, unknown> = {
          locationId: locId,
          content: args.content,
          platforms: args.platforms,
        };
        if (args.scheduled_at) body.scheduledAt = args.scheduled_at;
        if (args.image_url) body.imageUrl = args.image_url;

        const res = await fetch(`${GHL_API_BASE}/social-media-posting/post`, {
          method: 'POST', headers, body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.post ?? data };
      }

      case 'send_email_campaign': {
        const res = await fetch(`${GHL_API_BASE}/campaigns/${args.campaign_id}/send`, {
          method: 'POST', headers,
          body: JSON.stringify({ locationId: locId }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data };
      }

      case 'create_form_submission': {
        const res = await fetch(`${GHL_API_BASE}/forms/submit`, {
          method: 'POST', headers,
          body: JSON.stringify({
            locationId: locId,
            formId: args.form_id,
            ...args.fields as Record<string, unknown>,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data };
      }

      case 'trigger_workflow': {
        const res = await fetch(`${GHL_API_BASE}/contacts/${args.contact_id}/workflow/${args.workflow_id}`, {
          method: 'POST', headers, body: JSON.stringify({}),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data };
      }

      case 'add_to_workflow': {
        const res = await fetch(`${GHL_API_BASE}/contacts/${args.contact_id}/workflow/${args.workflow_id}`, {
          method: 'POST', headers, body: JSON.stringify({}),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data };
      }

      default:
        return { success: false, error: `Unknown marketing tool: ${toolName}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function ghlError(res: Response): Promise<ToolResult> {
  const body = await res.json().catch(() => ({}));
  return { success: false, error: body?.message || `GHL returned ${res.status}` };
}
