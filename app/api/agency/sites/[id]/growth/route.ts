import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import OpenAI from 'openai';

export const maxDuration = 120;

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
 * Deprecated — redirects to the data-driven growth engine.
 * Use GET /api/agency/sites/[id]/seo/growth instead.
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;
  return NextResponse.json({
    ok: true,
    deprecated: true,
    message: 'Use GET /api/agency/sites/[id]/seo/growth for data-driven suggestions',
    redirect: `/api/agency/sites/${siteId}/seo/growth`,
  });
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

    // Generate the new page using waitUntil so Vercel keeps the function alive
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com';
  const apiSecret = process.env.KYRA_API_SECRET || '';

  if (body.suggestion.slug && body.suggestion.type !== 'improve_page') {
    waitUntil(
      generateGrowthPage(siteId, body.suggestion, supabase)
        .then(async () => {
          // After generating the page, trigger a rebuild so it goes live
          if (apiSecret) {
            await fetch(`${appUrl}/api/agency/sites/${siteId}/build-internal`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${apiSecret}`, 'Content-Type': 'application/json' },
            }).catch(() => {});
          }
        })
        .catch((err) => {
          console.error('[growth] Page generation failed:', err);
        })
    );
  }

  return NextResponse.json({ ok: true, data: { implemented: true } });
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

    // Determine page type from slug — must match PageType union ('service', not 'services')
    let pageType = 'utility';
    if (suggestion.type === 'new_city') pageType = 'city';
    else if (suggestion.type === 'new_service') pageType = 'service';
    else if (suggestion.slug?.startsWith('/services/')) pageType = 'service';

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

