// ============================================================================
// Content Engine — Tiered LLM content generation for Kyra Website Builder
//
// Generates all page content for a site using different models per page type:
// - Homepage + About: Claude Sonnet 4 (best writing)
// - Service pages: GPT-4o (detailed, professional)
// - City pages: GPT-4o (local differentiation)
// - City x Service combos: GPT-4o-mini (volume, decent quality)
// - FAQ: Claude Haiku (fast, structured)
// - Meta titles/desc: Claude Haiku (bulk structured output)
// - Contact/Reviews/Schema: Templates (no LLM)
//
// Batch execution: parallel batches of 8, Promise.allSettled for resilience.
// Total budget: ~$0.30 per site.
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { deductCredits } from '@/lib/billing/credit-engine';
import type { ClientSite, SiteService, SiteCity, ContentSection, FaqItem } from './types';
import { INDUSTRY_DEFAULTS } from './industry-defaults';
import {
  homepagePrompt,
  aboutPrompt,
  servicePrompt,
  cityPrompt,
  cityServicePrompt,
  faqPrompt,
  blogPrompt,
  getBlogTopics,
  metaPrompt,
  contactPageData,
  reviewsPageData,
} from './prompts';
import { ensureCityData } from '@/lib/seo/city-data';
import type { CityData } from '@/lib/seo/city-data';
import {
  generateLocalBusinessSchema,
  generateServiceSchema,
  generateFAQSchema,
} from './schema-generator';
import { syncSiteToKnowledgeBase } from './knowledge-sync';
import { checkContentSimilarity, checkIntraSiteSimilarity } from './content-checker';
import { generatePageHTML } from './ai-html-engine';
import { resolvePhotos } from './unsplash';
import type { SitePhoto, DesignStyle } from './types';
import type { StockPhoto } from './unsplash';

// ---------- Constants ----------

// Use OpenRouter if key is set; fall back to OpenAI directly
const HAS_OPENROUTER = !!process.env.OPENROUTER_API_KEY;
const API_URL = HAS_OPENROUTER
  ? 'https://openrouter.ai/api/v1/chat/completions'
  : 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

const BATCH_SIZE = 8;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2000;

// Model routing — OpenRouter uses "provider/model", OpenAI uses just "model"
// Angel directive (Mar 26): Use claude-sonnet-4-6 for all content generation.
// Richer, more professional content across every page type.
const MODELS = HAS_OPENROUTER
  ? {
      hero:        'anthropic/claude-sonnet-4-6',
      service:     'anthropic/claude-sonnet-4-6',
      city:        'anthropic/claude-sonnet-4-6',
      cityService: 'anthropic/claude-sonnet-4-6',
      faq:         'anthropic/claude-sonnet-4-6',
      blog:        'anthropic/claude-sonnet-4-6',
      meta:        'anthropic/claude-sonnet-4-6',
    }
  : {
      // OpenAI fallback — all models via OpenAI directly
      hero:        'gpt-4o',
      service:     'gpt-4o',
      city:        'gpt-4o',
      cityService: 'gpt-4o',
      faq:         'gpt-4o',
      blog:        'gpt-4o',
      meta:        'gpt-4o',
    };

// Increased token limits (Mar 26) for richer, more professional content.
// Previous limits produced thin, generic text. Claude Sonnet 4.6 can
// generate detailed, conversion-optimized copy when given room.
const MAX_TOKENS = {
  hero: 3000,
  service: 2500,
  city: 2000,
  cityService: 1500,
  faq: 3000,
  blog: 2500,
  meta: 800,
} as const;

// Approximate cost per 1K tokens (input + output combined estimate)
const COST_PER_1K: Record<string, number> = {
  'anthropic/claude-sonnet-4-6': 0.015,
  'anthropic/claude-sonnet-4-5': 0.015,
  'openai/gpt-4o': 0.01,
  'openai/gpt-4o-mini': 0.0003,
  'anthropic/claude-3-5-haiku': 0.001,
};

// Industries that are service-area businesses (generate city pages)
const SERVICE_AREA_INDUSTRIES = new Set([
  'hvac',
  'plumbing',
  'electrical',
  'auto',
  'mechanic',
  'roofing',
  'landscaping',
  'pest-control',
  'cleaning',
  'moving',
  'locksmith',
  'towing',
  'tree-service',
  'painting',
  'handyman',
  'garage-door',
  'appliance-repair',
]);

// ---------- Types ----------

interface PageTask {
  slug: string;
  pageType: 'homepage' | 'service' | 'city' | 'city_service' | 'utility' | 'blog';
  title: string;
  model: string;
  maxTokens: number;
  prompt: string;
  // Pre-built data for template pages (no LLM)
  templateData?: {
    hero_h1: string;
    hero_subtitle: string;
    content_sections: ContentSection[];
    faq?: FaqItem[];
    schema_markup?: unknown;
  };
}

interface GenerationResult {
  slug: string;
  success: boolean;
  cost: number;
  error?: string;
}

// ---------- Public API ----------

