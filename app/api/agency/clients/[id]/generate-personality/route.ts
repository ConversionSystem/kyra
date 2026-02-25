// POST /api/agency/clients/:id/generate-personality
//
// Uses AI to auto-generate persona, greeting, and instructions for a client.
// Called from the Personality tab "Generate with AI" button.
// Returns suggested values — user reviews + saves separately.

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  // Verify client belongs to this agency
  const { agency } = result.data;
  const supabase = createServiceClientWithoutCookies();
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, name, industry')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const name = (body.name as string) || client.name;
  const industry = (body.industry as string) || client.industry || 'General Business';

  // Use the Kyra default OpenAI key for generation
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  const systemPrompt = `You are an expert AI assistant trainer. Generate a professional AI worker personality for an SMS-based business assistant.

Output ONLY valid JSON with exactly these fields:
{
  "persona": "...",
  "greeting": "...",
  "instructions": "..."
}

Rules:
- persona: 1-2 sentences describing the AI's character and role (third person: "You are...")
- greeting: A warm, natural opening SMS message (max 2 sentences, include a question to engage). Do NOT say "I am an AI". Use emoji sparingly (1 max).
- instructions: 8-12 bullet points covering: business overview, key services, pricing guidance, booking/scheduling, what topics to avoid, escalation triggers, and tone guidelines. Be specific and actionable.

Do NOT include markdown. Output raw JSON only.`;

  const userPrompt = `Business: ${name}
Industry: ${industry}

Generate a professional AI assistant personality for this business.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return NextResponse.json({ error: `OpenAI error: ${res.status} ${err.slice(0, 100)}` }, { status: 502 });
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || '';
    const clean = raw.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json({
      persona: typeof parsed.persona === 'string' ? parsed.persona : '',
      greeting: typeof parsed.greeting === 'string' ? parsed.greeting : '',
      instructions: typeof parsed.instructions === 'string' ? parsed.instructions : '',
    });
  } catch (err: any) {
    return NextResponse.json({ error: `Generation failed: ${err.message}` }, { status: 500 });
  }
}
