/**
 * Webhook Dispatcher — Extended
 *
 * Supports multiple event types with per-event webhook URLs:
 *   - new_conversation: when a new AI conversation starts
 *   - escalation: when AI escalates to human
 *   - new_lead: when a new CRM lead is created
 *   - credit_low: when credits drop below threshold
 *   - review_queued: when a message is queued for review
 *
 * Also supports the legacy single ghl_webhook_url for backward compat.
 * Fire-and-forget — never blocks the response.
 */
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// ── Types ─────────────────────────────────────────────────────────────────────

export type WebhookEventType =
  | 'new_conversation'
  | 'escalation'
  | 'new_lead'
  | 'credit_low'
  | 'review_queued';

export interface WebhookConfig {
  event: WebhookEventType;
  url: string;
  enabled: boolean;
  secret?: string; // optional signing secret
}

interface WebhookPayload {
  event: WebhookEventType | 'conversation'; // 'conversation' for legacy compat
  agency_id: string;
  agency_name?: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface ConversationPayload {
  clientId: string;
  clientName?: string;
  agencyId: string;
  channel: string;
  userMessage: string;
  aiResponse: string;
  timestamp?: string;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

// Simple in-memory cache to avoid hitting Supabase on every webhook dispatch
const settingsCache = new Map<string, { settings: Record<string, unknown>; name: string; ts: number }>();
const CACHE_TTL = 60_000; // 1 minute

async function getAgencySettings(agencyId: string) {
  const cached = settingsCache.get(agencyId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached;
  }

  const service = createServiceClientWithoutCookies();
  const { data: agency } = await service
    .from('agencies')
    .select('settings, name')
    .eq('id', agencyId)
    .single();

  if (!agency) return null;

  const entry = {
    settings: (agency.settings as Record<string, unknown>) ?? {},
    name: agency.name || '',
    ts: Date.now(),
  };
  settingsCache.set(agencyId, entry);
  return entry;
}

// ── Legacy Dispatcher (backward compat) ───────────────────────────────────────

export async function dispatchWebhookIfConfigured(payload: ConversationPayload): Promise<void> {
  try {
    const agency = await getAgencySettings(payload.agencyId);
    if (!agency) return;

    // Legacy: single webhook URL
    const legacyUrl = agency.settings.ghl_webhook_url as string | undefined;

    // New: per-event webhook configs
    const webhookConfigs = (agency.settings.webhook_config as WebhookConfig[]) || [];
    const newConvoWebhook = webhookConfigs.find((w) => w.event === 'new_conversation' && w.enabled);

    const targetUrl = newConvoWebhook?.url || legacyUrl;
    if (!targetUrl) return;

    let clientName = payload.clientName;
    if (!clientName) {
      const service = createServiceClientWithoutCookies();
      const { data: client } = await service
        .from('agency_clients')
        .select('name')
        .eq('id', payload.clientId)
        .single();
      clientName = client?.name || 'Unknown';
    }

    const body: WebhookPayload = {
      event: 'new_conversation',
      agency_id: payload.agencyId,
      agency_name: agency.name,
      timestamp: payload.timestamp || new Date().toISOString(),
      data: {
        client_name: clientName,
        client_id: payload.clientId,
        channel: payload.channel,
        user_message: payload.userMessage,
        ai_response: payload.aiResponse,
      },
    };

    await fireWebhook(targetUrl, body);
  } catch {
    // Never throw — webhook failures are silent
  }
}

// ── Generic Event Dispatcher ──────────────────────────────────────────────────

/**
 * Dispatch a webhook event to the agency's configured URL for that event type.
 * Fire-and-forget — catches all errors silently.
 */
export async function dispatchWebhookEvent(
  agencyId: string,
  event: WebhookEventType,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const agency = await getAgencySettings(agencyId);
    if (!agency) return;

    const webhookConfigs = (agency.settings.webhook_config as WebhookConfig[]) || [];
    const webhook = webhookConfigs.find((w) => w.event === event && w.enabled);
    if (!webhook?.url) return;

    const body: WebhookPayload = {
      event,
      agency_id: agencyId,
      agency_name: agency.name,
      timestamp: new Date().toISOString(),
      data,
    };

    await fireWebhook(webhook.url, body, webhook.secret);
  } catch {
    // Never throw
  }
}

// ── HTTP Sender ───────────────────────────────────────────────────────────────

async function fireWebhook(
  url: string,
  body: WebhookPayload,
  secret?: string,
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (secret) {
    // Simple HMAC-like signing — agencies can verify authenticity
    headers['X-Webhook-Secret'] = secret;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5_000),
  });

  console.log(
    `[webhook] ${body.event} → ${url} (${res.status})`,
  );
}
