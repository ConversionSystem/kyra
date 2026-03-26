// ============================================================================
// GHL Skills — Invoices & Payments (6 skills)
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

export const invoiceToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'create_invoice',
      description: 'Create an invoice for a contact.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
          location_id: { type: 'string', description: 'Location ID' },
          name: { type: 'string', description: 'Invoice name/title' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Item name' },
                amount: { type: 'number', description: 'Item amount in cents' },
                quantity: { type: 'number', description: 'Quantity (default 1)' },
              },
              required: ['name', 'amount'],
            },
            description: 'Line items',
          },
          due_date: { type: 'string', description: 'Due date (ISO 8601)' },
        },
        required: ['contact_id', 'location_id', 'name', 'items'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_invoices',
      description: 'List invoices for a location, optionally filtered by contact.',
      parameters: {
        type: 'object',
        properties: {
          location_id: { type: 'string', description: 'Location ID' },
          contact_id: { type: 'string', description: 'Filter by contact ID' },
          status: { type: 'string', enum: ['draft', 'sent', 'paid', 'void'], description: 'Filter by status' },
          limit: { type: 'number', description: 'Max results (default 20)' },
        },
        required: ['location_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_invoice',
      description: 'Send an invoice to the contact via email.',
      parameters: {
        type: 'object',
        properties: {
          invoice_id: { type: 'string', description: 'Invoice ID to send' },
          location_id: { type: 'string', description: 'Location ID' },
        },
        required: ['invoice_id', 'location_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_estimate',
      description: 'Create an estimate/quote for a contact.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
          location_id: { type: 'string', description: 'Location ID' },
          name: { type: 'string', description: 'Estimate name/title' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Item name' },
                amount: { type: 'number', description: 'Item amount in cents' },
                quantity: { type: 'number', description: 'Quantity (default 1)' },
              },
              required: ['name', 'amount'],
            },
            description: 'Line items',
          },
          expiry_date: { type: 'string', description: 'Expiry date (ISO 8601)' },
        },
        required: ['contact_id', 'location_id', 'name', 'items'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'record_payment',
      description: 'Record a manual payment against an invoice.',
      parameters: {
        type: 'object',
        properties: {
          invoice_id: { type: 'string', description: 'Invoice ID' },
          location_id: { type: 'string', description: 'Location ID' },
          amount: { type: 'number', description: 'Payment amount in cents' },
          payment_method: { type: 'string', enum: ['cash', 'check', 'bank_transfer', 'other'], description: 'Payment method' },
          notes: { type: 'string', description: 'Payment notes' },
        },
        required: ['invoice_id', 'location_id', 'amount'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_payment_history',
      description: 'Get payment history for a contact.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
          location_id: { type: 'string', description: 'Location ID' },
          limit: { type: 'number', description: 'Max results (default 20)' },
        },
        required: ['contact_id', 'location_id'],
      },
    },
  },
];

// ── Executor ─────────────────────────────────────────────────────────────────

export async function executeInvoiceTool(
  toolName: string,
  args: Record<string, unknown>,
  token: string,
  locationId: string,
): Promise<ToolResult> {
  const headers = ghlHeaders(token);
  const locId = (args.location_id as string) || locationId;

  try {
    switch (toolName) {
      case 'create_invoice': {
        const body: Record<string, unknown> = {
          contactId: args.contact_id,
          locationId: locId,
          name: args.name,
          items: args.items,
        };
        if (args.due_date) body.dueDate = args.due_date;

        const res = await fetch(`${GHL_API_BASE}/invoices/`, {
          method: 'POST', headers, body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.invoice ?? data };
      }

      case 'get_invoices': {
        const params = new URLSearchParams({ locationId: locId });
        if (args.contact_id) params.set('contactId', args.contact_id as string);
        if (args.status) params.set('status', args.status as string);
        params.set('limit', String(args.limit ?? 20));

        const res = await fetch(`${GHL_API_BASE}/invoices/?${params}`, {
          headers, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data };
      }

      case 'send_invoice': {
        const res = await fetch(`${GHL_API_BASE}/invoices/${args.invoice_id}/send`, {
          method: 'POST', headers,
          body: JSON.stringify({ locationId: locId }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        return { success: true, data: { sent: args.invoice_id } };
      }

      case 'create_estimate': {
        const body: Record<string, unknown> = {
          contactId: args.contact_id,
          locationId: locId,
          name: args.name,
          items: args.items,
        };
        if (args.expiry_date) body.expiryDate = args.expiry_date;

        const res = await fetch(`${GHL_API_BASE}/invoices/estimate`, {
          method: 'POST', headers, body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.estimate ?? data };
      }

      case 'record_payment': {
        const body: Record<string, unknown> = {
          invoiceId: args.invoice_id,
          locationId: locId,
          amount: args.amount,
          paymentMethod: args.payment_method || 'other',
        };
        if (args.notes) body.notes = args.notes;

        const res = await fetch(`${GHL_API_BASE}/invoices/${args.invoice_id}/payments`, {
          method: 'POST', headers, body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.payment ?? data };
      }

      case 'get_payment_history': {
        const params = new URLSearchParams({
          contactId: args.contact_id as string,
          locationId: locId,
          limit: String(args.limit ?? 20),
        });

        const res = await fetch(`${GHL_API_BASE}/payments/?${params}`, {
          headers, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data };
      }

      default:
        return { success: false, error: `Unknown invoice tool: ${toolName}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function ghlError(res: Response): Promise<ToolResult> {
  const body = await res.json().catch(() => ({}));
  return { success: false, error: body?.message || `GHL returned ${res.status}` };
}
