/**
 * POST /api/agency/pipeline/enrich
 * AI enrichment — scrapes REAL website content + discovers actual team members.
 *
 * Flow per lead:
 * 1. Fetch company homepage → extract text
 * 2. Fetch /about, /team, /our-team, /about-us pages → find real people
 * 3. Feed ALL real content to GPT-4o → identify decision-maker + write personalized email
 *
 * Result: Real person names from their own website. Real company context.
 * Zero hallucination — everything is grounded in scraped data.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

/**
 * Fetch a URL and extract readable text. Returns empty string on failure.
 */
async function fetchPageText(url: string, maxChars = 5000): Promise<string> {
  try {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const res = await fetch(fullUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) return '';
    const html = await res.text();

    // Extract structured metadata
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '';
    const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] || '';
    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1] || '';

    // Extract body text, strip nav/footer/scripts
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyHtml = bodyMatch?.[1] || html;
    const text = bodyHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n## $1\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#?\w+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const parts: string[] = [];
    if (title) parts.push(`Title: ${title}`);
    if (metaDesc) parts.push(`Description: ${metaDesc}`);
    if (ogDesc && ogDesc !== metaDesc) parts.push(`About: ${ogDesc}`);
    parts.push(text);
    return parts.join('\n').slice(0, maxChars);
  } catch {
    return '';
  }
}

/**
 * Try multiple team/about page paths to find one with real content.
 */