export async function generateSiteContent(
  siteId: string,
): Promise<{ success: boolean; pageCount: number; error?: string }> {
  const supabase = createServiceClientWithoutCookies();

  // 1. Load site config
  const { data: site, error: siteErr } = await supabase
    .from('client_sites')
    .select('*')
    .eq('id', siteId)
    .single();

  if (siteErr || !site) {
    console.error('[content-engine] Site not found:', siteId, siteErr?.message);
    return { success: false, pageCount: 0, error: `Site not found: ${siteErr?.message}` };
  }

  const clientSite = site as unknown as ClientSite;

  // 1b. Auto-fill services + cities from industry defaults if missing (e.g. Quick Start)
  const industryKey = (clientSite.industry || '').toLowerCase().replace(/\s+/g, '-');
  const industryDefaults = INDUSTRY_DEFAULTS[industryKey];
  if (!clientSite.services?.length && industryDefaults?.services?.length) {
    clientSite.services = industryDefaults.services as SiteService[];
    console.log(`[content-engine] Auto-filled ${clientSite.services.length} services from industry defaults (${industryKey})`);
    // Persist to DB so build step has the services
    await supabase.from('client_sites').update({ services: clientSite.services }).eq('id', siteId);
  }
  if (!clientSite.cities?.length && industryDefaults?.needsGeoPages && industryDefaults?.nearbyCities?.length && clientSite.address?.city) {
    // Use primary city as the starting city
    const primarySlug = clientSite.address.city.toLowerCase().replace(/[^a-z0-9]/g, '-');
    clientSite.cities = [{ name: clientSite.address.city, slug: primarySlug, state: clientSite.address.state || '' }] as SiteCity[];
    console.log(`[content-engine] Auto-filled primary city: ${clientSite.address.city}`);
    await supabase.from('client_sites').update({ cities: clientSite.cities }).eq('id', siteId);
  }
  if (!clientSite.color_primary && industryDefaults?.colors?.primary) {
    clientSite.color_primary = industryDefaults.colors.primary;
    await supabase.from('client_sites').update({ color_primary: clientSite.color_primary }).eq('id', siteId);
  }

  // 2. Update status to 'generating'
  await supabase
    .from('client_sites')
    .update({ status: 'generating' })
    .eq('id', siteId);

  try {
    // 3. Build task list (async — fetches real city data)
    const tasks = await buildTaskList(clientSite);
    console.log(`[content-engine] Generated ${tasks.length} tasks for site ${siteId}`);

    // 4. Execute in batches
    const results = await executeBatched(tasks, siteId, clientSite.agency_id, clientSite.client_id);

    // 5. Generate meta titles/descriptions for pages missing them
    await generateMeta(clientSite, siteId);

    // 5b. Within-site similarity check (blocking — prevents Google deindex)
    try {
      const intraSite = await checkIntraSiteSimilarity(siteId);
      if (!intraSite.passed) {
        console.warn(
          `[content-engine] BLOCKING: ${intraSite.failures.length} page pairs exceed similarity threshold:`,
          intraSite.failures.map(f => `${f.page1} <-> ${f.page2}: ${f.similarity}`).join('; '),
        );
        // Log but don't block the build — flag for review
        // TODO: In future, regenerate offending pages with more differentiated prompts
      }
    } catch (err) {
      console.warn('[content-engine] Intra-site similarity check failed:', err);
    }

    // 5c. Cross-site similarity check (advisory, log only)
    try {
      const { warning } = await checkContentSimilarity(siteId, clientSite.industry, clientSite.address?.state || '');
      if (warning) console.warn('[content-engine] Cross-site similarity warning:', warning);
    } catch (err) {
      console.warn('[content-engine] Cross-site similarity check failed:', err);
    }

    // 6. Count successes
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success);

    if (failed.length > 0) {
      console.warn(
        `[content-engine] ${failed.length} pages failed:`,
        failed.map((f) => `${f.slug}: ${f.error}`).join('; '),
      );
    }

    // 7. Update site status + auto-assign subdomain
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);

    if (succeeded > 0) {
      // Auto-assign subdomain if not already set
      const needsSubdomain = !clientSite.site_domain && !clientSite.site_subdomain;
      const slug = clientSite.business_name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 30);
      const subdomain = needsSubdomain
        ? `${slug}.sites.kyra.conversionsystem.com`
        : undefined;

      await supabase
        .from('client_sites')
        .update({
          status: 'building',
          page_count: succeeded,
          content_generated_at: new Date().toISOString(),
          ...(subdomain ? { site_subdomain: subdomain } : {}),
        })
        .eq('id', siteId);

      console.log(
        `[content-engine] Site ${siteId}: ${succeeded}/${tasks.length} pages generated, cost: $${totalCost.toFixed(4)}`,
      );

      // 8. Sync to AI knowledge base so the chat widget knows the website content
      try {
        await syncSiteToKnowledgeBase(siteId);
      } catch (err) {
        console.error("[CONTENT-ENGINE] Knowledge sync failed (non-fatal):", err);
      }

      // 9. Kick off VPS build via internal API call (separate Vercel function, own maxDuration+waitUntil)
      //    This avoids the 5-min cap: content gen runs in the generate route's waitUntil,
      //    VPS build runs in the build route's waitUntil. Status is 'building' when we get here.
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com';
      fetch(`${appUrl}/api/agency/sites/${siteId}/build-internal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KYRA_API_SECRET || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ internal: true }),
      }).catch((err) => {
        console.error(`[content-engine] Build trigger failed for site ${siteId}:`, err);
      });
    } else {
      await supabase
        .from('client_sites')
        .update({
          status: 'error',
          page_count: 0,
          content_generated_at: new Date().toISOString(),
        })
        .eq('id', siteId);

      console.log(`[content-engine] Site ${siteId}: all ${tasks.length} pages failed`);
    }

    return {
      success: succeeded > 0,
      pageCount: succeeded,
      error:
        failed.length > 0
          ? `${failed.length} page(s) failed to generate`
          : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[content-engine] Fatal error:', message);

    await supabase
      .from('client_sites')
      .update({ status: 'error' })
      .eq('id', siteId);

    return { success: false, pageCount: 0, error: message };
  }
}

/**
 * Regenerate a single page for a site.
 */
export async function regeneratePage(
  siteId: string,
  slug: string,
  userFeedback?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClientWithoutCookies();

  const { data: site } = await supabase
    .from('client_sites')
    .select('*')
    .eq('id', siteId)
    .single();

  if (!site) return { success: false, error: 'Site not found' };

  const clientSite = site as unknown as ClientSite;
  const tasks = await buildTaskList(clientSite);
  const task = tasks.find((t) => t.slug === slug);

  if (!task) return { success: false, error: `Page "${slug}" not found in task list` };

  // If user provided feedback, append it to the prompt
  if (userFeedback) {
    task.prompt += `\n\nUser feedback for revision: ${userFeedback}\nPlease address the feedback while maintaining quality.`;
  }

  // Delete existing page
  await supabase
    .from('site_pages')
    .delete()
    .eq('site_id', siteId)
    .eq('slug', slug);

  const result = await executeTask(task, siteId, clientSite.agency_id, clientSite.client_id);
  return { success: result.success, error: result.error };
}

// ---------- AI HTML Generation (Premium) ----------

const HTML_BATCH_SIZE = 4; // Fewer concurrent since HTML generation is heavier

export async function generateSiteHTML(
  siteId: string,
): Promise<{
  success: boolean;
  pages: Array<{ slug: string; html: string }>;
  totalCost: number;
  error?: string;
}> {
  const supabase = createServiceClientWithoutCookies();

  // 1. Load site config
  const { data: site, error: siteErr } = await supabase
    .from('client_sites')
    .select('*')
    .eq('id', siteId)
    .single();

  if (siteErr || !site) {
    return { success: false, pages: [], totalCost: 0, error: `Site not found: ${siteErr?.message}` };
  }

  const clientSite = site as unknown as ClientSite;

  // 2. Load all generated page content (must run content generation first)
  const { data: pageRows, error: pagesErr } = await supabase
    .from('site_pages')
    .select('*')
    .eq('site_id', siteId)
    .order('page_type');

  if (pagesErr || !pageRows?.length) {
    return { success: false, pages: [], totalCost: 0, error: 'No pages found. Run content generation first.' };
  }

  const designStyle = (clientSite.design_style || 'modern-dark') as DesignStyle;
  const colorPrimary = clientSite.color_primary || '#6366f1';
  const colorSecondary = clientSite.color_secondary || '#111827';
  const photos = resolvePhotos(
    (clientSite.photos || []).map(p => ({ ...p, alt: (p as { alt?: string }).alt || '' })) as StockPhoto[],
    clientSite.industry,
  );

  // 3. Generate HTML for each page in batches of 4
  const results: Array<{ slug: string; html: string; cost: number; error?: string }> = [];

  for (let i = 0; i < pageRows.length; i += HTML_BATCH_SIZE) {
    const batch = pageRows.slice(i, i + HTML_BATCH_SIZE);
    const batchNum = Math.floor(i / HTML_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(pageRows.length / HTML_BATCH_SIZE);

    console.log(`[ai-html-engine] Batch ${batchNum}/${totalBatches}: ${batch.length} pages`);

    const settled = await Promise.allSettled(
      batch.map(async (page: Record<string, unknown>) => {
        try {
          const result = await generatePageHTML({
            site: clientSite,
            page: {
              slug: page.slug as string,
              pageType: page.page_type as string,
              title: page.title as string,
              hero_h1: (page.hero_h1 as string) || (page.title as string),
              hero_subtitle: (page.hero_subtitle as string) || '',
              content_sections: (page.content_sections as ContentSection[]) || [],
              faq: (page.faq as FaqItem[]) || [],
              schema_markup: page.schema_markup,
            },
            designStyle,
            colorPrimary,
            colorSecondary,
            photos,
            agencyId: clientSite.agency_id || undefined,
          });

          // Store HTML in the html_content column
          await supabase
            .from('site_pages')
            .update({ html_content: result.html })
            .eq('id', page.id as string);

          return { slug: page.slug as string, html: result.html, cost: result.cost };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[ai-html-engine] Failed to generate HTML for ${page.slug}:`, message);
          return { slug: page.slug as string, html: '', cost: 0, error: message };
        }
      }),
    );

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({ slug: 'unknown', html: '', cost: 0, error: result.reason?.message });
      }
    }
  }

  // 4. Update generation mode on the site
  await supabase
    .from('client_sites')
    .update({ generation_mode: 'ai-custom' })
    .eq('id', siteId);

  const successfulPages = results.filter((r) => r.html);
  const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
  const failedCount = results.filter((r) => r.error).length;

  if (failedCount > 0) {
    console.warn(`[ai-html-engine] ${failedCount}/${results.length} pages failed HTML generation`);
  }

  console.log(
    `[ai-html-engine] Site ${siteId}: ${successfulPages.length}/${results.length} HTML pages generated, cost: $${totalCost.toFixed(4)}`,
  );

  return {
    success: successfulPages.length > 0,
    pages: successfulPages.map((r) => ({ slug: r.slug, html: r.html })),
    totalCost,
    error: failedCount > 0 ? `${failedCount} page(s) failed HTML generation` : undefined,
  };
}

