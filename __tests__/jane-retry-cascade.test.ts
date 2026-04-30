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
});

describe('parseProductIntent — longest-match brand detection', () => {
  it('prefers "CBX Cannabiotix" over "CBX" when both are known', () => {
    const intent = parseProductIntent('Do you have CBX Cannabiotix flowers?', ['CBX', 'CBX Cannabiotix']);
    expect(intent.brand).toBe('CBX Cannabiotix');
  });
  it('falls back to short match when only short is present in message', () => {
    const intent = parseProductIntent('CBX please', ['CBX', 'CBX Cannabiotix']);
    expect(intent.brand).toBe('CBX');
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
