## Vet-SEO Worker Template (`templates/vet-seo-worker/`)

A reusable blueprint for an autonomous SEO worker that runs inside an OpenClaw container, per veterinary clinic. It is the original (vet-specific) incarnation of what has since been generalized into the "SEO Command Center" (see `AUDIT-RESULTS.md`, which promoted these two runnable skills to universal, industry-agnostic use).

**Structure.** Top-level files:

- `SOUL.md` — persona/system prompt. Template variables like `{{CLINIC_NAME}}`, `{{ADDRESS}}`, `{{PHONE}}`, `{{WEBSITE}}`, `{{GBP_URL}}`, `{{VET_NAME}}`, `{{CITY}}`, `{{SERVICES}}`, `{{TARGET_KEYWORDS}}`, `{{CONTENT_TONE}}`. Encodes the mission (boost traditional + AI search visibility), operational rules (never auto-post to Reddit/Quora, always queue content for human review, log everything), and the **weekly schedule** below.
- `config/` — five JSON configs:
  - `cron-schedule.json`: 11 cron jobs (GEO Mon 09:00, content Tue/Thu 09:00, NAP Wed 10:00, GBP posts Tue/Thu 10:00, UGC scan daily 08:00 + 18:00, weekly report Fri 15:00, monthly backlink scan on the 1st at 08:00).
  - `geo-queries.json`: 25 query templates + 3 competitor queries + providers (chatgpt/perplexity enabled; gemini disabled pending API access). Includes `competitor_tracking.enabled` and `gap_analysis.enabled` flags with storage keys.
  - `subreddits.json`: 13 global vet/pet subreddits, per-city metro-area subreddit lookup table (25+ US cities mapped), 21 keywords, `max_post_age_hours: 48`, `min_relevance_score: 0.5`.
  - `vet-directories.json`: 20 directories with `url_pattern`, priority (critical/high/medium/low), scrape/manual method, fields — including Nextdoor, Apple Maps (Business Connect), Bing Places, Waze, Foursquare as AI-visibility-critical additions.
  - `web20-platforms.json`: 4 web 2.0 targets (WordPress, Blogger, Telegraph, Notion) and 5 semantic stack targets (Google Docs, Google Sites, GitHub Pages, Notion, Telegraph) with auth method and trust level.
- `prompts/` — five authoring prompts: `press-release.md` (450-550 words, AP style), `web20-article.md` (650-800 words, Maps embed iframe, 2-3 website links), `stack-content.md` (600-1,000 words, VeterinaryCare JSON-LD required for HTML platforms), `outreach-pitch.md` (100-150 words, forbids generic openers, bans words like "guest post"/"collaboration" in subjects), `ugc-reply.md` (50-100 words, bans phone/URL/spammy phrases, outputs `SKIP: [reason]` if unfit).
- `skills/` — ten skills, each with a `SKILL.md`. Two have runnable TypeScript: `nap-auditor/run.ts` and `geo-tester/run.ts`. The rest are prompt/procedure-only definitions.

**Skill roster.**

1. `geo-tester` — runs weekly GEO citation test across ChatGPT + Perplexity.
2. `nap-auditor` — weekly NAP-consistency scan across 20 directories.
3. `seo-content-writer` — generates press releases, Web 2.0 articles, stack pages; pulls content gaps from `dataType: "content_gaps"` and prioritizes them.
4. `web20-publisher` — publishes approved content via platform APIs (Telegraph no-auth, WordPress OAuth, Blogger Google SA, Notion token, GitHub Pages token, Google Docs Google SA).
5. `semantic-stacker` — builds interlinked 5-page authority stack across Google Docs/Sites/GitHub Pages/Notion/Telegraph, injects VeterinaryCare + LocalBusiness + Organization schema.
6. `outreach-scout` — discovers/scores/pitches pet blogs for backlinks (score 0-100, min 40 to qualify, max 10 pitches/month/client, one follow-up after 5 days).
7. `backlink-monitor` — monthly scan, link classification (editorial/directory/social/self-published/semantic_stack/spam), cross-references outreach pipeline, detects negative-SEO spam.
8. `gbp-posts` — Tuesday/Thursday GBP post generation (falls back to "queue for manual copy-paste" if no GBP API configured).
9. `ugc-monitor` — 2×/day Reddit scan across global + per-city metro subreddits; `relevance_score` weighted formula; max 3 auto-queued replies/day/client; always human-reviewed.
10. `seo-reporter` — Friday aggregator producing JSON (dashboard) + markdown (email/export) report covering GEO, NAP, content, outreach, UGC, backlinks, GBP.

