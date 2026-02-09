/**
 * Proactive Intelligence Engine
 * 
 * Analyzes user context (memories, calendar, reminders, conversation patterns)
 * and generates proactive insights that Kyra can push to users.
 * 
 * This is THE differentiator. ChatGPT waits. Kyra reaches out.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase/server';
import { getUserMemories } from '@/lib/ai/memory';
import { ProactiveInsight, NotificationType } from '@/types/notifications';
import { User, Memory } from '@/types';

let anthropicInstance: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropicInstance) {
    anthropicInstance = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return anthropicInstance;
}

interface UserContext {
  user: User;
  memories: Memory[];
  recentMessages: { role: string; content: string; created_at: string }[];
  pendingReminders: { content: string; due_at: string }[];
  calendarEvents: { summary: string; start: string; end: string }[];
  lastNotifications: { type: string; title: string; created_at: string }[];
  currentTime: string;
  dayOfWeek: string;
  hourOfDay: number;
}

/**
 * Build full context for a user
 */
export async function buildUserContext(userId: string): Promise<UserContext | null> {
  const supabase = await createServiceClient();
  
  // Get user profile
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (!user) return null;
  
  // Get memories
  const memories = await getUserMemories(userId);
  
  // Get recent messages (last 48h)
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: recentConversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .gte('updated_at', twoDaysAgo)
    .order('updated_at', { ascending: false })
    .limit(5);
  
  let recentMessages: { role: string; content: string; created_at: string }[] = [];
  if (recentConversations && recentConversations.length > 0) {
    const convIds = recentConversations.map(c => c.id);
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })
      .limit(30);
    recentMessages = messages || [];
  }
  
  // Get pending reminders
  const { data: reminders } = await supabase
    .from('reminders')
    .select('content, due_at')
    .eq('user_id', userId)
    .eq('delivered', false)
    .order('due_at', { ascending: true })
    .limit(10);
  
  // Get recent notifications (to avoid duplicates)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentNotifications } = await supabase
    .from('notifications')
    .select('type, title, created_at')
    .eq('user_id', userId)
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false })
    .limit(10);
  
  // Get calendar events (if available via integrations table)
  // For now, we pass empty — will be enriched when Google Calendar is connected
  const calendarEvents: { summary: string; start: string; end: string }[] = [];
  
  const now = new Date();
  const userTz = user.timezone || 'UTC';
  
  return {
    user: user as User,
    memories,
    recentMessages,
    pendingReminders: reminders || [],
    calendarEvents,
    lastNotifications: recentNotifications || [],
    currentTime: now.toLocaleString('en-US', { timeZone: userTz }),
    dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long', timeZone: userTz }),
    hourOfDay: parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: userTz })),
  };
}

/**
 * Generate proactive insights for a user using Claude
 */
