// ============================================================================
// POST /api/agency/knowledge/auto-train
//
// Auto-trains an AI worker from a website URL.
// Scrapes multiple pages (homepage, about, services, contact, FAQ),
// uses AI to extract structured business knowledge, and creates
// knowledge documents automatically.
//
// Input: { clientId, websiteUrl }
// Output: { documents: [...], persona: string }
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── URL Discovery ──────────────────────────────────────────────────────────
// Common subpages to check beyond the homepage

const SUBPAGE_PATHS = [
  '/about', '/about-us', '/about-me',
  '/services', '/our-services', '/what-we-do',
  '/contact', '/contact-us',
  '/faq', '/faqs', '/frequently-asked-questions',
  '/pricing', '/prices', '/rates',
  '/team', '/our-team', '/staff',
  '/hours', '/location', '/locations',
  '/menu', '/products',
];

// ── HTML → Text ────────────────────────────────────────────────────────────

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Fetch a single page ────────────────────────────────────────────────────

async function fetchPage(url: string): Promise<{ url: string; text: string; title: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        // Use a realistic browser UA to bypass Cloudflare bot detection
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;

    const html = await res.text();

    // Detect Cloudflare/bot challenge pages (empty after strip)
    const isChallenge = html.includes('cf-browser-verification') ||
      html.includes('Just a moment') ||
      html.includes('challenge-platform') ||
      html.includes('_cf_chl_opt');
    if (isChallenge) return null;

    const text = htmlToText(html);
    if (text.length < 50) return null;

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || new URL(url).pathname;

    return { url, text: text.slice(0, 30_000), title };
  } catch {
    return null;
  }
}

// ── Discover valid subpages ────────────────────────────────────────────────

async function discoverPages(baseUrl: string): Promise<Array<{ url: string; text: string; title: string }>> {
  const base = new URL(baseUrl);
  const origin = base.origin;
  const pages: Array<{ url: string; text: string; title: string }> = [];

  // Always fetch homepage first
  const homepage = await fetchPage(origin);
  if (homepage) pages.push(homepage);

  // Try common subpages in parallel (max 6 concurrent)
  const subpageUrls = SUBPAGE_PATHS.map(path => `${origin}${path}`);

  // Batch in groups of 6
  for (let i = 0; i < subpageUrls.length; i += 6) {
    const batch = subpageUrls.slice(i, i + 6);
    const results = await Promise.allSettled(batch.map(url => fetchPage(url)));

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        // Skip pages that are too similar to homepage (redirects, 404 pages with content)
        if (homepage && result.value.text.slice(0, 200) === homepage.text.slice(0, 200)) continue;
        pages.push(result.value);
      }
    }

    // Max 5 subpages + homepage = 6 total
    if (pages.length >= 6) break;
  }

  return pages;
}

// ── AI Extraction ──────────────────────────────────────────────────────────
// Uses GPT-4o-mini to extract structured business info from raw page text

interface ExtractedKnowledge {
  businessName: string;
  industry: string;
  services: string[];
  businessHours: string;
  contactInfo: string;
  location: string;
  faq: Array<{ q: string; a: string }>;
  aboutUs: string;
  keySellingPoints: string[];
  pricing: string;
  teamMembers: string;
  persona: string;
}

async function extractKnowledge(
  pagesText: string,
  clientName: string,
): Promise<ExtractedKnowledge | null> {
  // Use OpenRouter as primary (cheaper + same API), fall back to OpenAI direct key
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const apiKey = openrouterKey ?? openaiKey;
  const apiUrl = openrouterKey
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  if (!apiKey) return null;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(openrouterKey ? { 'HTTP-Referer': 'https://kyra.conversionsystem.com', 'X-Title': 'Kyra Auto-Train' } : {}),
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: [
              'You are a business analyst. Extract structured knowledge from website content.',
              'Output ONLY valid JSON (no markdown fences). Use the exact schema below.',
              'If information is not found, use empty string "" or empty array [].',
              'Schema:',
              '{',
              '  "businessName": "string — official business name",',
              '  "industry": "string — industry/niche (e.g. dental, real estate, cannabis)",',
              '  "services": ["string — each service/product offered"],',
              '  "businessHours": "string — hours of operation if found, else empty",',
              '  "contactInfo": "string — phone, email, address combined",',
              '  "location": "string — city, state, address if found",',
              '  "faq": [{"q": "question", "a": "answer"}],',
              '  "aboutUs": "string — 2-3 sentence description of the business",',
              '  "keySellingPoints": ["string — unique value propositions / differentiators"],',
              '  "pricing": "string — any pricing info found, else empty",',
              '  "teamMembers": "string — key team members/roles if found",',
              `  "persona": "string — a natural 2-sentence personality description for an AI assistant representing this business. Should sound warm and professional, not robotic. Example: 'I\\'m the friendly voice of ${clientName}, always ready to help patients feel welcome and answer questions about our dental services. I know our team, our specialties, and I can help schedule appointments instantly.'"`,
              '}',
            ].join('\n'),
          },
          {
            role: 'user',
            content: `Extract business knowledge for "${clientName}" from their website content:\n\n${pagesText}`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.error('[auto-train] OpenAI error:', res.status);
      return null;
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || '';
    const clean = raw.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('[auto-train] Extraction failed:', err);
    return null;
  }
}

