import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { streamChat, streamChatWithTools } from '@/lib/ai/claude';
import { searchMemories, saveMemory } from '@/lib/ai/memory';
import { getSystemPrompt, extractCommands, Reminder, CalendarEvent } from '@/lib/ai/prompts';
import { isGoogleConnected, getTodayEvents } from '@/lib/integrations/google';
import { webSearch, formatSearchResults, needsWebSearch, extractSearchQuery } from '@/lib/tools/web-search';
import { simpleFetch, formatFetchedContent, extractUrls } from '@/lib/tools/url-fetch';
import { getToolDefinitions, executeToolCall } from '@/lib/tools/definitions';
import { buildSkillsPrompt } from '@/lib/skills/registry';
import { generateConversationTitle } from '@/lib/utils';
import { Message, Conversation, MemoryType, User } from '@/types';
import { Plan } from '@/lib/billing/plans';
import { getAgencyCredits, deductCredits, type CreditAction } from '@/lib/billing/credit-engine';
import { processMessageForGraph } from '@/lib/memory/graph';
import { resolveModelPreference } from '@/lib/ai/model-router';
import { v4 as uuid } from 'uuid';
import { features } from '@/lib/config/features';
import { scanMessage, getBlockResponse, logSecurityEvent } from '@/lib/security/prompt-injection';
import { truncateHistory } from '@/lib/ai/truncate';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  // Route through Kyra Worker (multi-tenant) when enabled — takes priority
  if (features.useWorker) {
    const { POST: workerHandler } = await import('./worker/route');
    return workerHandler(request);
  }

  // Route through OpenClaw Gateway (legacy Mac mini tunnel) when enabled
  if (features.useOpenClaw) {
    const { POST: openclawHandler } = await import('./openclaw/route');
    return openclawHandler(request);
  }
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return new Response('Unauthorized', { status: 401, headers: CORS });
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
        return new Response('Failed to create user profile', { status: 500, headers: CORS });
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

    // Look up agency for unified credit system
    const plan = (user.plan || 'free') as Plan;
    const { data: agencyMember } = await serviceClient
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();
    const agencyId = agencyMember?.agency_id;

    // Check credits via unified agency_credits system
    let currentUsage = 0;
    let limit = 999999; // No hard limit — credits are balance-based
    if (agencyId) {
      const credits = await getAgencyCredits(agencyId);
      currentUsage = credits.lifetimeUsed;
      limit = credits.balance + credits.lifetimeUsed; // total capacity

      if (credits.balance <= 0) {
        return new Response(
          JSON.stringify({
            error: 'Insufficient credits',
            message: 'You\'ve used all your credits. Add more credits to continue chatting.',
            balance: credits.balance,
            buyUrl: '/agency/credits',
          }),
          {
            status: 402,
            headers: { 'Content-Type': 'application/json', ...CORS },
          }
        );
      }
    }

    const { message, conversation_id, image_url, file_ids } = (await request.json()) as any;

    if ((!message || typeof message !== 'string') && (!file_ids || file_ids.length === 0)) {
      return new Response('Message is required', { status: 400, headers: CORS });
    }

    // ── Prompt Injection Defense ─────────────────────────────────────────
    if (message && typeof message === 'string') {
      const scan = scanMessage(message);
      logSecurityEvent(authUser.id, message, scan);
      if (!scan.allowed) {
        // Return a 200 with a safe redirect response so the client UX stays intact
        const safeReply = getBlockResponse();
        const encoder2 = new TextEncoder();
        const blockedStream = new ReadableStream({
          start(ctrl) {
            ctrl.enqueue(encoder2.encode(`data: ${JSON.stringify({ type: 'content', content: safeReply })}\n\n`));
            ctrl.enqueue(encoder2.encode('data: [DONE]\n\n'));
            ctrl.close();
          },
        });
        return new Response(blockedStream, {
          headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', ...CORS },
        });
      }
    }
    // ────────────────────────────────────────────────────────────────────

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
        return new Response('Failed to create conversation', { status: 500, headers: CORS });
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
        return new Response('Conversation not found', { status: 404, headers: CORS });
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

    // Run context-gathering in parallel for speed
    const [memories, { data: pendingReminders }, calendarResult, graphResult, { data: userSkills }] = await Promise.all([
      // Search relevant memories
      searchMemories(authUser.id, message, 5).catch(err => {
        console.error('Memory search error:', err);
        return [];
      }),
      // Get pending reminders
      serviceClient
        .from('reminders')
        .select('id, content, due_at')
        .eq('user_id', authUser.id)
        .eq('delivered', false)
        .order('due_at', { ascending: true })
        .limit(10),
      // Get today's calendar events if Google is connected
      (async () => {
        try {
          const googleConnected = await isGoogleConnected(authUser.id);
          if (googleConnected) {
            const events = await getTodayEvents(authUser.id);
            return events.map(e => ({
              summary: e.summary,
              start: e.start,
              end: e.end,
              location: e.location,
            }));
          }
        } catch (calError) {
          console.error('Failed to fetch calendar events:', calError);
        }
        return [] as CalendarEvent[];
      })(),
      // Memory graph context
      processMessageForGraph(authUser.id, message).catch(err => {
        console.error('Graph processing error:', err);
        return '';
      }),
      // Fetch user's enabled skills
      serviceClient
        .from('user_skills')
        .select('skill_id')
        .eq('user_id', authUser.id)
        .eq('enabled', true),
    ]);

    const reminders: Reminder[] = (pendingReminders || []).map(r => ({
      id: r.id,
      content: r.content,
      due_at: r.due_at,
    }));

    const calendarEvents: CalendarEvent[] = calendarResult;
    const graphContext: string = graphResult;
    const enabledSkillIds = (userSkills || []).map((s: any) => s.skill_id as string);

    // Check if user has tool-capable skills enabled
    const toolDefs = getToolDefinitions(enabledSkillIds);
    const hasToolSkills = toolDefs.length > 0;

    // Pre-flight tool augmentation (fallback when no tool skills enabled)
    // When tool skills ARE enabled, Claude decides when to search via tool_use
    let toolContext = '';
    let searchSourcesBlock = '';

    if (!hasToolSkills) {
      // Check for URLs in the message and fetch content
      const urls = extractUrls(message);
      if (urls.length > 0) {
        const fetchPromises = urls.slice(0, 3).map(url => simpleFetch(url, 8000));
        const fetchedContents = await Promise.all(fetchPromises);

        for (const content of fetchedContents) {
          if (!content.error) {
            toolContext += '\n\n---\n' + formatFetchedContent(content);
          }
        }
      }

      // Check if message needs web search (only if no URLs found)
      if (urls.length === 0 && needsWebSearch(message)) {
        const query = extractSearchQuery(message);
        const searchResults = await webSearch(query, { count: 5 });

        if (searchResults.results.length > 0) {
          toolContext += '\n\n---\n' + formatSearchResults(searchResults);
          searchSourcesBlock = `\n[SEARCH_SOURCES]${JSON.stringify({
            query: searchResults.query,
            sources: searchResults.results.map(r => ({ title: r.title, url: r.url, description: r.description })),
          })}[/SEARCH_SOURCES]`;
        }
      }
    }

    // Fetch attached file metadata for context injection
    let fileContext = '';
    if (Array.isArray(file_ids) && file_ids.length > 0) {
      const { data: attachedFiles } = await serviceClient
        .from('user_files')
        .select('id, name, mime_type, size_bytes')
        .in('id', file_ids)
        .eq('user_id', authUser.id);

      if (attachedFiles && attachedFiles.length > 0) {
        const fileList = attachedFiles
          .map(f => `- ${f.name} (id: ${f.id}, type: ${f.mime_type || 'unknown'}, ${f.size_bytes ? Math.round(f.size_bytes / 1024) + 'KB' : 'unknown size'})`)
          .join('\n');
        fileContext = `\n\n[ATTACHED FILES]\nThe user attached the following files. Use the read_file tool to read their contents when needed.\n${fileList}\n[/ATTACHED FILES]`;
      }
    }

    // Build augmented message if we have pre-flight tool results or files
    let augmentedMessage = message || '';
    if (toolContext) {
      augmentedMessage += `\n\n[CONTEXT FROM TOOLS]${toolContext}\n[/CONTEXT FROM TOOLS]`;
    }
    if (fileContext) {
      augmentedMessage += fileContext;
    }

    // Build custom instructions from user profile
    const customInstructions = {
      knowledge: (user as any).custom_instructions_knowledge || (user as any).settings?.custom_instructions_knowledge || undefined,
      style: (user as any).custom_instructions_style || (user as any).settings?.custom_instructions_style || undefined,
    };

    let systemPrompt = getSystemPrompt(memories, reminders, calendarEvents, customInstructions);

    // Inject skills prompt when user has skills enabled
    if (enabledSkillIds.length > 0) {
      systemPrompt += '\n\n' + buildSkillsPrompt(enabledSkillIds);
    }

    // Inject memory graph context
    if (graphContext) {
      systemPrompt += `\n\n## Deep Memory Graph\n${graphContext}`;
    }

    // Route to optimal model — respects user preference, falls back to smart routing
    const userModelPref = (user as any).settings?.preferred_model;
    const modelConfig = resolveModelPreference(userModelPref, message, history.length);


    // Determine action type and credit cost
    const messageUrls = extractUrls(message);
    const hasWebSearch = messageUrls.length === 0 && needsWebSearch(message);
    const hasUrls = messageUrls.length > 0;
    const hasFileAnalysis = /\b(analyze|analyse|review|summarize|summarise)\b.*\b(file|document|pdf)\b/i.test(message);
    const hasImageAnalysis = !!image_url;
    const hasDeepResearch = /\b(deep research|in-depth research|thorough research|research report)\b/i.test(message);

    // Map to unified credit action
    let creditAction: CreditAction = 'chat.message';
    if (hasDeepResearch) creditAction = 'chat.deep_research';
    else if (hasImageAnalysis) creditAction = 'chat.image_analysis';
    else if (hasFileAnalysis) creditAction = 'chat.file_analysis';
    else if (hasWebSearch || hasUrls || hasToolSkills) creditAction = 'chat.web_search';
    const creditCost = 1; // Will be determined by deductCredits

    // Deduct credits via unified engine
    if (agencyId) {
      await deductCredits(agencyId, creditAction, {
        description: `Chat: ${message.slice(0, 80)}`,
      });
    }

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
              usage: currentUsage + creditCost,
              limit,
              plan,
              creditCost,
            })}\n\n`)
          );

          // Build messages for Claude — truncate to prevent context window overflow
          const rawMessages = history.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          }));
          const messagesForClaude = truncateHistory(rawMessages);

          // When an image is attached, build a vision content array
          if (image_url) {
            messagesForClaude.push({
              role: 'user',
              content: [
                { type: 'image', source: { type: 'url', url: image_url } },
                { type: 'text', text: augmentedMessage },
              ] as any,
            });
          } else {
            messagesForClaude.push({ role: 'user', content: augmentedMessage });
          }

          // Stream AI response — use tool-use loop when skills are enabled
          let fullResponse = '';

          if (hasToolSkills) {
            // Claude decides when to call tools; we execute and feed results back
            for await (const event of streamChatWithTools(
              messagesForClaude, systemPrompt, toolDefs, executeToolCall,
              { model: modelConfig.id, maxTokens: modelConfig.maxTokens },
            )) {
              if (event.type === 'text') {
                fullResponse += event.text;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'content', content: event.text })}\n\n`)
                );
              } else if (event.type === 'tool_use') {
                // Notify frontend that a tool is being used (optional UX)
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'tool_use', tool: event.name })}\n\n`)
                );
              }
            }
          } else {
            // Plain streaming (pre-flight context already injected)
            for await (const chunk of streamChat(messagesForClaude, systemPrompt, {
              model: modelConfig.id,
              maxTokens: modelConfig.maxTokens,
            })) {
              fullResponse += chunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`)
              );
            }

            // Append search sources block if we did a pre-flight web search
            if (searchSourcesBlock) {
              fullResponse += searchSourcesBlock;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'content', content: searchSourcesBlock })}\n\n`)
              );
            }
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
              metadata: image_url ? { image_url } : {},
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
              metadata: { model: modelConfig.id, tier: modelConfig.tier },
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
        ...CORS,
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500, headers: CORS });
  }
}

function getNextMonthReset(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}
