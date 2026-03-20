// ============================================================================
// GHL Skills — Conversations & Messaging (8 skills)
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

export const conversationToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'send_sms',
      description: 'Send an SMS message to a contact.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID to message' },
          message: { type: 'string', description: 'SMS message body' },
        },
        required: ['contact_id', 'message'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_email',
      description: 'Send an email to a contact.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
          subject: { type: 'string', description: 'Email subject line' },
          message: { type: 'string', description: 'Plain text email body' },
          html: { type: 'string', description: 'HTML email body (optional, overrides message)' },
          email_from: { type: 'string', description: 'From email address (optional)' },
        },
        required: ['contact_id', 'subject', 'message'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_whatsapp',
      description: 'Send a WhatsApp message to a contact.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
          message: { type: 'string', description: 'WhatsApp message body' },
        },
        required: ['contact_id', 'message'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_conversations',
      description: 'List conversations for a contact or location.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Filter by contact ID' },
          location_id: { type: 'string', description: 'Filter by location ID' },
          limit: { type: 'number', description: 'Max results (default 20)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_messages',
      description: 'Get messages in a conversation.',
      parameters: {
        type: 'object',
        properties: {
          conversation_id: { type: 'string', description: 'Conversation ID' },
          limit: { type: 'number', description: 'Max messages to return (default 50)' },
          last_message_id: { type: 'string', description: 'Pagination cursor' },
        },
        required: ['conversation_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_conversation',
      description: 'Start a new conversation with a contact.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact ID' },
          location_id: { type: 'string', description: 'Location ID' },
        },
        required: ['contact_id', 'location_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'mark_conversation_read',
      description: 'Mark a conversation as read.',
      parameters: {
        type: 'object',
        properties: {
          conversation_id: { type: 'string', description: 'Conversation ID' },
        },
        required: ['conversation_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_unread_count',
      description: 'Get the count of unread messages for a location.',
      parameters: {
        type: 'object',
        properties: {
          location_id: { type: 'string', description: 'Location ID' },
        },
        required: ['location_id'],
      },
    },
  },
];

// ── Executor ─────────────────────────────────────────────────────────────────

export async function executeConversationTool(
  toolName: string,
  args: Record<string, unknown>,
  token: string,
  locationId: string,
): Promise<ToolResult> {
  const headers = ghlHeaders(token);

  try {
    switch (toolName) {
      case 'send_sms': {
        const res = await fetch(`${GHL_API_BASE}/conversations/messages`, {
          method: 'POST', headers,
          body: JSON.stringify({
            type: 'SMS',
            contactId: args.contact_id,
            message: args.message,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: { messageId: data.messageId, conversationId: data.conversationId } };
      }

      case 'send_email': {
        const body: Record<string, unknown> = {
          type: 'Email',
          contactId: args.contact_id,
          subject: args.subject,
          message: args.message,
        };
        if (args.html) body.html = args.html;
        if (args.email_from) body.emailFrom = args.email_from;

        const res = await fetch(`${GHL_API_BASE}/conversations/messages`, {
          method: 'POST', headers, body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: { messageId: data.messageId, conversationId: data.conversationId } };
      }

      case 'send_whatsapp': {
        const res = await fetch(`${GHL_API_BASE}/conversations/messages`, {
          method: 'POST', headers,
          body: JSON.stringify({
            type: 'WhatsApp',
            contactId: args.contact_id,
            message: args.message,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: { messageId: data.messageId, conversationId: data.conversationId } };
      }

      case 'get_conversations': {
        const params = new URLSearchParams();
        if (args.contact_id) params.set('contactId', args.contact_id as string);
        if (args.location_id || locationId) params.set('locationId', (args.location_id as string) || locationId);
        params.set('limit', String(args.limit ?? 20));

        const res = await fetch(`${GHL_API_BASE}/conversations/search?${params}`, {
          headers, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data };
      }

      case 'get_messages': {
        const params = new URLSearchParams({ limit: String(args.limit ?? 50) });
        if (args.last_message_id) params.set('lastMessageId', args.last_message_id as string);

        const res = await fetch(`${GHL_API_BASE}/conversations/${args.conversation_id}/messages?${params}`, {
          headers, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data };
      }

      case 'create_conversation': {
        const res = await fetch(`${GHL_API_BASE}/conversations/`, {
          method: 'POST', headers,
          body: JSON.stringify({
            contactId: args.contact_id,
            locationId: (args.location_id as string) || locationId,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        return { success: true, data: data.conversation ?? data };
      }

      case 'mark_conversation_read': {
        const res = await fetch(`${GHL_API_BASE}/conversations/${args.conversation_id}/read`, {
          method: 'PUT', headers,
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        return { success: true, data: { marked: args.conversation_id } };
      }

      case 'get_unread_count': {
        const locId = (args.location_id as string) || locationId;
        const res = await fetch(`${GHL_API_BASE}/conversations/search?locationId=${locId}&limit=1`, {
          headers, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return ghlError(res);
        const data = await res.json();
        // Sum unread counts from conversations
        const total = (data.conversations ?? []).reduce(
          (sum: number, c: { unreadCount?: number }) => sum + (c.unreadCount ?? 0), 0,
        );
        return { success: true, data: { unreadCount: total, total: data.total ?? 0 } };
      }

      default:
        return { success: false, error: `Unknown conversation tool: ${toolName}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function ghlError(res: Response): Promise<ToolResult> {
  const body = await res.json().catch(() => ({}));
  return { success: false, error: body?.message || `GHL returned ${res.status}` };
}
