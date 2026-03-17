# Kyra Website Builder — Sell-Readiness Analysis
**Revised:** March 14, 2026  
**Author:** Steve (AI CEO)  
**Status:** Post-sprint audit — what's done, what's left before first sale

---

## 🎯 Can We Sell Today?

**Yes, with caveats.** Core flow works end-to-end. But 6 things must be done before the first paid client or the product will underdeliver and create refund requests.

---

## ✅ What's Working (Done Today)

| Feature | Status |
|---------|--------|
| Wizard (7 steps) → AI content → VPS build → Live HTTPS | ✅ Working |
| Brand colors via CSS vars (`--brand-primary`) | ✅ Fixed (was hardcoded red) |
| Outfit + Inter fonts | ✅ Live |
| Hero: 2-col layout, keyword colored in brand primary | ✅ Fixed |
| Hero: Full lead form card (5 fields, real API) | ✅ Live |
| Trust badges (rating · years · 24/7) | ✅ Live |
| Services hover dropdown | ✅ Fixed |
| Google Maps on contact page | ✅ Live |
| Contact lead form → Kyra Conversations | ✅ Live |
| FAQ schema (FAQPage markup) | ✅ Working |
| Blog + blog post routes | ✅ Working |
| City pages | ✅ Working |
| Canonical URL + OG tags | ✅ Working |
| Sitemap + robots.txt | ✅ Working |
| Chat widget embed | ✅ Working |
| `WIDGET_CLIENT_ID` replaced at build time | ✅ Working |
| heroSubtitle truncation | ✅ Fixed |
| Dark overlay on hero photo | ✅ Fixed |

---

## 🔴 MUST FIX BEFORE FIRST SALE (6 items)

### 1. Knowledge sync — AI chatbot is blind to website content
**What:** `syncSiteToKnowledgeBase()` is fully built but **never called**. Every deployed site has an AI chat widget that has zero knowledge of the business's services, hours, location, or pricing.  
**Impact:** Client's first customer asks "Do you service Santa Clara?" → AI says "I don't have that info." Client is embarrassed. Refund request.  
**Fix:** Add one line to `lib/sites/content-engine.ts` after `generateSiteContent()` completes:
```ts
await syncSiteToKnowledgeBase(siteId);
```
**Effort:** 20 minutes.

---

### 2. "Site is live" moment is missing
**What:** After 2+ minutes of watching a spinner, the wizard just redirects to the dashboard. Zero celebration. No "Your site is live at [URL]!" message.  
**Impact:** The most emotionally powerful moment in the product is currently a disappointment. Agencies demo this to clients. A flat redirect kills the wow.  
**Fix:** After build completes, show a full-screen celebration:
- Big ✅ + live URL + "Visit Site" button
- "Share with your client" copy button  
- Telegram notification to agency: "🌐 [Business Name] site is live: [URL]"
**Effort:** 2 hours.

---

### 3. Photos from wizard are never uploaded
**What:** The wizard has a photo upload UI (Step 4). Users drag photos in. The `POST /api/agency/sites/[id]/photos` route exists and works. But `saveToApi()` in Step 4 never calls it — photos are `File[]` objects in browser memory that silently disappear.  
**Impact:** Every site ships with generic picsum.photos placeholders. No client photos = low trust = site looks fake.  
**Fix:** In `saveToApi()` when `currentStep === 4`, upload photos via `FormData` to the photos route. The provisioner already reads `photos` from the build payload.  
**Effort:** 1.5 hours.

---

### 4. AI suggest is disabled in wizard
**What:** The "differentiator" field in Step 1 has a Sparkles button for AI-suggested copy but it's marked `disabled`. Users stare at a blank field not knowing what to write. `canAdvance()` blocks progression if it's empty, causing abandonment.  
**Fix:** Enable the Sparkles button — call OpenRouter with a simple prompt: *"Give 3 short differentiators (10–15 words each) for a [industry] business in [city] with [years] years experience."* User picks one.  
Also: make the field optional so a user can skip it and have AI fill something reasonable.  
**Effort:** 1 hour.

---

