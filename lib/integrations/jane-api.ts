// ────────────────────────────────────────────────────────────────────────────
// Jane Partner API client — per-dispensary credentials
//
// This module is the AUTHENTICATED counterpart to lib/integrations/jane.ts
// (which uses public Algolia search-only keys). The Algolia layer handles
// product catalog reads; this layer handles auth-required reads + writes
// (Phase 1b: real-time stock check; future: cart manipulation, order status).
//
// Strategy: HYBRID — Algolia stays primary for search (sub-5ms latency, ~144
// brands faceted, 27/27 production QA). Jane API layered on top for the few
// things Algolia can't do.
//
// Auth scheme (confirmed by Allie @ Jane 2026-04-23): OAuth2 client-credentials
// flow → exchange UID + secret at a token endpoint for a short-lived Bearer
// token. Tokens are cached per (clientSlug, environment) until they expire.
//
// Sandbox: https://demo-api.nonprod-iheartjane.com (sandbox creds + store 2100)
// Production: https://www.iheartjane.com/api
// ────────────────────────────────────────────────────────────────────────────

export interface JaneApiCredentials {
  uid: string;
  secret: string;
  /** Short form used to build env var keys (8 hex chars). */
  clientSlug: string;
}

/**
 * Resolve a client's Jane Partner credentials from Vercel environment variables.
 *
 * Naming convention (per-dispensary, per Allie 2026-04-23):
 *   client_id = "968cae23-e978-46bd-8f4f-23ed2e82d7be"
 *   →  JANE_PARTNER_UID_968CAE23      (Jane partner UID / OAuth client_id)
 *   →  JANE_PARTNER_SECRET_968CAE23   (Jane partner secret / OAuth client_secret)
 *
 * Returns null when either var is missing — callers fall through to the Algolia
 * search path so the widget keeps working before Jane onboarding is complete.
 */
export function getJaneCredentials(clientId: string): JaneApiCredentials | null {
  if (typeof clientId !== 'string') return null;
  const slug = clientId.split('-')[0]?.toUpperCase();
  if (!slug || !/^[0-9A-F]{8}$/.test(slug)) return null;

  const uid = process.env[`JANE_PARTNER_UID_${slug}`];
  const secret = process.env[`JANE_PARTNER_SECRET_${slug}`];
  if (!uid || !secret) return null;

  return { uid, secret, clientSlug: slug };
}

/** Convenience: does this client have Jane API credentials configured? */
export function hasJaneCredentials(clientId: string): boolean {
  return getJaneCredentials(clientId) !== null;
}

// ── Environment selection ───────────────────────────────────────────────────

/**
 * Resolve the Jane API base URL. Override per-deploy via JANE_API_BASE_URL.
 * Default = production. Tests + sandbox set the env var explicitly.
 */
function getApiBase(): string {
  const override = process.env.JANE_API_BASE_URL?.trim();
  if (override) return override.replace(/\/$/, '');
  return 'https://www.iheartjane.com/api';
}

// ── OAuth2 token cache ──────────────────────────────────────────────────────

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

const TOKEN_CACHE = new Map<string, CachedToken>();

/**
 * Refresh ~5 min before expiry to avoid in-flight token rejections.
 * Jane tokens are AWS Cognito tokens, typically 1-hour TTL.
 */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Exchange UID + secret for a short-lived Bearer token. Uses the OAuth2
 * client-credentials grant. Cached per (clientSlug, base URL) until expiry.
 *
 * Per Allie's reply 2026-04-23 the auth uses Cognito under the hood. Path
 * is /oauth/token (production diagnostic confirmed: /oauth2/token returns
 * 404, /oauth/token returns 401 when creds are body-only).
 *
 * Wire format: HTTP Basic Auth header AND form-body creds — the body params
 * are the OAuth2 spec for confidential clients without a secret, and the
 * Basic header is what Cognito expects when the client has a secret. Sending
 * both keeps us compatible with whichever auth scheme Jane's gateway proxy
 * actually validates.
 */
