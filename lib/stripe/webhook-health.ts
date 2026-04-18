// ============================================================================
// Stripe Webhook Health Monitor
//
// Checks Stripe webhook endpoint status + recent event delivery.
// Built after the Apr 18 incident where webhook was silently disabled,
// causing a customer's plan activation to fail.
//
// Usage:
//   import { getWebhookHealth } from '@/lib/stripe/webhook-health';
//   const health = await getWebhookHealth();
// ============================================================================

import { stripe } from './config';

// The primary webhook endpoint ID (from Stripe Dashboard)
const PRIMARY_WEBHOOK_ID = 'we_1TCcvQDr3LPJOIaMuaY1zJhG';

export interface WebhookHealthStatus {
  healthy: boolean;
  endpoint: {
    id: string;
    url: string;
    status: string; // 'enabled' | 'disabled'
    enabledEvents: string[];
  } | null;
  recentEvents: {
    total: number;
    succeeded: number;
    failed: number;
    pending: number;
    oldestChecked: string | null;
    newestChecked: string | null;
  };
  alerts: string[];
  checkedAt: string;
}

/**
 * Check Stripe webhook endpoint health by:
 * 1. Fetching the webhook endpoint config (is it enabled?)
 * 2. Fetching recent events to see if they're being delivered
 */
export async function getWebhookHealth(): Promise<WebhookHealthStatus> {
  if (!stripe) {
    return {
      healthy: false,
      endpoint: null,
      recentEvents: { total: 0, succeeded: 0, failed: 0, pending: 0, oldestChecked: null, newestChecked: null },
      alerts: ['Stripe not configured'],
      checkedAt: new Date().toISOString(),
    };
  }

  const alerts: string[] = [];
  let endpointData: WebhookHealthStatus['endpoint'] = null;

  // 1. Check webhook endpoint status
  try {
    const endpoint = await stripe.webhookEndpoints.retrieve(PRIMARY_WEBHOOK_ID);
    endpointData = {
      id: endpoint.id,
      url: endpoint.url,
      status: endpoint.status ?? 'unknown',
      enabledEvents: endpoint.enabled_events ?? [],
    };

    if (endpoint.status !== 'enabled') {
      alerts.push(`⚠️ Webhook endpoint is ${endpoint.status?.toUpperCase()} — events will NOT be delivered!`);
    }

    // Check required events are registered
    const requiredEvents = [
      'checkout.session.completed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_failed',
      'invoice.payment_succeeded',
    ];

    const missing = requiredEvents.filter(
      e => !endpoint.enabled_events?.includes(e) && !endpoint.enabled_events?.includes('*')
    );
    if (missing.length > 0) {
      alerts.push(`Missing events: ${missing.join(', ')}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    alerts.push(`Failed to fetch webhook endpoint: ${msg}`);
  }

  // 2. Check recent event deliveries (last 24h)
  const recentEvents = { total: 0, succeeded: 0, failed: 0, pending: 0, oldestChecked: null as string | null, newestChecked: null as string | null };

  try {
    // Get events from the last 24 hours
    const since = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const events = await stripe.events.list({
      created: { gte: since },
      limit: 100,
      types: [
        'checkout.session.completed',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_failed',
        'invoice.payment_succeeded',
      ],
    });

    recentEvents.total = events.data.length;

    if (events.data.length > 0) {
      recentEvents.newestChecked = new Date(events.data[0].created * 1000).toISOString();
      recentEvents.oldestChecked = new Date(events.data[events.data.length - 1].created * 1000).toISOString();

      // Check pending_webhooks on each event
      for (const evt of events.data) {
        if (evt.pending_webhooks === 0) {
          recentEvents.succeeded++;
        } else {
          recentEvents.pending++;
        }
      }
    }

    // If there are events but all have pending webhooks, that's a problem
    if (recentEvents.total > 0 && recentEvents.succeeded === 0) {
      alerts.push('All recent events have pending/undelivered webhooks!');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    alerts.push(`Failed to fetch recent events: ${msg}`);
  }

  return {
    healthy: alerts.length === 0,
    endpoint: endpointData,
    recentEvents,
    alerts,
    checkedAt: new Date().toISOString(),
  };
}
