/**
 * CRM Conversation Logger
 *
 * Auto-logs GHL webhook messages to CRM activity timeline.
 * Also creates CRM contacts for unknown senders.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { logActivity } from './activities';
import { createContact } from './contacts';
import { extractMemories, addMemories, getMemories } from './relationship-memory';
import { detectCompetitorMentions, logCompetitorMentions } from './intelligence';

interface WebhookPayload {
  type: string;
  contactId?: string;
  phone?: string;
  email?: string;
  body?: string;
  message?: string;
  messageType?: string;
  direction?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

export async function logConversationToCrm(
  agencyId: string,
  payload: WebhookPayload,
): Promise<void> {
  const svc = createServiceClientWithoutCookies();
  const isInbound = payload.type === 'InboundMessage';
  const messageBody = payload.body || payload.message || '';
  const channel = payload.messageType?.toLowerCase() || 'sms';

  if (!messageBody.trim()) return;

  // Find CRM contact by phone or email
  let contactId: string | null = null;

  if (payload.phone) {
    const { data } = await svc
      .from('crm_contacts')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('phone', payload.phone)
      .limit(1);
    if (data?.length) contactId = data[0].id;
  }

  if (!contactId && payload.email) {
    const { data } = await svc
      .from('crm_contacts')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('email', payload.email)
      .limit(1);
    if (data?.length) contactId = data[0].id;
  }

  // Auto-create contact for unknown inbound senders
  if (!contactId && isInbound && (payload.phone || payload.email)) {
    const nameParts = (payload.name || '').split(' ');
    const result = await createContact(agencyId, {
      first_name: payload.firstName || nameParts[0] || undefined,
      last_name: payload.lastName || nameParts.slice(1).join(' ') || undefined,
      phone: payload.phone || undefined,
      email: payload.email || undefined,
      source: 'ghl_inbound',
      source_id: payload.contactId || undefined,
    });
    contactId = result.contact?.id || null;
  }

  if (!contactId) return;

  // Log activity
  await logActivity(agencyId, {
    contact_id: contactId,
    type: channel === 'email' ? 'email' : 'sms',
    subject: isInbound ? `Inbound ${channel}` : `Outbound ${channel}`,
    body: messageBody.slice(0, 2000),
    direction: isInbound ? 'inbound' : 'outbound',
    channel: 'ghl',
    actor: isInbound ? 'human' : 'ai',
    actor_name: isInbound ? (payload.name || payload.phone || 'Contact') : 'AI Worker',
    needs_attention: isInbound,
    attention_type: isInbound ? 'reply_needed' : undefined,
    metadata: {
      ghl_contact_id: payload.contactId,
      message_type: payload.messageType,
    },
  });

  // Detect competitor mentions (non-blocking)
  const contactName = payload.name || payload.firstName || payload.phone || 'Contact';
  const mentions = detectCompetitorMentions(messageBody, contactId, contactName);
  if (mentions.length > 0) {
    logCompetitorMentions(agencyId, mentions).catch(() => {});
  }

  // Extract relationship memories from conversation (non-blocking)
  if (messageBody.length > 20) {
    (async () => {
      try {
        const existing = await getMemories(agencyId, contactId);
        const newMemories = await extractMemories(messageBody, existing);
        if (newMemories.length > 0) {
          await addMemories(agencyId, contactId, newMemories);
        }
      } catch {}
    })();
  }
}
