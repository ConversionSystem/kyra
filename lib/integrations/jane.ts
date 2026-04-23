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
  /**
   * Optional add-to-cart deeplink param name (e.g., "add"). If the dispensary's
   * Roots app has a handler that consumes it (recognising `?add=<productId>` on
   * the PDP and auto-adding to cart on mount), set this and cardUrl will include it.
   * If unset or the Roots app doesn't consume it, cartUrl === url and the button
   * just opens the PDP (safe, works everywhere).
   *
   * Default: unset. Jane's standard React Roots build does NOT support this natively
   * — it requires the dispensary's engineering team to wire it up.
   */
  cartDeeplinkParam?: string;
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
  /** Jane add-to-cart deeplink — opens PDP with cart intent. Falls back to `url` if not supported. */
  cartUrl?: string;
  weight?: string;
  imageUrl?: string;
  /** Algolia aggregate_rating (0-5), used for tie-break ranking. */
  rating?: number;
  reviewCount?: number;
  /** Short, LLM-friendly reason this product surfaced — populated post-search. */
  reason?: string;
}

export interface ProductSearchParams {
  storeId?: string;
  category?: string;
  brand?: string;
  query?: string;
  sortBy?: 'thc_desc' | 'thc_asc' | 'price_asc' | 'price_desc' | 'relevance';
  effects?: string[];
  limit?: number;
  /** Only return products flagged available_for_delivery OR available_for_pickup. Default: true. */
  inStockOnly?: boolean;
  /** Session-preference boosts (lineage, brand) — used for re-ranking when multiple results match. */
  preferLineages?: string[];
  preferBrands?: string[];
  /** Price ceiling (dollars). If set, filters Algolia via `bucket_price <= maxPrice`. */
  maxPrice?: number;
  /** Price floor (dollars). If set, filters Algolia via `bucket_price >= minPrice`. */
  minPrice?: number;
  /**
   * Use Algolia facet filter for brand (`brand:"X"`) instead of text query.
   * Default behaviour (undefined/true): exact match. Set to `false` for the
   * legacy fuzzy text-query path (useful if the user typed an abbreviation
   * like "CBX" and we want Algolia to match "CBX Cannabiotix" via relevance).
   */
  useBrandFacet?: boolean;
}

/**
 * Which filter dropped during the retry cascade. Consumers (widget route + LLM)
 * use this to explain what we gave up on ("we didn't have Alien Labs pre-rolls,
 * but here are Jeeter pre-rolls").
 */
export interface RelaxedFilter {
  field: 'brand' | 'category' | 'effects';
  value: string;
}

