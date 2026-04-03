/**
 * AI Funnel Builder
 *
 * Generate multi-step sales funnels from an offer description.
 * Uses gpt-4o-mini. Deducts 3 credits per funnel.
 */

import { deductCredits, getAgencyCredits } from '@/lib/billing/credit-engine';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FunnelStep {
  id: string;
  order: number;
  type: 'landing' | 'form' | 'thankyou' | 'upsell';
  headline: string;
  subheadline: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  designHints: {
    colorScheme: string;
    layout: string;
    imagePrompt: string;
  };
  formFields?: Array<{ name: string; type: string; required: boolean; placeholder: string }>;
  emailFollowUp?: {
    subject: string;
    body: string;
    delay: string; // e.g. "immediately", "1 hour", "1 day"
  };
}

export interface FunnelPlan {
  id: string;
  name: string;
  offerDescription: string;
  steps: FunnelStep[];
  emailSequence: Array<{
    subject: string;
    body: string;
    sendDay: number;
  }>;
  generatedAt: string;
  status: 'draft' | 'deployed' | 'archived';
}

export interface GenerateFunnelParams {
  offerDescription: string;
  businessName: string;
  industry: string;
  price?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const FUNNEL_CREDIT_COST = 3;

// ── Engine ─────────────────────────────────────────────────────────────────────

function buildFunnelPrompt(params: GenerateFunnelParams): string {
  return `You are an expert conversion funnel strategist. Generate a complete multi-step sales funnel.

Business: ${params.businessName}
Industry: ${params.industry}
Offer: ${params.offerDescription}
${params.price ? `Price: ${params.price}` : ''}

Generate a JSON object with this exact structure:
{
  "name": "Funnel Name",
  "steps": [
    {
      "order": 1,
      "type": "landing",
      "headline": "Compelling headline",
      "subheadline": "Supporting text",
      "body": "Full page body in HTML with benefits, features, social proof",
      "ctaText": "Button text",
      "ctaUrl": "#step2",
      "designHints": { "colorScheme": "blue-gradient", "layout": "hero-with-benefits", "imagePrompt": "describe ideal hero image" }
    },
    {
      "order": 2,
      "type": "form",
      "headline": "Get Started Today",
      "subheadline": "Fill in your details",
      "body": "Brief text above the form",
      "ctaText": "Submit",
      "ctaUrl": "#step3",
      "designHints": { "colorScheme": "clean-white", "layout": "centered-form", "imagePrompt": "" },
      "formFields": [
        { "name": "full_name", "type": "text", "required": true, "placeholder": "Your full name" },
        { "name": "email", "type": "email", "required": true, "placeholder": "your@email.com" },
        { "name": "phone", "type": "tel", "required": false, "placeholder": "(555) 123-4567" }
      ]
    },
    {
      "order": 3,
      "type": "thankyou",
      "headline": "You're In!",
      "subheadline": "Check your email for next steps",
      "body": "Thank you content with what to expect",
      "ctaText": "Check out our premium option",
      "ctaUrl": "#step4",
      "designHints": { "colorScheme": "success-green", "layout": "centered-message", "imagePrompt": "" }
    },
    {
      "order": 4,
      "type": "upsell",
      "headline": "Upgrade Your Experience",
      "subheadline": "Limited time offer for new members",
      "body": "Upsell content with premium benefits",
      "ctaText": "Upgrade Now",
      "ctaUrl": "#",
      "designHints": { "colorScheme": "premium-gold", "layout": "comparison-table", "imagePrompt": "" }
    }
  ],
  "emailSequence": [
    { "subject": "Welcome! Here's what's next...", "body": "HTML welcome email", "sendDay": 0 },
    { "subject": "Did you know about this?", "body": "HTML value email", "sendDay": 2 },
    { "subject": "Last chance to get started", "body": "HTML urgency email", "sendDay": 5 }
  ]
}

Rules:
- Landing page should have a strong hook and clear value proposition
- Form should be minimal (3-5 fields max) to maximize conversions
- Thank you page should reinforce the decision and set expectations
- Upsell should feel natural, not pushy
- Email sequence should nurture and convert over 5 days
- Use the business name, industry, and price context throughout
- Body content should be in HTML format ready to render

Return ONLY the JSON object, no markdown fences.`;
}

export async function generateFunnel(
  params: GenerateFunnelParams,
  agencyId: string,
): Promise<{ funnel: FunnelPlan | null; error?: string }> {
  // Check credits
  const credits = await getAgencyCredits(agencyId);
  if (credits.balance < FUNNEL_CREDIT_COST) {
    return { funnel: null, error: `Insufficient credits. Need ${FUNNEL_CREDIT_COST}, have ${credits.balance}.` };
  }

  const prompt = buildFunnelPrompt(params);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { funnel: null, error: 'OpenAI API key not configured.' };
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 5000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return { funnel: null, error: `OpenAI API error: ${res.status} ${errText.slice(0, 200)}` };
  }

  const json = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return { funnel: null, error: 'No response from AI.' };
  }

  const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { funnel: null, error: 'Failed to parse AI response.' };
  }

  // Deduct credits
  await deductCredits(agencyId, 'website.page_generation', {
    multiplier: FUNNEL_CREDIT_COST,
    description: `AI Funnel: ${params.offerDescription.slice(0, 80)}`,
  });

  const rawSteps = (parsed.steps as Array<Record<string, unknown>>) || [];
  const funnel: FunnelPlan = {
    id: crypto.randomUUID(),
    name: (parsed.name as string) || params.offerDescription,
    offerDescription: params.offerDescription,
    steps: rawSteps.map((s, i) => ({
      id: crypto.randomUUID(),
      order: (s.order as number) || i + 1,
      type: (s.type as FunnelStep['type']) || 'landing',
      headline: (s.headline as string) || '',
      subheadline: (s.subheadline as string) || '',
      body: (s.body as string) || '',
      ctaText: (s.ctaText as string) || '',
      ctaUrl: (s.ctaUrl as string) || '#',
      designHints: (s.designHints as FunnelStep['designHints']) || {
        colorScheme: 'blue', layout: 'default', imagePrompt: '',
      },
      formFields: s.formFields as FunnelStep['formFields'],
      emailFollowUp: s.emailFollowUp as FunnelStep['emailFollowUp'],
    })),
    emailSequence: (parsed.emailSequence as FunnelPlan['emailSequence']) || [],
    generatedAt: new Date().toISOString(),
    status: 'draft',
  };

  return { funnel };
}
