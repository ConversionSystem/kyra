// ============================================================================
// AI HTML Generation Engine
// Generates complete HTML pages using LLM, with Tailwind CSS via CDN.
// Unlike the content engine (which generates text content for templates),
// this engine produces full <!DOCTYPE html> documents ready to serve.
// ============================================================================

import type { ClientSite, ContentSection, FaqItem, SitePhoto, DesignStyle } from './types';
import { getHTMLPromptForPageType } from './ai-html-prompts';
import { validateGeneratedHTML } from './html-quality-checker';
import { sanitizeGeneratedHTML } from './html-sanitizer';

// ---------- Constants ----------

const HAS_OPENROUTER = !!process.env.OPENROUTER_API_KEY;
const API_URL = HAS_OPENROUTER
  ? 'https://openrouter.ai/api/v1/chat/completions'
  : 'https://api.openai.com/v1/chat/completions';
const API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

// AI HTML generation uses a capable model for all pages (needs to write good HTML)
const HTML_MODEL = HAS_OPENROUTER
  ? 'anthropic/claude-sonnet-4-6'
  : 'gpt-4o';

const HTML_MAX_TOKENS = 8000; // Full HTML documents need more tokens
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2000;

// Cost estimate: Sonnet ~$0.015/1K tokens, each page ~6K tokens total
const COST_PER_1K = HAS_OPENROUTER ? 0.015 : 0.01;

// ---------- Types ----------

export interface GeneratePageHTMLOptions {
  site: ClientSite;
  page: {
    slug: string;
    pageType: string;
    title: string;
    hero_h1: string;
    hero_subtitle: string;
    content_sections: ContentSection[];
    faq: FaqItem[];
    schema_markup: unknown;
  };
  designStyle: DesignStyle;
  colorPrimary: string;
  colorSecondary: string;
  photos: SitePhoto[];
}

export interface GeneratePageHTMLResult {
  html: string;
  cost: number;
}

// ---------- Public API ----------

export async function generatePageHTML(
  options: GeneratePageHTMLOptions,
): Promise<GeneratePageHTMLResult> {
  const { site, page, designStyle, colorPrimary, colorSecondary, photos } = options;

  // Build the prompt using the page-type-specific prompt builder
  const prompt = getHTMLPromptForPageType(page.pageType, {
    site,
    title: page.title,
    hero_h1: page.hero_h1 || page.title,
    hero_subtitle: page.hero_subtitle || '',
    content_sections: page.content_sections || [],
    faq: page.faq || [],
    schema_markup: page.schema_markup,
    designStyle,
    colorPrimary,
    colorSecondary,
    photos: photos || [],
  });

  // Call LLM to generate the HTML
  const rawHTML = await callLLM(prompt);

  if (!rawHTML) {
    throw new Error(`Empty LLM response for page: ${page.slug}`);
  }

  // Extract HTML from response (LLM might wrap in markdown code fences)
  let html = extractHTML(rawHTML);

  // Sanitize for security
  html = sanitizeGeneratedHTML(html);

  // Validate quality
  const quality = validateGeneratedHTML(html);
  if (!quality.valid) {
    console.warn(
      `[ai-html-engine] Page ${page.slug} quality score: ${quality.score}/100. Issues:`,
      quality.issues.join('; '),
    );
  }

  // Estimate cost
  const totalTokens = (prompt.length / 4) + (html.length / 4);
  const cost = (totalTokens / 1000) * COST_PER_1K;

  return { html, cost };
}

// ---------- LLM Call ----------

async function callLLM(prompt: string): Promise<string> {
  if (!API_KEY) {
    throw new Error('OPENROUTER_API_KEY or OPENAI_API_KEY is required for AI HTML generation');
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://kyra.conversionsystem.com',
        },
        body: JSON.stringify({
          model: HTML_MODEL,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: HTML_MAX_TOKENS,
          temperature: 0.7, // Slightly lower for more consistent HTML output
        }),
        signal: AbortSignal.timeout(120_000), // 2 min timeout (HTML is larger)
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '0', 10);
        const delay = Math.max(retryAfter * 1000, BASE_RETRY_DELAY_MS * attempt);
        console.warn(
          `[ai-html-engine] Rate limited, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`,
        );
        await sleep(delay);
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`LLM API ${res.status}: ${body.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = data.choices?.[0]?.message?.content || '';
      if (!content && attempt < MAX_RETRIES) {
        console.warn('[ai-html-engine] Empty response, retrying...');
        await sleep(BASE_RETRY_DELAY_MS * attempt);
        continue;
      }

      return content;
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(
        `[ai-html-engine] Attempt ${attempt}/${MAX_RETRIES} failed:`,
        err instanceof Error ? err.message : err,
      );
      await sleep(delay);
    }
  }

  return '';
}

// ---------- Helpers ----------

function extractHTML(raw: string): string {
  // If the LLM wrapped the output in markdown code fences, extract the HTML
  const fenceMatch = raw.match(/```(?:html)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // If it starts with <!DOCTYPE or <html, it's raw HTML
  const trimmed = raw.trim();
  if (trimmed.startsWith('<!') || trimmed.startsWith('<html')) {
    return trimmed;
  }

  // Try to find HTML document boundaries
  const doctypeIdx = trimmed.indexOf('<!DOCTYPE');
  const doctypeLowerIdx = trimmed.indexOf('<!doctype');
  const startIdx = Math.min(
    doctypeIdx >= 0 ? doctypeIdx : Infinity,
    doctypeLowerIdx >= 0 ? doctypeLowerIdx : Infinity,
  );

  if (startIdx < Infinity) {
    return trimmed.slice(startIdx);
  }

  // Return as-is if we can't find boundaries
  return trimmed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
