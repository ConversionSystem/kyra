// ============================================================================
// Conversation Memory
//
// Fetches the last N messages for a contact from client_conversations
// (Supabase DB). This gives the AI memory beyond GHL's short message window.
//
// Used to build the `messages` array sent to the AI with role: user/assistant.
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * Fetch the last N conversation turns for a contact.
 * Returns messages in chronological order (oldest first), ready to prepend to
 * the current message in the API call.
 */
export async function getConversationHistory(
  clientId: string,
  contactId: string,
  limit = 10,
): Promise<ConversationTurn[]> {
  const supabase = createServiceClientWithoutCookies();

  const { data, error } = await supabase
    .from('client_conversations')
    .select('user_message, ai_response, created_at')
    .eq('agency_client_id', clientId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) return [];

  // Reverse to get chronological order (oldest first)
  const turns: ConversationTurn[] = [];
  for (const row of [...data].reverse()) {
    if (row.user_message?.trim()) {
      turns.push({ role: 'user', content: row.user_message, timestamp: row.created_at });
    }
    if (row.ai_response?.trim()) {
      turns.push({ role: 'assistant', content: row.ai_response, timestamp: row.created_at });
    }
  }

  return turns;
}

/**
 * Save a conversation turn to the DB after the AI has replied.
 */
export async function saveConversationTurn(params: {
  clientId: string;
  agencyId: string;
  contactId: string;
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  conversationId: string;
  userMessage: string;
  aiResponse: string;
  channel: string;
  responseTimeMs: number;
}): Promise<void> {
  const supabase = createServiceClientWithoutCookies();

  await supabase.from('client_conversations').insert({
    agency_client_id: params.clientId,
    agency_id: params.agencyId,
    contact_id: params.contactId,
    contact_name: params.contactName,
    contact_phone: params.contactPhone ?? null,
    contact_email: params.contactEmail ?? null,
    conversation_id: params.conversationId,
    user_message: params.userMessage,
    ai_response: params.aiResponse,
    channel: params.channel,
    response_time_ms: params.responseTimeMs,
  });
}
