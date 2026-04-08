/**
 * Jane (iHeartJane) Cannabis Menu API Client
 *
 * Purple Lotus uses Jane for their product inventory.
 * Jane's API is behind Cloudflare — server calls are blocked.
 * We use either:
 *   1. Purple Lotus's proxy at dev.plpcsanjose.com/api/jane-store/
 *   2. A configurable proxy URL per client
 *   3. Fallback: Firecrawl web scrape of the menu page
 *
 * Store IDs for Purple Lotus:
 *   117 = 752 Commercial St (main store)
 *   Check /test/stores for full list
 */

const DEFAULT_STORE_ID = '117';
const JANE_API_KEY = 'LvFJDfvAb3Mr548qZDZGqvGT';

// Purple Lotus dev site proxy (works, bypasses Cloudflare)
const PL_PROXY_BASE = 'https://dev.plpcsanjose.com/api';

export interface JaneProduct {
  id: string | number;
  name: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  thc?: string | number;
  cbd?: string | number;
  price?: number;
  discountedPrice?: number;
  strain?: string;
  strainType?: string; // indica, sativa, hybrid
  effects?: string[];
  description?: string;
  imageUrl?: string;
  url: string;
  inStock?: boolean;
  weight?: string;
  tags?: string[];
}

export interface JaneStore {
  id: number;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface ProductSearchParams {
  storeId?: string;
  category?: string;
  query?: string;
  sortBy?: 'thc_desc' | 'thc_asc' | 'price_asc' | 'price_desc' | 'relevance';
  effects?: string[];
  limit?: number;
}

export interface ProductSearchResult {
  products: JaneProduct[];
  totalFound: number;
  storeId: string;
  source: 'proxy' | 'firecrawl' | 'cache';
}

/**
 * Get store info from Purple Lotus dev proxy
 */
export async function getStore(storeId: string = DEFAULT_STORE_ID): Promise<JaneStore | null> {
  try {
    const res = await fetch(`${PL_PROXY_BASE}/jane-store/${storeId}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.store ?? null;
  } catch {
    return null;
  }
}

/**
 * Search products using Firecrawl web scraping as primary method
 * (Jane API is Cloudflare-blocked for server calls)
 */
export async function searchProducts(
  params: ProductSearchParams,
  firecrawlApiKey?: string,
): Promise<ProductSearchResult> {
  const storeId = params.storeId || DEFAULT_STORE_ID;
  const limit = params.limit || 10;

  // Strategy: Use Firecrawl to scrape the menu page
  if (firecrawlApiKey) {
    try {
      const products = await scrapeMenuWithFirecrawl(storeId, params, firecrawlApiKey);
      return { products: products.slice(0, limit), totalFound: products.length, storeId, source: 'firecrawl' };
    } catch (err) {
      console.error('[jane] Firecrawl scrape failed:', err);
    }
  }

  // Fallback: return empty with guidance
  return { products: [], totalFound: 0, storeId, source: 'cache' };
}

/**
 * Scrape product data from Purple Lotus menu page using Firecrawl
 */
async function scrapeMenuWithFirecrawl(
  storeId: string,
  params: ProductSearchParams,
  apiKey: string,
): Promise<JaneProduct[]> {
  // Build the menu URL — Purple Lotus uses plpcsanjose.com (NOT purplelotuspatientcenter.com)
  const categorySlug = params.category ? `/${params.category.toLowerCase().replace(/\s+/g, '-')}` : '';
  const menuUrl = `https://plpcsanjose.com/shop${categorySlug}`;

  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: menuUrl,
      formats: ['extract'],
      extract: {
        schema: {
          type: 'object',
          properties: {
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  brand: { type: 'string' },
                  category: { type: 'string' },
                  thc: { type: 'string' },
                  cbd: { type: 'string' },
                  price: { type: 'number' },
                  strain_type: { type: 'string' },
                  effects: { type: 'array', items: { type: 'string' } },
                  description: { type: 'string' },
                  url: { type: 'string' },
                  in_stock: { type: 'boolean' },
                },
              },
            },
          },
        },
        prompt: `Extract all cannabis products visible on this page. For each product get: name, brand, category (flower/pre-roll/edible/vape/concentrate/tincture/topical), THC percentage, CBD percentage, price, strain type (indica/sativa/hybrid), any listed effects, short description, full product page URL, and whether it appears in stock. Return up to 20 products.${params.query ? ` Prioritize products matching this request: "${params.query}"` : ''}${params.category ? ` Focus on the ${params.category} category.` : ''}${params.effects?.length ? ` Look for products with these effects: ${params.effects.join(', ')}` : ''}`,
      },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`Firecrawl ${res.status}: ${await res.text().catch(() => '')}`);
  }

  const data = await res.json();
  const extracted = data?.data?.extract?.products ?? [];

  // Convert to JaneProduct format
  const baseUrl = 'https://purplelotuspatientcenter.com';
  return extracted.map((p: Record<string, unknown>) => ({
    id: p.name || Math.random().toString(36).slice(2),
    name: (p.name as string) || 'Unknown Product',
    brand: (p.brand as string) || undefined,
    category: (p.category as string) || undefined,
    thc: (p.thc as string) || undefined,
    cbd: (p.cbd as string) || undefined,
    price: typeof p.price === 'number' ? p.price : undefined,
    strainType: (p.strain_type as string) || undefined,
    effects: Array.isArray(p.effects) ? p.effects : undefined,
    description: (p.description as string) || undefined,
    url: (p.url as string)?.startsWith('http') ? p.url as string : `${baseUrl}${p.url || ''}`,
    inStock: p.in_stock !== false,
  }));
}

