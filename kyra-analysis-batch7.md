## Vet-SEO Worker Template (`templates/vet-seo-worker/`)

OpenClaw-runtime-oriented template that ships as a premium `$79/mo` upsell per client. Layout is persona-file + configs + per-skill `SKILL.md` (Anthropic-skill markdown) + two runnable TS files.

**SOUL.md** — persona + mission definition. Templated with `{{CLINIC_NAME}}`, `{{ADDRESS}}`, `{{PHONE}}`, `{{WEBSITE}}`, `{{GBP_URL}}`, `{{VET_NAME}}`, `{{CITY}}`, `{{SERVICES}}`, `{{TARGET_KEYWORDS}}`, `{{CONTENT_TONE}}`. Declares a weekly schedule: Mon = GEO test, Tue/Thu = content creation + GBP post, Wed = NAP audit, Fri = weekly SEO report, daily 2× = Reddit/UGC monitoring, 1st of month = backlink scan. Operational rules enforce human-in-the-loop (never auto-post to Reddit, never send outreach emails without approval, always queue drafts). Publishes to Telegraph, WordPress.com, Blogger, Notion, Google Docs, GitHub Pages (with JSON-LD), Google Sites ("coming soon").

**`config/cron-schedule.json`** — 11 cron jobs matching the weekly schedule. Times are local to the client. All `enabled: true`. The two content-batch jobs ship `params.types: ["web20","press_release"]` (Tue) and `["web20","semantic_stack"]` (Thu).

**`config/geo-queries.json`** — 25 query templates with `{{CITY}}`, `{{CLINIC_NAME}}`, `{{SERVICE}}`, `{{ADDRESS_AREA}}`, `{{STATE}}` placeholders; 3 `competitor_queries`; `providers` = chatgpt (`gpt-4o-mini`), perplexity (`sonar`), gemini (`gemini-2.0-flash`, disabled until API access). Competitor tracking + gap analysis flags both `enabled:true`.

**`config/vet-directories.json`** — 20 directories. Priority tiers: critical (GBP, Yelp), high (Facebook, YellowPages, Healthgrades, VetRatingz, AVMA, Nextdoor, Apple Maps, Bing Places), medium (BBB, Manta, Superpages, Angi, PetDesk, BringFido, Foursquare, Waze), low (CitySearch, MapQuest). Each entry: `url_pattern` (with `{{CLINIC_NAME}}`/`{{CITY}}`), `method` (mostly `scrape`, two `manual` for Apple Maps + Waze), `fields`.

**`config/subreddits.json`** — 13 global subreddits (`dogs`, `cats`, `AskVet`, `pets`, `veterinarian`, `Veterinary`, etc.) + a hardcoded metro-area map for 25 US cities (Fremont → `[bayarea,EastBay,Fremont,SanJose,AlamedaCounty]`, etc.). Falls back to `r/{CityName}` if unmapped. 21-word keyword list, `max_post_age_hours: 48`, `min_relevance_score: 0.5`.

**`config/web20-platforms.json`** — 4 Web 2.0 targets (WordPress.com, Blogger, Telegraph, Notion) + 5 semantic-stack targets (Google Docs, Google Sites, GitHub Pages, Notion, Telegraph). Each row identifies `method`, `skill` (ClawHub skill or `custom`), `auth` model, and HTML/maps-embed capability.

**`prompts/*.md`** — 5 reusable LLM prompt templates: `outreach-pitch.md`, `press-release.md`, `stack-content.md`, `ugc-reply.md`, `web20-article.md`. Referenced by `seo-content-writer` and `outreach-scout` SKILL.md files.

**Skills (10 SKILL.md files):**

1. **backlink-monitor** — monthly Firecrawl + web_search scan. Classifies links (editorial/directory/social/self-published/semantic-stack/spam); cross-references outreach pipeline to track pitch → link conversion; flags spam candidates for disavow. ~$0.25/mo per client.

2. **gbp-posts** — 2–3 Google Business Profile posts/week via GBP API (Tue/Thu cron), with manual-fallback mode that queues text for agency copy-paste if GBP API not wired. Post types: Update, Offer, Event, Product. Every post must have CTA.

3. **geo-tester** (runnable) — see below. `SKILL.md` also documents competitor tracking + content-gap storage keys.

