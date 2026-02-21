/**
 * GHL Webhook Dispatcher
 * Fires agency's configured webhook URL when a conversation occurs.
 * Fire-and-forget — never blocks the response.
 */
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

interface ConversationPayload {
  clientId: string;
  clientName?: string;
  agencyId: string;
  channel: string;
  userMessage: string;
  aiResponse: string;
  timestamp?: string;
}

export async function dispatchWebhookIfConfigured(payload: ConversationPayload): Promise<void> {
  try {
    const service = createServiceClientWithoutCookies();

    // Get agency webhook URL from settings
    const { data: agency } = await service
      .from('agencies')
      .select('settings, name')
      .eq('id', payload.agencyId)
      .single();

    const webhookUrl = (agency?.settings as any)?.ghl_webhook_url as string | undefined;
    if (!webhookUrl) return;

    // Get client name if not provided
    let clientName = payload.clientName;
    if (!clientName) {
      const { data: client } = await service
        .from('agency_clients')
        .select('name')
        .eq('id', payload.clientId)
        .single();
      clientName = client?.name || 'Unknown';
    }

    const body = {
      event: 'conversation',
      agency_name: agency?.name,
      client_name: clientName,
      client_id: payload.clientId,
      agency_id: payload.agencyId,
      channel: payload.channel,
      user_message: payload.userMessage,
      ai_response: payload.aiResponse,
      timestamp: payload.timestamp || new Date().toISOString(),
    };

    // Fire without awaiting — timeout 5s
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    });

    console.log(`[webhook] Fired for agency ${payload.agencyId} → ${webhookUrl}`);
  } catch {
    // Never throw — webhook failures are silent
  }
}
