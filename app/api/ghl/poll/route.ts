// ============================================================================
// GET /api/ghl/poll — Message Polling Endpoint
//
// Replaces webhook dependency. Polls GHL Conversations API for new inbound
// messages and processes them through AI. Called by Vercel Cron every minute.
//
// No webhooks needed. No GHL workflow needed. No marketplace approval needed.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { deductCredits } from '@/lib/billing/credit-engine';
import { getCreditsForModel } from '@/lib/billing/model-credits';
import { processWithSmartEngine } from '@/lib/ghl/smart-handler';
import { resolveClientGateway } from '@/lib/ovh/provisioner';
import type { AgencyClient } from '@/lib/agency/types';

// ── Pipeline Lead Context ──────────────────────────────────────────────────
// When a contact replies, check if they're a pipeline lead and inject context
interface PipelineContext {
  leadId: string;
  campaignName: string;
  stage: string;
  fullName: string;
  company: string;
  title: string;
  industry: string;
  valueProp: string;
  enrichment: {
    company_context?: string;
    services_offered?: string;
    likely_pain_points?: string;
    opportunity_angle?: string;
    icebreaker?: string;
  };
  personalizedOpener: string | null;
}

async function lookupPipelineLead(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  ghlContactId: string,
): Promise<PipelineContext | null> {
  try {
    const { data: lead } = await supabase
      .from('pipeline_leads')
      .select('id, full_name, company, title, industry, stage, enrichment_data, personalized_opener, campaign_id, pipeline_campaigns!inner(name, value_prop)')
      .eq('ghl_contact_id', ghlContactId)
      .limit(1)
      .single();

    if (!lead) return null;

    const row = lead as Record<string, unknown>;
    const campaign = row.pipeline_campaigns as Record<string, string> | undefined;
    return {
      leadId: row.id as string,
      campaignName: campaign?.name || '',
      stage: row.stage as string,
      fullName: (row.full_name as string) || '',
      company: (row.company as string) || '',
      title: (row.title as string) || '',
      industry: (row.industry as string) || '',
      valueProp: campaign?.value_prop || '',
      enrichment: (row.enrichment_data || {}) as PipelineContext['enrichment'],
      personalizedOpener: (row.personalized_opener as string) || null,
    };
  } catch {
    return null; // best-effort, never block the reply
  }
}

async function updatePipelineStage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  leadId: string,
  currentStage: string,
  aiResponse: string,
  customerMessage: string,
): Promise<void> {
  try {
    // Don't downgrade stages
    const stageOrder = ['found', 'researched', 'approved', 'messaged', 'replied', 'interested', 'booked', 'closed'];
    const currentIdx = stageOrder.indexOf(currentStage);

    // Detect intent signals from the conversation
    const combined = `${customerMessage}\n${aiResponse}`.toLowerCase();

    let newStage: string | null = null;

    // Booked detection
    const bookSignals = ['booked', 'scheduled', 'confirmed', 'looking forward to the demo', 'see you', 'appointment set', 'calendar'];
    if (bookSignals.some(s => combined.includes(s)) && stageOrder.indexOf('booked') > currentIdx) {
      newStage = 'booked';
    }
    // Interest detection
    else if (['interested', 'tell me more', 'sounds good', 'how does it work', 'pricing', 'how much', 'demo', 'show me', 'sign me up', 'let\'s talk'].some(s => combined.includes(s)) && stageOrder.indexOf('interested') > currentIdx) {
      newStage = 'interested';
    }
    // Basic reply detection (only upgrade from messaged)
    else if (currentStage === 'messaged') {
      newStage = 'replied';
    }

    if (newStage) {
      const updates: Record<string, unknown> = { stage: newStage };
      if (newStage === 'replied') updates.replied_at = new Date().toISOString();
      await supabase.from('pipeline_leads').update(updates).eq('id', leadId);
    }
  } catch {
    // best-effort
  }
}

// ── Knowledge Base Context ─────────────────────────────────────────────────
// Fetches enabled knowledge documents for a client + agency-wide docs.
// Injects relevant business knowledge (services, FAQ, pricing, hours) into the
// AI system prompt so workers actually know the business they represent.

const KNOWLEDGE_MAX_CHARS = 3000; // ~750 tokens — fits comfortably in context window

