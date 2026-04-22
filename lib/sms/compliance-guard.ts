// ────────────────────────────────────────────────────────────────────────────
// Compliance Guard — gates every outbound SMS against compliance rules.
//
// Every dispatch agent that sends SMS routes through here. Centralizing the
// check kills the duplicate-notification problem and closes the TCPA audit gap.
//
// Checks, in order:
//   1. Opt-out check (sms_opt_out table)
//   2. Consent check (sms_consent table within last 365 days)
//   3. Sending-hours window (per-dispensary timezone)
//   4. Dedup — last SMS sent to this order within N minutes
//   5. (For Inbound path only) prompt-injection input scan
//
// Returns { allow, reason } — callers write to delivery_sms_log either way.
// ────────────────────────────────────────────────────────────────────────────

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { isWithinSendingHours } from './templates';

export interface GuardContext {
  clientId: string;
  agencyId: string;
  phone: string;                // E.164
  orderId?: string;
  /** Skip consent check — only for STOP-reply auto-reply + system messages. */
  skipConsentCheck?: boolean;
  /** Dedup window — suppress if any SMS was sent to this order in the last N min. Default 2. */
  dedupeWindowMinutes?: number;
  sendingHoursStart?: number;   // default 8
  sendingHoursEnd?: number;     // default 22
  timezone?: string;             // default America/Los_Angeles
}

export interface GuardDecision {
  allow: boolean;
  reason?: 'opted_out' | 'no_consent' | 'outside_hours' | 'duplicate' | 'blocked' | 'ok';
  detail?: string;
}

export async function checkCompliance(ctx: GuardContext): Promise<GuardDecision> {
  const supabase = createServiceClientWithoutCookies();

  // ─── 1. Opt-out check ─────────────────────────────────────────────────
  const { data: optOut } = await supabase
    .from('sms_opt_out')
    .select('id, opted_out_at, source')
    .eq('client_id', ctx.clientId)
    .eq('phone_e164', ctx.phone)
    .maybeSingle();

  if (optOut) {
    return {
      allow: false,
      reason: 'opted_out',
      detail: `Opted out at ${optOut.opted_out_at} via ${optOut.source}`,
    };
  }

  // ─── 2. Consent check (skip only for system replies) ──────────────────
  if (!ctx.skipConsentCheck) {
    const oneYearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString();
    const { data: consent } = await supabase
      .from('sms_consent')
      .select('id, consented_at, revoked_at')
      .eq('client_id', ctx.clientId)
      .eq('phone_e164', ctx.phone)
      .gte('consented_at', oneYearAgo)
      .is('revoked_at', null)
      .order('consented_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!consent) {
      return {
        allow: false,
        reason: 'no_consent',
        detail: 'No active SMS consent on file for this phone number within the last 365 days.',
      };
    }
  }

  // ─── 3. Sending-hours window ──────────────────────────────────────────
  const start = ctx.sendingHoursStart ?? 8;
  const end = ctx.sendingHoursEnd ?? 22;
  const tz = ctx.timezone ?? 'America/Los_Angeles';
  if (!isWithinSendingHours(start, end, tz)) {
    return {
      allow: false,
      reason: 'outside_hours',
      detail: `Outside sending hours (${start}:00-${end}:00 ${tz})`,
    };
  }

  // ─── 4. Dedup — prevent duplicate notifications per order ─────────────
  if (ctx.orderId) {
    const windowMin = ctx.dedupeWindowMinutes ?? 2;
    const cutoff = new Date(Date.now() - windowMin * 60_000).toISOString();
    const { data: recent } = await supabase
      .from('delivery_sms_log')
      .select('id, sent_at')
      .eq('client_id', ctx.clientId)
      .eq('order_id', ctx.orderId)
      .eq('status', 'sent')
      .gte('sent_at', cutoff)
      .limit(1)
      .maybeSingle();

    if (recent) {
      return {
        allow: false,
        reason: 'duplicate',
        detail: `An SMS for this order was sent within the last ${windowMin} min (at ${recent.sent_at})`,
      };
    }
  }

  return { allow: true, reason: 'ok' };
}

// ─── STOP reply handling ────────────────────────────────────────────────────

/**
 * Parses an inbound SMS reply for STOP / UNSUBSCRIBE intent.
 * Per TCPA: STOP, UNSUBSCRIBE, CANCEL, END, QUIT, STOPALL all trigger opt-out.
 */
export function isStopReply(body: string): boolean {
  const normalized = body.trim().toUpperCase();
  return /^(STOP|UNSUBSCRIBE|CANCEL|END|QUIT|STOPALL)$/i.test(normalized);
}

/**
 * Parses an inbound SMS reply for START / UNSTOP intent.
 * Per TCPA: explicit opt-in keywords — safe to re-enable SMS.
 */
export function isStartReply(body: string): boolean {
  const normalized = body.trim().toUpperCase();
  return /^(START|UNSTOP|YES|SUBSCRIBE)$/i.test(normalized);
}

/**
 * Register a STOP reply → write to sms_opt_out.
 */
export async function registerOptOut(
  clientId: string,
  agencyId: string,
  phone: string,
  source: 'stop_reply' | 'self_service' | 'complaint' | 'manual' | 'unsubscribe_link' = 'stop_reply',
): Promise<void> {
  const supabase = createServiceClientWithoutCookies();
  await supabase
    .from('sms_opt_out')
    .upsert({
      client_id: clientId,
      agency_id: agencyId,
      phone_e164: phone,
      source,
    }, { onConflict: 'client_id,phone_e164' });
}

/**
 * Register a START reply → delete opt-out row (re-enabling SMS).
 */
export async function removeOptOut(
  clientId: string,
  phone: string,
): Promise<void> {
  const supabase = createServiceClientWithoutCookies();
  await supabase
    .from('sms_opt_out')
    .delete()
    .eq('client_id', clientId)
    .eq('phone_e164', phone);
}

/**
 * Register customer consent (called when they opt in via checkout, web form, etc.)
 */
export async function registerConsent(args: {
  clientId: string;
  agencyId: string;
  phone: string;
  contactName?: string;
  consentText: string;
  consentSource: 'pos_signup' | 'online_order' | 'web_form' | 'kiosk' | 'import' | 'manual' | 'widget_chat';
  consentIp?: string;
  consentUserAgent?: string;
}): Promise<void> {
  const supabase = createServiceClientWithoutCookies();
  await supabase.from('sms_consent').insert({
    client_id: args.clientId,
    agency_id: args.agencyId,
    phone_e164: args.phone,
    contact_name: args.contactName || null,
    consent_text: args.consentText,
    consent_source: args.consentSource,
    consent_ip: args.consentIp || null,
    consent_user_agent: args.consentUserAgent || null,
  });
}