export interface ProductSearchResult {
  products: JaneProduct[];
  totalFound: number;
  storeId: string;
  source: 'algolia' | 'firecrawl' | 'cache';
  /** Full brand name from Algolia (e.g., "CBX Cannabiotix" even when user searched "CBX") */
  resolvedBrand?: string;
  /**
   * 0 = exact match. 1+ = degraded match (a filter was dropped to find results).
   * The route surfaces this to the LLM so it apologises for the miss + suggests alternatives.
   */
  fallbackTier: number;
  /** Filters that were dropped across retry tiers (human-readable, in order of importance). */
  relaxedFilters: RelaxedFilter[];
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
  sleep: [
    'sleep', 'sleepy', 'nighttime', 'insomnia', 'knock out', 'sedating', 'bed',
    'bedtime', 'pass out', 'wind down', 'tired', 'drowsy', 'couch lock',
  ],
  relax: [
    'relax', 'calm', 'chill', 'unwind', 'stress', 'anxiety', 'cool', 'mellow',
    'decompress', 'destress', 'de-stress', 'zen', 'ease', 'take the edge off',
    'mellow out', 'after work', 'after-work', 'sunday', 'lazy day',
  ],
  energy: [
    'energy', 'energiz', 'uplift', 'creative', 'focus', 'daytime', 'morning',
    'wake', 'wake and bake', 'get going', 'motivat', 'productiv', 'hike',
    'workout', 'run', 'gym', 'active', 'social', 'party', 'date night',
    'get stuff done', 'creative spark', 'brainstorm', 'inspir',
  ],
  pain: [
    'pain', 'relief', 'ache', 'inflammation', 'sore', 'headache', 'migraine',
    'cramp', 'back pain', 'joint', 'arthritis', 'muscle', 'hurt', 'chronic',
  ],
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
 * Search products via Algolia (fast, ~4ms) with a retry cascade on zero-result queries.
 *
 * Retry tiers (each progressively drops a filter):
 *   Tier 0: exact — everything the user asked for
 *   Tier 1: drop effects (broadest: still brand+category)
 *   Tier 2: drop category (same brand, any category)
 *   Tier 3: drop brand (same category, any brand)
 *
 * The returned `fallbackTier` tells the caller how much we gave up; `relaxedFilters`
 * lists what we dropped. The LLM uses both to apologise honestly and suggest alternatives
 * ("no Alien Labs pre-rolls in stock — here are Alien Labs flowers instead").
 *
 * Firecrawl is a final fallback ONLY if Algolia errors (not if it returns 0 hits).
 */
export async function searchProducts(
  config: JaneConfig,
  params: ProductSearchParams,
  firecrawlApiKey?: string,
): Promise<ProductSearchResult> {
  const storeId = params.storeId || config.defaultStore;

  // Retry cascade — fire in order, stop on first non-empty result
  type Attempt = { params: ProductSearchParams; dropped: RelaxedFilter[] };
  const attempts: Attempt[] = [{ params, dropped: [] }];

  // Tier 1: drop effects (if any were applied)
  if (params.effects?.length) {
    const { effects: _ignore, ...rest } = params;
    void _ignore;
    attempts.push({
      params: rest,
      dropped: [{ field: 'effects', value: params.effects.join(',') }],
    });
  }

  // Tier 2: drop category (if set)
  if (params.category) {
    const { category: _cat, ...rest } = params;
    void _cat;
    attempts.push({
      params: rest,
      dropped: [{ field: 'category', value: params.category }],
    });
  }

  // Tier 3: drop brand. Covers two cases:
  //   (a) brand+category query that failed tier 2 → drop both here (broader net)
  //   (b) brand-only query with no category → drop brand alone to return any in-stock product
  // Without (b), brand-only queries that return 0 hits hit an empty response with no alternatives.
  if (params.brand) {
    const { brand: _brand, category: _cat, ...rest } = params;
    void _brand; void _cat;
    const dropped: RelaxedFilter[] = [{ field: 'brand', value: params.brand }];
    if (params.category) dropped.unshift({ field: 'category', value: params.category });
    attempts.push({ params: rest, dropped });
  }

  let lastError: unknown = null;
  for (let tier = 0; tier < attempts.length; tier++) {
    const attempt = attempts[tier];
    try {
      const tTier = Date.now();
      const result = await searchViaAlgolia(config, attempt.params, storeId);
      // DIAGNOSTIC: log every tier's shape so production regressions surface
      console.log(
        `[jane] tier=${tier} ${Date.now() - tTier}ms store=${storeId} ` +
        `params=${JSON.stringify({ brand: attempt.params.brand, category: attempt.params.category, effects: attempt.params.effects, query: attempt.params.query, maxPrice: attempt.params.maxPrice })} ` +
        `→ nbHits=${result.totalFound} products=${result.products.length} source=${result.source}`,
      );
      if (result.products.length > 0) {
        // Apply session-preference re-ranking (boost products matching preferLineages/preferBrands)
        const ranked = applySessionPreferenceBoost(result.products, params);
        return {
          ...result,
          products: ranked,
          fallbackTier: tier,
          relaxedFilters: attempt.dropped,
        };
      }
    } catch (err) {
      lastError = err;
      console.error(`[jane] Algolia tier ${tier} failed:`, err);
    }
  }

  // Algolia error path only — try Firecrawl with the exact original query
  if (lastError && firecrawlApiKey) {
    try {
      const fc = await searchViaFirecrawl(config, params, firecrawlApiKey, storeId);
      return { ...fc, fallbackTier: 0, relaxedFilters: [] };
    } catch (err) {
      console.error('[jane] Firecrawl fallback also failed:', err);
    }
  }

  return {
    products: [],
    totalFound: 0,
    storeId,
    source: 'cache',
    fallbackTier: attempts.length, // "exhausted" — everything was dropped and still nothing
    relaxedFilters: [],
  };
}

/**
 * Re-rank products within the returned set by session preference signals.
 * Does NOT filter out — only reorders so prior-preferred lineages/brands rise
 * to the top. Keeps variety.
 */
function applySessionPreferenceBoost(
  products: JaneProduct[],
  params: ProductSearchParams,
): JaneProduct[] {
  const preferLineages = params.preferLineages?.map((l) => l.toLowerCase()) || [];
  const preferBrands = params.preferBrands?.map((b) => b.toLowerCase()) || [];
  if (preferLineages.length === 0 && preferBrands.length === 0) return products;

  const score = (p: JaneProduct): number => {
    let s = 0;
    if (p.strainType && preferLineages.includes(p.strainType.toLowerCase())) s += 10;
    if (p.brand && preferBrands.some((b) => p.brand!.toLowerCase().includes(b))) s += 5;
    s += (p.rating || 0); // tie-break: small nudge by rating
    return s;
  };

  // Stable sort: higher score first, keep original order otherwise
  return [...products]
    .map((p, i) => ({ p, s: score(p), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.p);
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
  // - Brand uses the `brand` facet filter for EXACT matching. Empirically, using
  //   brand as a text query returns false positives (e.g. querying "Alien Labs"
  //   also returned a "Lyfe Sauce" product because the words matched elsewhere).
  //   Facet filter `brand:"Alien Labs"` returns only real Alien Labs products.
  // - Product type uses root_types (Jane's canonical categories)
  // - Lineage uses category field (indica/sativa/hybrid/cbd)
  const filters: string[] = [`store_id:${store.algoliaStoreId}`];

  // Brand as facet filter — only if the caller wants EXACT brand matching.
  // `useBrandFacet` defaults to true for brand queries (see searchProducts / getBrandCatalog).
  // When false, brand goes into the text query instead (legacy fuzzy path).
  if (params.brand && params.useBrandFacet !== false) {
    // Escape quotes defensively — real brand names like "Papa & Barkley" are fine.
    const safe = String(params.brand).replace(/"/g, '\\"');
    filters.push(`brand:"${safe}"`);
  }

  // In-stock filter — default ON. Don't surface products the customer can't buy.
  // Algolia supports `field:true` for booleans.
  if (params.inStockOnly !== false) {
    filters.push('(available_for_delivery:true OR available_for_pickup:true)');
  }

  if (params.category) {
    const rootType = CATEGORY_TO_ROOT_TYPE[params.category.toLowerCase()];
    if (rootType) filters.push(`root_types:${rootType}`);
  }
  // Price range filter — "under $40" → bucket_price <= 40
  if (typeof params.maxPrice === 'number' && params.maxPrice > 0) {
    filters.push(`bucket_price <= ${params.maxPrice}`);
  }
  if (typeof params.minPrice === 'number' && params.minPrice > 0) {
    filters.push(`bucket_price >= ${params.minPrice}`);
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

  // Build query — three cases:
  //   (a) brand facet ON → query = '' (facet does the filter, no text match needed)
  //   (b) brand facet OFF + brand set → fuzzy text match on brand name
  //   (c) no brand → strip filler + emoji + price words from user message
  let query: string;
  if (params.brand && params.useBrandFacet !== false) {
    query = '';
  } else if (params.brand) {
    query = params.brand;
  } else {
    query = params.query || '';
    if (params.category) query = query.replace(new RegExp(params.category, 'gi'), '').trim();
    // Strip common filler words that hurt Algolia relevance
    query = query
      .replace(
        /\b(what|which|do you have|any|are|in stock|available|show me|find|best|recommend|looking for|i want|i need|get me|under|below|less than|over|above|more than|please|thanks?|pls)\b/gi,
        '',
      )
      // Strip dollar amounts ("under $40", "below $25") that aren't product names
      .replace(/\$\s*\d+(?:\.\d+)?/g, '')
      .trim();
    // When effects were captured as filters, strip the effect keywords from
    // the text query so Algolia doesn't additionally require "pain"/"relief"/
    // "sleep" to appear in product names. The lineage filter already encodes
    // the intent. ("pain relief please" → query='' → filter-only search.)
    if (params.effects?.length) {
      for (const effect of params.effects) {
        const keywords = EFFECT_KEYWORDS[effect] || [];
        for (const kw of keywords) {
          const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
          query = query.replace(re, '');
        }
      }
      query = query.replace(/\s+/g, ' ').trim();
    }
  }

  // Sanitize the query for Algolia: strip emojis + pictographic symbols that
  // Jane's index has no tokens for (quick-reply buttons prefix queries with
  // emoji like "😴 Products for sleep" which otherwise matches 0 hits).
  // Keep letters, digits, spaces, and basic punctuation only.
  query = query
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If after stripping all filler/emoji/price the query is just noise words
  // ("anything", "something", "products", "cheap"…) — blank it out so Algolia
  // returns matches ranked by filters + sort instead of forcing a bad text match.
  // Filters (store_id, category, price, lineage) do the real work here.
  if (/^(?:anything|something|products?|stuff|weed|cannabis|cheap|cheapest|good|great|best|nice|popular|things?)(?:\s+(?:anything|something|products?|stuff|weed|cannabis|cheap|cheapest|good|great|best|nice|popular|things?))*$/i.test(query)) {
    query = '';
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
      // Explicit typo tolerance — forgive "predoll", "preroll", "gummys", etc.
      typoTolerance: true,
      minWordSizefor1Typo: 4,
      minWordSizefor2Typos: 7,
      ignorePlurals: true,
      removeStopWords: true,
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
  // DIAGNOSTIC: log raw Algolia response shape when production returns 0 hits
  // even though the same request works from other clients — helps surface
  // silent data shape issues (empty hits array, wrong index, etc).
  if (totalFound === 0) {
    // Log the FULL raw response data (truncated to avoid log bloat) so we can
    // see params Algolia echoed back + any warning fields it returned.
    const rawPreview = JSON.stringify(data).slice(0, 600);
    console.warn(
      `[jane] Algolia 0 hits — filters=${filters.join(' AND ')} query=${JSON.stringify(query)} ` +
      `index=${config.algoliaIndex} app=${config.algoliaAppId} ` +
      `raw=${rawPreview}`,
    );
  }

  // Convert Algolia hits → JaneProduct[]
  const products: JaneProduct[] = hits.map((hit) =>
    algoliaHitToProduct(hit, baseUrl, config.cartDeeplinkParam),
  );

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
    fallbackTier: 0,
    relaxedFilters: [],
  };
}

function algoliaHitToProduct(
  hit: AlgoliaHit,
  baseUrl: string,
  cartDeeplinkParam?: string,
): JaneProduct {
  // Lineage comes from the "category" field (indica/sativa/hybrid/cbd)
  const strainType = hit.category || undefined;

  // Build product URL — Jane PDP with preselected weight
  const slug = hit.url_slug || hit.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const weight = hit.available_weights?.[0] || 'each';
  const url = `${baseUrl}/product/${hit.product_id}/${slug}?weight=${weight}`;

  // Add-to-cart deeplink — ONLY populated if the dispensary has wired up a handler
  // that consumes the query param. Jane's standard Roots build ignores these params,
  // so without the config flag we leave cartUrl undefined and the widget falls back
  // to the standard "View →" CTA on the PDP. Ships when Matt's eng team is ready.
  const cartUrl = cartDeeplinkParam
    ? `${url}&${cartDeeplinkParam}=${hit.product_id}`
    : undefined;

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
    cartUrl,
    weight: hit.available_weights?.[0] || undefined,
    imageUrl: hit.image_urls?.[0] || undefined,
    rating: hit.aggregate_rating ?? undefined,
    reviewCount: hit.review_count ?? undefined,
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
    return { products: [], totalFound: 0, storeId, source: 'cache', fallbackTier: 0, relaxedFilters: [] };
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
    fallbackTier: 0,
    relaxedFilters: [],
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

  // Split by numbered list items (1. 2. ... 01. 02. etc.)
  const productBlocks = markdown.split(/\n\d+\.\s/);

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

  const productLine = (p: JaneProduct, i: number, includeEffects: boolean): string => {
    const details = [
      p.strainType && p.strainType.charAt(0).toUpperCase() + p.strainType.slice(1),
      p.thc && `THC: ${p.thc}`,
      p.brand && `by ${p.brand}`,
      p.price && `${p.price}`,
      p.weight && `(${p.weight})`,
    ].filter(Boolean).join(' · ');
    const effectsLine = includeEffects && p.effects?.length
      ? `\n   Effects: ${p.effects.slice(0, 4).join(', ')}`
      : '';
    const imageLine = p.imageUrl ? `\n   Image: ${p.imageUrl}` : '';
    return `${i + 1}. **${p.name}**\n   ${details}${effectsLine}${imageLine}\n   ${p.url}`;
  };

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
      const formatted = items
        .slice(0, 5)
        .map((p, i) => productLine(p, i, false))
        .join('\n\n');
      sections.push(`### ${catLabel}\n${formatted}`);
    }
    return sections.join('\n\n');
  }

  return products.map((p, i) => productLine(p, i, true)).join('\n\n');
}

/**
 * Human-friendly description of what had to be relaxed for the LLM.
 * Example: "We dropped the pre-roll category — no Alien Labs pre-rolls in stock right now."
 */
export function describeFallback(
  tier: number,
  relaxed: RelaxedFilter[],
  originalBrand?: string,
  originalCategory?: string,
): string | null {
  if (tier === 0 || relaxed.length === 0) return null;
  const droppedFields = relaxed.map((r) => r.field);
  if (droppedFields.includes('brand') && droppedFields.includes('category')) {
    return `No "${originalBrand} ${originalCategory}" products in stock. Showing the closest alternatives — acknowledge the miss and offer the best substitute.`;
  }
  if (droppedFields.includes('category') && originalBrand && originalCategory) {
    return `No ${originalBrand} ${originalCategory} in stock. Showing other ${originalBrand} products — suggest these, or a different brand of ${originalCategory}.`;
  }
  if (droppedFields.includes('brand') && originalBrand && originalCategory) {
    return `No ${originalBrand} in stock. Showing ${originalCategory} from other brands — call out this substitution explicitly.`;
  }
  if (droppedFields.includes('effects')) {
    return `No products matched the effect filter. Showing best match on the other terms — note that the strain type may vary.`;
  }
  return `We relaxed one of the filters (${relaxed.map((r) => r.field).join(', ')}) to find results. Acknowledge the exact miss.`;
}

// ── Intent Parsing ──────────────────────────────────────────────────────────

export function parseProductIntent(
  message: string,
  knownBrands: string[] = [],
): ProductSearchParams {
  // Strip emoji prefix (quick-reply buttons: "😴 Products for sleep" → "Products for sleep")
  // before downstream regexes run — keeps them simple and avoids Algolia false-0s.
  const cleaned = message
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const lower = cleaned.toLowerCase();
  const params: ProductSearchParams = { query: cleaned };

  // Price ceiling — "under $40", "below 25", "less than $100", "cheap" → maxPrice
  const priceMax = lower.match(/(?:under|below|less than|max|no more than|up to)\s*\$?\s*(\d{1,4})/);
  if (priceMax) params.maxPrice = parseInt(priceMax[1], 10);
  const priceMin = lower.match(/(?:over|above|more than|at least|minimum|min)\s*\$?\s*(\d{1,4})/);
  if (priceMin) params.minPrice = parseInt(priceMin[1], 10);

  // Approximate price — "around $30", "about 20 bucks", "~$25" → ±25% range
  if (!params.maxPrice && !params.minPrice) {
    const approx = lower.match(/(?:around|about|approximately|~)\s*\$?\s*(\d{1,4})/);
    if (approx) {
      const target = parseInt(approx[1], 10);
      params.minPrice = Math.max(1, Math.round(target * 0.75));
      params.maxPrice = Math.round(target * 1.25);
    }
  }

  // Brand detection — word-boundary match, preferring the LONGEST brand.
  //
  // We can't use a naive `lower.includes(needle)` substring check: cannabis
  // brand lists include 3-letter names like "LAX", "PAX", "CAM", "RAW" that
  // appear as substrings of ordinary English words ("relax" contains "lax",
  // "capacity" contains "pax", "scam" contains "cam"…). A substring match
  // on "relax" → brand=LAX → Algolia facet filter on the wrong brand →
  // zero results. Every effect/category query on Purple Lotus was silently
  // returning 0 because "relax" triggered this false positive.
  //
  // The fix: require the match to be at a word boundary — the characters
  // just before and just after the needle must be non-alphanumeric (or
  // the needle must sit at the start/end of the string). "Relax" no longer
  // matches LAX; "show me LAX" still does.
  {
    let bestLen = 0;
    const isAlnum = (c: string | undefined) => !!c && /[a-z0-9]/.test(c);
    for (const brand of knownBrands) {
      if (!brand) continue;
      const needle = brand.toLowerCase();
      if (needle.length <= bestLen) continue;
      const idx = lower.indexOf(needle);
      if (idx === -1) continue;
      const boundsLeft  = idx === 0 || !isAlnum(lower[idx - 1]);
      const boundsRight = idx + needle.length === lower.length
        || !isAlnum(lower[idx + needle.length]);
      if (boundsLeft && boundsRight) {
        params.brand = brand;
        bestLen = needle.length;
      }
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
  const lower = message
    .toLowerCase()
    // Strip ALL pictographic/emoji chars — wider net than the previous range-only approach
    // (which missed 1F634 😴 "sleepy face" and other 1F6xx quick-reply button glyphs).
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .trim();

  // Brand name match is always a product query
  if (knownBrands.some((b) => lower.includes(b.toLowerCase()))) return true;

  const productSignals = [
    /recommend/i, /suggest/i, /best.*(?:for|product|strain)/i,
    /highest.*thc/i, /strongest/i, /what.*(?:edible|flower|vape|preroll|pre.?roll|gumm)/i,
    /looking for/i, /help me find/i, /any.*good/i,
    /indica|sativa|hybrid/i, /\bthc\b|\bcbd\b/i,
    /\bmenu\b|product|inventory|stock|available/i,
    /preroll|pre-roll|pre roll|predoll|pre doll|edible|gumm|vape|cart|flower|concentrate|tincture|topical|extract|dab|wax/i,
    // Effect phrases like "pain relief please" / "sleep aid" — match when the
    // message CONTAINS one of our canonical effect phrases (not anchored to
    // full-string match which was the earlier gap).
    /\b(?:pain\s*relief|sleep\s*aid|relaxation|uplifting|couch\s*lock|body\s*high|head\s*high|munchies)\b/i,
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
    // Natural-language price-gated queries ("something relaxing under $40", "anything cheap", "best deal under 25", "around $30")
    /(?:under|below|less than|up to|max|no more than|around|about|approximately|~)\s*\$?\s*\d+/i,
    /\bcheap(?:est)?\b|\bbudget\b|\baffordable\b|\bgood deal\b/i,
    // "something for X" / "something relaxing" / "need something"
    /\b(?:something|anything)\s+(?:for|to|that|under|around)/i,
    /\b(?:need|want|get|pick|find)\s+(?:something|anything)\b/i,
    // Plain "products" alone (quick-reply button suffix)
    /^\s*products?\b/i,
  ];
  return productSignals.some((r) => r.test(lower));
}

// ── Dynamic Brand List (from Algolia facets) ────────────────────────────────
//
// The knownBrands list on container_config is optional + often stale — Purple
// Lotus carries 144 brands but only 41 were hardcoded. To guarantee brand
// detection works for every brand the store actually stocks, we pull the live
// brand facet from Algolia on first widget-chat invocation and cache it for
// an hour per (appId+index+storeId). Keeps the hot path fast while
// automatically picking up new brands as the dispensary adds them.

interface BrandCacheEntry {
  brands: string[];
  expiresAt: number;
}
const BRAND_CACHE = new Map<string, BrandCacheEntry>();
const BRAND_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchBrandFacet(
  config: JaneConfig,
  storeId?: string,
): Promise<string[]> {
  const store =
    config.stores[storeId || config.defaultStore] ||
    config.stores[config.defaultStore];
  if (!store) return [];
  const cacheKey = `${config.algoliaAppId}:${config.algoliaIndex}:${store.algoliaStoreId}`;
  const hit = BRAND_CACHE.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.brands;

  try {
    const res = await fetch(
      `https://${config.algoliaAppId}-dsn.algolia.net/1/indexes/${config.algoliaIndex}/query`,
      {
        method: 'POST',
        headers: {
          'X-Algolia-Application-Id': config.algoliaAppId,
          'X-Algolia-API-Key': config.algoliaSearchKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: '',
          filters: `store_id:${store.algoliaStoreId} AND (available_for_delivery:true OR available_for_pickup:true)`,
          hitsPerPage: 0,
          facets: ['brand'],
          maxValuesPerFacet: 500,
        }),
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const brandMap = (data.facets?.brand || {}) as Record<string, number>;
    const brands = Object.keys(brandMap).filter(Boolean);
    BRAND_CACHE.set(cacheKey, { brands, expiresAt: Date.now() + BRAND_CACHE_TTL_MS });
    return brands;
  } catch (err) {
    console.error('[jane] fetchBrandFacet failed:', err);
    return [];
  }
}

// ── Brand Catalog ───────────────────────────────────────────────────────────

/**
 * Fetch ALL products for a specific brand across every category. Used when a
 * customer asks open-ended brand questions like "What Alien Labs strains do
 * you have?" or "Show me everything from Jeeter". Uses facet filter (exact
 * match) so results are precise — never contaminated by keyword overlap.
 *
 * Groups the results by Jane's canonical root_types so the widget can render
 * sections like "Pre-Rolls (3)" / "Flower (1)" / "Vapes (2)".
 */
export async function getBrandCatalog(
  config: JaneConfig,
  brand: string,
  opts: { storeId?: string; limit?: number } = {},
): Promise<{
  brand: string;
  resolvedBrand?: string;
  products: JaneProduct[];
  groups: Record<string, JaneProduct[]>;
  storeId: string;
}> {
  const result = await searchProducts(config, {
    brand,
    storeId: opts.storeId,
    limit: opts.limit ?? 50,
    useBrandFacet: true,
  });

  // Group by lineage (strainType: indica/sativa/hybrid/cbd) — "strains" in the
  // customer's mental model. Falls back to product-kind (category) if lineage
  // is missing, and 'other' as last resort.
  const groups: Record<string, JaneProduct[]> = {};
  for (const p of result.products) {
    const cat = (p.strainType || p.category || 'other').toLowerCase();
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  }

  return {
    brand,
    resolvedBrand: result.resolvedBrand,
    products: result.products,
    groups,
    storeId: result.storeId,
  };
}

// ── Support Links ───────────────────────────────────────────────────────────

export interface SupportLink {
  label: string;
  url: string;
  topic: string;
}

/**
 * Match a user message to the support-link topic they're asking about
 * (ordering, delivery, payment, hours, rewards, deals, etc.) and return
 * the corresponding URL from `container_config.support_links` or an
 * auto-generated fallback from `website_url`.
 *
 * This is how "how do I order?" reliably gets a link in the response —
 * we don't trust the LLM to generate URLs; the server provides them.
 */
export function resolveSupportLinks(
  message: string,
  cfg: { support_links?: Record<string, string>; website_url?: string },
): SupportLink[] {
  const lower = message.toLowerCase();
  const links = cfg.support_links || {};
  const website = cfg.website_url || '';
  const hits: SupportLink[] = [];

  // Topic → regex triggers + default label + URL path fallback
  const topics: Array<{ topic: string; triggers: RegExp[]; label: string; path: string }> = [
    { topic: 'ordering', triggers: [/how.*(?:order|buy|purchase|checkout)/i, /ordering/i, /how to (?:place|get)/i], label: 'How to Order', path: '/order' },
    { topic: 'delivery', triggers: [/deliver|delivery zone|service area|where.*deliver/i, /shipping|do you ship/i], label: 'Delivery Info', path: '/delivery' },
    { topic: 'pickup', triggers: [/pick.?up|curbside|in.?store/i], label: 'Pickup Info', path: '/pickup' },
    { topic: 'hours', triggers: [/hours|open|close|when.*open/i], label: 'Store Hours', path: '/hours' },
    { topic: 'location', triggers: [/where.*(?:locat|store|shop)|address|direction|how to find/i], label: 'Location', path: '/contact' },
    { topic: 'payment', triggers: [/pay(?:ment)?|credit card|debit|cash|accept|charge/i], label: 'Payment Options', path: '/payment' },
    { topic: 'rewards', triggers: [/reward|loyal(?:ty)?|points|member/i], label: 'Rewards Program', path: '/rewards' },
    { topic: 'deals', triggers: [/deal|promo|discount|special|sale|offer|coupon/i], label: "Today's Deals", path: '/deals' },
    { topic: 'menu', triggers: [/\bmenu\b|inventory|full catalog|shop all/i], label: 'Full Menu', path: '/shop/all' },
    { topic: 'returns', triggers: [/return|refund|exchange/i], label: 'Returns Policy', path: '/returns' },
    { topic: 'contact', triggers: [/contact|phone|call|reach/i], label: 'Contact Us', path: '/contact' },
    { topic: 'id_age', triggers: [/\bid\b|identification|age requirement|21\+/i], label: 'ID & Age Policy', path: '/id' },
  ];

  for (const t of topics) {
    if (!t.triggers.some((r) => r.test(lower))) continue;
    const explicit = links[t.topic] || links[t.label.toLowerCase()];
    const url = explicit || (website ? `${website.replace(/\/$/, '')}${t.path}` : '');
    if (url) hits.push({ topic: t.topic, label: t.label, url });
  }

  // De-dupe by URL so we don't send two chips that go to the same page
  const seen = new Set<string>();
  return hits.filter((h) => (seen.has(h.url) ? false : (seen.add(h.url), true)));
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

  const cartDeeplinkParam = typeof cfg.jane_cart_deeplink_param === 'string'
    && (cfg.jane_cart_deeplink_param as string).trim()
    ? (cfg.jane_cart_deeplink_param as string).trim()
    : undefined;

  return {
    algoliaAppId: appId,
    algoliaSearchKey: searchKey,
    algoliaIndex: index,
    stores,
    defaultStore,
    knownBrands,
    cartDeeplinkParam,
  };
}
