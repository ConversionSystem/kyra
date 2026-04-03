/**
 * AI Reporter — Natural Language Analytics
 *
 * Generates human-readable reports from client analytics data.
 * Uses gpt-4o-mini. Deducts 1 credit per report.
 */

import { deductCredits, getAgencyCredits } from '@/lib/billing/credit-engine';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ClientAnalyticsData {
  conversationsCount: number;
  conversationsChange: number; // percentage vs last period
  avgResponseTime: number; // seconds
  leadCount: number;
  leadsChange: number;
  dealPipelineValue: number;
  dealsWon: number;
  dealsLost: number;
  bookingCount: number;
  emailsSent: number;
  emailOpenRate: number;
  emailClickRate: number;
  messagesHandled: number;
  creditsUsed: number;
  topChannels: Array<{ channel: string; count: number }>;
  period: string; // 'this_week' | 'this_month' | 'last_30_days'
}

export interface ReportMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ── Engine ─────────────────────────────────────────────────────────────────────

function buildReportPrompt(question: string, data: ClientAnalyticsData, businessName: string): string {
  return `You are an expert business analyst for "${businessName}". A user is asking about their client's performance.

Here is the current analytics data:
- Conversations: ${data.conversationsCount} (${data.conversationsChange >= 0 ? '+' : ''}${data.conversationsChange}% vs last period)
- Avg Response Time: ${data.avgResponseTime}s
- Leads: ${data.leadCount} (${data.leadsChange >= 0 ? '+' : ''}${data.leadsChange}% vs last period)
- Deal Pipeline Value: $${data.dealPipelineValue.toLocaleString()}
- Deals Won: ${data.dealsWon} | Deals Lost: ${data.dealsLost}
- Bookings: ${data.bookingCount}
- Emails Sent: ${data.emailsSent} | Open Rate: ${data.emailOpenRate}% | Click Rate: ${data.emailClickRate}%
- Messages Handled by AI: ${data.messagesHandled}
- Credits Used: ${data.creditsUsed}
- Top Channels: ${data.topChannels.map(c => `${c.channel}: ${c.count}`).join(', ')}
- Period: ${data.period}

User Question: "${question}"

Rules:
- Be conversational and insightful, not robotic
- Reference specific numbers from the data
- Highlight wins and areas for improvement
- Suggest actionable next steps when appropriate
- Keep responses concise (2-4 paragraphs max)
- If the data shows trends, call them out
- Use emojis sparingly for readability`;
}

export async function generateReport(params: {
  clientId: string;
  question: string;
  data: ClientAnalyticsData;
  businessName: string;
  agencyId: string;
}): Promise<{ report: string | null; error?: string }> {
  const { question, data, businessName, agencyId } = params;

  // Check credits (1 per report)
  const credits = await getAgencyCredits(agencyId);
  if (credits.balance < 1) {
    return { report: null, error: 'Insufficient credits for AI report.' };
  }

  const prompt = buildReportPrompt(question, data, businessName);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { report: null, error: 'OpenAI API key not configured.' };
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
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return { report: null, error: `AI error: ${res.status} ${errText.slice(0, 200)}` };
  }

  const json = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return { report: null, error: 'No response from AI.' };
  }

  // Deduct 1 credit
  await deductCredits(agencyId, 'chat.message', {
    description: `AI Report: ${question.slice(0, 80)}`,
  });

  return { report: content.trim() };
}

export function generateWeeklySummaryPrompt(data: ClientAnalyticsData, businessName: string): string {
  return buildReportPrompt(
    'Give me a weekly performance summary. What went well, what needs attention, and what should I focus on next week?',
    data,
    businessName,
  );
}