async function fetchTeamPages(baseUrl: string, maxChars = 4000): Promise<string> {
  const base = (baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`).replace(/\/$/, '');
  const paths = ['/about', '/about-us', '/team', '/our-team', '/about-us/', '/people', '/leadership', '/who-we-are', '/meet-the-team', '/staff'];

  const results: string[] = [];
  // Try 3 paths in parallel to save time
  for (let i = 0; i < paths.length; i += 3) {
    const batch = paths.slice(i, i + 3);
    const fetched = await Promise.allSettled(
      batch.map(p => fetchPageText(`${base}${p}`, 3000))
    );
    for (const r of fetched) {
      if (r.status === 'fulfilled' && r.value.length > 150) {
        results.push(r.value);
      }
    }
    if (results.length >= 2) break; // Got enough content
  }
  return results.join('\n---\n').slice(0, maxChars);
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

  const { data: leads } = await svc
    .from('pipeline_leads')
    .select('*, pipeline_campaigns!inner(value_prop, target_pain_points, name)')
    .in('id', lead_ids)
    .eq('agency_id', agencyId);

  if (!leads?.length) return NextResponse.json({ error: 'No leads found' }, { status: 404 });

  const results: Array<{
    id: string;
    status: 'enriched' | 'error';
    error?: string;
    homepage_chars?: number;
    team_page_chars?: number;
    found_person?: boolean;
  }> = [];

  for (const lead of leads) {
    const campaign = (lead as Record<string, unknown>).pipeline_campaigns as Record<string, string> | undefined;
    const valueProp = campaign?.value_prop || 'AI-powered workforce platform for agencies';
    const painPoints = campaign?.target_pain_points || '';

    try {
      // ─── Stage 1: Scrape their actual website ───────────────────
      let homepageContent = '';
      let teamContent = '';

      if (lead.website) {
        const [homeResult, teamResult] = await Promise.allSettled([
          fetchPageText(lead.website, 5000),
          fetchTeamPages(lead.website, 4000),
        ]);
        homepageContent = homeResult.status === 'fulfilled' ? homeResult.value : '';
        teamContent = teamResult.status === 'fulfilled' ? teamResult.value : '';
      }

      const hasWebContent = homepageContent.length > 100;
      const hasTeamContent = teamContent.length > 100;

      // ─── Stage 2: GPT-4o extracts real people + writes email ─────
      const prompt = `You are a B2B sales researcher. I need you to do TWO things:

1. FIND THE DECISION-MAKER: Look through the website content below and identify the real person who is the ${lead.title || 'owner/founder'} or closest decision-maker at this company. Extract their actual name if you can find it.

2. WRITE A PERSONALIZED EMAIL: Based on what you learn about this company from their actual website.

${hasWebContent ? `=== COMPANY HOMEPAGE (${lead.company}) — ${lead.website} ===
${homepageContent}
=== END HOMEPAGE ===` : `No homepage content available for ${lead.website || 'unknown website'}.`}

${hasTeamContent ? `=== TEAM/ABOUT PAGES ===
${teamContent}
=== END TEAM PAGES ===` : ''}

COMPANY: ${lead.company}
INDUSTRY: ${lead.industry || 'Unknown'}
LOCATION: ${lead.location || 'Unknown'}
COMPANY SIZE: ${lead.company_size || 'Unknown'}
TARGET ROLE: ${lead.title || 'Owner/Founder'}

WE ARE SELLING: ${valueProp}
THEIR LIKELY CHALLENGES: ${painPoints}

RULES:
1. For the decision-maker: ONLY use names you actually found in the website content above. If no name is visible, set first_name and last_name to empty strings "".
2. DO NOT make up or guess names. If the about page says "Founded by John Smith" — use that. If there's no name anywhere, leave it blank.
3. DO NOT include any LinkedIn URLs.
4. ${hasWebContent ? 'Reference SPECIFIC things from their website (services, clients, tech stack, positioning).' : 'Keep it general since we could not access their website.'}
5. Email must be 4-5 sentences, conversational, NOT salesy. End with one soft question.
6. Sign off as "Angel Castro, Conversion System"
7. If you found a real person name, address the email to them. If not, use "Hi there" or address to the company.
8. CTA link: https://kyra.conversionsystem.com/get-demo

Return JSON:
{
  "found_first_name": "real first name from website OR empty string",
  "found_last_name": "real last name from website OR empty string",
  "found_title": "their actual title from website OR the target role",
  "found_email": "their email if visible on site OR empty string",
  "company_context": "2-3 sentences about what this company ACTUALLY does based on their site",
  "services_offered": "their main services/offerings from their site",
  "likely_pain_points": "2-3 specific pain points for their business type",
  "opportunity_angle": "how our product solves their specific pain",
  "icebreaker": "one specific observation from their website that shows real research",
  "personalized_subject": "email subject line (max 8 words, curiosity-driven)",
  "personalized_email": "4-5 sentence personalized cold email",
  "personalized_opener": "SMS opener under 160 chars"
}`;

      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 2000,
        }),
        signal: AbortSignal.timeout(45_000),
      });

      if (!aiRes.ok) {
        results.push({ id: lead.id, status: 'error', error: `OpenAI ${aiRes.status}` });
        continue;
      }

      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content || '{}');

      // Update lead with discovered person + enrichment
      const firstName = parsed.found_first_name || '';
      const lastName = parsed.found_last_name || '';
      const hasRealPerson = firstName.length > 1 && lastName.length > 1;

      const updateData: Record<string, unknown> = {
        enrichment_data: {
          company_context: parsed.company_context || '',
          services_offered: parsed.services_offered || '',
          likely_pain_points: parsed.likely_pain_points || '',
          opportunity_angle: parsed.opportunity_angle || '',
          icebreaker: parsed.icebreaker || '',
          has_website_data: hasWebContent,
          has_team_page: hasTeamContent,
          homepage_chars: homepageContent.length,
          person_source: hasRealPerson ? 'website' : 'none',
          enriched_at: new Date().toISOString(),
        },
        personalized_subject: parsed.personalized_subject || '',
        personalized_email: parsed.personalized_email || '',
        personalized_opener: parsed.personalized_opener || '',
        stage: 'researched',
      };

      // Only update person info if we found a real name on the website
      if (hasRealPerson) {
        updateData.first_name = firstName;
        updateData.last_name = lastName;
        updateData.full_name = `${firstName} ${lastName}`.trim();
        updateData.title = parsed.found_title || lead.title;
      }

      // Update email only if found on website (not guessed)
      if (parsed.found_email && parsed.found_email.includes('@')) {
        updateData.email = parsed.found_email;
      }

      await svc.from('pipeline_leads').update(updateData).eq('id', lead.id);

      results.push({
        id: lead.id,
        status: 'enriched',
        homepage_chars: homepageContent.length,
        team_page_chars: teamContent.length,
        found_person: hasRealPerson,
      });
    } catch (err) {
      results.push({ id: lead.id, status: 'error', error: err instanceof Error ? err.message : 'Unknown' });
    }

    // Pause between leads (website fetch + AI = heavy)
    await new Promise(r => setTimeout(r, 500));
  }

  const enriched = results.filter(r => r.status === 'enriched').length;
  const errors = results.filter(r => r.status === 'error').length;
  const withRealPeople = results.filter(r => r.found_person).length;
  const withWebData = results.filter(r => (r.homepage_chars || 0) > 100).length;

  return NextResponse.json({
    enriched,
    errors,
    with_real_people: withRealPeople,
    with_website_data: withWebData,
    results,
  });
}