// ---------- Task Building ----------

async function buildTaskList(site: ClientSite): Promise<PageTask[]> {
  const tasks: PageTask[] = [];
  const industry = site.industry?.toLowerCase() || '';
  const isServiceArea = SERVICE_AREA_INDUSTRIES.has(industry);

  // ── TIER 1: Premium pages (Claude Sonnet 4) ──
  tasks.push({
    slug: '/',
    pageType: 'homepage',
    title: `${site.business_name} | ${site.industry} in ${site.address?.city || 'Your Area'}`,
    model: MODELS.hero,
    maxTokens: MAX_TOKENS.hero,
    prompt: homepagePrompt(site),
  });

  tasks.push({
    slug: '/about',
    pageType: 'utility',
    title: `About ${site.business_name}`,
    model: MODELS.hero,
    maxTokens: MAX_TOKENS.hero,
    prompt: aboutPrompt(site),
  });

  // ── TIER 2: Service pages (GPT-4o) ──
  if (site.services?.length) {
    for (const service of site.services) {
      tasks.push({
        slug: `/services/${service.slug}`,
        pageType: 'service',
        title: `${service.name} | ${site.business_name}`,
        model: MODELS.service,
        maxTokens: MAX_TOKENS.service,
        prompt: servicePrompt(site, service),
      });
    }
  }

  // ── TIER 3: City + City x Service pages (with real city data) ──
  if (site.cities?.length) {
    // Pre-fetch city data for all cities in parallel
    const cityDataMap = new Map<string, CityData | null>();
    const cityDataPromises = site.cities.map(async (c) => {
      try {
        const data = await ensureCityData(c.name, c.state || site.address?.state || '');
        cityDataMap.set(c.slug, data);
      } catch (err) {
        console.warn(`[content-engine] City data fetch failed for ${c.name}:`, err);
        cityDataMap.set(c.slug, null);
      }
    });
    await Promise.all(cityDataPromises);

    for (const city of site.cities) {
      const cityData = cityDataMap.get(city.slug) || null;

      // City overview page
      tasks.push({
        slug: `/${city.slug}`,
        pageType: 'city',
        title: `${site.industry} in ${city.name} | ${site.business_name}`,
        model: MODELS.city,
        maxTokens: MAX_TOKENS.city,
        prompt: cityPrompt(site, city, cityData),
      });

      // City x Service combos (top 3 services only per city)
      const topServices = (site.services || []).slice(0, 3);
      for (const service of topServices) {
        tasks.push({
          slug: `/${city.slug}/${service.slug}`,
          pageType: 'city_service',
          title: `${service.name} in ${city.name} | ${site.business_name}`,
          model: MODELS.cityService,
          maxTokens: MAX_TOKENS.cityService,
          prompt: cityServicePrompt(site, city, service, cityData),
        });
      }
    }
  }

  // ── TIER 4: FAQ (Claude Haiku) ──
  tasks.push({
    slug: '/faq',
    pageType: 'utility',
    title: `FAQ | ${site.business_name}`,
    model: MODELS.faq,
    maxTokens: MAX_TOKENS.faq,
    prompt: faqPrompt(site),
  });

  // ── TIER 5: Blog posts (2 evergreen posts, GPT-4o-mini) ──
  const blogTopics = getBlogTopics(site);
  for (const topic of blogTopics) {
    tasks.push({
      slug: `/blog/${topic.slug}`,
      pageType: 'blog',
      title: topic.title,
      model: MODELS.blog,
      maxTokens: MAX_TOKENS.blog,
      prompt: blogPrompt(site, topic),
    });
  }

  // ── Template pages (no LLM) ──
  const contact = contactPageData(site);
  tasks.push({
    slug: '/contact',
    pageType: 'utility',
    title: contact.title,
    model: 'template',
    maxTokens: 0,
    prompt: '',
    templateData: {
      hero_h1: contact.hero_h1,
      hero_subtitle: contact.hero_subtitle,
      content_sections: contact.content_sections,
    },
  });

  const reviews = reviewsPageData(site);
  tasks.push({
    slug: '/reviews',
    pageType: 'utility',
    title: reviews.title,
    model: 'template',
    maxTokens: 0,
    prompt: '',
    templateData: {
      hero_h1: reviews.hero_h1,
      hero_subtitle: reviews.hero_subtitle,
      content_sections: reviews.content_sections,
    },
  });

  return tasks;
}

