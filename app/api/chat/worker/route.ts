/**
 * Kyra Worker chat route
 * 
 * Routes user messages through the Kyra Cloudflare Worker, which manages
 * per-user OpenClaw sandboxes. This replaces the Mac mini tunnel approach
 * with a fully multi-tenant architecture.
 * 
 * Flow:
 * 1. Authenticate user, check usage limits
 * 2. Forward message to Kyra Worker (POST /api/kyra/chat)
 * 3. Stream response back via SSE
 * 4. Save messages and extract memories/reminders
 */

import { NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { searchMemories, saveMemory } from '@/lib/ai/memory';
import { extractCommands, getSystemPrompt, Reminder, CalendarEvent } from '@/lib/ai/prompts';
import { isGoogleConnected, getTodayEvents } from '@/lib/integrations/google';
import { generateConversationTitle } from '@/lib/utils';
import { Message, Conversation, MemoryType, User } from '@/types';
import { getPlanLimit, isWithinLimit, getCreditCost, Plan } from '@/lib/billing/plans';
import { getSessionKeyForClient, getSessionKeyForUser, getSystemContextForClient, getSystemPromptForClient } from '@/lib/agency/container';
import { resolveModelPreference } from '@/lib/ai/model-router';
import type { AgencyClient, AgencyTemplate } from '@/lib/agency/types';
import { resolveGatewayForUser } from '@/lib/ovh/gateway-resolver';
import { v4 as uuid } from 'uuid';

export async function POST(request: NextRequest) {

  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    // Authenticate
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get or create user profile
    let user: User;
    const { data: userProfile } = await serviceClient
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (!userProfile) {
      const { data: newUser, error: createError } = await serviceClient
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0],
          plan: 'free',
          usage_this_month: 0,
          usage_reset_at: getNextMonthReset(),
        })
        .select()
        .single();

      if (createError || !newUser) {
        return new Response('Failed to create user profile', { status: 500 });
      }
      user = newUser as User;
    } else {
      user = userProfile as User;
    }

    // Reset usage if new month
    if (user.usage_reset_at && new Date(user.usage_reset_at) < new Date()) {
      await serviceClient
        .from('users')
        .update({ usage_this_month: 0, usage_reset_at: getNextMonthReset() })
        .eq('id', user.id);
      user.usage_this_month = 0;
    }

    // Check usage limits
    const plan = (user.plan || 'free') as Plan;
    const currentUsage = user.usage_this_month || 0;
    const limit = getPlanLimit(plan);

    if (!isWithinLimit(plan, currentUsage)) {
      return new Response(
        JSON.stringify({
          error: 'Credit limit exceeded',
          message: `You've used all ${limit} credits for this month. Upgrade your plan for more.`,
          usage: currentUsage, limit, plan,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = (await request.json()) as any;
    const { message, conversation_id } = body;
    if (!message || typeof message !== 'string') {
      return new Response('Message is required', { status: 400 });
    }

    // --- Agency client mode detection ---
    // clientId can come from: body, query param, or header
    const clientId = body.clientId
      || request.nextUrl.searchParams.get('clientId')
      || request.headers.get('x-kyra-client-id')
      || null;

    let agencySessionKey: string | null = null;
    let agencySystemContext: string | null = null;

    if (clientId) {
      // Verify user is a member of the agency that owns this client
      const { data: client, error: clientError } = await supabase
        .from('agency_clients')
        .select('*, template:agency_templates(*)')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        return new Response('Client not found', { status: 404 });
      }

      const { data: membership, error: memberError } = await supabase
        .from('agency_members')
        .select('id, role')
        .eq('user_id', authUser.id)
        .eq('agency_id', client.agency_id)
        .single();

      if (memberError || !membership) {
        return new Response('Forbidden: not a member of this agency', { status: 403 });
      }

      const typedClient = client as AgencyClient & { template?: AgencyTemplate | null };
      agencySessionKey = getSessionKeyForClient(clientId);
      const clientContext = getSystemContextForClient(typedClient, typedClient.template);
      const clientPrompt = getSystemPromptForClient(typedClient, typedClient.template);
      agencySystemContext = [clientPrompt, '', 'Client context: ' + JSON.stringify(clientContext)].join('\n');
    }

    // --- Conversation setup ---
    let conversationId = conversation_id;
    let conversation: Conversation | null = null;
    let isNewConversation = false;

    if (!conversationId) {
      isNewConversation = true;
      conversationId = uuid();
      const title = generateConversationTitle(message);
      const { data, error } = await serviceClient
        .from('conversations')
        .insert({ id: conversationId, user_id: authUser.id, title, channel: 'web' })
        .select()
        .single();
      if (error) return new Response('Failed to create conversation', { status: 500 });
      conversation = data as Conversation;
    } else {
      const { data, error } = await serviceClient
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', authUser.id)
        .single();
      if (error || !data) return new Response('Conversation not found', { status: 404 });
      conversation = data as Conversation;
    }

    // Deduct credits
    const creditCost = getCreditCost('chat');
    await serviceClient
      .from('users')
      .update({ usage_this_month: currentUsage + creditCost })
      .eq('id', authUser.id);

    // Note: Workspace init is handled inside the container (static SOUL.md/AGENTS.md).
    // Per-user workspace bootstrap will be added in Phase 0.2.

    // --- Gather context for the OpenClaw container ---
    let systemContext = '';
    try {
      const memories = await searchMemories(authUser.id, message, 5);

      let calendarEvents: CalendarEvent[] = [];
      const googleConnected = await isGoogleConnected(authUser.id);
      if (googleConnected) {
        try {
          calendarEvents = await getTodayEvents(authUser.id);
        } catch (e) {
          console.error('[worker-route] Calendar fetch error:', e);
        }
      }

      systemContext = getSystemPrompt(memories || [], undefined, calendarEvents);
    } catch (e) {
      console.error('[worker-route] Context gathering error:', e);
    }

    // --- Route to optimal model —  user preference → smart routing by message complexity ---
    const userModelPref = (user as any).settings?.preferred_model;
    const modelConfig = resolveModelPreference(userModelPref, message);

    // --- Forward to agency's own gateway (per-agency isolation) ---
    const sessionKey = agencySessionKey || getSessionKeyForUser(authUser.id);
    const finalSystemContext = agencySystemContext
      ? agencySystemContext + '\n\n' + systemContext
      : systemContext;

    // Resolve the client's gateway (OVH per-client isolation)
    // If clientId is provided, resolve that client's gateway; otherwise find first active in agency
    const resolved = await resolveGatewayForUser(authUser.id, clientId);
    if (!resolved) {
      return new Response(
        JSON.stringify({ error: 'No AI gateway found. Deploy a client AI first.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const { url: gatewayUrl } = resolved;

    // Build OpenAI-compatible messages for /v1/chat/completions
    const chatMessages: Array<{ role: string; content: string }> = [];
    if (finalSystemContext) {
      chatMessages.push({ role: 'system', content: finalSystemContext });
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
          model: modelConfig.id || 'openai/gpt-4o-mini',
          messages: chatMessages,
          stream: true,
        }),
        signal: AbortSignal.timeout(180_000),
      });
    } catch (fetchError) {
      console.error('[worker-route] Worker unreachable:', fetchError);
      return new Response(
        JSON.stringify({
          error: 'Worker unreachable',
          message: 'Kyra\'s backend is temporarily unavailable. Please try again in a moment.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error(`[worker-route] Worker returned ${workerResponse.status}: ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Worker request failed', details: errorText }),
        { status: workerResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if worker response is streaming (SSE) or JSON
    const contentType = workerResponse.headers.get('content-type') || '';
    const isStreaming = contentType.includes('text/event-stream');

    const encoder = new TextEncoder();

    if (isStreaming && workerResponse.body) {
      // Worker returns SSE — wrap it with our conversation/usage metadata
      const workerBody = workerResponse.body;
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send conversation info if new
            if (isNewConversation && conversation) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'conversation', conversation })}\n\n`)
              );
            }

            // Send usage info
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'usage', usage: currentUsage + creditCost, limit, plan, creditCost })}\n\n`)
            );

            // Pipe through worker stream, collecting full response
            const reader = workerBody.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              
              // Parse and transform OpenAI SSE to Kyra SSE format
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim();
                  if (data === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(data);
                    // OpenAI format from /v1/chat/completions
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
                    // Forward as-is if not parseable
                    controller.enqueue(encoder.encode(line + '\n'));
                  }
                }
              }
            }

            // Post-process: save messages and extract commands
            await saveMessages(
              serviceClient, authUser.id, conversationId, message, fullResponse, controller, encoder,
              { model: modelConfig.id, tier: modelConfig.tier },
            );

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('[worker-route] Stream error:', error);
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
      // Worker returns JSON — convert to SSE format the frontend expects
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
            if (isNewConversation && conversation) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'conversation', conversation })}\n\n`)
              );
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'usage', usage: currentUsage + creditCost, limit, plan, creditCost })}\n\n`)
            );

            // Send response in chunks
            const chunkSize = 20;
            for (let i = 0; i < fullResponse.length; i += chunkSize) {
              const chunk = fullResponse.slice(i, i + chunkSize);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`)
              );
            }

            await saveMessages(
              serviceClient, authUser.id, conversationId, message, fullResponse, controller, encoder,
              { model: modelConfig.id, tier: modelConfig.tier },
            );

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('[worker-route] JSON response error:', error);
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
    console.error('[worker-route] Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

/**
 * Save user and assistant messages to DB, extract memories/reminders
 */
async function saveMessages(
  serviceClient: any,
  userId: string,
  conversationId: string,
  userContent: string,
  assistantContent: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  modelMeta?: { model: string; tier: string },
) {
  const { extractCommands } = await import('@/lib/ai/prompts');
  const { saveMemory } = await import('@/lib/ai/memory');

  const { cleanResponse, memories: memoriesToSave, reminders: remindersToSave } = extractCommands(assistantContent);

  for (const mem of memoriesToSave) {
    try {
      await saveMemory(userId, mem.type as MemoryType, mem.content);
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'memory_saved', memory: { type: mem.type, content: mem.content } })}\n\n`)
      );
    } catch (e) {
      console.error('Error saving memory:', e);
    }
  }

  for (const rem of remindersToSave) {
    try {
      const { data: saved } = await serviceClient.from('reminders').insert({
        id: uuid(), user_id: userId, content: rem.content, due_at: rem.due_at, channel: 'web', metadata: {},
      }).select().single();
      if (saved) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'reminder_saved', reminder: { id: saved.id, content: rem.content, due_at: rem.due_at } })}\n\n`)
        );
      }
    } catch (e) {
      console.error('Error saving reminder:', e);
    }
  }

  const { data: userMessage } = await serviceClient
    .from('messages')
    .insert({ id: uuid(), conversation_id: conversationId, role: 'user', content: userContent, metadata: {} })
    .select()
    .single();

  const { data: assistantMessage } = await serviceClient
    .from('messages')
    .insert({
      id: uuid(), conversation_id: conversationId, role: 'assistant', content: cleanResponse,
      metadata: { model: modelMeta?.model || 'kyra-worker', tier: modelMeta?.tier, provider: 'worker' },
    })
    .select()
    .single();

  await serviceClient
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({ type: 'message', userMessage, assistantMessage })}\n\n`)
  );
}

function getNextMonthReset(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}