4. **nap-auditor** (runnable) — see below. `SKILL.md` adds "pre-filled directory submission data" output for any `not_found` directory, and the expanded 20-directory list with Apple Business Connect + Bing Places + Nextdoor.

5. **outreach-scout** — 4-phase workflow (discovery → scoring → pitch drafting → follow-up). 0-100 scoring with minimum 40, max 10 pitches/month, one follow-up per target. Stores pitched targets for backlink-monitor cross-reference.

6. **semantic-stacker** — 5-page cross-linked stack (Google Docs/Sites/GitHub Pages/Notion/Telegraph). Each platform gets a unique content angle. Embeds VeterinaryCare + LocalBusiness + Organization JSON-LD schema on HTML-supporting platforms. Monthly interlink refresh.

7. **seo-content-writer** — 3 content types (press release 450-550 words, Web 2.0 650-800, semantic stack 600-1000). GEO-gap-driven priority: pulls `content_gaps` data and creates content for 0% citation queries first. All drafts go through review queue.

8. **seo-reporter** — weekly Friday aggregation into 8 report sections (GEO, NAP, content, outreach, UGC, backlinks, GBP, action items). JSON for dashboard + Markdown for agency email.

9. **ugc-monitor** — 2×/day Reddit scan via `reddit-readonly` ClawHub skill. City sub + pet subs + vet subs. Relevance scoring 0-1.0 (min 0.6 configured in SKILL.md, 0.5 in config — inconsistency). Max 3 replies/day. Never includes phone/URL. **Never auto-posts** — always agency-reviewed.

10. **web20-publisher** — publishes approved content from review queue to auto-provisioned accounts via platform APIs (Telegraph API, WordPress REST, Blogger v3, Notion blocks, GitHub Contents API, Google Docs API). No agency-side API-key config.

### Runnable TS: `skills/nap-auditor/run.ts` (388 lines)

Exports `runNAPAudit(masterNAP, clinicCity, firecrawlKey)` returning a `NAPAuditReport`. Loads `../../config/vet-directories.json` at import. For each directory: builds search URL with `{{CLINIC_NAME}}` + `{{CITY}}` substitution → calls Firecrawl `POST https://api.firecrawl.dev/v1/scrape` (markdown format, `waitFor: 3000`) with `Bearer ${firecrawlKey}` → extracts NAP using regex patterns (namePattern anchors on clinic name, phone US regex, address regex that expects `StreetNum + Street + City + ST + ZIP`, website URL pattern filtered to exclude yelp/facebook/google/yellowpages).

Each found field is compared via normalization-then-Levenshtein pipeline:
- `normalizePhone` → last 10 digits
- `normalizeAddress` → lowercase, expand St/Ave/etc. abbreviations, strip punctuation, extract `streetNum + streetName` parts, compare ZIPs
- `normalizeName` → strip LLC/Inc/DBA, handle vet↔veterinary/clinic↔hospital variations, fuzzy-match with hand-rolled `levenshtein(a, b)` matrix, tolerance 3
- `normalizeWebsite` → strip protocol/www/trailing-slash, allow subdomain containment

Status = `match`/`mismatch`/`not_found`/`error`/`blocked`. HTTP 429 → "rate_limited"; 403 → "blocked". 500ms sleep between scrapes. Returns summary counts + action_items strings ready for agency display. Stores the real (post-redirect) `listing_url` separately from the search URL.

### Runnable TS: `skills/geo-tester/run.ts` (345 lines)

Exports `runGeoTest(clinic, previousScore, openaiKey, perplexityKey)` returning a `GeoTestReport`. Loads `../../config/geo-queries.json`. `expandQueries()` fans out `{{SERVICE}}`-containing templates across the clinic's top-3 services; non-service templates substitute once → typical test generates ~27–30 query strings, probed against both ChatGPT + Perplexity (so 54–60 total probes).

Probes run in **batches of 5 queries × 2 providers = 10 concurrent fetches per batch** via `Promise.allSettled`, with 300ms delay between batches. ChatGPT call = `POST https://api.openai.com/v1/chat/completions` with `gpt-4o-mini`, temperature 0.7, max 1000 tokens; Perplexity call = `POST https://api.perplexity.ai/chat/completions` with `sonar`. Failures log and skip (never block).

