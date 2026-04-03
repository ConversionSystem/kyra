/**
 * AI Lead Scorer — Predictive Lead Scoring
 *
 * Analyzes conversation patterns, buying signals, and behavioral data
 * to score leads using AI. Enhances the existing scoring.ts with GPT-powered analysis.
 *
 * Uses gpt-4o-mini. 1 credit per individual score, 2 per batch of 50.
 */

import { deductCredits, getAgencyCredits } from '@/lib/billing/credit-engine';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LeadScore {
  score: number; // 0-100
  label: 'Hot' | 'Warm' | 'Cold' | 'Dead';
  reasoning: string;
  suggestedAction: string;
  buyingSignals: string[];
  riskFactors: string[];
}

export interface ScoreLeadParams {
  contactId: string;
  conversationHistory: string[];
  dealValue?: number;
  responseTime?: number;
  engagementMetrics: {
    messagesCount: number;
    lastActive: string;
    channelsUsed: string[];
  };
  contactName?: string;
  contactEmail?: string;
  industry?: string;
}

// ── Engine ─────────────────────────────────────────────────────────────────────

function buildScoringPrompt(params: ScoreLeadParams): string {
  const recentMessages = params.conversationHistory.slice(-20).join('\n');
  const daysSinceActive = params.engagementMetrics.lastActive
    ? Math.floor((Date.now() - new Date(params.engagementMetrics.lastActive).getTime()) / 86400000)
    : null;

  return `You are an expert sales analyst. Score this lead based on the data below.

Contact: ${params.contactName || 'Unknown'} (${params.contactEmail || 'no email'})
Industry: ${params.industry || 'Unknown'}
Deal Value: ${params.dealValue ? `$${params.dealValue.toLocaleString()}` : 'No deal yet'}
Messages Exchanged: ${params.engagementMetrics.messagesCount}
Channels Used: ${params.engagementMetrics.channelsUsed.join(', ') || 'None'}
Days Since Last Active: ${daysSinceActive !== null ? daysSinceActive : 'Unknown'}
Avg Response Time: ${params.responseTime ? `${params.responseTime}s` : 'Unknown'}

Recent Conversation:
${recentMessages || '(No conversation history)'}

Analyze and return a JSON object:
{
  "score": 0-100,
  "label": "Hot" | "Warm" | "Cold" | "Dead",
  "reasoning": "2-3 sentence explanation of the score",
  "suggestedAction": "Specific next step recommendation",
  "buyingSignals": ["signal1", "signal2"],
  "riskFactors": ["risk1", "risk2"]
}

Scoring guidelines:
- 80-100 (Hot): Active engagement, asking about pricing/next steps, high deal value, recent activity
- 50-79 (Warm): Regular engagement, showed interest, but no buying signals yet
- 20-49 (Cold): Low engagement, slow responses, hasn't been active recently
- 0-19 (Dead): No response in 30+ days, explicitly declined, bounced contact

Return ONLY the JSON object.`;
}

export async function scoreLeadWithAI(
  params: ScoreLeadParams,
  agencyId: string,
): Promise<{ score: LeadScore | null; error?: string }> {
  const credits = await getAgencyCredits(agencyId);
  if (credits.balance < 1) {
    return { score: null, error: 'Insufficient credits for AI scoring.' };
  }

  const prompt = buildScoringPrompt(params);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { score: null, error: 'OpenAI API key not configured.' };
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
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return { score: null, error: `AI error: ${res.status} ${errText.slice(0, 200)}` };
  }

  const json = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return { score: null, error: 'No response from AI.' };
  }

  const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  let parsed: LeadScore;
  try {
    parsed = JSON.parse(cleaned) as LeadScore;
  } catch {
    return { score: null, error: 'Failed to parse AI scoring response.' };
  }

  // Validate and clamp score
  parsed.score = Math.min(100, Math.max(0, Number(parsed.score) || 0));
  if (!['Hot', 'Warm', 'Cold', 'Dead'].includes(parsed.label)) {
    parsed.label = parsed.score >= 80 ? 'Hot' : parsed.score >= 50 ? 'Warm' : parsed.score >= 20 ? 'Cold' : 'Dead';
  }

  // Deduct credit
  await deductCredits(agencyId, 'crm_scoring', {
    description: `AI Lead Score: ${params.contactName || params.contactId}`,
  });

  return { score: parsed };
}

/**
 * Batch score all contacts for an agency using AI.
 * Deducts 2 credits per batch of 50.
 */
export async function batchScoreLeads(
  agencyId: string,
): Promise<{ scored: number; errors: number }> {
  const svc = createServiceClientWithoutCookies();
  const { data: contacts } = await svc
    .from('crm_contacts')
    .select('id, email, first_name, last_name, phone, stage, last_activity_at, score')
    .eq('agency_id', agencyId)
    .order('last_activity_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (!contacts?.length) return { scored: 0, errors: 0 };

  const credits = await getAgencyCredits(agencyId);
  const batchCost = Math.ceil(contacts.length / 50) * 2;
  if (credits.balance < batchCost) {
    return { scored: 0, errors: contacts.length };
  }

  let scored = 0;
  let errors = 0;

  for (const contact of contacts) {
    // Get recent conversations for this contact
    const { data: messages } = await svc
      .from('conversations')
      .select('user_message, ai_response')
      .eq('client_id', agencyId)
      .ilike('user_message', `%${contact.email || ''}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    const conversationHistory = (messages || []).map(
      (m: { user_message: string; ai_response: string }) => `User: ${m.user_message}\nAI: ${m.ai_response}`
    );

    const result = await scoreLeadWithAI({
      contactId: contact.id,
      conversationHistory,
      engagementMetrics: {
        messagesCount: conversationHistory.length,
        lastActive: contact.last_activity_at || '',
        channelsUsed: [],
      },
      contactName: [contact.first_name, contact.last_name].filter(Boolean).join(' ') || undefined,
      contactEmail: contact.email || undefined,
    }, agencyId);

    if (result.score) {
      const label = result.score.label.toLowerCase();
      await svc
        .from('crm_contacts')
        .update({
          score: result.score.score,
          score_label: label,
          ai_summary: result.score.reasoning,
          ai_next_action: result.score.suggestedAction,
        })
        .eq('id', contact.id)
        .eq('agency_id', agencyId);
      scored++;
    } else {
      errors++;
    }
  }

  return { scored, errors };
}
