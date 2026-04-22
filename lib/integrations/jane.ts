/**
 * Jane (iHeartJane) Cannabis Menu Integration — Generalized
 *
 * Fetches products from a dispensary's Jane-powered menu via Algolia for
 * ~4ms responses. Falls back to Firecrawl markdown scraping if Algolia
 * is unreachable or misconfigured.
 *
 * Per-client config is passed in via `JaneConfig`. Public search-only Algolia
 * keys are safe to store — they're embedded in Jane's client-side JS anyway
 * (visible in browser DevTools on any Jane-powered menu page).
 *
 * Store configuration is per-dispensary. Multi-location dispensaries add
 * multiple `stores` entries keyed by slug.
 */

// ── Per-Dispensary Jane Config ──────────────────────────────────────────────

export interface JaneStore {
  /** Jane's numeric store_id (from their Algolia filter). */
  algoliaStoreId: number;
  /** Consumer-facing menu URL, e.g. "https://plpcsanjose.com". */
  baseUrl: string;
}

export interface JaneConfig {
  algoliaAppId: string;
  algoliaSearchKey: string;
  algoliaIndex: string;
  stores: Record<string, JaneStore>;
  /** Slug matching a key in `stores` — used when no storeId is supplied. */
  defaultStore: string;
  /** Brand names the dispensary actually carries — used for intent parsing. */
  knownBrands?: string[];
}

// ── Product + Search Types ──────────────────────────────────────────────────

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
  /** Full brand name from Algolia (e.g., "CBX Cannabiotix" even when user searched "CBX") */
  resolvedBrand?: string;
}

// ── Category / Effect Maps (industry-standard) ──────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  'pre-roll': 'pre-roll', preroll: 'pre-roll', prerolls: 'pre-roll',
  'pre-rolls': 'pre-roll', joint: 'pre-roll', joints: 'pre-roll', blunt: 'pre-roll',
  flower: 'flower', bud: 'flower', buds: 'flower', nug: 'flower',
  nugs: 'flower', weed: 'flower',
  edible: 'edible', edibles: 'edible', gummy: 'edible', gummies: 'edible',
  gumm: 'edible', gummie: 'edible', chocolate: 'edible',
  vape: 'vape', vapes: 'vape', cart: 'vape', cartridge: 'vape', carts: 'vape',
  extract: 'extract', extracts: 'extract', concentrate: 'extract', concentrates: 'extract',
  dab: 'extract', dabs: 'extract', wax: 'extract', shatter: 'extract', rosin: 'extract',
  tincture: 'tincture', tinctures: 'tincture',
  topical: 'topical', topicals: 'topical', cream: 'topical', balm: 'topical',
  drink: 'edible:drinks', drinks: 'edible:drinks', beverage: 'edible:drinks',
};

// Map user category terms → Algolia root_types values
// root_types is Jane's canonical product taxonomy
const CATEGORY_TO_ROOT_TYPE: Record<string, string> = {
  flower: 'flower', bud: 'flower', nug: 'flower', weed: 'flower',
  'pre-roll': 'pre-roll', preroll: 'pre-roll', joint: 'pre-roll', blunt: 'pre-roll',
  edible: 'edible', gummy: 'edible', gummies: 'edible', chocolate: 'edible',
  vape: 'vape', cart: 'vape', cartridge: 'vape',
  extract: 'extract', concentrate: 'extract', dab: 'extract', wax: 'extract',
  shatter: 'extract', rosin: 'extract',
  tincture: 'tincture', topical: 'topical', cream: 'topical', balm: 'topical',
  drink: 'edible', beverage: 'edible',
};

const EFFECT_LINEAGE_MAP: Record<string, string[]> = {
  sleep: ['indica'],
  relax: ['indica', 'hybrid'],
  energy: ['sativa'],
  pain: ['indica', 'hybrid'],
};

const EFFECT_KEYWORDS: Record<string, string[]> = {
  sleep: ['sleep', 'sleepy', 'nighttime', 'insomnia', 'knock out', 'sedating', 'bed'],
  relax: ['relax', 'calm', 'chill', 'unwind', 'stress', 'anxiety', 'cool', 'mellow'],
  energy: ['energy', 'energiz', 'uplift', 'creative', 'focus', 'daytime', 'morning', 'wake'],
  pain: ['pain', 'relief', 'ache', 'inflammation', 'sore', 'headache', 'migraine', 'cramp'],
};

// ── Algolia Search (Primary) ────────────────────────────────────────────────

