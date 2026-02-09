import { Memory } from '@/types';

export interface Reminder {
  id: string;
  content: string;
  due_at: string;
}

export interface CalendarEvent {
  summary: string;
  start: Date;
  end: Date;
  location?: string;
}

export function getSystemPrompt(
  memories: Memory[], 
  reminders?: Reminder[],
  calendarEvents?: CalendarEvent[]
): string {
  const memoryContext = memories.length > 0 
    ? memories.map(m => `- [${m.type}] ${m.content}`).join('\n')
    : 'No memories stored yet.';

  const reminderContext = reminders && reminders.length > 0
    ? reminders.map(r => {
        const due = new Date(r.due_at);
        const relative = getRelativeTime(due);
        return `- "${r.content}" — ${relative}`;
      }).join('\n')
    : 'No pending reminders.';

  const calendarContext = calendarEvents && calendarEvents.length > 0
    ? calendarEvents.map(e => {
        const startTime = e.start.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        const endTime = e.end.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        return `- ${startTime} - ${endTime}: ${e.summary}${e.location ? ` (at ${e.location})` : ''}`;
      }).join('\n')
    : 'No events today (or calendar not connected).';

  return `You are Kyra, a personal AI assistant. You are helpful, proactive, and you remember everything the user tells you. You can also set reminders.

## Memory — CRITICAL
You MUST use SAVE_MEMORY tags whenever the user shares personal info, preferences, facts about themselves, or says "remember". This is how your memory works — without the tag, NOTHING is saved. Never just say "I'll remember that" without the tag.

Format (include this EXACTLY in your response):
[SAVE_MEMORY: type=<type>] <content to remember> [/SAVE_MEMORY]

Types: fact, person, decision, event, preference

Example: "Got it! I'll remember that you prefer morning meetings. [SAVE_MEMORY: type=preference] User prefers morning meetings [/SAVE_MEMORY]"

NEVER acknowledge remembering something without including the [SAVE_MEMORY] tag. The tag is invisible to the user but required for storage.

## Reminders — CRITICAL
When the user asks you to remind them of something, you MUST include the tag below. Without it, no reminder is set:
[SET_REMINDER: due=<ISO timestamp>] <what to remind them about> [/SET_REMINDER]

Examples:
- "Remind me to call mom in 2 hours" → [SET_REMINDER: due=${getFutureISO(2, 'hours')}] Call mom [/SET_REMINDER]
- "Remind me tomorrow at 9am to submit the report" → [SET_REMINDER: due=${getTomorrowAt(9)}] Submit the report [/SET_REMINDER]

Always confirm you've set the reminder with a human-readable time.

## Current context

### User memories:
${memoryContext}

### Pending reminders:
${reminderContext}

### Today's calendar:
${calendarContext}

## Tools Available
You have access to:
- **Web Search**: When asked about current events, news, or things requiring recent info, search results will be provided in [CONTEXT FROM TOOLS]
- **URL Reading**: When the user shares a URL, the content will be fetched and provided to you
- When you receive tool context, use it to give accurate, up-to-date answers with source citations

## Personality
- Be conversational and warm, not robotic
- Reference memories naturally when relevant
- Keep responses concise unless detail is requested
- When using web search results, cite your sources
- If you don't know something and no search results are available, say so

IMPORTANT: Memory and reminder tags will be processed and hidden from the user.`;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMins < 0) return 'overdue';
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `in ${diffMins} minutes`;
  if (diffHours < 24) return `in ${diffHours} hours`;
  if (diffDays === 1) return 'tomorrow';
  if (diffDays < 7) return `in ${diffDays} days`;
  return date.toLocaleDateString();
}

function getFutureISO(amount: number, unit: 'hours' | 'minutes' | 'days'): string {
  const now = new Date();
  if (unit === 'hours') now.setHours(now.getHours() + amount);
  if (unit === 'minutes') now.setMinutes(now.getMinutes() + amount);
  if (unit === 'days') now.setDate(now.getDate() + amount);
  return now.toISOString();
}

function getTomorrowAt(hour: number): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(hour, 0, 0, 0);
  return tomorrow.toISOString();
}

export function formatMessagesForClaude(
  messages: { role: string; content: string }[],
  systemPrompt: string
) {
  return {
    system: systemPrompt,
    messages: messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  };
}

// Extract memory and reminder commands from assistant response
export function extractCommands(response: string): {
  cleanResponse: string;
  memories: { type: string; content: string }[];
  reminders: { due_at: string; content: string }[];
} {
  const memoryRegex = /\[SAVE_MEMORY:\s*type=(\w+)\]\s*([\s\S]*?)\s*\[\/SAVE_MEMORY\]/g;
  const reminderRegex = /\[SET_REMINDER:\s*due=([^\]]+)\]\s*([\s\S]*?)\s*\[\/SET_REMINDER\]/g;
  
  const memories: { type: string; content: string }[] = [];
  const reminders: { due_at: string; content: string }[] = [];
  
  let match;
  while ((match = memoryRegex.exec(response)) !== null) {
    memories.push({
      type: match[1],
      content: match[2].trim(),
    });
  }
  
  while ((match = reminderRegex.exec(response)) !== null) {
    reminders.push({
      due_at: match[1].trim(),
      content: match[2].trim(),
    });
  }
  
  // Remove all tags from the response
  let cleanResponse = response
    .replace(memoryRegex, '')
    .replace(reminderRegex, '')
    .trim();
  
  // Clean up any double spaces or newlines left behind
  cleanResponse = cleanResponse.replace(/\n{3,}/g, '\n\n').replace(/  +/g, ' ');
  
  return { cleanResponse, memories, reminders };
}

// Legacy function for backwards compatibility
export function extractMemoryCommands(response: string): {
  cleanResponse: string;
  memories: { type: string; content: string }[];
} {
  const { cleanResponse, memories } = extractCommands(response);
  return { cleanResponse, memories };
}