Citation analysis (`analyzeCitation`): looks for clinic name / raw phone digits / website (minus protocol). If found, estimates position by counting `\d+[\.\)]` list items before the match and extracts a ±100-char snippet as context. Overall score = cited/total × 100. Trend vs previousScore (±5 threshold). Recommendations: no emergency citations → emergency content recommendation; <30% service-citation rate → service-focused pages; >50% general-citation → leverage momentum; provider-skew advice if one provider is 20% ahead.

Note: `expandQueries()` processes templates in order but bails into a service-expansion loop when `{{SERVICE}}` is present. Total `queries.length * 2` returned in `total_queries` — used for rate reporting only, not for the actual executed count.

## Site-Templates/Generic (Next.js 16.1.6 Static Export)

Mini-app that the Kyra build service instantiates per client, substituting `lib/constants.ts` + `lib/theme.ts` + `content/pages.json`. Uses React 19.2.3, Tailwind 4, Lucide icons. Single hard dep: `lucide-react`.

**Two-layer content injection:**

1. **`lib/constants.ts` — structural data.** Exports `BUSINESS` (name, phone, phoneHref, email, address, license, rating, reviewCount, yearsInBusiness, hours, coordinates, tagline, url, emergencyText), `SERVICES` (array of `{name, slug, description}`), and `SERVICE_AREAS` (array of `{name, slug, state}`). **File is a template — the committed version contains sample law-firm data for build verification** ("Carter & Associates Law Firm"). Comment at top: `TEMPLATE FILE - Will be overwritten by the Kyra build service.`
2. **`content/pages.json` — long-form AI-generated content.** Array of `{slug, type, title, metaTitle, metaDescription, heroH1, heroSubtitle, sections[], faq[], testimonials[], schema}`. Accessed through `lib/content.ts` (`getPageContent(slug)` / `getPagesByType(type)` / `getAllPages()`). Includes a `cleanText()` helper that strips markdown artifacts (`**`, `*`, `#`, leading colons) from AI output and an `INDUSTRY_LABELS` map (hvac/plumbing/dental/legal/restaurant/real-estate/auto/med-spa/fitness/veterinary/cannabis/consulting/electrical/roofing/landscaping → proper display label).

**`lib/theme.ts`** — colorPrimary, colorSecondary, designStyle (`modern-dark`/`clean-light`/`bold`/`minimal`). Overwritten by build service.

**`lib/seo.ts`** — pure helpers: `canonicalUrl`, `phoneHref`, `breadcrumbSchema`, `localBusinessSchema` (outputs LocalBusiness JSON-LD with address, geo, areaServed[], aggregateRating, hasOfferCatalog from SERVICES), `faqSchema`, `serviceSchema`.

**Routes generated (static export):**
- `/` — homepage (`app/page.tsx`, 20kB — most of the marketing copy)
- `/about`, `/contact`, `/faq`, `/reviews`
- `/services/[slug]` — one per service
- `/[city]` — one per service area (hero + service grid + CTA card)
- `/[city]/[service]` — cross product. `generateStaticParams` for both uses `dynamicParams = false` so only pre-generated combinations exist. Pulls content layered: `getPageContent('/[city]/[service]')` first, falls back to `/services/[service]` content.
- `/sitemap.xml` — force-static, auto-enumerates all routes from `SERVICES × SERVICE_AREAS`
- `/robots.txt` — force-static, allow-all with sitemap link

**Relationship to main app's `lib/sites/`:** This template is the VPS-side render target consumed by the provisioner. `lib/sites/` in the main app handles the upstream wizard → AI content gen → Supabase persistence → build trigger pipeline. The build service overwrites `constants.ts`, `theme.ts`, and `pages.json`, then `npm run build` produces the static site; the Kyra docs refer to this as generating `WIDGET_CLIENT_ID` substitutions at build time.