// Algolia hit type — fields from Jane's Algolia index
// Docs: https://docs.iheartjane.com/jane-docs/implementing-roots/building-your-menu/using-react-and-instant-search/filtering-your-results
interface AlgoliaHit {
  product_id: number;
  name: string;
  brand?: string;
  kind?: string;           // product type (flower, pre-roll, etc.)
  root_types?: string[];   // Jane's canonical categories: ["flower", "flower:Infused Flower"]
  root_subtype?: string;   // sub-category: "Infused Flower", "Live Resin", etc.
  custom_product_type?: string;
  category?: string;       // lineage: "indica", "sativa", "hybrid", "cbd"
  percent_thc?: number | null;
  percent_cbd?: number | null;
  bucket_price?: number | null;
  url_slug?: string;
  available_weights?: string[];
  image_urls?: string[];
  feelings?: string[];
  activities?: string[];
  description?: string;
  aggregate_rating?: number;
  review_count?: number;
  available_for_delivery?: boolean;
  available_for_pickup?: boolean;
}

/**
 * Search products via Algolia (fast, ~4ms) with Firecrawl as fallback.
 */
export async function searchProducts(
  config: JaneConfig,
  params: ProductSearchParams,
  firecrawlApiKey?: string,
): Promise<ProductSearchResult> {
  const storeId = params.storeId || config.defaultStore;

  // Try Algolia first (fast path)
  try {
    const result = await searchViaAlgolia(config, params, storeId);
    if (result.products.length > 0 || result.totalFound > 0) {
      return result;
    }
  } catch (err) {
    console.error('[jane] Algolia search failed, trying Firecrawl fallback:', err);
  }

  // Fallback to Firecrawl if Algolia fails and we have a key
  if (firecrawlApiKey) {
    try {
      return await searchViaFirecrawl(config, params, firecrawlApiKey, storeId);
    } catch (err) {
      console.error('[jane] Firecrawl fallback also failed:', err);
    }
  }

  return { products: [], totalFound: 0, storeId, source: 'cache' };
}