async function fetchKnowledgeContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  agencyId: string,
  clientId: string,
): Promise<string | null> {
  try {
    // Get enabled docs: client-specific + agency-wide (null client_id)
    const { data: docs } = await supabase
      .from('knowledge_documents')
      .select('title, content, client_id')
      .eq('agency_id', agencyId)
      .eq('enabled', true)
      .or(`client_id.eq.${clientId},client_id.is.null`)
      .order('client_id', { ascending: false, nullsFirst: false }) // client-specific first
      .order('created_at', { ascending: true });

    if (!docs?.length) return null;

    // Build condensed knowledge block, respecting token budget
    const sections: string[] = ['--- BUSINESS KNOWLEDGE ---'];
    let totalChars = sections[0].length;

    for (const doc of docs) {
      const title = (doc.title as string) || 'Untitled';
      const content = (doc.content as string) || '';
      // Trim to first meaningful chunk — skip empty/tiny docs
      const trimmed = content.trim();
      if (trimmed.length < 10) continue;

      const header = `[${title}]`;
      // Smart truncation: prefer complete paragraphs
      let body = trimmed;
      const remaining = KNOWLEDGE_MAX_CHARS - totalChars - header.length - 2;
      if (remaining <= 0) break; // budget exhausted
      if (body.length > remaining) {
        // Find last paragraph break within budget
        const cutPoint = body.lastIndexOf('\n\n', remaining);
        body = cutPoint > 100 ? body.slice(0, cutPoint) : body.slice(0, remaining);
        body += '…';
      }

      sections.push(header);
      sections.push(body);
      totalChars += header.length + body.length + 2;
    }

    if (sections.length <= 1) return null; // only header, no actual content

    sections.push('--- END KNOWLEDGE ---');
    sections.push('Use this knowledge to answer customer questions accurately. If a question isn\'t covered, say you\'ll check and follow up.');

    return sections.join('\n');
  } catch {
    return null; // best-effort, never block the reply
  }
}

// Vercel cron config — run every minute
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for processing

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-04-15';

// ── GHL Pipeline Automation ──────────────────────────────────────────────────
// After each AI reply, fire-and-forget CRM updates:
//   • Add relevant tags (e.g. "interested", "appointment-requested")
//   • Add a concise note to the contact record summarising the exchange
//   • Optionally move to a pipeline stage

interface CRMUpdate {
  tagsToAdd: string[];
  note: string;
  pipelineStageHint?: string; // 'new' | 'engaged' | 'qualified' | 'booked' | 'closed'
  needsHuman: boolean;
  escalationReason?: string; // why escalation was triggered
}

async function extractCRMUpdate(
  gatewayUrl: string,
  gatewayToken: string,
  conversation: Array<{ role: string; content: string }>,
): Promise<CRMUpdate | null> {
  try {
    const res = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        model: 'openrouter/anthropic/claude-haiku-4.5',
        messages: [
          {
            role: 'system',
            content: [
              'You are a CRM assistant. Analyse this SMS conversation and output ONLY valid JSON (no markdown).',
              'Schema: { "tagsToAdd": string[], "note": string, "pipelineStageHint": string | null, "needsHuman": boolean, "escalationReason": string | null }',
              'tagsToAdd: 1-3 short lowercase kebab-case tags describing intent (e.g. "appointment-requested", "price-inquiry", "not-interested", "hot-lead", "complaint").',
              'note: 1-2 sentence summary of what the customer wanted and outcome.',
              'pipelineStageHint: one of "new" | "engaged" | "qualified" | "booked" | "closed" | null.',
              'needsHuman: true if ANY of these: customer asks for a human/manager, expresses anger/frustration, has an urgent/unresolved issue the AI couldn\'t solve, or explicitly says they want to speak with someone.',
              'escalationReason: brief reason why human needed (1 sentence), or null.',
              'Output raw JSON only. No explanation. No markdown.',
            ].join('\n'),
          },
          ...conversation,
        ],
        stream: false,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || '';
    // Strip markdown code fences if present
    const clean = raw.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);
    return {
      tagsToAdd: Array.isArray(parsed.tagsToAdd) ? parsed.tagsToAdd.slice(0, 3) : [],
      note: typeof parsed.note === 'string' ? parsed.note.slice(0, 500) : '',
      pipelineStageHint: parsed.pipelineStageHint || null,
      needsHuman: !!parsed.needsHuman,
      escalationReason: typeof parsed.escalationReason === 'string' ? parsed.escalationReason : undefined,
    };
  } catch {
    return null;
  }
}

