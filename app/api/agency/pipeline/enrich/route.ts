/**
 * POST /api/agency/pipeline/enrich
 * AI enrichment — deep research + hyper-personalized messaging per lead
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { lead_ids } = await req.json();
  if (!lead_ids?.length) return NextResponse.json({ error: 'lead_ids required' }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });

  const svc = createServiceClientWithoutCookies();

  // Fetch leads + their campaign (for value_prop)
  const { data: leads } = await svc
    .from('pipeline_leads')
    .select('*, pipeline_campaigns!inner(value_prop, target_pain_points, name)')
    .in('id', lead_ids)
    .eq('agency_id', agencyId);

  if (!leads?.length) return NextResponse.json({ error: 'No leads found' }, { status: 404 });

  const results: Array<{ id: string; status: 'enriched' | 'error'; error?: string }> = [];

  // Process leads in serial (to avoid rate limits)
  for (const lead of leads) {
    const campaign = (lead as Record<string, unknown>).pipeline_campaigns as Record<string, string> | undefined;
    const valueProp = campaign?.value_prop || 'AI-powered automation platform';
    const painPoints = campaign?.target_pain_points || '';

    const prompt = `You are an expert B2B sales researcher and copywriter. Research this prospect and write hyper-personalized outreach.

Prospect: ${lead.full_name}, ${lead.title} at ${lead.company} (${lead.industry}, ${lead.location})
Website: ${lead.website || 'unknown'}
Company size: ${lead.company_size || 'unknown'}

We are selling: ${valueProp}
Their likely pain points: ${painPoints}

Return JSON with these exact keys:
{
  "company_context": "2-3 sentences about what this company likely does and their current situation",
  "likely_pain_points": "2-3 specific pain points this role/company likely faces",
  "opportunity_angle": "1-2 sentences on how our product specifically solves their pain",
  "icebreaker": "one specific, non-generic observation about their company or role that shows research",
  "personalized_subject": "compelling email subject line (curiosity-driven, max 8 words, no spam words)",
  "personalized_email": "4-5 sentence cold email. Mention their company by name. Reference their specific situation. End with one soft question as CTA. Sign off as 'Angel Castro, Conversion System'. Keep it conversational, NOT salesy.",
  "personalized_opener": "one punchy SMS/LinkedIn DM opener under 160 characters"
}`;

    try {
      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 2000,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!aiRes.ok) {
        results.push({ id: lead.id, status: 'error', error: `OpenAI ${aiRes.status}` });
        continue;
      }

      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content || '{}');

      await svc.from('pipeline_leads').update({
        enrichment_data: {
          company_context: parsed.company_context || '',
          likely_pain_points: parsed.likely_pain_points || '',
          opportunity_angle: parsed.opportunity_angle || '',
          icebreaker: parsed.icebreaker || '',
        },
        personalized_subject: parsed.personalized_subject || '',
        personalized_email: parsed.personalized_email || '',
        personalized_opener: parsed.personalized_opener || '',
        stage: 'researched',
      }).eq('id', lead.id);

      results.push({ id: lead.id, status: 'enriched' });
    } catch (err) {
      results.push({ id: lead.id, status: 'error', error: err instanceof Error ? err.message : 'Unknown' });
    }

    // Brief pause between API calls
    await new Promise(r => setTimeout(r, 300));
  }

  const enriched = results.filter(r => r.status === 'enriched').length;
  const errors = results.filter(r => r.status === 'error').length;

  return NextResponse.json({ enriched, errors, results });
}
