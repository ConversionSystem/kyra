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
import {
  extractLeadFromConversation,
  saveWebChatLead,
  notifyLeadWebhook,
  getLeadCapturePrompt,
} from '@/lib/chat/lead-capture';
import { deductCredits, requireCredits } from '@/lib/billing/credit-engine';

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
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const clientId = body.clientId as string | undefined;
  const message = body.message as string | undefined;
  const sessionId = body.sessionId as string | undefined;
  const history = body.history as Array<{ role: 'user' | 'assistant'; content: string }> | undefined;
  const sourceUrl = body.sourceUrl as string | undefined;

  if (!clientId || !message?.trim()) {
    return NextResponse.json({ error: 'clientId and message are required' }, { status: 400 });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Look up the client and their gateway
  const { data: client, error: dbErr } = await supabase
    .from('agency_clients')
    .select('id, name, status, agency_id, gateway_url, gateway_token, gateway_status, container_config')
    .eq('id', clientId)
    .single();

  if (dbErr || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  if (client.status !== 'active' && client.status !== 'setup') {
    return NextResponse.json({ error: 'Client AI not active' }, { status: 403 });
  }

  if (!client.gateway_url || !['running', 'starting'].includes(client.gateway_status || '')) {
    return NextResponse.json({ error: 'AI not available' }, { status: 503 });
  }

  // ── Credit check ────────────────────────────────────────────────────────────
  const creditCheck = await requireCredits(client.agency_id, 'chat.message');
  if (!creditCheck.allowed) {
    return NextResponse.json(
      { error: 'AI unavailable — account credits depleted' },
      { status: 503, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  }

  // Build session ID (persist conversation across messages)
  const resolvedSessionId = sessionId || `web:${clientId.slice(0, 8)}:${Date.now()}`;

  const cfg = (client.container_config as Record<string, unknown>) ?? {};
  const persona = (cfg.persona as string) || `AI assistant for ${client.name}`;
  const businessName = (cfg.business_name as string) || client.name;

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

  // ── Lead Capture Prompt ────────────────────────────────────────────────────
  const exchangeCount = Array.isArray(history) ? Math.floor(history.length / 2) : 0;
  const leadCapturePrompt = getLeadCapturePrompt(exchangeCount);

  // ── Build System Prompt ────────────────────────────────────────────────────
  const systemPrompt = [
    `You are ${persona}. You are a helpful AI assistant for ${businessName}, responding via a web chat widget on their website.`,
    `Be warm, helpful, and concise. Keep replies to 2-4 sentences unless more detail is needed.`,
    `Answer questions accurately using your knowledge base. If you know the answer from your training, share it confidently.`,
    `Do not mention you are an AI unless directly asked.`,
    cfg.calendar_url ? `When scheduling is mentioned, share this booking link: ${cfg.calendar_url}` : '',
    cfg.business_hours ? `Business hours: ${cfg.business_hours}` : '',
    cfg.business_phone ? `Business phone: ${cfg.business_phone}` : '',
    cfg.business_address ? `Business address: ${cfg.business_address}` : '',
    `If you can't resolve something, say: "Let me connect you with our team — they'll follow up shortly."`,
    knowledgeSection,
    leadCapturePrompt,
  ].filter(Boolean).join('\n');

  // ── Call AI Gateway ────────────────────────────────────────────────────────
  let aiResponse = '';
  try {
    const chatRes = await fetch(`${client.gateway_url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${client.gateway_token}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          // Inject conversation history so AI has context (last 10 turns)
          ...(Array.isArray(history) ? history.slice(-10) : []),
          { role: 'user', content: message.trim() },
        ],
        stream: false,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!chatRes.ok) {
      const errText = await chatRes.text().catch(() => '');
      console.error(`[widget/chat] Gateway error ${chatRes.status}: ${errText.slice(0, 200)}`);
      return NextResponse.json({ error: 'AI unavailable' }, { status: 503 });
    }

    const data = await chatRes.json();
    aiResponse = data?.choices?.[0]?.message?.content || '';
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[widget/chat] Gateway timeout/error: ${errMsg}`);
    return NextResponse.json({ error: 'AI unavailable' }, { status: 503 });
  }

  if (!aiResponse.trim()) {
    return NextResponse.json({ error: 'Empty AI response' }, { status: 503 });
  }

  // ── Log to client_conversations ──────────────────────────────────────────
  // Includes session_id for accurate session grouping and source_url for
  // page-level analytics. Both are critical for the analytics dashboard.
  void supabase
    .from('client_conversations')
    .insert({
      client_id: client.id,
      agency_id: client.agency_id,
      channel: 'web_chat',
      user_message: message.trim(),
      ai_response: aiResponse,
      session_id: resolvedSessionId,
      source_url: sourceUrl || null,
    })
    .then(({ error }) => {
      if (error) console.error('[widget/chat] Log error:', error.message);
    });

  // Deduct credit for this widget chat message
  void deductCredits(client.agency_id, 'chat.message', {
    clientId: client.id,
    description: `Web chat: ${message.trim().slice(0, 60)}`,
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
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    },
  );
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