export async function getAccessToken(creds: JaneApiCredentials): Promise<string> {
  const base = getApiBase();
  const cacheKey = `${creds.clientSlug}:${base}`;
  const cached = TOKEN_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + TOKEN_REFRESH_BUFFER_MS) {
    return cached.accessToken;
  }

  // Belt-and-suspenders: send creds in BOTH the Basic auth header and the body
  // so we work whether Jane's gateway proxy validates Cognito-style (header)
  // or OAuth2 confidential-client-style (body).
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: creds.uid,
    client_secret: creds.secret,
  });

  const basic = Buffer.from(`${creds.uid}:${creds.secret}`).toString('base64');

  const res = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${basic}`,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[jane-api] token exchange ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  };
  if (!data.access_token) {
    throw new Error('[jane-api] token response missing access_token');
  }

  // Default to 1h if Jane omits expires_in. Subtract buffer at read time.
  const ttlMs = (data.expires_in ?? 3600) * 1000;
  const entry: CachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + ttlMs,
  };
  TOKEN_CACHE.set(cacheKey, entry);
  return entry.accessToken;
}

/** Drop the cached token for a client — used in tests + on 401 retry. */
export function clearAccessToken(creds: JaneApiCredentials): void {
  const cacheKey = `${creds.clientSlug}:${getApiBase()}`;
  TOKEN_CACHE.delete(cacheKey);
}

// ── Stock check (Menu API V1) ───────────────────────────────────────────────

export interface StockCheckResult {
  /** Map productId → in-stock right now. */
  inStock: Record<string, boolean>;
  /** Always [] in the new implementation (kept for caller compatibility). */
  unknown: string[];
}

interface InStockSnapshot {
  /** Set of stringified product ids known to be in stock for this store. */
  productIds: Set<string>;
  expiresAt: number; // epoch ms
}

const STOCK_CACHE = new Map<string, InStockSnapshot>();

/**
 * How long to trust an in-stock snapshot. Short enough that customer-facing
 * sell-outs propagate quickly, long enough that a single page request doesn't
 * pay the full 6-page-walk cost on every Algolia card render.
 *
 * Algolia's own freshness lag is ~5 min, so 90s here is a strict improvement.
 */
const STOCK_CACHE_TTL_MS = 90 * 1000;

/** Page size — Jane's hard cap is 250 (per Swagger). */
const PAGE_SIZE = 250;

/** Bail out after this many pages to bound worst-case cost on huge stores. */
const MAX_PAGES = 20;

/** Drop the cached in-stock snapshot — used in tests. */
export function clearStockCache(): void {
  STOCK_CACHE.clear();
}

/**
 * Walk every page of the store's menu_products and return the set of
 * in-stock product ids. The Menu API V1 LIST endpoint defaults to
 * include_invisible_and_out_of_stock=false, so presence in the response
 * means "available right now" — there is no per-row availability flag.
 *
 * Indexes BOTH `product_id` (catalog id used by Algolia) and `id` (menu
 * listing id) so callers can pass either without us having to know which
 * Algolia returned.
 */
async function fetchInStockSet(
  creds: JaneApiCredentials,
  storeId: number,
): Promise<Set<string>> {
  const base = getApiBase();
  const cacheKey = `${creds.clientSlug}:${storeId}:${base}`;
  const cached = STOCK_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.productIds;

  let token = await getAccessToken(creds);
  let paginationId: number | null = null;
  let pages = 0;
  const productIds = new Set<string>();
  let total: number | null = null;

  while (pages < MAX_PAGES) {
    const url = new URL(`${base}/roots/menu_api/v1/menu_products`);
    url.searchParams.set('store_id', String(storeId));
    url.searchParams.set('page_size', String(PAGE_SIZE));
    url.searchParams.set('include_invisible_and_out_of_stock', 'false');
    if (paginationId !== null) {
      url.searchParams.set('pagination_id', String(paginationId));
    }

    let res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    // Token expired between cache hit and request — refresh once.
    if (res.status === 401) {
      clearAccessToken(creds);
      token = await getAccessToken(creds);
      res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`[jane-api] checkStock ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      data?: { menu_products?: Array<{ id?: number | string; product_id?: number | string }> };
      metadata?: { count?: number; total?: number; pagination_id?: number | null };
    };

    const items = data?.data?.menu_products ?? [];
    if (items.length === 0) break;

    for (const p of items) {
      if (p.product_id != null) productIds.add(String(p.product_id));
      if (p.id != null) productIds.add(String(p.id));
    }

    if (typeof data?.metadata?.total === 'number') total = data.metadata.total;
    const next = data?.metadata?.pagination_id;
    if (next == null || next === paginationId) break; // last page or stuck cursor
    paginationId = next;
    pages++;

    // Hit the documented total — no need to spin another page.
    // (productIds counts both id+product_id per row, so divide by 2.)
    if (total !== null && productIds.size >= total * 2) break;
  }

  STOCK_CACHE.set(cacheKey, { productIds, expiresAt: Date.now() + STOCK_CACHE_TTL_MS });
  return productIds;
}

