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
import type { ClientSite, SiteService, SiteCity, ContentSection, FaqItem } from './types';
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
import {
  generateLocalBusinessSchema,
  generateServiceSchema,
  generateFAQSchema,
} from './schema-generator';
import { syncSiteToKnowledgeBase } from './knowledge-sync';
import { checkContentSimilarity } from './content-checker';

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
const MODELS = HAS_OPENROUTER
  ? {
      hero:        'anthropic/claude-sonnet-4-5',
      service:     'openai/gpt-4o',
      city:        'openai/gpt-4o',
      cityService: 'openai/gpt-4o-mini',
      faq:         'anthropic/claude-3-5-haiku',
      blog:        'openai/gpt-4o-mini',
      meta:        'anthropic/claude-3-5-haiku',
    }
  : {
      // OpenAI fallback — all models via OpenAI directly
      hero:        'gpt-4o',
      service:     'gpt-4o',
      city:        'gpt-4o',
      cityService: 'gpt-4o-mini',
      faq:         'gpt-4o-mini',
      blog:        'gpt-4o-mini',
      meta:        'gpt-4o-mini',
    };

const MAX_TOKENS = {
  hero: 2000,
  service: 1500,
  city: 1200,
  cityService: 1000,
  faq: 2000,
  blog: 1500,
  meta: 500,
} as const;

// Approximate cost per 1K tokens (input + output combined estimate)
const COST_PER_1K: Record<string, number> = {
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

  // 2. Update status to 'generating'
  await supabase
    .from('client_sites')
    .update({ status: 'generating' })
    .eq('id', siteId);

  try {
    // 3. Build task list
    const tasks = buildTaskList(clientSite);
    console.log(`[content-engine] Generated ${tasks.length} tasks for site ${siteId}`);

    // 4. Execute in batches
    const results = await executeBatched(tasks, siteId);

    // 5. Generate meta titles/descriptions for pages missing them
    await generateMeta(clientSite, siteId);

    // 5b. Content similarity check (non-blocking, just log)
    try {
      const { warning } = await checkContentSimilarity(siteId, clientSite.industry, clientSite.address?.state || '');
      if (warning) console.warn('[content-engine] Similarity warning:', warning);
    } catch (err) {
      console.warn('[content-engine] Similarity check failed:', err);
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

      // 9. Auto-trigger build + deploy (fire-and-forget)
      triggerBuildAndDeploy(siteId, supabase).catch((err) => {
        console.error(`[content-engine] Auto-build failed for site ${siteId}:`, err);
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
  const tasks = buildTaskList(clientSite);
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

  const result = await executeTask(task, siteId);
  return { success: result.success, error: result.error };
}

// ---------- Task Building ----------

function buildTaskList(site: ClientSite): PageTask[] {
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

  // ── TIER 3: City + City x Service pages ──
  if (isServiceArea && site.cities?.length) {
    for (const city of site.cities) {
      // City overview page
      tasks.push({
        slug: `/${city.slug}`,
        pageType: 'city',
        title: `${site.industry} in ${city.name} | ${site.business_name}`,
        model: MODELS.city,
        maxTokens: MAX_TOKENS.city,
        prompt: cityPrompt(site, city),
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
          prompt: cityServicePrompt(site, city, service),
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
      batch.map((task) => executeTask(task, siteId)),
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
    if (!raw) return;

    // Parse JSON array from response
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const metaItems = JSON.parse(jsonMatch[0]) as Array<{
      page: string;
      meta_title: string;
      meta_description: string;
    }>;

    const supabase = createServiceClientWithoutCookies();

    // Update pages that don't already have custom meta
    for (const item of metaItems) {
      const slug = pageToSlug(item.page, site);
      if (!slug) continue;

      await supabase
        .from('site_pages')
        .update({
          meta_title: item.meta_title?.slice(0, 60) || undefined,
          meta_description: item.meta_description?.slice(0, 155) || undefined,
        })
        .eq('site_id', siteId)
        .eq('slug', slug)
        .is('meta_description', null);
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
  const headings: Array<{ title: string; start: number; end: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(cleaned)) !== null) {
    headings.push({
      title: match[1].trim(),
      start: match.index + match[0].length,
      end: cleaned.length,
    });
  }

  // Set end positions
  for (let i = 0; i < headings.length - 1; i++) {
    headings[i].end = headings[i + 1].start - headings[i + 1].title.length - 4;
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
      if (titleMatch) metaTitle = titleMatch[1].trim().slice(0, 60);
      if (descMatch) metaDescription = descMatch[1].trim().slice(0, 155);
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

    sections.push({
      heading: heading.title.replace(/^#+\s*/, ''),
      body: bodyLines.join('\n'),
      ...(bullets.length > 0 ? { bullets } : {}),
    });
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

  // Blog prompts return JSON — try parsing it first
  if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
    try {
      const parsed = JSON.parse(cleaned.startsWith('[') ? cleaned : cleaned);
      if (parsed.hero_h1) {
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

  // Also try extracting JSON from markdown-wrapped response
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.hero_h1) {
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
    .replace(/^[#*\-\d.]+\s*/, '')
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^["']|["']$/g, '')
    .replace(/\u2014/g, ' - ')
    .replace(/\u2013/g, '-')
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
  const cities = (site.cities || []) as Array<{ name: string; slug: string; state?: string }>;
  const address = site.address || {};

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
    services,
    serviceAreas: cities,
  };

  const theme = {
    colorPrimary: site.color_primary || '#dc2626',
    colorSecondary: site.color_secondary || '#111827',
    designStyle: site.design_style || 'modern-dark',
    bookingUrl: site.booking_url || null,
  };

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
      template: site.template_id || 'generic',
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
