// ============================================================================
// POST /api/widget/chat
//
// Public AI chat endpoint for embeddable web chat widgets.
// No authentication required — clients embed this on their websites.
// Rate-limited per IP. Logs to client_conversations table.
//
// ✨ NEW (Mar 1): Knowledge RAG + Smart Lead Capture
// - Injects relevant knowledge base docs into AI system prompt
// - Extracts visitor contact info after engagement
// - Auto-creates CRM contacts + web_chat_leads
// - Fires webhook notifications for new leads
//
// Body: { clientId, message, sessionId?, history?, sourceUrl? }
// Returns: { response, sessionId, leadCaptured? }
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { getKnowledgeContext } from '@/lib/knowledge/rag';
import { defend, scanOutput } from '@/lib/security/prompt-injection';
import {
  extractLeadFromConversation,
  saveWebChatLead,
  notifyLeadWebhook,
  getLeadCapturePrompt,
} from '@/lib/chat/lead-capture';
import { deductCredits, requireCredits } from '@/lib/billing/credit-engine';
import { getCreditsForModel } from '@/lib/billing/model-credits';
import OpenAI from 'openai';

// Direct LLM client for widget chat — bypasses OpenClaw gateway which has agency persona/SOUL.md
// Widget visitors should NEVER interact with the agency owner's AI persona
function getDirectLLMClient() {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    return new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openrouterKey,
    });
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

const WIDGET_MODEL = 'openai/gpt-4o-mini'; // Fast, cheap, good enough for customer service

