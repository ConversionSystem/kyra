import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface GrowthSuggestion {
  type: 'new_page' | 'improve_page' | 'new_city' | 'new_service';
  title: string;
  description: string;
  estimatedVolume?: number;
  slug?: string;
  priority: 'high' | 'medium' | 'low';
  implemented?: boolean;
}

/**
 * POST /api/agency/sites/[id]/growth
 * Run AI growth analysis and return suggestions.
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createServiceClientWithoutCookies();

  const { data: site } = await supabase
    .from('client_sites')
    .select('*')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  const { data: pages } = await supabase
    .from('site_pages')
    .select('slug, page_type, title')
    .eq('site_id', siteId);

  const existingSlugs = (pages || []).map((p: { slug: string }) => p.slug);
  const services = (site.services || []) as Array<{ name: string; slug: string }>;
  const cities = (site.cities || []) as Array<{ name: string; slug: string }>;

  const prompt = `You are an expert local SEO strategist. Analyze this local service business website and generate growth opportunities.

Business: ${site.business_name}
Industry: ${site.industry}
Location: ${site.address?.city || 'Unknown'}, ${site.address?.state || ''}
Services: ${services.map((s) => s.name).join(', ')}
Service Cities: ${cities.map((c) => c.name).join(', ')}
Existing pages: ${existingSlugs.join(', ')}
Total pages: ${existingSlugs.length}

Generate 8-12 specific, high-value growth suggestions. Focus on:
1. Missing service + city combo pages (highest local SEO value)
2. Missing service pages that competitors probably have
3. FAQ pages for high-volume questions in this industry
4. Blog posts for seasonal/informational keywords
5. Pages for services not yet on the site

Return JSON array of suggestions. Each suggestion:
{
  "type": "new_page" | "improve_page" | "new_city" | "new_service",
  "title": "Human-readable suggestion title",
  "description": "1-2 sentence explanation of why this matters",
  "estimatedVolume": <monthly search estimate as integer>,
  "slug": "/suggested-url-slug",
  "priority": "high" | "medium" | "low"
}

Priority guide: high = >500 searches/mo or missing core page; medium = 100-500; low = <100 but still valuable.
Return ONLY the JSON array, no other text.`;

  // Fire-and-forget: run analysis in background to avoid Vercel 10s timeout
  runGrowthAnalysis(siteId, site, prompt, services, cities, existingSlugs, supabase).catch((err) => {
    console.error('[growth] Background analysis failed:', err);
  });

  return NextResponse.json({ ok: true, data: { status: 'analyzing' } });
}

/**
 * PATCH /api/agency/sites/[id]/growth
 * Mark a suggestion as implemented and trigger page generation.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  let body: { suggestion: GrowthSuggestion };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  const { data: site } = await supabase
    .from('client_sites')
    .select('id, growth_suggestions')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  // Mark as implemented in the stored suggestions
  const updatedSuggestions = ((site.growth_suggestions as GrowthSuggestion[]) || []).map((s) =>
    s.slug === body.suggestion.slug && s.title === body.suggestion.title
      ? { ...s, implemented: true }
      : s
  );

  await supabase
    .from('client_sites')
    .update({
      growth_suggestions: updatedSuggestions,
      updated_at: new Date().toISOString(),
    })
    .eq('id', siteId);

  // Fire-and-forget: generate the new page if it has a slug
  if (body.suggestion.slug && body.suggestion.type !== 'improve_page') {
    generateGrowthPage(siteId, body.suggestion, supabase).catch((err) => {
      console.error('[growth] Page generation failed:', err);
    });
  }

  return NextResponse.json({ ok: true, data: { implemented: true } });
}

// ── Background Analysis ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runGrowthAnalysis(
  siteId: string,
  site: any,
  prompt: string,
  services: Array<{ name: string; slug: string }>,
  cities: Array<{ name: string; slug: string }>,
  existingSlugs: string[],
  supabase: any,
): Promise<void> {
  let suggestions: GrowthSuggestion[] = [];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || []);

    suggestions = suggestions.filter(
      (s) => !s.slug || !existingSlugs.includes(s.slug),
    );
  } catch (err) {
    console.error('[growth] AI analysis failed:', err);
    suggestions = generateFallbackSuggestions(site.industry, services, cities, existingSlugs);
  }

  await supabase
    .from('client_sites')
    .update({
      growth_suggestions: suggestions,
      growth_last_analyzed: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', siteId);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateGrowthPage(siteId: string, suggestion: GrowthSuggestion, supabase: any) {
  const { data: site } = await supabase
    .from('client_sites')
    .select('*')
    .eq('id', siteId)
    .single();

  if (!site) return;

  const prompt = `Generate SEO-optimized content for a local service business page.

Business: ${site.business_name}
Page: ${suggestion.title}
URL: ${suggestion.slug}
Industry: ${site.industry}
Location: ${site.address?.city || ''}, ${site.address?.state || ''}

Return JSON:
{
  "title": "Page title",
  "meta_title": "SEO meta title (60 chars max)",
  "meta_description": "Meta description (160 chars max)",
  "hero_h1": "H1 headline",
  "hero_subtitle": "Subtitle",
  "content_sections": [
    { "heading": "Section heading", "body": "2-3 paragraphs", "bullets": ["bullet 1", "bullet 2"] }
  ],
  "faq": [
    { "question": "Q?", "answer": "A." }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const content = JSON.parse(raw);

    // Determine page type from slug
    let pageType = 'utility';
    if (suggestion.type === 'new_city') pageType = 'city';
    else if (suggestion.type === 'new_service') pageType = 'service';

    await supabase.from('site_pages').upsert({
      site_id: siteId,
      slug: suggestion.slug,
      page_type: pageType,
      title: content.title || suggestion.title,
      meta_title: content.meta_title,
      meta_description: content.meta_description,
      hero_h1: content.hero_h1,
      hero_subtitle: content.hero_subtitle,
      content_sections: content.content_sections,
      faq: content.faq,
      source: 'growth_engine',
      generated_at: new Date().toISOString(),
      llm_model: 'gpt-4o-mini',
    }, { onConflict: 'site_id,slug' });

    // Update page_count
    const { count } = await supabase
      .from('site_pages')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId);

    await supabase
      .from('client_sites')
      .update({ page_count: count || 0, updated_at: new Date().toISOString() })
      .eq('id', siteId);
  } catch (err) {
    console.error('[growth] Failed to generate page:', err);
  }
}

function generateFallbackSuggestions(
  industry: string,
  services: Array<{ name: string; slug: string }>,
  cities: Array<{ name: string; slug: string }>,
  existingSlugs: string[]
): GrowthSuggestion[] {
  const suggestions: GrowthSuggestion[] = [];
  const ind = industry?.toLowerCase() || '';

  // Service + city combos
  for (const service of services.slice(0, 3)) {
    for (const city of cities.slice(0, 2)) {
      const slug = `/services/${service.slug}-${city.slug}`;
      if (!existingSlugs.includes(slug)) {
        suggestions.push({
          type: 'new_page',
          title: `${service.name} in ${city.name}`,
          description: `High-intent local page combining your top service with a nearby city. Captures customers searching for ${service.name.toLowerCase()} specifically in ${city.name}.`,
          estimatedVolume: 150,
          slug,
          priority: 'high',
        });
      }
    }
  }

  // Industry FAQ page
  if (!existingSlugs.includes('/faq')) {
    suggestions.push({
      type: 'new_page',
      title: `${industry} FAQ Page`,
      description: 'FAQ pages rank for long-tail question keywords and build trust. Customers researching before calling will find your business first.',
      estimatedVolume: 200,
      slug: '/faq',
      priority: 'medium',
    });
  }

  // Reviews page
  if (!existingSlugs.includes('/reviews')) {
    suggestions.push({
      type: 'new_page',
      title: 'Customer Reviews & Testimonials',
      description: 'A dedicated reviews page boosts trust signals and can rank for "[business name] reviews" searches.',
      estimatedVolume: 50,
      slug: '/reviews',
      priority: 'low',
    });
  }

  // Emergency page for home services
  const emergencyIndustries = ['hvac', 'plumbing', 'electrical', 'roofing'];
  if (emergencyIndustries.some((e) => ind.includes(e)) && !existingSlugs.includes('/emergency')) {
    suggestions.push({
      type: 'new_service',
      title: `Emergency ${industry} Services`,
      description: 'Emergency service pages convert at 3x normal rate. Customers in crisis want immediate help and will call the first relevant result.',
      estimatedVolume: 800,
      slug: '/emergency',
      priority: 'high',
    });
  }

  return suggestions.slice(0, 8);
}