async function searchViaAlgolia(
  config: JaneConfig,
  params: ProductSearchParams,
  storeId: string,
): Promise<ProductSearchResult> {
  const store = config.stores[storeId] || config.stores[config.defaultStore];
  if (!store) {
    throw new Error(`Jane: unknown storeId "${storeId}" (no fallback configured)`);
  }
  const baseUrl = store.baseUrl;

  // Build Algolia filters
  // - Brand goes into text query (names may differ: "CBX" vs "CBX Cannabiotix")
  // - Product type uses root_types (Jane's canonical categories)
  // - Lineage uses category field (indica/sativa/hybrid/cbd)
  const filters: string[] = [`store_id:${store.algoliaStoreId}`];
  if (params.category) {
    const rootType = CATEGORY_TO_ROOT_TYPE[params.category.toLowerCase()];
    if (rootType) filters.push(`root_types:${rootType}`);
  }
  // Filter by lineage for effect-based queries (sleep → indica, energy → sativa)
  if (params.effects?.length) {
    const lineages = [...new Set(params.effects.flatMap((e) => EFFECT_LINEAGE_MAP[e] || []))];
    if (lineages.length === 1) {
      filters.push(`category:${lineages[0]}`);
    } else if (lineages.length > 1) {
      filters.push(`(${lineages.map((l) => `category:${l}`).join(' OR ')})`);
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
    query = query
      .replace(
        /\b(what|which|do you have|any|are|in stock|available|show me|find|best|recommend|looking for|i want|i need|get me)\b/gi,
        '',
      )
      .trim();
  }

  const limit = params.limit || 10;
  const algoliaBase = `https://${config.algoliaAppId}-dsn.algolia.net/1/indexes/${config.algoliaIndex}/query`;

  const res = await fetch(algoliaBase, {
    method: 'POST',
    headers: {
      'X-Algolia-Application-Id': config.algoliaAppId,
      'X-Algolia-API-Key': config.algoliaSearchKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      filters: filters.join(' AND '),
      hitsPerPage: Math.min(limit, 50),
      attributesToRetrieve: [
        'product_id', 'name', 'brand', 'kind', 'root_types', 'root_subtype',
        'custom_product_type', 'category', 'percent_thc', 'percent_cbd',
        'bucket_price', 'url_slug', 'available_weights', 'image_urls',
        'feelings', 'activities', 'description', 'aggregate_rating',
        'review_count', 'available_for_delivery', 'available_for_pickup',
      ],
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`Algolia ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const hits = (data.hits || []) as AlgoliaHit[];
  const totalFound = data.nbHits || 0;

  // Convert Algolia hits → JaneProduct[]
  const products: JaneProduct[] = hits.map((hit) => algoliaHitToProduct(hit, baseUrl));

  // Sort if requested (Algolia returns by relevance by default)
  if (params.sortBy === 'thc_desc') {
    products.sort((a, b) => parseFloat(b.thc || '0') - parseFloat(a.thc || '0'));
  } else if (params.sortBy === 'price_asc') {
    products.sort(
      (a, b) =>
        parseFloat(a.price?.replace('$', '') || '999') -
        parseFloat(b.price?.replace('$', '') || '999'),
    );
  }

  // Resolve the full brand name from Algolia (e.g., user searched "CBX" → "CBX Cannabiotix")
  // Used by the route to build correct /brands/{slug} URLs
  const resolvedBrand =
    params.brand && hits.length > 0 ? hits[0].brand || params.brand : undefined;

  return {
    products: products.slice(0, limit),
    totalFound,
    storeId,
    source: 'algolia',
    resolvedBrand,
  };
}

function algoliaHitToProduct(hit: AlgoliaHit, baseUrl: string): JaneProduct {
  // Lineage comes from the "category" field (indica/sativa/hybrid/cbd)
  const strainType = hit.category || undefined;

  // Build product URL
  const slug = hit.url_slug || hit.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const weight = hit.available_weights?.[0] || 'each';
  const url = `${baseUrl}/product/${hit.product_id}/${slug}?weight=${weight}`;

  // Merge feelings + activities into effects for the AI
  const effects = [
    ...(hit.feelings || []),
    ...(hit.activities || []),
  ].filter(Boolean);

  return {
    id: String(hit.product_id),
    name: hit.name,
    brand: hit.brand || undefined,
    category: hit.kind || hit.custom_product_type || undefined,
    thc: hit.percent_thc != null ? `${hit.percent_thc}%` : undefined,
    cbd: hit.percent_cbd != null && hit.percent_cbd > 0 ? `${hit.percent_cbd}%` : undefined,
    price: hit.bucket_price != null ? `$${hit.bucket_price}` : undefined,
    strainType,
    effects: effects.length > 0 ? effects : undefined,
    url,
    weight: hit.available_weights?.[0] || undefined,
    imageUrl: hit.image_urls?.[0] || undefined,
  };
}

// ── Firecrawl Search (Fallback) ─────────────────────────────────────────────

async function searchViaFirecrawl(
  config: JaneConfig,
  params: ProductSearchParams,
  firecrawlApiKey: string,
  storeId: string,
): Promise<ProductSearchResult> {
  const store = config.stores[storeId] || config.stores[config.defaultStore];
  const menuBase = store?.baseUrl;
  if (!menuBase) {
    return { products: [], totalFound: 0, storeId, source: 'cache' };
  }

  // For brand queries without a specific category, scrape /shop/all to get full inventory
  const scrapeParams = params.brand && !params.category ? { ...params, category: undefined } : params;
  const products = await scrapeMenuPage(scrapeParams, firecrawlApiKey, menuBase);

  // Filter by brand if specified
  let filtered = products;
  if (params.brand) {
    const brandLower = params.brand.toLowerCase();
    filtered = products.filter((p) =>
      p.brand && p.brand.toLowerCase().includes(brandLower),
    );
    if (filtered.length === 0) {
      filtered = products.filter((p) => p.name.toLowerCase().includes(brandLower));
    }
  }

  // Sort if requested
  let sorted = filtered;
  if (params.sortBy === 'thc_desc') {
    sorted = filtered.sort((a, b) => parseFloat(b.thc || '0') - parseFloat(a.thc || '0'));
  } else if (params.sortBy === 'price_asc') {
    sorted = filtered.sort(
      (a, b) =>
        parseFloat(a.price?.replace('$', '') || '999') -
        parseFloat(b.price?.replace('$', '') || '999'),
    );
  }

  // Filter by effects if specified
  if (params.effects?.length) {
    const wantedStrains = params.effects.flatMap((e) => EFFECT_LINEAGE_MAP[e] || []);
    if (wantedStrains.length > 0) {
      const effectFiltered = sorted.filter(
        (p) => p.strainType && wantedStrains.includes(p.strainType.toLowerCase()),
      );
      if (effectFiltered.length >= 3) sorted = effectFiltered;
    }
  }

  const limit = params.limit || 10;
  return {
    products: sorted.slice(0, limit),
    totalFound: products.length,
    storeId,
    source: 'firecrawl',
  };
}

async function scrapeMenuPage(
  params: ProductSearchParams,
  apiKey: string,
  menuBase: string,
): Promise<JaneProduct[]> {
  const categorySlug = params.category
    ? CATEGORY_MAP[params.category.toLowerCase()] || params.category
    : '';
  const menuUrl = categorySlug ? `${menuBase}/shop/${categorySlug}` : `${menuBase}/shop/all`;

  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: menuUrl, formats: ['markdown'], waitFor: 5000 }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Firecrawl ${res.status}`);

  const data = await res.json();
  const markdown = data?.data?.markdown || '';
  if (markdown.length < 200) return [];

  return parseProductsFromMarkdown(markdown, menuBase);
}

/**
 * Parse product data from a Jane-powered menu page markdown.
 * Same shape across Jane dispensaries — only the base URL changes.
 */
function parseProductsFromMarkdown(markdown: string, baseUrl: string): JaneProduct[] {
  const products: JaneProduct[] = [];
  const escaped = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const productLinkRe = new RegExp(`\\[([^\\]]+)\\]\\((${escaped}/product/[^)]+)\\)`);
  const brandLinkRe = new RegExp(`\\[([^\\]]+)\\]\\(${escaped}/brands/[^)]+\\)`);

  // Split by numbered list items (01. 02. etc.)
  const productBlocks = markdown.split(/\n\d{2}\.\s/);

  for (const block of productBlocks.slice(1)) {
    try {
      const productLinkMatch = block.match(productLinkRe);
      if (!productLinkMatch) continue;

      const name = productLinkMatch[1].trim();
      const url = productLinkMatch[2];

      const brandMatch = block.match(brandLinkRe);
      const brand = brandMatch ? brandMatch[1].trim() : undefined;

      const strainMatch = block.match(/\[(indica|sativa|hybrid|cbd)\]/i);
      const strainType = strainMatch ? strainMatch[1].toLowerCase() : undefined;

      const catMatch = block.match(/\[(pre-roll|flower|vape|edible|extract|tincture|topical|gear)\]/i);
      const category = catMatch ? catMatch[1].toLowerCase() : undefined;

      const lines = block.split('\n');
      let thc: string | undefined;
      let price: string | undefined;
      for (const line of lines) {
        const priceMatch = line.match(/\$(\d+\.?\d*)(?:Each|\/g|\/ea)?/i);
        if (priceMatch && !price) price = '$' + priceMatch[1];

        const thcMatch = line.match(/^\s*(\d{1,2}(?:\.\d+)?)\s*$/);
        if (thcMatch && !thc && parseFloat(thcMatch[1]) >= 1 && parseFloat(thcMatch[1]) <= 100) {
          thc = thcMatch[1] + '%';
        }
      }

      // Secondary THC extraction: numbers right after strain/category tags
      if (!thc) {
        const thcInline = block.match(/(?:pre-roll|flower|vape|edible|extract)\)\s*(\d{1,2}(?:\.\d+)?)/);
        if (thcInline && parseFloat(thcInline[1]) >= 1) thc = thcInline[1] + '%';
      }

      const idMatch = url.match(/\/product\/(\d+)\//);
      const id = idMatch ? idMatch[1] : name.toLowerCase().replace(/\s+/g, '-');

      const weightMatch = name.match(/\[([^\]]*g)\]|(\d+\s*(?:pack|pk))/i);
      const weight = weightMatch ? weightMatch[1] || weightMatch[2] : undefined;

      products.push({ id, name, brand, category, thc, strainType, price, url, weight });
    } catch {
      // skip unparseable
    }
  }

  return products;
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
          p.strainType && p.strainType.charAt(0).toUpperCase() + p.strainType.slice(1),
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
      p.strainType && p.strainType.charAt(0).toUpperCase() + p.strainType.slice(1),
      p.thc && `THC: ${p.thc}`,
      p.brand && `by ${p.brand}`,
      p.price && `${p.price}`,
      p.weight && `(${p.weight})`,
    ].filter(Boolean).join(' · ');
    const effectsLine = p.effects?.length ? `\n   Effects: ${p.effects.slice(0, 4).join(', ')}` : '';

    return `${i + 1}. **${p.name}**\n   ${details}${effectsLine}\n   ${p.url}`;
  }).join('\n\n');
}

