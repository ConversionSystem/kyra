// ============================================================================
// GET /api/widget/[clientId]/trending
//
// Returns the dispensary's top-selling products as cards, in the same shape
// the widget's product-card renderer already understands. The widget fetches
// this on every open (instant-revalidated) and renders a "🔥 Trending now"
// section under the welcome greeting so visitors who don't know what to ask
// have a discovery surface.
//
// Powered by Jane's own `best_seller_rank` (1 = highest seller in the store),
// returned from the standard Algolia menu index. No replica required — we
// over-fetch ~50 in-stock hits, filter to those with a rank set, and trim
// to the top N. Cached server-side for 5 min per store (best-sellers don't
// rotate every second).
//
// Query params:
//   - storeId   (optional) — overrides the client's default store
//   - channel   (optional) — 'pickup' | 'delivery'; default 'either'
//   - limit     (optional) — 1..8; default 3
//
// Response shape:
//   { products: ProductCard[], label: string, totalCount: number,
//     fromCache: boolean }
// or { products: [], reason: 'no_jane_config' | 'no_results' } on empty.
//
// Out-of-stock check: when Jane Partner credentials are configured for the
// client, every card is stock-checked via lib/integrations/jane-api.ts so
// the widget can flag any that sold out since Algolia last indexed.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { buildJaneConfigFromContainerConfig, getBestSellers, type JaneProduct } from '@/lib/integrations/jane';

// CORS: widget is embedded on external sites
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// ── In-memory cache ────────────────────────────────────────────────────────
// Best-sellers don't rotate minute-to-minute — a 5 min TTL is plenty fresh
// and keeps widget-open latency snappy on warm calls. Keyed by clientId +
// storeId + channel + limit so distinct query shapes don't clobber each other.
interface CacheEntry { products: JaneProduct[]; expiresAt: number }
const TRENDING_CACHE = new Map<string, CacheEntry>();
const TRENDING_CACHE_TTL_MS = 5 * 60 * 1000;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params;
  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400, headers: CORS });
  }

  const url = new URL(request.url);
  const storeIdParam = url.searchParams.get('storeId') || undefined;
  const channelParam = url.searchParams.get('channel');
  const channel: 'pickup' | 'delivery' | 'either' =
    channelParam === 'pickup' || channelParam === 'delivery' ? channelParam : 'either';
  const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit')) || 3, 8));

  // Fetch container_config so we can build a Jane config
  const supabase = getSupabase();
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, container_config')
    .eq('id', clientId)
    .single();

  if (!client) {
    return NextResponse.json({ products: [], reason: 'no_client' }, { headers: CORS });
  }

  const cfg = (client.container_config as Record<string, unknown>) ?? {};

  // Per-client kill switch — default ON, but operators can disable in
  // container_config if they don't want a trending surface.
  if (cfg.widget_trending_enabled === false) {
    return NextResponse.json({ products: [], reason: 'disabled' }, { headers: CORS });
  }

  const janeConfig = buildJaneConfigFromContainerConfig(cfg);
  if (!janeConfig) {
    return NextResponse.json({ products: [], reason: 'no_jane_config' }, { headers: CORS });
  }

  const effectiveStoreId =
    storeIdParam || (cfg.jane_default_store_id as string | undefined) || janeConfig.defaultStore;

  // Cache key
  const cacheKey = `${clientId}:${effectiveStoreId}:${channel}:${limit}`;
  const cached = TRENDING_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return respond(cached.products, { fromCache: true, label: (cfg.widget_trending_label as string) || '🔥 Trending now' });
  }

  // Fresh fetch from Algolia
  const t0 = Date.now();
  const { products, rankedCount } = await getBestSellers(janeConfig, {
    storeId: effectiveStoreId,
    channel,
    limit,
  });
  console.log(
    `[widget/trending] ${clientId.slice(0, 8)} store=${effectiveStoreId} channel=${channel} ` +
    `limit=${limit} → ${products.length}/${rankedCount} ranked in ${Date.now() - t0}ms`,
  );

  if (products.length === 0) {
    // Cache the empty result too (don't keep hammering Algolia)
    TRENDING_CACHE.set(cacheKey, { products: [], expiresAt: Date.now() + TRENDING_CACHE_TTL_MS });
    return NextResponse.json({ products: [], reason: 'no_results' }, { headers: CORS });
  }

  // Layer the Jane Menu API V1 stock-check on top — Algolia can be ~5 min
  // stale for inventory. Reuses the same helper the chat endpoint uses, so
  // OOS flags appear consistently across both surfaces.
  const cards = products.map(p => ({ ...p, outOfStock: false }));
  try {
    const algoliaStoreId = Number(effectiveStoreId);
    if (Number.isFinite(algoliaStoreId) && algoliaStoreId > 0) {
      const { getJaneCredentials, checkStock } = await import('@/lib/integrations/jane-api');
      const creds = getJaneCredentials(clientId);
      if (creds) {
        const ids = cards.map(c => c.id).filter(Boolean);
        const stock = await checkStock(creds, ids, algoliaStoreId, channel);
        for (const c of cards) {
          if (stock.inStock[String(c.id)] === false) c.outOfStock = true;
        }
      }
    }
  } catch (err) {
    console.warn('[widget/trending] stock check soft-failed:', err instanceof Error ? err.message : err);
  }

  // Drop cards flagged out-of-stock — best-sellers that just sold out shouldn't
  // bait visitors. If filtering removes everything, surface fewer (still better
  // than showing OOS placeholders in a discovery context).
  const inStockCards = cards.filter(c => !c.outOfStock);
  const finalProducts = inStockCards.length > 0 ? inStockCards : cards;

  TRENDING_CACHE.set(cacheKey, { products: finalProducts, expiresAt: Date.now() + TRENDING_CACHE_TTL_MS });
  return respond(finalProducts, {
    fromCache: false,
    label: (cfg.widget_trending_label as string) || '🔥 Trending now',
  });
}

function respond(
  products: JaneProduct[],
  meta: { fromCache: boolean; label: string },
) {
  return NextResponse.json(
    {
      products,
      label: meta.label,
      totalCount: products.length,
      fromCache: meta.fromCache,
    },
    {
      headers: {
        ...CORS,
        // Browser-side cache: 5 min, must-revalidate matches the script
        // endpoint's pattern so a config change becomes visible quickly.
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    },
  );
}
