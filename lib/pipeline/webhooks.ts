/**
 * Pipeline Webhook Dispatcher
 * 
 * Fires webhooks on every pipeline stage transition.
 * Compatible with Zapier, Make, n8n, GHL, and any HTTP endpoint.
 */
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PipelineEvent =
  | 'campaign.created'
  | 'lead.found'
  | 'lead.approved'
  | 'lead.researched'
  | 'lead.outreach_approved'
  | 'lead.messaged'
  | 'lead.replied'
  | 'lead.interested'
  | 'lead.booked'
  | 'lead.closed'
  | 'lead.skipped';

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  headers: Record<string, string>;
  is_active: boolean;
  secret: string | null;
}

interface LeadPayload {
  id: string;
  full_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  stage: string;
  previous_stage?: string;
  personalized_subject?: string | null;
  personalized_email?: string | null;
  personalized_opener?: string | null;
  ghl_contact_id?: string | null;
}

interface CampaignPayload {
  id: string;
  name: string;
}

interface WebhookPayload {
  event: PipelineEvent;
  timestamp: string;
  agency_id: string;
  campaign: CampaignPayload;
  lead?: LeadPayload;
  details?: Record<string, unknown>;
}

// ─── Main Dispatcher ──────────────────────────────────────────────────────────

/**
 * Fire webhooks for a pipeline event.
 * Non-blocking — logs errors but never throws.
 */
export async function fireWebhooks(
  agencyId: string,
  event: PipelineEvent,
  campaign: CampaignPayload,
  lead?: LeadPayload,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const svc = createServiceClientWithoutCookies();

    // Get all active webhooks for this agency that listen to this event
    const { data: webhooks } = await svc
      .from('pipeline_webhooks')
      .select('id, url, events, headers, is_active, secret')
      .eq('agency_id', agencyId)
      .eq('is_active', true);

    if (!webhooks?.length) return;

    const matching = webhooks.filter(
      (w: WebhookConfig) => w.events.includes(event) || w.events.includes('*')
    );

    if (!matching.length) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      agency_id: agencyId,
      campaign,
      ...(lead ? { lead } : {}),
      ...(details ? { details } : {}),
    };

    const body = JSON.stringify(payload);

    // Fire all matching webhooks in parallel (non-blocking)
    await Promise.allSettled(
      matching.map((webhook: WebhookConfig) => deliverWebhook(svc, webhook, event, body))
    );
  } catch (err) {
    console.error('[pipeline/webhooks] Error dispatching webhooks:', err);
  }
}

/**
 * Log a pipeline activity event + fire webhooks.
 */
export async function logAndFire(
  agencyId: string,
  event: PipelineEvent,
  campaign: CampaignPayload,
  lead?: LeadPayload & { previous_stage?: string },
  actor: string = 'system',
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const svc = createServiceClientWithoutCookies();

    // Log to activity table
    await svc.from('pipeline_activity_log').insert({
      agency_id: agencyId,
      campaign_id: campaign.id,
      lead_id: lead?.id || null,
      event,
      from_stage: lead?.previous_stage || null,
      to_stage: lead?.stage || null,
      actor,
      details: details || {},
      webhook_sent: false, // updated after webhook delivery
    });

    // Fire webhooks
    await fireWebhooks(agencyId, event, campaign, lead, details);
  } catch (err) {
    console.error('[pipeline/webhooks] logAndFire error:', err);
  }
}

// ─── Webhook Delivery ─────────────────────────────────────────────────────────

async function deliverWebhook(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  svc: any,
  webhook: WebhookConfig,
  event: PipelineEvent,
  body: string,
): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Kyra-Event': event,
    'X-Kyra-Timestamp': timestamp,
    ...(webhook.headers || {}),
  };

  // HMAC signature if secret is configured
  if (webhook.secret) {
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    headers['X-Kyra-Signature'] = `sha256=${signature}`;
  }

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(5_000),
    });

    // Update last delivery status
    await svc.from('pipeline_webhooks').update({
      last_status: res.status,
      last_error: res.ok ? null : `HTTP ${res.status}`,
      last_fired_at: new Date().toISOString(),
    }).eq('id', webhook.id);
  } catch (err) {
    // Log failure but don't block
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[pipeline/webhooks] Delivery failed for ${webhook.url}: ${errorMsg}`);

    await svc.from('pipeline_webhooks').update({
      last_status: 0,
      last_error: errorMsg,
      last_fired_at: new Date().toISOString(),
    }).eq('id', webhook.id).catch(() => {});
  }
}

// ─── Test Webhook ─────────────────────────────────────────────────────────────

export async function testWebhook(url: string, secret?: string): Promise<{ ok: boolean; status: number; error?: string }> {
  const testPayload: WebhookPayload = {
    event: 'lead.found',
    timestamp: new Date().toISOString(),
    agency_id: 'test-agency-id',
    campaign: { id: 'test-campaign-id', name: 'Test Campaign' },
    lead: {
      id: 'test-lead-id',
      full_name: 'Test Lead',
      company: 'Test Company',
      email: 'test@example.com',
      phone: '+15551234567',
      website: 'example.com',
      industry: 'Test Industry',
      location: 'Test City, US',
      stage: 'found',
    },
    details: { test: true },
  };

  const body = JSON.stringify(testPayload);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Kyra-Event': 'lead.found',
    'X-Kyra-Timestamp': timestamp,
  };

  if (secret) {
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    headers['X-Kyra-Signature'] = `sha256=${signature}`;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10_000),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