async function applyGHLCRMUpdates(
  contactId: string,
  token: string,
  update: CRMUpdate,
  addLog: (msg: string) => void,
): Promise<void> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Version: GHL_API_VERSION,
    'Content-Type': 'application/json',
  };

  // 1. Build final tag list (include escalation tag if needed)
  const allTags = [...update.tagsToAdd];
  if (update.needsHuman) {
    allTags.push('needs-human', 'kyra-escalated');
  }

  if (allTags.length > 0) {
    try {
      const tagRes = await fetch(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tags: allTags }),
        signal: AbortSignal.timeout(5_000),
      });
      if (tagRes.ok) {
        addLog(`    🏷️ Tags added: [${allTags.join(', ')}]`);
      }
    } catch { /* best-effort */ }
  }

  // 2. Add note (escalation gets a priority prefix)
  const noteBody = update.needsHuman && update.escalationReason
    ? `[Kyra AI 🚨 ESCALATION] ${update.escalationReason}\n\nConversation summary: ${update.note}`
    : `[Kyra AI] ${update.note}`;

  if (update.note || update.needsHuman) {
    try {
      const noteRes = await fetch(`${GHL_API_BASE}/contacts/${contactId}/notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ body: noteBody }),
        signal: AbortSignal.timeout(5_000),
      });
      if (noteRes.ok) {
        addLog(`    📝 Note added${update.needsHuman ? ' 🚨' : ''}`);
      }
    } catch { /* best-effort */ }
  }
}

async function sendEscalationAlert(opts: {
  agencyName: string;
  clientName: string;
  contactName: string;
  contactPhone: string;
  reason: string;
  conversationSummary: string;
  notifyEmail: string;
}): Promise<void> {
  if (!opts.notifyEmail) return;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#ef4444;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">🚨 Kyra AI Escalation Alert</h2>
      </div>
      <div style="border:1px solid #fca5a5;border-top:none;padding:20px;border-radius:0 0 8px 8px">
        <p><strong>Client AI:</strong> ${opts.clientName}</p>
        <p><strong>Contact:</strong> ${opts.contactName} (${opts.contactPhone})</p>
        <p><strong>Reason:</strong> ${opts.reason}</p>
        <hr style="border-color:#fee2e2"/>
        <p><strong>Conversation summary:</strong><br/>${opts.conversationSummary}</p>
        <hr style="border-color:#fee2e2"/>
        <p style="color:#6b7280;font-size:12px">
          This contact has been tagged <em>needs-human</em> in GHL.<br/>
          Sent by Kyra AI (${opts.agencyName})
        </p>
      </div>
    </div>`;

  const { sendPlatformEmail } = await import('@/lib/email/ghl-platform-sender');
  await sendPlatformEmail({
    to: opts.notifyEmail,
    subject: `🚨 ${opts.clientName}: ${opts.contactName} needs a human`,
    html,
    fromName: 'Kyra AI Alerts',
  }).catch(() => {});
}

// ── GHL Contact Context ───────────────────────────────────────────────────────
// Fetches the contact's CRM profile so the AI knows who it's talking to.

interface GHLContactContext {
  fullName: string;
  email?: string;
  tags: string[];
  notes: string;
  pipelineStage?: string;
  source?: string;
  customContext: string; // formatted string ready for injection
}

async function fetchGHLContactContext(
  contactId: string,
  token: string,
): Promise<GHLContactContext | null> {
  try {
    const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_API_VERSION,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const { contact } = await res.json();
    if (!contact) return null;

    const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown';
    const email = contact.email || undefined;
    const tags: string[] = contact.tags || [];
    const source = contact.source || undefined;

    // Pull notes (may be a string or array)
    let notes = '';
    if (contact.notes) {
      if (Array.isArray(contact.notes)) {
        notes = contact.notes
          .slice(0, 3)
          .map((n: any) => (typeof n === 'string' ? n : n.body || n.text || ''))
          .filter(Boolean)
          .join('; ');
      } else if (typeof contact.notes === 'string') {
        notes = contact.notes.slice(0, 300);
      }
    }

    // Pipeline stage from opportunities (if present)
    let pipelineStage: string | undefined;
    if (contact.opportunities?.length) {
      pipelineStage = contact.opportunities[0]?.pipelineStage || contact.opportunities[0]?.status;
    }

    // Build the formatted context string
    const lines: string[] = [];
    lines.push(`--- CRM Context ---`);
    lines.push(`Contact: ${fullName}`);
    if (email) lines.push(`Email: ${email}`);
    if (tags.length) lines.push(`Tags: ${tags.join(', ')}`);
    if (pipelineStage) lines.push(`Pipeline: ${pipelineStage}`);
    if (source) lines.push(`Source: ${source}`);
    if (notes) lines.push(`Notes: ${notes}`);
    lines.push(`-------------------`);

    return {
      fullName,
      email,
      tags,
      notes,
      pipelineStage,
      source,
      customContext: lines.join('\n'),
    };
  } catch {
    return null;
  }
}

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const log: string[] = [];
  const addLog = (msg: string) => { log.push(`[${Date.now() - startTime}ms] ${msg}`); console.log(`[ghl/poll] ${msg}`); };

  // ── Auth ─────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.replace('Bearer ', '');
  const isAuthorized =
    (bearerToken && process.env.KYRA_API_SECRET && bearerToken === process.env.KYRA_API_SECRET) ||
    (bearerToken && process.env.CRON_SECRET && bearerToken === process.env.CRON_SECRET);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  addLog('Authorized. Starting poll...');

  // ── Quiet Hours: Skip polling 11pm–7am UTC to save API costs ──
  // Most businesses don't receive customer messages during these hours.
  // This alone saves ~33% of polling costs (~$145/month).
  const currentHourUTC = new Date().getUTCHours();
  const QUIET_START = 23; // 11pm UTC
  const QUIET_END = 7;    // 7am UTC
  const isQuietHour = currentHourUTC >= QUIET_START || currentHourUTC < QUIET_END;
  if (isQuietHour) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'quiet_hours',
      message: `Quiet hours (${QUIET_START}:00-${QUIET_END}:00 UTC). Polling resumes at ${QUIET_END}:00 UTC.`,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // Step 1: Get clients
    addLog('Querying Supabase for GHL-connected clients...');
    const supabase = getSupabase();
    const { data: clients, error: dbError } = await supabase
      .from('agency_clients')
      .select('id, name, status, ghl_location_id, ghl_private_token, ghl_access_token, agency_id, container_config, ghl_last_contact_scan, ai_model')
      .in('status', ['active', 'setup'])
      .or('ghl_access_token.not.is.null,ghl_private_token.not.is.null');

    if (dbError || !clients?.length) {
      addLog(`No clients found (error: ${dbError?.message || 'none'})`);
      return NextResponse.json({ ok: true, log, clients: 0 });
    }
    addLog(`Found ${clients.length} clients`);

    let totalProcessed = 0;
    const errors: string[] = [];

    for (const client of clients) {
      // Time guard
      if (Date.now() - startTime > 45_000) {
        addLog('Time budget hit — stopping');
        break;
      }

      const token = client.ghl_private_token || client.ghl_access_token;
      if (!token || !client.ghl_location_id) {
        addLog(`Skipping "${client.name}": missing token or location`);
        continue;
      }

      addLog(`Processing "${client.name}" (location: ${client.ghl_location_id})...`);

      // Step 2: Search GHL for unread inbound
      let conversations: any[];
      try {
        const ghlRes = await fetch(
          `${GHL_API_BASE}/conversations/search?locationId=${client.ghl_location_id}&limit=10`,
          {
            headers: { Authorization: `Bearer ${token}`, Version: GHL_API_VERSION },
            signal: AbortSignal.timeout(10_000),
          }
        );
        if (!ghlRes.ok) {
          addLog(`  GHL search failed: ${ghlRes.status}`);
          errors.push(`${client.name}: GHL ${ghlRes.status}`);
          continue;
        }
        const ghlData = await ghlRes.json();
        conversations = (ghlData.conversations || []).filter(
          (c: any) => c.lastMessageDirection === 'inbound' && (c.unreadCount || 0) > 0
        );
        addLog(`  ${conversations.length} unread inbound conversations`);
      } catch (err: any) {
        addLog(`  GHL search error: ${err.message}`);
        errors.push(`${client.name}: ${err.message}`);
        continue;
      }

      // Step 3: Resolve the client's own gateway (OVH per-client isolation)
      const resolved = await resolveClientGateway(client.id);
      if (!resolved) {
        addLog(`  No gateway for client ${client.id}`);
        continue;
      }
      const gatewayUrl = resolved.url;
      const gateway = { gateway_url: resolved.url, gateway_token: resolved.token, gateway_status: 'running' };

      // Step 4: Process up to 3 unread conversations per client
      const MAX_CONVS = 3;
      const toProcess = conversations.slice(0, MAX_CONVS);
      if (!toProcess.length) continue;

      for (const conv of toProcess) {
        // Time guard per conversation
        if (Date.now() - startTime > 45_000) {
          addLog(`  ⏱️ Time budget hit — stopping`);
          break;
        }

        addLog(`  Processing conv with ${conv.contactName || conv.phone || 'unknown'}...`);

        // Get messages
        let latestInbound: any = null;
        let hasReply = false;
        let isFirstContact = false;
        let messages: any[] = [];
        try {
          const msgRes = await fetch(
            `${GHL_API_BASE}/conversations/${conv.id}/messages?limit=5`,
            {
              headers: { Authorization: `Bearer ${token}`, Version: GHL_API_VERSION },
              signal: AbortSignal.timeout(10_000),
            }
          );
          if (!msgRes.ok) {
            addLog(`    Get messages failed: ${msgRes.status}`);
            continue;
          }
          const msgData = await msgRes.json();
          messages = msgData.messages?.messages || [];

          latestInbound = messages.find((m: any) => m.direction === 'inbound');
          if (!latestInbound?.body?.trim()) {
            addLog(`    No inbound message body found, skipping`);
            continue;
          }

          const inboundTime = new Date(latestInbound.dateAdded).getTime();
          hasReply = messages.some(
            (m: any) => m.direction === 'outbound' && new Date(m.dateAdded).getTime() > inboundTime
          );

          // True first contact = no outbound messages at all in this conversation
          isFirstContact = !messages.some((m: any) => m.direction === 'outbound');
        } catch (err: any) {
          addLog(`    Messages error: ${err.message}`);
          continue;
        }

        if (hasReply) {
          addLog(`    Already replied, skipping`);
          continue;
        }

        // ── SMS Opt-out Detection ─────────────────────────────────────────────
        const msgBody = latestInbound.body?.trim().toUpperCase() ?? '';
        const OPT_OUT_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
        if (OPT_OUT_KEYWORDS.includes(msgBody)) {
          addLog(`    ⛔ Opt-out detected ("${latestInbound.body.trim()}") — tagging contact, skipping reply`);
          const ghlTokenOptOut = client.ghl_private_token || client.ghl_access_token;
          if (ghlTokenOptOut) {
            // Tag the contact as opted out
            void fetch(`${GHL_API_BASE}/contacts/${conv.contactId}/tags`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${ghlTokenOptOut}`, Version: GHL_API_VERSION, 'Content-Type': 'application/json' },
              body: JSON.stringify({ tags: ['sms-opt-out', 'kyra-do-not-contact'] }),
              signal: AbortSignal.timeout(5_000),
            }).catch(() => {});
            void fetch(`${GHL_API_BASE}/contacts/${conv.contactId}/notes`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${ghlTokenOptOut}`, Version: GHL_API_VERSION, 'Content-Type': 'application/json' },
              body: JSON.stringify({ body: '[Kyra AI] Contact opted out of SMS messages. Marked do-not-contact.' }),
              signal: AbortSignal.timeout(5_000),
            }).catch(() => {});
          }
          continue; // never reply to opt-out messages
        }

        // Also skip if contact was previously opted out (tag check from CRM context fetched later)
        // — handled below after contactCtx is available

        // ── Business Hours Check ──────────────────────────────────────────────
        const cfg2 = (client.container_config as Record<string, unknown>) ?? {};
        const bhCfg = cfg2.business_hours as { enabled?: boolean; start?: string; end?: string; timezone?: string } | undefined;
        if (bhCfg?.enabled && bhCfg.start && bhCfg.end) {
          const tz = bhCfg.timezone || 'UTC';
          const now = new Date();
          const localTime = new Intl.DateTimeFormat('en-US', {
            timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false
          }).format(now);
          const [hh, mm] = localTime.split(':').map(Number);
          const currentMinutes = hh * 60 + mm;
          const [startH, startM] = bhCfg.start.split(':').map(Number);
          const [endH, endM] = bhCfg.end.split(':').map(Number);
          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;
          if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
            addLog(`    ⏰ Outside business hours (${localTime} in ${tz}, hours: ${bhCfg.start}-${bhCfg.end}) — skipping`);
            continue;
          }
        }

        addLog(`    Inbound: "${latestInbound.body.slice(0, 60)}" — sending to gateway...`);

        // Fetch GHL contact context — gives AI CRM awareness (tags, pipeline, notes)
        const ghlToken = client.ghl_private_token || client.ghl_access_token;
        const contactCtx = ghlToken
          ? await fetchGHLContactContext(conv.contactId, ghlToken)
          : null;

        // ── Pipeline Lead Context ───────────────────────────────────────────
        // Check if this contact is a pipeline lead — if so, inject sales context
        const pipelineCtx = await lookupPipelineLead(supabase, conv.contactId);
        if (pipelineCtx) {
          addLog(`    🎯 Pipeline lead: ${pipelineCtx.fullName} (${pipelineCtx.company}) — stage: ${pipelineCtx.stage} — campaign: ${pipelineCtx.campaignName}`);
        }

        // ── Knowledge Base Context ───────────────────────────────────────────
        // Fetch business knowledge (services, FAQ, pricing, hours) so the AI
        // actually knows about the business it represents.
        const knowledgeCtx = await fetchKnowledgeContext(supabase, client.agency_id as string, client.id);
        if (knowledgeCtx) {
          addLog(`    📚 Knowledge base injected (${knowledgeCtx.length} chars)`);
        }

        if (contactCtx) {
          addLog(`    CRM: ${contactCtx.fullName} | tags=[${contactCtx.tags.join(', ')}] | pipeline=${contactCtx.pipelineStage || 'none'}`);
          // Skip if contact previously opted out
          const optedOut = contactCtx.tags.some(t => ['sms-opt-out', 'kyra-do-not-contact'].includes(t.toLowerCase()));
          if (optedOut) {
            addLog(`    ⛔ Contact previously opted out (tagged) — skipping`);
            continue;
          }
        }

      // Step 5: Process with Smart Engine (tools + memory + function calling)
      // The Smart Engine is the REAL AI brain — 50 GHL tools, CRM memory, relationship history.
      // The old approach (raw /v1/chat/completions to container) was a dumb proxy.
      // Now every poll conversation goes through the same engine as webhook conversations.
      try {
        // Build a minimal AgencyClient object for the Smart Engine
        const smartClient = {
          id: client.id as string,
          agency_id: client.agency_id as string,
          name: client.name as string,
          slug: '',
          industry: null,
          status: client.status as string,
          container_config: client.container_config as Record<string, unknown>,
          ghl_location_id: (client.ghl_location_id as string) || undefined,
          ghl_private_token: (client.ghl_private_token as string) || undefined,
          ghl_access_token: (client.ghl_access_token as string) || undefined,
          template: null,
        } as unknown as AgencyClient;

        addLog(`    Running Smart Engine for ${conv.contactName || conv.phone}...`);

        const smartResult = await processWithSmartEngine({
          client: smartClient,
          contactId: conv.contactId,
          contactName: conv.contactName || conv.phone || 'Customer',
          contactPhone: conv.phone || null,
          contactEmail: conv.email || null,
          conversationId: conv.id,
          messageType: (() => {
            const t = latestInbound.messageType || conv.lastMessageType || 'TYPE_SMS';
            const m: Record<string, string> = { TYPE_SMS: 'SMS', TYPE_EMAIL: 'Email', TYPE_WHATSAPP: 'WhatsApp', TYPE_FB_MESSENGER: 'Facebook Messenger', TYPE_INSTAGRAM: 'Instagram DM', TYPE_LIVE_CHAT: 'Live Chat' };
            return m[t] || 'SMS';
          })(),
          // Cap message body to prevent bloated context (500K+ token calls cost $2+ each)
          messageBody: latestInbound.body?.slice(0, 2000) || '',
        });

        let aiResponse = smartResult.reply;
        addLog(`    Smart Engine: ${smartResult.responseTimeMs}ms | Tools: [${smartResult.toolsUsed.join(', ') || 'none'}] | Escalated: ${smartResult.escalated}`);

        // Append booking link ONLY if AI didn't use a booking tool AND mentioned scheduling
        // If the AI used book_appointment/get_available_slots, it handled booking — don't append link
        const bookingToolUsed = smartResult.toolsUsed.some(t => 
          ['book_appointment', 'get_available_slots', 'get_calendars'].includes(t)
        );
        const calendarUrl = (client.container_config as Record<string, unknown>)?.calendar_url as string | undefined;
        if (calendarUrl && !aiResponse.includes('http') && !bookingToolUsed) {
          const BOOKING_KEYWORDS = ['schedule', 'book', 'appointment', 'available', 'slot', 'calendar'];
          if (BOOKING_KEYWORDS.some(k => aiResponse.toLowerCase().includes(k))) {
            aiResponse = `${aiResponse}\n\nBook online: ${calendarUrl}`;
          }
        }

        // Keep legacy session key variable for any code below that references it
        const today = new Date().toISOString().slice(0, 10);
        const clientShort = client.id.slice(0, 8);
        const sessionKey = `ghl:${clientShort}:${conv.contactId.slice(0, 8)}:${today}`;

        addLog(`  AI: "${aiResponse.slice(0, 80)}..."`);

        // Step 6: Send reply via GHL
        // Map GHL message types to valid Send Message API types
        const GHL_TYPE_MAP: Record<string, string> = {
          'TYPE_SMS': 'SMS',
          'TYPE_EMAIL': 'Email',
          'TYPE_WHATSAPP': 'WhatsApp',
          'TYPE_FB_MESSENGER': 'FB',
          'TYPE_INSTAGRAM': 'IG',
          'TYPE_LIVE_CHAT': 'Live_Chat',
          'TYPE_WEBCHAT': 'Live_Chat',
          'TYPE_GMB': 'GMB',
          'TYPE_CALL': 'SMS', // fallback for missed calls
        };
        const rawType = latestInbound.messageType || conv.lastMessageType || 'TYPE_SMS';
        const sendType = GHL_TYPE_MAP[rawType] || 'SMS';

        const sendRes = await fetch(`${GHL_API_BASE}/conversations/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Version: GHL_API_VERSION,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: sendType,
            contactId: conv.contactId,
            conversationId: conv.id,
            message: aiResponse,
          }),
          signal: AbortSignal.timeout(10_000),
        });

        if (sendRes.ok) {
          addLog(`  ✅ Reply sent to ${conv.contactName || conv.phone}`);
          totalProcessed++;

          // Deduct model-aware credits (fire-and-forget — never blocks reply)
          const ghlModel = (client as any).ai_model || 'gpt-4o-mini';
          const ghlCredits = getCreditsForModel(ghlModel);
          void deductCredits(
            client.agency_id as string,
            'channel.ghl_sms',
            {
              override: ghlCredits,
              clientId: client.id,
              description: `GHL ${sendType} reply (${ghlModel}) to ${conv.contactName || conv.phone || 'contact'}`,
            },
          ).then(result => {
            if (result.insufficient) {
              addLog(`  ⚠️ Credits exhausted for agency ${client.agency_id} — reply still sent`);
            }
          });

          // ── Pipeline stage auto-update ────────────────────────────────────
          // If this contact is a pipeline lead, update their stage based on the conversation
          if (pipelineCtx) {
            void updatePipelineStage(
              supabase,
              pipelineCtx.leadId,
              pipelineCtx.stage,
              aiResponse,
              latestInbound.body || '',
            ).then(() => {
              addLog(`    🎯 Pipeline stage check for ${pipelineCtx.fullName}`);
            });
          }

          // Fire-and-forget CRM update: tag + note the contact based on conversation
          // Build a minimal conversation array for extractCRMUpdate
          const convSummaryMessages = [
            { role: 'user', content: latestInbound.body },
            { role: 'assistant', content: aiResponse },
          ];
          const ghlTokenForCRM = client.ghl_private_token || client.ghl_access_token;
          if (ghlTokenForCRM && gatewayUrl && gateway?.gateway_token) {
            void (async () => {
              try {
                const crmUpdate = await extractCRMUpdate(
                  gatewayUrl,
                  gateway.gateway_token,
                  convSummaryMessages,
                );
                if (crmUpdate && (crmUpdate.tagsToAdd.length > 0 || crmUpdate.note || crmUpdate.needsHuman)) {
                  await applyGHLCRMUpdates(conv.contactId, ghlTokenForCRM, crmUpdate, addLog);
                }
                // Escalation alert — notify agency when human follow-up needed
                if (crmUpdate?.needsHuman) {
                  addLog(`  🚨 Escalation detected for ${conv.contactName || conv.phone}: ${crmUpdate.escalationReason || 'human needed'}`);
                  // Get agency notification email
                  const { data: agencyRow } = await supabase
                    .from('agencies')
                    .select('name, settings')
                    .eq('id', client.agency_id)
                    .single();
                  const agencySettings = (agencyRow?.settings ?? {}) as Record<string, unknown>;
                  const notifyEmail =
                    (agencySettings.escalation_email as string | undefined) ||
                    (agencySettings.weekly_report_email as string | undefined);
                  if (notifyEmail) {
                    await sendEscalationAlert({
                      agencyName: agencyRow?.name || 'Your agency',
                      clientName: client.name,
                      contactName: conv.contactName || conv.phone || 'Unknown contact',
                      contactPhone: conv.phone || '',
                      reason: crmUpdate.escalationReason || 'Customer needs human assistance',
                      conversationSummary: crmUpdate.note,
                      notifyEmail,
                    });
                    addLog(`    📧 Escalation alert sent to ${notifyEmail}`);
                  }
                  // Escalation webhook (Slack / Zapier / Make / custom)
                  const escalationWebhook = agencySettings.escalation_webhook_url as string | undefined;
                  if (escalationWebhook) {
                    void fetch(escalationWebhook, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        event: 'kyra.escalation',
                        timestamp: new Date().toISOString(),
                        agency: agencyRow?.name,
                        client: client.name,
                        contact: { name: conv.contactName || null, phone: conv.phone || null },
                        reason: crmUpdate.escalationReason || 'Customer needs human assistance',
                        summary: crmUpdate.note || null,
                        // Slack-compatible fields
                        text: `🚨 *Escalation* — ${client.name}\n*Contact:* ${conv.contactName || conv.phone || 'Unknown'}\n*Reason:* ${crmUpdate.escalationReason || 'Human needed'}`,
                        attachments: [{
                          color: '#dc2626',
                          fields: [
                            { title: 'Client', value: client.name, short: true },
                            { title: 'Contact', value: conv.contactName || conv.phone || 'Unknown', short: true },
                            { title: 'Reason', value: crmUpdate.escalationReason || 'Customer needs human assistance', short: false },
                          ],
                        }],
                      }),
                    }).then(() => addLog(`    🔔 Escalation webhook fired`)).catch(() => {});
                  }
                }
              } catch { /* best-effort, never block */ }
            })();
          }

          // Log to client_conversations so Kyra dashboard shows the exchange
          const contactLabel = conv.contactName || conv.phone || 'Unknown';
          const { error: logErr } = await supabase.from('client_conversations').insert({
            client_id: client.id,
            agency_id: client.agency_id,
            channel: `ghl_sms`,
            user_message: `[${contactLabel}] ${latestInbound.body}`,
            ai_response: aiResponse,
          });
          if (logErr) addLog(`  ⚠️ Conversation log failed: ${logErr.message}`);

          // Increment usage_this_month so Overview/Heartbeat stats reflect GHL activity
          const { error: usageErr } = await supabase
            .rpc('increment_client_usage', { client_id: client.id });
          if (usageErr) {
            // Fallback: manual increment if RPC not available
            const { data: cur } = await supabase
              .from('agency_clients')
              .select('usage_this_month')
              .eq('id', client.id)
              .single();
            if (cur) {
              await supabase
                .from('agency_clients')
                .update({ usage_this_month: (cur.usage_this_month || 0) + 1 })
                .eq('id', client.id);
            }
          }
        } else {
          const errText = await sendRes.text().catch(() => '');
          addLog(`  Send failed: ${sendRes.status} ${errText.slice(0, 100)}`);
          // 422 "Missing phone number" = test contact with no phone — not a real error
          if (sendRes.status !== 422) {
            errors.push(`Send failed for ${client.name}: ${sendRes.status}`);
          }
        }
      } catch (err: any) {
        addLog(`    Gateway/send error: ${err.message}`);
        errors.push(`${client.name}: ${err.message}`);
      }
      } // end for conv of toProcess
    }

    // ── Step 3: Proactive Lead Outreach ────────────────────────────────────
    // For each client with a greeting configured, scan GHL for new contacts
    // and send the greeting before they have a chance to message us first.
    // Scans run at most every 5 minutes per client to avoid rate limits.
    addLog('Starting proactive contact scan...');
    let proactiveSent = 0;

    for (const client of clients) {
      const cfg = (client.container_config as Record<string, unknown>) ?? {};
      const greeting = (cfg.greeting as string) || '';
      if (!greeting) continue; // no greeting → skip

      const token = client.ghl_private_token || client.ghl_access_token;
      if (!token) continue;

      // Only scan if enough time has passed (5 min cooldown)
      const lastScan = (client as any).ghl_last_contact_scan
        ? new Date((client as any).ghl_last_contact_scan)
        : null;
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (lastScan && lastScan > fiveMinutesAgo) continue;

      try {
        // Fetch contacts created since last scan (or last 5 min if first scan)
        const scanSince = lastScan || fiveMinutesAgo;
        const scanSinceStr = scanSince.toISOString();

        const contactsRes = await fetch(
          `${GHL_API_BASE}/contacts/?locationId=${client.ghl_location_id}&startDate=${encodeURIComponent(scanSinceStr)}&limit=10`,
          {
            headers: { Authorization: `Bearer ${token}`, Version: GHL_API_VERSION },
            signal: AbortSignal.timeout(8_000),
          }
        );

        if (!contactsRes.ok) {
          addLog(`  [proactive] Contacts fetch failed for ${client.name}: ${contactsRes.status}`);
          continue;
        }

        const contactsData = await contactsRes.json();
        const newContacts: any[] = contactsData.contacts || [];
        addLog(`  [proactive] ${client.name}: ${newContacts.length} new contacts since ${scanSinceStr.slice(11, 16)}`);

        for (const contact of newContacts.slice(0, 5)) {
          // Skip if contact has no phone (can't SMS)
          if (!contact.phone) continue;

          // Step 1: Find or create a GHL conversation for this contact
          const convSearchRes = await fetch(
            `${GHL_API_BASE}/conversations/search?locationId=${client.ghl_location_id}&contactId=${contact.id}&limit=1`,
            {
              headers: { Authorization: `Bearer ${token}`, Version: GHL_API_VERSION },
              signal: AbortSignal.timeout(5_000),
            }
          );

          let conversationId: string | null = null;
          if (convSearchRes.ok) {
            const convData = await convSearchRes.json();
            const existingConv = convData.conversations?.[0];
            if (existingConv) {
              // Check if already has outbound messages — skip if already greeted
              if (existingConv.unreadCount === 0 && existingConv.lastMessageType) {
                addLog(`    [proactive] ${contact.firstName || contact.id} — already contacted, skipping`);
                continue;
              }
              conversationId = existingConv.id;
            }
          }

          // Step 2: Create conversation if none exists
          if (!conversationId) {
            const createConvRes = await fetch(`${GHL_API_BASE}/conversations/`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                Version: GHL_API_VERSION,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                locationId: client.ghl_location_id,
                contactId: contact.id,
              }),
              signal: AbortSignal.timeout(8_000),
            });
            if (!createConvRes.ok) {
              const e = await createConvRes.text().catch(() => '');
              addLog(`    [proactive] Could not create conversation for ${contact.id}: ${createConvRes.status} ${e.slice(0, 60)}`);
              continue;
            }
            const newConv = await createConvRes.json();
            conversationId = newConv?.conversation?.id || newConv?.id;
          }

          if (!conversationId) {
            addLog(`    [proactive] No conversation ID for ${contact.id} — skipping`);
            continue;
          }

          // Step 3: Send greeting via the conversation
          const greetMsg = greeting.replace(/\{\{name\}\}/gi, contact.firstName || 'there');
          const outboundRes = await fetch(`${GHL_API_BASE}/conversations/messages`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              Version: GHL_API_VERSION,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'SMS',
              contactId: contact.id,
              conversationId,
              message: greetMsg,
            }),
            signal: AbortSignal.timeout(10_000),
          });

          if (outboundRes.ok) {
            addLog(`  ✅ [proactive] Greeted ${contact.firstName || contact.phone} for ${client.name}`);
            proactiveSent++;

            await supabase.from('client_conversations').insert({
              client_id: client.id,
              agency_id: client.agency_id,
              channel: 'ghl_sms',
              user_message: `[NEW CONTACT] ${contact.firstName || ''} ${contact.lastName || ''} (${contact.phone})`.trim(),
              ai_response: greetMsg,
            });
          } else {
            const err = await outboundRes.text().catch(() => '');
            addLog(`  [proactive] Send failed for ${contact.id}: ${outboundRes.status} ${err.slice(0, 80)}`);
          }

          // Brief pause between messages
          await new Promise(r => setTimeout(r, 500));
        }

        // Update last scan timestamp
        await supabase
          .from('agency_clients')
          .update({ ghl_last_contact_scan: new Date().toISOString() })
          .eq('id', client.id);

      } catch (err: any) {
        addLog(`  [proactive] Error for ${client.name}: ${err.message}`);
      }
    }

    addLog(`Proactive: ${proactiveSent} greetings sent.`);
    addLog(`Done. Processed: ${totalProcessed}, Errors: ${errors.length}`);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      messagesProcessed: totalProcessed,
      proactiveGreetings: proactiveSent,
      errors,
      log,
    });
  } catch (err: any) {
    addLog(`Fatal: ${err.message}`);
    return NextResponse.json(
      { error: 'Poll failed', message: err.message, durationMs: Date.now() - startTime, log },
      { status: 500 },
    );
  }
}
