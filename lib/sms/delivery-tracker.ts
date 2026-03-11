// ────────────────────────────────────────────────────────────────────────────
// Delivery SMS Tracker — Logs every SMS sent for audit + analytics
// Stores to Supabase `delivery_sms_log` table
// ────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import type { DeliveryLogEntry, OnfleetEventType } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[DeliveryTracker] Supabase not configured — logging disabled');
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

/** Log a sent (or failed) delivery SMS */
export async function logDeliverySms(entry: DeliveryLogEntry): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('delivery_sms_log').insert({
      id: entry.id,
      client_id: entry.clientId,
      order_id: entry.orderId,
      event: entry.event,
      template_id: entry.templateId,
      customer_phone: entry.customerPhone,
      customer_name: entry.customerName,
      driver_name: entry.driverName,
      message_body: entry.messageBody,
      provider: entry.provider,
      provider_message_id: entry.providerMessageId,
      status: entry.status,
      error: entry.error,
      sent_at: entry.sentAt,
      webhook_received_at: entry.webhookReceivedAt,
    });

    if (error) {
      console.error('[DeliveryTracker] Failed to log SMS:', error.message);
    }
  } catch (err) {
    console.error('[DeliveryTracker] Log error:', err);
  }
}

/** Get delivery timeline for a specific order */
export async function getOrderTimeline(
  clientId: string,
  orderId: string,
): Promise<DeliveryLogEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('delivery_sms_log')
    .select('*')
    .eq('client_id', clientId)
    .eq('order_id', orderId)
    .order('sent_at', { ascending: true });

  if (error) {
    console.error('[DeliveryTracker] Query error:', error.message);
    return [];
  }

  return (data || []).map(mapRow);
}

/** Get SMS stats for a client (last 30 days) */
export async function getSmsStats(clientId: string): Promise<{
  total: number;
  sent: number;
  failed: number;
  byEvent: Record<string, number>;
  byDriver: Record<string, number>;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { total: 0, sent: 0, failed: 0, byEvent: {}, byDriver: {} };
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data, error } = await supabase
    .from('delivery_sms_log')
    .select('status, event, driver_name')
    .eq('client_id', clientId)
    .gte('sent_at', thirtyDaysAgo);

  if (error || !data) {
    return { total: 0, sent: 0, failed: 0, byEvent: {}, byDriver: {} };
  }

  const stats = {
    total: data.length,
    sent: data.filter((r) => r.status === 'sent').length,
    failed: data.filter((r) => r.status === 'failed').length,
    byEvent: {} as Record<string, number>,
    byDriver: {} as Record<string, number>,
  };

  for (const row of data) {
    stats.byEvent[row.event] = (stats.byEvent[row.event] || 0) + 1;
    if (row.driver_name) {
      stats.byDriver[row.driver_name] = (stats.byDriver[row.driver_name] || 0) + 1;
    }
  }

  return stats;
}

/** Get recent delivery log entries */
export async function getRecentLog(
  clientId: string,
  limit = 50,
): Promise<DeliveryLogEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('delivery_sms_log')
    .select('*')
    .eq('client_id', clientId)
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data || []).map(mapRow);
}

function mapRow(row: Record<string, unknown>): DeliveryLogEntry {
  return {
    id: String(row.id || ''),
    clientId: String(row.client_id || ''),
    orderId: String(row.order_id || ''),
    event: String(row.event || '') as OnfleetEventType,
    templateId: String(row.template_id || ''),
    customerPhone: String(row.customer_phone || ''),
    customerName: String(row.customer_name || ''),
    driverName: String(row.driver_name || ''),
    messageBody: String(row.message_body || ''),
    provider: String(row.provider || ''),
    providerMessageId: row.provider_message_id ? String(row.provider_message_id) : undefined,
    status: String(row.status || 'sent') as 'sent' | 'failed' | 'queued',
    error: row.error ? String(row.error) : undefined,
    sentAt: String(row.sent_at || ''),
    webhookReceivedAt: String(row.webhook_received_at || ''),
  };
}
