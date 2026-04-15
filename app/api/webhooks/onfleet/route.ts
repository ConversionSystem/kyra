import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
  processWebhook,
  createProvider,
  logDeliverySms,
  isWithinSendingHours,
  DEFAULT_TEMPLATES,
} from '@/lib/sms';
import type { ClientSmsConfig, OnfleetWebhookPayload } from '@/lib/sms';
import { evaluateNotificationGate } from '@/lib/onfleet/notification-gate';
import type { ClientDispatchConfig } from '@/lib/onfleet/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Onfleet Webhook Handler
 *
 * GET  — Onfleet validation check (returns 200 to confirm endpoint)
 * POST — Processes delivery events → renders template → sends SMS
 *
 * URL pattern: /api/webhooks/onfleet?clientId={clientId}&secret={webhookSecret}
 */

// Onfleet sends a GET to validate the webhook URL on setup.
// It appends ?check=<value> and expects a 200 response with the check value
// echoed back as the response body (plain text, not JSON).
// See: https://docs.onfleet.com/reference/webhooks
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const check = searchParams.get('check');

  if (check) {
    // OnFleet expects the check value echoed as plain text
    return new NextResponse(check, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ status: 'ok', service: 'kyra-dispatch' });
}

export async function POST(req: NextRequest) {
  const receivedAt = new Date().toISOString();
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  const secret = searchParams.get('secret');

  // ── Validate request ────────────────────────────────────────────────
  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId parameter' }, { status: 400 });
  }

  // ── Load client SMS config from Supabase ────────────────────────────
  const config = await getClientSmsConfig(clientId);
  if (!config) {
    return NextResponse.json({ error: 'Client not found or SMS not configured' }, { status: 404 });
  }

  if (!config.enabled) {
    return NextResponse.json({ status: 'disabled', message: 'SMS disabled for this client' });
  }

  // ── Validate webhook secret ─────────────────────────────────────────
  if (config.webhookSecret && secret !== config.webhookSecret) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
  }

  // ── Parse webhook payload ───────────────────────────────────────────
  let payload: OnfleetWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  // ── Notification gate (dispatch intelligence) ───────────────────────
  const dispatchConfig = await getClientDispatchConfig(clientId);

  // Look up last notification time for cooldown (DB-backed, survives serverless restarts)
  const taskId = payload.taskId || payload.data?.task?.id || 'unknown';
  let lastNotificationAt: number | undefined;
  if (dispatchConfig?.enabled && dispatchConfig.notificationGate?.cooldownMinutes > 0) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: lastSms } = await supabase
        .from('delivery_sms_log')
        .select('sent_at')
        .eq('client_id', clientId)
        .eq('order_id', taskId)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(1)
        .single();
      if (lastSms?.sent_at) {
        lastNotificationAt = new Date(lastSms.sent_at).getTime();
      }
    } catch {
      // table may not exist or no prior SMS — cooldown won't apply
    }
  }

  const gateDecision = evaluateNotificationGate(payload, dispatchConfig, lastNotificationAt);

  if (!gateDecision.allow) {
    // Log the suppression to dispatch_events if table exists
    if (dispatchConfig?.enabled) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('dispatch_events').insert({
          client_id: clientId,
          event_type: 'notification_suppressed',
          details: {
            reason: gateDecision.reason,
            triggerName: payload.triggerName,
            taskId: payload.taskId || payload.data?.task?.id,
          },
          tasks_affected: 1,
          workers_affected: 0,
        });
      } catch {
        // table may not exist yet
      }
    }

    return NextResponse.json({
      status: 'suppressed',
      reason: gateDecision.reason,
    });
  }

  // ── Process: parse event → find template → render message ───────────
  const templates = config.templates.length > 0 ? config.templates : DEFAULT_TEMPLATES;
  const message = processWebhook(payload, templates);

  if (!message) {
    // Event type not mapped or no template — acknowledge silently
    return NextResponse.json({
      status: 'skipped',
      reason: 'No matching template for this event',
    });
  }

  // ── Check sending hours (TCPA compliance) ───────────────────────────
  if (!isWithinSendingHours(config.sendingHoursStart, config.sendingHoursEnd, config.timezone)) {
    // Queue for later (for now, log and skip)
    await logDeliverySms({
      id: crypto.randomUUID(),
      clientId,
      orderId: message.orderId,
      event: message.event,
      templateId: message.templateId,
      customerPhone: message.to,
      customerName: '', // extracted in processWebhook but not returned
      driverName: '',
      messageBody: message.body,
      provider: config.provider,
      status: 'queued',
      error: 'Outside sending hours — queued',
      sentAt: receivedAt,
      webhookReceivedAt: receivedAt,
    });

    return NextResponse.json({
      status: 'queued',
      reason: `Outside sending hours (${config.sendingHoursStart}:00-${config.sendingHoursEnd}:00 ${config.timezone})`,
    });
  }

  // ── Send SMS via configured provider ────────────────────────────────
  const provider = createProvider({
    provider: config.provider,
    apiUrl: config.providerApiUrl,
    apiKey: config.providerApiKey,
  });

  const result = await provider.sendMessage(message);

  // ── Log to delivery timeline ────────────────────────────────────────
  await logDeliverySms({
    id: crypto.randomUUID(),
    clientId,
    orderId: message.orderId,
    event: message.event,
    templateId: message.templateId,
    customerPhone: message.to,
    customerName: '',
    driverName: '',
    messageBody: message.body,
    provider: result.provider,
    providerMessageId: result.messageId,
    status: result.success ? 'sent' : 'failed',
    error: result.error,
    sentAt: result.timestamp,
    webhookReceivedAt: receivedAt,
  });

  if (!result.success) {
    console.error(`[DeliverySMS] Failed to send to ${message.to}:`, result.error);
    return NextResponse.json(
      { status: 'error', error: result.error },
      { status: 502 },
    );
  }

  return NextResponse.json({
    status: 'sent',
    messageId: result.messageId,
    event: message.event,
    template: message.templateId,
  });
}

// ── Helper: Load client SMS config ──────────────────────────────────────

async function getClientSmsConfig(clientId: string): Promise<ClientSmsConfig | null> {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', clientId)
    .single();

  if (error || !data?.settings) return null;

  const settings = data.settings as Record<string, unknown>;
  const sms = settings.sms as Partial<ClientSmsConfig> | undefined;

  if (!sms) return null;

  return {
    enabled: sms.enabled ?? false,
    provider: sms.provider ?? 'mock',
    providerApiKey: sms.providerApiKey ?? '',
    providerApiUrl: sms.providerApiUrl ?? '',
    webhookSecret: sms.webhookSecret ?? '',
    templates: Array.isArray(sms.templates) ? sms.templates : [],
    brandName: sms.brandName ?? 'Your Business',
    sendingHoursStart: sms.sendingHoursStart ?? 8,
    sendingHoursEnd: sms.sendingHoursEnd ?? 22,
    timezone: sms.timezone ?? 'America/Los_Angeles',
  };
}

// ── Helper: Load client dispatch config ───────────────────────────────────

async function getClientDispatchConfig(clientId: string): Promise<ClientDispatchConfig | null> {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', clientId)
    .single();

  if (error || !data?.settings) return null;

  const settings = data.settings as Record<string, unknown>;
  const dispatch = settings.dispatch as ClientDispatchConfig | undefined;

  return dispatch ?? null;
}
