// ────────────────────────────────────────────────────────────────────────────
// jane-retry-cascade.test.ts
//
// Covers the Tier 1 fix: searchProducts retries with progressively-relaxed
// filters when Algolia returns zero hits. Also covers the Tier 3 session-
// preference boost and the in-stock / typo-tolerance filter flags.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  searchProducts,
  describeFallback,
  buildJaneConfigFromContainerConfig,
  isProductQuery,
  parseProductIntent,
  getBrandCatalog,
  resolveSupportLinks,
  buildBrowseMore,
  type JaneConfig,
} from '@/lib/integrations/jane';

const baseConfig: JaneConfig = {
  algoliaAppId: 'TEST',
  algoliaSearchKey: 'k',
  algoliaIndex: 'menu-products-production',
  defaultStore: 'sj',
  stores: { sj: { algoliaStoreId: 1, baseUrl: 'https://example.com' } },
  knownBrands: ['Alien Labs', 'Jeeter'],
};

// Helper: make a fetch mock that returns scripted responses per call
function mockFetchSequence(responses: Array<{ hits: unknown[]; nbHits?: number }>) {
  let i = 0;
  return vi.fn(async (_url: string, init?: RequestInit) => {
    // Inspect the Algolia request body so tests can assert on filter state
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const payload = responses[Math.min(i, responses.length - 1)];
    i++;
    return {
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({ hits: payload.hits, nbHits: payload.nbHits ?? payload.hits.length }),
      __body: body,
    } as unknown as Response;
  });
}

describe('searchProducts — retry cascade', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns tier 0 when exact match succeeds', async () => {
    vi.stubGlobal('fetch', mockFetchSequence([
      { hits: [{ product_id: 1, name: 'Banana Cream', brand: 'Alien Labs', category: 'indica', root_types: ['flower'] }] },
    ]));

    const result = await searchProducts(baseConfig, {
      brand: 'Alien Labs',
      category: 'flower',
    });
    expect(result.products).toHaveLength(1);
    expect(result.fallbackTier).toBe(0);
    expect(result.relaxedFilters).toEqual([]);
  });

  it('relaxes to tier 1 when effects drop is needed', async () => {
    vi.stubGlobal('fetch', mockFetchSequence([
      { hits: [] },                                     // tier 0 — empty
      { hits: [{ product_id: 2, name: 'Banana Cream', brand: 'Alien Labs' }] }, // tier 1 — drop effects
    ]));

    const result = await searchProducts(baseConfig, {
      brand: 'Alien Labs',
      category: 'flower',
      effects: ['sleep'],
    });
    expect(result.products).toHaveLength(1);
    expect(result.fallbackTier).toBe(1);
    expect(result.relaxedFilters[0].field).toBe('effects');
  });

  it('relaxes to tier 2 dropping category for the Alien Labs pre-rolls case', async () => {
    // Scenario from the user's screenshot: "any Alien Labs prerolls?"
    // Purple Lotus has no Alien Labs pre-rolls — so Algolia returns 0 at tier 0
    // and we drop category to find Alien Labs flower instead.
    vi.stubGlobal('fetch', mockFetchSequence([
      { hits: [] },                                     // tier 0 — empty (no Alien Labs pre-rolls)
      { hits: [{ product_id: 3, name: 'Banana Cream', brand: 'Alien Labs', root_types: ['flower'] }] }, // tier 2 — drop category
    ]));

    const result = await searchProducts(baseConfig, {
      brand: 'Alien Labs',
      category: 'pre-roll',
    });
    expect(result.products).toHaveLength(1);
    expect(result.fallbackTier).toBe(1); // tier numbering: 0=exact, 1=first relax (category here, since no effects)
    expect(result.relaxedFilters.map((f) => f.field)).toContain('category');
  });

  it('drops brand on brand-only query when nothing matches (Tier 3 expansion)', async () => {
    vi.stubGlobal('fetch', mockFetchSequence([
      { hits: [] }, // tier 0 — Alien Labs (no results)
      { hits: [{ product_id: 50, name: 'Gelato Cake', brand: 'Jeeter' }] }, // tier 1 — dropped brand, found Jeeter
    ]));

    const result = await searchProducts(baseConfig, { brand: 'Alien Labs' });
    expect(result.products).toHaveLength(1);
    expect(result.fallbackTier).toBe(1);
    expect(result.relaxedFilters.map((f) => f.field)).toContain('brand');
  });

  it('returns empty with exhausted tier when nothing matches at any level', async () => {
    vi.stubGlobal('fetch', mockFetchSequence([
      { hits: [] }, { hits: [] }, { hits: [] }, { hits: [] },
    ]));

    const result = await searchProducts(baseConfig, {
      brand: 'NotCarried',
      category: 'pre-roll',
      effects: ['sleep'],
    });
    expect(result.products).toHaveLength(0);
    expect(result.fallbackTier).toBeGreaterThan(0);
  });

  it('sends in-stock filter by default on Algolia request', async () => {
    const seen: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      seen.push(body.filters || '');
      return {
        ok: true, status: 200, text: async () => '',
        json: async () => ({ hits: [{ product_id: 9, name: 'X' }], nbHits: 1 }),
      } as unknown as Response;
    }));

    await searchProducts(baseConfig, { brand: 'Alien Labs' });
    expect(seen[0]).toMatch(/available_for_delivery:true OR available_for_pickup:true/);
  });

  it('enables typo tolerance + ignorePlurals in the Algolia request', async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body ? JSON.parse(String(init.body)) : {};
      return {
        ok: true, status: 200, text: async () => '',
        json: async () => ({ hits: [{ product_id: 10, name: 'X' }], nbHits: 1 }),
      } as unknown as Response;
    }));

    await searchProducts(baseConfig, { query: 'predolls' });
    expect(body.typoTolerance).toBe(true);
    expect(body.ignorePlurals).toBe(true);
  });

  it('boosts products matching session-preferred lineage', async () => {
    vi.stubGlobal('fetch', mockFetchSequence([{
      hits: [
        { product_id: 100, name: 'Sativa A', category: 'sativa' },
        { product_id: 101, name: 'Indica B', category: 'indica' },
        { product_id: 102, name: 'Hybrid C', category: 'hybrid' },
      ],
    }]));

    const result = await searchProducts(baseConfig, {
      query: 'something nice',
      preferLineages: ['indica'],
    });
    // Indica B should rise to the top despite being 2nd in the Algolia response
    expect(result.products[0].id).toBe('101');
  });
});