// ── Main Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const body = await request.json().catch(() => ({}));
  const { clientId, websiteUrl } = body;

  if (!clientId || !websiteUrl) {
    return NextResponse.json({ error: 'Missing clientId or websiteUrl' }, { status: 400 });
  }

  // Validate URL
  let url: URL;
  try {
    url = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Verify client belongs to this agency
  const supabase = createServiceClientWithoutCookies();
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, name')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Step 1: Discover and fetch pages
  const pages = await discoverPages(url.toString());
  if (pages.length === 0) {
    return NextResponse.json(
      { error: 'Could not fetch any content from this website. Check the URL and try again.' },
      { status: 400 },
    );
  }

  // Step 2: Combine page content for AI extraction
  const combinedText = pages
    .map(p => `=== PAGE: ${p.title} (${p.url}) ===\n${p.text}`)
    .join('\n\n')
    .slice(0, 60_000); // Keep within token limits

  // Step 3: AI extraction
  const knowledge = await extractKnowledge(combinedText, client.name);
  if (!knowledge) {
    return NextResponse.json(
      { error: 'AI extraction failed. The website may be blocking scrapers.' },
      { status: 500 },
    );
  }

  // Step 4: Create knowledge documents from extracted data
  const docsToCreate: Array<{ title: string; content: string; source_type: string; source_url: string }> = [];

  // 4a. Business Overview
  if (knowledge.aboutUs || knowledge.keySellingPoints.length > 0) {
    const lines: string[] = [];
    if (knowledge.aboutUs) lines.push(knowledge.aboutUs);
    if (knowledge.keySellingPoints.length > 0) {
      lines.push('\nKey differentiators:');
      for (const point of knowledge.keySellingPoints) {
        lines.push(`• ${point}`);
      }
    }
    if (knowledge.location) lines.push(`\nLocation: ${knowledge.location}`);
    if (knowledge.contactInfo) lines.push(`Contact: ${knowledge.contactInfo}`);
    if (knowledge.businessHours) lines.push(`Hours: ${knowledge.businessHours}`);
    if (knowledge.teamMembers) lines.push(`\nTeam: ${knowledge.teamMembers}`);

    docsToCreate.push({
      title: `About ${knowledge.businessName || client.name}`,
      content: lines.join('\n'),
      source_type: 'url',
      source_url: url.origin,
    });
  }

  // 4b. Services
  if (knowledge.services.length > 0) {
    docsToCreate.push({
      title: `Services — ${client.name}`,
      content: knowledge.services.map(s => `• ${s}`).join('\n'),
      source_type: 'url',
      source_url: url.origin,
    });
  }

  // 4c. FAQ
  if (knowledge.faq.length > 0) {
    const faqContent = knowledge.faq
      .map(item => `Q: ${item.q}\nA: ${item.a}`)
      .join('\n\n');
    docsToCreate.push({
      title: `FAQ — ${client.name}`,
      content: faqContent,
      source_type: 'url',
      source_url: url.origin,
    });
  }

  // 4d. Pricing
  if (knowledge.pricing) {
    docsToCreate.push({
      title: `Pricing — ${client.name}`,
      content: knowledge.pricing,
      source_type: 'url',
      source_url: url.origin,
    });
  }

  // Step 5: Save to Supabase
  const createdDocs: string[] = [];
  for (const doc of docsToCreate) {
    const { error: insertErr } = await supabase
      .from('knowledge_documents')
      .insert({
        agency_id: agency.id,
        client_id: clientId,
        title: doc.title,
        content: doc.content,
        source_type: doc.source_type,
        source_url: doc.source_url,
        char_count: doc.content.length,
        enabled: true,
      });

    if (!insertErr) {
      createdDocs.push(doc.title);
    }
  }

  // Step 6: Update client's persona with AI-generated one
  let personaUpdated = false;
  if (knowledge.persona) {
    const { data: currentClient } = await supabase
      .from('agency_clients')
      .select('container_config')
      .eq('id', clientId)
      .single();

    const currentConfig = (currentClient?.container_config || {}) as Record<string, unknown>;
    // Only update if persona is still the default generic one
    const currentPersona = (currentConfig.persona as string) || '';
    const isGeneric = currentPersona.startsWith('AI assistant for') ||
                      currentPersona.startsWith('Helpful AI assistant') ||
                      currentPersona.length < 30;

    if (isGeneric) {
      await supabase
        .from('agency_clients')
        .update({
          container_config: {
            ...currentConfig,
            persona: knowledge.persona,
            website_url: url.origin,
            auto_trained: true,
            auto_trained_at: new Date().toISOString(),
          },
        })
        .eq('id', clientId);
      personaUpdated = true;
    }
  }

  return NextResponse.json({
    ok: true,
    pagesScraped: pages.length,
    pagesFound: pages.map(p => p.url),
    documentsCreated: createdDocs.length,
    documents: createdDocs,
    persona: knowledge.persona || null,
    personaUpdated,
    businessName: knowledge.businessName,
    industry: knowledge.industry,
    extractedData: {
      services: knowledge.services.length,
      faq: knowledge.faq.length,
      hasPricing: !!knowledge.pricing,
      hasHours: !!knowledge.businessHours,
      hasContact: !!knowledge.contactInfo,
      hasTeam: !!knowledge.teamMembers,
    },
  });
}
