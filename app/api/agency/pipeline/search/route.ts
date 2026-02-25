/**
 * POST /api/agency/pipeline/search
 * Lead discovery — finds REAL companies, verifies their websites exist.
 *
 * Architecture:
 * 1. GPT-4o identifies real companies in the target market (it's good at this)
 * 2. Website verification via HTTP HEAD/GET — fake companies get DROPPED
 * 3. NO people names, NO LinkedIn URLs — those come from enrichment (Phase 2)
 *    which actually scrapes the company website to find real team members
 *
 * Why this works: Companies are verifiable (website exists or not).
 * People are discoverable from company websites during enrichment.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

/**
 * Verify a website actually exists. Tries HEAD first, then GET.
 */
async function verifyWebsite(url: string): Promise<{ ok: boolean; finalUrl?: string }> {
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  // Try HEAD
  try {
    const res = await fetch(fullUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(6_000),
      redirect: 'follow',
    });
    if (res.ok || [301, 302, 403, 405].includes(res.status)) {
      return { ok: true, finalUrl: res.url || fullUrl };
    }
  } catch { /* try GET */ }
  // Fallback: GET
  try {
    const res = await fetch(fullUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(6_000),
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    if (res.ok || res.status === 403) {
      return { ok: true, finalUrl: res.url || fullUrl };
    }
  } catch { /* unreachable */ }
  return { ok: false };
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

  const { data: campaign } = await svc
    .from('pipeline_campaigns')
    .select('*')
    .eq('id', campaign_id)
    .eq('agency_id', agencyId)
    .single();
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  const count = criteria?.count ?? 25;
  const industry = criteria?.industry || campaign.target_industry || 'digital marketing agencies';
  const role = criteria?.role || campaign.target_role || 'CEO, Founder, Owner';
  const companySize = criteria?.company_size || campaign.target_company_size || '5-50';
  const location = criteria?.location || campaign.target_location || 'United States';
  const painPoints = criteria?.pain_points || campaign.target_pain_points || '';

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });

  // ══════════════════════════════════════════════════════════════
  // Stage 1: GPT-4o finds REAL companies (NOT people)
  // ══════════════════════════════════════════════════════════════
  const generateCount = Math.min(Math.ceil(count * 3), 150); // 3x overshoot for verification

  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [{
        role: 'system',
        content: `You are a B2B company researcher. Find REAL businesses that match the target profile.

YOUR JOB: Identify real companies. NOT people — just companies.

CRITICAL RULES:
1. Every company MUST be a REAL business that EXISTS with a REAL website.
2. The "website" field must be the company's ACTUAL domain (e.g. cardinaldigitalmarketing.com, socialsellinator.com). NOT made-up domains.
3. Think LOCAL. These are real businesses with physical locations or local operations. Think about businesses you'd find on Google Maps, Yelp, Clutch, local directories, industry listings, BBB, Yellow Pages, Chamber of Commerce directories, or local news articles.
4. DO NOT include any person names. Leave first_name and last_name as empty strings.
5. DO NOT include LinkedIn URLs. Leave linkedin_url as empty string.
6. The "title" field should describe the decision-maker ROLE (e.g. "Owner", "Founder", "CEO") — NOT a specific person.
7. Be VERY specific with websites — use the EXACT domain you know from your training data. If you're not 95% sure of the domain, DO NOT include that company.
8. Focus on REAL local/regional businesses, not just big national brands. Include small businesses (5-50 employees), mid-size, and local market leaders.
9. If the location is specific (a city), think about businesses actually located IN that city or metro area.
10. Include their physical city/area in the location field.

Generate exactly ${generateCount} companies.

Target profile:
- Industry: ${industry}
- Decision-maker we'd target: ${role}
- Company size: ${companySize} employees
- Location: ${location}
${painPoints ? `- Their likely challenges: ${painPoints}` : ''}

Return JSON: { "companies": [
  {
    "company": "REAL company name",
    "industry": "their specific sub-industry",
    "company_size": "estimated headcount (e.g. '15 employees', '50-100 employees')",
    "location": "city, state/country",
    "website": "their-actual-domain.com",
    "target_role": "the decision-maker role to target",
    "why_qualified": "one sentence on why they match the criteria",
    "services": "brief description of what they do"
  }
] }`
      }],
      temperature: 0.4,
      max_tokens: 10000,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!aiRes.ok) {
    const err = await aiRes.text().catch(() => 'Unknown error');
    return NextResponse.json({ error: `AI error: ${err.slice(0, 200)}` }, { status: 500 });
  }

  const aiData = await aiRes.json();
  const content = aiData.choices?.[0]?.message?.content;
  if (!content) return NextResponse.json({ error: 'Empty AI response' }, { status: 500 });

  let parsed: { companies: Array<Record<string, string>> };
  try {
    parsed = JSON.parse(content);
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
  }

  if (!parsed.companies?.length) return NextResponse.json({ error: 'No companies found' }, { status: 500 });

  // ══════════════════════════════════════════════════════════════
  // Stage 2: Verify every website actually exists
  // ══════════════════════════════════════════════════════════════
  const verified: Array<Record<string, string>> = [];
  const failed: string[] = [];

  // Process in batches of 8 for speed
  for (let i = 0; i < parsed.companies.length && verified.length < count; i += 8) {
    const batch = parsed.companies.slice(i, i + 8);
    const results = await Promise.allSettled(
      batch.map(async (c) => {
        if (!c.website) return { company: c, ok: false };
        const check = await verifyWebsite(c.website);
        return { company: c, ok: check.ok, finalUrl: check.finalUrl };
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.ok && verified.length < count) {
        verified.push(r.value.company);
      } else if (r.status === 'fulfilled' && !r.value.ok) {
        failed.push(r.value.company.website || r.value.company.company || 'unknown');
      }
    }
  }

  if (!verified.length) {
    return NextResponse.json({
      error: 'No companies passed website verification. Try broader criteria.',
      failed: failed.slice(0, 10),
    }, { status: 422 });
  }

  // ══════════════════════════════════════════════════════════════
  // Stage 3: Insert verified companies into DB
  // People names, emails, LinkedIn come later in Phase 2 (enrichment)
  // ══════════════════════════════════════════════════════════════
  const rows = verified.map((c) => ({
    campaign_id,
    agency_id: agencyId,
    first_name: '',
    last_name: '',
    full_name: `${c.target_role || 'Decision Maker'} at ${c.company}`,
    title: c.target_role || role.split(',')[0]?.trim() || 'Decision Maker',
    company: c.company || '',
    industry: c.industry || industry,
    company_size: c.company_size || companySize,
    location: c.location || location,
    website: c.website || '',
    linkedin_url: '', // Never hallucinated — comes from enrichment if found
    email: '',        // Comes from enrichment
    stage: 'found',
    enrichment_data: {
      source: 'verified-company',
      why_qualified: c.why_qualified || '',
      services: c.services || '',
      website_verified: true,
      verified_at: new Date().toISOString(),
    },
  }));

  const { data: leads, error: insertErr } = await svc
    .from('pipeline_leads').insert(rows).select();
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  await svc.from('pipeline_campaigns').update({
    leads_found: (campaign.leads_found ?? 0) + (leads?.length ?? 0),
  }).eq('id', campaign_id);

  return NextResponse.json({
    leads,
    count: leads?.length ?? 0,
    verified: verified.length,
    dropped: failed.length,
    dropped_examples: failed.slice(0, 5),
    note: 'Real companies with verified websites. Click "Research All" to discover actual team members from their websites.',
  });
}