**Workflow: intake → research → outreach → reporting → monitoring.**

- **Intake** happens at template provision: `SOUL.md` variables are filled from client config; the platforms list from `web20-platforms.json` is auto-provisioned by Kyra (no agency-supplied API keys).
- **Research** is Monday's GEO test (25 queries × 2 providers, plus 3 competitor queries, plus gap analysis).
- **Content creation** runs Tuesday/Thursday, GEO-gap-first.
- **Publishing** auto-fires when content is approved in the review queue.
- **Outreach** runs on-demand or when triggered — drafted, never sent without human approval.
- **Reporting** runs Friday afternoon, aggregating everything.
- **Monitoring** is continuous: UGC 2×/day, NAP weekly, backlinks monthly.

**`skills/nap-auditor/run.ts`** (~390 lines) is a real scraper. It imports `config/vet-directories.json`, walks 20 directories, builds each search URL (template-substituted `{{CLINIC_NAME}}`/`{{CITY}}`), POSTs to Firecrawl's `/v1/scrape` with `formats: ['markdown']`, then runs a content extractor using regex-based NAP patterns. It applies aggressive normalization — street-name abbreviation table (Street→St, Avenue→Ave, …), phone-to-last-10-digits, name normalization stripping `LLC|Inc|DBA|Corp|Ltd|PLLC`, website normalization stripping protocol/www/trailing slash. Name comparisons use a hand-rolled **Levenshtein** implementation plus vet-specific equivalence rules ("vet" ↔ "veterinary", "clinic" ↔ "hospital", "animal" ↔ "pet"). Address comparison extracts street-number + street-name pairs and compares ZIP codes. Returns a typed `NAPAuditReport` with per-directory `status` (`match`/`mismatch`/`not_found`/`error`/`blocked`), issues, action items, summary counts. Enforces 500ms rate limiting between scrapes. Errors classified — `429` → `rate_limited`, `403` → `blocked` (flagged for manual check).

**`skills/geo-tester/run.ts`** (~345 lines) is the AI-citation probe. Imports `config/geo-queries.json`, `substituteQuery()` templates variables, `expandQueries()` fans out `{{SERVICE}}` across the top 3 services. Two providers: `queryChatGPT()` calls `api.openai.com/v1/chat/completions` with `gpt-4o-mini`, temperature 0.7, 1000 tokens; `queryPerplexity()` calls `api.perplexity.ai/chat/completions` with `sonar`. **Execution is batched 5-at-a-time with `Promise.allSettled` and 300ms inter-batch pauses**, a real performance win over serial. `analyzeCitation()` checks response text for the clinic's name (case-insensitive `indexOf`), the phone-digits-only string, and the website-without-protocol; infers rank position by counting numbered-list prefixes before the name; extracts an 80-char-left / 120-char-right context snippet. Scoring: `overallScore = round(citedCount / totalCount × 100)`; trend vs `previousScore` is up (>+5), down (<−5), else stable. `generateRecommendations()` groups results by theme (emergency/service/general) and by provider (Perplexity-skew vs ChatGPT-skew) to suggest concrete content actions.

Both runners output strongly-typed reports intended to be PUT'd to `/api/agency/clients/{id}/seo` with specific `dataType` values (`geo_scores`, `geo_score_current`, `geo_score_trend`, `competitor_scores`, `content_gaps`, `nap_audits`, etc.). The `AUDIT-RESULTS.md` doc confirms that as of 2026-04-13 this API has been dual-read from the normalized `seo_*` tables with JSONB fallback, and that the SEO dashboard is now universal (not vet-branded).

---

## Site-Templates Generic (`site-templates/generic/`)

