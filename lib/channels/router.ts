import { createClient } from '@supabase/supabase-js';
import type { ChannelType } from '@/types/channels';
import { features } from '@/lib/config/features';

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

  // Route through kyra-worker if enabled
  if (features.useWorker) {
    const WORKER_URL = process.env.KYRA_WORKER_URL;
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

  // Call Claude (fallback)
  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are Kyra, a helpful personal AI assistant. You remember past conversations and help with anything the user needs. Be friendly, concise, and helpful. The user's name is ${user.name || 'there'}.`,
      messages,
    }),
  });

  if (!claudeResponse.ok) {
    const err = await claudeResponse.text();
    console.error(`[channel-router] Claude API error:`, claudeResponse.status, err);
    throw new Error('AI response failed');
  }

  const claudeData = await claudeResponse.json() as any;
  const responseText = claudeData.content?.[0]?.text || "I couldn't generate a response.";

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
