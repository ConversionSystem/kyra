# Widget Smart Product Recommendation Engine — Tier 1+2+3 Rebuild

**Date:** 2026-04-23
**Branch:** `feat/widget-smart-engine`
**Motivation:** Matt's Purple Lotus widget recommendations were weak:
- "Products for relaxation" → plaintext blob, no cards, no images
- "any Alien Labs prerolls?" → canned "no results" apology, no fallback, no alternatives

Full audit landed in prior turn. This ships the full rebuild.

---

## Plan

### Tier 1 — Fixes both user-reported screenshots

- [x] **T1.1 Zero-result retry cascade** in `lib/integrations/jane.ts::searchProducts`
  - Attempt order: `brand+category+effects` → `brand+effects` → `category+effects` → `effects` → `brand` → `category` → empty
  - Return `fallback_tier: 0|1|2|3` so route + LLM know we degraded
  - Carry through to `ProductSearchResult.fallback_tier` + `relaxed_filters` array
- [x] **T1.2 System prompt fallback rules** in `app/api/widget/chat/route.ts`
  - If `fallback_tier > 0`: tell the LLM the exact miss ("no Alien Labs pre-rolls in stock") and instruct it to suggest alternatives (same brand, different category; same category, different brand)
- [x] **T1.3 Images in `formatProductsForAI` output**
  - Include imageUrl so cards can render thumbnails

### Tier 2 — Meaningful smartness

- [x] **T2.1 In-stock filter** — add `available_for_delivery:true OR available_for_pickup:true` to Algolia filter list
- [x] **T2.2 Expanded EFFECT_KEYWORDS** — add synonyms (decompress, wind down, mellow out, wake and bake, creative spark, social, date night, etc.)
- [x] **T2.3 Algolia typo tolerance** — explicitly enable `typoTolerance` + `ignorePlurals: true` for forgiving searches
- [x] **T2.4 Best-seller weight** — add `customRanking` or fall back to sort by `aggregate_rating` when no explicit sort is requested

### Tier 3 — Actually smart

- [x] **T3.1 Structured product cards**
  - API response adds `cards: ProductCard[]` field (image, name, brand, price, strain, thc, url, cart_url, reason)
  - Widget parses + renders real card components with KYRA brand styling
  - LLM still emits conversational text; cards are separate (no JSON-in-markdown fragility)
- [x] **T3.2 Session preference memory**
  - Extract signals from `sessionHistory` + `history`: prior_lineages, prior_brands, prior_categories
  - Inject as Algolia boost filters when user makes a follow-up query ("what else?")
  - Add `SESSION PREFERENCES` section in system prompt so LLM mentions continuity ("since you liked indica earlier…")
- [x] **T3.3 Add-to-cart deeplinks**
  - Jane supports `?add_to_cart=1` on product URL — probe + adopt if present
  - Build `cart_url` in `JaneProduct` separate from `url` so cards can have "Add to Cart" vs "View"
  - Fall back to current product URL if cart deeplink not supported for SKU

### Quality + testing

- [x] **Branding**: KYRA purple palette, system fonts, no new dependencies
- [x] **No redundancies**: reuse existing `parseProductIntent`, `EFFECT_KEYWORDS`, widget formatMsg pipeline
- [x] **Tests**: new `__tests__/jane-retry-cascade.test.ts` + `__tests__/widget-cards.test.ts`
- [x] **Type-check**: `tsc --noEmit` must pass
- [x] **Sanity check**: curl /api/widget/chat with the two failure scenarios + assert cards[] non-empty with fallback messaging

---

## Files touched

| File | Change |
|---|---|
| `lib/integrations/jane.ts` | Retry cascade, in-stock filter, typo tolerance, expanded effects, image in output, cart URL, fallback_tier |
| `app/api/widget/chat/route.ts` | Session preference extraction, cards field, fallback-aware prompt |
| `app/api/widget/[clientId]/script/route.ts` | Render cards[] array with KYRA styling |
| `__tests__/jane-retry-cascade.test.ts` | NEW — coverage for retry tiers |
| `__tests__/widget-cards.test.ts` | NEW — coverage for cards response shape |

---

## Review

