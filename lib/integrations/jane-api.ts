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
  /** Map productId → in-stock for the requested channel. */
  inStock: Record<string, boolean>;
  /** Products we couldn't find in Jane's response (treat as unknown, NOT out of stock). */
  unknown: string[];
}

/**
 * Verify that the products Algolia returned are still in stock right now.
 * Algolia's index can lag actual inventory by several minutes — by the time
 * the customer sees a card and clicks, the SKU may have sold out. This check
 * adds a freshness pass between Algolia's render and the user's click.
 *
 * Returns inStock map. Callers attach an `outOfStock: true` flag to cards
 * Jane reports as unavailable; cards Jane doesn't return at all are left
 * alone (could be a partial response or pagination edge — fail open).
 *
 * NOTE: the exact Menu API V1 endpoint shape isn't in the public docs Allie
 * shared. Implementing the most common REST shape (GET /menu/v1/products
 * with comma-separated ids + store_id query). Sandbox testing will surface
 * any divergence — if Jane uses a different path, only this function changes.
 */
export async function checkStock(
  creds: JaneApiCredentials,
  productIds: Array<string | number>,
  storeId: number,
  channel: 'pickup' | 'delivery' | 'either' = 'either',
): Promise<StockCheckResult> {
  if (productIds.length === 0) return { inStock: {}, unknown: [] };

  const ids = productIds.map(String);
  const token = await getAccessToken(creds);
  const base = getApiBase();

  // Endpoint discovered 2026-05-05 via the live Swagger UI Allie pointed us
  // at (https://api.iheartjane.com/jane-api-docs/index.html?urls.primaryName=Menu%20API%20V1%20Docs).
  // The actual path is /roots/menu_api/v1/menu_products — three corrections
  // from what we'd been guessing for two weeks:
  //   - /roots/ prefix (we'd dropped this entirely)
  //   - menu_api  (we'd been using "menu")
  //   - menu_products (plural, underscore — we'd been using "products")
  // Everything we'd been hitting (/menu/v1/products etc.) was a non-existent
  // path on api.iheartjane.com, which is why Cloudflare returned its generic
  // edge HTML 403 for every variant.
  const url = new URL(`${base}/roots/menu_api/v1/menu_products`);
  url.searchParams.set('store_id', String(storeId));
  url.searchParams.set('ids', ids.join(','));

  let res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(5000),
  });

  // 401 → token expired between cache check and request. Refresh once.
  if (res.status === 401) {
    clearAccessToken(creds);
    const fresh = await getAccessToken(creds);
    res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${fresh}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[jane-api] checkStock ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    products?: Array<{
      product_id?: number | string;
      id?: number | string;
      available_for_pickup?: boolean;
      available_for_delivery?: boolean;
    }>;
  };

  const products = data.products || [];
  const inStock: Record<string, boolean> = {};
  const seen = new Set<string>();

  for (const p of products) {
    const pid = String(p.product_id ?? p.id ?? '');
    if (!pid) continue;
    seen.add(pid);
    const pickup = p.available_for_pickup === true;
    const delivery = p.available_for_delivery === true;
    if (channel === 'pickup') inStock[pid] = pickup;
    else if (channel === 'delivery') inStock[pid] = delivery;
    else inStock[pid] = pickup || delivery;
  }

  const unknown = ids.filter((id) => !seen.has(id));
  return { inStock, unknown };
}

// ── Future phases (stubs for documentation purposes) ────────────────────────
//
// Phase 2 (cart deeplinks): Allie confirmed Purple Lotus uses unmanaged
// localStorage carts. No API write needed — the existing /product/{id} URL
// already deeplinks. Will revisit if PL migrates to managed carts.
//
// Phase 3 (order status): blocked on user-auth-context handoff from the
// storefront. Tracked in tasks/widget-jane-api-hybrid-2026-04-23.md.
