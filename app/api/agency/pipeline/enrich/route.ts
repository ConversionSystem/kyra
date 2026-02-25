/**
 * POST /api/agency/pipeline/enrich
 * AI enrichment — fetches REAL website content, then generates hyper-personalized messaging.
 *
 * Two-stage approach:
 * 1. Fetch the company's actual website → extract readable text
 * 2. Feed REAL content to GPT-4o → generate personalized outreach based on facts
 *
 * This means every email references REAL things about the prospect's company.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

/**
 * Fetch a website and extract readable text content.
 * Strips scripts, styles, HTML tags → clean text for AI processing.
 */
async function fetchWebsiteContent(url: string, maxChars = 4000): Promise<string> {
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

    // Extract meta description
    const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] || '';

    // Extract title
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '';

    // Extract OG description
    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1] || '';

    // Strip scripts, styles, nav, footer, then tags
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyHtml = bodyMatch?.[1] || html;

    const text = bodyHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' [HEADER] ')
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n## $1\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#?\w+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Combine structured metadata with body text
    const parts: string[] = [];
    if (title) parts.push(`Page Title: ${title}`);
    if (metaDesc) parts.push(`Meta Description: ${metaDesc}`);
    if (ogDesc && ogDesc !== metaDesc) parts.push(`OG Description: ${ogDesc}`);
    if (text) parts.push(`\nPage Content:\n${text}`);

    return parts.join('\n').slice(0, maxChars);
  } catch {
    return '';
  }
}

/**
 * Try to fetch an "about" page for deeper company context.
 */
async function fetchAboutPage(baseUrl: string, maxChars = 2000): Promise<string> {
  const aboutPaths = ['/about', '/about-us', '/about-us/', '/our-story', '/team', '/who-we-are'];
  const base = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  const cleanBase = base.replace(/\/$/, '');

  for (const path of aboutPaths) {
    const content = await fetchWebsiteContent(`${cleanBase}${path}`, maxChars);
    if (content.length > 200) { // Has meaningful content
      return content;
    }
  }
  return '';
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

  const results: Array<{
    id: string;
    status: 'enriched' | 'error';
    error?: string;
    website_content_length?: number;
  }> = [];

  // Process leads in serial (respect rate limits + website fetching)
  for (const lead of leads) {
    const campaign = (lead as Record<string, unknown>).pipeline_campaigns as Record<string, string> | undefined;
    const valueProp = campaign?.value_prop || 'AI-powered workforce platform for agencies';
    const painPoints = campaign?.target_pain_points || '';

    try {
      // ──────────────────────────────────────────────
      // Stage 1: Fetch REAL website content
      // ──────────────────────────────────────────────
      let websiteContent = '';
      let aboutContent = '';

      if (lead.website) {
        // Fetch homepage + about page in parallel
        const [homeResult, aboutResult] = await Promise.allSettled([
          fetchWebsiteContent(lead.website, 4000),
          fetchAboutPage(lead.website, 2000),
        ]);
        websiteContent = homeResult.status === 'fulfilled' ? homeResult.value : '';
        aboutContent = aboutResult.status === 'fulfilled' ? aboutResult.value : '';
      }

      const hasRealData = websiteContent.length > 100;

      // ──────────────────────────────────────────────
      // Stage 2: GPT-4o enrichment based on REAL data
      // ──────────────────────────────────────────────
      const prompt = `You are an expert B2B sales researcher and cold email copywriter.

${hasRealData ? `I've scraped this company's actual website. Use ONLY the information below — do NOT make up facts about them. If the website content doesn't tell you something, say "unclear from their site" rather than guessing.

=== REAL WEBSITE CONTENT (${lead.company}) ===
${websiteContent}
${aboutContent ? `\n=== ABOUT PAGE ===\n${aboutContent}` : ''}
=== END WEBSITE CONTENT ===` : `I could not fetch their website (${lead.website || 'no URL'}). Base your research on the company name and industry only. Be conservative — don't claim specific facts you can't verify.`}

PROSPECT:
- Name: ${lead.full_name}
- Title: ${lead.title} at ${lead.company}
- Industry: ${lead.industry}
- Location: ${lead.location || 'Unknown'}
- Company size: ${lead.company_size || 'Unknown'}
- Website: ${lead.website || 'Unknown'}

WE ARE SELLING: ${valueProp}
THEIR LIKELY CHALLENGES: ${painPoints}

IMPORTANT RULES:
1. ${hasRealData ? 'Reference SPECIFIC things from their website (services they offer, clients they mention, tools they use, their positioning).' : 'Keep observations general since we couldn\'t verify their website.'}
2. The email must feel like you actually looked at their business, not a mass blast.
3. The personalized_email MUST be 4-5 sentences max, conversational tone, NOT salesy.
4. End the email with ONE soft question as CTA (not "let's hop on a call").
5. Sign off as "Angel Castro, Conversion System".
6. The opener (SMS/DM) must be under 160 chars and reference something specific.
7. Subject line: curiosity-driven, max 8 words, no spam trigger words.
8. CTA link (include naturally in email): https://kyra.conversionsystem.com/get-demo

Return JSON:
{
  "company_context": "2-3 sentences about what this company ACTUALLY does (based on their website if available)",
  "services_offered": "list their main services/offerings you found on their site, or 'unknown' if site wasn't available",
  "likely_pain_points": "2-3 specific pain points based on their business type and size",
  "opportunity_angle": "1-2 sentences on how our product specifically solves their pain",
  "icebreaker": "one specific, verifiable observation about their company that shows you did real research",
  "personalized_subject": "compelling email subject line",
  "personalized_email": "4-5 sentence cold email. Must feel hand-written, not templated.",
  "personalized_opener": "SMS/DM opener under 160 chars"
}`;

      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5, // Lower than before (was 0.8) — more grounded in real data
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

      await svc.from('pipeline_leads').update({
        enrichment_data: {
          company_context: parsed.company_context || '',
          services_offered: parsed.services_offered || '',
          likely_pain_points: parsed.likely_pain_points || '',
          opportunity_angle: parsed.opportunity_angle || '',
          icebreaker: parsed.icebreaker || '',
          has_real_website_data: hasRealData,
          website_content_chars: websiteContent.length,
          enriched_at: new Date().toISOString(),
        },
        personalized_subject: parsed.personalized_subject || '',
        personalized_email: parsed.personalized_email || '',
        personalized_opener: parsed.personalized_opener || '',
        stage: 'researched',
      }).eq('id', lead.id);

      results.push({
        id: lead.id,
        status: 'enriched',
        website_content_length: websiteContent.length,
      });
    } catch (err) {
      results.push({ id: lead.id, status: 'error', error: err instanceof Error ? err.message : 'Unknown' });
    }

    // Pause between leads (website fetch + AI call = heavy)
    await new Promise(r => setTimeout(r, 500));
  }

  const enriched = results.filter(r => r.status === 'enriched').length;
  const errors = results.filter(r => r.status === 'error').length;
  const withRealData = results.filter(r => r.status === 'enriched' && (r.website_content_length || 0) > 100).length;

  return NextResponse.json({
    enriched,
    errors,
    with_real_website_data: withRealData,
    results,
  });
}
