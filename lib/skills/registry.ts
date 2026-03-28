/**
 * Kyra Skills Registry — Single Source of Truth
 *
 * ALL skill definitions live here. Every other file (sync.ts, skills-tab.tsx,
 * API routes) imports from this module. Do NOT duplicate skill arrays elsewhere.
 *
 * IDs use kebab-case to match what's stored in Supabase `settings.enabled_skills`.
 */

import { Plan } from '@/lib/billing/plans';

// ── Shared types (imported by sync.ts, skills-tab.tsx, etc.) ─────────────────

export type SkillCategory =
  | 'Research'
  | 'Communication'
  | 'Knowledge'
  | 'Monitoring'
  | 'Utilities'
  | 'Integration'
  | 'AI';

export interface BuiltInSkill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  icon: string;
  /** Detailed usage instructions injected into SKILLS.md */
  usage: string;
  /** Actual OpenClaw tool names this skill uses */
  openclawTools: string[];
}

// ── Extended definition for billing/plan gating (internal to registry) ───────

export interface SkillDefinition extends BuiltInSkill {
  /** Plans that can enable this skill (empty = all plans) */
  requiredPlan: Plan[];
  /** Whether the skill needs a user-provided API key */
  needsApiKey: boolean;
  /** Label for the API key field */
  apiKeyLabel?: string;
  /** Placeholder text for the API key input */
  apiKeyPlaceholder?: string;
  /** Instructions to inject into the system prompt when enabled */
  promptInstructions: string;
  /** Whether this skill is available in Kyra's hosted environment */
  hostedCompatible: boolean;
  /** Credit cost multiplier (1 = normal) */
  creditMultiplier: number;
}

// ── The 16 Built-in Skills ───────────────────────────────────────────────────

