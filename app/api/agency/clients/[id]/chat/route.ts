/**
 * Agency Client Chat Route
 *
 * Dedicated endpoint for sending messages to an agency client's AI instance.
 * Verifies the caller is a member of the agency that owns the client,
 * then forwards the message to the AGENCY'S OWN gateway (not shared).
 *
 * POST /api/agency/clients/[id]/chat
 * Body: { message: string }
 * Returns: SSE stream (text/event-stream)
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getSessionKeyForClient, getSystemContextForClient, getSystemPromptForClient } from '@/lib/agency/container';
import { resolveClientGateway } from '@/lib/ovh/provisioner';
import type { AgencyClient, AgencyTemplate } from '@/lib/agency/types';
import { dispatchWebhookIfConfigured } from '@/lib/agency/webhook-dispatcher';
import { deductCredits, requireCredits } from '@/lib/billing/credit-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;

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

    // 3b. Pre-flight credit check
    const creditCheck = await requireCredits(client.agency_id, 'chat.message');
    if (!creditCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient credits',
          message: `You need ${creditCheck.cost} credit(s) but have ${creditCheck.balance}. Top up to continue.`,
          balance: creditCheck.balance,
          buyUrl: '/agency/credits',
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Resolve the CLIENT's own gateway — per-client isolation (OVH)
    const resolved = await resolveClientGateway(clientId);
    if (!resolved) {
      return new Response(
        JSON.stringify({ error: 'This client\'s AI is being set up. Please try again in a few minutes.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const { url: gatewayUrl } = resolved;

    // 5. Parse request body
    const { message } = (await request.json()) as { message?: string };
    if (!message || typeof message !== 'string') {
      return new Response('Message is required', { status: 400 });
    }

    // 5b. (API key is now baked into the container's env at provision time,
    //      and updated live when the agency saves new keys via /api/agency/api-keys)

    // 6. Build session key & context
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

    // 7. Forward to the client's gateway via /v1/chat/completions (OpenAI-compatible)
    const chatMessages: Array<{ role: string; content: string }> = [];
    if (systemContext) {
      chatMessages.push({ role: 'system', content: systemContext });
    }
    chatMessages.push({ role: 'user', content: message });

    let workerResponse: Response;
    try {
      workerResponse = await fetch(`${gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resolved.token}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: chatMessages,
          stream: true,
        }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (fetchError) {
      console.error('[client-chat] Gateway unreachable:', fetchError);
      return new Response(
        JSON.stringify({
          error: 'Gateway unreachable',
          message: "The AI backend is temporarily unavailable. Please try again in a moment.",
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error(`[client-chat] Gateway returned ${workerResponse.status}: ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Gateway request failed', details: errorText }),
        { status: workerResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 8. Stream response back to client
    const contentType = workerResponse.headers.get('content-type') || '';
    const isStreaming = contentType.includes('text/event-stream');
    const encoder = new TextEncoder();

    if (isStreaming && workerResponse.body) {
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
                    if (parsed.choices?.[0]?.delta?.content) {
                      const content = parsed.choices[0].delta.content;
                      fullResponse += content;
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: 'content', content })}\n\n`)
                      );
                    } else if (parsed.type === 'content' && parsed.content) {
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

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'done', fullResponse })}\n\n`)
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            // Fire-and-forget: log conversation + deduct credits + GHL webhook
            if (fullResponse) {
              void (async () => {
                try {
                  await createServiceClientWithoutCookies()
                    .from('client_conversations')
                    .insert({ client_id: clientId, agency_id: client.agency_id, channel: 'test_chat', user_message: message, ai_response: fullResponse });
                } catch { /* table may not exist yet */ }
                // Deduct credit for this conversation
                await deductCredits(client.agency_id, 'chat.message', {
                  clientId,
                  description: `Test chat: ${message.slice(0, 60)}`,
                });
                void dispatchWebhookIfConfigured({ clientId, agencyId: client.agency_id, channel: 'test_chat', userMessage: message, aiResponse: fullResponse });
              })();
            }
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
      let responseData: any;
      try {
        responseData = await workerResponse.json();
      } catch {
        responseData = { response: await workerResponse.text() };
      }

      const fullResponse = responseData.reply || responseData.response || responseData.content || responseData.message || '';

      const stream = new ReadableStream({
        async start(controller) {
          try {
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
            // Fire-and-forget: log conversation + deduct credits + GHL webhook
            if (fullResponse) {
              void (async () => {
                try {
                  await createServiceClientWithoutCookies()
                    .from('client_conversations')
                    .insert({ client_id: clientId, agency_id: client.agency_id, channel: 'test_chat', user_message: message, ai_response: fullResponse });
                } catch { /* table may not exist yet */ }
                // Deduct credit for this conversation
                await deductCredits(client.agency_id, 'chat.message', {
                  clientId,
                  description: `Test chat: ${message.slice(0, 60)}`,
                });
                void dispatchWebhookIfConfigured({ clientId, agencyId: client.agency_id, channel: 'test_chat', userMessage: message, aiResponse: fullResponse });
              })();
            }
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