**CRITICAL FLAG — `WIDGET_CLIENT_ID` placeholder bug:** `app/layout.tsx:57` hardcodes:
```tsx
<script src={`https://kyra.conversionsystem.com/api/widget/WIDGET_CLIENT_ID/script?v=2`} defer />
```
The literal string `WIDGET_CLIENT_ID` must be substituted by the build service (not by Next.js — this is outside the `process.env` access). `WEBSITE-BUILDER-ANALYSIS-V2.md` item #18 calls this out: "Widget WIDGET_CLIENT_ID placeholder — may not be replaced by provisioner." `WEBSITE-BUILDER-ANALYSIS.md` claims it's "replaced at build time" and working — so there's a substitution step somewhere in the build pipeline, but if it silently fails (e.g. regex miss, wrong template path), every deployed site ships a broken widget URL that returns 404, and the chat widget silently does not load. Additionally, an adjacent `NEXT_PUBLIC_WIDGET_CLIENT_ID` meta tag is conditionally rendered from an env var — so there are actually two ID-injection mechanisms that must stay in sync.

**Domain observation:** The widget URL uses `kyra.conversionsystem.com` — after the planned `meetkyra.com` migration (`docs/meetkyra-domain-migration.md`) this becomes a migration point alongside ~90 other hardcoded references.

## Top-Level `ghl-crm` Skill (`skills/`)

Anthropic Skill-format, lives at repo root (distinct from the empty `kyra-ghl-skill/` directory and the `templates/vet-seo-worker/skills/` OpenClaw skill set). Structure:

```
skills/
├── SKILL.md                   — name/description frontmatter + CLI reference
├── references/api-reference.md — GHL API v2 detailed endpoint specs
└── scripts/ghl.sh             — executable wrapper script (13.8 KB)
```

**What it is:** A Claude Skill that lets Claude (Code / Agents / any Skill-compatible host) drive a GoHighLevel CRM from natural language. Frontmatter `description` triggers it whenever the user mentions GHL, contacts, SMS/email sending, pipeline deals, appointment booking.

**What it binds:** The shell script (`scripts/ghl.sh`, 450 lines based on file size) wraps the GHL API v2 at `https://services.leadconnectorhq.com`. Required env: `GHL_API_TOKEN` (Private Integration Token or OAuth bearer) + `GHL_LOCATION_ID`. The `SKILL.md` exposes a command grammar: `contacts search/get/create/update/upsert/add-tags/remove-tags/add-note/add-task/list-tasks/list-notes`, `conversations search/get/create`, `messages send/inbound`, `opportunities search/get/create/update/status`, `pipelines list`, `calendars list/get/free-slots/book/events`, `location get/custom-fields/custom-values/tags`.

**How Claude uses it:** The SKILL.md frontmatter + natural-language description makes it auto-discovered. Claude reads SKILL.md, runs `bash scripts/ghl.sh <command> [args...]` for each step. Error handling documented: 401 (token/scopes), 422 (validation), 429 (auto-retries once after 2s). `references/api-reference.md` is loaded on-demand when Claude needs deeper endpoint details (scope table, body schemas, webhook event list — 17 events including ContactCreate, OpportunityStageUpdate, InboundMessage).

This is the "kyra-ghl skill" conceptually described in the strategic roadmap (section 5.2) — but implemented as a standalone Claude Skill that Claude Code can run. It's separate from the per-container-deployable OpenClaw skill the roadmap's "Phase 2" eventually envisioned.

## docs/ Inventory (34 files)