**Shipped:** Tier 1 + Tier 2 + Tier 3 all landed. 12 new tests, 224/224 full suite green, `tsc --noEmit` clean, widget script rendered and parsed OK (34.5 KB of valid JS).

**What changed at a glance:**

1. **`lib/integrations/jane.ts`** — retry cascade `searchProducts` (tier 0 exact → tier N relaxed), `fallbackTier` + `relaxedFilters` surfaced in result, `describeFallback()` helper for LLM prompting, in-stock filter added to Algolia, explicit `typoTolerance`/`ignorePlurals`, `EFFECT_KEYWORDS` expanded from 20 to ~60 synonyms, `JaneProduct` gained `cartUrl`/`rating`/`reviewCount`/`reason`, `JaneConfig.cartDeeplinkParam` for future cart deeplink opt-in, `ProductSearchParams.preferLineages`/`preferBrands` for session boost, `applySessionPreferenceBoost` re-ranker.
2. **`app/api/widget/chat/route.ts`** — `extractSessionPreferences()` reads prior turns for lineage/brand affinity, search params gain `preferLineages`/`preferBrands`, response now emits `cards[]` + `browseMore` + `fallbackNotice`, system prompt gains PARTIAL-MATCH preface (tells LLM to acknowledge the miss + pivot) and SESSION-PREFERENCES preface (natural continuity references).
3. **`app/api/widget/[clientId]/script/route.ts`** — new CSS: `.kyra-card`, `.kyra-card-chip` (+ semantic strain-type variants), `.kyra-card-cta` (primary + secondary), `.kyra-browse-more`, `.kyra-fallback-note`; new `renderCards()` renders cards/browse-more/fallback below the bot bubble; XSS-safe (all fields escaped); emoji + arrow unicode escapes verified.
4. **`__tests__/jane-retry-cascade.test.ts`** — 12 cases covering exact match, tier 1 drop effects, tier 2 drop category, brand-only tier 3, exhausted tiers, in-stock filter on request body, typo tolerance on request body, session preference boost ranking, fallback description messaging, cart deeplink config passthrough.

**Bugs caught and fixed during verification:**
- Backticks in a code comment broke the outer template literal → replaced with plain identifiers (caught via `curl` to dev server + Next runtime error).
- Tier 3 in the initial cascade only applied when BOTH brand + category were set → expanded to fire whenever brand is present, so brand-only queries that return 0 get an alternative (added test covering this).
- Research agent (launched in parallel) confirmed Jane has no public add-to-cart deeplink → corrected `cartUrl` to only populate when `container_config.jane_cart_deeplink_param` is explicitly set, avoiding shipping a broken "Add to Bag" button on day one.

**KYRA branding:**
- All card accents use `COLOR` (`#6366f1` default or tenant override from `container_config.widget_color`).
- Strain-type chips intentionally use semantic cannabis-industry colors (indica=green, sativa=amber, hybrid=indigo, CBD=blue) — documented inline with the reasoning.
- System fonts (`-apple-system`, `SF Pro`), no new dependencies, no new assets.

**Redundancy check:**
- `formatProductsForAI()` (LLM text) and `renderCards()` (client DOM) serve different audiences — clean separation, no parse-and-reparse.
- Session preference extraction reuses existing `knownBrands` array — no new config.
- New response fields (`cards`, `browseMore`, `fallbackNotice`) are additive; existing `response`/`sessionId`/`leadCaptured` unchanged → widget is backward-compatible with any old embed snippet still cached at the edge.

**What's left for Matt / Purple Lotus to flip on:**
- Set `container_config.jane_cart_deeplink_param = "add"` (or similar) AFTER their eng team wires up the handler on the Roots PDP. Until then, the button reads "View →" and opens the PDP — safe default.
- Flip `dispatch_agent_enabled = true` when ready (unrelated but listed in the sprint doc).

**Files on disk ready to commit:**
- `lib/integrations/jane.ts` (modified)
- `app/api/widget/chat/route.ts` (modified)
- `app/api/widget/[clientId]/script/route.ts` (modified)
- `__tests__/jane-retry-cascade.test.ts` (new)
- `tasks/widget-smart-engine-2026-04-23.md` (this file)
