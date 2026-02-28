// Allow up to 5 minutes for bulk enrichment (48+ leads)
export const maxDuration = 300;

/**
 * POST /api/agency/pipeline/enrich
 * Deep enrichment — scrapes website, extracts contacts, socials, and writes killer emails.
 *
 * What gets extracted from the actual website:
 * - Phone numbers (regex on HTML)
 * - Email addresses (regex on HTML)
 * - Social media profiles (Facebook, Instagram, Twitter/X, YouTube, TikTok)
 * - Team member names from /about, /team pages
 * - Services, clients, tech stack, positioning
 *
 * Then GPT-4o uses ALL this real data to:
 * - Identify the decision-maker
 * - Write a hyper-personalized email
 * - Write an SMS opener
 *
 * BULK FIX: Processes leads in parallel batches of 3 (was sequential = timeout on 48+ leads)
 * BYOK FIX: Uses agency's own API key when available, skips credit deduction for BYOK
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { logAndFire } from '@/lib/pipeline/webhooks';
import { requireCredits, deductCredits } from '@/lib/billing/credit-engine';
import { resolveAgencyApiKey } from '@/lib/billing/byok';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

// ────────────────────────────────────────────────────────────────
// Website scraping utilities
// ────────────────────────────────────────────────────────────────

async function fetchRawHtml(url: string): Promise<string> {
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
    return await res.text();
  } catch {
    return '';
  }
}

/** Extract readable text from HTML */
function htmlToText(html: string, maxChars = 5000): string {
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '';
  const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] || '';

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
  parts.push(text);
  return parts.join('\n').slice(0, maxChars);
}

/** Extract all email addresses from raw HTML */
function extractEmails(html: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(emailRegex) || [];
  // Filter out common non-person emails and image files
  const filtered = matches.filter(e => {
    const lower = e.toLowerCase();
    return !lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.gif')
      && !lower.endsWith('.svg') && !lower.endsWith('.webp')
      && !lower.includes('example.com') && !lower.includes('sentry.')
      && !lower.includes('wixpress') && !lower.includes('googleapis')
      && !lower.includes('@2x') && !lower.includes('@3x');
  });
  return [...new Set(filtered)]; // dedupe
}

/** Extract phone numbers from raw HTML */
function extractPhones(html: string): string[] {
  // Strip HTML tags for cleaner extraction
  const text = html.replace(/<[^>]+>/g, ' ');
  const phoneRegex = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
  const telRegex = /tel:([+\d\-.\s()]+)/gi;

  const matches: string[] = [];

  // From tel: links (most reliable)
  let telMatch;
  while ((telMatch = telRegex.exec(html)) !== null) {
    const num = telMatch[1].replace(/\s+/g, '').trim();
    if (num.length >= 10) matches.push(num);
  }

  // From page text
  const textMatches = text.match(phoneRegex) || [];
  for (const m of textMatches) {
    const clean = m.replace(/[^\d+]/g, '');
    if (clean.length >= 10 && clean.length <= 15) matches.push(m.trim());
  }

  return [...new Set(matches)].slice(0, 5); // max 5
}

