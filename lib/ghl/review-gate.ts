// ============================================================================
// Review Gate — Intercept AI responses for human approval before sending
//
// When an agency enables review_gate for specific clients, AI responses
// are held in client_conversations with needs_review=true instead of
// being sent directly to the customer.
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { dispatchWebhookEvent } from '@/lib/agency/webhook-dispatcher';

interface ReviewGateSettings {
  enabled: boolean;
  clientIds: string[];
}

/**
 * Check if a client has review gate enabled.
 * Returns true if the agency has review_gate_enabled=true AND
 * the client_id is in the review_gate_clients array.
 */
export async function isReviewGateActive(
  agencyId: string,
  clientId: string,
): Promise<boolean> {
  try {
    const supabase = createServiceClientWithoutCookies();
    const { data: agency } = await supabase
      .from('agencies')
      .select('settings')
      .eq('id', agencyId)
      .single();

    if (!agency) return false;

    const settings = (agency.settings as Record<string, unknown>) ?? {};
    const enabled = settings.review_gate_enabled === true;
    const clientIds = (settings.review_gate_clients as string[]) || [];

    return enabled && clientIds.includes(clientId);
  } catch (err) {
    console.error('[review-gate] Error checking review gate:', err);
    return false; // fail open — don't block messages if check fails
  }
}

/**
 * Queue an AI response for review instead of sending it.
 * Saves to client_conversations with needs_review=true metadata.
 */
export async function queueForReview(params: {
  clientId: string;
  agencyId: string;
  contactId: string;
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  conversationId?: string;
  channel: string;
  userMessage: string;
  aiResponse: string;
  responseTimeMs: number;
}): Promise<string> {
  const supabase = createServiceClientWithoutCookies();

  const { data, error } = await supabase
    .from('client_conversations')
    .insert({
      client_id: params.clientId,
      agency_id: params.agencyId,
      contact_id: params.contactId,
      contact_name: params.contactName,
      contact_phone: params.contactPhone || null,
      contact_email: params.contactEmail || null,
      conversation_id: params.conversationId || null,
      channel: params.channel,
      user_message: params.userMessage,
      ai_response: params.aiResponse,
      response_time_ms: params.responseTimeMs,
      metadata: {
        needs_review: true,
        queued_at: new Date().toISOString(),
        review_status: 'pending',
      },
    })
    .select('id')
    .single();

  if (error) {
    console.error('[review-gate] Failed to queue for review:', error);
    throw error;
  }

  console.log(
    `[review-gate] 📋 Queued response for review: client=${params.clientId} contact=${params.contactName} id=${data.id}`,
  );

  // Fire webhook for review_queued event
  dispatchWebhookEvent(params.agencyId, 'review_queued', {
    review_id: data.id,
    client_id: params.clientId,
    contact_name: params.contactName,
    channel: params.channel,
    user_message: params.userMessage,
    ai_draft: params.aiResponse,
  }).catch(() => {});

  return data.id;
}
