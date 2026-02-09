/**
 * URL Fetching and Content Extraction
 */

// Dynamic imports to avoid cold-start crashes in serverless (jsdom is heavy)
let _JSDOM: typeof import('jsdom').JSDOM | null = null;
let _Readability: typeof import('@mozilla/readability').Readability | null = null;

async function getJSDOM() {
  if (!_JSDOM) {
    const { JSDOM } = await import('jsdom');
    _JSDOM = JSDOM;
  }
  return _JSDOM;
}

async function getReadability() {
  if (!_Readability) {
    const { Readability } = await import('@mozilla/readability');
    _Readability = Readability;
  }
  return _Readability;
}

export interface FetchedContent {
  url: string;
  title: string;
  content: string;
  excerpt?: string;
  byline?: string;
  siteName?: string;
  error?: string;
}

/**
 * Fetch and extract readable content from a URL
 */
export async function fetchUrl(url: string, maxChars?: number): Promise<FetchedContent> {
  try {
    // Validate URL
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        url,
        title: '',
        content: '',
        error: 'Invalid URL protocol',
      };
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Kyra/1.0; +https://kyra.ai)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      return {
        url,
        title: '',
        content: '',
        error: `Failed to fetch: ${response.status} ${response.statusText}`,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Handle non-HTML content
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      if (contentType.includes('application/json')) {
        const json = await response.json();
        return {
          url,
          title: 'JSON Response',
          content: JSON.stringify(json, null, 2).slice(0, maxChars || 10000),
        };
      }
      
      if (contentType.includes('text/plain')) {
        const text = await response.text();
        return {
          url,
          title: 'Plain Text',
          content: text.slice(0, maxChars || 10000),
        };
      }

      return {
        url,
        title: '',
        content: '',
        error: `Unsupported content type: ${contentType}`,
      };
    }

    const html = await response.text();
    
    // Parse with JSDOM and extract with Readability
    const JSDOM = await getJSDOM();
    const Readability = await getReadability();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      // Fallback: extract text from body
      const body = dom.window.document.body;
      const text = body?.textContent?.replace(/\s+/g, ' ').trim() || '';
      
      return {
        url,
        title: dom.window.document.title || url,
        content: text.slice(0, maxChars || 10000),
      };
    }

    let content = article.textContent || '';
    
    // Truncate if needed
    if (maxChars && content.length > maxChars) {
      content = content.slice(0, maxChars) + '...';
    }

    return {
      url,
      title: article.title || dom.window.document.title || url,
      content,
      excerpt: article.excerpt || undefined,
      byline: article.byline || undefined,
      siteName: article.siteName || undefined,
    };
  } catch (error) {
    console.error('URL fetch error:', error);
    return {
      url,
      title: '',
      content: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Format fetched content for context injection
 */
export function formatFetchedContent(content: FetchedContent): string {
  if (content.error) {
    return `Failed to fetch ${content.url}: ${content.error}`;
  }

  let formatted = `**Content from ${content.title || content.url}**`;
  
  if (content.siteName) {
    formatted += ` (${content.siteName})`;
  }
  
  if (content.byline) {
    formatted += `\nBy: ${content.byline}`;
  }
  
  formatted += `\n\n${content.content}`;
  
  formatted += `\n\nSource: ${content.url}`;

  return formatted;
}

/**
 * Extract URLs from a message
 */
export function extractUrls(message: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"\]]+/gi;
  const matches = message.match(urlRegex) || [];
  
  // Clean up URLs (remove trailing punctuation)
  return matches.map(url => url.replace(/[.,;:!?)]+$/, ''));
}

/**
 * Check if a message contains URLs that should be fetched
 */
export function hasUrlsToFetch(message: string): boolean {
  const urls = extractUrls(message);
  if (urls.length === 0) return false;

  // Check for patterns suggesting user wants content analyzed
  const analyzePatterns = [
    /\b(summarize|summary|read|what does|what's|explain|analyze|tldr|tl;dr)\b/i,
    /\b(this article|this link|this page|this url)\b/i,
  ];

  return analyzePatterns.some(pattern => pattern.test(message)) || urls.length > 0;
}

/**
 * Simple fallback fetch without Readability (for when dependencies aren't available)
 */
export async function simpleFetch(url: string, maxChars?: number): Promise<FetchedContent> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Kyra/1.0)',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return {
        url,
        title: '',
        content: '',
        error: `Failed to fetch: ${response.status}`,
      };
    }

    const html = await response.text();
    
    // Basic HTML stripping
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;

    return {
      url,
      title,
      content: text.slice(0, maxChars || 10000),
    };
  } catch (error) {
    return {
      url,
      title: '',
      content: '',
      error: String(error),
    };
  }
}
