/**
 * Jane (iHeartJane) Cannabis Menu Integration
 *
 * Purple Lotus uses Jane for their product inventory, served via plpcsanjose.com.
 * Jane's front-end is powered by Algolia — we query it directly for ~4ms responses.
 * Falls back to Firecrawl markdown scraping if Algolia is unavailable.
 *
 * Algolia config (public search-only keys, embedded in Jane's client-side JS):
 *   App ID: VFM4X0N23A
 *   Search Key: 8bd39f3c1d26dd060940b682f024757c
 *   Index: menu-products-production
 *
 * Purple Lotus stores:
 *   San Jose (main) = store_id 4398 = 752 Commercial St
 *   Downtown = store_id 5981 = 66 West Santa Clara St
 *
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
  brand?: string;
  query?: string;
  sortBy?: 'thc_desc' | 'thc_asc' | 'price_asc' | 'price_desc' | 'relevance';
  effects?: string[];
  limit?: number;
}

export interface ProductSearchResult {
  products: JaneProduct[];
  totalFound: number;
  storeId: string;
  source: 'algolia' | 'firecrawl' | 'cache';
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

// ── Algolia Config ────────────────────────────────────────────────────────
// Jane's front-end uses Algolia for search. These are public search-only keys
// (exposed in client-side JS on plpcsanjose.com — required for the menu to work).
const ALGOLIA_APP_ID = 'VFM4X0N23A';
const ALGOLIA_SEARCH_KEY = '8bd39f3c1d26dd060940b682f024757c';
const ALGOLIA_INDEX = 'menu-products-production';
const ALGOLIA_BASE = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`;

// Maps our storeId slugs → Algolia's numeric store_id + base URL for product links
const STORE_CONFIG: Record<string, { algoliaId: number; baseUrl: string }> = {
  'san-jose': { algoliaId: 4398, baseUrl: 'https://plpcsanjose.com' },
  '117': { algoliaId: 4398, baseUrl: 'https://plpcsanjose.com' },
  'downtown': { algoliaId: 5981, baseUrl: 'https://plpcsanjose.com' },
};
const DEFAULT_STORE = STORE_CONFIG['san-jose'];

// ── Store URL Mapping (legacy — used by formatProductsForAI) ──────────────
const STORE_URLS: Record<string, string> = {
  'san-jose': 'https://plpcsanjose.com',
  '117': 'https://plpcsanjose.com',
  'downtown': 'https://plpcsanjose.com',
};
const DEFAULT_MENU_BASE = 'https://plpcsanjose.com';

// ── Product Search ──────────────────────────────────────────────────────────

/**
 * Search products via Algolia (fast, ~4ms) with Firecrawl as fallback.
 * Signature kept compatible: firecrawlApiKey param is still accepted
 * so the widget route doesn't need changes.
 */
export async function searchProducts(
  params: ProductSearchParams,
  firecrawlApiKey?: string,
): Promise<ProductSearchResult> {
  const storeId = params.storeId || 'san-jose';

  // Try Algolia first (fast path)
  try {
    const result = await searchViaAlgolia(params, storeId);
    if (result.products.length > 0 || result.totalFound > 0) {
      return result;
    }
  } catch (err) {
    console.error('[jane] Algolia search failed, trying Firecrawl fallback:', err);
  }

  // Fallback to Firecrawl if Algolia fails and we have a key
  if (firecrawlApiKey) {
    try {
      return await searchViaFirecrawl(params, firecrawlApiKey, storeId);
    } catch (err) {
      console.error('[jane] Firecrawl fallback also failed:', err);
    }
  }

  return { products: [], totalFound: 0, storeId, source: 'cache' };
}

// ── Algolia Search (Primary) ──────────────────────────────────────────────

