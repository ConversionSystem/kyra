/**
 * Kyra Worker chat route
 *
 * Routes user messages through the Kyra Cloudflare Worker, which manages
 * per-user OpenClaw sandboxes. Each user gets an isolated container running
 * a full OpenClaw Gateway.
 *
 * Flow:
 * 1. Authenticate user, check usage limits
 * 2. Gather context (memories, calendar, reminders) from Supabase/Pinecone
 * 3. Forward message + context to Kyra Worker (POST /api/kyra/chat)
 * 4. Worker proxies to OpenClaw's /v1/chat/completions inside the container
 * 5. Stream OpenAI-format SSE back, converting to Kyra's frontend SSE format
 * 6. Save messages and extract memories/reminders
 */

import { NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { searchMemories, saveMemory } from '@/lib/ai/memory';
import { extractCommands, Reminder, CalendarEvent } from '@/lib/ai/prompts';
import { isGoogleConnected, getTodayEvents } from '@/lib/integrations/google';
import { generateConversationTitle } from '@/lib/utils';
import { Message, Conversation, MemoryType, User } from '@/types';
import { getPlanLimit, isWithinLimit, getCreditCost, classifyChatAction, Plan } from '@/lib/billing/plans';
import { v4 as uuid } from 'uuid';

const WORKER_URL = process.env.KYRA_WORKER_URL;
const API_SECRET = process.env.KYRA_API_SECRET;

/**
 * Build a system context string from user data, memories, reminders, and calendar.
 */
function buildSystemContext(opts: {
  userName: string;
  timezone?: string;
  memories: Array<{ type: string; content: string }>;
  reminders: Reminder[];
  calendarEvents: CalendarEvent[];
}): string {
  const parts: string[] = [];

  parts.push(`You are Kyra, a personal AI assistant. You are talking to ${opts.userName}.`);
  if (opts.timezone) {
    parts.push(`Their timezone is ${opts.timezone}.`);
  }
  parts.push(
    'Be helpful, concise, and personable. Remember context from previous conversations.',
    'You have access to tools including web search, file operations, and sub-agents via OpenClaw.',
  );

  if (opts.memories.length > 0) {
    parts.push('\n## Relevant Memories');
    for (const mem of opts.memories) {
      parts.push(`- [${mem.type}] ${mem.content}`);
    }
  }

  if (opts.reminders.length > 0) {
    parts.push('\n## Pending Reminders');
    for (const rem of opts.reminders) {
      parts.push(`- ${rem.content} (due: ${rem.due_at})`);
    }
  }

  if (opts.calendarEvents.length > 0) {
    parts.push("\n## Today's Calendar");
    for (const evt of opts.calendarEvents) {
      const loc = evt.location ? ` @ ${evt.location}` : '';
      parts.push(`- ${evt.summary}: ${evt.start} – ${evt.end}${loc}`);
    }
  }

  // Memory/reminder extraction instructions
  parts.push(
    '\n## Instructions',
    'If the user shares something worth remembering, include it in your response wrapped in:',
    '[MEMORY type="preference"]content here[/MEMORY]',
    'Valid types: preference, fact, context, feedback',
    '',
    'If the user asks for a reminder, include:',
    '[REMINDER due="ISO-8601-datetime"]content here[/REMINDER]',
  );

  return parts.join('\n');
}

export async function POST(request: NextRequest) {
  if (!WORKER_URL || !API_SECRET) {
    console.error('KYRA_WORKER_URL or KYRA_API_SECRET not configured');
    return new Response('Worker not configured', { status: 500 });
  }

  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    // Authenticate
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
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
          usage: currentUsage,
          limit,
          plan,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { message, conversation_id } = await request.json();
    if (!message || typeof message !== 'string') {
      return new Response('Message is required', { status: 400 });
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

    // --- Gather context in parallel ---
    const [memories, { data: pendingReminders }, calendarResult, historyData] = await Promise.all([
      searchMemories(authUser.id, message, 5).catch((err) => {
        console.error('[worker-route] Memory search error:', err);
        return [];
      }),
      serviceClient
        .from('reminders')
        .select('id, content, due_at')
        .eq('user_id', authUser.id)
        .eq('delivered', false)
        .order('due_at', { ascending: true })
        .limit(10),
      (async () => {
        try {
          const googleConnected = await isGoogleConnected(authUser.id);
          if (googleConnected) {
            const events = await getTodayEvents(authUser.id);
            return events.map((e) => ({
              summary: e.summary,
              start: e.start,
              end: e.end,
              location: e.location,
            }));
          }
        } catch (calError) {
          console.error('[worker-route] Calendar error:', calError);
        }
        return [] as CalendarEvent[];
      })(),
      // Get conversation history for multi-turn
      serviceClient
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20),
    ]);

    const reminders: Reminder[] = (pendingReminders || []).map((r) => ({
      id: r.id,
      content: r.content,
      due_at: r.due_at,
    }));
    const calendarEvents: CalendarEvent[] = calendarResult;
    const conversationHistory = (historyData?.data || []).map((m: any) => ({
      role: m.role as string,
      content: m.content as string,
    }));

    // Build system context for the worker
    const systemContext = buildSystemContext({
      userName: (user as any).name || 'User',
      timezone: (user as any).timezone,
      memories: memories.map((m) => ({ type: m.type, content: m.content })),
      reminders,
      calendarEvents,
    });

    // Determine credit cost
    const creditCost = getCreditCost(classifyChatAction({ hasWebSearch: false, hasSubAgent: false, hasFileAnalysis: false }));

    // Deduct credits
    await serviceClient
      .from('users')
      .update({ usage_this_month: currentUsage + creditCost })
      .eq('id', authUser.id);

    // --- Forward to Kyra Worker ---
    let workerResponse: Response;
    try {
      workerResponse = await fetch(`${WORKER_URL}/api/kyra/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_SECRET}`,
          'X-Kyra-User-Id': authUser.id,
        },
        body: JSON.stringify({
          message,
          systemContext,
          conversationHistory,
          stream: true,
        }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (fetchError) {
      console.error('[worker-route] Worker unreachable:', fetchError);
      return new Response(
        JSON.stringify({
          error: 'Worker unreachable',
          message: "Kyra's backend is temporarily unavailable. Please try again in a moment.",
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error(`[worker-route] Worker returned ${workerResponse.status}: ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Worker request failed', details: errorText }),
        { status: workerResponse.status, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // --- Stream response back to frontend ---
    // The worker returns OpenAI SSE format (chat.completion.chunk events).
    // We convert these to Kyra's frontend SSE format ({ type: 'content', content }).
    const contentType = workerResponse.headers.get('content-type') || '';
    const isStreaming = contentType.includes('text/event-stream');
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send conversation info if new
          if (isNewConversation && conversation) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'conversation', conversation })}\n\n`,
              ),
            );
          }

          // Send usage info
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'usage',
                usage: currentUsage + creditCost,
                limit,
                plan,
                creditCost,
              })}\n\n`,
            ),
          );

          let fullResponse = '';

          if (isStreaming && workerResponse.body) {
            // Parse OpenAI SSE stream and convert to Kyra format
            const reader = workerResponse.body.getReader();
            const decoder = new TextDecoder();
            let sseBuffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              sseBuffer += decoder.decode(value, { stream: true });

              // Process complete SSE lines
              const lines = sseBuffer.split('\n');
              // Keep the last incomplete line in the buffer
              sseBuffer = lines.pop() || '';

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);

                  // OpenAI format: { choices: [{ delta: { content: "..." } }] }
                  const delta = parsed.choices?.[0]?.delta;
                  if (delta?.content) {
                    fullResponse += delta.content;
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`,
                      ),
                    );
                  }

                  // Also handle non-streaming OpenAI format (full message)
                  const messageContent = parsed.choices?.[0]?.message?.content;
                  if (messageContent) {
                    fullResponse = messageContent;
                    // Send in chunks for consistent frontend behavior
                    const chunkSize = 20;
                    for (let i = 0; i < messageContent.length; i += chunkSize) {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({
                            type: 'content',
                            content: messageContent.slice(i, i + chunkSize),
                          })}\n\n`,
                        ),
                      );
                    }
                  }
                } catch {
                  // Not valid JSON, skip
                }
              }
            }
          } else {
            // Non-streaming: parse JSON response
            let responseData: any;
            try {
              responseData = await workerResponse.json();
            } catch {
              responseData = {};
            }

            // OpenAI format: { choices: [{ message: { content: "..." } }] }
            fullResponse =
              responseData.choices?.[0]?.message?.content ||
              responseData.response ||
              responseData.content ||
              '';

            // Send in chunks
            const chunkSize = 20;
            for (let i = 0; i < fullResponse.length; i += chunkSize) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'content',
                    content: fullResponse.slice(i, i + chunkSize),
                  })}\n\n`,
                ),
              );
            }
          }

          // Post-process: save messages and extract memories/reminders
          await postProcessResponse(
            serviceClient,
            authUser.id,
            conversationId,
            message,
            fullResponse,
            controller,
            encoder,
          );

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('[worker-route] Stream error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: 'Stream error occurred' })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[worker-route] Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

/**
 * Post-process the assistant response: extract memories/reminders, save messages.
 */
async function postProcessResponse(
  serviceClient: any,
  userId: string,
  conversationId: string,
  userContent: string,
  assistantContent: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
) {
  const { cleanResponse, memories: memoriesToSave, reminders: remindersToSave } =
    extractCommands(assistantContent);

  for (const mem of memoriesToSave) {
    try {
      await saveMemory(userId, mem.type as MemoryType, mem.content);
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'memory_saved',
            memory: { type: mem.type, content: mem.content },
          })}\n\n`,
        ),
      );
    } catch (e) {
      console.error('[worker-route] Error saving memory:', e);
    }
  }

  for (const rem of remindersToSave) {
    try {
      const { data: saved } = await serviceClient
        .from('reminders')
        .insert({
          id: uuid(),
          user_id: userId,
          content: rem.content,
          due_at: rem.due_at,
          channel: 'web',
          metadata: {},
        })
        .select()
        .single();
      if (saved) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'reminder_saved',
              reminder: { id: saved.id, content: rem.content, due_at: rem.due_at },
            })}\n\n`,
          ),
        );
      }
    } catch (e) {
      console.error('[worker-route] Error saving reminder:', e);
    }
  }

  // Save user message
  const { data: userMessage } = await serviceClient
    .from('messages')
    .insert({
      id: uuid(),
      conversation_id: conversationId,
      role: 'user',
      content: userContent,
      metadata: {},
    })
    .select()
    .single();

  // Save assistant message (clean, without memory/reminder tags)
  const { data: assistantMessage } = await serviceClient
    .from('messages')
    .insert({
      id: uuid(),
      conversation_id: conversationId,
      role: 'assistant',
      content: cleanResponse,
      metadata: { model: 'openclaw-gateway', provider: 'kyra-worker' },
    })
    .select()
    .single();

  // Update conversation timestamp
  await serviceClient
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  controller.enqueue(
    encoder.encode(
      `data: ${JSON.stringify({ type: 'message', userMessage, assistantMessage })}\n\n`,
    ),
  );
}

function getNextMonthReset(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}