// ---------- Batch Execution ----------

async function executeBatched(
  tasks: PageTask[],
  siteId: string,
  agencyId?: string | null,
  clientId?: string | null,
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = [];

  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    const batch = tasks.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(tasks.length / BATCH_SIZE);

    console.log(
      `[content-engine] Batch ${batchNum}/${totalBatches}: ${batch.length} tasks`,
    );

    const settled = await Promise.allSettled(
      batch.map((task) => executeTask(task, siteId, agencyId, clientId)),
    );

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          slug: 'unknown',
          success: false,
          cost: 0,
          error: result.reason?.message || String(result.reason),
        });
      }
    }
  }

  return results;
}

async function executeTask(
  task: PageTask,
  siteId: string,
  agencyId?: string | null,
  clientId?: string | null,
): Promise<GenerationResult> {
  const supabase = createServiceClientWithoutCookies();

  try {
    let content: ParsedContent;
    let cost = 0;

    if (task.model === 'template' && task.templateData) {
      // Template page: no LLM call
      content = {
        hero_h1: task.templateData.hero_h1,
        hero_subtitle: task.templateData.hero_subtitle,
        content_sections: task.templateData.content_sections,
        faq: task.templateData.faq || null,
        meta_title: task.title.slice(0, 60),
        meta_description: `${task.title}. Contact us today.`.slice(0, 155),
      };
    } else {
      // LLM call
      const rawContent = await callLLM(task.model, task.prompt, task.maxTokens);

      if (!rawContent) {
        return { slug: task.slug, success: false, cost: 0, error: 'Empty LLM response' };
      }

      // Estimate cost
      const totalTokens = (task.prompt.length / 4) + (rawContent.length / 4);
      cost = (totalTokens / 1000) * (COST_PER_1K[task.model] || 0.001);

      // Parse the response
      if (task.slug === '/faq') {
        content = parseFaqContent(rawContent, task.title);
      } else if (task.pageType === 'blog') {
        content = parseBlogContent(rawContent, task.title);
      } else {
        content = parseContent(rawContent, task.title);
      }
    }

    // Generate schema markup
    let schemaMarkup: unknown = null;
    if (task.slug === '/faq' && content.faq?.length) {
      schemaMarkup = generateFAQSchema(content.faq);
    }

    // Upsert into site_pages
    const { error: upsertErr } = await supabase.from('site_pages').upsert(
      {
        site_id: siteId,
        slug: task.slug,
        page_type: task.pageType,
        title: task.title,
        meta_title: content.meta_title || task.title.slice(0, 60),
        meta_description: content.meta_description || null,
        hero_h1: content.hero_h1,
        hero_subtitle: content.hero_subtitle,
        content_sections: content.content_sections,
        faq: content.faq,
        schema_markup: schemaMarkup,
        llm_model: task.model === 'template' ? null : task.model,
        generation_cost: cost,
        generated_at: new Date().toISOString(),
        source: 'wizard',
      },
      { onConflict: 'site_id,slug' },
    );

    if (upsertErr) {
      return {
        slug: task.slug,
        success: false,
        cost,
        error: `DB error: ${upsertErr.message}`,
      };
    }

    // Deduct credits for AI website content generation (non-fatal)
    if (agencyId && task.model !== 'template') {
      try {
        await deductCredits(agencyId, 'website.page_generation', {
          clientId: clientId || undefined,
          description: `Website page: ${task.slug}`,
        });
      } catch { /* non-fatal */ }
    }

    return { slug: task.slug, success: true, cost };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { slug: task.slug, success: false, cost: 0, error: message };
  }
}

