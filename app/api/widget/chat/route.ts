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
import { classifyMessage } from '@/lib/ghl/model-router';
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
  const storeId = body.storeId as string | undefined; // Jane store ID from embed param

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
  const rawModel = (client.container_config as any)?.ai_model || (client as any).ai_model;
  // Validate: empty/undefined → fall back to WIDGET_MODEL
  const resolvedModel = rawModel && typeof rawModel === 'string' && rawModel.trim() ? rawModel.trim() : WIDGET_MODEL;
  // ── Canonical model ID → valid OpenRouter slug ─────────────────────────
  // Verified against OpenRouter /v1/models on Apr 3, 2026
  const OPENROUTER_SLUGS: Record<string, string> = {
    'claude-haiku-3-5':   'anthropic/claude-3.5-haiku',
    'claude-haiku-4-5':   'anthropic/claude-haiku-4.5',
    'claude-sonnet-3-7':  'anthropic/claude-3.7-sonnet',
    'claude-sonnet-4-6':  'anthropic/claude-sonnet-4.6',
    'claude-opus-4-6':    'anthropic/claude-opus-4.6',
    'gpt-4o-mini':        'openai/gpt-4o-mini',
    'gpt-4o':             'openai/gpt-4o',
    'gemini-2.0-flash':   'google/gemini-2.0-flash-001',
    'gemini-2.5-pro':     'google/gemini-2.5-pro',
    'o3-mini':            'openai/o3-mini',
    'o3':                 'openai/o3',
    'o1':                 'openai/o1',
  };

  const useOpenRouter = !!process.env.OPENROUTER_API_KEY;
  let clientModel: string;
  if (useOpenRouter) {
    // Strip 'openrouter/' prefix first
    const stripped = resolvedModel.startsWith('openrouter/') ? resolvedModel.slice('openrouter/'.length) : resolvedModel;
    // 1. Try direct slug mapping (most reliable — handles dash/dot variations)
    if (OPENROUTER_SLUGS[stripped]) {
      clientModel = OPENROUTER_SLUGS[stripped];
    } else if (stripped.includes('/')) {
      // 2. Already has provider prefix — check if it's a known valid slug
      const maybeCanonical = stripped.split('/').pop() || '';
      clientModel = OPENROUTER_SLUGS[maybeCanonical] || stripped;
    } else if (stripped.startsWith('gpt-') || stripped.startsWith('o1') || stripped.startsWith('o3')) {
      clientModel = `openai/${stripped}`;
    } else if (stripped.startsWith('gemini-')) {
      clientModel = `google/${stripped}`;
    } else {
      // Unknown — fall back to default widget model
      clientModel = WIDGET_MODEL;
    }
  } else {
    // Direct OpenAI — strip any provider prefix
    clientModel = resolvedModel.includes('/') ? resolvedModel.split('/').slice(1).join('/') : resolvedModel;
  }

  // ── Smart routing: downgrade to mini for simple/medium messages ───────────
  const complexity = classifyMessage(message.trim());
  const routedModel = complexity === 'complex' ? clientModel : 'openai/gpt-4o-mini';

  // ── Model-aware credit check ──────────────────────────────────────────────
  const widgetPreflightCost = getCreditsForModel(routedModel);
  const creditCheck = await requireCredits(client.agency_id, 'chat.message', 1, widgetPreflightCost);
  if (!creditCheck.allowed) {
    return NextResponse.json(
      { response: 'Thanks for reaching out! Please give us a call for immediate assistance.', error: 'credits_depleted' },
      { headers: CORS },
    );
  }

  // Build session ID (persist conversation across messages)
  const resolvedSessionId = sessionId || `web:${clientId.slice(0, 8)}:${Date.now()}`;

  // ── Session memory for returning visitors ────────────────────────────────
  // Fetch prior DB history when client sends a known sessionId but no in-memory
  // history (e.g., returning visitor on a fresh page load).
  let sessionHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  if (sessionId && (!Array.isArray(history) || history.length === 0)) {
    try {
      const { data: sessionRows } = await supabase
        .from('client_conversations')
        .select('user_message, ai_response, created_at')
        .eq('client_id', client.id)
        .eq('session_id', resolvedSessionId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (sessionRows?.length) {
        for (const row of [...sessionRows].reverse()) {
          if (row.user_message?.trim()) sessionHistory.push({ role: 'user' as const, content: row.user_message });
          if (row.ai_response?.trim()) sessionHistory.push({ role: 'assistant' as const, content: row.ai_response });
        }
      }
    } catch (err) {
      console.error('[widget/chat] Session memory error:', err);
    }
  }

  const cfg = (client.container_config as Record<string, unknown>) ?? {};
  const persona = (cfg.persona as string) || `AI assistant for ${client.name}`;
  const businessName = (cfg.business_name as string) || client.name;
  const customInstructions = (cfg.instructions as string) || '';

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
    // Use the full persona if configured, otherwise generic intro
    persona && persona.length > 50
      ? `${persona}\nYou are responding via a web chat widget on the ${businessName} website.`
      : `You are ${aiName}, a helpful AI assistant for ${businessName}, responding via a web chat widget on their website.`,
    toneInstruction[aiTone] || toneInstruction.professional,
    languageInstruction,
    `IDENTITY: Your name is ${aiName}. When someone asks "who are you?" or "what is your name?", always introduce yourself by name: "I'm ${aiName}" and explain your role at ${businessName}. Never be evasive about your identity.`,
    `RESPONSE QUALITY RULES:`,
    `- Give specific, useful answers. If you know the answer, give it directly. If you don't have the information, say so honestly and offer to connect them with the team.`,
    `- Keep replies to 2-4 sentences unless more detail is needed.`,
    `- Be conversational and natural, not robotic.`,
    `BANNED CLOSING PHRASES — NEVER end your response with any of these or anything similar:`,
    `"If you have any other questions..." / "feel free to ask" / "don't hesitate to reach out" / "How can I help you today?" / "Is there anything else I can help with?" / "Let me know if you need anything else" / "just let me know" / "Happy to help!" / "Hope that helps!"`,
    `END your response naturally after giving the answer. Stop talking. Do NOT add a closing invitation phrase.`,
    `CRITICAL FORMATTING RULES — you are in a plain-text chat widget, NOT a document editor:`,
    `- NEVER use markdown: no **bold**, no *italic*, no # headers, no bullet dashes (- or *), no numbered lists (1. 2. 3.)`,
    `- NEVER use markdown links like [text](url) — write URLs as plain text or say "visit our website at URL"`,
    `- Use plain conversational sentences only. If listing items, write them naturally: "We offer X, Y, and Z."`,
    `- Line breaks are OK, but keep them minimal. No walls of text.`,
    ...capabilityInstructions,
    `Do not mention you are an AI unless directly asked. But always share your name when asked who you are.`,
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
    customInstructions ? `BUSINESS KNOWLEDGE AND RULES (use this information to answer customer questions accurately):\n${customInstructions}` : '',
    knowledgeSection,
    crmContextSection ? `\n${crmContextSection}` : '',
    sessionHistory.length > 0 ? `\nSESSION MEMORY: This visitor has chatted before. Their prior messages are included at the start of the conversation for context.` : '',
    leadCapturePrompt,
  ].filter(Boolean).join('\n');

  // ── Product Search (Jane API integration for cannabis dispensaries) ────────
  let productContext = '';
  const janeEnabled = !!(cfg.jane_api_key || cfg.firecrawl_enabled);
  if (janeEnabled) {
    const { isProductQuery, parseProductIntent, searchProducts, formatProductsForAI } = await import('@/lib/integrations/jane');
    if (isProductQuery(safeMessage)) {
      const intent = parseProductIntent(safeMessage);
      intent.storeId = storeId || (cfg.jane_default_store_id as string) || '117';
      const firecrawlKey = process.env.FIRECRAWL_API_KEY;
      const results = await searchProducts(intent, firecrawlKey || undefined);
      if (results.products.length > 0) {
        productContext = `\n\nPRODUCT SEARCH RESULTS (from live inventory - use these to answer):\n${formatProductsForAI(results.products)}\n\nIMPORTANT: Recommend AT LEAST 3 products (or all if fewer than 3 found). For EACH product include: product name, why it matches, key details (THC/CBD/price/effects), and the direct URL. Format cleanly with numbered list.`;
      }
    }
  }

  // ── Call LLM directly (bypasses OpenClaw gateway + agency persona) ─────────
  // Widget visitors are CUSTOMERS — they should talk to a business-specific assistant,
  // NOT the agency's OpenClaw container which has SOUL.md / CEO persona.
  let aiResponse = '';
  try {
    const llm = getDirectLLMClient();
    const chatRes = await llm.chat.completions.create({
      model: routedModel,
      messages: [
        { role: 'system', content: systemPrompt + productContext },
        // DB session memory (prior page loads), then in-memory history (current session)
        ...sessionHistory,
        ...(Array.isArray(history) ? (history as Array<{role: 'user'|'assistant', content: string}>).slice(-10) : []),
        { role: 'user', content: safeMessage },
      ],
    }, { signal: AbortSignal.timeout(25000) });
    aiResponse = chatRes.choices[0]?.message?.content || '';

    // ── Output scan — catch prompt leaks ──────────────────────────────────
    const outputScan = scanOutput(aiResponse);
    if (!outputScan.safe) {
      console.warn(`[widget/chat] Output flagged for client ${clientId}: ${outputScan.leaks.join(', ')}`);
      aiResponse = outputScan.sanitizedOutput;
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      console.error(`[widget/chat] LLM timeout for client ${clientId}`);
      return NextResponse.json(
        { response: "Thanks for your message! Our team is a bit busy right now. We'll get back to you shortly.", sessionId: resolvedSessionId },
        { headers: CORS },
      );
    }
    console.error(`[widget/chat] LLM error for ${clientId} (model=${routedModel}): ${errMsg}`);
    return NextResponse.json(
      { response: "Thanks for your message! Our team will get back to you shortly.", error: 'ai_unavailable' },
      { headers: CORS },
    );
  }

  if (!aiResponse.trim()) {
    return NextResponse.json(
      { response: "I didn't quite catch that. Could you rephrase your question?", error: 'empty_response', sessionId: resolvedSessionId },
      { headers: CORS },
    );
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
  const widgetCredits = getCreditsForModel(routedModel);
  await deductCredits(client.agency_id, 'chat.message', {
    override: widgetCredits,
    clientId: client.id,
    description: `Web chat (${routedModel}): ${message.trim().slice(0, 50)}`,
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