A standalone **Next.js 16.1** app with React 19, Tailwind v4, `lucide-react` icons. It ships as the template substrate for customer-facing local-SEO sites and is consumed by `lib/sites/` in the main app (which fills in per-client content and likely uses Kyra's build service to produce static deploys).

**`next.config.ts`** sets `output: "export"` — the whole thing compiles to a static bundle (pure HTML/CSS/JS), deployable to any static host (Cloudflare Pages, Vercel static, S3+CDN). `turbopack.root` pins the resolution root.

**`package.json`** is minimal: `next`, `react`/`react-dom@19`, `lucide-react`. Dev deps: TypeScript, Tailwind v4 via `@tailwindcss/postcss`.

**Content injection model.** There are **two** orthogonal layers:

1. **Structural config in `lib/constants.ts`** — `BUSINESS` (name, phone, email, address, license, rating, reviewCount, yearsInBusiness, hours, coordinates, tagline, url, emergencyText), `SERVICES` (array of `{name, slug, description}`), `SERVICE_AREAS` (array of `{name, slug, state}`). The file is clearly marked `TEMPLATE FILE - Will be overwritten by the Kyra build service`. Current sample data is a San Francisco law firm ("Carter & Associates") — the template is **industry-agnostic** (not limited to legal; `lib/content.ts` has a `INDUSTRY_LABELS` map covering hvac, plumbing, dental, legal, restaurant, real-estate, auto, med-spa, fitness, veterinary, cannabis, consulting, electrical, roofing, landscaping).
2. **Long-form page copy in `content/pages.json`** — 19k JSON blob with one object per `slug`. Each entry has `type`, `title`, `metaTitle`, `metaDescription`, `heroH1`, `heroSubtitle`, `sections[]` (`heading`, `body`, `bullets[]`), `faq[]`, `testimonials[]`, `schema`. Sections use doubled asterisks for sub-headings (AI-generated output convention); `app/page.tsx` ships a `parseSubSections()` helper that splits bold-wrapped lines into `{title, text}` cards. Recognized section keys are matched by heading substring ("services overview", "why choose", "social proof"/"testimonial", "service area") — unmatched sections render as generic bullet sections. A `cleanText()` utility strips `**`, `*`, leading `#`, and leading `:` — i.e., artifacts from an LLM content generator.

**`lib/content.ts`** provides `getPageContent(slug)`, `getPagesByType(type)`, `getAllPages()`, `cleanText()`, `getIndustryLabel()`. This is the single seam between JSON content and React pages.

**`lib/seo.ts`** generates JSON-LD for LocalBusiness (with conditional `geo`, `aggregateRating`, per-service `hasOfferCatalog`, per-city `areaServed`), breadcrumbs, FAQPage, Service. Used by `<SchemaMarkup>`, which simply emits `<script type="application/ld+json">`.

**Routes.**

- `app/page.tsx` — Homepage. Renders hero, stats bar (years, rating, practice-area count, areas-served), a services grid, a "Services Overview" deep-dive parsed from AI-generated `**Heading**\nbody` blocks, a "Why Choose Us" card grid rotating through 8 lucide icons (Scale/Users/Shield/Clock/Star/MessageCircle/Award/CheckCircle2), a social-proof / testimonials section, a service-areas grid, fallthrough "other sections" rendering, and a `CTASection` — plus FAQ schema injection if FAQ content exists.
- `app/layout.tsx` — Root layout. Sets metadata from homepage content, injects CSS custom properties (`--brand-primary`, `--brand-secondary`) from `lib/theme.ts` via `dangerouslySetInnerHTML`, embeds `LocalBusiness` schema, conditionally renders `<meta name="kyra-client-id">` from `NEXT_PUBLIC_WIDGET_CLIENT_ID`, and loads a **Kyra widget script** from `https://kyra.conversionsystem.com/api/widget/WIDGET_CLIENT_ID/script?v=2` (note: `WIDGET_CLIENT_ID` is hardcoded as a literal placeholder, suggesting the build service substitutes it server-side before export — see "gap" below).
- `app/[city]/page.tsx` — City landing page. `generateStaticParams()` enumerates `SERVICE_AREAS`; `dynamicParams = false`. Renders hero, services grid scoped to `/${city}/${service}`, breadcrumb + LocalBusiness schema with `areaServed: City`.
- `app/[city]/[service]/page.tsx` — City × Service matrix. `generateStaticParams()` cross-products both arrays. 5 services × 6 cities = 30 static pages plus. Renders breadcrumb links, why-choose-us, reuses service page content as fallback, injects `serviceSchema(service, description, city)`.
- `app/services/[slug]/` — exists (directory present) — per-service page.
- `app/about`, `app/contact` (with `contact-form.tsx` client component), `app/faq`, `app/reviews` — static utility pages.
- `app/sitemap.ts` — includes `/`, `/about`, `/contact`, `/faq`, `/reviews`, all services, all cities, and all city×service combos. `force-static`.
- `app/robots.ts` — allow-all with sitemap reference.

**Contact form behavior.** `contact-form.tsx` is a client component that POSTs to `https://kyra.conversionsystem.com/api/widget/${clientId}/lead` where `clientId` is read from `<meta name="kyra-client-id">` (injected in `layout.tsx`). On submit it captures `name`, `phone`, `email`, `serviceType`, `message`, `businessName`, `source: 'website-contact-form'`. Failures are swallowed (`.catch(() => {})`) and success is shown unconditionally — **leads silently drop if the widget script's meta tag is missing**. This is how a generated SEO site hands a lead back to Kyra's main app for CRM routing.

**Reviews page** (`app/reviews/page.tsx` exists but not read in full) renders testimonials. FAQ page renders FAQ entries plus `FAQPage` schema.

**Relation to main app.** `lib/sites/` in the main repo (seen in the root ls, plus referenced in `SEO-COMMAND-CENTER-SPEC.md` and `AUDIT-RESULTS.md`) is the generator/pipeline. It composes `pages.json`, writes `lib/constants.ts` + `lib/theme.ts` with per-client data, calls `lib/seo/city-data.ts` + `lib/seo/internal-linker.ts` + `lib/seo/content-engine.ts` to produce differentiated city pages, injects schema via `lib/seo/schema-markup.ts`, and runs `next build` (static export) to produce a deployable bundle. The template is the "runtime shell" — main-app `lib/sites/` is the build engine. The template itself contains no logic for content generation — only **rendering** and **SEO plumbing**.

---

## Top-Level Skill (`skills/`)

Only one skill at the top level: **`ghl-crm`**. This is an **Anthropic-style agent Skill** (YAML frontmatter `name: ghl-crm` + `description`), not a Kyra-runtime skill. Three files:

- `SKILL.md` (5.4 KB) — the canonical Skill description that tells Claude when/how to invoke it. It binds to two env vars (`GHL_API_TOKEN`, `GHL_LOCATION_ID`), documents commands as bash-script calls (`bash scripts/ghl.sh <resource> <action>`), and groups operations into contacts, conversations/messages, opportunities, pipelines, calendars/appointments, and location/settings. Lists four common workflows: Lead Intake (upsert → tag → opportunity → SMS welcome), Follow-up (search → list notes → send → add note), Pipeline Management (list → search stage → update → status), Appointment Booking (list calendars → free-slots → book → SMS confirm).
- `references/api-reference.md` (8.6 KB) — full GHL API v2 reference: base URL `services.leadconnectorhq.com`, Version header `2021-07-28`, ~100-req/min rate limit, auth (Private Integration Token vs OAuth 2.0), scopes matrix, every endpoint with exemplar payloads for contacts, conversations, messages (`SMS`/`Email`/`WhatsApp`/`GMB`/`IG`/`FB`/`Custom`/`Live_Chat`), opportunities with status transitions, pipelines, calendars (free-slots, appointments, block-slots), locations (customFields/customValues/tags). Complete webhook event catalog (19 events from `ContactCreate` through `CampaignStatusUpdate`).
- `scripts/ghl.sh` (13.8 KB, executable) — bash + Python helper. Uses `set -euo pipefail`, curl with explicit headers, `python3 -m json.tool` for pretty printing, one-shot 429 retry with 2s backoff, URL-encoding via `python3 urllib.parse.quote`, JSON payload injection of `locationId` via inline Python for create/upsert/search. Sub-command routing for `contacts`, `conversations`, `messages`, `opportunities`, `pipelines`, `calendars`, `location`, `workflows`.

**What it does:** gives Claude Code (or any Claude-based agent) a first-class way to drive GoHighLevel from natural language — not a skill installed into an OpenClaw container, but a skill used **by Claude itself** when a user says "look up this contact," "book an appointment," "move this deal to won." It's aligned with Kyra's strategic direction in `KYRA-STRATEGIC-ROADMAP.md` Layer 3 (Deep GHL Integration).

---

## `docs/` Inventory (34 files)

### Operationally critical (read first)

1. **CLAUDE-PROJECT-INSTRUCTIONS.md** — Claude Project instructions for bulk content tasks. Overrides default behavior for marketing writing.
2. **CONTAINER-SYNC-API.md** — Provisioner API reference. `OVH_PROVISIONER_URL` default `15.204.91.157:9090`. This IS the active provisioner, referenced by HEARTBEAT.md ("All 9 containers should be running").
3. **CONTENT-VOICE.md** + **CONTENT-VOICE-RESEARCH-2026.md** — Source of truth for every blog/LinkedIn/Facebook/X post. Platform-algorithm research (LinkedIn et al). Refresh quarterly.
4. **RETELL-AI-INTEGRATION-PLAN.md** (April 6, 2026) — Replace Twilio-based voice with Retell AI as primary voice provider. All-in-one STT+LLM+TTS+telephony. Recent, future-looking.
5. **vet-seo-worker-build-spec.md** — Original 18KB build spec for the template analyzed above.
6. **WEBSITE-BUILDER-ANALYSIS.md** + **WEBSITE-BUILDER-ANALYSIS-V2.md** (Mar 14, 2026) — Audit of `lib/sites/` builder. V2 flags critical production issue: Unsplash Source API dead, breaking images on all auto-photo sites.
7. **TEMPLATE-EXPANSION-ANALYSIS.md** (Mar 20, 2026, for Angel Castro) — Strategy for expanding the industry template roster.
8. **dashboard-audit-2026-03-11.md** — "64 dashboard pages, 212 API routes, 2 sidebar variants." Identifies dead pages, duplicates, navigation confusion. Actionable audit for dashboard consolidation.
9. **MOLTCLAW-COMPETITIVE-ANALYSIS.md** (March 20, 2026) — Competitive intel on MoltClaw.
10. **blackleaf-kyra-sms-overview.md** + **springbig-kyra-sms-overview.md** (March 2026) — Full technical overviews of Purple Lotus Delivery SMS system (an active deployment).
11. **provisioner-rules.md** — Tiny file (169 bytes) enforcing a BYOK routing rule: "never set `OPENAI_BASE_URL` for BYOK accounts."
12. **ghl-workflow-setup.md** — Configure GHL workflows to ping Kyra email notifications.
13. **stripe-setup-checklist.md** — New Price IDs needed: Solo Pro, Voice Add-on, Annual Plans.
14. **meetkyra-domain-migration.md** (2026-03-19) — Plan for moving off `kyra.conversionsystem.com` to `meetkyra.com`. Ready to execute when Angel approves.

### Marketing/campaign (lower priority for system understanding)

- **brand-strategy-v2.md**, **social-media-strategy.md**, **agency-outreach-playbook.md**, **outbound-sequence.md**, **outreach-messages-ready-to-send.md**, **facebook-posts-series.md**, **viral-content-package.md**, **product-hunt-listing.md**, **india-facebook-campaign.md**, **launch-event-pitch-email.md**, **march-16-demo-script.md**, **demo-video-script.md**, **ghl-marketplace-submission-guide.md** — Campaign copy, outreach scripts, go-to-market playbooks.
- **Kyra-Facebook-Posts-Series.docx** — Word copy of facebook-posts-series.md.
- **lead-tracker-template.csv**, **leads-top-50.csv** — Lead lists.
- **scrape-ghl-directory.sh** — Small bash scraper for the GHL directory.

---

## Root-Level Operational Docs — Facts That Matter Now

### `AUDIT-RESULTS.md` (2026-04-13)

- **Decision locked in:** Vet-only gate removed from `worker-dispatcher.ts` and `seo/run` route; non-vet clients now dispatch via the universal worker.
- **New endpoints created:** `/api/agency/clients/[id]/seo/geo-scores` and `/api/agency/clients/[id]/seo/nap-status` (both previously empty).
- **Dual-read implemented:** `/api/agency/clients/[id]/seo` GET reads from normalized `seo_*` tables with legacy JSONB fallback.
- **Dashboard universalized:** No longer branded "Veterinary SEO Worker"; shows content gaps + competitor GEO scores sections.
- **Open issues explicitly left out of scope:**
  - 9 stale TS errors in `.next/types/` from deleted pages (pipelines, revenue, billing webhook) — Next.js cache artifacts.
  - `content-engine.ts` similarity checker is advisory at 65%, spec says it should **block**.
  - `schema-markup.ts` hardcodes `VeterinaryCare` — needs generalization to `LocalBusiness` per industry.
  - `seo/run/route.ts` Reddit scanner is hardcoded to vet subreddits; needs industry-pack integration.
  - Content draft generator in `seo/run/route.ts` still uses vet-specific prompt language.
- TypeScript source compiles clean.

### `ARCHITECTURE-ANALYSIS.md` (2026-02-12)

- **Three integration paths built, only Path A active:**
  - **Path A: Direct Claude** (`KYRA_USE_WORKER=false`, `KYRA_USE_OPENCLAW=false`) — LIVE. Simple, no tools/skills/sub-agents.
  - **Path B: OpenClaw Gateway** (`KYRA_USE_OPENCLAW=true`) — BUILT, OFF. Custom WebSocket client in `lib/openclaw/gateway-ws.ts` (no `ws` library, hand-rolled frames). Single-tenant, one gateway for all users.
  - **Path C: Kyra Worker → Cloudflare Containers** (`KYRA_USE_WORKER=true`) — BUILT, OFF. Has a known bug: `kyra-worker/kyra-api.ts:72` sends to `http://localhost:${GATEWAY_PORT}/api/chat`, but OpenClaw has no `/api/chat` endpoint — should use `/v1/chat/completions` with `openAiChatCompletions` enabled.
- **Recommended fix:** switch kyra-worker to OpenAI-compatible endpoint for drop-in SSE streaming.
- **Config state:** no `KYRA_WORKER_URL` / `KYRA_API_SECRET` in Kyra's `wrangler.toml` — worker not deployed.

### `SECURITY-AUDIT-2026-03-06.md`

- 1 critical (unauthenticated `/api/debug` leaking env structure) — fixed.
- 3 high: GHL webhooks with no verification (fixed: `verifyGhlWebhook()` accepts HMAC signature or `x-kyra-secret` shared secret or `?secret=` query param); zero security headers in `next.config.mjs` (fixed: full header suite including HSTS, X-Frame-Options SAMEORIGIN, CSP); third high item not reached in the read but flagged.
- 2 medium (incl. unauthenticated `/api/openclaw/health` — fixed with `requireAgencyMember()`).
- **Still pending as of audit date:**
  - Angel to set `GHL_WEBHOOK_SECRET` env var in Vercel — without it, webhook verification is skipped (backwards-compatible but insecure).
  - **No rate limiting anywhere** — recommend `@upstash/ratelimit` on GHL webhook, chat, auth endpoints.
  - CSP `unsafe-eval` still required by Next.js build.
  - **Supabase RLS not audited** — recommendation to enable RLS on all tables for defense-in-depth.
  - Consider tightening `frame-ancestors` from `SAMEORIGIN` to `'none'`.

### `KYRA-STRATEGIC-ROADMAP.md` (v2.2, Feb 16, 2026)

- **Current phase:** Phase 3 in progress (~85% built), Phase 6 queued.
- **Vision locked:** Kyra transforms OpenClaw into deployable AI workforce for agencies (not "yet another OpenClaw host"). Positioning: MacBook (Kyra) vs raw Linux (competitor hosts).
- **7-layer moat:** Intelligence (not hosting), Multi-tenant agency arch, Deep GHL integration, White-label, Revenue engine via Stripe Connect, Template marketplace network effect, OpenClaw ecosystem leverage.
- **Architecture in use:** Vercel frontend + API, Fly.io AI bridge (Frankfurt, Claude Sonnet 4, SSE streaming, auto-stop-on-idle), GHL polling via Vercel Cron every 60s hitting `/api/ghl/poll` (CRON_SECRET), Supabase + Stripe Connect. Supersedes earlier Option C text — actual production is Fly.io bridge, not single OpenClaw gateway.
- **SMS AI reply flow (LIVE Feb 16)**: GHL → Kyra Vercel Cron poller → Fly bridge → Claude → back to GHL.

### `SEO-COMMAND-CENTER-SPEC.md`

- **6-phase build plan** unifying 4 disconnected SEO subsystems (pSEO builder, GEO tester, NAP auditor, growth suggestions) into one dashboard for all 30 industries.
- Phase 1 (DB + GSC sync) DONE. Phases 2-6 checklisted.
- Confirms migration `supabase/migrations/20260413001_seo_command_center.sql` exists with 10 tables.
- Explicit DO-NOT-recreate list of 20+ existing `lib/seo/*` modules and API routes.
- **Empty directories flagged for creation**: `seo/geo-scores/` and `seo/nap-status/` — both now filled per AUDIT-RESULTS.md.

### `TECHNICAL-SPEC.md` (v1.0, Feb 6, 2026)

- Earliest architectural doc. Approved for dev. Specifies Option C (Session-Based Isolation) with single OpenClaw Gateway + per-user `sessions_spawn`. Superseded by the Fly.io bridge approach in KYRA-STRATEGIC-ROADMAP.md and the Cloudflare Container path in ARCHITECTURE-ANALYSIS.md, but the Supabase schema section is still the authoritative reference for users/conversations/messages tables.
- Constraints: MVP in 4 weeks, infra <$500/mo at 50 users.

### `tasks/todo.md` (current)

- **Active task:** Unified SEO/GEO Command Center dashboard. Building one tabbed dashboard with **SEO** (Overview, Keywords, SERP, Rankings, Growth) and **GEO** (Overview, AI Citations, NAP Audit, Authority, Content Gaps) sub-tabs.
- Checklist untouched — all 5 steps unchecked. Step 1 creates `components/dashboard/client-tabs/seo-geo-command-center.tsx`. Step 2 wires into `insights-tab.tsx`. Step 3 renames marketing-tab "SEO" sub-tab to "Keyword Tools" to avoid overlap. Step 4 renames website SEO page title. Step 5: `tsc --noEmit` 0 errors + BRANDING.md compliance + commit.
- **Review section empty** — work not yet executed.

### `HEARTBEAT.md` (Feb 23, 1:30 AM CET)

- Nightly "build until 8am" directive. 18+ PRs shipped in one session (#75-#93).
- Shipped: pricing page, privacy/ToS, lead capture, CEO Action Board, SEO blog + sitemap, /try/[industry] live AI demo, multi-language support (15), /vs comparison, /changelog, /get-demo.
- **Still needs Angel:** `RESEND_API_KEY` in Vercel, 2 Supabase migrations to apply, `SIGNUP_WEBHOOK_URL`, GHL Marketplace listing submission, 60-second demo video recording.
- VPS health check: `curl Bearer kyra-provisioner-2026 http://provisioner.gw.kyra.conversionsystem.com/health` — 9 containers expected running.

### `CHANGELOG.md`

- Latest entry `0.3.0` (2026-02-09, Phase 2B): OpenClaw Gateway integration landed as feature-flagged (`KYRA_USE_OPENCLAW`, `KYRA_OPENCLAW_SKILLS`). `app/api/chat/openclaw/route.ts`, `lib/openclaw/sessions.ts`, enhanced system prompt. Automatic fallback to direct Claude if gateway unreachable.

---

## Gap Summary — What's Still Uncovered

Excluding `node_modules`, `.vercel`, `.next`, `.git`, `.claude/worktrees`, `public/` binaries, `ghl-preview-*.{html,png}`, `video-analysis*.md`:

**Significant code directories not in this or prior batches (based on root `ls`):**

- `app/` — the main Next.js app tree with 50+ route folders (`(auth)`, `(dashboard)`, `(onboarding)`, `(portal)`, `(public)`, `a`, `admin`, `ai-for`, `api`, `blog`, `cannabis`, `changelog`, `compare`, `demo`, `ecommerce`, `ghl`, `ghl-marketplace`, `ghl-snapshot`, `guides`, `help`, `india`, `invite`, `master`, `openclaw`, `partners`, `pitch`, `portal`, `pricing`, `privacy`, `ref`, `report`, `results`, `roi`, `terminal`, `terms`, `try`, `unsubscribe`, `use-cases`, `vs`, `web-intelligence`, `zapier`). This should have been heavily covered in Batches 2-5; confirm completeness.
- `lib/` — ~60 subdirectories (`agency`, `ai`, `ai-workers`, `analytics`, `auth`, `automations`, `autopilot`, `billing`, `blog`, `booking`, `briefing`, `business-box`, `campaigns`, `channels`, `chat`, `commerce`, `config`, `content`, `crm`, `data`, `email`, `fly`, `funnels`, `ghl`, `guides`, `instructions`, `integrations`, `intelligence`, `knowledge`, `memory`, `multi-agent`, `onboarding`, `onfleet`, `openclaw`, `ovh`, `packages`, `payments`, `pinecone.ts`, `pipeline`, ...). If prior batches covered only some of these, `multi-agent`, `onfleet`, `ovh`, `briefing`, `autopilot`, `automations`, `business-box`, `data`, `fly`, `intelligence`, `packages`, and `knowledge` are worth confirming.
- `kyra-ghl-skill/` — **appears to be an empty directory** (ls showed no contents). Either genuinely empty or contents are symlinked/gitignored.
- `infra/` — `README.md`, `nginx/`, `provisioner/`, `restart-all.sh`, `scripts/`. Provisioner and nginx configs for the VPS. Pairs with `docs/CONTAINER-SYNC-API.md`.
- `infrastructure/openclaw/` — another infra tree, OpenClaw-specific.
- `marketplace/` — 6 marketing docs (ghl-app-listing.md, independence-messaging.md, launch-application-email.md, launch-posts.md, outreach-email.md, demo-video-script.md).
- `marketing/social/` — social-media assets.
- `content-drafts/{facebook,linkedin,x}/` — platform-specific content drafts.
- `supabase/`, `migrations/`, `scripts/`, `__tests__/`, `hooks/`, `types/`, `middleware.ts`, `vitest.config.ts`, `vercel.json`, `tailwind.config.ts` — infra/config files.
- Root-level docs NOT in this batch: `BRANDING.md`, `CLOUDFLARE-MIGRATION.md`, `CONTAINER-ARCHITECTURE.md`, `E2E-TEST-RESULTS.md`, `E2E-VERIFICATION.md`, `KYRA-AGENCY-PLATFORM-PLAN.md`, `KYRA-ROADMAP-2026-02-12.md`, `OVH-ARCHITECTURE-SPEC.md`, `PIPELINE-REDESIGN-SPEC.md`, `PRODUCT.md`, `SECURITY-ARCHITECTURE-ANALYSIS.md`, `SUMMARY.md`, `TECH-STACK.md`, `WORKER-DEPLOY-GUIDE.md`, `README.md`, `kyra-analysis.md`. A few of these (`TECH-STACK.md`, `CONTAINER-ARCHITECTURE.md`, `OVH-ARCHITECTURE-SPEC.md`, `WORKER-DEPLOY-GUIDE.md`, `PIPELINE-REDESIGN-SPEC.md`, `KYRA-AGENCY-PLATFORM-PLAN.md`) are likely operationally load-bearing and should be confirmed-covered by earlier batches or added.

**Template-side:** the vet-seo-worker template has `skills/` with only 2 runnable `run.ts` (geo-tester, nap-auditor). The other 8 skills (backlink-monitor, gbp-posts, outreach-scout, semantic-stacker, seo-content-writer, seo-reporter, ugc-monitor, web20-publisher) are **SKILL.md only** — the runtime for those lives in `lib/seo/worker-dispatcher.ts` and `lib/seo/publish-scheduler.ts` on the main-app side (worth confirming in a main-app review if not already done).

**Site-templates gap:** only the `generic` template is present; no industry-specific templates yet, which aligns with the template design being industry-agnostic and driven by `content/pages.json` + `lib/constants.ts` overrides at build time. The `generic` template also has a hardcoded literal `WIDGET_CLIENT_ID` in the script src URL of `layout.tsx` — this must be substituted by the Kyra build service. If `NEXT_PUBLIC_WIDGET_CLIENT_ID` is set, the meta tag gets the real value, but the widget script URL itself still needs placeholder replacement, or the widget fails silently. Potential bug worth flagging.