/** Extract social media profile URLs from HTML */
function extractSocials(html: string): Record<string, string> {
  const socials: Record<string, string> = {};

  const patterns: [string, RegExp][] = [
    ['facebook', /href=["'](https?:\/\/(?:www\.)?facebook\.com\/[^"'\s#?]+)/gi],
    ['instagram', /href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'\s#?]+)/gi],
    ['twitter', /href=["'](https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^"'\s#?]+)/gi],
    ['youtube', /href=["'](https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/)[^"'\s#?]+)/gi],
    ['tiktok', /href=["'](https?:\/\/(?:www\.)?tiktok\.com\/@[^"'\s#?]+)/gi],
    ['linkedin', /href=["'](https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[^"'\s#?]+)/gi],
    ['yelp', /href=["'](https?:\/\/(?:www\.)?yelp\.com\/biz\/[^"'\s#?]+)/gi],
    ['google_business', /href=["'](https?:\/\/(?:www\.)?google\.com\/maps\/[^"'\s#?]+)/gi],
  ];

  for (const [name, regex] of patterns) {
    const match = regex.exec(html);
    if (match?.[1]) {
      // Clean up trailing slashes and fragments
      socials[name] = match[1].replace(/\/+$/, '');
    }
  }

  return socials;
}

/** Try to fetch team/about pages */
async function fetchTeamPages(baseUrl: string): Promise<{ text: string; html: string }> {
  const base = (baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`).replace(/\/$/, '');
  const paths = ['/about', '/about-us', '/team', '/our-team', '/people', '/leadership', '/who-we-are', '/meet-the-team', '/staff', '/about-us/'];

  const textParts: string[] = [];
  const htmlParts: string[] = [];

  for (let i = 0; i < paths.length; i += 3) {
    const batch = paths.slice(i, i + 3);
    const fetched = await Promise.allSettled(
      batch.map(p => fetchRawHtml(`${base}${p}`))
    );
    for (const r of fetched) {
      if (r.status === 'fulfilled' && r.value.length > 500) {
        htmlParts.push(r.value);
        textParts.push(htmlToText(r.value, 3000));
      }
    }
    if (textParts.length >= 2) break;
  }

  return {
    text: textParts.join('\n---\n').slice(0, 5000),
    html: htmlParts.join('\n'),
  };
}

// ────────────────────────────────────────────────────────────────
// Main route
// ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { lead_ids } = await req.json();
  if (!lead_ids?.length) return NextResponse.json({ error: 'lead_ids required' }, { status: 400 });

  // ── Resolve API key: agency BYOK first, then platform key ──
  const resolved = await resolveAgencyApiKey(agencyId);
  if (!resolved.apiKey) {
    return NextResponse.json({ error: 'No API key configured. Add your own OpenAI key in Settings or contact support.' }, { status: 500 });
  }
  const apiKey = resolved.apiKey;
  const isByok = resolved.isByok;

  const svc = createServiceClientWithoutCookies();

  const { data: leads } = await svc
    .from('pipeline_leads')
    .select('*, pipeline_campaigns!inner(id, value_prop, target_pain_points, name)')
    .in('id', lead_ids)
    .eq('agency_id', agencyId);

  if (!leads?.length) return NextResponse.json({ error: 'No leads found' }, { status: 404 });

  // ── Pre-flight credit check (2 credits per lead) — SKIP if BYOK ──
  const enrichableLeads = leads.filter((l: Record<string, unknown>) => l.stage === 'approved' || l.stage === 'found');
  if (!isByok) {
    const creditCheck = await requireCredits(agencyId, 'pipeline.enrich', enrichableLeads.length);
    if (!creditCheck.allowed) {
      return NextResponse.json({
        error: 'Insufficient credits',
        balance: creditCheck.balance,
        cost: creditCheck.cost,
        shortfall: creditCheck.shortfall,
        message: `Enriching ${enrichableLeads.length} leads costs ${creditCheck.cost} credits but you have ${creditCheck.balance}. Add credits or add your own API key in Settings to continue.`,
        buyUrl: '/agency/credits',
      }, { status: 402 });
    }
  }

  // Stage gate: only approved leads can be researched
  const invalidLeads = leads.filter((l: Record<string, unknown>) => l.stage !== 'approved' && l.stage !== 'found');
  if (invalidLeads.length === leads.length) {
    return NextResponse.json({ error: 'All leads must be in "approved" or "found" stage to be researched' }, { status: 400 });
  }

  const results: Array<{
    id: string;
    status: 'enriched' | 'error';
    error?: string;
    found_person?: boolean;
    found_emails?: number;
    found_phones?: number;
    found_socials?: number;
  }> = [];

  // ── Process in PARALLEL batches of 3 (was sequential = timeout on 48+ leads) ──
  const BATCH_SIZE = 3;

  const processLead = async (lead: typeof leads[number]) => {
    const campaign = (lead as Record<string, unknown>).pipeline_campaigns as Record<string, string> | undefined;
    const valueProp = campaign?.value_prop || 'AI-powered workforce platform for agencies';
    const painPoints = campaign?.target_pain_points || '';

    try {
      // ─── Stage 1: Scrape everything from their website ──────────
      let homepageHtml = '';
      let homepageText = '';
      let teamPageText = '';
      let teamPageHtml = '';
      let allEmails: string[] = [];
      let allPhones: string[] = [];
      let allSocials: Record<string, string> = {};

      if (lead.website) {
        // Fetch homepage + team pages in parallel
        const [homeResult, teamResult] = await Promise.allSettled([
          fetchRawHtml(lead.website),
          fetchTeamPages(lead.website),
        ]);

        if (homeResult.status === 'fulfilled' && homeResult.value) {
          homepageHtml = homeResult.value;
          homepageText = htmlToText(homepageHtml, 5000);
        }
        if (teamResult.status === 'fulfilled') {
          teamPageText = teamResult.value.text;
          teamPageHtml = teamResult.value.html;
        }

        // Extract contacts from ALL scraped HTML
        const combinedHtml = homepageHtml + '\n' + teamPageHtml;
        allEmails = extractEmails(combinedHtml);
        allPhones = extractPhones(combinedHtml);
        allSocials = extractSocials(combinedHtml);
      }

      const hasWebContent = homepageText.length > 100;
      const hasTeamContent = teamPageText.length > 100;

      // ─── Stage 2: GPT-4o deep analysis + email writing ──────────
      const prompt = `You are an elite B2B sales researcher and cold email copywriter. You have access to this company's REAL website content. Your job:

1. IDENTIFY THE DECISION-MAKER by reading the website content below
2. DEEPLY RESEARCH this company based on what you find
3. WRITE A KILLER personalized cold email that will get a reply

${hasWebContent ? `═══ HOMEPAGE: ${lead.company} (${lead.website}) ═══
${homepageText}
═══ END HOMEPAGE ═══` : `⚠️ Could not access homepage for ${lead.website || 'unknown'}.`}

${hasTeamContent ? `═══ TEAM / ABOUT PAGES ═══
${teamPageText}
═══ END TEAM PAGES ═══` : ''}

${allEmails.length ? `📧 Emails found on site: ${allEmails.join(', ')}` : ''}
${allPhones.length ? `📞 Phones found on site: ${allPhones.join(', ')}` : ''}
${Object.keys(allSocials).length ? `📱 Social profiles found: ${Object.entries(allSocials).map(([k,v]) => `${k}: ${v}`).join(', ')}` : ''}

COMPANY: ${lead.company}
INDUSTRY: ${lead.industry || 'Unknown'}
LOCATION: ${lead.location || 'Unknown'}
SIZE: ${lead.company_size || 'Unknown'}
TARGET ROLE: ${lead.title || 'Owner/Founder'}

WE ARE SELLING: ${valueProp}
THEIR LIKELY CHALLENGES: ${painPoints}

RULES:
1. DECISION-MAKER: Only use names you ACTUALLY found in the website content. If no name is visible, return empty strings. NEVER make up names.
2. BEST EMAIL: Pick the most likely decision-maker email from the ones found on the website. If none found, return empty string.
3. BEST PHONE: Pick the main business phone from those found. If none found, return empty string.
4. COMPANY DEEP DIVE: Extract everything — what they do, who they serve, their specialties, any clients/testimonials mentioned, tools/tech they use, awards, years in business.
5. EMAIL WRITING — THIS IS CRITICAL:
   - Line 1: A specific observation about THEIR business that proves you looked (reference something from their site)
   - Line 2: Connect their situation to a pain point they likely have
   - Line 3: One sentence about how we solve it (not a pitch — a bridge)
   - Line 4: A soft, curious question as CTA (not "let's hop on a call" — something they WANT to answer)
   - Sign off: "Angel Castro, Conversion System"
   - Tone: Like a peer texting another business owner. Conversational. Zero corporate speak. Zero "I hope this finds you well."
   - Include CTA link naturally: https://kyra.conversionsystem.com/get-demo
6. SUBJECT LINE: Must create curiosity. Max 6 words. No spam words (free, guarantee, limited). Think about what would make YOU open an email.
7. SMS OPENER: Under 160 chars. Punchy. Reference their business name.

Return JSON:
{
  "found_first_name": "real first name from website OR empty string",
  "found_last_name": "real last name from website OR empty string",
  "found_title": "their actual title from website OR target role",
  "best_email": "most relevant email from website OR empty string",
  "best_phone": "main phone from website OR empty string",
  "company_context": "3-4 sentences deep dive: what they do, who they serve, specialties",
  "services_offered": "comma-separated list of their services/offerings",
  "clients_mentioned": "any client names or testimonials found on their site",
  "tech_stack": "any tools, platforms, or tech mentioned on their site",
  "years_in_business": "if mentioned on site, otherwise empty string",
  "number_of_employees": "if visible on site, otherwise use estimate",
  "likely_pain_points": "3 specific pain points based on their actual business",
  "opportunity_angle": "2 sentences on exactly how our product helps them specifically",
  "icebreaker": "one specific verifiable fact from their website",
  "personalized_subject": "6-word max curiosity-driven subject line",
  "personalized_email": "4-line cold email following the rules above",
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
          max_tokens: 2500,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!aiRes.ok) {
        return { id: lead.id, status: 'error' as const, error: `OpenAI ${aiRes.status}` };
      }

      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content || '{}');

      const firstName = parsed.found_first_name || '';
      const lastName = parsed.found_last_name || '';
      const hasRealPerson = firstName.length > 1 && lastName.length > 1;

      // Build comprehensive enrichment data
      const enrichmentData: Record<string, unknown> = {
        company_context: parsed.company_context || '',
        services_offered: parsed.services_offered || '',
        clients_mentioned: parsed.clients_mentioned || '',
        tech_stack: parsed.tech_stack || '',
        years_in_business: parsed.years_in_business || '',
        number_of_employees: parsed.number_of_employees || '',
        likely_pain_points: parsed.likely_pain_points || '',
        opportunity_angle: parsed.opportunity_angle || '',
        icebreaker: parsed.icebreaker || '',
        // Contact data found on website
        emails_found: allEmails,
        phones_found: allPhones,
        socials: allSocials,
        // Meta
        has_website_data: hasWebContent,
        has_team_page: hasTeamContent,
        homepage_chars: homepageText.length,
        person_source: hasRealPerson ? 'website' : 'none',
        enriched_at: new Date().toISOString(),
      };

      const updateData: Record<string, unknown> = {
        enrichment_data: enrichmentData,
        personalized_subject: parsed.personalized_subject || '',
        personalized_email: parsed.personalized_email || '',
        personalized_opener: parsed.personalized_opener || '',
        stage: 'researched',
      };

      // Person info — only if found on the actual website
      if (hasRealPerson) {
        updateData.first_name = firstName;
        updateData.last_name = lastName;
        updateData.full_name = `${firstName} ${lastName}`.trim();
        updateData.title = parsed.found_title || lead.title;
      }

      // Best email — from website extraction + AI selection
      const bestEmail = parsed.best_email || allEmails[0] || '';
      if (bestEmail && bestEmail.includes('@')) {
        updateData.email = bestEmail;
      }

      // Best phone — from website extraction + AI selection
      const bestPhone = parsed.best_phone || allPhones[0] || '';
      if (bestPhone && bestPhone.length >= 10) {
        updateData.phone = bestPhone;
      }

      await svc.from('pipeline_leads').update(updateData).eq('id', lead.id);

      // Fire lead.researched webhook
      const campaignInfo = (lead as Record<string, unknown>).pipeline_campaigns as { id: string; name: string };
      await logAndFire(
        agencyId,
        'lead.researched',
        { id: campaignInfo.id, name: campaignInfo.name },
        {
          id: lead.id,
          full_name: hasRealPerson ? `${firstName} ${lastName}`.trim() : lead.full_name,
          company: lead.company,
          email: bestEmail || null,
          phone: bestPhone || null,
          website: lead.website,
          industry: lead.industry,
          location: lead.location,
          stage: 'researched',
          previous_stage: lead.stage,
          personalized_subject: parsed.personalized_subject || null,
          personalized_email: parsed.personalized_email || null,
          personalized_opener: parsed.personalized_opener || null,
        },
        'system',
      );

      return {
        id: lead.id,
        status: 'enriched' as const,
        found_person: hasRealPerson,
        found_emails: allEmails.length,
        found_phones: allPhones.length,
        found_socials: Object.keys(allSocials).length,
      };
    } catch (err) {
      return { id: lead.id, status: 'error' as const, error: err instanceof Error ? err.message : 'Unknown' };
    }
  };

  // Process in batches of 3 for parallel speed without overwhelming the API
  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(processLead));
    results.push(...batchResults);

    // Brief pause between batches to avoid rate limits
    if (i + BATCH_SIZE < leads.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  const enriched = results.filter(r => r.status === 'enriched').length;
  const errors = results.filter(r => r.status === 'error').length;

  // Deduct credits for successfully enriched leads only — SKIP if BYOK
  if (enriched > 0 && !isByok) {
    await deductCredits(agencyId, 'pipeline.enrich', {
      multiplier: enriched,
      description: `Enrich ${enriched} leads`,
    });
  }
  const withPeople = results.filter(r => r.found_person).length;
  const withEmails = results.filter(r => (r.found_emails || 0) > 0).length;
  const withPhones = results.filter(r => (r.found_phones || 0) > 0).length;
  const withSocials = results.filter(r => (r.found_socials || 0) > 0).length;

  return NextResponse.json({
    enriched, errors,
    with_real_people: withPeople,
    with_emails: withEmails,
    with_phones: withPhones,
    with_socials: withSocials,
    byok: isByok,
    credits_charged: isByok ? 0 : enriched * 2,
    results,
  });
}