/**
 * Verify that the products Algolia returned are still in stock right now.
 * Algolia's index lags actual inventory by ~5 min — by the time the customer
 * sees a card and clicks, the SKU may have sold out. This check adds a
 * freshness pass between Algolia's render and the user's click.
 *
 * Implementation note (2026-05-05): the Menu API V1 LIST endpoint does NOT
 * support an `?ids=` filter — confirmed via Swagger response schema. It only
 * supports `store_id`, `pagination_id`, `page_size`, and the
 * `include_invisible_and_out_of_stock` toggle. We paginate the whole store
 * (default filter excludes OOS), build a Set of in-stock ids, cache it for
 * 90s, and answer membership queries from the Set. Per-row availability
 * flags (available_for_pickup / available_for_delivery) do NOT exist on
 * this endpoint, so the `channel` parameter is currently informational only —
 * presence in the in-stock set means "available for either channel that
 * Jane's storefront exposes."
 */
export async function checkStock(
  creds: JaneApiCredentials,
  productIds: Array<string | number>,
  storeId: number,
  // Kept for caller-compat; LIST endpoint doesn't expose channel flags yet.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _channel: 'pickup' | 'delivery' | 'either' = 'either',
): Promise<StockCheckResult> {
  if (productIds.length === 0) return { inStock: {}, unknown: [] };

  const ids = productIds.map(String);
  const inStockSet = await fetchInStockSet(creds, storeId);

  const inStock: Record<string, boolean> = {};
  for (const id of ids) inStock[id] = inStockSet.has(id);

  // No "unknown" bucket anymore — pagination walks the whole store, so
  // absence from the set is a definitive "out of stock."
  return { inStock, unknown: [] };
}

// ── Today's Deals / Specials (Menu API V1) ─────────────────────────────────
//
// Pulls the dispensary's active specials from Jane's Menu API V1 specials
// endpoint. Powers the widget's "Today's Deals & Discounts" surface on
// chat open — preferred over best_seller_rank since it's both more
// merchant-controlled and more conversion-relevant (a deal IS a CTA).
//
// Endpoint: GET /roots/menu_api/v1/stores/{store_id}/specials
// Query:    enabled=true (we only want active specials), page_size=20
// Returns:  array of specials, each containing the special_type, title,
//           discount %, applicable products, etc.
//
// We surface ONE primary special at a time (the most relevant, prioritized
// by special_type rank). The widget renders it as a header strip with
// title + savings + a "Shop the deal" CTA.

