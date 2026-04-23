// ============================================================================
// GET /api/debug/algolia-probe
//
// TEMPORARY diagnostic endpoint. Hits Purple Lotus's Algolia index from the
// Vercel serverless function with the exact same shape searchViaAlgolia uses,
// and returns the raw response body so we can see WHY it returns 0 hits in
// production when direct-curl returns 95.
//
// Delete after root cause is found.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') || 'indica';
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