describe('describeFallback', () => {
  it('returns null for tier 0', () => {
    expect(describeFallback(0, [])).toBeNull();
  });
  it('explains brand+category miss with substitution', () => {
    const text = describeFallback(
      2,
      [{ field: 'category', value: 'pre-roll' }, { field: 'brand', value: 'Alien Labs' }],
      'Alien Labs',
      'pre-roll',
    );
    expect(text).toMatch(/Alien Labs/);
    expect(text).toMatch(/alternative/i);
  });
});

describe('parseProductIntent — round 2 natural-language fixes', () => {
  const brands = ['Alien Labs', 'Jeeter'];

  it('strips emoji prefix from the query field', () => {
    const intent = parseProductIntent('\u{1F634} Products for sleep', brands);
    expect(intent.query).toBe('Products for sleep');
    expect(intent.effects).toContain('sleep');
  });

  it('captures maxPrice from "under $40"', () => {
    const intent = parseProductIntent('something relaxing under $40', brands);
    expect(intent.maxPrice).toBe(40);
    expect(intent.effects).toContain('relax');
  });

  it('captures maxPrice from "below 25" (no dollar sign)', () => {
    const intent = parseProductIntent('anything below 25', brands);
    expect(intent.maxPrice).toBe(25);
  });

  it('captures minPrice from "over $80"', () => {
    const intent = parseProductIntent('gummies over $80', brands);
    expect(intent.minPrice).toBe(80);
  });

  it('creates price range from "around $30"', () => {
    const intent = parseProductIntent('edibles around $30', brands);
    expect(intent.minPrice).toBe(23); // 30 * 0.75 rounded
    expect(intent.maxPrice).toBe(38); // 30 * 1.25 rounded
  });

  it('creates price range from "about 20 bucks"', () => {
    const intent = parseProductIntent('about 20 bucks', brands);
    expect(intent.minPrice).toBe(15);
    expect(intent.maxPrice).toBe(25);
  });

  it('prefers explicit "under" over "around" (no double-parse)', () => {
    const intent = parseProductIntent('under $40', brands);
    expect(intent.maxPrice).toBe(40);
    expect(intent.minPrice).toBeUndefined();
  });

  // ── Category canonicalization regression (2026-04-30 production sweep) ──
  // "show me indica gummies" produced intent.category="gummie" (blind 's' strip)
  // which isn't a valid CATEGORY_TO_ROOT_TYPE key — downstream lookups silently
  // failed and the browse-more URL fell back to /shop/all. Now the parser stores
  // the canonical root_type directly.
  it('stores canonical root_type "edible" for "gummies"', () => {
    const intent = parseProductIntent('show me indica gummies', brands);
    expect(intent.category).toBe('edible');
  });

  it('stores canonical root_type "vape" for "cartridges"', () => {
    const intent = parseProductIntent('do you have cartridges', brands);
    expect(intent.category).toBe('vape');
  });

  it('stores canonical root_type "extract" for "concentrates"', () => {
    const intent = parseProductIntent('show me concentrates', brands);
    expect(intent.category).toBe('extract');
  });

  it('stores canonical root_type "pre-roll" for "prerolls" / "pre-rolls"', () => {
    expect(parseProductIntent('any prerolls?', brands).category).toBe('pre-roll');
    expect(parseProductIntent('any pre-rolls?', brands).category).toBe('pre-roll');
  });

  it('stores canonical root_type "edible" for "gummy" (singular form)', () => {
    const intent = parseProductIntent('any indica gummy', brands);
    expect(intent.category).toBe('edible');
  });

  it('stores canonical root_type "flower" for "flower" / "flowers" / "bud"', () => {
    expect(parseProductIntent('show me flower', brands).category).toBe('flower');
    expect(parseProductIntent('show me flowers', brands).category).toBe('flower');
    expect(parseProductIntent('any bud', brands).category).toBe('flower');
  });

  it('stores canonical root_type "edible" for "drinks" / "beverages" (drinks→edible per Jane taxonomy)', () => {
    expect(parseProductIntent('any drinks', brands).category).toBe('edible');
    expect(parseProductIntent('cannabis beverages', brands).category).toBe('edible');
  });

  // ── Lineage extraction (2026-04-30 sanity sweep) ─────────────────────────
  // "show me indica gummies" was producing /shop/edible (correct) but no
  // ?lineage=indica filter — buildBrowseMore needs preferLineages to add it.
  // Strain words mentioned directly should be captured as preferLineages.
  it('captures explicit lineage "indica" from "show me indica gummies"', () => {
    const intent = parseProductIntent('show me indica gummies', brands);
    expect(intent.preferLineages).toContain('indica');
    expect(intent.category).toBe('edible');
  });

  it('captures "sativa" as preferLineages', () => {
    const intent = parseProductIntent('I want sativa flower', brands);
    expect(intent.preferLineages).toContain('sativa');
    expect(intent.category).toBe('flower');
  });

  it('captures "hybrid" as preferLineages', () => {
    const intent = parseProductIntent('any hybrid prerolls?', brands);
    expect(intent.preferLineages).toContain('hybrid');
    expect(intent.category).toBe('pre-roll');
  });

  it('captures "cbd" as preferLineages', () => {
    const intent = parseProductIntent('looking for cbd tincture', brands);
    expect(intent.preferLineages).toContain('cbd');
  });

  it('does NOT match "indica" inside "indicate" (word boundary)', () => {
    const intent = parseProductIntent('please indicate the price', brands);
    expect(intent.preferLineages).toBeUndefined();
  });

  // ── Sort detection: "high thc" should also work, not just "highest thc" ──
  it('sort detection — "high thc" sets sortBy=thc_desc', () => {
    const intent = parseProductIntent('i want the high thc product for vapes', brands);
    expect(intent.sortBy).toBe('thc_desc');
  });

  it('sort detection — "highest thc" still works (back-compat)', () => {
    const intent = parseProductIntent('show me the highest thc strain', brands);
    expect(intent.sortBy).toBe('thc_desc');
  });
});