async function searchViaAlgolia(
  params: ProductSearchParams,
  storeId: string,
): Promise<ProductSearchResult> {
  const store = STORE_CONFIG[storeId] || DEFAULT_STORE;
  const baseUrl = store.baseUrl;

  // Build Algolia filters — only store + category. Brand goes into text query
  // because Algolia brand names may differ from our shorthand (e.g. "CBX" vs "CBX Cannabiotix")
  const filters: string[] = [`store_id:${store.algoliaId}`];
  if (params.category) {
    const algoliaKind = CATEGORY_TO_ALGOLIA_KIND[params.category.toLowerCase()];
    if (algoliaKind) {
      filters.push(`kind:${algoliaKind}`);
    }
  }

  // Build query — for brand queries, use JUST the brand name as query text
  // to avoid residual words (like "strains", "products") reducing Algolia results
  let query: string;
  if (params.brand) {
    query = params.brand;
  } else {
    query = params.query || '';
    if (params.category) query = query.replace(new RegExp(params.category, 'gi'), '').trim();
    // Strip common filler words that hurt Algolia relevance
    query = query.replace(/\b(what|which|do you have|any|are|in stock|available|show me|find|best|recommend|looking for|i want|i need|get me)\b/gi, '').trim();
  }

  const limit = params.limit || 10;

  const res = await fetch(ALGOLIA_BASE, {
    method: 'POST',
    headers: {
      'X-Algolia-Application-Id': ALGOLIA_APP_ID,
      'X-Algolia-API-Key': ALGOLIA_SEARCH_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      filters: filters.join(' AND '),
      hitsPerPage: Math.min(limit, 50),
      attributesToRetrieve: [
        'product_id', 'name', 'brand', 'kind', 'root_subtype', 'custom_product_type',
        'percent_thc', 'percent_cbd', 'bucket_price', 'url_slug', 'strain',
        'available_weights', 'image_urls', 'effects', 'feelings', 'activities',
        'available_for_delivery', 'available_for_pickup', 'store_id',
      ],
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`Algolia ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const hits = data.hits || [];
  const totalFound = data.nbHits || 0;

  // Convert Algolia hits → JaneProduct[]
  let products: JaneProduct[] = hits.map((hit: AlgoliaHit) => algoliaHitToProduct(hit, baseUrl));

  // Sort if requested (Algolia returns by relevance by default)
  if (params.sortBy === 'thc_desc') {
    products.sort((a, b) => parseFloat(b.thc || '0') - parseFloat(a.thc || '0'));
  } else if (params.sortBy === 'price_asc') {
    products.sort((a, b) => parseFloat(a.price?.replace('$', '') || '999') - parseFloat(b.price?.replace('$', '') || '999'));
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
      const effectFiltered = products.filter(p =>
        p.strainType && wantedStrains.includes(p.strainType.toLowerCase())
      );
      if (effectFiltered.length >= 3) products = effectFiltered;
    }
  }

  return { products: products.slice(0, limit), totalFound, storeId, source: 'algolia' };
}

// Map our category slugs → Algolia's "kind" field values
const CATEGORY_TO_ALGOLIA_KIND: Record<string, string> = {
  'flower': 'flower', 'bud': 'flower', 'nug': 'flower', 'weed': 'flower',
  'pre-roll': 'pre-roll', 'preroll': 'pre-roll', 'joint': 'pre-roll', 'blunt': 'pre-roll',
  'edible': 'edible', 'gummy': 'edible', 'gummies': 'edible', 'chocolate': 'edible',
  'vape': 'vape', 'cart': 'vape', 'cartridge': 'vape',
  'extract': 'extract', 'concentrate': 'extract', 'dab': 'extract', 'wax': 'extract',
  'shatter': 'extract', 'rosin': 'extract',
  'tincture': 'tincture', 'topical': 'topical', 'cream': 'topical', 'balm': 'topical',
  'drink': 'edible', 'beverage': 'edible',
};

// Algolia hit type (partial — only fields we use)
interface AlgoliaHit {
  product_id: number;
  name: string;
  brand?: string;
  kind?: string;
  root_subtype?: string;
  custom_product_type?: string;
  percent_thc?: number | null;
  percent_cbd?: number | null;
  bucket_price?: number | null;
  url_slug?: string;
  strain?: string | null;
  available_weights?: string[];
  image_urls?: string[];
  effects?: string[];
  feelings?: string[];
  activities?: string[];
  available_for_delivery?: boolean;
  available_for_pickup?: boolean;
}

function algoliaHitToProduct(hit: AlgoliaHit, baseUrl: string): JaneProduct {
  // Derive strain type from the "strain" field or name hints
  let strainType: string | undefined;
  if (hit.strain) {
    const s = hit.strain.toLowerCase();
    if (s.includes('indica')) strainType = 'indica';
    else if (s.includes('sativa')) strainType = 'sativa';
    else if (s.includes('hybrid')) strainType = 'hybrid';
    else if (s.includes('cbd')) strainType = 'cbd';
  }
  // Fallback: check name for strain keywords
  if (!strainType) {
    const nameLower = (hit.name + ' ' + (hit.root_subtype || '')).toLowerCase();
    if (nameLower.includes('indica')) strainType = 'indica';
    else if (nameLower.includes('sativa')) strainType = 'sativa';
    else if (nameLower.includes('hybrid')) strainType = 'hybrid';
  }

  // Build product URL
  const slug = hit.url_slug || hit.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const weight = hit.available_weights?.[0] || 'each';
  const url = `${baseUrl}/product/${hit.product_id}/${slug}?weight=${weight}`;

  return {
    id: String(hit.product_id),
    name: hit.name,
    brand: hit.brand || undefined,
    category: hit.kind || hit.custom_product_type || undefined,
    thc: hit.percent_thc != null ? `${hit.percent_thc}%` : undefined,
    cbd: hit.percent_cbd != null && hit.percent_cbd > 0 ? `${hit.percent_cbd}%` : undefined,
    price: hit.bucket_price != null ? `$${hit.bucket_price}` : undefined,
    strainType,
    effects: hit.effects?.length ? hit.effects : hit.feelings || undefined,
    url,
    weight: hit.available_weights?.[0] || undefined,
    imageUrl: hit.image_urls?.[0] || undefined,
  };
}

// ── Firecrawl Search (Fallback) ───────────────────────────────────────────

async function searchViaFirecrawl(
  params: ProductSearchParams,
  firecrawlApiKey: string,
  storeId: string,
): Promise<ProductSearchResult> {
  // For brand queries without a specific category, scrape /shop/all to get full inventory
  const scrapeParams = params.brand && !params.category ? { ...params, category: undefined } : params;
  const products = await scrapeMenuPage(scrapeParams, firecrawlApiKey, storeId);

  // Filter by brand if specified
  let filtered = products;
  if (params.brand) {
    const brandLower = params.brand.toLowerCase();
    filtered = products.filter(p =>
      p.brand && p.brand.toLowerCase().includes(brandLower)
    );
    if (filtered.length === 0) {
      filtered = products.filter(p =>
        p.name.toLowerCase().includes(brandLower)
      );
    }
  }

  // Sort if requested
  let sorted = filtered;
  if (params.sortBy === 'thc_desc') {
    sorted = filtered.sort((a, b) => parseFloat(b.thc || '0') - parseFloat(a.thc || '0'));
  } else if (params.sortBy === 'price_asc') {
    sorted = filtered.sort((a, b) => parseFloat(a.price?.replace('$', '') || '999') - parseFloat(b.price?.replace('$', '') || '999'));
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
}

/**
 * Scrape and parse products from the store's Jane menu page
 */
async function scrapeMenuPage(
  params: ProductSearchParams,
  apiKey: string,
  storeId: string = 'san-jose',
): Promise<JaneProduct[]> {
  const menuBase = STORE_URLS[storeId] || DEFAULT_MENU_BASE;
  // Resolve category slug
  const categorySlug = params.category ? (CATEGORY_MAP[params.category.toLowerCase()] || params.category) : '';
  const menuUrl = categorySlug
    ? `${menuBase}/shop/${categorySlug}`
    : `${menuBase}/shop/all`;

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

export function formatProductsForAI(products: JaneProduct[], groupByCategory = false): string {
  if (products.length === 0) {
    return 'No products found matching that request. Suggest the customer browse the full menu online or visit the store.';
  }

  if (groupByCategory && products.length > 3) {
    // Group by category for brand queries — shows all product types
    const groups: Record<string, JaneProduct[]> = {};
    for (const p of products) {
      const cat = p.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }
    const sections: string[] = [];
    for (const [cat, items] of Object.entries(groups)) {
      const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
      const formatted = items.slice(0, 5).map((p, i) => {
        const details = [
          p.strainType && `${p.strainType.charAt(0).toUpperCase() + p.strainType.slice(1)}`,
          p.thc && `THC: ${p.thc}`,
          p.price && `${p.price}`,
          p.weight && `(${p.weight})`,
        ].filter(Boolean).join(' · ');
        return `${i + 1}. **${p.name}**\n   ${details}\n   ${p.url}`;
      }).join('\n\n');
      sections.push(`### ${catLabel}\n${formatted}`);
    }
    return sections.join('\n\n');
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

// ── Known Cannabis Brands ───────────────────────────────────────────────────
// Common brands carried by dispensaries. Used for brand detection in queries.
// Case-insensitive matching — store the canonical name here.
const KNOWN_BRANDS: string[] = [
  'Alien Labs', 'Connected', 'Wyld', 'Stiiizy', 'Raw Garden', 'Jetty',
  'Pax', 'Select', 'Kiva', 'Camino', 'PLUS', 'Wana', 'Heavy Hitters',
  'Bloom Farms', 'Cookies', 'Jungle Boys', 'Fig Farms', 'CBX', 'Coldfire',
  'Blue Chip', 'Froot', 'Upnorth', 'Caviar Gold', 'Purple Lotus',
  'Garcia Hand Picked', 'Lowell', 'Old Pal', 'Pacific Stone', 'Glass House',
  'Almora', 'CRU', 'Dablogic', 'West Coast Cure', 'Claybourne', 'Ember Valley',
  'Lost Farm', 'Kikoko', 'Terra', 'Defonce', 'Korova', 'Binske',
];

// ── Intent Parsing ──────────────────────────────────────────────────────────

export function parseProductIntent(message: string): ProductSearchParams {
  const lower = message.toLowerCase();
  const params: ProductSearchParams = { query: message };

  // Brand detection — check known brands first, then freeform patterns
  for (const brand of KNOWN_BRANDS) {
    if (lower.includes(brand.toLowerCase())) {
      params.brand = brand;
      break;
    }
  }
  // Freeform: "what [brand] products/strains/flavors do you have"
  if (!params.brand) {
    const brandPattern = lower.match(/(?:what|any|which|do you (?:have|carry|sell|stock))\s+([a-z][a-z\s]{1,25}?)\s+(?:strain|product|flavor|pre.?roll|edible|gumm|vape|flower|item|option)/i);
    if (brandPattern) {
      // Check if the extracted name matches a known brand loosely
      const candidate = brandPattern[1].trim();
      const match = KNOWN_BRANDS.find(b => b.toLowerCase() === candidate || b.toLowerCase().startsWith(candidate));
      if (match) params.brand = match;
    }
  }

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
 * Check if a message is asking about a specific brand
 */
export function isBrandQuery(message: string): boolean {
  const lower = message.toLowerCase();
  return KNOWN_BRANDS.some(b => lower.includes(b.toLowerCase()));
}

/**
 * Check if a message is asking for product recommendations
 */
export function isProductQuery(message: string): boolean {
  const lower = message.toLowerCase().replace(/[\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}]/gu, '').trim();

  // Brand name match is always a product query
  if (KNOWN_BRANDS.some(b => lower.includes(b.toLowerCase()))) return true;

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
    // Deal / promo queries
    /\bdeal|promo|discount|special|sale|offer|coupon\b/i,
    // Short effect keywords (from quick reply buttons)
    /^(?:pain\s*relief|relaxation|relax|sleep|energy|creativity|creative|calm|uplifting|euphoria|focus|recovery)$/i,
  ];
  return productSignals.some(r => r.test(lower));
}
