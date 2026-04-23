// ============================================================================
// GET /api/debug/algolia-probe
//
// TEMPORARY diagnostic endpoint. Two modes:
//   ?mode=raw (default) → makes a bare fetch() to Algolia matching the shape
//     widget/chat uses, returns raw body. Isolates whether the code in
//     searchViaAlgolia differs from a simple fetch.
//   ?mode=jane  → calls `searchProducts()` from lib/integrations/jane.ts
//     the way widget/chat does, returns the result it got. If this returns 0
//     while `mode=raw` returns hits, the bug is inside jane.ts itself.
//
// Delete after root cause is found.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('mode') || 'raw';
  const query = req.nextUrl.searchParams.get('q') || 'indica';

  // Mode: jane → call the actual searchProducts so we reproduce the exact
  // flow widget/chat uses (with the retry cascade, brand facet, etc.)
  if (mode === 'jane') {
    const { buildJaneConfigFromContainerConfig, searchProducts, parseProductIntent } =
      await import('@/lib/integrations/jane');
    const cfg = {
      jane_algolia_app_id: 'VFM4X0N23A',
      jane_algolia_search_key: '8bd39f3c1d26dd060940b682f024757c',
      jane_algolia_index: 'menu-products-production',
      jane_default_store_id: 'san-jose',
      jane_stores: [
        { id: 'san-jose', name: 'San Jose', algoliaStoreId: 4398, baseUrl: 'https://plpcsanjose.com' },
        { id: 'downtown', name: 'Downtown', algoliaStoreId: 5981, baseUrl: 'https://plpcsanjose.com' },
      ],
      jane_known_brands: ['Alien Labs', 'CBX', 'Jeeter'],
    };
    const janeConfig = buildJaneConfigFromContainerConfig(cfg);
    if (!janeConfig) return NextResponse.json({ error: 'janeConfig null' }, { status: 500 });

    const intent = parseProductIntent(query, janeConfig.knownBrands || []);
    intent.storeId = 'san-jose';

    const t0 = Date.now();
    const result = await searchProducts(janeConfig, intent);
    return NextResponse.json({
      mode: 'jane',
      elapsedMs: Date.now() - t0,
      inputQuery: query,
      parsedIntent: intent,
      result: {
        productsCount: result.products.length,
        totalFound: result.totalFound,
        source: result.source,
        fallbackTier: result.fallbackTier,
        firstThree: result.products.slice(0, 3).map((p) => ({ name: p.name, brand: p.brand })),
      },
    });
  }

  const filters =
    req.nextUrl.searchParams.get('filters') ||
    'store_id:4398 AND (available_for_delivery:true OR available_for_pickup:true) AND root_types:flower';

  const body = {
    query,
    filters,
    hitsPerPage: 3,
    typoTolerance: true,
    minWordSizefor1Typo: 4,
    minWordSizefor2Typos: 7,
    ignorePlurals: true,
    removeStopWords: true,
    attributesToRetrieve: [
      'product_id',
      'name',
      'brand',
      'category',
      'percent_thc',
      'bucket_price',
      'available_for_delivery',
      'available_for_pickup',
    ],
  };

  const t0 = Date.now();
  const res = await fetch(
    'https://VFM4X0N23A-dsn.algolia.net/1/indexes/menu-products-production/query',
    {
      method: 'POST',
      headers: {
        'X-Algolia-Application-Id': 'VFM4X0N23A',
        'X-Algolia-API-Key': '8bd39f3c1d26dd060940b682f024757c',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    },
  );

  const elapsedMs = Date.now() - t0;
  const status = res.status;
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* leave as raw text */
  }

  return NextResponse.json(
    {
      elapsedMs,
      httpStatus: status,
      requestBody: body,
      responseBody: parsed ?? text,
      responseLength: text.length,
      serverIp: req.headers.get('x-vercel-forwarded-for') || 'n/a',
      region: process.env.VERCEL_REGION || 'n/a',
    },
    { status: 200 },
  );
}