// ---------- Meta Generation (Bulk) ----------

async function generateMeta(site: ClientSite, siteId: string): Promise<void> {
  try {
    const raw = await callLLM(MODELS.meta, metaPrompt(site), MAX_TOKENS.meta);
    if (!raw) {
      console.warn('[content-engine] generateMeta: empty LLM response');
      return;
    }

    // Parse JSON array from response
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[content-engine] generateMeta: no JSON array found in response. Raw:', raw.slice(0, 200));
      return;
    }

    const metaItems = JSON.parse(jsonMatch[0]) as Array<{
      page: string;
      meta_title: string;
      meta_description: string;
    }>;

    const supabase = createServiceClientWithoutCookies();

    // Strip markdown artifacts and update ALL pages with AI-generated meta
    const cleanMeta = (s: string) => s
      .replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s*/gm, '').trim();

    for (const item of metaItems) {
      const title = cleanMeta(item.meta_title || '');
      const desc = cleanMeta(item.meta_description || '');
      if (!title || !desc) continue;
      const slug = pageToSlug(item.page, site);
      if (!slug) continue;

      await supabase
        .from('site_pages')
        .update({
          meta_title: title.slice(0, 60),
          meta_description: desc.slice(0, 155),
        })
        .eq('site_id', siteId)
        .eq('slug', slug);
    }
  } catch (err) {
    console.warn('[content-engine] Meta generation failed (non-fatal):', err);
  }
}

function pageToSlug(page: string, site: ClientSite): string | null {
  const lower = page.toLowerCase().trim();
  if (lower === 'homepage' || lower === 'home') return '/';
  if (lower === 'about') return '/about';
  if (lower === 'contact') return '/contact';
  if (lower === 'reviews') return '/reviews';
  if (lower === 'faq') return '/faq';

  // Match service pages
  if (lower.startsWith('service:')) {
    const name = lower.replace('service:', '').trim();
    const service = site.services?.find(
      (s) => s.name.toLowerCase() === name || s.slug === name,
    );
    if (service) return `/services/${service.slug}`;
  }

  // Match city pages
  if (lower.startsWith('city:')) {
    const name = lower.replace('city:', '').trim();
    const city = site.cities?.find(
      (c) => c.name.toLowerCase() === name || c.slug === name,
    );
    if (city) return `/${city.slug}`;
  }

  return null;
}

