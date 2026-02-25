/**
 * POST /api/agency/pipeline/search
 * AI-powered lead search — generates realistic prospect profiles matching criteria
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

  const { campaign_id, criteria } = await req.json();
  if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

  const svc = createServiceClientWithoutCookies();

  // Verify campaign belongs to agency
  const { data: campaign } = await svc
    .from('pipeline_campaigns')
    .select('*')
    .eq('id', campaign_id)
    .eq('agency_id', agencyId)
    .single();
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  const count = criteria?.count ?? 10;
  const industry = criteria?.industry || campaign.target_industry || 'technology';
  const role = criteria?.role || campaign.target_role || 'CEO, Founder';
  const companySize = criteria?.company_size || campaign.target_company_size || '11-50';
  const location = criteria?.location || campaign.target_location || 'United States';

  // AI-powered lead generation via OpenAI
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });

  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [{
        role: 'system',
        content: `You are a B2B lead research specialist. Generate exactly ${count} realistic prospect profiles for outbound sales.

Target:
- Industry: ${industry}
- Decision-maker roles: ${role}
- Company size: ${companySize} employees
- Location: ${location}

Return JSON: { "leads": [ { "first_name": "...", "last_name": "...", "title": "...", "company": "...", "industry": "...", "company_size": "...", "location": "...", "website": "...", "linkedin_url": "..." } ] }

Rules:
- Generate realistic but fictional companies and people
- Vary the titles (CEO, Founder, VP Sales, Director of Marketing, etc.)
- Include realistic-looking websites (company-name.com format)
- LinkedIn URLs: linkedin.com/in/firstname-lastname format
- Make each profile unique and detailed
- company_size should be an estimate like "15 employees" or "50-100 employees"`
      }],
      temperature: 0.9,
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!aiRes.ok) {
    const err = await aiRes.text().catch(() => 'Unknown error');
    return NextResponse.json({ error: `OpenAI error: ${err.slice(0, 200)}` }, { status: 500 });
  }

  const aiData = await aiRes.json();
  const content = aiData.choices?.[0]?.message?.content;
  if (!content) return NextResponse.json({ error: 'Empty AI response' }, { status: 500 });

  let parsed: { leads: Array<Record<string, string>> };
  try {
    parsed = JSON.parse(content);
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
  }

  if (!parsed.leads?.length) return NextResponse.json({ error: 'No leads generated' }, { status: 500 });

  // Insert leads into DB
  const rows = parsed.leads.map((l) => ({
    campaign_id,
    agency_id: agencyId,
    first_name: l.first_name || '',
    last_name: l.last_name || '',
    full_name: `${l.first_name || ''} ${l.last_name || ''}`.trim(),
    title: l.title || '',
    company: l.company || '',
    industry: l.industry || industry,
    company_size: l.company_size || companySize,
    location: l.location || location,
    website: l.website || '',
    linkedin_url: l.linkedin_url || '',
    stage: 'found',
  }));

  const { data: leads, error: insertErr } = await svc
    .from('pipeline_leads')
    .insert(rows)
    .select();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Update campaign counter
  await svc.from('pipeline_campaigns').update({
    leads_found: (campaign.leads_found ?? 0) + (leads?.length ?? 0),
  }).eq('id', campaign_id);

  return NextResponse.json({ leads, count: leads?.length ?? 0 });
}
