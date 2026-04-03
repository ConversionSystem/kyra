// ============================================================================
// AI Email Writer
// Generates email subject lines and HTML bodies using OpenRouter LLM.
// Uses gpt-4o-mini for cost-effective email generation.
// ============================================================================

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';

export interface EmailWriterContext {
  businessName: string;
  industry: string;
  sequenceName: string;
  stepPosition: number;       // 1-based
  totalSteps: number;
  stepType: 'intro' | 'follow-up' | 'value-add' | 'closing' | 'custom';
  previousSubjects?: string[];
  ctaGoal?: string;           // e.g. "Book a call", "Visit website", "Reply"
  additionalContext?: string; // from container_config or user input
  contactMergeTags?: boolean; // include merge tags in output
}

export interface GeneratedEmail {
  subject: string;
  htmlBody: string;
  previewText: string;
}

const STEP_TYPE_GUIDANCE: Record<string, string> = {
  'intro': 'This is the first email. Be warm, introduce the business, and set expectations. Make the recipient feel welcomed.',
  'follow-up': 'This is a follow-up. Reference that this is part of an ongoing sequence. Provide value, not just a reminder.',
  'value-add': 'Focus on delivering genuine value — tips, insights, or resources relevant to the industry. Soft sell only.',
  'closing': 'This is the final email in the sequence. Create gentle urgency. Summarize the value proposition and include a clear CTA.',
  'custom': 'Write a professional, engaging email that fits naturally in the sequence.',
};

export async function generateEmailContent(
  context: EmailWriterContext,
): Promise<GeneratedEmail> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const mergeTagNote = context.contactMergeTags !== false
    ? `\nAvailable merge tags you can use: {{contact_name}}, {{business_name}}, {{agent_name}}. Use them naturally where appropriate.`
    : '';

  const previousSubjectsNote = context.previousSubjects?.length
    ? `\nPrevious email subjects in this sequence (avoid repeating themes):\n${context.previousSubjects.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}`
    : '';

  const prompt = `You are an expert email copywriter for small business marketing sequences.

Write an email for the following context:

Business: ${context.businessName}
Industry: ${context.industry}
Sequence: "${context.sequenceName}"
Email position: Step ${context.stepPosition} of ${context.totalSteps}
Email type: ${context.stepType}
${context.ctaGoal ? `Call-to-action goal: ${context.ctaGoal}` : ''}
${context.additionalContext ? `Additional context: ${context.additionalContext}` : ''}
${previousSubjectsNote}
${mergeTagNote}

Guidance for this email type: ${STEP_TYPE_GUIDANCE[context.stepType] || STEP_TYPE_GUIDANCE.custom}

REQUIREMENTS:
- Subject line: compelling, under 60 characters, no spam trigger words
- Preview text: 1 short sentence that complements the subject (shown in inbox preview)
- HTML body: clean, professional HTML email. Use inline styles only.
- Keep the email concise (150-250 words max)
- Sound human, not corporate. Conversational but professional.
- Include ONE clear call-to-action
- Do NOT include unsubscribe links or footers (those are added automatically)

Respond in this exact JSON format:
{
  "subject": "...",
  "previewText": "...",
  "htmlBody": "..."
}`;

  const res = await fetch(OPENROUTER_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com',
      'X-Title': 'Kyra Email Writer',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenRouter API error (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in OpenRouter response');
  }

  try {
    const parsed = JSON.parse(content) as GeneratedEmail;
    if (!parsed.subject || !parsed.htmlBody) {
      throw new Error('Missing required fields in generated email');
    }
    return {
      subject: parsed.subject,
      htmlBody: parsed.htmlBody,
      previewText: parsed.previewText || '',
    };
  } catch (parseErr) {
    throw new Error(`Failed to parse AI response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
  }
}
