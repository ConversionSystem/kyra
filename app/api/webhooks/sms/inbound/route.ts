// ────────────────────────────────────────────────────────────────────────────
// Inbound SMS Webhook — Customer replies route into the Inbound Customer Agent.
//
// Providers: Springbig (primary for Purple Lotus) or Blackleaf (fallback).
// Both send different payload shapes — we adapt and extract canonical fields.
//
// Flow per message:
//   1. Parse provider-specific payload → { from, body, messageId, [dispensary_id] }
//   2. Lookup dispensary by ?client_id=<uuid> OR by destination phone → container_config.inbound_phone
//   3. STOP → registerOptOut + auto-reply (skipConsentCheck=true) + 200
//   4. START → removeOptOut + auto-reply + 200
//   5. analyzeInput → if blocked, return deflect reply, log 'blocked', 200
//   6. checkRateLimit(phone) → if exceeded, return cooldown reply, 200
//   7. Run inbound_customer agent (tool-restricted Haiku)
//   8. scanOutput(reply) → use sanitized version if leaks detected
//   9. Log inbound + outbound to conversations table
//  10. Return 200 to webhook caller
//
// Principle: ALWAYS return 200 unless the payload is unparseable. A 4xx/5xx
// from our side makes the SMS provider retry, which doubles customer texts.
// ────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { runInboundCustomer } from '@/lib/agents/inbound-customer';
import { OnfleetClient } from '@/lib/onfleet/client';
import {
  isStopReply,
  isStartReply,
  registerOptOut,
  removeOptOut,
  checkCompliance,
} from '@/lib/sms/compliance-guard';
import { createProvider, logDeliverySms } from '@/lib/sms';
import {
  analyzeInput,
  buildSecurityReminder,
  checkRateLimit,
  scanOutput,
} from '@/lib/security/prompt-injection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── Canonical inbound shape ────────────────────────────────────────────────

interface CanonicalInbound {
  from: string;                  // E.164
  body: string;                  // raw text
  messageId: string;             // provider-assigned id
  dispensaryId?: string;         // from ?client_id= (preferred) or lookup
  toPhone?: string;              // destination phone for lookup fallback
  provider: 'springbig' | 'blackleaf' | 'unknown';
  receivedAt: string;            // ISO
}

// ─── Provider adapters ──────────────────────────────────────────────────────

/**
 * Springbig webhook shape (assumed — API is partner-restricted, no public contract):
 *   { "from": "+1555...", "to": "+1500...", "body": "text",
 *     "messageId": "sb-...", "receivedAt": "iso8601" }
 * Confirmed against Springbig's transactional docs available at onboarding.
 */
function parseSpringbig(raw: Record<string, unknown>, receivedAt: string): CanonicalInbound | null {
  const from = normalizePhone(raw.from);
  const body = raw.body ?? raw.text ?? raw.message;
  const messageId = raw.messageId ?? raw.id ?? raw.message_id;
  if (!from || typeof body !== 'string' || !messageId) return null;
  return {
    from,
    body,
    messageId: String(messageId),
    toPhone: normalizePhone(raw.to),
    provider: 'springbig',
    receivedAt,
  };
}

/**
 * Blackleaf webhook shape (from their published API):
 *   { "phone": "+1555...", "message": "text", "id": "bl-...",
 *     "timestamp": "iso8601", "destination": "+1500..." (optional) }
 */
function parseBlackleaf(raw: Record<string, unknown>, receivedAt: string): CanonicalInbound | null {
  const from = normalizePhone(raw.phone ?? raw.from);
  const body = raw.message ?? raw.body;
  const messageId = raw.id ?? raw.messageId;
  if (!from || typeof body !== 'string' || !messageId) return null;
  return {
    from,
    body,
    messageId: String(messageId),
    toPhone: normalizePhone(raw.destination ?? raw.to),
    provider: 'blackleaf',
    receivedAt,
  };
}

