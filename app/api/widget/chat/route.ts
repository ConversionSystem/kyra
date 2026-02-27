// ============================================================================
// POST /api/widget/chat
//
// Public AI chat endpoint for embeddable web chat widgets.
// No authentication required — clients embed this on their websites.
// Rate-limited per IP. Logs to client_conversations table.
//
// Body: { clientId: string, message: string, sessionId?: string }
// Returns: { response: string, sessionId: string }
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';

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
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body: { clientId?: string; message?: string; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { clientId, message, sessionId, history } = body as typeof body & {
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  };
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

  // Build session ID (persist conversation across messages)
  const resolvedSessionId = sessionId || `web:${clientId.slice(0, 8)}:${Date.now()}`;

  const cfg = (client.container_config as Record<string, unknown>) ?? {};
  const persona = (cfg.persona as string) || `AI assistant for ${client.name}`;

  const systemPrompt = [
    `You are ${persona}. You are responding via a web chat widget on a website.`,
    `Be warm, helpful, and concise. Keep replies to 2-4 sentences unless more detail is needed.`,
    `Do not mention you are an AI unless directly asked.`,
    cfg.calendar_url ? `When scheduling is mentioned, share this booking link: ${cfg.calendar_url}` : '',
    `If you can't resolve something, say: "Let me connect you with our team — they'll follow up shortly."`,
  ].filter(Boolean).join('\n');

  // Call the client's isolated OpenClaw gateway
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
  } catch (err: any) {
    console.error(`[widget/chat] Gateway timeout/error: ${err.message}`);
    return NextResponse.json({ error: 'AI unavailable' }, { status: 503 });
  }

  if (!aiResponse.trim()) {
    return NextResponse.json({ error: 'Empty AI response' }, { status: 503 });
  }

  // Log to client_conversations (fire-and-forget)
  void supabase.from('client_conversations').insert({
    client_id: client.id,
    agency_id: client.agency_id,
    channel: 'web_chat',
    user_message: message.trim(),
    ai_response: aiResponse,
  }).then(({ error }) => {
    if (error) console.error('[widget/chat] Log error:', error.message);
  });

  // Auto-log to CRM (fire-and-forget) — creates contact if new visitor
  void (async () => {
    try {
      const { logConversationToCrm } = await import('@/lib/crm/conversation-logger');
      // Log inbound visitor message
      await logConversationToCrm(client.agency_id, {
        type: 'InboundMessage',
        body: message.trim(),
        messageType: 'web_chat',
        direction: 'inbound',
        name: `Web Visitor (${ip})`,
      });
      // Log AI response
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
    { response: aiResponse, sessionId: resolvedSessionId },
    {
      headers: {
        'Access-Control-Allow-Origin': '*', // Widget is cross-origin
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
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
