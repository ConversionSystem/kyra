import { createClient } from '@supabase/supabase-js';
import type { ChannelType } from '@/types/channels';
import { features } from '@/lib/config/features';
import { searchMemories } from '@/lib/ai/memory';
import { getSystemPrompt, CalendarEvent } from '@/lib/ai/prompts';
import { buildSkillsPrompt } from '@/lib/skills/registry';
import { getToolDefinitions, executeToolCall } from '@/lib/tools/definitions';
import { resolveModelPreference } from '@/lib/ai/model-router';
import { resolveGatewayUrl } from '@/lib/openclaw/gateway-resolver';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/**
 * Shared channel message processor.
 * Both Telegram and WhatsApp webhooks route through here.
 */
export async function processChannelMessage(
  userId: string,
  text: string,
  channelType: ChannelType,
  channelMessageId?: string
): Promise<string> {
  const supabase = getSupabase();

  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('id, email, name, plan, usage_this_month')
    .eq('id', userId)
    .single();

  if (!user) {
    throw new Error('User not found');
  }

  // Find or create conversation — use a single conversation per user across channels
  const { data: existingConv } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', user.id)
    .in('channel', ['telegram', 'whatsapp', 'discord', 'web'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  let conversationId: string;
  if (existingConv) {
    conversationId = existingConv.id;
  } else {
    conversationId = crypto.randomUUID();
    await supabase.from('conversations').insert({
      id: conversationId,
      user_id: user.id,
      title: `${channelType} conversation`,
      channel: channelType,
    });
  }

  // Get history
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(15);

  const messages = (history || []).map((m: any) => ({
    role: m.role,
    content: m.content,
  }));
  messages.push({ role: 'user', content: text });

  // Route through the user's agency gateway if enabled
  if (features.useWorker) {
    const resolved = await resolveGatewayUrl(userId);
    const WORKER_URL = resolved?.url;
    const API_SECRET = process.env.KYRA_API_SECRET;

    if (WORKER_URL && API_SECRET) {
      try {
        // Ensure workspace is initialized
        try {
          await fetch(`${WORKER_URL}/api/kyra/init`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${API_SECRET}`,
              'X-Kyra-User-Id': userId,
            },
            body: JSON.stringify({ userName: user?.name }),
            signal: AbortSignal.timeout(10_000),
          });
        } catch (e) {
          console.error('[channel-router] Init error (non-fatal):', e);
        }

        // Build system context with history
        const historyText = messages
          .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
          .join('\n');
        const systemContext = `You are Kyra, a helpful personal AI assistant. The user's name is ${user.name || 'there'}. Channel: ${channelType}.\n\nRecent conversation:\n${historyText}`;

        const response = await fetch(`${WORKER_URL}/api/kyra/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_SECRET}`,
            'X-Kyra-User-Id': userId,
          },
          body: JSON.stringify({ message: text, systemContext }),
          signal: AbortSignal.timeout(60_000),
        });

        if (response.ok) {
          // Parse SSE response
          const responseBody = await response.text();
          let fullResponse = '';
          for (const line of responseBody.split('\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  fullResponse += parsed.choices[0].delta.content;
                } else if (parsed.choices?.[0]?.message?.content) {
                  fullResponse += parsed.choices[0].message.content;
                }
              } catch {}
            }
          }

          if (fullResponse) {
            // Save messages to DB
            await supabase.from('messages').insert([
              {
                id: crypto.randomUUID(),
                conversation_id: conversationId,
                role: 'user',
                content: text,
                metadata: { channel: channelType, channelMessageId },
              },
              {
                id: crypto.randomUUID(),
                conversation_id: conversationId,
                role: 'assistant',
                content: fullResponse,
                metadata: { model: 'worker', channel: channelType },
              },
            ]);

            await supabase
              .from('conversations')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', conversationId);

            return fullResponse;
          }
        }
        // Fall through to Claude if worker failed
        console.warn('[channel-router] Worker failed, falling back to Claude');
      } catch (e) {
        console.error('[channel-router] Worker error, falling back to Claude:', e);
      }
    }
  }

  // Build full context: memories, skills, custom instructions, model preference
  const [memories, { data: userSkills }, { data: pendingReminders }] = await Promise.all([
    searchMemories(userId, text, 5).catch(() => []),
    supabase.from('user_skills').select('skill_id').eq('user_id', userId).eq('enabled', true),
    supabase.from('reminders').select('id, content, due_at').eq('user_id', userId).eq('delivered', false).order('due_at', { ascending: true }).limit(5),
  ]);

  const enabledSkillIds = (userSkills || []).map((s: any) => s.skill_id);
  const customInstructions = {
    knowledge: (user as any).custom_instructions_knowledge || (user as any).settings?.custom_instructions_knowledge || undefined,
    style: (user as any).custom_instructions_style || (user as any).settings?.custom_instructions_style || undefined,
  };
  const reminders = (pendingReminders || []).map((r: any) => ({ id: r.id, content: r.content, due_at: r.due_at }));

  let systemPrompt = getSystemPrompt(memories, reminders, [] as CalendarEvent[], customInstructions);
  if (enabledSkillIds.length > 0) {
    systemPrompt += '\n\n' + buildSkillsPrompt(enabledSkillIds);
  }
  systemPrompt += `\n\nChannel: ${channelType}. Keep responses concise — this is a messaging app.`;

  // Resolve model preference
  const userModelPref = (user as any).settings?.preferred_model;
  const modelConfig = resolveModelPreference(userModelPref, text, messages.length);

  // Call Claude with full context + tools if skills enabled
  const claudeBody: any = {
    model: modelConfig.id || 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  };

  // Add tools if user has skills enabled
  if (enabledSkillIds.length > 0) {
    const tools = getToolDefinitions(enabledSkillIds);
    if (tools.length > 0) {
      claudeBody.tools = tools;
    }
  }

  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(claudeBody),
  });

  if (!claudeResponse.ok) {
    const err = await claudeResponse.text();
    console.error(`[channel-router] Claude API error:`, claudeResponse.status, err);
    throw new Error('AI response failed');
  }

  const claudeData = await claudeResponse.json() as any;

  // Handle tool use responses (single round)
  let responseText = '';
  const contentBlocks = claudeData.content || [];

  if (claudeData.stop_reason === 'tool_use') {
    // Execute tool calls and send results back
    const toolResults: any[] = [];
    for (const block of contentBlocks) {
      if (block.type === 'tool_use') {
        try {
          const result = await executeToolCall(block.name, block.input);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: typeof result === 'string' ? result : JSON.stringify(result) });
        } catch (e: any) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${e.message}`, is_error: true });
        }
      }
    }

    // Second call with tool results
    const followUp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelConfig.id || 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [...messages, { role: 'assistant', content: contentBlocks }, { role: 'user', content: toolResults }],
      }),
    });

    if (followUp.ok) {
      const followUpData = await followUp.json() as any;
      responseText = followUpData.content?.find((b: any) => b.type === 'text')?.text || "I couldn't generate a response.";
    }
  } else {
    responseText = contentBlocks.find((b: any) => b.type === 'text')?.text || "I couldn't generate a response.";
  }

  // Save messages
  await supabase.from('messages').insert([
    {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: 'user',
      content: text,
      metadata: { channel: channelType, channelMessageId },
    },
    {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: 'assistant',
      content: responseText,
      metadata: { model: 'claude-sonnet-4', channel: channelType },
    },
  ]);

  await supabase.from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return responseText;
}
