# Kyra Website Builder — Full Deep Analysis
**Date:** March 14, 2026  
**Author:** Steve (AI CEO)  
**Status:** Verified against live codebase + VPS template

---

## Executive Summary

The wizard collects great data. The content engine generates solid AI copy. The infrastructure works.  
**But the template ignores most of what gets built.** Brand colors, photos, logo, booking URL, design styles, blog posts, and knowledge sync are all collected or generated — and then silently dropped. The 200% improvement is mostly on the **VPS template side**, not the Kyra dashboard.

---

## System Architecture Map

```
Wizard (7 steps)
  → Supabase (client_sites + site_pages)
  → Content Engine (OpenRouter/OpenAI)
  → VPS Provisioner (/build-and-deploy)
    → Next.js generic template
      → Static output → nginx → Traefik SSL → Live URL
```

**Files analyzed:**
- `app/(dashboard)/agency/website/create/page.tsx` — 1,790 lines
- `lib/sites/content-engine.ts` — 959 lines
- `lib/sites/prompts.ts` — 571 lines
- `lib/sites/industry-defaults.ts` — 238 lines
- `lib/sites/content-checker.ts` — 201 lines (dead code)
- `lib/sites/knowledge-sync.ts` — 191 lines (dead code)
- `app/api/agency/sites/[id]/build/route.ts` — 185 lines
- VPS: `/opt/kyra/site-templates/generic/` — full template

---

## 🔴 CRITICAL — Broken Right Now

### 1. Photos are never uploaded to the server
**Where:** Wizard Step 4 → `saveToApi(4)`  
**What happens:** Step 4 saves only `color_primary`, `color_secondary`, `design_style`, `tagline` — NOT photos or logo. The photos are `File[]` objects in browser memory that get silently dropped when the wizard advances. The photo upload API (`POST /api/agency/sites/[id]/photos`) exists and is fully built, but is never called from the wizard.  
**Result:** Every single site ships with zero real business photos.  
**Fix:** In `saveToApi(currentStep === 4)`, upload photos via `FormData` to the photos route before saving the JSON fields.

---

### 2. Brand colors are ignored in the template
**Where:** VPS `site-templates/generic/` — all components  
**What happens:** The system IS wired correctly: `THEME.colorPrimary` gets injected into `layout.tsx` as `--brand-primary`, which feeds `--color-primary` in `globals.css`. Tailwind v4 `@theme` block makes `bg-primary` available. BUT every component hardcodes `bg-red-600`, `text-red-500`, `shadow-red-600/25`, `border-red-500`. **70 hardcoded red references** across the template.  
**Result:** A client who picks blue, green, or purple in the wizard gets a red site every time.  
**Fix:** Global replace in VPS template. `bg-red-600` → `bg-primary`, `text-red-500` → `text-primary`, etc.

---

### 3. Design styles do nothing
**Where:** VPS `site-templates/generic/` — all pages  
**What happens:** `THEME.designStyle` is exported from `lib/theme.ts` and the value is stored in the DB. But zero conditional rendering checks it anywhere in the template. Every site regardless of `design_style: 'clean-light' | 'bold' | 'minimal'` renders the same dark/black layout.  
**Result:** The 4 design style options in the wizard are completely fake.  
**Fix:** Apply design-specific CSS classes conditionally based on `THEME.designStyle`. At minimum: `clean-light` should use white background + dark text, `bold` should use larger typography + strong contrasts, `minimal` should strip decorative elements.

---

