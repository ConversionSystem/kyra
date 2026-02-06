/**
 * Web Search via Brave Search API
 */

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  age?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  error?: string;
}

/**
 * Search the web using Brave Search API
 */
export async function webSearch(
  query: string,
  options?: {
    count?: number;
    freshness?: 'pd' | 'pw' | 'pm' | 'py'; // past day/week/month/year
    country?: string;
  }
): Promise<SearchResponse> {
  if (!BRAVE_API_KEY) {
    return {
      query,
      results: [],
      error: 'Web search not configured (missing BRAVE_API_KEY)',
    };
  }

  try {
    const params = new URLSearchParams({
      q: query,
      count: String(options?.count || 5),
    });

    if (options?.freshness) {
      params.set('freshness', options.freshness);
    }

    if (options?.country) {
      params.set('country', options.country);
    }

    const response = await fetch(`${BRAVE_SEARCH_URL}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Brave search error:', error);
      return {
        query,
        results: [],
        error: `Search failed: ${response.status}`,
      };
    }

    const data = await response.json();
    
    const results: SearchResult[] = (data.web?.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      description: r.description,
      age: r.age,
    }));

    return { query, results };
  } catch (error) {
    console.error('Web search error:', error);
    return {
      query,
      results: [],
      error: String(error),
    };
  }
}

/**
 * Format search results for context injection
 */
export function formatSearchResults(response: SearchResponse): string {
  if (response.error) {
    return `Web search failed: ${response.error}`;
  }

  if (response.results.length === 0) {
    return `No results found for "${response.query}"`;
  }

  const formatted = response.results
    .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.description}\n   Source: ${r.url}${r.age ? ` (${r.age})` : ''}`)
    .join('\n\n');

  return `**Web search results for "${response.query}":**\n\n${formatted}`;
}

/**
 * Check if a message looks like it needs a web search
 */
export function needsWebSearch(message: string): boolean {
  const searchPatterns = [
    /\b(search|google|look up|find|what is|who is|when did|latest|news|current)\b/i,
    /\b(today|yesterday|this week|this month|2024|2025|2026)\b/i,
    /\b(price of|stock|weather|score|result)\b/i,
    /\?.*\b(happening|going on|update)\b/i,
  ];

  // Check for patterns that suggest needing current info
  return searchPatterns.some(pattern => pattern.test(message));
}

/**
 * Extract search query from message
 */
export function extractSearchQuery(message: string): string {
  // Remove common prefixes
  let query = message
    .replace(/^(search for|look up|google|find|what is|who is|tell me about)\s*/i, '')
    .replace(/[?!.]+$/, '')
    .trim();

  return query || message;
}