**Operationally critical (14):**
- `CONTAINER-SYNC-API.md` — OVH provisioner REST reference (`PUT /containers/:id/config`, `PATCH /containers/:id/openclaw-config`, `PUT /containers/:id/workspace-file`, `POST /containers/:id/sync-secrets`). Base URL `http://15.204.91.157:9090`. Documents 10-file workspace layout.
- `CONTENT-VOICE.md` — source of truth for all Kyra content, 7 content pillars, Ryze model (80% education / 20% product). Read by every scheduled content routine.
- `CONTENT-VOICE-RESEARCH-2026.md` — platform-specific engagement data for LinkedIn/Twitter/Facebook used by CONTENT-VOICE.md rules.
- `RETELL-AI-INTEGRATION-PLAN.md` — replaces Twilio voice with Retell AI (3-phase plan; Phase 1 lib + webhook, Phase 2 dashboard, Phase 3 batch calling + function calling).
- `vet-seo-worker-build-spec.md` — full product + economics spec for the $79/mo vet SEO worker (Kyra margin $69/mo at 87%).
- `WEBSITE-BUILDER-ANALYSIS.md` (V1) — "can we sell today?" audit with 6 must-fix items (knowledge sync not called, Unsplash dead, etc.).
- `WEBSITE-BUILDER-ANALYSIS-V2.md` — March 14 audit with numbered bug list (30 items, 9 critical). Flags WIDGET_CLIENT_ID issue at #18.
- `TEMPLATE-EXPANSION-ANALYSIS.md` — options for beating competitors' 1000+ templates (AI-full-HTML vs more templates vs hybrid).
- `dashboard-audit-2026-03-11.md` — 64 dashboard pages + 212 API routes audited; identifies feature bloat and duplication.
- `blackleaf-kyra-sms-overview.md` — cannabis-compliant SMS provider (Twilio alternative); Purple Lotus delivery integration.
- `springbig-kyra-sms-overview.md` — parallel cannabis SMS integration with different tradeoffs.
- `provisioner-rules.md` — BYOK routing rule (never set `OPENAI_BASE_URL` for BYOK accounts). One-liner but load-bearing.
- `ghl-workflow-setup.md` — configures two GHL Workflows (signup email + escalation) that fire on Kyra webhooks.
- `stripe-setup-checklist.md` — Stripe Price IDs needed for Solo Pro / Voice Add-on / Annual plans. Step-by-step for Angel.
- `meetkyra-domain-migration.md` — execution plan for migrating from `kyra.conversionsystem.com` → `meetkyra.com` (~90 hardcoded URLs, 160 files).
- `CLAUDE-PROJECT-INSTRUCTIONS.md` — marketing Claude persona / bulk content creator brief.
- `MOLTCLAW-COMPETITIVE-ANALYSIS.md` — Mar 20, 2026 analysis of MoltClaw (Kollab) competitor with 40 native GHL skills.

**Marketing/campaign set (19 — lower operational value):**
- `Kyra-Facebook-Posts-Series.docx`, `facebook-posts-series.md`, `agency-outreach-playbook.md`, `brand-strategy-v2.md`, `demo-video-script.md`, `ghl-marketplace-submission-guide.md`, `india-facebook-campaign.md`, `launch-event-pitch-email.md`, `lead-tracker-template.csv`, `leads-top-50.csv`, `march-16-demo-script.md`, `outbound-sequence.md`, `outreach-messages-ready-to-send.md`, `product-hunt-listing.md`, `social-media-strategy.md`, `viral-content-package.md`, `scrape-ghl-directory.sh` (scraper utility, not a doc).

## Root Operational Docs — Current Decisions

**`AUDIT-RESULTS.md` (Apr 13):** SEO Command Center surgery confirmed. Vet-only gate removed from `seo/run/route.ts`; non-vet clients now use `worker-dispatcher.ts`. Two new API routes created (`seo/geo-scores`, `seo/nap-status`) both reading normalized tables. Dashboard universalized — "SEO Command Center" label. Still-open issues:
- `schema-markup.ts` only generates `VeterinaryCare` schema (should generalize to LocalBusiness)
- Reddit scanner in `seo/run/route.ts` hardcoded to vet subreddits
- Content draft generator in `seo/run/route.ts` still uses vet-specific prompt language
- Similarity checker in `content-engine.ts` logs warnings but does not block at 65% (spec says should block)
- 9 stale `.next/types/` errors from deleted pages

**`ARCHITECTURE-ANALYSIS.md` (Feb 12):** Three integration paths (A direct Claude = LIVE; B OpenClaw Gateway via `gateway-ws.ts` = built, off; C kyra-worker containers = built, off). Documents the still-present `kyra-worker/kyra-api.ts` bug targeting `/api/chat` which OpenClaw doesn't expose — should use `/v1/chat/completions`. **Staleness check:** `lib/fly/` is gone (grep confirms 0 Fly.io references in `lib/`), but `lib/ovh/` exists with 4 files (`provisioner.ts`, `sync.ts`, `gateway-client.ts`, `gateway-resolver.ts`) and the OVH provisioner URL `http://15.204.91.157:9090` is referenced from `lib/pipeline/`, `lib/sites/content-engine.ts`, and `lib/ovh/`. So the `ARCHITECTURE-ANALYSIS.md` doc is **stale** — its three-paths framing no longer reflects the current OVH container architecture. The actual live production path is now: Vercel frontend → OVH provisioner → per-client OpenClaw containers (`{client-id}.gw.kyra.conversionsystem.com`). This is a significant gap — the document should either be updated or superseded by a new canonical architecture doc (`OVH-ARCHITECTURE-SPEC.md` exists at 22KB but the reference from `ARCHITECTURE-ANALYSIS.md` wasn't updated).

