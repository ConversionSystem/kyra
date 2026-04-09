import { NextRequest, NextResponse } from 'next/server';
import { INDUSTRY_TEMPLATES } from '@/lib/templates/industry-templates';
import { isRateLimited } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Rate limit: 20 messages per IP per hour (Supabase-backed)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  if (await isRateLimited(`playground:${ip}`, 20, 3600_000)) {
    return NextResponse.json(
      { error: 'Rate limit reached. Sign up for unlimited access!', upgrade: true },
      { status: 429 },
    );
  }

  try {
    const { templateId, messages } = await req.json();

    const template = INDUSTRY_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Build system prompt from template's SOUL.md
    const systemPrompt = buildSystemPrompt(template);

    // Limit conversation history to last 6 messages to control costs
    const recentMessages = (messages || []).slice(-6);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openrouter/anthropic/claude-haiku-4.5',
        messages: [
          { role: 'system', content: systemPrompt },
          ...recentMessages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI error:', err);
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'I apologize, could you try again?';

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Playground chat error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function buildSystemPrompt(template: (typeof INDUSTRY_TEMPLATES)[number]): string {
  // Fill in template variables with demo values
  let soul = template.soulTemplate;

  for (const v of template.variables || []) {
    soul = soul.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), v.placeholder || v.label);
  }

  return `${soul}

IMPORTANT CONTEXT: This is a live demo of Kyra's AI Worker platform. You are demonstrating what an AI worker can do for a ${template.industry} business. Be impressive, helpful, and show off your capabilities. Keep responses concise (2-3 sentences max). If the customer seems interested, mention that this AI worker can be deployed for their business in under 5 minutes at kyra.conversionsystem.com.

Available tools (mention naturally when relevant): ${template.suggestedTools.join(', ')}`;
}
