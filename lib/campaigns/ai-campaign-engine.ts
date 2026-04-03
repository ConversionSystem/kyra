/**
 * AI Campaign Engine
 *
 * Generate complete multi-channel marketing campaigns from a single description.
 * Uses gpt-4o-mini. Deducts 3 credits per generation.
 */

import { deductCredits, getAgencyCredits } from '@/lib/billing/credit-engine';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CampaignEmail {
  subject: string;
  preheader: string;
  body: string;
  type: 'teaser' | 'launch' | 'last_chance' | 'follow_up';
  sendDay: number; // relative day in sequence (1, 3, 5, etc.)
}

export interface CampaignSMS {
  body: string;
  timing: string; // e.g. "Day 2 — Launch day"
}

export interface CampaignSocialPost {
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter';
  body: string;
  hashtags: string[];
  imagePrompt: string; // AI-suggested image description
  timing: string;
}

export interface CampaignLandingPage {
  headline: string;
  subheadline: string;
  bodyHtml: string;
  ctaText: string;
  ctaUrl: string;
  socialProof: string;
  urgencyElement: string;
}

export interface CampaignPlan {
  id: string;
  name: string;
  description: string;
  emails: CampaignEmail[];
  smsMessages: CampaignSMS[];
  socialPosts: CampaignSocialPost[];
  landingPageCopy: CampaignLandingPage;
  generatedAt: string;
  status: 'draft' | 'active' | 'completed';
}

export interface GenerateCampaignParams {
  description: string;
  businessName: string;
  industry: string;
  services: string[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CAMPAIGN_CREDIT_COST = 3;

// ── Engine ─────────────────────────────────────────────────────────────────────

function buildCampaignPrompt(params: GenerateCampaignParams): string {
  return `You are an expert marketing strategist. Generate a complete multi-channel marketing campaign.

Business: ${params.businessName}
Industry: ${params.industry}
Services: ${params.services.join(', ')}
Campaign Description: ${params.description}

Generate a JSON object with this exact structure:
{
  "name": "Campaign Name",
  "emails": [
    { "subject": "...", "preheader": "...", "body": "HTML email body", "type": "teaser", "sendDay": 1 },
    { "subject": "...", "preheader": "...", "body": "HTML email body", "type": "launch", "sendDay": 3 },
    { "subject": "...", "preheader": "...", "body": "HTML email body", "type": "last_chance", "sendDay": 5 }
  ],
  "smsMessages": [
    { "body": "SMS text (under 160 chars)", "timing": "Day 2 — Launch day" }
  ],
  "socialPosts": [
    { "platform": "facebook", "body": "...", "hashtags": ["..."], "imagePrompt": "describe ideal image", "timing": "Day 1" },
    { "platform": "instagram", "body": "...", "hashtags": ["..."], "imagePrompt": "...", "timing": "Day 2" },
    { "platform": "linkedin", "body": "...", "hashtags": ["..."], "imagePrompt": "...", "timing": "Day 3" }
  ],
  "landingPageCopy": {
    "headline": "...",
    "subheadline": "...",
    "bodyHtml": "Full landing page body in HTML",
    "ctaText": "...",
    "ctaUrl": "#",
    "socialProof": "Testimonial or trust element text",
    "urgencyElement": "Limited time offer text"
  }
}

Rules:
- Emails should form a cohesive 3-part sequence (teaser → launch → last chance)
- SMS should be punchy and under 160 characters
- Social posts should be platform-appropriate (LinkedIn = professional, Instagram = visual, Facebook = community)
- Landing page should have compelling copy with clear value proposition
- Use the business name and industry context throughout
- Make it feel authentic, not generic

Return ONLY the JSON object, no markdown fences.`;
}

export async function generateCampaign(
  params: GenerateCampaignParams,
  agencyId: string,
): Promise<{ campaign: CampaignPlan | null; error?: string }> {
  // Check credits
  const credits = await getAgencyCredits(agencyId);
  if (credits.balance < CAMPAIGN_CREDIT_COST) {
    return { campaign: null, error: `Insufficient credits. Need ${CAMPAIGN_CREDIT_COST}, have ${credits.balance}.` };
  }

  const prompt = buildCampaignPrompt(params);

  // Call OpenAI
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { campaign: null, error: 'OpenAI API key not configured.' };
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
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return { campaign: null, error: `OpenAI API error: ${res.status} ${errText.slice(0, 200)}` };
  }

  const json = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return { campaign: null, error: 'No response from AI.' };
  }

  // Parse JSON from response
  const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { campaign: null, error: 'Failed to parse AI response.' };
  }

  // Deduct credits after successful generation
  await deductCredits(agencyId, 'chat.deep_research', {
    multiplier: CAMPAIGN_CREDIT_COST,
    description: `AI Campaign: ${params.description.slice(0, 80)}`,
  });

  const campaign: CampaignPlan = {
    id: crypto.randomUUID(),
    name: (parsed.name as string) || params.description,
    description: params.description,
    emails: (parsed.emails as CampaignEmail[]) || [],
    smsMessages: (parsed.smsMessages as CampaignSMS[]) || [],
    socialPosts: (parsed.socialPosts as CampaignSocialPost[]) || [],
    landingPageCopy: (parsed.landingPageCopy as CampaignLandingPage) || {
      headline: '', subheadline: '', bodyHtml: '', ctaText: '', ctaUrl: '#', socialProof: '', urgencyElement: '',
    },
    generatedAt: new Date().toISOString(),
    status: 'draft',
  };

  return { campaign };
}