**`SECURITY-AUDIT-2026-03-06.md`:** 4 fixes shipped in the reviewed PR (`/api/debug` auth gate, GHL webhook verification, security headers, `/api/openclaw/health` auth gate). **Still pending:**
- `GHL_WEBHOOK_SECRET` env var in Vercel (Action 1 for Angel)
- GHL Workflow URL `?secret=...` parameter (Action 2 for Angel)
- Rate limiting (not yet implemented — recommends `@upstash/ratelimit`)
- CSP `unsafe-eval` (required by Next.js currently; needs eval-dep elimination)
- Supabase RLS not audited — recommends enabling row-level security on all tables as defense in depth

**`KYRA-STRATEGIC-ROADMAP.md` (Feb 13, v2.2):** Describes architecture as Vercel + Fly.io AI bridge + Vercel Cron 60s for GHL polling. The live SMS reply data flow (section 4.3) references `kyra-gateway.fly.dev`. **Staleness check:** `lib/fly/` has been removed; `grep -r 'Fly.io|fly.dev' lib/` returns zero hits; the OVH provisioner is the current production substrate. **The Fly bridge is no longer live — architecture has moved to OVH**, but `KYRA-STRATEGIC-ROADMAP.md` (50KB, v2.2) has not been updated to reflect this. The Fly.io block in section 4.1, the "LIVE" Fly bridge in 4.3, and the ownership-boundaries table in 4.2 are all historical. The `OVH-ARCHITECTURE-SPEC.md` sibling doc (22KB) is presumably the current source of truth but is not cross-referenced. This is a documentation-divergence issue — both docs exist and contradict each other.

**`tasks/todo.md` (Current task — unified SEO/GEO Command Center):** 5-step plan, all checklist items still unchecked (`- [ ]`). The Review section is empty (`_(To be filled after implementation)_`). So the "unified SEO/GEO Command Center" consolidating the 3 scattered SEO locations (marketing-tab > SEO subtab, insights-tab > SEO subtab, website > AI Visibility page) into a single 2-tab SEO|GEO component has not been started yet. Note: `AUDIT-RESULTS.md` documents the upstream plumbing work for this (normalized tables, universalized dashboard) which appears to be done — so the remaining work is the dashboard consolidation UI.

**`HEARTBEAT.md` (last updated Feb 23):** Nightly-build directive. Ships PRs #75-#93. Still needs Angel:
1. `RESEND_API_KEY` in Vercel (unlocks all email)
2. Two Supabase migrations (SQL shown in CEO Action Board)
3. `SIGNUP_WEBHOOK_URL` in Vercel (Slack ping on signups)
4. Submit GHL Marketplace listing (copy + video script ready, needs screenshots)
5. Record 60-second demo video (script ready at `/agency/ghl-listing`)

**`CHANGELOG.md`:** Only one entry — `[0.3.0] - 2026-02-09` for Phase 2B OpenClaw Gateway Integration. **No entries for Apr 17-18 additions.** The CHANGELOG has gone stale — recent work (SEO Command Center universalization, billing fixes, keyboard-shortcut removal, Stripe upgrade UX per recent commit messages `8f69ab60`, `3b9ed53e`, `1936386f`) is not recorded. For reference, the most recent git commits are:
- `8f69ab60` fix(billing): grant credits on subscription.updated + respect extra_client_slots bonus
- `3b9ed53e` chore: remove keyboard shortcuts dialog and global nav hotkeys
- `1936386f` fix(billing): plan upgrade race condition, support link, webhook docs, plan gate UX

Apr 17-18 specifically shows no entries in CHANGELOG.md; the last recorded date in the changelog is Feb 9.

## KYRA/ Directory

Contains two `.docx` binary files:
- `Kyra_Bugs_Defects_Analysis.docx` (29,972 bytes, dated Apr 20 — today)
- `Kyra_Claude_Integration_Analysis.docx` (28,811 bytes, dated Apr 20 — today)

