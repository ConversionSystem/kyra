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
 * Check if a message looks like it needs a web search.
 * Avoids false positives on conversational messages.
 */
export function needsWebSearch(message: string): boolean {
  const lower = message.toLowerCase().trim();

  // Skip very short messages or greetings
  if (lower.length < 10) return false;

  // Conversational patterns that don't need search
  const conversational = [
    /^(hi|hey|hello|thanks|thank you|bye|goodbye|good morning|good night|how are you)/i,
    /\b(your name|who are you|what can you do|help me with|tell me a joke)\b/i,
    /^(what is|what's) (your|the meaning of life|love|happiness|a good)\b/i,
    /\b(today|yesterday)\b.*\b(calendar|schedule|events|reminder|to-?do)\b/i,
    /^(summarize|summarise|explain|translate|rewrite|rephrase)\b/i,
    /^(write|create|generate|make|draft|compose)\b/i,
    /^(can you|could you|please|would you)\b/i,
  ];

  if (conversational.some(p => p.test(lower))) return false;

  // Strong signals: explicit search intent
  const strong = [
    /\b(search|google|look up|look this up)\b/i,
    /\b(latest|recent|current|breaking)\s+(news|update|price|score|status|version|release)/i,
    /\b(price of|stock price|weather in|weather for|forecast)\b/i,
    /\b(who won|who is winning|score of|results? of|standings)\b/i,
    /\b(news about|updates? on|what happened)\b/i,
  ];

  if (strong.some(p => p.test(lower))) return true;

  // Medium signals: factual questions with temporal context
  const temporal = [
    /\b(who is|who was)\b.*\b(president|ceo|leader|prime minister|winner)\b/i,
    /\b(when (did|does|will|is))\b.*\b(release|launch|start|open|happen|come out)\b/i,
    /\b(how (much|many))\b.*\b(cost|worth|population|people)\b/i,
    /\b(is .+ (still|yet|already))\b/i,
    /\b(202[4-9]|2030)\b.*\b(election|event|release|launch|update|conference)\b/i,
  ];

  if (temporal.some(p => p.test(lower))) return true;

  return false;
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
