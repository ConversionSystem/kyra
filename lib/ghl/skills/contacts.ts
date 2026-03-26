// ============================================================================
// GHL Skills — CRM & Contacts (10 skills)
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

export const contactToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'create_contact',
      description: 'Create a new contact in the CRM with name, email, phone, and optional tags.',
      parameters: {
        type: 'object',
        properties: {
          location_id: { type: 'string', description: 'GHL location ID' },
          first_name: { type: 'string', description: 'First name' },
          last_name: { type: 'string', description: 'Last name' },
          email: { type: 'string', description: 'Email address' },
          phone: { type: 'string', description: 'Phone number' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags to apply' },
          company_name: { type: 'string', description: 'Company name' },
        },
        required: ['location_id', 'first_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_contact',
      description: 'Update contact fields such as name, email, phone, company, or address.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID to update' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          company_name: { type: 'string' },
          address1: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          postal_code: { type: 'string' },
        },
        required: ['contact_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_contact',
      description: 'Get full contact details by contact ID.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'The contact ID' },
        },
        required: ['contact_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_contacts',
      description: 'Search contacts by name, email, phone, or tag.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (name, email, phone)' },
          location_id: { type: 'string', description: 'GHL location ID' },
          limit: { type: 'number', description: 'Max results (default 20)' },
        },
        required: ['query', 'location_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_contact',
      description: 'Permanently delete a contact from the CRM.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID to delete' },
        },
        required: ['contact_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_contact_tags',
      description: 'Add one or more tags to a contact for categorization and workflow triggers.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags to add' },
        },
        required: ['contact_id', 'tags'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'remove_contact_tags',
      description: 'Remove one or more tags from a contact.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags to remove' },
        },
        required: ['contact_id', 'tags'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_contact_note',
      description: 'Add a note to a contact record for internal reference.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
          body: { type: 'string', description: 'Note content' },
        },
        required: ['contact_id', 'body'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_contact_notes',
      description: 'Get all notes for a contact.',
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
      name: 'update_custom_field',
      description: 'Update a custom field value on a contact.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
          field_id: { type: 'string', description: 'Custom field ID' },
          value: { type: 'string', description: 'New field value' },
        },
        required: ['contact_id', 'field_id', 'value'],
      },
    },
  },
];

// ── Executor ─────────────────────────────────────────────────────────────────

export async function executeContactTool(
  toolName: string,
  args: Record<string, unknown>,
  token: string,
  locationId: string,
): Promise<ToolResult> {
  const headers = ghlHeaders(token);

  try {
    switch (toolName) {
      case 'create_contact': {
        const body: Record<string, unknown> = {
          locationId: (args.location_id as string) || locationId,
          firstName: args.first_name,
        };
        if (args.last_name) body.lastName = args.last_name;
        if (args.email) body.email = args.email;
        if (args.phone) body.phone = args.phone;
        if (args.tags) body.tags = args.tags;
        if (args.company_name) body.companyName = args.company_name;

        const res = await fetch(`${GHL_API_BASE}/contacts/`, {
          method: 'POST', headers, body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.contact ?? data };
      }

      case 'update_contact': {
        const contactId = args.contact_id as string;
        const body: Record<string, unknown> = {};
        if (args.first_name) body.firstName = args.first_name;
        if (args.last_name) body.lastName = args.last_name;
        if (args.email) body.email = args.email;
        if (args.phone) body.phone = args.phone;
        if (args.company_name) body.companyName = args.company_name;
        if (args.address1) body.address1 = args.address1;
        if (args.city) body.city = args.city;
        if (args.state) body.state = args.state;
        if (args.postal_code) body.postalCode = args.postal_code;

        const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
          method: 'PUT', headers, body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.contact ?? data };
      }

      case 'get_contact': {
        const res = await fetch(`${GHL_API_BASE}/contacts/${args.contact_id}`, {
          headers, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.contact ?? data };
      }

      case 'search_contacts': {
        const params = new URLSearchParams({
          query: args.query as string,
          locationId: (args.location_id as string) || locationId,
          limit: String(args.limit ?? 20),
        });
        const res = await fetch(`${GHL_API_BASE}/contacts/?${params}`, {
          headers, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data };
      }

      case 'delete_contact': {
        const res = await fetch(`${GHL_API_BASE}/contacts/${args.contact_id}`, {
          method: 'DELETE', headers, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        return { success: true, data: { deleted: args.contact_id } };
      }

      case 'add_contact_tags': {
        const res = await fetch(`${GHL_API_BASE}/contacts/${args.contact_id}/tags`, {
          method: 'POST', headers, body: JSON.stringify({ tags: args.tags }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data };
      }

      case 'remove_contact_tags': {
        const res = await fetch(`${GHL_API_BASE}/contacts/${args.contact_id}/tags`, {
          method: 'DELETE', headers, body: JSON.stringify({ tags: args.tags }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        return { success: true, data: { removed: args.tags } };
      }

      case 'add_contact_note': {
        const res = await fetch(`${GHL_API_BASE}/contacts/${args.contact_id}/notes`, {
          method: 'POST', headers, body: JSON.stringify({ body: args.body }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.note ?? data };
      }

      case 'get_contact_notes': {
        const res = await fetch(`${GHL_API_BASE}/contacts/${args.contact_id}/notes`, {
          headers, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.notes ?? data };
      }

      case 'update_custom_field': {
        const res = await fetch(`${GHL_API_BASE}/contacts/${args.contact_id}`, {
          method: 'PUT', headers,
          body: JSON.stringify({
            customFields: [{ id: args.field_id, field_value: args.value }],
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.contact ?? data };
      }

      default:
        return { success: false, error: `Unknown contact tool: ${toolName}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function ghlError(res: Response): Promise<ToolResult> {
  const body = await res.json().catch(() => ({}));
  return { success: false, error: body?.message || `GHL returned ${res.status}` };
}
