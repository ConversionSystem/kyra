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
import { executeRules } from '@/lib/onfleet/rule-engine';
import type { ClientDispatchConfig, RuleExecutionContext, OnfleetTask } from '@/lib/onfleet/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Onfleet Webhook Handler (path-based clientId)
 *
 * GET  — Onfleet validation check (echoes check value as plain text)
 * POST — Processes delivery events → renders template → sends SMS
 *
 * URL pattern: /api/webhooks/onfleet/{clientId}
 *
 * The clientId is in the path (not query string) so OnFleet can safely
 * append ?check=<value> during webhook validation without collisions.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { searchParams } = new URL(req.url);
  const check = searchParams.get('check');

  if (check) {
    return new NextResponse(check, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const { clientId } = await params;
  return NextResponse.json({ status: 'ok', service: 'kyra-dispatch', clientId });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const receivedAt = new Date().toISOString();
  const { clientId } = await params;
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

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

  // ── Rule engine evaluation (dispatch intelligence) ──────────────────
  if (dispatchConfig?.enabled && dispatchConfig.rules?.length > 0) {
    try {
      // Build task from webhook payload for rule context
      // The webhook payload type is loosely typed — cast to access OnFleet task fields
      const webhookTask = payload.data?.task as Record<string, unknown> | undefined;
      const ruleTask: OnfleetTask | undefined = webhookTask ? {
        id: (webhookTask.id as string) || taskId,
        shortId: (webhookTask.shortId as string) || '',
        state: ((webhookTask.status ?? webhookTask.state ?? 0) as number) as 0 | 1 | 2 | 3,
        timeCreated: (webhookTask.timeCreated as number) || 0,
        timeLastModified: (webhookTask.timeLastModified as number) || 0,
        eta: webhookTask.eta as number | undefined,
        worker: typeof webhookTask.worker === 'string'
          ? webhookTask.worker
          : (webhookTask.worker as Record<string, string> | undefined)?.id,
        completeBefore: webhookTask.completeBefore as number | undefined,
        recipients: ((webhookTask.recipients || []) as Record<string, string>[]).map((r) => ({
          id: r.id || '', name: r.name || '', phone: r.phone || '',
        })),
        destination: {
          id: ((webhookTask.destination as Record<string, unknown>)?.id as string) || '',
          location: ((webhookTask.destination as Record<string, unknown>)?.location as [number, number]) || [0, 0],
          address: ((webhookTask.destination as Record<string, unknown>)?.address as OnfleetTask['destination']['address']) || {},
        },
      } : undefined;

      // Check for recent cancellation reopt (debounce)
      let lastCancelReoptAt: number | undefined;
      if (payload.triggerId === 4) {
        try {
          const dbClient = createClient(supabaseUrl, supabaseServiceKey);
          const { data: lastReopt } = await dbClient
            .from('dispatch_events')
            .select('created_at')
            .eq('client_id', clientId)
            .eq('event_type', 'cancellation_reopt')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (lastReopt?.created_at) {
            lastCancelReoptAt = new Date(lastReopt.created_at).getTime();
          }
        } catch {
          // No prior reopt — debounce won't apply
        }
      }

      const ruleCtx: RuleExecutionContext = {
        clientId,
        config: dispatchConfig,
        trigger: 'webhook',
        eventType: payload.triggerName,
        triggerId: payload.triggerId,
        task: ruleTask,
        webhookPayload: payload,
        lastCancelReoptAt,
      };

      const results = await executeRules(ruleCtx);

      // Log events from rules that fired
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      for (const result of results) {
        if (result.fired && result.event) {
          await supabase.from('dispatch_events').insert({
            client_id: result.event.client_id,
            event_type: result.event.event_type,
            details: result.event.details,
            tasks_affected: result.event.tasks_affected,
            workers_affected: result.event.workers_affected,
          });
        }
      }
    } catch (err) {
      console.error('[dispatch/rules] Rule execution failed:', err);
      // Non-fatal — don't block SMS processing
    }
  }

  // ── Process: parse event → find template → render message ───────────
  const templates = config.templates.length > 0 ? config.templates : DEFAULT_TEMPLATES;
  const message = processWebhook(payload, templates);

  if (!message) {
    return NextResponse.json({
      status: 'skipped',
      reason: 'No matching template for this event',
    });
  }

  // ── Check sending hours (TCPA compliance) ───────────────────────────
  if (!isWithinSendingHours(config.sendingHoursStart, config.sendingHoursEnd, config.timezone)) {
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