export const BUILTIN_SKILLS: BuiltInSkill[] = [
  // ── Research ──
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the internet for live information',
    category: 'Research',
    icon: '🔍',
    openclawTools: ['web_search'],
    usage: `Use the \`web_search\` tool to find current information.

Example: web_search("competitor pricing SaaS 2026")

When to use:
- User asks about current events, news, or real-time data
- Need to research a topic, company, or person
- Checking prices, availability, or market data
- Finding answers that require up-to-date information`,
  },
  {
    id: 'web-scraper',
    name: 'Web Scraper',
    description: 'Extract content from any URL or webpage',
    category: 'Research',
    icon: '🌐',
    openclawTools: ['web_fetch'],
    usage: `Use the \`web_fetch\` tool to read and extract content from any URL.

Example: web_fetch("https://example.com/pricing")

When to use:
- User shares a link and wants a summary or analysis
- Need to read an article, documentation, or product page
- Extracting text content from any public webpage`,
  },
  {
    id: 'web-browser',
    name: 'Web Browser',
    description: 'Navigate websites, fill forms, take screenshots',
    category: 'Research',
    icon: '🖥️',
    openclawTools: ['browser'],
    usage: `Use the \`browser\` tool for interactive web browsing.

Examples:
- browser(action="navigate", url="https://example.com")
- browser(action="screenshot")
- browser(action="snapshot") — get page structure

When to use:
- Need to interact with a website (click, fill forms, navigate)
- Taking screenshots of web pages
- Sites that require JavaScript rendering
- When web_fetch doesn't capture the full content`,
  },
  {
    id: 'web-intelligence',
    name: 'Web Intelligence',
    description: 'Scrape, crawl, search, and research any website',
    category: 'Research',
    icon: '🕵️',
    openclawTools: ['exec'],
    usage: `Use the firecrawl-cli tool for advanced web intelligence. Run via exec.

Commands:
- exec: firecrawl scrape <url> --only-main-content — read a webpage cleanly
- exec: firecrawl search "<query>" --limit 10 — web search with full content
- exec: firecrawl map <url> — discover all URLs on a site
- exec: firecrawl crawl <url> --limit 50 --wait — crawl an entire website
- exec: firecrawl agent "<prompt>" --wait — autonomous web research

Auth is pre-configured via FIRECRAWL_API_KEY and FIRECRAWL_API_URL environment variables.

When to use:
- Deep competitor research or lead enrichment
- Crawling entire websites for data
- When you need structured data extraction at scale
- Autonomous research tasks that require visiting multiple pages`,
  },

  // ── Communication ──
  {
    id: 'email',
    name: 'Email (IMAP/SMTP)',
    description: 'Read, send, and manage emails',
    category: 'Communication',
    icon: '📧',
    openclawTools: ['exec'],
    usage: `Use the himalaya CLI via exec to manage emails.

Commands:
- exec: himalaya list — list recent emails
- exec: himalaya read <id> — read a specific email
- exec: himalaya write — compose a new email
- exec: himalaya reply <id> — reply to an email
- exec: himalaya search "<query>" — search emails

When to use:
- User asks to check, read, or send emails
- Need to search for specific emails or threads
- Composing or replying to messages`,
  },
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    description: 'Gmail, Calendar, Drive, Sheets, Docs',
    category: 'Communication',
    icon: '📅',
    openclawTools: ['exec'],
    usage: `Use the gog CLI via exec for Google Workspace integration.

Commands:
- exec: gog gmail list — list Gmail messages
- exec: gog calendar list — list upcoming events
- exec: gog drive list — list Drive files
- exec: gog sheets read <id> — read a spreadsheet
- exec: gog docs read <id> — read a document

When to use:
- User asks about their calendar, emails, or files
- Need to create or update Google Docs/Sheets
- Managing Google Drive files`,
  },
  {
    id: 'voice-tts',
    name: 'Text-to-Speech',
    description: 'Convert text to natural-sounding voice',
    category: 'Communication',
    icon: '🔊',
    openclawTools: ['tts'],
    usage: `Use the \`tts\` tool to convert text to spoken audio.

Example: tts("Here's your morning briefing...")

When to use:
- User explicitly requests a voice response
- Delivering summaries or briefings where audio is more engaging
- Accessibility needs — user prefers audio over text
- Storytelling or creative content delivery`,
  },

  // ── Knowledge ──
  {
    id: 'pdf-analysis',
    name: 'PDF Analysis',
    description: 'Read, analyze, extract from PDF documents',
    category: 'Knowledge',
    icon: '📄',
    openclawTools: ['pdf'],
    usage: `Use the \`pdf\` tool to analyze PDF documents.

Example: pdf(pdf="/path/to/document.pdf", prompt="Summarize the key findings")

When to use:
- User uploads or references a PDF file
- Need to extract text, tables, or data from PDFs
- Analyzing contracts, reports, or research papers
- Answering questions about PDF content`,
  },
  {
    id: 'summarize',
    name: 'Summarize',
    description: 'Summarize URLs, videos, podcasts, documents',
    category: 'Knowledge',
    icon: '📝',
    openclawTools: ['web_fetch', 'exec'],
    usage: `Use web_fetch and/or the summarize skill via exec to create concise summaries.

Examples:
- web_fetch("https://example.com/article") then summarize the content
- exec: yt-dlp --get-title --get-description "<youtube-url>" for video info

When to use:
- User shares a URL and wants a summary
- Summarizing long articles, YouTube videos, or podcasts
- Creating executive summaries or bullet-point breakdowns
- Condensing lengthy documents into key takeaways`,
  },
  {
    id: 'image-analysis',
    name: 'Image Analysis',
    description: 'Analyze images with vision AI',
    category: 'Knowledge',
    icon: '🖼️',
    openclawTools: ['image'],
    usage: `Use the \`image\` tool to analyze images with vision AI.

Example: image(image="/path/to/photo.jpg", prompt="What's in this image?")

When to use:
- User sends or references an image
- Need to describe, analyze, or extract info from photos
- Reading text from screenshots or documents
- Analyzing charts, diagrams, or visual data`,
  },

  // ── Monitoring ──
  {
    id: 'blog-monitor',
    name: 'Blog Monitor',
    description: 'Track RSS feeds, blogs, news',
    category: 'Monitoring',
    icon: '📡',
    openclawTools: ['exec'],
    usage: `Use the blogwatcher CLI via exec to monitor feeds.

Commands:
- exec: blogwatcher list — list monitored feeds
- exec: blogwatcher check — check for new posts
- exec: blogwatcher add <url> — add a new feed to monitor
- exec: blogwatcher remove <url> — stop monitoring a feed

When to use:
- User wants to track specific blogs, news sites, or RSS feeds
- Checking for new content from monitored sources
- Setting up content monitoring for competitors or industry news`,
  },

  // ── Utilities ──
  {
    id: 'weather',
    name: 'Weather',
    description: 'Current weather and forecasts',
    category: 'Utilities',
    icon: '🌤️',
    openclawTools: ['web_fetch'],
    usage: `Use web_fetch to get weather data from wttr.in.

Example: web_fetch("https://wttr.in/London?format=j1")

When to use:
- User asks about weather conditions or forecasts
- Need temperature, precipitation, or wind data for any location
- Planning outdoor events or travel weather checks`,
  },
  {
    id: 'code-runner',
    name: 'Code Runner',
    description: 'Execute code, scripts, shell commands',
    category: 'Utilities',
    icon: '⚡',
    openclawTools: ['exec'],
    usage: `Use the \`exec\` tool to run code, scripts, and shell commands.

Examples:
- exec: python3 -c "print(2**10)"
- exec: node -e "console.log(JSON.parse('{\"a\":1}'))"
- exec: curl -s https://api.example.com/data | jq .

When to use:
- User asks to run or test code
- Need to process data with scripts
- Running shell commands or CLI tools
- Any computation or data transformation task`,
  },

  // ── Integration ──
  {
    id: 'ghl-tools',
    name: 'GHL Tools',
    description: 'Book appointments, tag contacts, create deals via GoHighLevel',
    category: 'Integration',
    icon: '🔗',
    openclawTools: ['exec'],
    usage: `Connect to GoHighLevel CRM via the Kyra API bridge.

**API Endpoint:** POST https://kyra.conversionsystem.com/api/agent/ghl-tool
**Method:** Use exec with curl

Available tools:
- book_appointment: Book on the GHL calendar
- get_available_slots: Check available times
- tag_contact: Add tags to a contact
- create_opportunity: Create a deal in the pipeline
- send_sms: Send SMS to a contact
- search_contacts: Search for contacts
- escalate_to_human: Flag for human follow-up

Example:
exec: curl -s -X POST https://kyra.conversionsystem.com/api/agent/ghl-tool -H "Content-Type: application/json" -d '{"tool":"search_contacts","args":{"query":"John Smith"}}'

Example (book appointment):
exec: curl -s -X POST https://kyra.conversionsystem.com/api/agent/ghl-tool -H "Content-Type: application/json" -d '{"tool":"book_appointment","args":{"contactId":"abc123","calendarId":"cal_1","startTime":"2026-03-30T10:00:00Z"}}'

When to use:
- User wants to book an appointment or check availability
- Need to tag a contact or add them to a pipeline
- Creating deals or opportunities in the CRM
- Sending SMS messages to contacts
- Searching for contact information
- Escalating a conversation to a human agent`,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Manage repos, issues, PRs, code reviews',
    category: 'Integration',
    icon: '🐙',
    openclawTools: ['exec'],
    usage: `Use the gh CLI via exec for GitHub operations.

Commands:
- exec: gh issue list — list open issues
- exec: gh pr list — list pull requests
- exec: gh pr view <number> — view PR details
- exec: gh issue create --title "Bug" --body "Description" — create an issue
- exec: gh run list — check CI/CD status
- exec: gh api repos/{owner}/{repo} — API queries

When to use:
- User asks about their GitHub repos, issues, or PRs
- Need to create issues or review pull requests
- Checking CI/CD pipeline status
- Any GitHub-related operations`,
  },

  // ── AI ──
  {
    id: 'image-generation',
    name: 'Image Generation',
    description: 'Generate images with AI',
    category: 'AI',
    icon: '🎨',
    openclawTools: ['image_generate'],
    usage: `Use the \`image_generate\` tool to create images from text descriptions.

Example: image_generate(prompt="A modern SaaS dashboard with dark theme and analytics charts", aspectRatio="16:9")

Options:
- prompt: Detailed description of the image to generate
- aspectRatio: 1:1, 16:9, 9:16, 4:3, 3:4, etc.
- size: 1024x1024, 1792x1024, 1024x1792
- count: 1-4 images

When to use:
- User asks to create, generate, or design an image
- Need marketing visuals, mockups, or creative assets
- Generating illustrations or concept art`,
  },
];

