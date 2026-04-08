/**
 * Jane (iHeartJane) Cannabis Menu Integration
 *
 * Purple Lotus uses Jane for their product inventory, served via plpcsanjose.com.
 * Jane's API (api.iheartjane.com) is behind Cloudflare — blocks server calls.
 * We use Firecrawl to scrape the menu pages and parse product data from markdown.
 *
 * Purple Lotus stores:
 *   San Jose (main) = 752 Commercial St
 *   Downtown = 66 West Santa Clara St
 *
 * Menu URL structure: https://plpcsanjose.com/shop/{category}
 * Product URL structure: https://plpcsanjose.com/product/{id}/{slug}
 * Categories: flower, pre-roll, extract, vape, edible, tincture, topical, gear, merch
 */

export interface JaneProduct {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  thc?: string;
  cbd?: string;
  price?: string;
  strainType?: string; // indica, sativa, hybrid, cbd
  effects?: string[];
  url: string;
  weight?: string;
  imageUrl?: string;
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
  source: 'firecrawl' | 'cache';
}

// ── Category mapping (user terms → PL site slugs) ──────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  'pre-roll': 'pre-roll',
  'preroll': 'pre-roll',
  'prerolls': 'pre-roll',
  'pre-rolls': 'pre-roll',
  'joint': 'pre-roll',
  'joints': 'pre-roll',
  'blunt': 'pre-roll',
  'flower': 'flower',
  'bud': 'flower',
  'buds': 'flower',
  'nug': 'flower',
  'nugs': 'flower',
  'weed': 'flower',
  'edible': 'edible',
  'edibles': 'edible',
  'gummy': 'edible',
  'gummies': 'edible',
  'gumm': 'edible',
  'gummie': 'edible',
  'chocolate': 'edible',
  'vape': 'vape',
  'vapes': 'vape',
  'cart': 'vape',
  'cartridge': 'vape',
  'carts': 'vape',
  'extract': 'extract',
  'extracts': 'extract',
  'concentrate': 'extract',
  'concentrates': 'extract',
  'dab': 'extract',
  'dabs': 'extract',
  'wax': 'extract',
  'shatter': 'extract',
  'rosin': 'extract',
  'tincture': 'tincture',
  'tinctures': 'tincture',
  'topical': 'topical',
  'topicals': 'topical',
  'cream': 'topical',
  'balm': 'topical',
  'drink': 'edible:drinks',
  'drinks': 'edible:drinks',
  'beverage': 'edible:drinks',
};

// ── Product Search ──────────────────────────────────────────────────────────

/**
 * Search products using Firecrawl markdown scraping
 */
export async function searchProducts(
  params: ProductSearchParams,
  firecrawlApiKey?: string,
): Promise<ProductSearchResult> {
  const storeId = params.storeId || 'san-jose';

  if (!firecrawlApiKey) {
    return { products: [], totalFound: 0, storeId, source: 'cache' };
  }

  try {
    const products = await scrapeMenuPage(params, firecrawlApiKey);

    // Sort if requested
    let sorted = products;
    if (params.sortBy === 'thc_desc') {
      sorted = products.sort((a, b) => parseFloat(b.thc || '0') - parseFloat(a.thc || '0'));
    } else if (params.sortBy === 'price_asc') {
      sorted = products.sort((a, b) => parseFloat(a.price?.replace('$', '') || '999') - parseFloat(b.price?.replace('$', '') || '999'));
    }

    // Filter by effects if specified
    if (params.effects?.length) {
      const effectMap: Record<string, string[]> = {
        sleep: ['indica'],
        relax: ['indica', 'hybrid'],
        energy: ['sativa'],
        pain: ['indica', 'hybrid'],
      };
      const wantedStrains = params.effects.flatMap(e => effectMap[e] || []);
      if (wantedStrains.length > 0) {
        const effectFiltered = sorted.filter(p =>
          p.strainType && wantedStrains.includes(p.strainType.toLowerCase())
        );
        if (effectFiltered.length >= 3) sorted = effectFiltered;
      }
    }

    const limit = params.limit || 10;
    return { products: sorted.slice(0, limit), totalFound: products.length, storeId, source: 'firecrawl' };
  } catch (err) {
    console.error('[jane] Firecrawl scrape failed:', err);
    return { products: [], totalFound: 0, storeId, source: 'cache' };
  }
}