// ---------- LLM Call with Retry ----------

async function callLLM(
  model: string,
  prompt: string,
  maxTokens: number,
): Promise<string> {
  if (!OPENROUTER_KEY) {
    throw new Error('OPENROUTER_API_KEY or OPENAI_API_KEY is required');
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://kyra.conversionsystem.com',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.85,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      // Handle rate limits
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '0', 10);
        const delay = Math.max(retryAfter * 1000, BASE_RETRY_DELAY_MS * attempt);
        console.warn(
          `[content-engine] Rate limited (${model}), retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`,
        );
        await sleep(delay);
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = data.choices?.[0]?.message?.content || '';
      if (!content && attempt < MAX_RETRIES) {
        console.warn(`[content-engine] Empty response from ${model}, retrying...`);
        await sleep(BASE_RETRY_DELAY_MS * attempt);
        continue;
      }

      return content;
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;

      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(
        `[content-engine] LLM call failed (attempt ${attempt}/${MAX_RETRIES}):`,
        err instanceof Error ? err.message : err,
        `Retrying in ${delay}ms`,
      );
      await sleep(delay);
    }
  }

  return '';
}

// ---------- Content Parsing ----------

interface ParsedContent {
  hero_h1: string | null;
  hero_subtitle: string | null;
  content_sections: ContentSection[];
  faq: FaqItem[] | null;
  meta_title: string | null;
  meta_description: string | null;
}

function parseContent(raw: string, fallbackTitle: string): ParsedContent {
  const sections: ContentSection[] = [];
  let heroH1: string | null = null;
  let heroSubtitle: string | null = null;
  let metaTitle: string | null = null;
  let metaDescription: string | null = null;

  // Clean em dashes from content
  const cleaned = raw.replace(/\u2014/g, ' - ').replace(/\u2013/g, '-');

  // Split by markdown headings (## or ###)
  const headingRegex = /^#{1,3}\s+(.+)$/gm;
  const headings: Array<{ title: string; matchStart: number; start: number; end: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(cleaned)) !== null) {
    headings.push({
      title: match[1].trim(),
      matchStart: match.index,
      start: match.index + match[0].length,
      end: cleaned.length,
    });
  }

  // Set end positions
  for (let i = 0; i < headings.length - 1; i++) {
    headings[i].end = headings[i + 1].matchStart;
  }

  for (const heading of headings) {
    const body = cleaned.slice(heading.start, heading.end).trim();
    const title = heading.title.toLowerCase();

    // Extract H1
    if (title.includes('h1') || title.includes('hero') || title.includes('headline')) {
      const lines = body.split('\n').filter((l) => l.trim());
      heroH1 = heroH1 || cleanLine(lines[0] || fallbackTitle);
      // Look for subtitle
      if (lines.length > 1) {
        const subLine = lines.find(
          (l) => l.toLowerCase().includes('subtitle') || lines.indexOf(l) === 1,
        );
        if (subLine) heroSubtitle = cleanLine(subLine);
      }
      continue;
    }

    // Extract meta
    if (title.includes('meta')) {
      const titleMatch = body.match(/meta[_ ]?title[:\s]*["']?(.+?)["']?\s*$/im);
      const descMatch = body.match(
        /meta[_ ]?description[:\s]*["']?(.+?)["']?\s*$/im,
      );
      const stripMd = (s: string) => s.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s*/gm, '').trim();
      if (titleMatch) metaTitle = stripMd(titleMatch[1]).slice(0, 60);
      if (descMatch) metaDescription = stripMd(descMatch[1]).slice(0, 155);
      continue;
    }

    // Extract bullets from body
    const bullets: string[] = [];
    const bodyLines: string[] = [];

    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
        bullets.push(trimmed.replace(/^[-*]\s+|^\d+\.\s+/, ''));
      } else if (trimmed) {
        bodyLines.push(trimmed);
      }
    }

    const bodyText = bodyLines.join('\n').trim();
    const bulletList = bullets.filter(b => b.trim().length > 0);
    // Only push sections that have actual content
    if (bodyText || bulletList.length > 0 || heading.title) {
      sections.push({
        heading: heading.title.replace(/^#+\s*/, ''),
        body: bodyText,
        ...(bulletList.length > 0 ? { bullets: bulletList } : {}),
      });
    }
  }

  // If no sections were parsed, treat the whole response as a single section
  if (sections.length === 0 && cleaned.trim()) {
    const lines = cleaned.split('\n').filter((l) => l.trim());
    heroH1 = heroH1 || cleanLine(lines[0] || fallbackTitle);
    if (lines.length > 1) heroSubtitle = cleanLine(lines[1]);
    sections.push({
      heading: 'Content',
      body: cleaned,
    });
  }

  return {
    hero_h1: heroH1,
    hero_subtitle: heroSubtitle,
    content_sections: sections,
    faq: null,
    meta_title: metaTitle,
    meta_description: metaDescription,
  };
}