/** Try both adapters; first one that returns a canonical shape wins. */
function adaptPayload(raw: Record<string, unknown>, receivedAt: string): CanonicalInbound | null {
  return parseSpringbig(raw, receivedAt) || parseBlackleaf(raw, receivedAt);
}

function normalizePhone(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  // Pass-through — providers should already send E.164. We don't try to guess.
  return trimmed.startsWith('+') ? trimmed : `+${trimmed.replace(/\D/g, '')}`;
}

// ─── POST handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const receivedAt = new Date().toISOString();
  const supabase = createServiceClientWithoutCookies();

  // Parse body
  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const clientIdFromQuery = searchParams.get('client_id') || undefined;

  // Adapt payload
  const canonical = adaptPayload(raw, receivedAt);
  if (!canonical) {
    // Unknown payload — log for debugging, return 400 (so the provider surfaces it).
    try {
      await supabase.from('dispatch_events').insert({
        client_id: clientIdFromQuery || null,
        event_type: 'inbound_sms_unparseable',
        details: { raw, query_client_id: clientIdFromQuery },
        tasks_affected: 0,
        workers_affected: 0,
      });
    } catch {
      // dispatch_events insert may fail if client_id is required and we don't have one
    }
    return NextResponse.json({ ok: false, error: 'unknown_payload_shape' }, { status: 400 });
  }

  // Prefer query client_id, fall back to phone-number lookup.
  canonical.dispensaryId = clientIdFromQuery;

  const dispensary = await resolveDispensary(canonical);
  if (!dispensary) {
    try {
      await supabase.from('dispatch_events').insert({
        client_id: null,
        event_type: 'inbound_sms_no_dispensary',
        details: { canonical, query_client_id: clientIdFromQuery },
        tasks_affected: 0,
        workers_affected: 0,
      });
    } catch {}
    // Return 200 — no dispensary match means we shouldn't retry. Swallow quietly.
    return NextResponse.json({ ok: true, status: 'no_dispensary_match' });
  }

  const { clientId, agencyId, businessName, smsConfig, onfleetApiKey } = dispensary;

  // Buffer the inbound body so we can log the pair (inbound ↔ outbound) once
  // we know what the reply will be. Kyra's `client_conversations` is pair-shaped.
  const inboundBody = canonical.body;

  // ─── STOP reply path ──────────────────────────────────────────────────
  if (isStopReply(canonical.body)) {
    await registerOptOut(clientId, agencyId, canonical.from, 'stop_reply');
    const reply = "You've been unsubscribed. Text START to resubscribe.";
    await sendSystemReply({
      clientId, agencyId, smsConfig, to: canonical.from, body: reply,
      receivedAt, skipConsentCheck: true,
    });
    await logConversation(supabase, {
      clientId, agencyId, userMessage: inboundBody, aiResponse: reply,
    });
    await recordAgentInvocation(supabase, {
      clientId, agencyId, outcome: 'success', triggerRef: canonical.messageId,
      reasoning: 'STOP reply — opted out',
    });
    return NextResponse.json({ ok: true, status: 'opted_out' });
  }

  // ─── START reply path ─────────────────────────────────────────────────
  if (isStartReply(canonical.body)) {
    await removeOptOut(clientId, canonical.from);
    const reply = "You're resubscribed. Reply STOP anytime to opt out.";
    await sendSystemReply({
      clientId, agencyId, smsConfig, to: canonical.from, body: reply,
      receivedAt, skipConsentCheck: true,
    });
    await logConversation(supabase, {
      clientId, agencyId, userMessage: inboundBody, aiResponse: reply,
    });
    await recordAgentInvocation(supabase, {
      clientId, agencyId, outcome: 'success', triggerRef: canonical.messageId,
      reasoning: 'START reply — resubscribed',
    });
    return NextResponse.json({ ok: true, status: 'resubscribed' });
  }

  // ─── Prompt-injection analysis (defense layer 1) ──────────────────────
  const analysis = analyzeInput(canonical.body);

  if (analysis.blocked) {
    const deflect = analysis.blockReply || "I'm here to help with your order. What can I check for you?";
    await sendSystemReply({
      clientId, agencyId, smsConfig, to: canonical.from, body: deflect, receivedAt,
    });
    await logConversation(supabase, {
      clientId, agencyId, userMessage: inboundBody, aiResponse: deflect,
    });
    await recordAgentInvocation(supabase, {
      clientId, agencyId, outcome: 'blocked', triggerRef: canonical.messageId,
      reasoning: `injection:${analysis.patterns.join(',')}`,
      metadata: { risk: analysis.risk, score: analysis.score, patterns: analysis.patterns },
    });
    return NextResponse.json({ ok: true, status: 'blocked', risk: analysis.risk });
  }

  // ─── Rate limit (defense layer 2) ─────────────────────────────────────
  const rate = checkRateLimit(canonical.from, analysis.risk);
  if (!rate.allowed && rate.reply) {
    await sendSystemReply({
      clientId, agencyId, smsConfig, to: canonical.from, body: rate.reply, receivedAt,
    });
    await logConversation(supabase, {
      clientId, agencyId, userMessage: inboundBody, aiResponse: rate.reply,
    });
    await recordAgentInvocation(supabase, {
      clientId, agencyId, outcome: 'blocked', triggerRef: canonical.messageId,
      reasoning: 'rate_limited',
    });
    return NextResponse.json({ ok: true, status: 'rate_limited' });
  }

  // ─── Pre-agent compliance check — if opted out, short-circuit ─────────
  // checkCompliance handles the opt-out table. If this phone is opted out we
  // MUST NOT call the LLM (saves spend + avoids sending to an opted-out number).
  const preCheck = await checkCompliance({
    clientId, agencyId,
    phone: canonical.from,
    skipConsentCheck: true,  // they texted us — implicit consent for the reply
  });

  if (!preCheck.allow && preCheck.reason === 'opted_out') {
    await logConversation(supabase, {
      clientId, agencyId, userMessage: inboundBody, aiResponse: '',
    });
    await recordAgentInvocation(supabase, {
      clientId, agencyId, outcome: 'blocked', triggerRef: canonical.messageId,
      reasoning: `compliance:${preCheck.reason}`,
    });
    return NextResponse.json({ ok: true, status: 'opted_out_no_reply' });
  }

  // ─── Load customer context ────────────────────────────────────────────
  const { memorySummary, recentOrderSummary } = await loadCustomerContext(
    supabase, clientId, canonical.from,
  );

  // ─── Run the agent ────────────────────────────────────────────────────
  if (!onfleetApiKey) {
    // Can't instantiate tools without Onfleet — escalate manually.
    await recordAgentInvocation(supabase, {
      clientId, agencyId, outcome: 'error', triggerRef: canonical.messageId,
      reasoning: 'missing_onfleet_api_key',
    });
    return NextResponse.json({ ok: true, status: 'not_configured' });
  }

  const onfleet = new OnfleetClient(onfleetApiKey);

  // sendSms hook routes through checkCompliance (full check — consent enforced for
  // agent-generated replies; the user's inbound gives us an implicit session but
  // the reply is technically us-initiated content).
  const sendSms = async (to: string, body: string, orderId?: string) => {
    const decision = await checkCompliance({
      clientId, agencyId, phone: to, orderId,
      skipConsentCheck: true,   // inbound conversation = transactional reply
      sendingHoursStart: smsConfig.sendingHoursStart,
      sendingHoursEnd: smsConfig.sendingHoursEnd,
      timezone: smsConfig.timezone,
    });
    if (!decision.allow) {
      return { success: false, error: `compliance_${decision.reason}: ${decision.detail || ''}`.trim() };
    }
    return sendOutboundSms({
      clientId, smsConfig, to, body, orderId, receivedAt,
    });
  };

  const result = await runInboundCustomer({
    clientId,
    agencyId,
    businessName,
    customerPhone: canonical.from,
    safeCustomerMessage: analysis.sanitized, // already wrapped in <customer_message>
    systemPromptAddition: buildSecurityReminder(analysis.risk),
    recentOrderSummary,
    customerMemorySummary: memorySummary,
    onfleet,
    sendSms,
    triggerRef: canonical.messageId,
  });

  // ─── Output scan (defense layer 3) ────────────────────────────────────
  const scan = scanOutput(result.text || '');

  // The agent typically sends via send_customer_sms (tool), so result.text is
  // often the model's reasoning trail. Still scan it + log metadata.
  // If scan flagged leaks AND the agent produced a direct-text reply (no tool
  // call path was taken), we log the sanitized version. In practice, output
  // leaves through sendSms which already ran.
  try {
    await supabase.from('agent_invocations').update({
      reasoning_summary: (scan.safe ? result.text : scan.sanitizedOutput)?.slice(0, 500) ?? null,
      error_detail: scan.safe ? null : `output_leaks:${scan.leaks.join(',')}`,
    })
      .eq('client_id', clientId)
      .eq('trigger_ref', canonical.messageId)
      .order('created_at', { ascending: false })
      .limit(1);
  } catch {
    // best-effort — the runAgent layer already wrote a row
  }

  // ─── Log the exchange to client_conversations ────────────────────────
  // Reconstruct the outbound body:
  //   - If model used send_customer_sms tool, the body was the tool's `body` input.
  //   - Else fall back to model's final text (output-scanned).
  //   - If neither produced anything, log with empty ai_response so Nick still
  //     sees the inbound turn in the thread view.
  const sendToolCall = result.toolCalls.find((c) => c.name === 'send_customer_sms');
  const sentBody = sendToolCall
    ? String((sendToolCall.input as Record<string, unknown>)?.body ?? '')
    : '';
  const outboundText = scan.safe ? result.text : scan.sanitizedOutput;
  const aiResponse = sentBody
    || (outboundText ? `[agent draft, not sent] ${outboundText}` : '');

  await logConversation(supabase, {
    clientId, agencyId, userMessage: inboundBody, aiResponse,
  });

  return NextResponse.json({
    ok: true,
    status: result.outcome,
    toolCalls: result.toolCalls.map((c) => c.name),
    injectionRisk: analysis.risk,
    outputSafe: scan.safe,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

interface DispensaryContext {
  clientId: string;
  agencyId: string;
  businessName: string;
  smsConfig: {
    provider: 'springbig' | 'blackleaf' | 'mock';
    providerApiUrl: string;
    providerApiKey: string;
    sendingHoursStart: number;
    sendingHoursEnd: number;
    timezone: string;
  };
  onfleetApiKey?: string;
}

async function resolveDispensary(canonical: CanonicalInbound): Promise<DispensaryContext | null> {
  const supabase = createServiceClientWithoutCookies();

  // Path 1: explicit client_id in query string (preferred)
  if (canonical.dispensaryId) {
    const { data } = await supabase
      .from('agency_clients')
      .select('id, agency_id, name, settings, container_config')
      .eq('id', canonical.dispensaryId)
      .maybeSingle();
    if (data) return buildContext(data);
  }

  // Path 2: lookup by destination phone → container_config.inbound_phone
  if (canonical.toPhone) {
    const { data } = await supabase
      .from('agency_clients')
      .select('id, agency_id, name, settings, container_config')
      .eq('container_config->>inbound_phone', canonical.toPhone)
      .maybeSingle();
    if (data) return buildContext(data);
  }

  return null;
}

function buildContext(row: Record<string, unknown>): DispensaryContext {
  const settings = (row.settings || {}) as Record<string, unknown>;
  const sms = (settings.sms || {}) as Record<string, unknown>;
  const containerConfig = (row.container_config || {}) as Record<string, unknown>;
  return {
    clientId: String(row.id),
    agencyId: String(row.agency_id || ''),
    businessName: String(row.name || 'Our Team'),
    smsConfig: {
      provider: (sms.provider as 'springbig' | 'blackleaf' | 'mock') || 'mock',
      providerApiUrl: String(sms.providerApiUrl || ''),
      providerApiKey: String(sms.providerApiKey || ''),
      sendingHoursStart: Number(sms.sendingHoursStart ?? 8),
      sendingHoursEnd: Number(sms.sendingHoursEnd ?? 22),
      timezone: String(sms.timezone || 'America/Los_Angeles'),
    },
    onfleetApiKey: containerConfig.onfleet_api_key as string | undefined,
  };
}

/** Direct provider send, no compliance check (used for STOP/START auto-replies). */
async function sendSystemReply(args: {
  clientId: string;
  agencyId: string;
  smsConfig: DispensaryContext['smsConfig'];
  to: string;
  body: string;
  receivedAt: string;
  skipConsentCheck?: boolean;
}): Promise<void> {
  // For STOP/START and block deflection, skipConsentCheck=true lets us bypass
  // consent (system messages are transactional / legally required).
  if (!args.skipConsentCheck) {
    const decision = await checkCompliance({
      clientId: args.clientId, agencyId: args.agencyId, phone: args.to,
      skipConsentCheck: true,
      sendingHoursStart: args.smsConfig.sendingHoursStart,
      sendingHoursEnd: args.smsConfig.sendingHoursEnd,
      timezone: args.smsConfig.timezone,
    });
    if (!decision.allow) return;
  }
  await sendOutboundSms({
    clientId: args.clientId,
    smsConfig: args.smsConfig,
    to: args.to,
    body: args.body,
    receivedAt: args.receivedAt,
  });
}

async function sendOutboundSms(args: {
  clientId: string;
  smsConfig: DispensaryContext['smsConfig'];
  to: string;
  body: string;
  orderId?: string;
  receivedAt: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const provider = createProvider({
      provider: args.smsConfig.provider,
      apiUrl: args.smsConfig.providerApiUrl,
      apiKey: args.smsConfig.providerApiKey,
    });

    const result = await provider.sendMessage({
      to: args.to,
      body: args.body,
      templateId: 'ai-inbound-customer',
      event: 'taskStarted',   // no direct Onfleet event for inbound replies; safe default
      orderId: args.orderId || '',
    });

    await logDeliverySms({
      id: crypto.randomUUID(),
      clientId: args.clientId,
      orderId: args.orderId || '',
      event: 'taskStarted',
      templateId: 'ai-inbound-customer',
      customerPhone: args.to,
      customerName: '',
      driverName: '',
      messageBody: args.body,
      provider: result.provider,
      providerMessageId: result.messageId,
      status: result.success ? 'sent' : 'failed',
      error: result.error,
      sentAt: result.timestamp,
      webhookReceivedAt: args.receivedAt,
    });

    return { success: result.success, messageId: result.messageId, error: result.error };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function loadCustomerContext(
  supabase: ReturnType<typeof createServiceClientWithoutCookies>,
  clientId: string,
  phone: string,
): Promise<{ memorySummary?: string; recentOrderSummary?: string }> {
  const out: { memorySummary?: string; recentOrderSummary?: string } = {};

  try {
    const { data: contact } = await supabase
      .from('crm_contacts')
      .select('id, first_name, last_name')
      .eq('client_id', clientId)
      .eq('phone', phone)
      .maybeSingle();

    if (contact) {
      const { data: memory } = await supabase
        .from('customer_memory')
        .select('tags, facts, sentiment, lifetime_value, total_interactions, last_contact')
        .eq('client_id', clientId)
        .eq('contact_id', contact.id)
        .maybeSingle();

      if (memory) {
        const parts: string[] = [];
        const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
        if (name) parts.push(`Name: ${name}`);
        if (memory.total_interactions) parts.push(`Prior interactions: ${memory.total_interactions}`);
        if (memory.sentiment) parts.push(`Sentiment: ${memory.sentiment}`);
        if (Array.isArray(memory.tags) && memory.tags.length) parts.push(`Tags: ${memory.tags.join(', ')}`);
        if (Array.isArray(memory.facts) && memory.facts.length) {
          const facts = memory.facts.slice(-3).map((f: Record<string, unknown>) => f.fact).filter(Boolean);
          if (facts.length) parts.push(`Facts: ${facts.join(' | ')}`);
        }
        if (parts.length) out.memorySummary = parts.join('\n');
      }
    }
  } catch {}

  try {
    const { data: recent } = await supabase
      .from('delivery_sms_log')
      .select('order_id, event, sent_at, driver_name')
      .eq('client_id', clientId)
      .eq('customer_phone', phone)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent) {
      const parts = [`Order: ${recent.order_id}`, `Last event: ${recent.event} at ${recent.sent_at}`];
      if (recent.driver_name) parts.push(`Driver: ${recent.driver_name}`);
      out.recentOrderSummary = parts.join('\n');
    }
  } catch {}

  return out;
}

/**
 * Log one inbound↔outbound exchange to Kyra's `client_conversations` table.
 * Schema is pair-shaped — one row = one exchange — matching the existing
 * GHL poller pattern. Nick sees the unified thread view in the dashboard.
 *
 * If the exchange had no outbound (e.g. opted-out short-circuit), pass an
 * empty `aiResponse` — Kyra's schema requires the column but NOT a non-empty
 * value. Safer than leaving a dangling inbound-only row.
 */
async function logConversation(
  supabase: ReturnType<typeof createServiceClientWithoutCookies>,
  args: {
    clientId: string;
    agencyId: string;
    userMessage: string;      // inbound body
    aiResponse: string;        // outbound body (may be empty for no-reply paths)
    channel?: 'sms' | 'whatsapp' | 'portal' | 'web_chat' | 'test_chat' | 'telegram';
  },
): Promise<void> {
  try {
    await supabase.from('client_conversations').insert({
      client_id: args.clientId,
      agency_id: args.agencyId,
      channel: args.channel || 'sms',
      user_message: args.userMessage,
      ai_response: args.aiResponse,
    });
  } catch (err) {
    // Best-effort — webhook should not fail if logging fails.
    console.warn('[inbound-sms] client_conversations log failed:', err instanceof Error ? err.message : err);
  }
}

async function recordAgentInvocation(
  supabase: ReturnType<typeof createServiceClientWithoutCookies>,
  args: {
    clientId: string;
    agencyId: string;
    outcome: 'success' | 'blocked' | 'error' | 'fallback';
    triggerRef: string;
    reasoning: string;
    metadata?: Record<string, unknown>;
    /** Optional — if the LLM actually ran, pass its model ID. Defaults to
     * `'none'` for system paths (STOP/START/blocked/rate-limited) so the
     * NOT-NULL `model` column constraint is never violated (P0.8). */
    model?: string;
    latencyMs?: number;
  },
): Promise<void> {
  try {
    await supabase.from('agent_invocations').insert({
      client_id: args.clientId,
      agency_id: args.agencyId,
      agent: 'inbound_customer',
      trigger_type: 'inbound_sms',
      trigger_ref: args.triggerRef,
      model: args.model ?? 'none',
      outcome: args.outcome,
      reasoning_summary: args.reasoning,
      tool_calls: args.metadata ? [args.metadata] : [],
      latency_ms: args.latencyMs ?? 0,
    });
  } catch (err) {
    console.warn('[inbound-sms] agent_invocations log failed:', err instanceof Error ? err.message : err);
  }
}

// ─── GET — webhook validation probes ────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('challenge') || searchParams.get('check');
  if (challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  return NextResponse.json({ status: 'ok', service: 'kyra-inbound-sms' });
}
