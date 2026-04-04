/**
 * AI Review Responder
 *
 * Generates professional, on-brand responses to customer reviews.
 * Uses gpt-4o-mini (1 credit per generation).
 */

import { deductCredits, getAgencyCredits } from '@/lib/billing/credit-engine';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ReviewForResponse {
  rating: number;
  reviewText: string;
  reviewerName: string;
  platform?: string;
  service?: string;
}

export type ResponseTone = 'professional' | 'friendly' | 'empathetic' | 'enthusiastic';

// ── Main Function ──────────────────────────────────────────────────────────────

export async function generateReviewResponse(
  review: ReviewForResponse,
  businessName: string,
  tone: ResponseTone,
  agencyId: string,
): Promise<{ response: string; error?: string }> {
  // Check credits
  const credits = await getAgencyCredits(agencyId);
  if (credits.balance < 1) {
    return { response: '', error: 'Insufficient credits for AI review response.' };
  }

  const isPositive = review.rating >= 4;
  const isNegative = review.rating <= 2;
  const isNeutral = !isPositive && !isNegative;

  const toneGuide: Record<ResponseTone, string> = {
    professional: 'Professional and polished. Business-appropriate but not cold.',
    friendly: 'Warm, personable, and conversational. Like responding to a friend.',
    empathetic: 'Understanding, compassionate, and sincere. Focus on their feelings.',
    enthusiastic: 'Excited, grateful, and energetic. Show genuine appreciation.',
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a reputation management expert writing review responses for "${businessName}".

Tone: ${toneGuide[tone]}

Rules:
- Keep responses 2-4 sentences
- Address the reviewer by name
- ${isPositive ? 'Thank them genuinely, mention something specific from their review, invite them back' : ''}
- ${isNegative ? 'Apologize sincerely, acknowledge their specific concern, offer to make it right offline (avoid arguing)' : ''}
- ${isNeutral ? 'Thank them for the feedback, acknowledge what went well and what could improve, show commitment to improvement' : ''}
- Never be defensive or dismissive
- Never offer discounts or freebies publicly (handle offline)
- Sound human, not templated
- Don't start with "Dear" — use their first name naturally`,
          },
          {
            role: 'user',
            content: `Write a response to this ${review.rating}-star ${review.platform || 'online'} review:

Reviewer: ${review.reviewerName}
Rating: ${review.rating}/5
${review.service ? `Service: ${review.service}` : ''}
Review: "${review.reviewText}"`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      return { response: '', error: `OpenAI API error: ${response.status}` };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';

    // Deduct 1 credit
    await deductCredits(agencyId, 'chat.message' as any, { description: `Review response for ${review.reviewerName}` });

    return { response: text };
  } catch (err) {
    return { response: '', error: err instanceof Error ? err.message : 'Failed to generate review response' };
  }
}

/**
 * Generate a review request message template.
 */
export async function generateReviewRequestTemplate(
  businessName: string,
  service: string,
  agencyId: string,
): Promise<{ template: string; error?: string }> {
  const credits = await getAgencyCredits(agencyId);
  if (credits.balance < 1) {
    return { template: '', error: 'Insufficient credits.' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Write a short, friendly SMS/text message asking a customer to leave a review for "${businessName}". 
Keep it under 160 characters. Sound human and grateful. Include {{first_name}} merge tag. Don't include a link placeholder — that will be added automatically.`,
          },
          {
            role: 'user',
            content: `Service provided: ${service || 'general service'}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      return { template: '', error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const template = data.choices?.[0]?.message?.content?.trim() || '';

    await deductCredits(agencyId, 'chat.message' as any, { description: `Review request template for ${service}` });

    return { template };
  } catch (err) {
    return { template: '', error: err instanceof Error ? err.message : 'Failed to generate template' };
  }
}
