// ============================================================================
// Skill Builder — Prompt Template
// Generates the Claude prompt for analyzing business content and producing
// a complete AI skill pack configuration.
// ============================================================================

export interface SkillBuilderInput {
  businessName: string;
  industry: string;
  additionalContext?: string;
  content: string;
}

/**
 * Known Kyra skill IDs the generator can suggest.
 */
export const AVAILABLE_SKILL_IDS = [
  'web_search',
  'web_fetch',
  'weather',
  'summarize',
  'github',
  'notion',
  'trello',
  'image_gen',
  'whisper',
  'tts',
  'image_understanding',
  'file_upload',
  'browser',
] as const;

/**
 * Build the system prompt for the skill pack generator.
 */
export function buildSkillBuilderSystemPrompt(): string {
  return `You are an expert AI skill pack generator for Kyra, a business assistant platform.
Your job is to analyze business content (FAQ docs, training manuals, website copy) and produce a comprehensive AI assistant configuration that an agency can deploy for their client.

You MUST respond with valid JSON only — no markdown fences, no explanation outside the JSON.

The JSON must have exactly these fields:

{
  "personality": "2-3 sentence persona description that captures the brand voice",
  "systemPrompt": "Detailed system prompt (500-1000 words) with business knowledge baked in. Include specific services, policies, hours, pricing, and anything else from the source content. Write it as instructions to the AI assistant.",
  "greeting": "A warm, on-brand opening message the AI sends to a new contact",
  "sampleResponses": [
    { "question": "...", "answer": "..." }
  ],
  "suggestedSkills": ["skill_id_1", "skill_id_2"],
  "extractedKnowledge": ["fact 1", "fact 2", "..."],
  "tone": "one or two words describing the tone"
}

Rules:
- sampleResponses: exactly 5 realistic Q&A pairs based on the source content
- suggestedSkills: pick from this list ONLY: ${AVAILABLE_SKILL_IDS.join(', ')}
- extractedKnowledge: extract every concrete fact — services, prices, hours, policies, team members, locations, contact info. Aim for 8-20 items.
- systemPrompt: write as if you're instructing the AI. Include "You are..." framing. Embed real data from the content. Be specific, not generic.
- tone: e.g. "professional", "friendly and casual", "warm and empathetic", "energetic"
- greeting: should feel natural and specific to the business, not generic

Do NOT include any text outside the JSON object.`;
}

/**
 * Build the user message for the skill pack generator.
 */
export function buildSkillBuilderUserMessage(input: SkillBuilderInput): string {
  const parts = [
    `Business: ${input.businessName}`,
    `Industry: ${input.industry}`,
  ];

  if (input.additionalContext?.trim()) {
    parts.push(`Additional Context: ${input.additionalContext}`);
  }

  parts.push('');
  parts.push('Source Content:');
  parts.push('---');
  parts.push(input.content);
  parts.push('---');
  parts.push('');
  parts.push('Generate the skill pack JSON now.');

  return parts.join('\n');
}

/**
 * The expected shape of the generated skill pack.
 */
export interface GeneratedSkillPack {
  personality: string;
  systemPrompt: string;
  greeting: string;
  sampleResponses: Array<{ question: string; answer: string }>;
  suggestedSkills: string[];
  extractedKnowledge: string[];
  tone: string;
}

/**
 * Validate and parse the raw AI response into a GeneratedSkillPack.
 * Throws if the response is invalid.
 */
export function parseSkillPackResponse(raw: string): GeneratedSkillPack {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(cleaned);

  // Validate required fields
  const required = [
    'personality',
    'systemPrompt',
    'greeting',
    'sampleResponses',
    'suggestedSkills',
    'extractedKnowledge',
    'tone',
  ];

  for (const field of required) {
    if (!(field in parsed)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!Array.isArray(parsed.sampleResponses)) {
    throw new Error('sampleResponses must be an array');
  }

  if (!Array.isArray(parsed.suggestedSkills)) {
    throw new Error('suggestedSkills must be an array');
  }

  if (!Array.isArray(parsed.extractedKnowledge)) {
    throw new Error('extractedKnowledge must be an array');
  }

  // Filter suggestedSkills to only valid IDs
  parsed.suggestedSkills = parsed.suggestedSkills.filter((id: string) =>
    (AVAILABLE_SKILL_IDS as readonly string[]).includes(id)
  );

  return parsed as GeneratedSkillPack;
}
