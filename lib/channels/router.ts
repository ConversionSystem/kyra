/**
 * Channel Router — Normalize inbound messages from any channel,
 * route through Kyra's brain, and format responses for each channel.
 * 
 * The key insight: the AI layer is channel-agnostic. 
 * Adapters handle the platform-specific translation.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { chat } from '@/lib/ai/claude';
import { searchMemories, saveMemory } from '@/lib/ai/memory';
import { getSystemPrompt, extractCommands, Reminder } from '@/lib/ai/prompts';
import { ChannelMessage, ChannelResponse, ChannelType } from '@/types/channels';
import { Memory, MemoryType, User } from '@/types';
import { v4 as uuid } from 'uuid';

/**
 * Look up a Kyra user from a channel identifier
 */
export async function resolveUser(
  channelType: ChannelType,
  channelUserId: string
): Promise<User | null> {
  const supabase = await createServiceClient();
  
  const { data: link } = await supabase
    .from('user_channels')
    .select('user_id')
    .eq('channel_type', channelType)
    .eq('channel_user_id', channelUserId)
    .eq('verified', true)
    .single();
  
  if (!link) return null;
  
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', link.user_id)
    .single();
  
  return user as User | null;
}

/**
 * Process an inbound message from any channel
 */
export async function processChannelMessage(
  inbound: ChannelMessage
): Promise<ChannelResponse> {
  const supabase = await createServiceClient();
  
  // Resolve user
  const user = await resolveUser(inbound.channelType, inbound.channelUserId);
  
  if (!user) {
    return {
      text: "Hi! I'm Kyra. I don't recognize your account yet. Please visit kyra.conversionsystem.com to sign up, then link your messaging account in Settings.",
    };
  }
  
  // Get or create conversation for this channel
  const { data: existingConv } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', user.id)
    .eq('channel', inbound.channelType)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
  
  let conversationId: string;
  if (existingConv) {
    conversationId = existingConv.id;
  } else {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        id: uuid(),
        user_id: user.id,
        title: `${inbound.channelType} conversation`,
        channel: inbound.channelType,
      })
      .select('id')
      .single();
    conversationId = newConv!.id;
  }
  
  // Get conversation history
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(15);
  
  // Search memories
  const memories = await searchMemories(user.id, inbound.text, 5);
  
  // Get pending reminders
  const { data: reminders } = await supabase
    .from('reminders')
    .select('id, content, due_at')
    .eq('user_id', user.id)
    .eq('delivered', false)
    .order('due_at', { ascending: true })
    .limit(5);
  
  const reminderList: Reminder[] = (reminders || []).map(r => ({
    id: r.id, content: r.content, due_at: r.due_at,
  }));
  
  // Build system prompt
  const systemPrompt = getSystemPrompt(memories, reminderList);
  
  // Call Claude (non-streaming for channel messages)
  const messages = (history || []).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));
  messages.push({ role: 'user', content: inbound.text });
  
  const result = await chat(messages, systemPrompt);
  
  // Extract commands
  const { cleanResponse, memories: memoriesToSave, reminders: remindersToSave } = extractCommands(result.content);
  
  // Save memories
  for (const mem of memoriesToSave) {
    try {
      await saveMemory(user.id, mem.type as MemoryType, mem.content);
    } catch (e) {
      console.error('Failed to save memory from channel:', e);
    }
  }
  
  // Save reminders
  for (const rem of remindersToSave) {
    try {
      await supabase.from('reminders').insert({
        id: uuid(),
        user_id: user.id,
        content: rem.content,
        due_at: rem.due_at,
        channel: inbound.channelType,
        metadata: {},
      });
    } catch (e) {
      console.error('Failed to save reminder from channel:', e);
    }
  }
  
  // Save messages to conversation
  await supabase.from('messages').insert([
    { id: uuid(), conversation_id: conversationId, role: 'user', content: inbound.text, metadata: { channel: inbound.channelType } },
    { id: uuid(), conversation_id: conversationId, role: 'assistant', content: cleanResponse, metadata: { model: 'claude-sonnet-4', channel: inbound.channelType } },
  ]);
  
  // Update conversation timestamp
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);
  
  // Format response for channel (truncate for WhatsApp's 4096 char limit)
  let responseText = cleanResponse;
  if (inbound.channelType === 'whatsapp' && responseText.length > 4000) {
    responseText = responseText.substring(0, 3990) + '...';
  }
  
  return { text: responseText };
}
