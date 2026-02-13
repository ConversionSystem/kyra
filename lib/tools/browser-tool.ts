/**
 * Browser Tool — URL navigation and content extraction
 *
 * Reuses the fetch + Readability pattern from url-fetch.ts,
 * adds optional Cloudflare Browser Rendering screenshot support.
 */

import { fetchUrl, type FetchedContent } from '@/lib/tools/url-fetch';

export interface BrowseOptions {
  /** What to do: read page content, take a screenshot, or extract via selector */
  action?: 'read' | 'screenshot' | 'extract';
  /** CSS selector to extract specific content (used with action=extract) */
  selector?: string;
  /** Max characters to return */
  maxChars?: number;
}

export interface BrowseResult {
  title: string;
  content: string;
  url: string;
  screenshot?: string; // base64 PNG when available
  error?: string;
}

/**
 * Browse a URL: fetch content, optionally take a screenshot via
 * Cloudflare Browser Rendering, or extract a specific CSS selector.
 */
export async function browseUrl(
  url: string,
  options: BrowseOptions = {},
): Promise<BrowseResult> {
  const { action = 'read', selector, maxChars = 8000 } = options;

  // --- Screenshot via Cloudflare Browser Rendering ---
  if (action === 'screenshot') {
    const screenshot = await tryScreenshot(url);
    if (screenshot) {
      // Still fetch readable content alongside the screenshot
      const fetched = await fetchUrl(url, maxChars);
      return {
        title: fetched.title || url,
        content: fetched.error
          ? `Screenshot captured. Could not extract text: ${fetched.error}`
          : fetched.content,
        url,
        screenshot,
      };
    }
    // No browser binding — fall through to text-only extraction
  }

  // --- Fetch + Readability extraction (read / extract) ---
  const fetched = await fetchUrl(url, maxChars);

  if (fetched.error) {
    return { title: '', content: '', url, error: fetched.error };
  }

  // If a CSS selector was requested, attempt targeted extraction
  if (action === 'extract' && selector) {
    const extracted = await extractSelector(url, selector, maxChars);
    if (extracted) {
      return { title: fetched.title, content: extracted, url };
    }
    // Fall through to full-page content if selector extraction fails
  }

  return {
    title: fetched.title,
    content: fetched.content,
    url,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Try to take a screenshot using Cloudflare Browser Rendering.
 * Returns base64 PNG string or null if binding isn't available.
 */
async function tryScreenshot(url: string): Promise<string | null> {
  try {
    // @ts-expect-error — BROWSER binding only exists on Cloudflare Workers
    const browser = (globalThis as any).env?.BROWSER;
    if (!browser) return null;

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
    const buf: Buffer = await page.screenshot({ type: 'png', fullPage: false });
    await page.close();
    return buf.toString('base64');
  } catch {
    return null;
  }
}

/**
 * Fetch the page and extract text from a specific CSS selector.
 */
async function extractSelector(
  url: string,
  selector: string,
  maxChars: number,
): Promise<string | null> {
  try {
    const { JSDOM } = await import('jsdom');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Kyra/1.0; +https://kyra.ai)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const elements = dom.window.document.querySelectorAll(selector);
    if (elements.length === 0) return null;

    const texts: string[] = [];
    elements.forEach((el) => {
      const text = el.textContent?.replace(/\s+/g, ' ').trim();
      if (text) texts.push(text);
    });

    const joined = texts.join('\n\n');
    return joined.length > maxChars ? joined.slice(0, maxChars) + '...' : joined;
  } catch {
    return null;
  }
}
