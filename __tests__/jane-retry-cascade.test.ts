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

  it('strips emoji from query text before sending to Algolia', async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body ? JSON.parse(String(init.body)) : {};
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ hits: [{ product_id: 1, name: 'X' }], nbHits: 1 }) } as unknown as Response;
    }));
    await searchProducts(baseConfig, { query: '\u{1F634} Products for sleep' });
    expect(body.query).not.toMatch(/\p{Emoji_Presentation}/u);
    expect(body.query).toMatch(/Products/);
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
