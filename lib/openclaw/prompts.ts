/**
 * Prompt templates for OpenClaw integration
 */

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
 * Build the system context for a chat message
 */
export function buildSystemContext(user: User, memories: Memory[]): string {
  const memorySection = memories.length > 0
    ? `## User Context (Memories)
${memories.map(m => `- [${m.type}] ${m.content}`).join('\n')}`
    : '## User Context\nNo previous memories stored.';

  const userSection = user.name
    ? `## User Profile
- Name: ${user.name}
- Timezone: ${user.timezone || 'UTC'}`
    : '';

  return `# Kyra AI Assistant

You are Kyra, a helpful AI assistant that remembers everything important about your user.

${userSection}

${memorySection}

## Instructions

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