### 4. Blog pages are generated but unreachable
**Where:** `lib/sites/content-engine.ts` → `buildTaskList()` + VPS template routes  
**What happens:** Content engine generates 2 evergreen blog posts per site (added in today's sprint). They're stored in `site_pages` with `page_type: 'blog'`. But the VPS template has no `/blog` or `/blog/[slug]` route. The pages exist in the DB and show in the editor, but navigating to the live URL returns 404.  
**Fix:** Add `/blog/page.tsx` (index) and `/blog/[slug]/page.tsx` (post) to the VPS template.

---

### 5. Logo is never displayed
**Where:** VPS `components/layout/navbar.tsx`  
**What happens:** Wizard has a logo upload UI. The photos API supports logo storage. `BUSINESS.logo_url` is defined in constants. But the Navbar component renders only `<div className="text-lg font-bold text-white">{BUSINESS.name}</div>` — no `<img>` tag, no conditional logo display.  
**Fix:** Add `{BUSINESS.logo_url ? <img src={BUSINESS.logo_url} alt={BUSINESS.name} /> : <span>{BUSINESS.name}</span>}` in Navbar.

---

### 6. GA4 is never injected into the template
**Where:** VPS `app/layout.tsx` + provisioner `generateThemeTs()`  
**What happens:** Settings page saves `ga4_id`. Build route passes `ga4Id` in the payload. But `generateThemeTs()` in the provisioner only writes `colorPrimary`, `colorSecondary`, `designStyle` — ignores `ga4Id`. And `app/layout.tsx` has no GA4 `<Script>` tag.  
**Fix:** Add `ga4Id` to `generateThemeTs()` output. Add conditional GA4 script in `layout.tsx`:
```tsx
{THEME.ga4Id && (
  <Script src={`https://www.googletagmanager.com/gtag/js?id=${THEME.ga4Id}`} strategy="afterInteractive" />
)}
```

---

### 7. Knowledge sync is dead code — AI chatbot stays blind
**Where:** `lib/sites/knowledge-sync.ts`  
**What happens:** `syncSiteToKnowledgeBase()` is fully built — reads site pages, formats them as knowledge documents, inserts to `knowledge_documents`, and triggers the client container to reload. It is **never called** from `content-engine.ts`, the generate route, or the build route.  
**Result:** When a customer asks the AI chatbot on the live site "what services do you offer?" or "are you available on weekends?", the AI has zero knowledge of the website content. It answers generically.  
**Fix:** Call `syncSiteToKnowledgeBase(siteId)` at the end of `generateSiteContent()` in content-engine.ts.

---

### 8. Content similarity check is dead code — duplicate content risk
**Where:** `lib/sites/content-checker.ts`  
**What happens:** Full TF-IDF cosine similarity check against all other sites in the same industry is built and tested. Threshold: 60% similarity triggers a warning. It is **never called** from anywhere.  
**Result:** Two agencies could generate near-identical HVAC sites in the same metro area. Google penalizes content farms. As Kyra scales this becomes a real SEO liability.  
**Fix:** Call `checkContentSimilarity(siteId, industry, region)` after `generateSiteContent()` completes. Surface warnings in the editor (yellow banner) not as a hard blocker.

---

## 🟠 HIGH IMPACT — Major Quality Gaps

### 9. Navbar "Services" links to the first service only
**File:** VPS `components/layout/navbar.tsx`  
```js
{ label: 'Services', href: `/services/${SERVICES[0]?.slug || ''}` }
```
This sends every visitor to AC Repair, or Drain Cleaning, or whatever the first service is. There's no services overview page. Should either link to a `/services` index page or render a dropdown.

---

### 10. Booking URL collected but never used
**Where:** Wizard Step 5 saves `booking_url` → DB. Template uses it nowhere.  
`BUSINESS` constants include `booking_url`. Not one button, hero CTA, or sticky bar in the template uses it. Clients who use Calendly, Housecall Pro, or Jobber get zero value.  
**Fix:** Replace or supplement the `/contact` CTA with `BUSINESS.bookingUrl` where available. Add "Book Now" button to hero and CTA section.

---

### 11. Stats bar hardcodes "Practice Areas"
**File:** VPS `app/page.tsx`  
```tsx
<div className="text-sm text-gray-400 mt-1">Practice Areas</div>
```
An HVAC company gets "6 Practice Areas." A cleaning company gets "4 Practice Areas."  
**Fix:** Map industry to label: `BUSINESS.industry === 'legal' ? 'Practice Areas' : 'Services'`.

---

### 12. No photo sections in the template
The template has: Hero, Stats Bar, Services Grid, Why Choose Us, Social Proof, Service Areas, FAQ, CTA. Not one section displays a photo. No gallery, no team section, no "Our Work" grid, no hero background photo.  
Photos are the #1 trust signal for local service businesses. A plumber showing before/after pipe work converts far better than generic text.  
**Fix:** Add optional photo gallery section to homepage and service pages. Renders from `BUSINESS.photos[]` when present, hides when empty.

---

### 13. Only 10 of 20+ industries have proper defaults
**File:** `lib/sites/industry-defaults.ts`  
**Covered:** `hvac`, `plumbing`, `electrical`, `dental`, `legal`, `restaurant`, `auto`, `fitness`, `veterinary`, `consulting`  
**Missing:** `roofing`, `landscaping`, `lawn-care`, `cleaning`, `painting`, `flooring`, `remodeling`, `pest-control`, `locksmith`, `moving`, `salon`, `medical`, `real-estate`, `accounting`  
Industries without defaults get empty `nearbyCities`, blank service suggestions, and wrong `needsGeoPages` behavior (defaults to `false` for service-area businesses).

---

### 14. City state field is always missing
**File:** Wizard `saveToApi`, Step 3  
```js
body.cities = data.selectedCities.map((c) => ({
  name: c,
  slug: c.toLowerCase().replace(/\s+/g, '-'),
  // ← NO state field
}))
```
Template renders `{area.name}, {area.state}` → shows "Foster City, undefined" on every city page. Also affects city page SEO and schema markup.  
**Fix:** When wizard adds cities, derive state from the business address `data.state` or prompt the user.

---

### 15. Schema markup generated but partially unused
**File:** `lib/sites/schema-generator.ts` — fully built with LocalBusiness, Service, FAQ, Breadcrumb  
The template imports `<SchemaMarkup>` and calls it on homepage and service pages. But city pages (`/[city]/page.tsx`) and about page have no schema injection despite being SEO-critical. City pages should have `LocalBusiness` + `BreadcrumbList`. About page should have `Person` or `LocalBusiness` schema.

---

## 🟡 MEDIUM — UX & Process Gaps

### 16. No notification when site goes live
After 2 minutes of watching a progress bar, the wizard just redirects. No celebration, no email, no Telegram ping, no "Your site is live at [URL] — share it!" moment. This is the most emotionally impactful moment in the product.

### 17. Regenerate UI hides feedback field
`POST /api/agency/sites/[id]/pages/[slug]` with `action: 'regenerate'` supports optional `feedback` string to guide the rewrite. The editor's Regenerate button doesn't expose this. Users click "Regenerate" and get random results with no ability to direct the AI. The API is ready — just needs a text input in the modal.

### 18. Wizard Step 1 blocks on `differentiator`
`canAdvance()` requires `data.differentiator.trim()` to be non-empty. Most small business owners don't know what their differentiator is — they'll write something bad or abandon. The Sparkles AI-suggest button is present but `disabled`. This should either be optional or the AI-suggest button should work.

### 19. City slug normalization is naive
`"St. Louis" → "st.-louis"` (period breaks URL), `"Mt. Vernon" → "mt.-vernon"`, `"Winston-Salem" → "winston-salem"` (correct, but hyphen collision possible). Needs proper slug library: remove punctuation, normalize diacritics, deduplicate hyphens.

### 20. `differentiator` field label is confusing
The field is labeled "What makes you different?" but gets saved as `owner_story`. These are semantically different things. The field should either be explicitly "Your Business Story" or be two separate fields — story and differentiator — with the differentiator used in prompts for unique selling props.

### 21. Bulk generation uses wrong field name
**File:** `app/(dashboard)/agency/website/bulk/page.tsx`  
```js
const res = await fetch('/api/agency/sites', {
  body: JSON.stringify({
    business_name: job.clientName, // ← where does clientName come from?
```
`agency_clients` stores `name` not `business_name`. The bulk page maps `client.business_name` but clients fetched from `/api/agency/clients` return `name`. This would send `undefined` as the business name for every bulk-generated site.

### 22. Growth Engine POST runs AI analysis synchronously
`POST /api/agency/sites/[id]/growth` calls OpenAI and waits for the full response before returning. On slow API days this could timeout (Vercel 10s limit on serverless functions). Should be fire-and-forget with polling.

---

## 🔵 STRATEGIC — 200% Opportunities

### 23. No client-facing portal
The business owner whose site Kyra built has no login. They can't see visitor stats, request changes, view their AI chatbot conversations, or see growth suggestions. This is a massive retention and upsell gap. A read-only `kyra.conversionsystem.com/site/[token]` portal would make clients feel ownership and reduce churn.

### 24. No "site is live" shareable moment
When generation completes, show a full-screen celebration:
- Live URL with preview thumbnail
- QR code for the business owner to scan
- One-click "Share to Twitter/LinkedIn" 
- "Copy link to send to your client" button  
Agencies use this as their demo wow moment. Making it visual creates organic marketing.

### 25. No Quick Start path
7 steps is too many for a demo or a busy agency owner. A "Quick Launch" — business name + industry + phone + city → generate site in 60 seconds — as an alternative to the full wizard would be a killer hook. Users fill in branding details after they see the site working.

### 26. Content generation is model-mixed but prompt quality varies
- Homepage: Claude Sonnet ✅ Good
- About: Claude Sonnet ✅ Good  
- Services: GPT-4o ✅ Good  
- City pages: GPT-4o ✅ Good  
- City×Service: GPT-4o-mini ⚠️ Acceptable  
- FAQ: Claude Haiku ⚠️ Acceptable  
- Blog: GPT-4o-mini ⚠️ Acceptable  
The tier-2/3 pages (city×service, FAQ, blog) are generated with cheaper models and shorter prompts. At scale these are the pages that rank — they get 60% of local search traffic. Investing in better prompts for these (even if keeping the cheaper model) would dramatically improve SEO performance.

### 27. No A/B testing or CRO layer
Every site gets the same layout. No way to test "does a sticky phone bar increase calls?" or "does adding video to the hero increase time on site?" Adding a simple CRO experiment layer (Kyra chooses layout variant, tracks which converts better) would be a major differentiator.

### 28. No internal linking automation
Local SEO depends heavily on internal linking: service pages linking to city×service pages, city pages cross-linking to related services, FAQ answers linking back to relevant service pages. None of this is wired. The content engine could build an internal link graph automatically.

### 29. Sitemap exists but robots.txt may be missing
The provisioner generates `sitemap.xml` (confirmed in deployed site). No evidence `robots.txt` is generated or that the sitemap URL is submitted to Google Search Console. Auto-submitting sitemap after deploy would accelerate indexing.

### 30. Widget embed is hardcoded, not branded
The widget script is injected as `kyra.conversionsystem.com/api/widget/WIDGET_CLIENT_ID/script`. When `white_label: true`, this leaks the Kyra domain in the HTML source. For true white-label, the embed URL should route through the agency's domain or be completely neutral.

---

## Build Priority Matrix

| # | Fix | Impact | Effort | Where |
|---|-----|--------|--------|-------|
| 1 | Replace `bg-red-*` with `bg-primary` in template | 🔥🔥🔥 | 1hr | VPS template |
| 2 | Wire photo upload in wizard Step 4 | 🔥🔥🔥 | 2hr | Kyra wizard |
| 3 | Add `/blog/[slug]` route to VPS template | 🔥🔥🔥 | 1hr | VPS template |
| 4 | Call `syncSiteToKnowledgeBase` after generation | 🔥🔥🔥 | 30min | content-engine |
| 5 | Inject GA4 into template layout | 🔥🔥 | 30min | VPS template + provisioner |
| 6 | Add logo to Navbar | 🔥🔥 | 20min | VPS template |
| 7 | Add photos gallery section to homepage | 🔥🔥 | 2hr | VPS template |
| 8 | Wire booking URL into hero + CTA buttons | 🔥🔥 | 1hr | VPS template |
| 9 | Fix Navbar Services link → dropdown | 🔥🔥 | 1hr | VPS template |
| 10 | Add design style rendering (4 actual layouts) | 🔥🔥 | 4hr | VPS template |
| 11 | Fix city state field | 🔥🔥 | 30min | Wizard |
| 12 | Add 10 missing industry defaults | 🔥🔥 | 1hr | industry-defaults.ts |
| 13 | Fix stats bar "Practice Areas" label | 🔥 | 15min | VPS template |
| 14 | Wire content similarity check into generation | 🔥 | 30min | content-engine |
| 15 | Expose feedback field in Regenerate UI | 🔥 | 1hr | Editor page |
| 16 | Add schema markup to city + about pages | 🔥 | 1hr | VPS template |
| 17 | Fix bulk generation `client.business_name` bug | 🔥 | 15min | bulk page |
| 18 | "Site is live" celebration + Telegram notification | 🔥 | 2hr | Wizard + cron |
| 19 | AI-suggest for differentiator + tagline | 🔥 | 2hr | Wizard |
| 20 | Quick Start wizard (3 fields → generate) | 🔥🔥 | 3hr | New page |
| 21 | Client-facing site portal | 🔥🔥 | 4hr | New page |
| 22 | Growth Engine async (fire-and-forget + poll) | 🔥 | 1hr | growth/route |

---

## File Change Map

### VPS Template (`/opt/kyra/site-templates/generic/`)
- `app/layout.tsx` — GA4 injection, CSS variables
- `app/page.tsx` — photos gallery, booking CTA, fix "Practice Areas"
- `app/services/[slug]/page.tsx` — booking button, photos
- `app/[city]/page.tsx` — schema markup, state fix
- `app/blog/page.tsx` — NEW (blog index)
- `app/blog/[slug]/page.tsx` — NEW (blog post)
- `components/layout/navbar.tsx` — logo display, Services dropdown
- `components/shared/cta-section.tsx` — booking URL
- `lib/theme.ts` — add `ga4Id`, `logoUrl`, `bookingUrl`
- `globals.css` — ensure `bg-primary` works across all states

### Kyra Dashboard (`projects/kyra/`)
- `app/(dashboard)/agency/website/create/page.tsx` — photo upload, AI suggest
- `app/(dashboard)/agency/website/[siteId]/editor/page.tsx` — feedback field
- `app/(dashboard)/agency/website/bulk/page.tsx` — fix `clientName` field
- `lib/sites/content-engine.ts` — wire knowledge sync + similarity check
- `lib/sites/industry-defaults.ts` — add 10 missing industries
- `app/api/agency/sites/[id]/growth/route.ts` — async analysis

### VPS Provisioner (`/opt/kyra/provisioner/server.js`)
- `generateThemeTs()` — add `ga4Id`, `logoUrl`, `bookingUrl`, `photos`

---

## Estimated Impact After All Fixes

| Metric | Before | After |
|--------|--------|-------|
| Sites that actually use the client's brand colors | 0% | 100% |
| Sites with photos | 0% | ~60% (rest use Unsplash fallback) |
| AI chatbot that knows the website content | 0% | 100% |
| Blog posts accessible via URL | 0% | 100% |
| GA4 tracking working | 0% | 100% (for clients who set it) |
| Industries with proper service defaults | 10/24 | 24/24 |
| Duplicate content risk | High | Low (similarity check active) |

---

*Generated by Steve (AI CEO) via full codebase analysis — March 14, 2026*
