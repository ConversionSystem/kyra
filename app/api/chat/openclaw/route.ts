/**
 * OpenClaw-powered chat route
 * 
 * Routes user messages through OpenClaw Gateway instead of direct Claude API.
 * This gives users access to OpenClaw's full skill ecosystem (web search,
 * file ops, sub-agents, etc.) while maintaining the same SSE streaming
 * format and memory/reminder extraction as the direct route.
 * 
 * Flow:
 * 1. Authenticate user, check usage limits (same as direct route)
 * 2. Build context (memories, reminders, calendar)
 * 3. Send to OpenClaw Gateway via sessions_send
 * 4. Stream response back via SSE
 * 5. Extract memories/reminders from response
 */

import { NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { searchMemories, saveMemory } from '@/lib/ai/memory';
import { extractCommands, Reminder, CalendarEvent } from '@/lib/ai/prompts';
import { isGoogleConnected, getTodayEvents } from '@/lib/integrations/google';
import { generateConversationTitle } from '@/lib/utils';
import { streamChat } from '@/lib/ai/claude';
import { Message, Conversation, MemoryType, User } from '@/types';
import { getPlanLimit, isWithinLimit, Plan } from '@/lib/billing/plans';
import { v4 as uuid } from 'uuid';
import {
  getOrCreateSession,
  markContextInjected,
  sessionsSend,
  buildUserContext,
  isOpenClawAvailable,
  destroySession,
} from '@/lib/openclaw/sessions';
import { getOpenClawSystemPrompt } from '@/lib/openclaw/prompts';
import { getSystemPrompt } from '@/lib/ai/prompts';

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
          error: 'Usage limit exceeded',
          message: `You've used all ${limit} messages for this month. Upgrade your plan for more.`,
          usage: currentUsage, limit, plan,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { message, conversation_id } = await request.json();
    if (!message || typeof message !== 'string') {
      return new Response('Message is required', { status: 400 });
    }

    // --- Check OpenClaw availability; fall back to direct Claude if down ---
    const openclawUp = await isOpenClawAvailable();
    if (!openclawUp) {
      console.warn('OpenClaw Gateway unavailable — falling back to direct Claude');
      return handleDirectClaude(request, {
        authUser, user, serviceClient, message, conversation_id, plan, currentUsage, limit,
      });
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

    // --- Build context ---
    const memories = await searchMemories(authUser.id, message, 5);

    const { data: pendingReminders } = await serviceClient
      .from('reminders')
      .select('id, content, due_at')
      .eq('user_id', authUser.id)
      .eq('delivered', false)
      .order('due_at', { ascending: true })
      .limit(10);

    const reminders: Reminder[] = (pendingReminders || []).map(r => ({
      id: r.id, content: r.content, due_at: r.due_at,
    }));

    let calendarEvents: CalendarEvent[] = [];
    try {
      if (await isGoogleConnected(authUser.id)) {
        const events = await getTodayEvents(authUser.id);
        calendarEvents = events.map(e => ({
          summary: e.summary, start: e.start, end: e.end, location: e.location,
        }));
      }
    } catch (e) {
      console.error('Calendar fetch failed:', e);
    }

    // --- OpenClaw session ---
    const { session, needsContext } = getOrCreateSession(authUser.id);

    // Build the message to send to OpenClaw
    let openclawMessage = message;

    if (needsContext) {
      // First message in session: inject system prompt + user context
      const systemPrompt = getOpenClawSystemPrompt({
        userName: (user as any).name,
        timezone: (user as any).timezone,
        memories: memories.map(m => ({ type: m.type, content: m.content })),
        reminders: reminders.map(r => ({ content: r.content, due_at: r.due_at })),
        calendarEvents,
      });

      openclawMessage = `${systemPrompt}\n\n---\n\nUser message: ${message}`;
      markContextInjected(authUser.id);
    } else {
      // Subsequent messages: inject fresh context summary if memories are relevant
      const contextBlock = buildUserContext({
        userName: (user as any).name,
        timezone: (user as any).timezone,
        memories: memories.map(m => ({ type: m.type, content: m.content })),
        reminders: reminders.map(r => ({ content: r.content, due_at: r.due_at })),
        calendarEvents,
      });

      if (contextBlock) {
        openclawMessage = `${contextBlock}\n\n${message}`;
      }
    }

    // Increment usage
    await serviceClient
      .from('users')
      .update({ usage_this_month: currentUsage + 1 })
      .eq('id', authUser.id);

    // --- Stream response ---
    const encoder = new TextEncoder();
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
            encoder.encode(`data: ${JSON.stringify({ type: 'usage', usage: currentUsage + 1, limit, plan })}\n\n`)
          );

          // Call OpenClaw Gateway (non-streaming — gateway handles the full exchange)
          const result = await sessionsSend(session.sessionKey, openclawMessage, 120);

          if (!result.success || !result.content) {
            // OpenClaw failed mid-request — notify client
            console.error('OpenClaw session send failed:', result.error);

            // Destroy the session so next request gets a fresh one
            destroySession(authUser.id);

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                message: 'AI service temporarily unavailable. Please try again.',
              })}\n\n`)
            );
            controller.close();
            return;
          }

          const fullResponse = result.content;

          // Stream the response in chunks to maintain SSE format the frontend expects
          const chunkSize = 20;
          for (let i = 0; i < fullResponse.length; i += chunkSize) {
            const chunk = fullResponse.slice(i, i + chunkSize);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`)
            );
          }

          // Extract memories and reminders
          const { cleanResponse, memories: memoriesToSave, reminders: remindersToSave } = extractCommands(fullResponse);

          for (const mem of memoriesToSave) {
            try {
              await saveMemory(authUser.id, mem.type as MemoryType, mem.content);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'memory_saved',
                  memory: { type: mem.type, content: mem.content },
                })}\n\n`)
              );
            } catch (e) {
              console.error('Error saving memory:', e);
            }
          }

          for (const rem of remindersToSave) {
            try {
              const { data: savedReminder, error: remError } = await serviceClient
                .from('reminders')
                .insert({
                  id: uuid(),
                  user_id: authUser.id,
                  content: rem.content,
                  due_at: rem.due_at,
                  channel: 'web',
                  metadata: {},
                })
                .select()
                .single();

              if (!remError && savedReminder) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'reminder_saved',
                    reminder: { id: savedReminder.id, content: rem.content, due_at: rem.due_at },
                  })}\n\n`)
                );
              }
            } catch (e) {
              console.error('Error saving reminder:', e);
            }
          }

          // Save messages to DB
          const { data: userMessage } = await serviceClient
            .from('messages')
            .insert({ id: uuid(), conversation_id: conversationId, role: 'user', content: message, metadata: {} })
            .select()
            .single();

          const { data: assistantMessage } = await serviceClient
            .from('messages')
            .insert({
              id: uuid(),
              conversation_id: conversationId,
              role: 'assistant',
              content: cleanResponse,
              metadata: { model: 'openclaw-gateway', provider: 'openclaw' },
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

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('OpenClaw stream error:', error);
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
  } catch (error) {
    console.error('OpenClaw chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

/**
 * Fallback: handle request via direct Claude API when OpenClaw is unavailable.
 * Reuses the same logic as the main route's direct path.
 */
async function handleDirectClaude(
  _request: NextRequest,
  ctx: {
    authUser: any;
    user: User;
    serviceClient: any;
    message: string;
    conversation_id?: string;
    plan: Plan;
    currentUsage: number;
    limit: number;
  }
) {
  // Import the main route handler dynamically to avoid circular deps
  // Instead, we duplicate the minimal fallback logic here
  const { authUser, user, serviceClient, message, conversation_id, plan, currentUsage, limit } = ctx;
  const { searchMemories, saveMemory } = await import('@/lib/ai/memory');
  const { getSystemPrompt, extractCommands } = await import('@/lib/ai/prompts');
  const { streamChat } = await import('@/lib/ai/claude');
  const { isGoogleConnected, getTodayEvents } = await import('@/lib/integrations/google');
  const { generateConversationTitle } = await import('@/lib/utils');

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

  const { data: historyData } = await serviceClient
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(20);
  const history = (historyData || []) as Message[];

  const memories = await searchMemories(authUser.id, message, 5);
  const { data: pendingReminders } = await serviceClient
    .from('reminders')
    .select('id, content, due_at')
    .eq('user_id', authUser.id)
    .eq('delivered', false)
    .order('due_at', { ascending: true })
    .limit(10);

  const reminders = (pendingReminders || []).map((r: any) => ({ id: r.id, content: r.content, due_at: r.due_at }));

  let calendarEvents: CalendarEvent[] = [];
  try {
    if (await isGoogleConnected(authUser.id)) {
      const events = await getTodayEvents(authUser.id);
      calendarEvents = events.map((e: any) => ({ summary: e.summary, start: e.start, end: e.end, location: e.location }));
    }
  } catch (_) { /* ignore */ }

  const systemPrompt = getSystemPrompt(memories, reminders, calendarEvents);

  await serviceClient
    .from('users')
    .update({ usage_this_month: currentUsage + 1 })
    .eq('id', authUser.id);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (isNewConversation && conversation) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'conversation', conversation })}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'usage', usage: currentUsage + 1, limit, plan })}\n\n`));

        const messagesForClaude = history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
        messagesForClaude.push({ role: 'user', content: message });

        let fullResponse = '';
        for await (const chunk of streamChat(messagesForClaude, systemPrompt)) {
          fullResponse += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`));
        }

        const { cleanResponse, memories: mems, reminders: rems } = extractCommands(fullResponse);

        for (const mem of mems) {
          try {
            await saveMemory(authUser.id, mem.type as MemoryType, mem.content);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'memory_saved', memory: { type: mem.type, content: mem.content } })}\n\n`));
          } catch (_) { /* ignore */ }
        }

        for (const rem of rems) {
          try {
            const { data: saved } = await serviceClient.from('reminders').insert({
              id: uuid(), user_id: authUser.id, content: rem.content, due_at: rem.due_at, channel: 'web', metadata: {},
            }).select().single();
            if (saved) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'reminder_saved', reminder: { id: saved.id, content: rem.content, due_at: rem.due_at } })}\n\n`));
            }
          } catch (_) { /* ignore */ }
        }

        const { data: userMessage } = await serviceClient.from('messages').insert({ id: uuid(), conversation_id: conversationId, role: 'user', content: message, metadata: {} }).select().single();
        const { data: assistantMessage } = await serviceClient.from('messages').insert({ id: uuid(), conversation_id: conversationId, role: 'assistant', content: cleanResponse, metadata: { model: 'claude-sonnet-4', provider: 'direct' } }).select().single();
        await serviceClient.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'message', userMessage, assistantMessage })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('Fallback stream error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Stream error occurred' })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}

function getNextMonthReset(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}