### 5. More industry defaults (14 industries missing)
**What:** `lib/sites/industry-defaults.ts` covers 10 industries. 14 common ones have no defaults: `roofing`, `landscaping`, `lawn-care`, `cleaning`, `painting`, `flooring`, `remodeling`, `pest-control`, `locksmith`, `moving`, `salon`, `medical`, `real-estate`, `accounting`.  
**Impact:** These businesses go through the wizard and get blank service suggestions, wrong `needsGeoPages` behavior, and generic city lists with Bay Area defaults.  
**Fix:** Add defaults for all 14. Each takes ~5 minutes.  
**Effort:** 1.5 hours.

---

### 6. City state field missing from city pages
**What:** Wizard `saveToApi()` in Step 3 saves cities as `{ name, slug }` with no `state` field. Template renders `{area.name}, {area.state}` → "Scottsdale, undefined" on every city page header and in schema markup.  
**Fix:** Derive state from `data.state` (business address) when saving cities.  
**Effort:** 20 minutes.

---

## 🟠 HIGH — Fix in Week 1 After Launch

### 7. GA4 not injected into template
**Status:** Settings UI has GA4 field. Build payload sends `ga4Id`. But `generateThemeTs()` in provisioner doesn't write it to `theme.ts`, so `THEME.ga4Id` is always `undefined`. GA4 block in `layout.tsx` never fires.  
**Effort:** 30 minutes.

### 8. Logo not displayed
**Status:** Wizard has logo upload. `BUSINESS.logoUrl` is in constants. Navbar ignores it — hardcodes text name. Logo should show above text name with a fallback.  
**Effort:** 20 minutes.

### 9. Content similarity check (duplicate content risk)
**Status:** Full TF-IDF check is built in `content-checker.ts` but never called. Two agencies in the same city building HVAC sites will get near-identical content. Google penalizes this at scale.  
**Effort:** 30 minutes to wire it in.

### 10. Bulk generator uses wrong field (`client.business_name` vs `client.name`)
**Status:** `app/(dashboard)/agency/website/bulk/page.tsx` maps `client.business_name` but API returns `name`. Every bulk-generated site gets `undefined` as the business name. Confirmed bug.  
**Effort:** 5 minutes.

### 11. Growth Engine is synchronous — will timeout
**Status:** `POST /api/agency/sites/[id]/growth` calls OpenAI synchronously, waits for full response. Vercel serverless = 10s max (300s with maxDuration, already set). But it's bad UX. Should stream or fire-and-forget.  
**Effort:** 1 hour.

---

## 🔵 STRATEGIC — Week 2+ (After First Revenue)

### 12. Client portal (read-only)
Business owners whose site Kyra built have no login. They can't see traffic, conversations, or AI analytics. A `kyra.conversionsystem.com/site/[shareToken]` portal would reduce churn, create upsell opportunities, and let agencies impress clients.

### 13. Quick Start (3-field wizard)
Business name + industry + phone → AI generates everything else → live in 60 seconds.  
This is the demo hook that closes sales. "Watch me build your site in 60 seconds" is a perfect cold outreach opener.

### 14. "Site is live" shareable card + QR code
When site goes live: generate a share card with the URL, QR code, and "Built with Kyra" branding. Agency shares with client. Creates organic marketing.

### 15. Internal linking automation
Service pages should link to city×service pages. City pages should cross-link to related services. Zero internal links = major Local SEO handicap. Can be fully automated.

### 16. A/B testing / CRO layer
Simple: Kyra randomly assigns layout variants and tracks which converts better via the lead form. After 50 leads, picks the winner. No competitor has this.

---

## Sprint Plan

### This Week (Pre-Sale Sprint)
| # | Task | Time | Owner |
|---|------|------|-------|
| 1 | Wire `syncSiteToKnowledgeBase` | 20min | Steve |
| 2 | Enable AI-suggest in wizard differentiator | 1hr | Steve |
| 3 | Wire photo upload in Step 4 | 1.5hr | Steve |
| 4 | "Site is live" celebration screen | 2hr | Steve |
| 5 | Fix 14 missing industry defaults | 1.5hr | Steve |
| 6 | Fix city state field | 20min | Steve |
| **Total** | | **~7hrs** | |

### Next Week (Post-Launch Polish)
GA4 injection, logo display, similarity check, client portal MVP, Quick Start wizard.

---

## Live Test Site
https://frost-hvac-test.sites.kyra.conversionsystem.com  
**Score: 40/40 automated checks.** 2-col hero, brand colors, keyword highlighted, lead form, maps, FAQ schema, blog posts, city pages, canonical, sitemap — all passing.

---

*Last updated: March 14, 2026 by Steve*
