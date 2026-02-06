import { NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { streamChat } from '@/lib/ai/claude';
import { searchMemories, saveMemory } from '@/lib/ai/memory';
import { getSystemPrompt, extractCommands, Reminder } from '@/lib/ai/prompts';
import { generateConversationTitle } from '@/lib/utils';
import { Message, Conversation, MemoryType, User } from '@/types';
import { getPlanLimit, isWithinLimit, Plan } from '@/lib/billing/plans';
import { v4 as uuid } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get user profile with plan and usage
    const { data: userProfile, error: profileError } = await serviceClient
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    // Create user profile if it doesn't exist (first login)
    let user: User;
    if (profileError || !userProfile) {
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
        console.error('Error creating user profile:', createError);
        return new Response('Failed to create user profile', { status: 500 });
      }
      user = newUser as User;
    } else {
      user = userProfile as User;
    }

    // Check if usage needs to be reset (new month)
    if (user.usage_reset_at && new Date(user.usage_reset_at) < new Date()) {
      await serviceClient
        .from('users')
        .update({
          usage_this_month: 0,
          usage_reset_at: getNextMonthReset(),
        })
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
          usage: currentUsage,
          limit,
          plan,
        }),
        { 
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { message, conversation_id } = await request.json();

    if (!message || typeof message !== 'string') {
      return new Response('Message is required', { status: 400 });
    }

    let conversationId = conversation_id;
    let conversation: Conversation | null = null;
    let isNewConversation = false;

    // Create or get conversation
    if (!conversationId) {
      isNewConversation = true;
      conversationId = uuid();
      const title = generateConversationTitle(message);
      
      const { data, error } = await serviceClient
        .from('conversations')
        .insert({
          id: conversationId,
          user_id: authUser.id,
          title,
          channel: 'web',
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating conversation:', error);
        return new Response('Failed to create conversation', { status: 500 });
      }
      
      conversation = data as Conversation;
    } else {
      // Verify user owns this conversation
      const { data, error } = await serviceClient
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', authUser.id)
        .single();
      
      if (error || !data) {
        return new Response('Conversation not found', { status: 404 });
      }
      
      conversation = data as Conversation;
    }

    // Get conversation history
    const { data: historyData } = await serviceClient
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);
    
    const history = (historyData || []) as Message[];

    // Search relevant memories
    const memories = await searchMemories(authUser.id, message, 5);
    
    // Get pending reminders
    const { data: pendingReminders } = await serviceClient
      .from('reminders')
      .select('id, content, due_at')
      .eq('user_id', authUser.id)
      .eq('delivered', false)
      .order('due_at', { ascending: true })
      .limit(10);
    
    const reminders: Reminder[] = (pendingReminders || []).map(r => ({
      id: r.id,
      content: r.content,
      due_at: r.due_at,
    }));
    
    const systemPrompt = getSystemPrompt(memories, reminders);

    // Increment usage count
    await serviceClient
      .from('users')
      .update({ usage_this_month: currentUsage + 1 })
      .eq('id', authUser.id);

    // Create readable stream for response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send conversation info first if new
          if (isNewConversation && conversation) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'conversation', conversation })}\n\n`)
            );
          }

          // Send usage info
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'usage', 
              usage: currentUsage + 1,
              limit,
              plan,
            })}\n\n`)
          );

          // Build messages for Claude
          const messagesForClaude = history.map(m => ({ 
            role: m.role as 'user' | 'assistant', 
            content: m.content 
          }));
          messagesForClaude.push({ role: 'user', content: message });

          // Stream AI response
          let fullResponse = '';
          
          for await (const chunk of streamChat(messagesForClaude, systemPrompt)) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`)
            );
          }

          // Extract and save any memories and reminders from the response
          const { cleanResponse, memories: memoriesToSave, reminders: remindersToSave } = extractCommands(fullResponse);
          
          // Save memories
          for (const mem of memoriesToSave) {
            try {
              await saveMemory(authUser.id, mem.type as MemoryType, mem.content);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'memory_saved', 
                  memory: { type: mem.type, content: mem.content } 
                })}\n\n`)
              );
            } catch (memError) {
              console.error('Error saving memory:', memError);
            }
          }
          
          // Save reminders
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
                    reminder: { 
                      id: savedReminder.id,
                      content: rem.content, 
                      due_at: rem.due_at 
                    } 
                  })}\n\n`)
                );
              }
            } catch (remError) {
              console.error('Error saving reminder:', remError);
            }
          }

          // Save user message
          const { data: userMessage } = await serviceClient
            .from('messages')
            .insert({
              id: uuid(),
              conversation_id: conversationId,
              role: 'user',
              content: message,
              metadata: {},
            })
            .select()
            .single();

          // Save assistant message (clean version without memory tags)
          const { data: assistantMessage } = await serviceClient
            .from('messages')
            .insert({
              id: uuid(),
              conversation_id: conversationId,
              role: 'assistant',
              content: cleanResponse,
              metadata: { model: 'claude-sonnet-4' },
            })
            .select()
            .single();

          // Update conversation timestamp
          await serviceClient
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);

          // Send final message data
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'message',
              userMessage,
              assistantMessage,
            })}\n\n`)
          );

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
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
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

function getNextMonthReset(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}