// ── Intent Parsing ──────────────────────────────────────────────────────────

export function parseProductIntent(
  message: string,
  knownBrands: string[] = [],
): ProductSearchParams {
  const lower = message.toLowerCase();
  const params: ProductSearchParams = { query: message };

  // Brand detection — check known brands first, then freeform patterns
  for (const brand of knownBrands) {
    if (lower.includes(brand.toLowerCase())) {
      params.brand = brand;
      break;
    }
  }
  // Freeform: "what [brand] products/strains/flavors do you have"
  if (!params.brand && knownBrands.length > 0) {
    const brandPattern = lower.match(
      /(?:what|any|which|do you (?:have|carry|sell|stock))\s+([a-z][a-z\s]{1,25}?)\s+(?:strain|product|flavor|pre.?roll|edible|gumm|vape|flower|item|option)/i,
    );
    if (brandPattern) {
      const candidate = brandPattern[1].trim();
      const match = knownBrands.find(
        (b) => b.toLowerCase() === candidate || b.toLowerCase().startsWith(candidate),
      );
      if (match) params.brand = match;
    }
  }

  // Category detection
  const categoryWords = lower.match(
    /\b(pre.?roll|preroll|joint|blunt|flower|bud|nug|weed|edible|gummy|gummies|gumm\w*|chocolate|vape|cart|cartridge|extract|concentrate|dab|wax|shatter|rosin|tincture|topical|cream|balm|drink|beverage)\w*/i,
  );
  if (categoryWords) {
    params.category = categoryWords[1].toLowerCase().replace(/s$/, '');
  }

  // Sort detection
  if (/highest.*thc|strongest|most potent|highest potency/i.test(lower)) {
    params.sortBy = 'thc_desc';
  } else if (/cheap|affordable|best deal|lowest price|budget/i.test(lower)) {
    params.sortBy = 'price_asc';
  }

  // Effect detection
  for (const [effect, keywords] of Object.entries(EFFECT_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      params.effects = [...(params.effects || []), effect];
    }
  }

  return params;
}

