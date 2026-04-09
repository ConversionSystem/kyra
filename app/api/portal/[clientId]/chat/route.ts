/**
 * Public Portal Chat Route
 *
 * Unauthenticated endpoint for the /portal/[clientId] page.
 * Visitors (end-clients) can chat with the AI without a Kyra account.
 * Uses service role server-side — gateway token never exposed to browser.
 *
 * POST /api/portal/[clientId]/chat
 * Body: { message: string }
 * Returns: SSE stream (text/event-stream)
 */

import { NextRequest } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { resolveClientGateway } from '@/lib/ovh/provisioner';
import { deductCredits } from '@/lib/billing/credit-engine';
import { getCreditsForModel } from '@/lib/billing/model-credits';
import { isRateLimited } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  // Rate limit by IP — 20 req/min per IP (Supabase-backed, persists across cold starts)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (await isRateLimited(`portal:${ip}`, 20, 60_000)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please slow down.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createServiceClientWithoutCookies();

    // 1. Fetch client using service role (no auth needed)
    const { data: client, error } = await supabase
      .from('agency_clients')
      .select('id, name, industry, agency_id, gateway_url, gateway_token, gateway_status')
      .eq('id', clientId)
      .single();

    if (error || !client) {
      return new Response('Client not found', { status: 404 });
    }

    if (client.gateway_status !== 'running') {
      return new Response(
        JSON.stringify({ error: 'AI is offline. Please try again later.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Resolve live gateway (gets fresh URL + token)
    const resolved = await resolveClientGateway(clientId);
    if (!resolved) {
      return new Response(
        JSON.stringify({ error: 'AI is being set up. Please try again in a moment.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse message
    const { message } = (await request.json()) as { message?: string };
    if (!message?.trim() || typeof message !== 'string') {
      return new Response('Message is required', { status: 400 });
    }
    if (message.length > 2000) {
      return new Response('Message too long', { status: 400 });
    }

    // 4. Forward to gateway
    let gatewayRes: Response;
    try {
      gatewayRes = await fetch(`${resolved.url}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resolved.token}`,
        },
        body: JSON.stringify({
          model: 'openrouter/anthropic/claude-haiku-4.5',
          messages: [{ role: 'user', content: message.trim() }],
          stream: true,
        }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      return new Response(
        JSON.stringify({ error: 'AI temporarily unavailable. Please try again.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!gatewayRes.ok) {
      return new Response(
        JSON.stringify({ error: 'AI request failed. Please try again.' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Deduct credits after successful LLM response
    const portalModel = 'openrouter/anthropic/claude-haiku-4.5';
    void deductCredits(client.agency_id as string, 'chat.message', {
      clientId,
      description: 'Portal chat message',
      override: getCreditsForModel(portalModel),
    }).catch(() => {});

    // 5. Stream back to client
    const encoder = new TextEncoder();
    const isStreaming = gatewayRes.headers.get('content-type')?.includes('text/event-stream');

    if (isStreaming && gatewayRes.body) {
      const body = gatewayRes.body;
      const stream = new ReadableStream({
        async start(controller) {
          const reader = body.getReader();
          const decoder = new TextDecoder();
          let fullResponse = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              for (const line of chunk.split('\n')) {
                if (!line.startsWith('data: ')) continue;
                const raw = line.slice(6).trim();
                if (raw === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(raw);
                  const content = parsed.choices?.[0]?.delta?.content || parsed.content || '';
                  if (content) {
                    fullResponse += content;
                    controller.enqueue(encoder.encode(
                      `data: ${JSON.stringify({ type: 'content', content })}\n\n`
                    ));
                  }
                } catch { controller.enqueue(encoder.encode(line + '\n')); }
              }
            }
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'done', fullResponse })}\n\n`
            ));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } catch {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: 'Connection lost.' })}\n\n`
            ));
          } finally {
            controller.close();
          }
        },
      });
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming fallback
    const data = await gatewayRes.json();
    const reply = data?.choices?.[0]?.message?.content || data?.response || '';
    const stream = new ReadableStream({
      start(controller) {
        for (let i = 0; i < reply.length; i += 20) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'content', content: reply.slice(i, i + 20) })}\n\n`
          ));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', fullResponse: reply })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });

  } catch (err) {
    console.error('[portal-chat]', err);
    return new Response('Internal server error', { status: 500 });
  }
}
