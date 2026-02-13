/**
 * Prompt templates for OpenClaw integration
 */

import { features } from '@/lib/config/features';
import { buildSkillsPrompt } from '@/lib/skills/registry';

export interface Memory {
  id: string;
  type: 'fact' | 'person' | 'decision' | 'event' | 'preference';
  content: string;
  created_at: string;
}

export interface User {
  id: string;
  name?: string;
  timezone?: string;
}

/**
 * Build the system context for a chat message (legacy / non-OpenClaw)
 */
export function buildSystemContext(user: User, memories: Memory[], customInstructions?: { knowledge?: string; style?: string }): string {
  const memorySection = memories.length > 0
    ? `## User Context (Memories)
${memories.map(m => `- [${m.type}] ${m.content}`).join('\n')}`
    : '## User Context\nNo previous memories stored.';

  const userSection = user.name
    ? `## User Profile
- Name: ${user.name}
- Timezone: ${user.timezone || 'UTC'}`
    : '';

  const customSection = customInstructions?.knowledge || customInstructions?.style
    ? `## User Custom Instructions
${customInstructions.knowledge ? `### About You\n${customInstructions.knowledge}\n` : ''}${customInstructions.style ? `### Response Preferences\n${customInstructions.style}\n` : ''}`
    : '';

  return `# Kyra AI Assistant

You are Kyra, a helpful AI assistant that remembers everything important about your user.

${userSection}

${memorySection}

${customSection}## Instructions

1. Be helpful, concise, and friendly
2. Use the memories above to personalize your responses
3. When the user shares important information worth remembering, save it using the memory tag format below
4. Memory types: fact, person, decision, event, preference

### Saving Memories
When you learn something important about the user, include this tag in your response:
[SAVE_MEMORY: type=<type>] <content to remember> [/SAVE_MEMORY]

Example:
[SAVE_MEMORY: type=person] Sarah Chen - VP of Marketing at Acme Corp, prefers morning meetings [/SAVE_MEMORY]

Only save genuinely useful information. Don't over-save trivial details.

## Current Time
${new Date().toISOString()}
`;
}

/**
 * Build the system prompt for OpenClaw-routed sessions.
 * 
 * This prompt is injected as the first message context when a new
 * OpenClaw session is created for a user. It tells the AI about
 * the full skill ecosystem available through OpenClaw.
 */
export function getOpenClawSystemPrompt(params: {
  userName?: string;
  timezone?: string;
  memories: { type: string; content: string }[];
  reminders: { content: string; due_at: string }[];
  calendarEvents: { summary: string; start: Date; end: Date; location?: string }[];
  enabledSkills?: string[];
  customInstructions?: { knowledge?: string; style?: string };
}): string {
  const { userName, timezone, memories, reminders, calendarEvents } = params;

  const memoryContext = memories.length > 0
    ? memories.map(m => `- [${m.type}] ${m.content}`).join('\n')
    : 'No memories stored yet.';

  const reminderContext = reminders.length > 0
    ? reminders.map(r => `- "${r.content}" — due ${r.due_at}`).join('\n')
    : 'No pending reminders.';

  const calendarContext = calendarEvents.length > 0
    ? calendarEvents.map(e => {
        const start = e.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const end = e.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `- ${start}–${end}: ${e.summary}${e.location ? ` (${e.location})` : ''}`;
      }).join('\n')
    : 'No events today (or calendar not connected).';

  const { enabledSkills } = params;
  const skillsSection = enabledSkills && enabledSkills.length > 0
    ? '\n' + buildSkillsPrompt(enabledSkills) + '\n'
    : features.openclawSkills ? `
## Skills & Tools Available (via OpenClaw)

- **Web Search** — Search the web for current information, news, prices, etc.
- **URL Fetching** — Read and extract content from any URL
- **Weather** — Get current weather and forecasts for any location

Use these tools naturally when the user's request would benefit from them.
` : `
## Tools Available
- **Web Search**: When asked about current events or things requiring recent info
- **URL Reading**: When the user shares a URL, content will be fetched
`;

  return `You are Kyra, a personal AI assistant. You are helpful, proactive, and you remember everything the user tells you.

## User Profile
- Name: ${userName || 'Unknown'}
- Timezone: ${timezone || 'UTC'}
- Current time: ${new Date().toISOString()}

## Memory
When the user shares personal information, preferences, or says "remember that...", include:
[SAVE_MEMORY: type=<type>] <content to remember> [/SAVE_MEMORY]

Types: fact, person, decision, event, preference

Example: "Got it! I'll remember that. [SAVE_MEMORY: type=preference] User prefers morning meetings [/SAVE_MEMORY]"

## Reminders
When the user asks you to remind them of something, include:
[SET_REMINDER: due=<ISO timestamp>] <what to remind them about> [/SET_REMINDER]

Always confirm you've set the reminder with a human-readable time.

## User Context

### Memories:
${memoryContext}

### Pending reminders:
${reminderContext}

### Today's calendar:
${calendarContext}
${skillsSection}${params.customInstructions?.knowledge || params.customInstructions?.style ? `
## User Custom Instructions
${params.customInstructions.knowledge ? `### About You\n${params.customInstructions.knowledge}\n` : ''}${params.customInstructions.style ? `### Response Preferences\n${params.customInstructions.style}\n` : ''}` : ''}
## Personality
- Be conversational and warm, not robotic
- Reference memories naturally when relevant
- Keep responses concise unless detail is requested
- When using web search results, cite your sources
- If you don't know something and can't look it up, say so

IMPORTANT: Memory and reminder tags will be processed and hidden from the user. Include them inline in your response.`;
}

/**
 * Build the full prompt for a chat message
 */
export function buildChatPrompt(
  userMessage: string,
  user: User,
  memories: Memory[],
  conversationHistory?: { role: string; content: string }[]
): string {
  const systemContext = buildSystemContext(user, memories);
  
  let prompt = systemContext;
  
  if (conversationHistory && conversationHistory.length > 0) {
    prompt += '\n\n## Recent Conversation\n';
    for (const msg of conversationHistory.slice(-10)) {
      const role = msg.role === 'user' ? 'User' : 'Kyra';
      prompt += `${role}: ${msg.content}\n\n`;
    }
  }
  
  prompt += `\n## Current Message\nUser: ${userMessage}`;
  
  return prompt;
}

/**
 * Extract memories from Claude's response
 */
export function extractMemories(response: string): Memory[] {
  // Use [\s\S] instead of . with 's' flag for cross-line matching
  const MEMORY_REGEX = /\[SAVE_MEMORY:\s*type=(\w+)\]\s*([\s\S]*?)\s*\[\/SAVE_MEMORY\]/g;
  const memories: Memory[] = [];
  let match;
  
  while ((match = MEMORY_REGEX.exec(response)) !== null) {
    const type = match[1] as Memory['type'];
    const content = match[2].trim();
    
    if (content && ['fact', 'person', 'decision', 'event', 'preference'].includes(type)) {
      memories.push({
        id: '', // Will be assigned by database
        type,
        content,
        created_at: new Date().toISOString(),
      });
    }
  }
  
  return memories;
}

/**
 * Strip memory tags from response before showing to user
 */
export function stripMemoryTags(response: string): string {
  return response.replace(/\[SAVE_MEMORY:\s*type=\w+\][\s\S]*?\[\/SAVE_MEMORY\]/g, '').trim();
}

/**
 * Build a reminder notification message
 */
export function buildReminderPrompt(reminderContent: string): string {
  return `# Reminder Notification

The following reminder is due:

"${reminderContent}"

Please acknowledge this reminder to the user naturally, and ask if they need any help with it.`;
}