describe('isProductQuery — round 2 pattern expansion', () => {
  it('matches "something relaxing under $40"', () => {
    expect(isProductQuery('something relaxing under $40', [])).toBe(true);
  });
  it('matches "anything cheap"', () => {
    expect(isProductQuery('anything cheap', [])).toBe(true);
  });
  it('matches "I want something for sleep"', () => {
    expect(isProductQuery('I want something for sleep', [])).toBe(true);
  });
  it('matches emoji-prefixed quick-reply "\u{1F634} Products for sleep"', () => {
    expect(isProductQuery('\u{1F634} Products for sleep', [])).toBe(true);
  });
  it('matches bare "Products"', () => {
    expect(isProductQuery('Products', [])).toBe(true);
  });
  it('matches "pain relief please" (contains-effect-phrase)', () => {
    expect(isProductQuery('pain relief please', [])).toBe(true);
  });
  it('matches "predolls" (common typo of pre-rolls)', () => {
    expect(isProductQuery('predolls', [])).toBe(true);
  });
  it('matches "sleep aid" / "couch lock" / "munchies"', () => {
    expect(isProductQuery('sleep aid', [])).toBe(true);
    expect(isProductQuery('got any couch lock', [])).toBe(true);
    expect(isProductQuery('something for munchies', [])).toBe(true);
  });
  it('matches approximate price "around $30"', () => {
    expect(isProductQuery('edibles around $30', [])).toBe(true);
  });
  it('does NOT match noise messages', () => {
    expect(isProductQuery('ok', [])).toBe(false);
    expect(isProductQuery('thanks', [])).toBe(false);
    expect(isProductQuery('lol', [])).toBe(false);
    expect(isProductQuery('hi', [])).toBe(false);
    expect(isProductQuery('sounds good', [])).toBe(false);
    expect(isProductQuery('got it', [])).toBe(false);
  });

  // ── 2026-04-30 production sweep regression ─────────────────────────────
  // "I need help with sleep" was misclassified as NOT a product query, so
  // the search block was skipped and the LLM hallucinated product names
  // ("Granddaddy Purple") from training data without inventory backing.
  it('matches "I need help with sleep" (help-with-effect)', () => {
    expect(isProductQuery('I need help with sleep', [])).toBe(true);
  });

  it('matches the help-with-effect phrasing variants', () => {
    expect(isProductQuery('help me with stress', [])).toBe(true);
    expect(isProductQuery('help with anxiety', [])).toBe(true);
    expect(isProductQuery('help me sleep', [])).toBe(true);
    expect(isProductQuery('help me relax', [])).toBe(true);
    expect(isProductQuery('help for pain', [])).toBe(true);
  });

  it('matches "looking for sleep" and "for relaxation"', () => {
    expect(isProductQuery('looking for sleep', [])).toBe(true);
    expect(isProductQuery('I need something for relaxation', [])).toBe(true);
    expect(isProductQuery('any options for anxiety', [])).toBe(true);
  });

  it('does NOT overmatch "help" alone or unrelated "for X" phrases', () => {
    expect(isProductQuery('help', [])).toBe(false);
    expect(isProductQuery('for the win', [])).toBe(false);
    expect(isProductQuery('help me out', [])).toBe(false);
  });
});

describe('searchProducts — round 2 Algolia payload', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  const baseConfig: JaneConfig = {
    algoliaAppId: 'T', algoliaSearchKey: 'k', algoliaIndex: 'i',
    defaultStore: 'sj',
    stores: { sj: { algoliaStoreId: 1, baseUrl: 'https://x.com' } },
  };

  it('sends bucket_price <= maxPrice filter', async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body ? JSON.parse(String(init.body)) : {};
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ hits: [{ product_id: 1, name: 'X' }], nbHits: 1 }) } as unknown as Response;
    }));
    await searchProducts(baseConfig, { query: 'x', maxPrice: 40 });
    expect(body.filters).toMatch(/bucket_price <= 40/);
  });

  it('strips emoji and filler words from query text before sending to Algolia', async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body ? JSON.parse(String(init.body)) : {};
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ hits: [{ product_id: 1, name: 'X' }], nbHits: 1 }) } as unknown as Response;
    }));
    await searchProducts(baseConfig, { query: '\u{1F634} Products for sleep' });
    // No emoji should reach Algolia.
    expect(body.query).not.toMatch(/\p{Emoji_Presentation}/u);
    // Filler word "Products" (added in 2026-04-30 sweep fix) is now stripped —
    // it adds noise without intent value. The substantive token "sleep" survives.
    expect(body.query).toMatch(/sleep/);
  });

  it('blanks out noise-only queries ("anything cheap") so filters do the work', async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body ? JSON.parse(String(init.body)) : {};
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ hits: [{ product_id: 1, name: 'X' }], nbHits: 1 }) } as unknown as Response;
    }));
    await searchProducts(baseConfig, { query: 'anything cheap', sortBy: 'price_asc' });
    expect(body.query).toBe('');
  });

  // ── 2026-04-30 production sweep regression: noisy chatbot utterance ─────
  // "i want the high thc product - what do you reccomend for vapes?" returned
  // 0 hits because the conversational filler killed Algolia relevance.
  it('strips conversational filler ("i want the high thc product reccomend for vapes")', async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body ? JSON.parse(String(init.body)) : {};
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ hits: [{ product_id: 1, name: 'X' }], nbHits: 1 }) } as unknown as Response;
    }));
    await searchProducts(baseConfig, {
      query: 'i want the high thc product - what do you reccomend for vapes?',
      category: 'vape',
    });
    const q = String(body.query || '');
    // None of these conversational fillers should survive in the query.
    for (const filler of ['i want', 'what do you', 'reccomend', 'recommend', 'product']) {
      expect(q.toLowerCase()).not.toContain(filler);
    }
    // Substantive intent tokens survive.
    expect(q.toLowerCase()).toContain('high');
    expect(q.toLowerCase()).toContain('thc');
    // Category strip uses word boundary — no leftover "s" from "vapes".
    expect(q).not.toMatch(/\bs\b/);
  });

  it('strips multi-word category with word boundary ("vapes" → no leftover "s")', async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body ? JSON.parse(String(init.body)) : {};
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ hits: [{ product_id: 1, name: 'X' }], nbHits: 1 }) } as unknown as Response;
    }));
    await searchProducts(baseConfig, { query: 'show me vapes please', category: 'vape' });
    expect(body.query).not.toContain('s');  // no orphan from "vapes"
  });

  it('passes removeWordsIfNoResults=allOptional so Algolia gracefully degrades on noisy queries', async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body ? JSON.parse(String(init.body)) : {};
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ hits: [{ product_id: 1, name: 'X' }], nbHits: 1 }) } as unknown as Response;
    }));
    await searchProducts(baseConfig, { query: 'whatever', category: 'flower' });
    expect(body.removeWordsIfNoResults).toBe('allOptional');
  });
});