No other files in this directory. Files are binary-parsed (`.docx` = zipped XML) and weren't opened. Based on filenames + size, these are **external analysis artifacts** — likely Microsoft-Word-format reports generated by another tool or Claude session summarizing bugs/defects and the Kyra↔Claude integration. Both created today (Apr 20) — possibly uploaded by the user for cross-referencing. User may want to consider:
- What tool produced these? (Claude Projects export? Another analyst?)
- Should they be moved into `docs/` for consistency, or kept separate because they're not authoritative project docs?
- Do their findings need to be reconciled with the Markdown audit docs in root (`AUDIT-RESULTS.md`, `ARCHITECTURE-ANALYSIS.md`, etc.)?

These are tracked via file timestamps only — no other signal in the repo references them.

## Gap Summary — What's Not Covered After 7 Batches

**Genuine gaps not touched by any batch:**

1. **`kyra-ghl-skill/`** — empty directory at repo root. Zero contents. This is the aspirational "Phase 2 full kyra-ghl OpenClaw skill" from `KYRA-STRATEGIC-ROADMAP.md` section 5.3 that was meant to be a standalone CLI tool installable in containers. Currently unimplemented — the functionality lives at the root-level `skills/` Claude Skill instead. Safe to delete the empty directory or keep as a placeholder.

2. **`marketplace/`** (6 files, ~45KB) — pure marketing/launch collateral for GHL Marketplace submission: `demo-video-script.md`, `ghl-app-listing.md`, `independence-messaging.md`, `launch-application-email.md`, `launch-posts.md`, `outreach-email.md`. Overlaps with `docs/ghl-marketplace-submission-guide.md` and `docs/product-hunt-listing.md`. Not operationally load-bearing — all consumed by marketing workflows.

3. **`marketing/social/`** — one subdirectory, contents not enumerated in this batch. Pure social-media scheduling collateral.

4. **`content-drafts/`** — three subdirectories (`facebook`, `linkedin`, `x`), each with one nested subdirectory. Draft content for the three social platforms. Pure copy staging area; not code.

5. **Root docs not explicitly covered in earlier batches:** `BRANDING.md` (4.4KB), `CLOUDFLARE-MIGRATION.md` (4.6KB — historical, pre-OVH), `CONTAINER-ARCHITECTURE.md` (40KB — likely the canonical OVH architecture source), `E2E-TEST-RESULTS.md` (5.1KB), `E2E-VERIFICATION.md` (11.7KB), `KYRA-AGENCY-PLATFORM-PLAN.md` (10.8KB), `KYRA-ROADMAP-2026-02-12.md` (20.7KB — predates strategic roadmap), `OVH-ARCHITECTURE-SPEC.md` (21.8KB — current architecture canonical source, but not cross-referenced from older docs), `PIPELINE-REDESIGN-SPEC.md` (12.6KB), `PRODUCT.md` (785 bytes), `SECURITY-ARCHITECTURE-ANALYSIS.md` (15.6KB), `SUMMARY.md` (6.7KB), `TECH-STACK.md` (3.5KB), `WORKER-DEPLOY-GUIDE.md` (5.2KB), three `video-analysis-*.md` files (122KB + 12KB + 14KB — likely transcripts used to derive roadmap features), and the 4 PNG/HTML pairs `ghl-preview-*.{png,html}` (preview screenshots for GHL marketplace listing).

6. **`infra/` and `infrastructure/`** — two separate infrastructure directories at root. Neither enumerated in earlier batches. Likely contains Terraform / Ansible / OVH provisioner source.

7. **`.claude/`** — newly-added in this session (untracked per `git status ??`). Unknown contents.

**Summary of documentation health:**
- `KYRA-STRATEGIC-ROADMAP.md` + `ARCHITECTURE-ANALYSIS.md` are both stale — they reference Fly.io and the three-paths framework that have been superseded by OVH.
- `CHANGELOG.md` is stale — hasn't been updated since Feb 9 despite dozens of shipped PRs.
- `HEARTBEAT.md` is stale — dated Feb 23 but mostly still reflects open items (Angel still needs RESEND_API_KEY, migrations, etc.).
- `OVH-ARCHITECTURE-SPEC.md` and `CONTAINER-ARCHITECTURE.md` are the likely current sources of truth but are not referenced from the older docs.
- `AUDIT-RESULTS.md` is fresh (Apr 13) and accurate.
- `SEO-COMMAND-CENTER-SPEC.md` is fresh and matches the current `tasks/todo.md` work in progress.
