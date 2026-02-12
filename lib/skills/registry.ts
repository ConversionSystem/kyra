/**
 * Kyra Skills Registry
 * 
 * Defines all skills available to Kyra users, their requirements,
 * and which plans can access them.
 */

import { Plan } from '@/lib/billing/plans';

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: 'utility' | 'productivity' | 'integration' | 'ai' | 'media';
  /** Plans that can enable this skill (empty = all plans) */
  requiredPlan: Plan[];
  /** Whether the skill needs a user-provided API key */
  needsApiKey: boolean;
  /** Label for the API key field */
  apiKeyLabel?: string;
  /** Placeholder text for the API key input */
  apiKeyPlaceholder?: string;
  /** OpenClaw tool names this skill provides */
  openclawTools: string[];
  /** Instructions to inject into the system prompt when enabled */
  promptInstructions: string;
  /** Whether this skill is available in Kyra's hosted environment (no native deps) */
  hostedCompatible: boolean;
  /** Credit cost multiplier (1 = normal) */
  creditMultiplier: number;
}

export const SKILLS_REGISTRY: SkillDefinition[] = [
  // ── Utility ────────────────────────────────────────────────────
  {
    id: 'web_search',
    name: 'Web Search',
    description: 'Search the web for current information, news, and answers.',
    icon: '🔍',
    category: 'utility',
    requiredPlan: [],
    needsApiKey: false,
    openclawTools: ['web_search'],
    promptInstructions: 'You can search the web using the web_search tool. Use it when the user asks about current events, prices, news, or anything that needs up-to-date information.',
    hostedCompatible: true,
    creditMultiplier: 2,
  },
  {
    id: 'web_fetch',
    name: 'URL Reader',
    description: 'Read and extract content from any URL or webpage.',
    icon: '🌐',
    category: 'utility',
    requiredPlan: [],
    needsApiKey: false,
    openclawTools: ['web_fetch'],
    promptInstructions: 'You can read any URL using the web_fetch tool. When the user shares a link or asks about webpage content, fetch and summarize it.',
    hostedCompatible: true,
    creditMultiplier: 1,
  },
  {
    id: 'weather',
    name: 'Weather',
    description: 'Get current weather and forecasts for any location.',
    icon: '🌤️',
    category: 'utility',
    requiredPlan: [],
    needsApiKey: false,
    openclawTools: ['web_fetch'],
    promptInstructions: 'You can check weather using wttr.in. When asked about weather, fetch https://wttr.in/{location}?format=j1 and present the forecast clearly.',
    hostedCompatible: true,
    creditMultiplier: 1,
  },
  {
    id: 'summarize',
    name: 'Summarizer',
    description: 'Summarize articles, YouTube videos, podcasts, and documents.',
    icon: '📝',
    category: 'utility',
    requiredPlan: [],
    needsApiKey: false,
    openclawTools: ['web_fetch'],
    promptInstructions: 'You can summarize content from URLs including articles and YouTube videos. Fetch the content and provide concise, structured summaries.',
    hostedCompatible: true,
    creditMultiplier: 2,
  },

  // ── Productivity ───────────────────────────────────────────────
  {
    id: 'github',
    name: 'GitHub',
    description: 'Manage repos, issues, PRs, and code reviews.',
    icon: '🐙',
    category: 'integration',
    requiredPlan: ['starter', 'business', 'max'],
    needsApiKey: true,
    apiKeyLabel: 'GitHub Personal Access Token',
    apiKeyPlaceholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
    openclawTools: ['exec'],
    promptInstructions: 'You have access to GitHub via the gh CLI. You can list repos, create issues, review PRs, check CI status, and more. Use `gh` commands when the user asks about their GitHub projects.',
    hostedCompatible: true,
    creditMultiplier: 2,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Search, create, and update Notion pages and databases.',
    icon: '📓',
    category: 'integration',
    requiredPlan: ['starter', 'business', 'max'],
    needsApiKey: true,
    apiKeyLabel: 'Notion Integration Token',
    apiKeyPlaceholder: 'ntn_xxxxxxxxxxxxxxxxxxxx',
    openclawTools: ['web_fetch'],
    promptInstructions: 'You can interact with Notion using the Notion API. Search pages, create content, and update databases when the user requests.',
    hostedCompatible: true,
    creditMultiplier: 2,
  },
  {
    id: 'trello',
    name: 'Trello',
    description: 'Manage Trello boards, lists, and cards.',
    icon: '📋',
    category: 'integration',
    requiredPlan: ['starter', 'business', 'max'],
    needsApiKey: true,
    apiKeyLabel: 'Trello API Key',
    apiKeyPlaceholder: 'Your Trello API key',
    openclawTools: ['web_fetch'],
    promptInstructions: 'You can manage Trello boards and cards via the Trello API.',
    hostedCompatible: true,
    creditMultiplier: 1,
  },

  // ── AI & Media ─────────────────────────────────────────────────
  {
    id: 'image_gen',
    name: 'Image Generation',
    description: 'Generate images using DALL-E / OpenAI.',
    icon: '🎨',
    category: 'ai',
    requiredPlan: ['business', 'max'],
    needsApiKey: true,
    apiKeyLabel: 'OpenAI API Key',
    apiKeyPlaceholder: 'sk-xxxxxxxxxxxxxxxxxxxx',
    openclawTools: [],
    promptInstructions: 'You can generate images using the OpenAI Images API. When the user asks for image generation, create the image and share the result.',
    hostedCompatible: true,
    creditMultiplier: 5,
  },
  {
    id: 'whisper',
    name: 'Audio Transcription',
    description: 'Transcribe audio and voice messages using Whisper.',
    icon: '🎙️',
    category: 'media',
    requiredPlan: ['starter', 'business', 'max'],
    needsApiKey: false,
    openclawTools: [],
    promptInstructions: 'You can transcribe audio files and voice messages using Whisper.',
    hostedCompatible: true,
    creditMultiplier: 3,
  },
  {
    id: 'tts',
    name: 'Voice Responses',
    description: 'Send voice message replies using text-to-speech.',
    icon: '🔊',
    category: 'media',
    requiredPlan: ['starter', 'business', 'max'],
    needsApiKey: false,
    openclawTools: ['tts'],
    promptInstructions: 'You can reply with voice messages using TTS. When the user asks for a voice response or when it would be more engaging (stories, summaries), use the tts tool.',
    hostedCompatible: true,
    creditMultiplier: 2,
  },

  // ── Browser ────────────────────────────────────────────────────
  {
    id: 'browser',
    name: 'Browser Control',
    description: 'Navigate websites, fill forms, take screenshots, and extract data.',
    icon: '🖥️',
    category: 'ai',
    requiredPlan: ['business', 'max'],
    needsApiKey: false,
    openclawTools: ['browser'],
    promptInstructions: 'You can control a web browser: navigate to URLs, take screenshots, fill forms, click buttons, and extract structured data from websites. Use this for tasks that need interactive web access beyond simple URL fetching.',
    hostedCompatible: true,
    creditMultiplier: 3,
  },
];

/**
 * Get skills available for a user's plan
 */
export function getAvailableSkills(plan: Plan): SkillDefinition[] {
  return SKILLS_REGISTRY.filter(s => {
    if (!s.hostedCompatible) return false;
    if (s.requiredPlan.length === 0) return true;
    return s.requiredPlan.includes(plan);
  });
}

/**
 * Get a skill by ID
 */
export function getSkillById(id: string): SkillDefinition | undefined {
  return SKILLS_REGISTRY.find(s => s.id === id);
}

/**
 * Build prompt instructions for enabled skills
 */
export function buildSkillsPrompt(enabledSkillIds: string[]): string {
  const skills = enabledSkillIds
    .map(id => getSkillById(id))
    .filter((s): s is SkillDefinition => !!s);

  if (skills.length === 0) return '';

  const instructions = skills
    .map(s => `### ${s.icon} ${s.name}\n${s.promptInstructions}`)
    .join('\n\n');

  return `## Enabled Skills & Tools

You have the following skills enabled. Use them proactively when relevant.

${instructions}

Use tools naturally — don't announce them unless it adds value. Just use them and present results.`;
}