function parseFaqContent(raw: string, fallbackTitle: string): ParsedContent {
  let faqItems: FaqItem[] = [];

  // Clean em dashes
  const cleaned = raw.replace(/\u2014/g, ' - ').replace(/\u2013/g, '-');

  // Try to parse JSON array from the response
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        question: string;
        answer: string;
      }>;
      if (Array.isArray(parsed) && parsed.length > 0) {
        faqItems = parsed
          .filter((item) => item.question && item.answer)
          .map((item) => ({
            question: item.question.trim(),
            answer: item.answer.trim(),
          }));
      }
    } catch {
      // Fall through to text parsing
    }
  }

  // Fallback: parse Q&A from text
  if (faqItems.length === 0) {
    const qRegex = /(?:^|\n)\s*(?:Q:|Question:|\d+\.)\s*(.+?)(?:\n\s*(?:A:|Answer:)\s*(.+?))?(?=\n\s*(?:Q:|Question:|\d+\.)|$)/g;
    let qMatch: RegExpExecArray | null;
    while ((qMatch = qRegex.exec(cleaned)) !== null) {
      if (qMatch[1] && qMatch[2]) {
        faqItems.push({
          question: qMatch[1].trim(),
          answer: qMatch[2].trim(),
        });
      }
    }
  }

  return {
    hero_h1: `Frequently Asked Questions`,
    hero_subtitle: `Common questions about our services`,
    content_sections: [],
    faq: faqItems.length > 0 ? faqItems : null,
    meta_title: fallbackTitle.slice(0, 60),
    meta_description: null,
  };
}

function parseBlogContent(raw: string, fallbackTitle: string): ParsedContent {
  const cleaned = raw.replace(/\u2014/g, ' - ').replace(/\u2013/g, '-').trim();

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const unwrapped = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  // Blog prompts return JSON — try parsing the unwrapped content first
  const jsonCandidates = [unwrapped, cleaned];
  for (const candidate of jsonCandidates) {
    if (candidate.startsWith('{') || candidate.startsWith('[')) {
      try {
        const parsed = JSON.parse(candidate);
        if (parsed.hero_h1 || parsed.content_sections) {
          return {
            hero_h1: parsed.hero_h1 || fallbackTitle,
            hero_subtitle: parsed.hero_subtitle || null,
            content_sections: parsed.content_sections || [],
            faq: parsed.faq || null,
            meta_title: parsed.meta_title || null,
            meta_description: parsed.meta_description || null,
          };
        }
      } catch {
        // Fall through
      }
    }
  }

  // Also try extracting JSON object from within markdown text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.hero_h1 || parsed.content_sections) {
        return {
          hero_h1: parsed.hero_h1 || fallbackTitle,
          hero_subtitle: parsed.hero_subtitle || null,
          content_sections: parsed.content_sections || [],
          faq: parsed.faq || null,
          meta_title: parsed.meta_title || null,
          meta_description: parsed.meta_description || null,
        };
      }
    } catch {
      // Fall through to markdown parsing
    }
  }

  return parseContent(raw, fallbackTitle);
}

// ---------- Utilities ----------

