# Widget × Jane API Hybrid — Phases 1a + 1b

**Date:** 2026-04-23
**Context:** After Allie @ Jane confirmed auth scheme + endpoints (see chat). Per-dispensary credentials. Bearer-token OAuth2. Cart manipulation deferred (Purple Lotus uses unmanaged localStorage cart). Order status deferred (needs user auth context).

---

## Phase 1a — Client-side context (no Jane API)

Allie's P.S. revealed Purple Lotus exposes:
- Cookie `JANE_STORE` → currently selected store ID
- Cookie `ORDER_TYPE` → `pickup` or `delivery`
- localStorage `shopping-cart` → current cart contents

The widget script runs on `plpcsanjose.com` so it can read these directly. No Jane API needed.

### Tasks
- [ ] **W1** Widget script reads `JANE_STORE`/`ORDER_TYPE` cookies + `shopping-cart` localStorage at sendMessage time
- [ ] **W2** POST body to `/api/widget/chat` gains `janeStore` / `orderType` / `cart` fields
- [ ] **W3** Chat route accepts new fields, uses `janeStore` as resolved store (priority over `cfg.jane_default_store_id`)
- [ ] **W4** When `orderType` is set, narrow the in-stock Algolia filter to ONLY that channel (`available_for_pickup:true` for pickup, `available_for_delivery:true` for delivery — instead of OR'ing both)
- [ ] **W5** Pass cart context into LLM system prompt so AI can say "you already have X — want a complement?"
- [ ] **W6** Tests for the new query shape + cart context injection
- [ ] **W7** tsc + vitest + sanity QA

---

## Phase 1b — Jane Menu API V1 real-time stock check

Algolia's index can lag actual inventory. After we surface 4 cards from Algolia, verify availability with Jane's authoritative Menu API. Mark out-of-stock cards with an overlay.

### Tasks
- [ ] **J1** OAuth2 token exchange in `lib/integrations/jane-api.ts` — module-level token cache keyed by clientSlug, refresh ~5 min before expiry
- [ ] **J2** `checkStock(creds, productIds, storeId, orderType)` — batch lookup via Menu API V1, returns `Record<productId, inStock>`
- [ ] **J3** Widget chat route: after Algolia returns top-N, verify with Jane, attach `outOfStock` flag to each card
- [ ] **J4** Widget renderCards: overlay "OUT OF STOCK" badge on cards where `outOfStock === true`, dim the card
- [ ] **J5** Sandbox test (env: `JANE_API_BASE_URL=https://demo-api.nonprod-iheartjane.com` + sandbox creds, store 2100)
- [ ] **J6** Tests with mocked fetch — token cache hit/miss, batch shape, parsing
- [ ] **J7** Document the two new env vars on the dashboard for next dispensary onboarding

---

## Risk + mitigations

- **OAuth2 endpoint URL not explicitly documented** — using standard Cognito client_credentials pattern (`POST {base}/oauth/token`, form-encoded). If wrong, tests against sandbox will surface it before production.
- **Menu API V1 stock endpoint shape unknown** — implementing based on REST conventions (`GET /products?store_id=X&ids=A,B,C`). Same fallback: sandbox + iterate.
- **Rate limits unknown** — caching token aggressively (refresh only at expiry), batch product lookups, cache stock-check responses 60s per (store, productId) tuple.

---

## Review (filled after execution)

Pending.