// ── Map for O(1) lookups ─────────────────────────────────────────────────────

const BUILTIN_SKILLS_MAP = new Map(BUILTIN_SKILLS.map(s => [s.id, s]));

// Plan/billing extensions per skill ID (keeps BUILTIN_SKILLS clean)
const SKILL_EXTENSIONS: Record<string, {
  requiredPlan?: Plan[];
  needsApiKey?: boolean;
  apiKeyLabel?: string;
  apiKeyPlaceholder?: string;
  hostedCompatible?: boolean;
  creditMultiplier?: number;
}> = {
  'web-search': { creditMultiplier: 2 },
  'web-scraper': { creditMultiplier: 1 },
  'web-browser': { requiredPlan: ['pro', 'scale'], creditMultiplier: 3 },
  'web-intelligence': { requiredPlan: ['starter', 'pro', 'scale'], creditMultiplier: 2 },
  'email': { requiredPlan: ['starter', 'pro', 'scale'], creditMultiplier: 2 },
  'google-workspace': { requiredPlan: ['starter', 'pro', 'scale'], creditMultiplier: 2 },
  'voice-tts': { requiredPlan: ['starter', 'pro', 'scale'], creditMultiplier: 2 },
  'pdf-analysis': { requiredPlan: ['starter', 'pro', 'scale'], creditMultiplier: 3 },
  'summarize': { creditMultiplier: 2 },
  'image-analysis': { requiredPlan: ['starter', 'pro', 'scale'], creditMultiplier: 3 },
  'blog-monitor': { requiredPlan: ['starter', 'pro', 'scale'], creditMultiplier: 1 },
  'weather': { creditMultiplier: 1 },
  'code-runner': { requiredPlan: ['starter', 'pro', 'scale'], creditMultiplier: 2 },
  'ghl-tools': { requiredPlan: ['starter', 'pro', 'scale'], creditMultiplier: 2 },
  'github': {
    requiredPlan: ['starter', 'pro', 'scale'],
    needsApiKey: true,
    apiKeyLabel: 'GitHub Personal Access Token',
    apiKeyPlaceholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
    creditMultiplier: 2,
  },
  'image-generation': { requiredPlan: ['pro', 'scale'], creditMultiplier: 5 },
};