/**
 * Scrape and parse products from plpcsanjose.com menu page
 */
async function scrapeMenuPage(
  params: ProductSearchParams,
  apiKey: string,
): Promise<JaneProduct[]> {
  // Resolve category slug
  const categorySlug = params.category ? (CATEGORY_MAP[params.category.toLowerCase()] || params.category) : '';
  const menuUrl = categorySlug
    ? `https://plpcsanjose.com/shop/${categorySlug}`
    : 'https://plpcsanjose.com/shop/all';

  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: menuUrl,
      formats: ['markdown'],
      waitFor: 5000,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Firecrawl ${res.status}`);
  }

  const data = await res.json();
  const markdown = data?.data?.markdown || '';

  if (markdown.length < 200) {
    return [];
  }

  return parseProductsFromMarkdown(markdown);
}

/**
 * Parse product data from the PL menu page markdown
 *
 * The markdown has a repeating pattern for each product:
 * ## or numbered list with:
 *   - Image link with product name as alt text
 *   - Product name as a link to /product/{id}/{slug}
 *   - Brand name as a link to /brands/{brand}
 *   - Strain type (indica/sativa/hybrid/cbd) as a link
 *   - Category link
 *   - THC number (just the number, e.g., "40.2")
 *   - Price like "$29.99Each"
 */
function parseProductsFromMarkdown(markdown: string): JaneProduct[] {
  const products: JaneProduct[] = [];

  // Split by numbered list items (01. 02. etc.)
  const productBlocks = markdown.split(/\n\d{2}\.\s/);

  for (const block of productBlocks.slice(1)) { // skip first (header/nav)
    try {
      const product = parseProductBlock(block);
      if (product) products.push(product);
    } catch {
      // Skip unparseable blocks
    }
  }

  return products;
}

function parseProductBlock(block: string): JaneProduct | null {
  // Extract product URL and name: [Product Name](https://plpcsanjose.com/product/...)
  const productLinkMatch = block.match(/\[([^\]]+)\]\((https:\/\/plpcsanjose\.com\/product\/[^)]+)\)/);
  if (!productLinkMatch) return null;

  const name = productLinkMatch[1].trim();
  const url = productLinkMatch[2];

  // Extract brand: [Brand](https://plpcsanjose.com/brands/...)
  const brandMatch = block.match(/\[([^\]]+)\]\(https:\/\/plpcsanjose\.com\/brands\/[^)]+\)/);
  const brand = brandMatch ? brandMatch[1].trim() : undefined;

  // Extract strain type: [indica|sativa|hybrid|cbd](https://plpcsanjose.com/shop?strain=...)
  const strainMatch = block.match(/\[(indica|sativa|hybrid|cbd)\]\(https:\/\/plpcsanjose\.com\/shop\?strain=/i);
  const strainType = strainMatch ? strainMatch[1].toLowerCase() : undefined;

  // Extract category: [pre-roll|flower|vape|edible|extract|tincture|topical](https://plpcsanjose.com/shop/...)
  const catMatch = block.match(/\[(pre-roll|flower|vape|edible|extract|tincture|topical|gear)\]\(https:\/\/plpcsanjose\.com\/shop\//i);
  const category = catMatch ? catMatch[1].toLowerCase() : undefined;

  // Extract THC: number after strain/category line, pattern like "40.2" or "8.812.7" (THC.CBD)
  // THC values appear as standalone numbers in the block
  const lines = block.split('\n');
  let thc: string | undefined;
  let price: string | undefined;

  for (const line of lines) {
    // Price: "$29.99Each" or "$15.00Each"
    const priceMatch = line.match(/\$(\d+\.?\d*)(?:Each|\/g|\/ea)?/i);
    if (priceMatch && !price) {
      price = '$' + priceMatch[1];
    }

    // THC: standalone number like "40.2" or after strain info
    // The PL site shows THC as a bare number on its own line segment
    const thcMatch = line.match(/^\s*(\d{1,2}(?:\.\d+)?)\s*$/);
    if (thcMatch && !thc && parseFloat(thcMatch[1]) >= 1 && parseFloat(thcMatch[1]) <= 100) {
      thc = thcMatch[1] + '%';
    }
  }

  // Secondary THC extraction: look for numbers right after strain/category tags
  if (!thc) {
    const thcInline = block.match(/(?:pre-roll|flower|vape|edible|extract)\)\s*(\d{1,2}(?:\.\d+)?)/);
    if (thcInline && parseFloat(thcInline[1]) >= 1) {
      thc = thcInline[1] + '%';
    }
  }

  // Extract product ID from URL
  const idMatch = url.match(/\/product\/(\d+)\//);
  const id = idMatch ? idMatch[1] : name.toLowerCase().replace(/\s+/g, '-');

  // Extract weight from name: [2g], [1g], 10 Pack, etc.
  const weightMatch = name.match(/\[([^\]]*g)\]|(\d+\s*(?:pack|pk))/i);
  const weight = weightMatch ? (weightMatch[1] || weightMatch[2]) : undefined;

  return {
    id,
    name,
    brand,
    category,
    thc,
    strainType,
    price,
    url,
    weight,
  };
}

// ── Formatting ──────────────────────────────────────────────────────────────

export function formatProductsForAI(products: JaneProduct[]): string {
  if (products.length === 0) {
    return 'No products found. Suggest browsing the full menu at https://plpcsanjose.com/shop or visiting the store.';
  }

  return products.map((p, i) => {
    const details = [
      p.strainType && `${p.strainType.charAt(0).toUpperCase() + p.strainType.slice(1)}`,
      p.thc && `THC: ${p.thc}`,
      p.brand && `by ${p.brand}`,
      p.price && `${p.price}`,
      p.weight && `(${p.weight})`,
    ].filter(Boolean).join(' · ');

    return `${i + 1}. **${p.name}**\n   ${details}\n   ${p.url}`;
  }).join('\n\n');
}

// ── Intent Parsing ──────────────────────────────────────────────────────────

export function parseProductIntent(message: string): ProductSearchParams {
  const lower = message.toLowerCase();
  const params: ProductSearchParams = { query: message };

  // Category detection
  const categoryWords = lower.match(/\b(pre.?roll|preroll|joint|blunt|flower|bud|nug|weed|edible|gummy|gummies|gumm\w*|chocolate|vape|cart|cartridge|extract|concentrate|dab|wax|shatter|rosin|tincture|topical|cream|balm|drink|beverage)\w*/i);
  if (categoryWords) {
    const word = categoryWords[1].toLowerCase().replace(/s$/, '');
    params.category = word;
  }

  // Sort detection
  if (/highest.*thc|strongest|most potent|highest potency/i.test(lower)) params.sortBy = 'thc_desc';
  else if (/cheap|affordable|best deal|lowest price|budget/i.test(lower)) params.sortBy = 'price_asc';

  // Effect detection
  const effectKeywords: Record<string, string[]> = {
    sleep: ['sleep', 'sleepy', 'nighttime', 'insomnia', 'knock out', 'sedating', 'bed'],
    relax: ['relax', 'calm', 'chill', 'unwind', 'stress', 'anxiety', 'cool', 'mellow'],
    energy: ['energy', 'energiz', 'uplift', 'creative', 'focus', 'daytime', 'morning', 'wake'],
    pain: ['pain', 'relief', 'ache', 'inflammation', 'sore', 'headache', 'migraine', 'cramp'],
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
    /highest.*thc/i, /strongest/i, /what.*(?:edible|flower|vape|preroll|pre.?roll|gumm)/i,
    /looking for/i, /help me find/i, /any.*good/i,
    /indica|sativa|hybrid/i, /\bthc\b|\bcbd\b/i,
    /\bmenu\b|product|inventory|stock|available/i,
    /preroll|pre-roll|pre roll|edible|gumm|vape|cart|flower|concentrate|tincture|topical|extract|dab|wax/i,
    // Vague effect-based requests
    /feel.*(?:good|cool|great|relaxed|mellow|euphoric|happy|creative|focused|sleepy|energi)/i,
    /something.*(?:for|to|that|can).*(?:sleep|relax|pain|stress|anxiety|chill|unwind|uplift|focus|creative)/i,
    /want.*(?:smoke|try|buy|get|something)/i,
    /what.*(?:do you have|should i|can i|would you)/i,
    /headache|nausea|appetite|mood|depression/i,
    /potent|mellow|strong|mild|light|heavy/i,
    /what.*(?:strain|brand)/i,
  ];
  return productSignals.some(r => r.test(lower));
}