export interface JaneSpecial {
  id: number | string;
  title: string;
  description?: string;
  special_type?: string; // 'product' | 'cart_total' | 'qualified_group' | 'bundle' | 'bulk_pricing'
  discount_amount?: number;
  discount_percent?: number;
  discount_type?: string; // 'percent' | 'dollar'
  enabled?: boolean;
  starts_at?: string;
  ends_at?: string;
  promo_code?: string;
  store_id?: number;
  product_ids?: Array<number | string>;
}

interface SpecialsResult {
  specials: JaneSpecial[];
  /** Total count Jane reports for this store/filter combo. */
  total: number;
}

// 10-min cache: specials change rarely (operator edits in Jane backend)
const SPECIALS_CACHE = new Map<string, { specials: JaneSpecial[]; total: number; expiresAt: number }>();
const SPECIALS_CACHE_TTL_MS = 10 * 60 * 1000;

export function clearSpecialsCache(): void {
  SPECIALS_CACHE.clear();
}

/**
 * Fetch today's active specials for a Jane store. Honors the Menu API V1
 * pagination conventions (page_size + pagination_id) and the `enabled=true`
 * filter so we only surface live deals.
 *
 * Soft-fails to empty array on auth errors, network failures, or non-2xx
 * responses — the caller should treat absence as "no deals to surface."
 */
export async function getTodaysSpecials(
  creds: JaneApiCredentials,
  storeId: number,
  opts: { pageSize?: number; specialType?: string } = {},
): Promise<SpecialsResult> {
  const base = getApiBase();
  const pageSize = Math.max(1, Math.min(opts.pageSize ?? 20, 50));
  const cacheKey = `${creds.clientSlug}:${storeId}:${opts.specialType ?? 'any'}:${pageSize}:${base}`;
  const cached = SPECIALS_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { specials: cached.specials, total: cached.total };
  }

  let token: string;
  try {
    token = await getAccessToken(creds);
  } catch (err) {
    console.warn('[jane-api/specials] token fetch failed:', err instanceof Error ? err.message : err);
    return { specials: [], total: 0 };
  }

  const url = new URL(`${base}/roots/menu_api/v1/stores/${storeId}/specials`);
  url.searchParams.set('enabled', 'true');
  url.searchParams.set('page_size', String(pageSize));
  if (opts.specialType) url.searchParams.set('special_type', opts.specialType);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
  } catch (err) {
    console.warn('[jane-api/specials] fetch failed:', err instanceof Error ? err.message : err);
    return { specials: [], total: 0 };
  }

  // 401 → expired token (cache check passed but Cognito rotated). Refresh once.
  if (res.status === 401) {
    clearAccessToken(creds);
    try {
      const fresh = await getAccessToken(creds);
      res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Authorization: `Bearer ${fresh}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
    } catch {
      return { specials: [], total: 0 };
    }
  }

  if (!res.ok) {
    console.warn(`[jane-api/specials] non-2xx ${res.status} store=${storeId}`);
    return { specials: [], total: 0 };
  }

  const data = (await res.json()) as {
    data?: { specials?: JaneSpecial[] };
    specials?: JaneSpecial[];
    metadata?: { count?: number; total?: number };
  };

  // Jane Menu API V1 wraps list responses in { data: { ... }, metadata: { ... } }
  // but defensively unwrap a flat .specials if the shape ever changes.
  const specials = data?.data?.specials ?? data?.specials ?? [];
  const total = data?.metadata?.total ?? specials.length;

  SPECIALS_CACHE.set(cacheKey, { specials, total, expiresAt: Date.now() + SPECIALS_CACHE_TTL_MS });
  return { specials, total };
}

// ── Future phases (stubs for documentation purposes) ────────────────────────
//
// Phase 2 (cart deeplinks): Allie confirmed Purple Lotus uses unmanaged
// localStorage carts. No API write needed — the existing /product/{id} URL
// already deeplinks. Will revisit if PL migrates to managed carts.
//
// Phase 3 (order status): blocked on user-auth-context handoff from the
// storefront. Tracked in tasks/widget-jane-api-hybrid-2026-04-23.md.