export async function generateInsights(context: UserContext): Promise<ProactiveInsight[]> {
  // Don't bother users at odd hours
  if (context.hourOfDay < 7 || context.hourOfDay > 22) {
    return [];
  }
  
  // Don't send more than 3 notifications per day
  if (context.lastNotifications.length >= 3) {
    return [];
  }
  
  // Need at least some context to be useful
  if (context.memories.length === 0 && context.recentMessages.length === 0) {
    return [];
  }
  
  const anthropic = getAnthropic();
  
  const memoryContext = context.memories.slice(0, 20).map(m => 
    `[${m.type}] ${m.content} (saved: ${new Date(m.created_at).toLocaleDateString()})`
  ).join('\n');
  
  const messageContext = context.recentMessages.slice(0, 15).map(m =>
    `[${m.role}] ${m.content.substring(0, 200)}`
  ).join('\n');
  
  const reminderContext = context.pendingReminders.map(r =>
    `- ${r.content} (due: ${new Date(r.due_at).toLocaleString()})`
  ).join('\n') || 'None';
  
  const calendarContext = context.calendarEvents.map(e =>
    `- ${e.summary} (${e.start} - ${e.end})`
  ).join('\n') || 'No events / calendar not connected';
  
  const recentNotifContext = context.lastNotifications.map(n =>
    `- [${n.type}] ${n.title}`
  ).join('\n') || 'None sent today';

  const prompt = `You are Kyra's proactive intelligence engine. Your job is to analyze a user's context and decide if there's something genuinely valuable to proactively tell them RIGHT NOW.

## Current Context
- Time: ${context.currentTime} (${context.dayOfWeek})
- User: ${context.user.name || context.user.email}
- Timezone: ${context.user.timezone || 'UTC'}

## User's Memories
${memoryContext || 'No memories yet'}

## Recent Conversations (last 48h)
${messageContext || 'No recent conversations'}

## Pending Reminders
${reminderContext}

## Today's Calendar
${calendarContext}

## Already Sent Today
${recentNotifContext}

## Your Task
Decide if there's a proactive insight worth sending. Consider:

1. **Follow-ups**: Did they mention a goal, deadline, or task that needs checking in on?
2. **Calendar prep**: Is there an upcoming event they should prepare for?
3. **Pattern recognition**: Based on their memories/conversations, is there a connection or insight they'd appreciate?
4. **Gentle nudges**: Have they been working toward something that needs encouragement?
5. **Timing relevance**: Is now the right time for this insight? (Monday morning = weekly planning, Friday = week recap, etc.)

## Rules
- ONLY suggest insights that are genuinely useful. No filler.
- Don't repeat topics from "Already Sent Today"
- Be specific — reference actual memories and conversations
- Keep it concise — 1-2 sentences for content
- Maximum 2 insights per check
- If nothing is truly worth sending, return empty array
- The user should feel like Kyra "gets" them, not that they're being spammed

## Output Format
Return a JSON array (can be empty). Each item:
{
  "type": "insight" | "reminder_followup" | "calendar_prep" | "nudge" | "pattern_alert",
  "title": "Short attention-grabbing title",
  "content": "1-2 sentence insight or nudge",
  "priority": "low" | "normal" | "high",
  "action_label": "Optional CTA button text like 'Let's discuss' or 'Review now'",
  "trigger_reason": "Why you're suggesting this (for debugging)"
}

Return ONLY the JSON array, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    
    const insights: ProactiveInsight[] = JSON.parse(jsonMatch[0]);
    
    // Validate and enrich
    return insights.slice(0, 2).map(insight => ({
      ...insight,
      type: (insight.type || 'insight') as NotificationType,
      priority: insight.priority || 'normal',
      action_url: insight.action_label ? `/chat?prompt=${encodeURIComponent(insight.content)}` : undefined,
      trigger_reason: insight.trigger_reason || 'proactive_engine',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
    }));
  } catch (error) {
    console.error('Proactive engine error:', error);
    return [];
  }
}

/**
 * Save insights as notifications
 */
export async function saveInsights(userId: string, insights: ProactiveInsight[]): Promise<void> {
  if (insights.length === 0) return;
  
  const supabase = await createServiceClient();
  
  const rows = insights.map(insight => ({
    user_id: userId,
    type: insight.type,
    title: insight.title,
    content: insight.content,
    priority: insight.priority,
    action_url: insight.action_url || null,
    action_label: insight.action_label || null,
    trigger_reason: insight.trigger_reason,
    expires_at: insight.expires_at || null,
    metadata: {},
  }));
  
  const { error } = await supabase.from('notifications').insert(rows);
  
  if (error) {
    console.error('Failed to save notifications:', error);
  }
}

/**
 * Run the full proactive check for a single user
 */
export async function runProactiveCheck(userId: string): Promise<ProactiveInsight[]> {
  const context = await buildUserContext(userId);
  if (!context) return [];
  
  const insights = await generateInsights(context);
  await saveInsights(userId, insights);
  
  return insights;
}

/**
 * Run proactive checks for all active users
 */
export async function runProactiveCheckAll(): Promise<{ userId: string; insights: ProactiveInsight[] }[]> {
  const supabase = await createServiceClient();
  
  // Get users who have been active in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: activeUsers } = await supabase
    .from('users')
    .select('id')
    .gte('updated_at', sevenDaysAgo);
  
  if (!activeUsers || activeUsers.length === 0) return [];
  
  const results: { userId: string; insights: ProactiveInsight[] }[] = [];
  
  // Process users sequentially to avoid rate limits
  for (const user of activeUsers) {
    try {
      const insights = await runProactiveCheck(user.id);
      if (insights.length > 0) {
        results.push({ userId: user.id, insights });
      }
    } catch (error) {
      console.error(`Proactive check failed for user ${user.id}:`, error);
    }
  }
  
  return results;
}