// CORS headers required on EVERY response — the widget is embedded on external sites
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Simple in-memory rate limiter (resets on cold start — good enough for edge)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 60; // 60 messages/min per IP
}

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: CORS });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS });
  }

  const clientId = body.clientId as string | undefined;
  const message = body.message as string | undefined;
  const sessionId = body.sessionId as string | undefined;
  const history = body.history as Array<{ role: 'user' | 'assistant'; content: string }> | undefined;
  const sourceUrl = body.sourceUrl as string | undefined;

  if (!clientId || !message?.trim()) {
    return NextResponse.json({ error: 'clientId and message are required' }, { status: 400, headers: CORS });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400, headers: CORS });
  }

  // ── Prompt injection defense ───────────────────────────────────────────────
  const widgetContactId = `widget:${sessionId || clientId}`;
  const rawMessage = message.trim();
  const defense = defend(rawMessage, widgetContactId);
  if (!defense.proceed) {
    return NextResponse.json(
      { response: defense.deflectReply || "I'm sorry, I can't help with that request.", sessionId: sessionId || 'new' },
      { status: 200, headers: CORS }
    );
  }
  const safeMessage = defense.safeInput;

  const supabase = getSupabase();

  // Look up the client and their gateway
  const { data: client, error: dbErr } = await supabase
    .from('agency_clients')
    .select('id, name, status, agency_id, gateway_url, gateway_token, gateway_status, container_config, ai_model')
    .eq('id', clientId)
    .single();

  if (dbErr || !client) {
    // Return a graceful fallback response instead of a hard error
    // (Visitor still gets a reply even if the client config is missing)
    return NextResponse.json({
      response: "Hi! Thanks for reaching out. Our team will get back to you shortly. You can also call us directly for immediate assistance.",
      sessionId: null,
    }, { headers: CORS });
  }

  if (client.status !== 'active' && client.status !== 'setup') {
    return NextResponse.json({
      response: "Hi! Thanks for your message. We'll be in touch soon. Feel free to call us if you need immediate help!",
      sessionId: null,
    }, { headers: CORS });
  }

  // Use client's configured model if set, fall back to WIDGET_MODEL
  const clientModel = (client.container_config as any)?.ai_model || (client as any).ai_model || WIDGET_MODEL;

  // ── Model-aware credit check ──────────────────────────────────────────────
  const widgetPreflightCost = getCreditsForModel(clientModel);
  const creditCheck = await requireCredits(client.agency_id, 'chat.message', 1, widgetPreflightCost);
  if (!creditCheck.allowed) {
    return NextResponse.json(
      { error: 'AI unavailable — account credits depleted' },
      { status: 503, headers: CORS },
    );
  }

  // Build session ID (persist conversation across messages)
  const resolvedSessionId = sessionId || `web:${clientId.slice(0, 8)}:${Date.now()}`;

  const cfg = (client.container_config as Record<string, unknown>) ?? {};
  const persona = (cfg.persona as string) || `AI assistant for ${client.name}`;
  const businessName = (cfg.business_name as string) || client.name;

  // ── Fetch site config for tone + capabilities ─────────────────────────────
  const { data: siteData } = await supabase
    .from('client_sites')
    .select('ai_tone, ai_capabilities, ai_name, hours, booking_url, phone, business_name')
    .eq('client_id', clientId)
    .single();

  const aiTone = (siteData?.ai_tone as string) || 'professional';
  const aiCapabilities = (siteData?.ai_capabilities as string[]) || [];
  const aiName = (siteData?.ai_name as string) || (cfg.persona as string)?.split(' ')[0] || 'Alex';

  // ── Language instruction ──────────────────────────────────────────────────
  const responseLanguage = (cfg.response_language as string) || 'auto';
  // 'auto' or unset → detect from customer message. Specific language → lock to it.
  const languageInstruction = (!responseLanguage || responseLanguage === 'auto')
    ? "Detect the customer's language from their message and always respond in that same language."
    : `Always respond in ${responseLanguage.replace(/ \(.*\)/, '')}. Do not switch languages even if the customer writes in a different language.`;

  const toneInstruction: Record<string, string> = {
    professional: 'Maintain a professional, knowledgeable tone. Be helpful and precise.',
    friendly: 'Be warm, friendly and approachable. Use conversational language like talking to a friend.',
    casual: 'Be casual, relaxed and conversational. Keep it light and easy-going.',
  };

  const capabilityMap: Record<string, string> = {
    answer_questions: 'Answer customer questions accurately using your knowledge base.',
    book_appointments: `Help customers book appointments. ${siteData?.booking_url ? 'Share this booking link: ' + siteData.booking_url : 'Ask them to call to schedule.'}`,
    capture_leads: 'Collect customer name, email and phone number when they show interest.',
    provide_quotes: 'Provide rough price estimates when asked, based on typical industry rates.',
    qualify_leads: 'Ask qualifying questions to understand their needs before connecting them to the team.',
  };

  const capabilityInstructions = aiCapabilities
    .map((cap: string) => capabilityMap[cap])
    .filter(Boolean);

  // ── Knowledge RAG ──────────────────────────────────────────────────────────
  // Fetch relevant knowledge base documents and inject into system prompt.
  // This makes the AI actually USE the trained knowledge from auto-train.
  let knowledgeSection = '';
  try {
    const knowledge = await getKnowledgeContext(client.agency_id, client.id, message.trim());
    if (knowledge.text) {
      knowledgeSection = `\n\n${knowledge.text}\n`;
    }
  } catch (err) {
    console.error('[widget/chat] Knowledge RAG error:', err);
    // Degrade gracefully — proceed without knowledge
  }

  // ── FIX 4: Inject CRM relationship memory for returning visitors ──────────
  // If this visitor has been in the CRM before (matched by email/phone from prior sessions),
  // inject their history so the AI knows who they are.
  let crmContextSection = '';
  try {
    // Look up the visitor by sessionId to find previously captured lead info
    const { data: priorLead } = await supabase
      .from('web_chat_leads')
      .select('email, phone, crm_contact_id')
      .eq('client_id', clientId)
      .eq('session_id', resolvedSessionId)
      .maybeSingle();

    if (priorLead?.crm_contact_id) {
      const { getMemories, buildMemoryContext } = await import('@/lib/crm/relationship-memory');
      const { data: crmContact } = await supabase
        .from('crm_contacts')
        .select('first_name, last_name, stage, score_label, ai_summary, ai_next_action')
        .eq('id', priorLead.crm_contact_id)
        .single();

      if (crmContact) {
        const memories = await getMemories(client.agency_id, priorLead.crm_contact_id);
        const memCtx = buildMemoryContext(memories);
        const visitorName = [crmContact.first_name, crmContact.last_name].filter(Boolean).join(' ');
        crmContextSection = [
          `RETURNING VISITOR CONTEXT:`,
          visitorName ? `- Name: ${visitorName}` : '',
          crmContact.stage ? `- Stage: ${crmContact.stage}` : '',
          crmContact.score_label ? `- Lead score: ${crmContact.score_label}` : '',
          crmContact.ai_summary ? `- Summary: ${crmContact.ai_summary}` : '',
          crmContact.ai_next_action ? `- Pending follow-up: ${crmContact.ai_next_action}` : '',
          memCtx ? `Relationship notes:\n${memCtx}` : '',
        ].filter(Boolean).join('\n');
      }
    }
  } catch (err) {
    console.error('[widget/chat] CRM context error:', err);
  }

  // ── Lead Capture Prompt ────────────────────────────────────────────────────
  const exchangeCount = Array.isArray(history) ? Math.floor(history.length / 2) : 0;
  const leadCapturePrompt = getLeadCapturePrompt(exchangeCount);

  // ── Build System Prompt ────────────────────────────────────────────────────
  const systemPrompt = [
    `You are ${aiName}, a helpful AI assistant for ${businessName}, responding via a web chat widget on their website.`,
    toneInstruction[aiTone] || toneInstruction.professional,
    languageInstruction,
    `Keep replies to 2-4 sentences unless more detail is needed.`,
    `CRITICAL FORMATTING RULES — you are in a plain-text chat widget, NOT a document editor:`,
    `- NEVER use markdown: no **bold**, no *italic*, no # headers, no bullet dashes (- or *), no numbered lists (1. 2. 3.)`,
    `- NEVER use markdown links like [text](url) — write URLs as plain text or say "visit our website at URL"`,
    `- Use plain conversational sentences only. If listing items, write them naturally: "We offer X, Y, and Z."`,
    `- Line breaks are OK, but keep them minimal. No walls of text.`,
    ...capabilityInstructions,
    `Do not mention you are an AI unless directly asked.`,
    cfg.calendar_url ? `When scheduling is mentioned, share this booking link: ${cfg.calendar_url}` : '',
    siteData?.booking_url ? `Booking link: ${siteData.booking_url}` : '',
    cfg.business_hours ? `Business hours: ${cfg.business_hours}` : '',
    siteData?.hours ? `Hours: ${siteData.hours}` : '',
    cfg.business_phone ? `Business phone: ${cfg.business_phone}` : '',
    siteData?.phone ? `Phone: ${siteData.phone}` : '',
    cfg.business_address ? `Business address: ${cfg.business_address}` : '',
    cfg.services ? `Services offered: ${cfg.services}` : '',
    cfg.website_url ? `Website: ${cfg.website_url}` : '',
    `If you can't resolve something, say: "Let me connect you with our team — they'll follow up shortly."`,
    knowledgeSection,
    crmContextSection ? `\n${crmContextSection}` : '',
    leadCapturePrompt,
  ].filter(Boolean).join('\n');

  // ── Call LLM directly (bypasses OpenClaw gateway + agency persona) ─────────
  // Widget visitors are CUSTOMERS — they should talk to a business-specific assistant,
  // NOT the agency's OpenClaw container which has SOUL.md / CEO persona.
  let aiResponse = '';
  try {
    const llm = getDirectLLMClient();
    const chatRes = await llm.chat.completions.create({
      model: clientModel,
      messages: [
        { role: 'system', content: systemPrompt },
        // Inject conversation history so AI has context (last 10 turns)
        ...(Array.isArray(history) ? (history as Array<{role: 'user'|'assistant', content: string}>).slice(-10) : []),
        { role: 'user', content: safeMessage },
      ],
    });
    aiResponse = chatRes.choices[0]?.message?.content || '';

    // ── Output scan — catch prompt leaks ──────────────────────────────────
    const outputScan = scanOutput(aiResponse);
    if (!outputScan.safe) {
      console.warn(`[widget/chat] Output flagged for client ${clientId}: ${outputScan.leaks.join(', ')}`);
      aiResponse = outputScan.sanitizedOutput;
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[widget/chat] LLM error: ${errMsg}`);
    return NextResponse.json({ error: 'AI unavailable' }, { status: 503, headers: CORS });
  }

  if (!aiResponse.trim()) {
    return NextResponse.json({ error: 'Empty AI response' }, { status: 503, headers: CORS });
  }

  // ── Log conversation to DB (awaited — must complete before response) ────────
  // NOTE: fire-and-forget was causing silent data loss on Vercel serverless —
  // the function can be killed right after sending the response, before async
  // operations complete. We await the insert so it always persists.
  const { error: insertError } = await supabase
    .from('client_conversations')
    .insert({
      client_id: client.id,
      agency_id: client.agency_id,
      channel: 'web_chat',
      user_message: message.trim(),
      ai_response: aiResponse,
      session_id: resolvedSessionId,
      source_url: sourceUrl || null,
    });

  if (insertError) {
    // Log but don't fail the request — user should still get their response
    console.error('[widget/chat] DB insert failed:', insertError.message, insertError.code);
  }

  // Deduct credit (also awaited to avoid billing gaps)
  const widgetCredits = getCreditsForModel(clientModel);
  await deductCredits(client.agency_id, 'chat.message', {
    override: widgetCredits,
    clientId: client.id,
    description: `Web chat (${clientModel}): ${message.trim().slice(0, 50)}`,
  });



  // ── Lead Capture (fire-and-forget) ─────────────────────────────────────────
  // Build full conversation including current exchange
  const fullHistory = [
    ...(Array.isArray(history) ? history : []),
    { role: 'user' as const, content: message.trim() },
    { role: 'assistant' as const, content: aiResponse },
  ];

  let leadCaptured = false;

  void (async () => {
    try {
      // Only try extraction after at least 2 user messages
      const userMsgCount = fullHistory.filter(m => m.role === 'user').length;
      if (userMsgCount < 2) return;

      const extracted = extractLeadFromConversation(fullHistory);
      if (!extracted) return;

      // Need at least email or phone to save
      if (!extracted.email && !extracted.phone) return;

      const result = await saveWebChatLead(
        client.agency_id,
        client.id,
        resolvedSessionId,
        extracted,
        fullHistory,
        sourceUrl,
      );

      if (result) {
        leadCaptured = true;
        // Fire webhook notification (async, non-blocking)
        void notifyLeadWebhook(client.agency_id, extracted, result.leadId);
      }
    } catch (err) {
      console.error('[widget/chat] Lead capture error:', err);
    }
  })();

  // ── Auto-log to CRM (fire-and-forget) ─────────────────────────────────────
  void (async () => {
    try {
      const { logConversationToCrm } = await import('@/lib/crm/conversation-logger');
      await logConversationToCrm(client.agency_id, {
        type: 'InboundMessage',
        body: message.trim(),
        messageType: 'web_chat',
        direction: 'inbound',
        name: `Web Visitor (${ip})`,
      });
      await logConversationToCrm(client.agency_id, {
        type: 'OutboundMessage',
        body: aiResponse,
        messageType: 'web_chat',
        direction: 'outbound',
        name: 'AI Worker',
      });
    } catch (err) {
      console.error('[widget/chat] CRM log error:', err);
    }
  })();

  return NextResponse.json(
    { response: aiResponse, sessionId: resolvedSessionId, leadCaptured },
    { headers: CORS },
  );
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