describe('searchProducts — Tier 4 query-drop fallback (regression 2026-04-30)', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  const baseConfig: JaneConfig = {
    algoliaAppId: 'T', algoliaSearchKey: 'k', algoliaIndex: 'i',
    defaultStore: 'sj',
    stores: { sj: { algoliaStoreId: 1, baseUrl: 'https://x.com' } },
  };

  it('drops the text query at the final tier when category-bound query yields 0 across normal tiers', async () => {
    const queriesSeen: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      queriesSeen.push(String(body.query));
      // Tier 0 (with category): 0 hits.
      // Tier 2 (drop category): 0 hits.
      // Tier 4 (drop query, keep category): hits!
      const hasCategory = String(body.filters || '').includes('root_types:vape');
      const isQueryEmpty = !body.query;
      if (hasCategory && isQueryEmpty) {
        return { ok: true, status: 200, text: async () => '',
          json: async () => ({ hits: [{ product_id: 1, name: 'Vape A' }], nbHits: 1 }) } as unknown as Response;
      }
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ hits: [], nbHits: 0 }) } as unknown as Response;
    }));

    const result = await searchProducts(baseConfig, {
      query: 'i want the high thc product - what do you reccomend for vapes?',
      category: 'vape',
    });
    expect(result.products.length).toBeGreaterThan(0);
    expect(result.relaxedFilters.some((rf) => rf.field === 'query')).toBe(true);
  });

  it('does NOT add the query-drop tier when no structured intent exists (pure text search)', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls++;
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ hits: [], nbHits: 0 }) } as unknown as Response;
    }));
    await searchProducts(baseConfig, { query: 'random untagged search' });
    // Pure text search has only tier 0 (no effects/category/brand to drop, no
    // structured fallback either). Exactly 1 attempt fired.
    expect(calls).toBe(1);
  });

  it('describeFallback returns null when only the query was dropped (silent recovery)', () => {
    expect(describeFallback(1, [{ field: 'query', value: 'noisy' }])).toBeNull();
  });
});

describe('searchProducts — availabilityChannel narrowing (Phase 1a)', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  const baseConfig: JaneConfig = {
    algoliaAppId: 'T', algoliaSearchKey: 'k', algoliaIndex: 'i',
    defaultStore: 'sj',
    stores: { sj: { algoliaStoreId: 1, baseUrl: 'https://x.com' } },
  };

  it('default (no channel set) keeps the legacy "delivery OR pickup" filter', async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body ? JSON.parse(String(init.body)) : {};
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ hits: [{ product_id: 1, name: 'X' }], nbHits: 1 }) } as unknown as Response;
    }));
    await searchProducts(baseConfig, { query: 'x' });
    expect(body.filters).toContain('(available_for_delivery:true OR available_for_pickup:true)');
  });

  it('availabilityChannel:"pickup" narrows the filter to just pickup', async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body ? JSON.parse(String(init.body)) : {};
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ hits: [{ product_id: 1, name: 'X' }], nbHits: 1 }) } as unknown as Response;
    }));
    await searchProducts(baseConfig, { query: 'x', availabilityChannel: 'pickup' });
    expect(String(body.filters)).toContain('available_for_pickup:true');
    expect(String(body.filters)).not.toContain('available_for_delivery');
  });

  it('availabilityChannel:"delivery" narrows the filter to just delivery', async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body ? JSON.parse(String(init.body)) : {};
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ hits: [{ product_id: 1, name: 'X' }], nbHits: 1 }) } as unknown as Response;
    }));
    await searchProducts(baseConfig, { query: 'x', availabilityChannel: 'delivery' });
    expect(String(body.filters)).toContain('available_for_delivery:true');
    expect(String(body.filters)).not.toContain('available_for_pickup');
  });

  // ── Auto-pivot contract test (route-layer behavior 2026-04-30) ────────────
  // The chat route's auto-pivot fires a SECOND searchProducts call with the
  // opposite channel when the first returned 0. This test validates the
  // primitive: two consecutive searches with different channels produce
  // different filter strings + different result counts independently. If
  // either invariant breaks, the route-level pivot would silently misbehave.
  it('auto-pivot primitive: delivery=0 followed by pickup=N produces independent filter+result shapes', async () => {
    const filtersSeen: string[] = [];
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      filtersSeen.push(String(body.filters));
      call++;
      // First call (delivery) → 0 hits. Second call (pickup) → 4 hits.
      const hits = call === 1 ? [] : [
        { product_id: 1, name: 'A' },
        { product_id: 2, name: 'B' },
        { product_id: 3, name: 'C' },
        { product_id: 4, name: 'D' },
      ];
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ hits, nbHits: hits.length }) } as unknown as Response;
    }));

    // Simulates the route's flow: first the user's selected channel, then the
    // pivot to the opposite channel.
    const first = await searchProducts(baseConfig, { query: 'indica gummies', availabilityChannel: 'delivery' });
    const second = await searchProducts(baseConfig, { query: 'indica gummies', availabilityChannel: 'pickup' });

    // First search hit the delivery filter and got 0 (after retry cascade —
    // searchProducts itself may issue multiple Algolia calls per logical call).
    expect(first.products).toHaveLength(0);
    expect(filtersSeen.find((f) => f.includes('available_for_delivery:true'))).toBeTruthy();

    // Second search hit the pickup filter and got hits.
    expect(second.products.length).toBeGreaterThan(0);
    expect(filtersSeen.some((f) => f.includes('available_for_pickup:true'))).toBe(true);

    // The two channels produced DIFFERENT filter strings — auto-pivot's
    // entire premise (running the same query in the other lane) is intact.
    const deliveryFilters = filtersSeen.filter((f) => f.includes('available_for_delivery:true') && !f.includes('available_for_pickup:true'));
    const pickupFilters = filtersSeen.filter((f) => f.includes('available_for_pickup:true') && !f.includes('available_for_delivery:true'));
    expect(deliveryFilters.length).toBeGreaterThan(0);
    expect(pickupFilters.length).toBeGreaterThan(0);
  });
});