// ── Extended registry with billing/plan data ─────────────────────────────────
// This wraps BUILTIN_SKILLS with extra metadata for plan gating and pricing.

export const SKILLS_REGISTRY: SkillDefinition[] = BUILTIN_SKILLS.map(skill => {
  const extensions = SKILL_EXTENSIONS[skill.id] || {};
  return {
    ...skill,
    requiredPlan: extensions.requiredPlan ?? [],
    needsApiKey: extensions.needsApiKey ?? false,
    apiKeyLabel: extensions.apiKeyLabel,
    apiKeyPlaceholder: extensions.apiKeyPlaceholder,
    promptInstructions: skill.usage,
    hostedCompatible: extensions.hostedCompatible ?? true,
    creditMultiplier: extensions.creditMultiplier ?? 1,
  };
});

// ── Legacy ID mapping (snake_case → kebab-case) ─────────────────────────────
// The old registry used snake_case IDs. Some tables (user_skills) may still
// store these. This map provides backward compatibility.
const LEGACY_ID_MAP: Record<string, string> = {
  'web_search': 'web-search',
  'web_fetch': 'web-scraper',
  'browser': 'web-browser',
  'image_gen': 'image-generation',
  'whisper': 'voice-tts',        // closest match
  'tts': 'voice-tts',
  'image_understanding': 'image-analysis',
  'file_upload': 'pdf-analysis',  // closest match
  'notion': 'google-workspace',   // no direct equivalent, map to closest
  'trello': 'google-workspace',   // no direct equivalent
  'code-execution': 'code-runner', // old kebab ID from skills-tab
};

/**
 * Normalize a skill ID to the canonical kebab-case format.
 * Handles legacy snake_case IDs for backward compatibility.
 */
export function normalizeSkillId(id: string): string {
  // Already in our map? Return as-is.
  if (BUILTIN_SKILLS_MAP.has(id)) return id;
  // Check legacy mapping
  return LEGACY_ID_MAP[id] ?? id;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get a built-in skill by ID (supports both kebab-case and legacy snake_case IDs).
 */
export function getSkillById(id: string): BuiltInSkill | undefined {
  return BUILTIN_SKILLS_MAP.get(normalizeSkillId(id));
}

/**
 * Get the extended skill definition (with billing data) by ID.
 */
export function getSkillDefinitionById(id: string): SkillDefinition | undefined {
  return SKILLS_REGISTRY.find(s => s.id === id);
}

/**
 * Get skills available for a user's plan.
 */
export function getAvailableSkills(plan: Plan): SkillDefinition[] {
  // During beta: all skills unlocked regardless of plan
  return SKILLS_REGISTRY.filter(s => s.hostedCompatible);
}

/**
 * Build prompt instructions for enabled skills.
 * Used by chat route, poller, and smart-handler.
 */
export function buildSkillsPrompt(enabledSkillIds: string[]): string {
  const skills = enabledSkillIds
    .map(id => getSkillById(id))
    .filter((s): s is BuiltInSkill => !!s);

  if (skills.length === 0) return '';

  const instructions = skills
    .map(s => `### ${s.icon} ${s.name}\n${s.usage}`)
    .join('\n\n');

  return `## Enabled Skills & Tools

You have the following skills enabled. Use them proactively when relevant.

${instructions}

Use tools naturally — don't announce them unless it adds value. Just use them and present results.`;
}