/**
 * Format products for the AI prompt response
 */
export function formatProductsForAI(products: JaneProduct[]): string {
  if (products.length === 0) {
    return 'No products found matching the search criteria. Suggest the customer browse the live menu at purplelotuspatientcenter.com or ask a budtender for help.';
  }

  return products.map((p, i) => {
    const details = [
      p.category && `Type: ${p.category}`,
      p.thc && `THC: ${p.thc}`,
      p.cbd && `CBD: ${p.cbd}`,
      p.strainType && `Strain: ${p.strainType}`,
      p.brand && `Brand: ${p.brand}`,
      p.price && `Price: $${p.price}`,
      p.effects?.length && `Effects: ${p.effects.join(', ')}`,
    ].filter(Boolean).join(' | ');

    return `${i + 1}. ${p.name}\n   ${details}\n   URL: ${p.url}`;
  }).join('\n\n');
}

/**
 * Determine product search intent from user message
 */
export function parseProductIntent(message: string): ProductSearchParams {
  const lower = message.toLowerCase();
  const params: ProductSearchParams = { query: message };

  // Category detection
  if (/pre.?roll/i.test(lower)) params.category = 'pre-rolls';
  else if (/edible|gumm/i.test(lower)) params.category = 'edibles';
  else if (/vape|cart/i.test(lower)) params.category = 'vapes';
  else if (/flower|bud|nug/i.test(lower)) params.category = 'flower';
  else if (/concentrate|dab|wax|shatter/i.test(lower)) params.category = 'concentrates';
  else if (/tincture/i.test(lower)) params.category = 'tinctures';
  else if (/topical|cream|balm/i.test(lower)) params.category = 'topicals';

  // Sort detection
  if (/highest.*thc|strongest|most potent/i.test(lower)) params.sortBy = 'thc_desc';
  else if (/cheap|affordable|best deal|lowest price/i.test(lower)) params.sortBy = 'price_asc';

  // Effect detection
  const effectKeywords: Record<string, string[]> = {
    sleep: ['sleep', 'sleepy', 'nighttime', 'insomnia', 'knock out', 'sedating'],
    relax: ['relax', 'calm', 'chill', 'unwind', 'stress', 'anxiety'],
    energy: ['energy', 'energiz', 'uplift', 'creative', 'focus', 'daytime', 'sativa'],
    pain: ['pain', 'relief', 'ache', 'inflammation', 'sore'],
  };
  for (const [effect, keywords] of Object.entries(effectKeywords)) {
    if (keywords.some(k => lower.includes(k))) {
      params.effects = [...(params.effects || []), effect];
    }
  }

  return params;
}

/**
 * Check if a message is asking for product recommendations
 */
export function isProductQuery(message: string): boolean {
  const lower = message.toLowerCase();
  const productSignals = [
    /recommend/i, /suggest/i, /best.*(?:for|product|strain)/i,
    /highest.*thc/i, /strongest/i, /what.*(?:edible|flower|vape|preroll|gumm)/i,
    /looking for/i, /help me find/i, /any.*good/i,
    /sleep.*product/i, /relax.*product/i, /energy.*product/i,
    /indica|sativa|hybrid/i, /thc|cbd/i,
    /menu|product|inventory|stock|available/i,
    /preroll|pre-roll|edible|gumm|vape|cart|flower|concentrate|tincture|topical/i,
    // Vague effect-based requests that imply product recommendation
    /feel.*(?:good|cool|great|relaxed|mellow|euphoric|happy|creative|focused|sleepy|energi)/i,
    /something.*(?:for|to|that|can).*(?:sleep|relax|pain|stress|anxiety|chill|unwind|uplift|focus|creative)/i,
    /want.*(?:smoke|try|buy|get)/i,
    /what.*(?:do you have|should i|can i|would you)/i,
    /headache|nausea|appetite|mood|depression/i,
    /potent|mellow|strong|mild|light|heavy/i,
  ];
  return productSignals.some(r => r.test(lower));
}