function cleanLine(line: string): string {
  return line
    .replace(/^[#*\-\d.]+\s*/, '')         // strip markdown heading/list prefixes
    .replace(/^(?:H[1-6]|Title|Headline|Subtitle|Hero|CTA|Button)[:\s]*["']*/i, '') // strip LLM label prefixes like "H1:", "Subtitle:", "Title:"
    .replace(/\*\*/g, '')                    // strip all bold markers (not just wrapping)
    .replace(/\*/g, '')                      // strip italic markers
    .replace(/^["']|["']$/g, '')             // strip surrounding quotes
    .replace(/\u2014/g, ' - ')              // em dash
    .replace(/\u2013/g, '-')                // en dash
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- Auto Build + Deploy ----------

const PROVISIONER_URL = process.env.OVH_PROVISIONER_URL || 'http://15.204.91.157:9090';
const PROVISIONER_SECRET = process.env.OVH_PROVISIONER_SECRET || '';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function triggerBuildAndDeploy(siteId: string, supabase: any): Promise<void> {
  console.log(`[content-engine] Auto-triggering build for site ${siteId}`);

  // 1. Fetch full site data
  const { data: site } = await supabase
    .from('client_sites')
    .select('*')
    .eq('id', siteId)
    .single();

  if (!site) throw new Error('Site not found');

  const domain = site.site_domain || site.site_subdomain;
  if (!domain) throw new Error('No domain configured');

  // 2. Fetch generated pages
  const { data: pages } = await supabase
    .from('site_pages')
    .select('*')
    .eq('site_id', siteId)
    .order('page_type');

  if (!pages?.length) throw new Error('No pages generated');

  // 3. Build constants data for the template
  const services = (site.services || []) as Array<{ name: string; slug: string; description?: string }>;
  const address = site.address || {};
  // Always include primary city — if user skipped Step 3, cities array is empty
  // but the primary city from their address should still generate city pages
  let cities = (site.cities || []) as Array<{ name: string; slug: string; state?: string }>;
  const primaryCity = address.city || '';
  if (cities.length === 0 && primaryCity) {
    cities = [{
      name: primaryCity,
      slug: primaryCity.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      state: address.state || '',
    }];
  }

  const constants = {
    name: site.business_name || '',
    phone: site.phone || '',
    email: `info@${domain}`,
    address: `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}`,
    license: site.license || '',
    rating: site.rating || 5.0,
    reviewCount: site.review_count || 0,
    yearsInBusiness: site.years_in_business || 1,
    hours: site.hours || {},
    coordinates: { lat: address.lat || 0, lng: address.lng || 0 },
    tagline: site.tagline || '',
    googleReviewUrl: (site as Record<string, unknown>).google_review_url || '',
    services,
    serviceAreas: cities,
  };

  const theme = {
    colorPrimary: site.color_primary || '#dc2626',
    colorSecondary: site.color_secondary || '#111827',
    designStyle: site.design_style || 'modern-dark',
    bookingUrl: site.booking_url || null,
  };

  // Ensure bookingUrl is also in constants (provisioner uses it for CTA links)
  if (site.booking_url && !('bookingUrl' in constants)) {
    (constants as Record<string, unknown>).bookingUrl = site.booking_url;
  }

  // 4. Format page content for template
  const pagesData = pages.map((p: { slug: string; page_type: string; title: string; meta_title: string; meta_description: string; hero_h1: string; hero_subtitle: string; content_sections: unknown; faq: unknown; schema_markup: unknown }) => ({
    slug: p.slug,
    type: p.page_type,
    title: p.title,
    metaTitle: p.meta_title,
    metaDescription: p.meta_description,
    heroH1: p.hero_h1,
    heroSubtitle: p.hero_subtitle,
    sections: p.content_sections,
    faq: p.faq,
    schema: p.schema_markup,
  }));

  // 5. Update status to deploying
  await supabase
    .from('client_sites')
    .update({ status: 'deploying' })
    .eq('id', siteId);

  // 6. Call VPS provisioner build-and-deploy
  const res = await fetch(`${PROVISIONER_URL}/sites/${siteId}/build-and-deploy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PROVISIONER_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      domain,
      template: 'generic',
      constants,
      theme,
      pages: pagesData,
      widgetClientId: site.client_id,
    }),
    signal: AbortSignal.timeout(180_000), // 3 min timeout for build
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    console.error(`[content-engine] Build failed for ${siteId}:`, errText);
    await supabase
      .from('client_sites')
      .update({ status: 'error' })
      .eq('id', siteId);
    throw new Error(`Build failed: ${errText}`);
  }

  // 7. Update status to live
  await supabase
    .from('client_sites')
    .update({
      status: 'live',
      last_deployed_at: new Date().toISOString(),
      nginx_configured: true,
      ssl_active: true,
    })
    .eq('id', siteId);

  console.log(`[content-engine] Site ${siteId} deployed to https://${domain}`);

  // Sync site content to knowledge base (fire-and-forget)
  syncSiteToKnowledgeBase(siteId).catch((err) =>
    console.warn('[content-engine] Knowledge sync failed:', err),
  );

  // Sync business info into client container_config so the chat widget AI knows about the business.
  // Without this, the bot has zero context — it doesn't know phone, hours, address, or what the business does.
  if (site.client_id) {
    const { data: existingClient } = await supabase
      .from('agency_clients')
      .select('container_config')
      .eq('id', site.client_id)
      .single();

    const existingCfg = (existingClient?.container_config as Record<string, unknown>) ?? {};
    const addrObj = (site.address as Record<string, string>) ?? {};
    const addrStr = [addrObj.street, addrObj.city, addrObj.state, addrObj.zip].filter(Boolean).join(', ');
    const hoursObj = (site.hours as Record<string, string>) ?? {};
    const hoursStr = Object.entries(hoursObj)
      .map(([day, hrs]) => `${day}: ${hrs}`)
      .join(', ');

    // Build a rich persona describing the business
    const servicesArr = (site.services as Array<{name: string}>) ?? [];
    const serviceList = servicesArr.map((s) => s.name).join(', ');
    const persona = `${site.ai_name || site.business_name} — the AI assistant for ${site.business_name}. ${
      site.tagline ? site.tagline + '.' : ''
    } You help customers with: ${serviceList || 'our services'}. Always be helpful, accurate, and guide customers toward booking or contacting us.`;

    await supabase
      .from('agency_clients')
      .update({
        container_config: {
          ...existingCfg,
          persona,
          business_name: site.business_name,
          business_phone: site.phone || '',
          business_address: addrStr,
          business_hours: hoursStr,
          widget_title: `Chat with ${site.business_name}`,
          widget_color: site.color_primary || '#6366f1',
          widget_greeting: `Hi! 👋 I'm ${site.ai_name || 'your AI assistant'} for ${site.business_name}. How can I help you today?`,
        },
      })
      .eq('id', site.client_id);

    console.log(`[content-engine] Synced business context to client container_config for ${site.business_name}`);
  }

  // Send Telegram notification if agency has telegram connected
  sendSiteLiveNotification(site.business_name, domain, site.agency_id, supabase).catch((err) =>
    console.warn('[content-engine] Site-live notification failed:', err),
  );
}

// ---------- Site Live Notification ----------

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendSiteLiveNotification(businessName: string, domain: string, agencyId: string, supabase: any): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return;

  // Find the agency owner's telegram channel
  const { data: agency } = await supabase
    .from('agencies')
    .select('owner_id')
    .eq('id', agencyId)
    .single();

  if (!agency?.owner_id) return;

  const { data: channel } = await supabase
    .from('user_channels')
    .select('metadata')
    .eq('user_id', agency.owner_id)
    .eq('channel_type', 'telegram')
    .eq('status', 'connected')
    .single();

  const chatId = channel?.metadata?.chatId;
  if (!chatId) return;

  const message = `\u{1F680} Site live: ${businessName} \u2014 https://${domain}`;

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
}