/**
 * Check if a message is asking about a specific brand carried by this dispensary.
 */
export function isBrandQuery(message: string, knownBrands: string[] = []): boolean {
  const lower = message.toLowerCase();
  return knownBrands.some((b) => lower.includes(b.toLowerCase()));
}

/**
 * Check if a message is asking for product recommendations.
 */
export function isProductQuery(message: string, knownBrands: string[] = []): boolean {
  const lower = message.toLowerCase().replace(/[\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}]/gu, '').trim();

  // Brand name match is always a product query
  if (knownBrands.some((b) => lower.includes(b.toLowerCase()))) return true;

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
  return productSignals.some((r) => r.test(lower));
}

// ── Config Builder Helper ──────────────────────────────────────────────────

/**
 * Build a JaneConfig from a client's `container_config` row.
 * Returns null if required Algolia credentials are missing.
 *
 * Expected config keys:
 *   - jane_algolia_app_id (required)
 *   - jane_algolia_search_key (required)
 *   - jane_algolia_index (required)
 *   - jane_stores: Array<{id, name?, algoliaStoreId, baseUrl}> (required, >=1 entry)
 *   - jane_default_store_id: string (optional, defaults to first store's id)
 *   - jane_known_brands: string[] (optional)
 */
export function buildJaneConfigFromContainerConfig(
  cfg: Record<string, unknown>,
): JaneConfig | null {
  const appId = cfg.jane_algolia_app_id as string | undefined;
  const searchKey = cfg.jane_algolia_search_key as string | undefined;
  const index = cfg.jane_algolia_index as string | undefined;
  const rawStores = cfg.jane_stores as
    | Array<{ id: string; name?: string; algoliaStoreId?: number; baseUrl?: string }>
    | undefined;

  if (!appId || !searchKey || !index || !Array.isArray(rawStores) || rawStores.length === 0) {
    return null;
  }

  const stores: Record<string, JaneStore> = {};
  for (const s of rawStores) {
    if (!s?.id || typeof s.algoliaStoreId !== 'number' || !s.baseUrl) continue;
    stores[s.id] = { algoliaStoreId: s.algoliaStoreId, baseUrl: s.baseUrl };
  }
  if (Object.keys(stores).length === 0) return null;

  const defaultStore =
    (cfg.jane_default_store_id as string | undefined) && stores[cfg.jane_default_store_id as string]
      ? (cfg.jane_default_store_id as string)
      : Object.keys(stores)[0];

  const knownBrands = Array.isArray(cfg.jane_known_brands)
    ? (cfg.jane_known_brands as unknown[]).filter((b): b is string => typeof b === 'string')
    : undefined;

  return {
    algoliaAppId: appId,
    algoliaSearchKey: searchKey,
    algoliaIndex: index,
    stores,
    defaultStore,
    knownBrands,
  };
}