describe('parseProductIntent — longest-match brand detection', () => {
  it('prefers "CBX Cannabiotix" over "CBX" when both are known', () => {
    const intent = parseProductIntent('Do you have CBX Cannabiotix flowers?', ['CBX', 'CBX Cannabiotix']);
    expect(intent.brand).toBe('CBX Cannabiotix');
  });
  // Canonicalization (regression 2026-04-30): when the user types the short
  // form ("CBX") and a longer canonical brand ("CBX Cannabiotix") is also in
  // knownBrands, promote to the canonical name. The short form in config is
  // usually stale residue, and Algolia stores the canonical name — without
  // this promotion, the brand-facet search returns 0 hits, the retry cascade
  // drops the brand, and the user sees random non-brand products.
  it('canonicalizes "CBX please" to "CBX Cannabiotix" when both are in knownBrands', () => {
    const intent = parseProductIntent('CBX please', ['CBX', 'CBX Cannabiotix']);
    expect(intent.brand).toBe('CBX Cannabiotix');
  });
  it('keeps "CBX" when only short form is in knownBrands', () => {
    const intent = parseProductIntent('CBX please', ['CBX']);
    expect(intent.brand).toBe('CBX');
  });
  it('canonicalization respects word-boundary in the longer prefix (no false promotion)', () => {
    // "CBXR" should NOT count as a canonical version of "CBX" — it's a
    // different brand entirely. Promotion only fires when the longer name
    // continues with " " or "-" after the matched prefix.
    const intent = parseProductIntent('CBX please', ['CBX', 'CBXR']);
    expect(intent.brand).toBe('CBX');
  });
  it('promotes with hyphen separator too ("Foo" + "Foo-Bar")', () => {
    const intent = parseProductIntent('Foo please', ['Foo', 'Foo-Bar']);
    expect(intent.brand).toBe('Foo-Bar');
  });
  it('picks the longest canonical when multiple longer prefixes exist', () => {
    const intent = parseProductIntent('CBX please', ['CBX', 'CBX Co', 'CBX Cannabiotix Holdings Inc']);
    expect(intent.brand).toBe('CBX Cannabiotix Holdings Inc');
  });
  it('prefers "Heavy Hitters" over "Hitter" if both were known', () => {
    const intent = parseProductIntent('Heavy Hitters carts', ['Hitter', 'Heavy Hitters']);
    expect(intent.brand).toBe('Heavy Hitters');
  });
  it('is case-insensitive', () => {
    const intent = parseProductIntent('show me alien labs', ['Alien Labs']);
    expect(intent.brand).toBe('Alien Labs');
  });

  // Word-boundary regression: 3-letter brand names like "LAX"/"PAX"/"CAM"/"RAW"
  // used to match as substrings of "relax"/"capacity"/"scam"/"straw".
  it('does NOT match "LAX" inside "relax"', () => {
    const intent = parseProductIntent('something to help me relax', ['LAX']);
    expect(intent.brand).toBeUndefined();
  });
  it('does NOT match "PAX" inside "capacity"', () => {
    const intent = parseProductIntent('at capacity tonight', ['PAX']);
    expect(intent.brand).toBeUndefined();
  });
  it('does NOT match "CAM" inside "scam"', () => {
    const intent = parseProductIntent('not a scam', ['CAM']);
    expect(intent.brand).toBeUndefined();
  });
  it('DOES match "LAX" as a standalone word', () => {
    const intent = parseProductIntent('show me LAX products', ['LAX']);
    expect(intent.brand).toBe('LAX');
  });
  it('matches brand at start of message', () => {
    const intent = parseProductIntent('LAX please', ['LAX']);
    expect(intent.brand).toBe('LAX');
  });
  it('matches brand followed by punctuation', () => {
    const intent = parseProductIntent('any LAX?', ['LAX']);
    expect(intent.brand).toBe('LAX');
  });
  it('matches brands containing non-alpha chars', () => {
    const intent = parseProductIntent('3 bros stuff', ['3 Bros']);
    expect(intent.brand).toBe('3 Bros');
  });
});

describe('brand facet + getBrandCatalog', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  const baseConfig: JaneConfig = {
    algoliaAppId: 'T', algoliaSearchKey: 'k', algoliaIndex: 'i',
    defaultStore: 'sj',
    stores: { sj: { algoliaStoreId: 1, baseUrl: 'https://x.com' } },
  };

  it('brand query uses brand:"X" facet filter (not text query)', async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body ? JSON.parse(String(init.body)) : {};
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ hits: [{ product_id: 1, name: 'X', brand: 'Alien Labs' }], nbHits: 1 }) } as unknown as Response;
    }));
    await searchProducts(baseConfig, { brand: 'Alien Labs' });
    expect(body.filters).toMatch(/brand:"Alien Labs"/);
    expect(body.query).toBe(''); // facet does the work, no text query
  });

  it('useBrandFacet:false falls back to legacy text-query path', async () => {
    const bodies: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.body) bodies.push(JSON.parse(String(init.body)));
      // Return a hit so the retry cascade doesn't fire and we observe tier 0 only
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ hits: [{ product_id: 1, name: 'X' }], nbHits: 1 }) } as unknown as Response;
    }));
    await searchProducts(baseConfig, { brand: 'CBX', useBrandFacet: false });
    expect(bodies.length).toBeGreaterThan(0);
    expect(String(bodies[0].filters)).not.toMatch(/brand:/);
    expect(bodies[0].query).toBe('CBX');
  });

  it('escapes quote characters in brand name', async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body ? JSON.parse(String(init.body)) : {};
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ hits: [{ product_id: 1, name: 'X' }], nbHits: 1 }) } as unknown as Response;
    }));
    await searchProducts(baseConfig, { brand: 'Johnny "Cannabis" Co' });
    // Inner quotes must be backslash-escaped so Algolia treats the full string as one value
    expect(String(body.filters)).toContain('brand:"Johnny \\"Cannabis\\" Co"');
  });

  it('getBrandCatalog groups products by lineage category', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200, text: async () => '',
      json: async () => ({
        hits: [
          { product_id: 1, name: 'Pre A', brand: 'Alien Labs', category: 'hybrid', root_types: ['pre-roll'] },
          { product_id: 2, name: 'Pre B', brand: 'Alien Labs', category: 'hybrid', root_types: ['pre-roll'] },
          { product_id: 3, name: 'Flower A', brand: 'Alien Labs', category: 'indica', root_types: ['flower'] },
        ],
        nbHits: 3,
      }),
    } as unknown as Response)));
    const catalog = await getBrandCatalog(baseConfig, 'Alien Labs');
    expect(catalog.products).toHaveLength(3);
    expect(Object.keys(catalog.groups).sort()).toEqual(['hybrid', 'indica']);
    expect(catalog.groups['hybrid']).toHaveLength(2);
    expect(catalog.groups['indica']).toHaveLength(1);
  });

  // Regression 2026-04-30: getBrandCatalog must NOT return non-brand products
  // when the retry cascade had to drop the brand filter to find anything.
  // Production sweep caught "do you carry CBX" returning 50 #Hashtag-branded
  // products labeled as if they were CBX, plus a /brands/cbx URL (404).
  it('returns empty when retry cascade dropped the brand filter', async () => {
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      call++;
      // Tier 0 (brand:"CBX") — 0 hits.
      // Tier 3 (drop brand) — 50 random products from a different brand.
      const hits = call === 1 ? [] : [
        { product_id: 1, name: 'Berry Runtz', brand: '#Hashtag' },
        { product_id: 2, name: 'Black Jack', brand: '#Hashtag' },
        { product_id: 3, name: 'Frozen Biscotti', brand: '#Hashtag' },
      ];
      return {
        ok: true, status: 200, text: async () => '',
        json: async () => ({ hits, nbHits: hits.length }),
      } as unknown as Response;
    }));

    const catalog = await getBrandCatalog(baseConfig, 'CBX');
    // Must NOT return the dropped-brand wrong-brand products.
    expect(catalog.products).toEqual([]);
    expect(catalog.groups).toEqual({});
    expect(catalog.resolvedBrand).toBeUndefined();
  });

  it('still returns products when tier 0 brand-facet hits succeed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200, text: async () => '',
      json: async () => ({
        hits: [{ product_id: 1, name: 'Slurricane', brand: 'CBX Cannabiotix', category: 'indica' }],
        nbHits: 1,
      }),
    } as unknown as Response)));
    const catalog = await getBrandCatalog(baseConfig, 'CBX Cannabiotix');
    // Tier 0 succeeded — brand was NOT dropped, return the products.
    expect(catalog.products).toHaveLength(1);
    expect(catalog.products[0].brand).toBe('CBX Cannabiotix');
  });
});

