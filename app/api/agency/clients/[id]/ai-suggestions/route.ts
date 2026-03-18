// GET /api/agency/clients/[id]/ai-suggestions
// Analyzes recent conversations and returns AI-powered improvement suggestions.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Context) {
  const { id: clientId } = await ctx.params;
  const sb = await createClient();
  const sbService = await createServiceClient();

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: agency } = await sbService.from('agency_members').select('agency_id').eq('user_id', user.id).single();
  if (!agency) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: client } = await sbService.from('agency_clients')
    .select('id, name, industry, container_config')
    .eq('id', clientId).eq('agency_id', agency.agency_id).single();
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  // Fetch last 20 conversations for analysis
  const { data: convs } = await sbService.from('client_conversations')
    .select('user_message, ai_response')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (!convs || convs.length < 3) {
    return NextResponse.json({
      suggestions: [],
      message: 'Need at least 3 conversations to generate suggestions. Check back once the AI is active!',
    });
  }

  const config = (client.container_config ?? {}) as Record<string, string>;
  const conversationSample = convs.map((c, i) =>
    `[${i + 1}] Customer: ${c.user_message?.slice(0, 200)}\nAI: ${c.ai_response?.slice(0, 200)}`
  ).join('\n\n');

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: `You are an AI performance analyst. Analyze conversations from a ${client.industry ?? 'business'} AI worker named "${config.aiName ?? 'Kyra'}" at "${config.businessName ?? client.name}". 

Return EXACTLY 3 specific, actionable suggestions to improve the AI's performance. Each suggestion must be:
1. Specific to what you observed in the conversations
2. Immediately actionable (add X info, change Y tone, include Z in responses)
3. No more than 2 sentences

Format as JSON array:
[{"title": "short title", "problem": "what you observed", "fix": "specific action to take"}]

Only return the JSON array. No other text.`,
        },
        {
          role: 'user',
          content: `Recent conversations:\n\n${conversationSample}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '[]';
    // Strip markdown code blocks if present
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const suggestions = JSON.parse(cleaned);

    return NextResponse.json({ suggestions, analyzed: convs.length });
  } catch (err) {
    console.error('[ai-suggestions]', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
