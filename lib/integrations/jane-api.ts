// ────────────────────────────────────────────────────────────────────────────
// Jane Partner API client — per-dispensary credentials
//
// This module is the AUTHENTICATED counterpart to lib/integrations/jane.ts
// (which uses public Algolia search-only keys). The Algolia layer handles
// product catalog reads; this layer handles writes/auth-required reads:
// real-time stock, cart manipulation, order status lookup, etc.
//
// Strategy: HYBRID — Algolia stays primary for search (sub-5ms latency).
// Jane API layered on top for the four capabilities Algolia can't do.
// See tasks/widget-jane-api-hybrid-2026-04-23.md for the full delivery plan.
//
// Auth scheme: pending confirmation from Jane (Allie). Placeholder client below
// resolves credentials but does not sign requests until we know the scheme.
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
 * Naming convention (per-dispensary):
 *   client_id = "968cae23-e978-46bd-8f4f-23ed2e82d7be"
 *   →  JANE_PARTNER_UID_968CAE23      (Jane partner UID)
 *   →  JANE_PARTNER_SECRET_968CAE23   (Jane partner secret)
 *
 * Returns null when either var is missing — callers fall through to the Algolia
 * search path so the widget keeps working before Jane onboarding is complete.
 *
 * The slug is the FIRST eight hex chars of the UUID, uppercased. We validate
 * the shape so a malformed clientId can't accidentally read an arbitrary env
 * var (e.g. preventing `clientId="../../../OPENAI_API_KEY"` style abuse — not
 * that env-var lookups are vulnerable in the same way as filesystem paths,
 * but defensive parsing keeps the surface clean).
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

/**
 * Convenience: does this client have Jane API credentials configured?
 * Cheaper than getJaneCredentials() when the caller only needs a boolean.
 */
export function hasJaneCredentials(clientId: string): boolean {
  return getJaneCredentials(clientId) !== null;
}

// ── Auth scheme — STUB until Allie confirms ─────────────────────────────────
//
// Once we know whether Jane uses OAuth2 (Bearer), HMAC-SHA256 signing, or
// plain X-Partner-Id / X-Partner-Secret headers, this is where the request
// signer lives. Each scheme implementation will export a `buildAuthHeaders`
// or `signRequest` function consumed by the per-endpoint helpers below.
//
// export async function buildAuthHeaders(creds, opts) { ... }

// ── Endpoint helpers — STUB until base URL + scheme confirmed ───────────────
//
// Phase 1: real-time stock check (single product or batch)
//   export async function checkStock(creds, productIds, storeId) { ... }
//
// Phase 2: add-to-cart deeplink builder
//   export async function buildCartUrl(creds, productId, weight, storeId) { ... }
//
// Phase 3: order status lookup (by phone + order short ID)
//   export async function lookupOrder(creds, phoneE164, orderShortId) { ... }
//
// All three depend on Allie's confirmation of base URL + auth scheme.