describe('resolveSupportLinks', () => {
  const cfg = { website_url: 'https://plpcsanjose.com' };

  it('detects ordering intent — fallback path is /menu (verified 200 on plpcsanjose.com 2026-04-29)', () => {
    const links = resolveSupportLinks('how do I order?', cfg);
    expect(links.some((l) => l.topic === 'ordering')).toBe(true);
    expect(links[0].url).toBe('https://plpcsanjose.com/menu');
  });

  it('detects delivery intent', () => {
    const links = resolveSupportLinks('where do you deliver?', cfg);
    expect(links.some((l) => l.topic === 'delivery')).toBe(true);
    expect(links.find((l) => l.topic === 'delivery')?.url).toBe('https://plpcsanjose.com/delivery');
  });

  it('detects hours intent — fallback is /locations (since /hours 404s on real sites)', () => {
    const links = resolveSupportLinks('what are your hours today', cfg);
    const hoursLink = links.find((l) => l.topic === 'hours');
    expect(hoursLink).toBeDefined();
    expect(hoursLink?.url).toBe('https://plpcsanjose.com/locations');
  });

  it('prefers explicit support_links config over auto-generated URL', () => {
    const links = resolveSupportLinks('how to order?', {
      support_links: { ordering: 'https://custom.example.com/checkout' },
      website_url: 'https://plpcsanjose.com',
    });
    expect(links[0].url).toBe('https://custom.example.com/checkout');
  });

  it('returns empty array for non-support messages', () => {
    expect(resolveSupportLinks('what alien labs flowers do you have?', cfg)).toEqual([]);
  });

  it('handles missing website_url gracefully', () => {
    expect(resolveSupportLinks('how to order?', {})).toEqual([]);
  });

  it('de-duplicates URLs when multiple topics map to the same page', () => {
    const links = resolveSupportLinks('contact info phone', cfg);
    const urls = links.map((l) => l.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  // ── Bug regression: 2026-04-29 ─────────────────────────────────────────
  // Customer reported chips were sending users to plpcsanjose.com/order
  // (404) and /hours (404). Topics whose default paths weren't reliable
  // are now suppressed entirely unless the client provides an explicit
  // support_links override.

  it('payment topic does NOT emit a chip without explicit support_links override', () => {
    const links = resolveSupportLinks('what payment do you accept?', cfg);
    // "accept" matches both payment + nothing-else; assert no payment chip rendered
    expect(links.find((l) => l.topic === 'payment')).toBeUndefined();
  });

  it('payment topic DOES emit a chip when client provides explicit override', () => {
    const links = resolveSupportLinks('what payment do you accept?', {
      website_url: 'https://plpcsanjose.com',
      support_links: { payment: 'https://plpcsanjose.com/about/payment' },
    });
    const link = links.find((l) => l.topic === 'payment');
    expect(link?.url).toBe('https://plpcsanjose.com/about/payment');
  });

  it('returns/refund topic suppressed without explicit override', () => {
    const links = resolveSupportLinks('what is your return policy?', cfg);
    expect(links.find((l) => l.topic === 'returns')).toBeUndefined();
  });

  it('id_age topic suppressed without explicit override', () => {
    const links = resolveSupportLinks('what ID do I need?', cfg);
    expect(links.find((l) => l.topic === 'id_age')).toBeUndefined();
  });

  it('never emits a bare-homepage URL when topic has empty default path', () => {
    // Regression for the bug where empty path + truthy website_url produced
    // a chip linking to "https://plpcsanjose.com" (homepage) for payment topic.
    const links = resolveSupportLinks('do you accept credit card?', cfg);
    expect(links.find((l) => l.url === 'https://plpcsanjose.com')).toBeUndefined();
  });

  it('lockfile: every topic with a default path resolves to a path verified to return HTTP 200 on plpcsanjose.com', () => {
    // Verified 2026-04-29 via curl probe. If you change a default path here,
    // re-probe the new path against a real Jane-storefront site and update.
    const VERIFIED_PATHS_2026_04_29: Record<string, string> = {
      ordering: '/menu',
      delivery: '/delivery',
      pickup: '/pickup',
      hours: '/locations',
      location: '/locations',
      rewards: '/rewards',
      deals: '/deals',
      menu: '/shop/all',
      contact: '/contact',
    };
    // Fire a message that triggers each topic in turn.
    const triggers: Record<string, string> = {
      ordering: 'how do I order?',
      delivery: 'where do you deliver?',
      pickup: 'do you have curbside pickup?',
      hours: 'what time are you open?',
      location: 'where is your store?',
      rewards: 'do you have a rewards program?',
      deals: 'any deals today?',
      menu: 'show me your full menu',
      contact: 'how do I contact you?',
    };
    for (const [topic, expectedPath] of Object.entries(VERIFIED_PATHS_2026_04_29)) {
      const links = resolveSupportLinks(triggers[topic], cfg);
      const link = links.find((l) => l.topic === topic);
      expect(link, `topic=${topic} did not produce a chip`).toBeDefined();
      expect(link?.url, `topic=${topic} pointed at unverified URL`).toBe(
        `https://plpcsanjose.com${expectedPath}`,
      );
    }
  });
});

describe('buildJaneConfigFromContainerConfig — cart deeplink flag', () => {
  it('passes through jane_cart_deeplink_param when set', () => {
    const cfg = buildJaneConfigFromContainerConfig({
      jane_algolia_app_id: 'A', jane_algolia_search_key: 'k', jane_algolia_index: 'i',
      jane_stores: [{ id: 'x', algoliaStoreId: 1, baseUrl: 'https://x.com' }],
      jane_cart_deeplink_param: 'add',
    });
    expect(cfg?.cartDeeplinkParam).toBe('add');
  });
  it('leaves cartDeeplinkParam undefined when flag absent', () => {
    const cfg = buildJaneConfigFromContainerConfig({
      jane_algolia_app_id: 'A', jane_algolia_search_key: 'k', jane_algolia_index: 'i',
      jane_stores: [{ id: 'x', algoliaStoreId: 1, baseUrl: 'https://x.com' }],
    });
    expect(cfg?.cartDeeplinkParam).toBeUndefined();
  });
});

// ── Bug regression: 2026-04-30 ─────────────────────────────────────────────
// Sweep against production found that card URLs containing multi-word weight
// values ("eighth ounce", "half ounce") were emitted with literal spaces:
//   https://plpcsanjose.com/product/2737468/3-bros-ghost-truffle?weight=eighth ounce
// Browsers accept this, but link previewers, schema.org validators, and any
// curl-based tooling fail (HEAD returned 000). Fix: encodeURIComponent.
describe('algoliaHitToProduct — URL encoding (regression 2026-04-30)', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('URL-encodes weight values containing spaces', async () => {
    vi.stubGlobal('fetch', mockFetchSequence([
      { hits: [{
        product_id: 2737468,
        name: '3 Bros Ghost Truffle',
        url_slug: '3-bros-ghost-truffle',
        brand: '3 Bros',
        available_weights: ['eighth ounce'],
      }] },
    ]));

    const result = await searchProducts(baseConfig, { category: 'flower' });
    expect(result.products).toHaveLength(1);
    const url = result.products[0].url;
    // No raw space in the query string — "eighth%20ounce", not "eighth ounce".
    expect(url).not.toMatch(/weight=[^&\s]*\s/);
    expect(url).toContain('weight=eighth%20ounce');
  });

  it('leaves single-word weights untouched', async () => {
    vi.stubGlobal('fetch', mockFetchSequence([
      { hits: [{
        product_id: 1,
        name: 'X',
        url_slug: 'x',
        brand: 'Y',
        available_weights: ['gram'],
      }] },
    ]));
    const result = await searchProducts(baseConfig, { category: 'flower' });
    expect(result.products[0].url).toContain('weight=gram');
  });

  it('falls back to "each" when no available_weights', async () => {
    vi.stubGlobal('fetch', mockFetchSequence([
      { hits: [{ product_id: 1, name: 'X', url_slug: 'x', brand: 'Y' }] },
    ]));
    const result = await searchProducts(baseConfig, { category: 'flower' });
    expect(result.products[0].url).toContain('weight=each');
  });
});

// ── buildBrowseMore — smart filtered-page URLs (regression 2026-04-30) ─────
// Customer reported clicking "Browse all 6 Full Menu →" took them to
// /shop/all (the entire catalog). The label promised 6 filtered products,
// the URL delivered thousands. New builder honors brand/category/lineage/
// price filters and drops the count when the URL can't precisely reproduce
// the search.
describe('buildBrowseMore — per-intent URL + label', () => {
  const BASE = 'https://plpcsanjose.com';

  it('returns null when storeBaseUrl is empty', () => {
    expect(buildBrowseMore('', { query: 'x' }, 100)).toBeNull();
  });

  it('strips trailing slash from storeBaseUrl', () => {
    const r = buildBrowseMore('https://x.com/', { query: 'flower' }, 0);
    expect(r?.url).toMatch(/^https:\/\/x\.com\//);
    expect(r?.url).not.toMatch(/^https:\/\/x\.com\/\//);
  });

  describe('brand queries', () => {
    it('builds /brands/{slug} with full-brand slug + preserves count', () => {
      const r = buildBrowseMore(BASE, { brand: 'Alien Labs' }, 12, 'Alien Labs');
      expect(r?.url).toBe(`${BASE}/brands/alien-labs`);
      expect(r?.label).toBe('Alien Labs Products');
      expect(r?.totalCount).toBe(12);
    });

    it('uses resolvedBrand over intent.brand for the slug (CBX → CBX Cannabiotix)', () => {
      const r = buildBrowseMore(BASE, { brand: 'CBX' }, 4, 'CBX Cannabiotix');
      // Slug must use the FULL brand name — Jane's /brands/cbx returns 0
      // products, /brands/cbx-cannabiotix returns 4. PR #409 fix.
      expect(r?.url).toBe(`${BASE}/brands/cbx-cannabiotix`);
      expect(r?.label).toBe('CBX Products');  // chip label uses the short name
    });

    it('handles brands with apostrophes / ampersands in the slug', () => {
      const r = buildBrowseMore(BASE, { brand: 'Papa & Barkley' }, 5, 'Papa & Barkley');
      expect(r?.url).toBe(`${BASE}/brands/papa-barkley`);
    });
  });

  describe('category queries (no brand, no effects)', () => {
    it('flower → /shop/flower + Flower Menu', () => {
      const r = buildBrowseMore(BASE, { category: 'flower' }, 200);
      expect(r?.url).toBe(`${BASE}/shop/flower`);
      expect(r?.label).toBe('Flower Menu');
      expect(r?.totalCount).toBe(0);  // count dropped for non-brand queries
    });

    it('gummy → /shop/edible (root_type mapping)', () => {
      const r = buildBrowseMore(BASE, { category: 'gummy' }, 50);
      expect(r?.url).toBe(`${BASE}/shop/edible`);
      expect(r?.label).toBe('Edible Menu');
    });

    it('cartridge → /shop/vape (root_type mapping)', () => {
      const r = buildBrowseMore(BASE, { category: 'cartridge' }, 30);
      expect(r?.url).toBe(`${BASE}/shop/vape`);
      expect(r?.label).toBe('Vape Menu');
    });

    it('concentrate → /shop/extract (Jane verified path 2026-04-30)', () => {
      const r = buildBrowseMore(BASE, { category: 'concentrate' }, 20);
      expect(r?.url).toBe(`${BASE}/shop/extract`);
      expect(r?.label).toBe('Extract Menu');
    });

    it('preroll → /shop/preroll', () => {
      const r = buildBrowseMore(BASE, { category: 'preroll' }, 40);
      expect(r?.url).toBe(`${BASE}/shop/preroll`);
      // Title-cased per hyphen segment ("Pre-Roll", not "Pre-roll").
      expect(r?.label).toBe('Pre-Roll Menu');
    });

    it('unknown category → /shop/all + "Full Menu"', () => {
      const r = buildBrowseMore(BASE, { category: 'flux-capacitor' }, 0);
      expect(r?.url).toBe(`${BASE}/shop/all`);
      expect(r?.label).toBe('Full Menu');
    });
  });

  describe('effect / lineage queries (the bug from the screenshot)', () => {
    // Note: Jane Roots storefront filter param is `?strain=`, NOT `?lineage=`.
    // PR #439's probe checked HTTP 200 only; subsequent probe (2026-05-01)
    // showed `?lineage=indica` returns the SAME count as the unfiltered page
    // (Jane silently ignores unknown params), while `?strain=indica` actually
    // narrows the count from 268 → 57.
    it('"Energizing products" — effects=energy → /shop/all?strain=sativa + "Sativa Menu"', () => {
      const r = buildBrowseMore(BASE, { effects: ['energy'], query: 'energizing products' }, 6);
      expect(r?.url).toBe(`${BASE}/shop/all?strain=sativa`);
      expect(r?.label).toBe('Sativa Menu');
      expect(r?.totalCount).toBe(0);
    });

    it('"sleep" → effects=sleep → /shop/all?strain=indica + "Indica Menu"', () => {
      const r = buildBrowseMore(BASE, { effects: ['sleep'] }, 0);
      expect(r?.url).toBe(`${BASE}/shop/all?strain=indica`);
      expect(r?.label).toBe('Indica Menu');
    });

    it('multiple effects mapping to multiple lineages drops the strain filter', () => {
      // relax → [indica, hybrid] — Jane URL doesn't OR. Skip the strain param.
      const r = buildBrowseMore(BASE, { effects: ['relax'] }, 0);
      expect(r?.url).toBe(`${BASE}/shop/all`);
      expect(r?.label).toBe('Full Menu');
    });

    it('preferLineages from session memory acts as fallback strain', () => {
      const r = buildBrowseMore(BASE, { preferLineages: ['sativa'] }, 0);
      expect(r?.url).toBe(`${BASE}/shop/all?strain=sativa`);
      expect(r?.label).toBe('Sativa Menu');
    });

    it('effect-derived strain takes priority over preferLineages', () => {
      const r = buildBrowseMore(BASE, { effects: ['sleep'], preferLineages: ['sativa'] }, 0);
      expect(r?.url).toBe(`${BASE}/shop/all?strain=indica`);  // sleep → indica wins
    });
  });

  describe('combined queries — category + strain + price', () => {
    // 2026-05-01 probe: Jane Roots storefront does NOT honor any URL price
    // filter (max_price, price_max, max, price=lo-hi, bucket_price all
    // ignored) so we don't put it in the URL. We DO keep "under $N" in the
    // label as transparent context for the customer — they'll still see
    // prices on the cards we already rendered.
    it('"sativa gummies under $30" → /shop/edible?strain=sativa (price omitted from URL, kept in label)', () => {
      const r = buildBrowseMore(
        BASE,
        { category: 'gummy', effects: ['energy'], maxPrice: 30 },
        0,
      );
      expect(r?.url).toBe(`${BASE}/shop/edible?strain=sativa`);
      expect(r?.label).toBe('Sativa Edibles Menu under $30');
    });

    it('"flower under $40" → /shop/flower (price label only, no URL param)', () => {
      const r = buildBrowseMore(BASE, { category: 'flower', maxPrice: 40 }, 0);
      expect(r?.url).toBe(`${BASE}/shop/flower`);
      expect(r?.label).toBe('Flower Menu under $40');
    });

    it('"indica vapes" → /shop/vape?strain=indica', () => {
      const r = buildBrowseMore(BASE, { category: 'vape', effects: ['sleep'] }, 0);
      expect(r?.url).toBe(`${BASE}/shop/vape?strain=indica`);
      expect(r?.label).toBe('Indica Vapes Menu');
    });

    // Lockfile: pin every strain value Jane honors. If this test breaks the
    // probe needs to be re-run against the live site to confirm Jane changed
    // their schema. As of 2026-05-01: only indica/sativa/hybrid/cbd work.
    it('lockfile: every supported strain produces ?strain={value}', () => {
      for (const s of ['indica', 'sativa', 'hybrid', 'cbd']) {
        const r = buildBrowseMore(BASE, { preferLineages: [s] }, 0);
        expect(r?.url).toBe(`${BASE}/shop/all?strain=${s}`);
      }
    });
  });

  describe('count semantics', () => {
    it('brand queries surface the count (storefront page is a faithful match)', () => {
      const r = buildBrowseMore(BASE, { brand: 'X' }, 12, 'X');
      expect(r?.totalCount).toBe(12);
    });

    it('non-brand queries always return totalCount=0 (widget hides the prefix)', () => {
      // The previous bug shipped "Browse all 6 Full Menu →" because the
      // widget renders count when truthy — and Algolia's filtered count
      // doesn't match what Jane's filtered page would show.
      expect(buildBrowseMore(BASE, { category: 'flower' }, 200)?.totalCount).toBe(0);
      expect(buildBrowseMore(BASE, { effects: ['energy'] }, 6)?.totalCount).toBe(0);
      expect(buildBrowseMore(BASE, { maxPrice: 30 }, 50)?.totalCount).toBe(0);
      expect(buildBrowseMore(BASE, {}, 1000)?.totalCount).toBe(0);
    });
  });
});
