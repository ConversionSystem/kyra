/**
 * Agency Client Chat Route
 *
 * Dedicated endpoint for sending messages to an agency client's AI instance.
 * Verifies the caller is a member of the agency that owns the client,
 * then forwards the message to the Fly.io bridge with the client's session key.
 *
 * POST /api/agency/clients/[id]/chat
 * Body: { message: string }
 * Returns: SSE stream (text/event-stream)
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionKeyForClient, getSystemContextForClient, getSystemPromptForClient } from '@/lib/agency/container';
import type { AgencyClient, AgencyTemplate } from '@/lib/agency/types';

const WORKER_URL = process.env.KYRA_WORKER_URL;
const API_SECRET = process.env.KYRA_API_SECRET;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;

  if (!WORKER_URL || !API_SECRET) {
    console.error('[client-chat] KYRA_WORKER_URL or KYRA_API_SECRET not configured');
    return new Response('Worker not configured', { status: 500 });
  }

  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Fetch the client
    const { data: client, error: clientError } = await supabase
      .from('agency_clients')
      .select('*, template:agency_templates(*)')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return new Response('Client not found', { status: 404 });
    }

    // 3. Verify user is a member of the agency that owns this client
    const { data: membership, error: memberError } = await supabase
      .from('agency_members')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('agency_id', client.agency_id)
      .single();

    if (memberError || !membership) {
      return new Response('Forbidden: not a member of this agency', { status: 403 });
    }

    // 4. Parse request body
    const { message } = (await request.json()) as { message?: string };
    if (!message || typeof message !== 'string') {
      return new Response('Message is required', { status: 400 });
    }

    // 5. Build session key & context
    const typedClient = client as AgencyClient & { template?: AgencyTemplate | null };
    const sessionKey = getSessionKeyForClient(clientId);
    const clientContext = getSystemContextForClient(typedClient, typedClient.template);
    const clientPrompt = getSystemPromptForClient(typedClient, typedClient.template);

    // Combine the client-specific prompt with context
    const systemContext = [
      clientPrompt,
      '',
      'Client context: ' + JSON.stringify(clientContext),
    ].join('\n');

    // 6. Forward to Fly.io bridge
    let workerResponse: Response;
    try {
      workerResponse = await fetch(`${WORKER_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionKey,
          systemContext,
        }),
        signal: AbortSignal.timeout(120_000), // Cold start can take ~60s
      });
    } catch (fetchError) {
      console.error('[client-chat] Worker unreachable:', fetchError);
      return new Response(
        JSON.stringify({
          error: 'Worker unreachable',
          message: "The AI backend is temporarily unavailable. Please try again in a moment.",
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error(`[client-chat] Worker returned ${workerResponse.status}: ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Worker request failed', details: errorText }),
        { status: workerResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 7. Stream response back to client
    const contentType = workerResponse.headers.get('content-type') || '';
    const isStreaming = contentType.includes('text/event-stream');
    const encoder = new TextEncoder();

    if (isStreaming && workerResponse.body) {
      // SSE passthrough — parse worker stream and re-emit as Kyra SSE
      const workerBody = workerResponse.body;

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const reader = workerBody.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim();
                  if (data === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(data);
                    // OpenAI format
                    if (parsed.choices?.[0]?.delta?.content) {
                      const content = parsed.choices[0].delta.content;
                      fullResponse += content;
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: 'content', content })}\n\n`)
                      );
                    }
                    // Legacy Kyra format
                    else if (parsed.type === 'content' && parsed.content) {
                      fullResponse += parsed.content;
                      controller.enqueue(encoder.encode(line + '\n'));
                    } else if (parsed.response) {
                      fullResponse = parsed.response;
                      controller.enqueue(encoder.encode(line + '\n'));
                    }
                  } catch {
                    controller.enqueue(encoder.encode(line + '\n'));
                  }
                }
              }
            }

            // Send done with full response for the client to use
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'done', fullResponse })}\n\n`)
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('[client-chat] Stream error:', error);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Stream error occurred' })}\n\n`)
            );
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
    } else {
      // JSON response — convert to SSE format
      let responseData: any;
      try {
        responseData = await workerResponse.json();
      } catch {
        responseData = { response: await workerResponse.text() };
      }

      const fullResponse = responseData.response || responseData.content || responseData.message || '';

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send response in chunks to simulate streaming
            const chunkSize = 20;
            for (let i = 0; i < fullResponse.length; i += chunkSize) {
              const chunk = fullResponse.slice(i, i + chunkSize);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`)
              );
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'done', fullResponse })}\n\n`)
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('[client-chat] JSON response error:', error);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Stream error occurred' })}\n\n`)
            );
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
  } catch (error) {
    console.error('[client-chat] Error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
