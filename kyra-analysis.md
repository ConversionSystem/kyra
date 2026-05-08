# Kyra Codebase — Full Analysis (fresh from `origin/main`)

**Generated:** 2026-04-20
**Repo:** https://github.com/ConversionSystem/kyra
**Branch:** `main` (HEAD `9bdbb95d` after `git pull origin main`)
**Prior snapshot:** `8f69ab60` (15 commits behind) — full prior report at `kyra-analysis-8f69ab60.md`
**Source batch files retained:** `kyra-analysis-batch{1..7}.md`

---

## Table of Contents

1. [Executive Synthesis](#1-executive-synthesis)
2. [Delta vs Previous Snapshot (`8f69ab60`)](#2-delta-vs-previous-snapshot)
3. [File Inventory](#3-file-inventory)
4. [Batch 1 — Database Layer](#4-batch-1--database-layer)
5. [Batch 2 — Core Library (`lib/`)](#5-batch-2--core-library)
6. [Batch 3 — HTTP API Surface (`app/api/`)](#6-batch-3--http-api-surface)
7. [Batch 4 — Page Layer (`app/`)](#7-batch-4--page-layer)
8. [Batch 5 — Components & Hooks](#8-batch-5--components--hooks)
9. [Batch 6 — Config, Middleware, Scripts, Infra, Tests, Types](#9-batch-6--config-middleware-scripts-infra-tests-types)
10. [Batch 7 — Gap Coverage: Templates, Site-templates, Skills, Docs](#10-batch-7--gap-coverage)

---

## 1. Executive Synthesis

### What Kyra is (as the code reveals it)

A **multi-tenant AI-workforce-as-a-service platform** built on top of OpenClaw. Four-tier tenant hierarchy: **master → agency → client (AI worker) → sub-account**. Each `agency_client` row represents an AI worker that runs in its own Docker container on an OVH VPS (`15.204.91.157`, Traefik wildcard `{clientId}.gw.kyra.conversionsystem.com`). Agencies configure these workers via a Next.js 15 dashboard, connect them to GoHighLevel (GHL) CRM, and wire them into channels (SMS, voice, WhatsApp, Telegram, web chat, Discord, email). Revenue: Kyra subscriptions (Lite $99 / Pro $299 / Scale $499) + 10% Stripe Connect platform fee on agency-to-client billing + credits.

**Scale:** ~281 files across 51 `lib/` domains, 357 API routes, ~100 page routes, ~100 components. Clean on TODO rot (8 TODOs across 7 files).

### Top-priority risks (act first)

Every finding grounded in `file:line`. Ordered by severity × exploitability.

| # | Risk | Location | Impact |
|---|---|---|---|
| 1 | **LEAKED PRODUCTION SERVICE-ROLE JWT, UNCHANGED** | `scripts/backfill-templates.js:15` | Full RLS-bypass access to production Supabase `yaijdtsunxicuphrakcc`. JWT valid until **2036**. Line 17 also hardcodes `PROV_SECRET='kyra-provisioner-2026'`. Rotate the Supabase service-role key; purge from git history. |
| 2 | **Unauth endpoint leaks auth emails** | `app/api/admin/orphaned-users/route.ts:6` | No auth — returns up to 200 real user emails with timestamps. |
| 3 | **Unauth endpoint leaks infra state + project ID** | `app/api/admin/health-check/route.ts:26` | No auth — returns env presence, inline migration DDL, production Supabase project ID. Reconnaissance goldmine. |
| 4 | **Unsigned Resend webhook** | `app/api/webhooks/resend/route.ts:9` | Fake `email.complained` forces `unsubscribeContact` (lines 105-166); fake `opened`/`clicked` inflate CRM scoring up to `Math.min(100, score)`. Combined with item #5, attackers can tamper with any (agency, email) pair's subscription state + scores. |
| 5 | **Unauth unsubscribe endpoint** | `app/api/webhooks/unsubscribe/route.ts:9-17` | Anyone who can guess `{agency_id, email}` unsubscribes them; no signed token. |
| 6 | **Unsigned Retell webhook** | `app/api/voice/retell/webhook/route.ts:25` | Fake call records hit `client_conversations`, `voice_usage` (billing-impacting), `crm_activities`. |
| 7 | **Unsigned Twilio/channel webhooks** | `/api/voice/twilio/{webhook,gather}`, `/api/voice/webhook`, `/api/channels/{telegram,whatsapp}/webhook` | No `x-twilio-signature`, no `x-hub-signature-256`, no Telegram secret-token. Rely on URL obscurity. |
| 8 | **GHL webhook auth fails OPEN when secret unset** | `app/api/webhooks/ghl/route.ts:40-45`, `app/api/crm/webhook/route.ts:49-53`, `app/api/ghl/webhook/route.ts:32-38` | If `GHL_WEBHOOK_SECRET` env var missing, all three receivers return success silently. Contrast `lib/auth/cron.ts:27-29` which fails CLOSED — mirror that pattern. |
| 9 | **Stored XSS via admin notification email** | `app/api/leads/route.ts:47-74` | Body fields (`name`, `company`, `industry`, `size`, `how`, `message`) interpolated raw into HTML email sent to `angel@conversionsystem.com`. Attacker-controlled `<img onerror>` / phishing links land in the founder's inbox. No rate limit, no CAPTCHA. |
| 10 | **Orphan record creation from anon input** | `app/api/widget/[clientId]/lead/route.ts:47-100` | If `clientId` matches an orphaned `client_sites` row but no `agency_clients` row, the handler auto-creates an `agency_clients` row with attacker-controlled `name`/slug under that site's `agency_id`. Always returns 200. |
| 11 | **`/api/public/workers` leaks internal client UUIDs** | `app/api/public/workers/route.ts:7-53` | No auth, no pagination cap. Client UUIDs are capability tokens for `/api/widget/chat`, `/api/portal/[clientId]/chat`. Enumeration → anon chat with any agency's worker. |
| 12 | **BROKEN RLS policy** | `delivery_sms_log` policy `WHERE agency_id = auth.uid()` | Compares user UUID to agency UUID — never matches; table silently service-role-only. |
| 13 | **RLS wholly missing** | `agency_credits`, `credit_transactions`, whole `email_*` family (`sequences`, `steps`, `enrollments`, `nurture_queue`, `templates`, `contacts`, `campaigns`, `analytics`, `unsubscribes`), `pipeline_ab_tests`, `pipeline_message_templates`, `site_deploys`, `client_sites`, `site_pages` | Everything relies on application-layer `eq('agency_id', ...)` correctness. One wrong filter = cross-tenant leak. |
| 14 | **Encryption-at-rest promised, unenforced** | `ghl_access_token`, `ghl_refresh_token`, `pipeline_integrations.access_token`, `agencies.api_keys`, `user_skills.api_key_encrypted` | Migration comments claim "encrypt at rest via Vault in production"; columns are plain TEXT. Only `lib/secrets/` implements AES-256-GCM (for `client_secrets` only). |
| 15 | **Next.js route conflict** | `app/ai-for/[niche]/page.tsx` + `app/ai-for/[slug]/page.tsx` | Two dynamic segments at same directory level. `next build` will refuse or silently shadow one. |
| 16 | **N+1 credit deduction loop** | `app/api/webhooks/openclaw-usage/route.ts:62-66` | `for (let i = 0; i < totalCredits; i++) await deductCredits(...)`. On Sonnet (75 cr/turn × 50 turns = 3,750 sequential DB writes). |
| 17 | **Hardcoded Stripe webhook endpoint ID** | `lib/stripe/webhook-health.ts:16` (`PRIMARY_WEBHOOK_ID = 'we_1TCcvQDr3LPJOIaMuaY1zJhG'`) | Ties health check to a specific Stripe account — not env-driven. |
| 18 | **Impersonation endpoints have no audit trail** | `/api/master/impersonate`, `/api/admin/accounts/[id]/login-as` | Both mint magic links for arbitrary users. Only defense: `MASTER_EMAILS` allowlist. No DB audit row written. |
| 19 | **`/api/auth/callback` permissive redirect** | `app/api/auth/callback/route.ts:10-11` | `NextResponse.redirect(origin + rawRedirect)` accepts any `/path`; protocol-relative `//evil.com` depends on Vercel URL parsing. Worth constraining to same-origin allowlist or `new URL(raw, origin)` with origin check. |
| 20 | **Middleware bypasses all `/api/*`** | `middleware.ts` | No global rate limit, no IP throttle. `lib/rate-limit.ts` exists but is opt-in — webhooks, cron, billing, agency CRUD each responsible for their own gating. |
| 21 | **CSP `unsafe-eval`** | `next.config.mjs` | Flagged with a TODO in the config; still required by Next.js build. |
| 22 | **Cron env drift** | `.env.example` documents `CRON_API_KEY`; `lib/auth/cron.ts` + tests read `CRON_SECRET` | Operators following the example template silently get 500s. |
| 23 | **`console.log('[middleware]', ...)` in hot path** | `middleware.ts:1-13` | Every non-`/api/*` request logs unguarded. Floods Vercel logs at scale. |

### Architectural debt

Kyra's structural evolution left a trail of competing implementations. The post-pull state is cleaner than the snapshot (Fly.io decommissioned — see Delta §2), but several items remain:

1. **Two LLM model routers** — `lib/ai/model-router.ts` (dashboard, 3-tier) + `lib/ghl/model-router.ts` (widget, provider-aware). Same `COMPLEX_KEYWORDS`, both headers say "keep in sync", and they've **already drifted** (different pattern counts).
2. **Three separate `resolveAgencyApiKey`-style functions, two orderings:**
   - `lib/billing/byok.ts:63-65` → `preferred > openai > anthropic > openrouter > google`.
   - `lib/ovh/provisioner.ts:36-48` (`resolveWinningKey`) + `lib/ghl/poller.ts:68-80` → `anthropic > openrouter > openai > google`.
   Same agency can use different keys in different subsystems.
3. **Three GHL webhook receivers** — `/api/webhooks/ghl`, `/api/crm/webhook`, `/api/ghl/webhook`. Renamed because "GHL blocks URLs containing 'ghl'". All route to the same handlers but with different header names (`x-webhook-secret` / `x-kyra-secret` / `x-ghl-signature` / `x-hub-signature-256`) — and two of three fail open.
4. **Three Stripe webhook endpoints** — `/api/webhooks/stripe` (primary), `/api/stripe/webhooks` (disabled in Stripe dashboard but still live in code), `/api/stripe/credits/webhook` (separate secret for credit packs). Plus two Stripe checkout routes (`/api/billing/checkout` returns 400; `/api/stripe/checkout` is live) and two portal routes.
5. **Four voice webhook entry points** — `/api/voice/retell/webhook`, `/api/voice/twilio/webhook`, `/api/voice/twilio/gather`, `/api/voice/webhook` — none verify signatures.
6. **Two impersonation endpoints** — `/api/master/impersonate` + `/api/admin/accounts/[id]/login-as`. Identical magic-link flow.
7. **Four hardcoded admin email allowlists drift:**
   - `['hello@', 'angel@']` — most admin/master routes + `(dashboard)/agency/layout.tsx:21`.
   - `['hello@', 'angel@', 'steve@']` — `admin/stats`, `admin/content-calendar`.
   - `['hello@', 'angel@', 'steve@', 'webblex10@gmail.com']` — `admin/content/page.tsx` only.
   - `process.env.MASTER_EMAILS` split by comma — `admin/router-migrate` (only env-driven).
   Rotating a founder's email silently de-syncs the others. Move to `lib/auth/admin.ts`.
8. **Two `updated_at` trigger functions** — `update_updated_at_column()` (from `schema.sql`) + `set_updated_at()` (from `20260213004_agency_schema.sql`) + 5+ table-specific duplicates.
9. **Two migration directories** — `supabase/migrations/` (81) + `migrations/` at root (2). No documented tooling split.
10. **Two plan taxonomies** — `users.plan` checks `free|starter|business|max|enterprise`; `agencies.plan` checks `free|starter|pro|scale|beta`. No mapping table.
11. **Stale `Plan` type in `types/index.ts`** — `'free'|'starter'|'business'|'max'` diverges from real `'free'|'solo_pro'|'starter'|'pro'|'scale'`. All five files in `types/` describe aspirational features that never shipped (pipelines, memory-graph, notifications, channels) — safe to delete after grep-sweep.
12. **Incomplete portal consolidation** — `(portal)/client-portal/[clientId]` (authenticated, redirects to **non-existent** `/client-portal/[clientId]/request-access` on auth failure) coexists with `/portal/[clientId]` (public, service-client fetch, `?terminal=1` escape hatch).
13. **Incomplete route conflict** — `app/ai-for/[niche]` + `app/ai-for/[slug]` (item #15 above).

### Code smells (by volume)

| Smell | Count |
|---|---|
| `timeAgo()` reimplemented | **7 copies** (webhook-health-card added one) |
| `CopyButton` reimplemented | **5 copies** |
| Tab-pill-bar reimplemented | **10+ copies** — `crm-tab`, `marketing-tab`, `delivery-sms-tab`, `worker-performance-card`, `email-marketing-tab`, `skills-tab`, `secrets-tab`, `dispatch-tab`, `insights-tab`, `train-tab`, `seo-geo-command-center` |
| Channel-color maps | 3+ copies |
| `user → agency → redirect` auth preamble | **22 pages** reimplement the 6-line stanza (up from 15 in snapshot). `requireAgencyMember()` exists in `lib/agency/middleware.ts`, used in exactly 1 page (`clients/[id]/seo-guide/page.tsx:13`) |
| Master agency UUID `1511e077-77ef-4c47-81fd-06a3bc9f1dbb` hardcoded | 4 components + 1 page + 2 API routes + 1 lib file (server code falls back to `process.env.MASTER_AGENCY_ID`; client components hardcode) |
| Meta Pixel ID `735277348604833` hardcoded | `components/analytics/MetaPixel.tsx:5` (no env var) |
| Plan-limit table inlined | `app/(dashboard)/agency/page.tsx:49` duplicates `lib/billing/plans.ts::maxClients` |
| Referral cookie `httpOnly` inconsistent | `/invite/[code]` = `false`, `/ref/[agencyId]` = `true` |
| `robots.ts` dead line | `/(auth)/` group name doesn't appear in URLs |
| `VeterinaryCare` JSON-LD schema hardcoded | Both `lib/seo/schema-markup.ts:16` AND `lib/sites/schema-generator.ts:31` |
| Pitch decks duplicated | `/pitch/`, `/pitch/ai-agency/`, `/pitch/agencies/`, `/pitch/inbound-growth/`, `/pitch/[agencyId]/[industry]` — 5 slide sets, no shared `<Deck>` |

### Monoliths (>600 LOC)

Top refactor candidates:

1. `components/dashboard/client-tabs/crm-tab.tsx` — **2920** (a complete CRM in one file)
2. `components/seo-geo-command-center.tsx` — **1966**
3. `components/dashboard/client-tabs/email-marketing-tab.tsx` — **1382**
4. `components/dashboard/client-tabs/dispatch-tab.tsx` — **1275**
5. `lib/ovh/provisioner.ts` — **1142**
6. `components/dashboard/client-tabs/marketing-tab.tsx` — **1077**
7. `components/dashboard/client-tabs/ai-workers-tab.tsx` — **996**
8. `components/dashboard/client-tabs/website-tab.tsx` — **902**
9. `lib/ghl/poller.ts` — **~700+** (god-file for GHL message ingestion)
10. `components/dashboard/client-tabs/workflows-tab.tsx` — **706**
11. `components/dashboard/solo-overview.tsx` — **652**
12. `components/dashboard/client-tabs/tasks-card.tsx` — **631**
13. `components/dashboard/client-tabs/training-sub-tab.tsx` — **607**

**Voice UI sprawl:** 3 components + chat + orphan = ~1,800 LOC across 5 files with no shared subcomponents.

### Orphans / dead code (~1,900 LOC deletable)

Verified via `rg "from '@/components/..."` across `app/` and `components/`:

- **Entire subdirs orphaned:** `components/landing/*` (360 LOC), `components/agency/*` (666 LOC — `(dashboard)/agency/layout.tsx:5` comment: "VoiceCommandButton removed"), `components/onboarding/*` (438 LOC — `guided-tour.tsx` + `launch-progress.tsx`).
- **Individual orphans:** `components/chat/WakingUpIndicator.tsx` (73), `components/pipelines/PipelineProgress.tsx` (158), `components/marketing/testimonial-placeholder.tsx` (26 — explicit "removed" comment at `app/ghl-marketplace/page.tsx:6`), `components/open-control-ui-button.tsx` (36), `components/billing/PlanRedirect.tsx` (10 — no-op stub).
- **Lib legacy:** `lib/openclaw/*` (3 importers only — 3 legacy routes `/api/openclaw/health`, `/api/openclaw/tools`, `/api/chat/openclaw`); `lib/email/sequences.ts` (DEPRECATED stub); `lib/billing/plans.ts:203-243` (5 `@deprecated` credit helpers kept for compile compat); `lib/security/prompt-injection.ts:289-331` (4 `@deprecated`); `lib/seo/schema-markup.ts:92-95` (1 `@deprecated`).
- **Type definitions:** all 5 files in `types/` describe aspirational features (stale `Plan`, memory-graph, pipelines, notifications, channels). Delete after grep-sweep.

### Top-10 consolidation targets

1. **Rotate the leaked service-role JWT.** Remove the fallback in `scripts/backfill-templates.js:15`, refactor to hard-fail if env unset. Rotate the key in Supabase. Audit git history.
2. **Add auth to `/api/admin/orphaned-users` + `/api/admin/health-check`.** Consolidate the 4 admin email allowlists into `lib/auth/admin.ts`.
3. **Add signature verification** to Resend, Retell, Twilio, channel (Telegram, WhatsApp), and unsubscribe webhooks. Flip GHL/CRM webhook `if (secret)` to fail-closed, mirroring `lib/auth/cron.ts:27-29`.
4. **Fix `delivery_sms_log` RLS.** Enable RLS on `email_*` family, `agency_credits`, `credit_transactions`, `pipeline_ab_tests`, `pipeline_message_templates`, `site_*` tables — even permissive is better than none.
5. **Resolve `app/ai-for/[niche]` vs `app/ai-for/[slug]` route conflict.** Next.js will refuse to build this.
6. **Extract a `<Tabs>` primitive** into `components/ui/tabs.tsx`. This single change removes 10+ reimplementations and hundreds of LOC across `crm-tab`, `marketing-tab`, etc.
7. **Consolidate the 3 `resolveAgencyApiKey`/`resolveWinningKey` functions** into a single BYOK resolver with one canonical priority.
8. **Start chipping at the monoliths.** Priority: `crm-tab.tsx` (2920) → folder with `contacts/deals/companies/tasks`. `ovh/provisioner.ts` (1142) → split into lifecycle + chat + templates.
9. **Write tests for the 5 most critical routes.** `/api/chat`, `/api/webhooks/stripe`, `/api/webhooks/ghl`, `/api/cron/scheduled-tasks`, `/api/agency/clients` creation. Current: 3 test files, ~3% coverage.
10. **Ship a proper edge rate limiter.** Currently opt-in in `lib/rate-limit.ts`. Start with `/api/leads`, `/api/webhooks/*`, `/api/widget/chat`, `/api/portal/[clientId]/chat`.

### Documentation divergence (high-signal, easy to miss)

- **`KYRA-STRATEGIC-ROADMAP.md` (v2.2) and `ARCHITECTURE-ANALYSIS.md`** still describe Fly.io + `kyra-gateway.fly.dev` as the live AI bridge. **Fly.io has been decommissioned** in commit `3d2fd918` — `lib/fly/*`, `infrastructure/openclaw/fly.toml`, `infrastructure/openclaw/deploy.sh` all deleted. The current canonical architecture is OVH + Traefik per-client containers. Update the roadmap and point `ARCHITECTURE-ANALYSIS.md` at `OVH-ARCHITECTURE-SPEC.md` + `CONTAINER-ARCHITECTURE.md`.
- **`CHANGELOG.md` stale since Feb 9** — dozens of shipped PRs (billing fixes, SEO Command Center, ⌘K removal, Stripe webhook health monitor, Fly decommissioning) not recorded.
- **`CLAUDE.md:75` and `TECHNICAL-SPEC.md:435`** still document `kyra-user-{user_id}` session key format. Actual code uses `agent:client:{clientId}` / `agent:main:{userId}` per `lib/agency/container.ts:14-23`.
- **`HEARTBEAT.md` dated Feb 23** — 5 items still need Angel: `RESEND_API_KEY`, 2 Supabase migrations, `SIGNUP_WEBHOOK_URL`, GHL Marketplace submission, 60-sec demo video.
- **`tasks/todo.md`** — unified SEO/GEO Command Center plan, all 5 items still unchecked; Review section empty.
- **AUDIT-RESULTS.md (Apr 13) still-open items:** `schema-markup.ts` hardcodes `VeterinaryCare`; Reddit scanner in `seo/run/route.ts` hardcoded to vet subreddits; content-draft generator uses vet-specific prompt; `content-engine.ts` similarity check is advisory (should block at 65%).
- **External:** `KYRA/Kyra_Bugs_Defects_Analysis.docx` + `KYRA/Kyra_Claude_Integration_Analysis.docx` — 2 Word docs dated today (Apr 20). Binary, not parsed here. Likely Claude Projects exports or external analyst artifacts — reconcile with the Markdown audit docs or move into `docs/`.

---

## 2. Delta vs Previous Snapshot (`8f69ab60`)

15 commits landed between the snapshot and the pull. Material impacts to the analysis:

### Architectural changes

- **Fly.io fully decommissioned** (commit `3d2fd918`). Removed:
  - `lib/fly/client.ts`, `lib/fly/provisioner.ts` — entire `lib/fly/` directory gone.
  - `infrastructure/openclaw/fly.toml`, `infrastructure/openclaw/deploy.sh`.
  - `lib/worker/health.ts`: `checkWorkerHealth` removed (11 lines); only `checkGatewayHealth` remains (40 lines).
  - `KYRA_WORKER_URL` removed from `.env.example`.
  
  Deploy targets down from **4 → 2 active** (Vercel + OVH VPS; Cloudflare Workers wiring still present but latent).

- **⌘K command palette fully removed** (commits `bc61eb11`, `3b9ed53e`). Deleted:
  - `components/command-palette.tsx` (323 LOC).
  - `components/command-palette-wrapper.tsx` (11 LOC).
  - `CommandPaletteWrapper` import in `(dashboard)/agency/layout.tsx` removed.
  
  **Side effect:** `components/agency/VoiceCommandButton.tsx` (333 LOC) appears orphaned — `(dashboard)/agency/layout.tsx:5` has explicit comment `// VoiceCommandButton removed — not functional, just UI noise`.

- **Stripe webhook health monitor added** (commit `d9dda248`, PR #385). New:
  - `app/api/admin/webhook-health/route.ts` — GET-only, `ADMIN_EMAILS` allowlist (2 emails: `hello@`, `angel@`).
  - `components/admin/webhook-health-card.tsx` (212 LOC) — polls every 5 min via hand-rolled `setInterval` (did NOT adopt `usePolling` — adds an 8th `timeAgo` copy).
  - `lib/stripe/webhook-health.ts` (141 LOC) — `getWebhookHealth()` checks hardcoded endpoint ID `we_1TCcvQDr3LPJOIaMuaY1zJhG`, verifies 5 required events registered, scans last 24h events for undelivered. Rendered on `/admin` via `app/admin/admin-client.tsx:10` line 407.
  - Motivation (header comment `webhook-health.ts:3-6`): "after incident where webhook was silently disabled, causing a customer's plan activation to fail."

- **CI auto-deploy churn** (commits `b8a2106a` → `d665b07c`). PR #384 briefly enabled auto-deploy on merge to main, removing both `ignoreCommand: exit 1` and `git.deploymentEnabled: false` from `vercel.json`. 2 days later reverted — `ignoreCommand` was restored but **`git.deploymentEnabled: false` was NOT restored**. Current state: Vercel git integration still "enabled" but every auto-triggered build dies immediately on `exit 1`. The CI `deploy` job is `if: false`. Redundant belt-and-suspenders — pick one source of truth when re-enabling.

- **Billing fix: credits on `subscription.updated`** (commit `8f69ab60`, pre-snapshot head). Webhook now grants credits via idempotent keys `checkout:${session.id}` / `sub_renewed:${sub.id}:${period_start}` / `invoice:${invoice.id}`.

- **Billing fix: plan upgrade race condition** (commit `1936386f`). `handleCheckoutSessionCompleted` (`lib/stripe/webhooks.ts:155-225`) now uses session metadata + `planRank` ordering as a safety net against `customer.subscription.updated` firing before the agency row is findable. Explicit only-upgrade-never-downgrade guard.

- **2 new blog posts** added to `lib/blog/posts.ts` (324 lines added): "First Claude Skill for OpenClaw (2026 Step-by-Step Guide)" + "Weekly quality audit fixes (2026-04-19)".

- **`KYRA/` directory appeared today (Apr 20)**: 2 binary `.docx` files — `Kyra_Bugs_Defects_Analysis.docx` (30KB) and `Kyra_Claude_Integration_Analysis.docx` (29KB). Not parsed here. Likely external analysis artifacts.

### File count delta

| | `8f69ab60` | `9bdbb95d` | Δ |
|---|---:|---:|---:|
| TS/TSX | 979 | 978 | −1 |
| SQL | 84 | 84 | 0 |
| JSON | 14 | 14 | 0 |
| MJS | 5 | 5 | 0 |
| **Total** | **1,082** | **1,081** | **−1** |
| `lib/` | 282 | 281 | −1 (fly removed) |
| `app/api/` routes | 356 | 357 | +1 (webhook-health) |
| `components/` | 101 | 100 | −1 (palette × 2 removed, webhook-health-card added) |

### Findings still present on new HEAD

All 23 security findings from §1 exist on the new HEAD. The leaked JWT is unchanged; no RLS gaps closed; no route conflict resolved; 22 auth-preamble duplications (up from 15 in the snapshot note — the prior count was conservative). Doc drift worsened: `KYRA-STRATEGIC-ROADMAP.md` + `ARCHITECTURE-ANALYSIS.md` now describe a Fly.io architecture that no longer exists.

---

## 3. File Inventory

| Category | Count |
|---|---:|
| TypeScript / TSX files | 978 |
| SQL files | 84 |
| JSON files | 14 |
| MJS files | 5 |
| **Total** | **1,081** |

### Top-level layout

- `app/` — Next.js 15 App Router (357 `route.ts` + 107 `page.tsx` + 5 `layout.tsx`)
- `lib/` — 281 TS files across 51 domain directories
- `components/` — 100 React components across 19 subdirs (incl. new `admin/`)
- `supabase/schema.sql` + `supabase/migrations/` (81 files) + `migrations/` root (2 files)
- `scripts/` (8 files, 2,088 LOC total) — deploy, seed, backfill, migration, QA
- `infra/` + `infrastructure/openclaw/` (post-Fly cleanup)
- `templates/vet-seo-worker/` + `site-templates/generic/` + `skills/` (ghl-crm)
- `docs/` (34 files), `types/` (5 files — aspirational), `__tests__/` (3 files)
- `KYRA/` — 2 binary `.docx` files (Apr 20, external analysis artifacts)

### Stack (`package.json`)

- Next.js 15.5.12, React 19.2.4
- `@supabase/ssr` 0.8, `@supabase/supabase-js` 2.94
- Anthropic SDK 0.72, OpenAI SDK 6.17
- Pinecone 7, Stripe 14.25 (API version `2025-04-30.basil` with `@ts-expect-error`)
- Resend 6.9, Slack Web API 7, Retell Client JS SDK
- Zod 4, Tailwind 3.4, `@tailwindcss/typography`
- `@opennextjs/cloudflare` 1.16 + Wrangler 4.64 (latent deploy target, not exercised)
- Vitest 4 (3 test files)

**Not present:** `@radix-ui/*`, `zustand`, `redux`, `@tanstack/react-query`, `jotai`. No state management library. No `components.json` (shadcn hand-rolled). No Playwright.

---

## 4. Batch 1 — Database Layer

Full detail: `kyra-analysis-batch1.md` (2,937 words). Summary below.

### Domain map — 80+ tables across 12 domains

- **Auth/users (legacy single-tenant):** `users`, `conversations`, `messages`, `memories` (Pinecone-linked), `integrations`, `reminders`, `notifications`, `automations`, `user_skills`, `user_channels` (defined twice — `005_channels.sql` vs `20260211_user_channels.sql`), `user_files`, `entities`/`relationships`, `pipelines` (single-user, distinct from agency pipeline system).
- **Agency core:** `agencies` (owner_id, plan, slug, settings, Stripe/GHL/gateway, api_keys BYOK), `agency_members`, `agency_clients` (GHL tokens + gateway fields + ai_model), `agency_templates`, `agency_billing` (immutable ledger), `sub_account_members`/`sub_account_invitations` (portal users), `orphaned_auth_users` VIEW.
- **Billing/credits/referrals:** `agency_credits` (unique on agency_id), `credit_transactions`, `agency_referrals`, `premium_template_subscriptions` (in root `migrations/`), `kyra_waitlist`.
- **CRM:** `crm_companies`, `crm_contacts` (AI fields: `ai_summary`, `ai_next_action`, `score`, `stage`), `crm_activities`, `crm_deals`, `crm_tasks`, `customer_memory` (client_id TEXT, GIN on tags), `web_chat_leads`.
- **Pipeline (AI sales engine):** `pipeline_campaigns`, `pipeline_leads`, `pipeline_webhooks`, `pipeline_activity_log`, `pipeline_integrations`, `pipeline_crm_sync_log`, `pipeline_follow_ups`, `pipeline_ab_tests`, `pipeline_message_templates`.
- **Channels/messaging/voice:** `client_conversations` (session_id/source_url added later), `ghl_webhook_logs`, `ghl_message_log`, `ghl_action_proposals`/`ghl_action_log`, `ghl_subaccount_requests`, `delivery_sms_log`, `review_requests`, `payment_requests`, `voice_call_logs`, `voice_call_history`, `voice_usage`.
- **Email marketing:** `email_templates`, `email_contacts`, `email_campaigns`, `email_analytics`, `email_unsubscribes`, `email_sequences`, `email_sequence_steps`, `email_sequence_enrollments`, `email_nurture_queue`.
- **Bookings:** `client_bookings`, `client_booking_config`.
- **Knowledge:** `knowledge_documents`, `client_knowledge`, `client_secrets` (encrypted_value TEXT).
- **Website builder:** `client_sites` (ALTERed 7+ times), `site_pages` (AI-generated HTML), `site_deploys`, `build_requests`.
- **SEO/GEO Command Center** (`20260413001`): `seo_industry_packs`, `seo_city_data`, `seo_page_metrics`, `seo_geo_results`, `seo_nap_audits`, `seo_competitor_scores`, `seo_content_gaps`, `seo_keyword_rankings`, `seo_published_content`, `seo_publish_queue`.
- **Workers/automation:** `worker_tasks`, `worker_task_runs`, `worker_performance`, `client_workflows`, `workflow_runs`.
- **Ops:** `dispatch_events`, `firecrawl_usage`, `content_calendar` (root `migrations/`).

**No `CREATE TYPE` ENUMs anywhere** — every enumeration is TEXT + CHECK. Adding a value requires `DROP CONSTRAINT ... ADD CONSTRAINT`. One VIEW (`orphaned_auth_users`), zero materialized views.

### Migration timeline (20 inflection points)

1. **Baseline** (`schema.sql`) — single-tenant personal AI.
2. **`001_fix_plans_and_trigger.sql`** — hardens `handle_new_user` with EXCEPTION + ON CONFLICT.
3. **Bolt-ons:** notifications (`003`), pipelines legacy (`004`), channels (`005` — conflicts with later `20260211_user_channels.sql`), memory graph (`006`).
4. **User-level skills & files** (`20260211`, `20260212`, `20260213001-003`).
5. **Agency pivot (Feb 13)** — `20260213004_agency_schema.sql` introduces `agencies`, `agency_members`, `agency_clients`, `agency_templates`, `agency_billing`, `set_updated_at()`, `user_agency_ids()`, 5 built-in templates.
6. **GHL Phase 2** (`20260214001`).
7. **Billing + templates** — `20260216001_enhanced_templates.sql` + `20260216001_stripe_connect_billing.sql` (**collision**), `20260216002_ghl_message_log.sql`.
8. **Template expansion** (`20260217001-004`).
9. **Gateway V1 (Fly.io agency-level)** (`20260218002_agency_gateway.sql`). Now decommissioned in code but columns remain.
10. **Knowledge base** (`20260219001`).
11. **Gateway pivot to OVH per-client** (`20260220001_per_client_gateway.sql`), agency-level rewritten in `20260222001_agency_gateway.sql` — **two overlapping agency_gateway migrations**, both ADD IF NOT EXISTS so columns stack.
12. **Plan constraints drift** — `20260222002_add_free_plan.sql` vs `20260222002_ghl_contact_scan.sql` (**collision**).
13. **Account hierarchy + credits + referrals** (`20260223001-004`, `20260224001` VIEW).
14. **Sales pipeline (Feb 25-28)** (`20260225001`, `20260226001-002`, `20260227002`, `20260228001`).
15. **Native CRM** (`20260227001-002`).
16. **Comms surfaces** (`20260301001-002`, `20260302001-002`).
17. **Voice AI** (`20260306001-002`, `20260312002`, `20260313002` — triple-definition of `voice_call_logs`).
18. **Email stack (Mar 12)** (`20260312003`) — **no RLS anywhere in file**.
19. **Website Builder → SEO Command Center** (`20260313004` → `20260413001_seo_command_center.sql`).
20. **Worker engine + content calendar** (`20260401002-003`, `20260403002-003`, `20260415001`, root `migrations/20260417001`).

### Multi-tenancy

4-tier: master → agency → agency_clients → sub_account_members. Scoping cols: `agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE` (canonical), `client_id UUID REFERENCES agency_clients(id)` (secondary), `user_id UUID REFERENCES auth.users(id)` (legacy pre-agency). RLS helper: `public.user_agency_ids()` (SECURITY DEFINER STABLE SQL). Many later migrations inline `SELECT agency_id FROM agency_members WHERE user_id = auth.uid()` instead of calling the helper — inconsistency.

### Row Level Security

**~55 tables have RLS enabled.** 6 policy archetypes: user-scoped, agency-scoped via helper, agency-scoped inlined, client-scoped via parent, service-role-only with `USING (true)`, public token lookup. **RLS GAPS (NO RLS):**
- `agency_credits`, `credit_transactions` — billing-sensitive.
- `pipeline_ab_tests`, `pipeline_message_templates`.
- `client_sites`, `site_pages`, `site_deploys` — per-client website data.
- `email_templates`, `email_contacts`, `email_campaigns`, `email_analytics`, `email_unsubscribes`, `email_sequences`, `email_sequence_steps`, `email_sequence_enrollments`, `email_nurture_queue` — entire email stack.

**BROKEN:** `delivery_sms_log` policy `WHERE agency_id = auth.uid()` (UUID vs user-UUID — never matches).

### Smells

- Duplicate migration filenames: `20260216001_*` × 2, `20260222002_*` × 2.
- Overlapping `agency_gateway` (`20260218002` + `20260222001`) — stacked columns, redundant `gateway_status` constraints.
- Two `updated_at` trigger functions (`set_updated_at`, `update_updated_at_column`) + 5+ table-specific copies.
- Scoping-column type drift: `client_id` TEXT on `review_requests`, `payment_requests`, `customer_memory`, `voice_call_logs`, `delivery_sms_log` (every other table uses UUID with FK). Breaks cascades.
- Missing FKs: `review_requests.agency_id`, `payment_requests.agency_id`, `pipeline_ab_tests.agency_id + campaign_id`, `pipeline_message_templates.agency_id`, `worker_tasks.agency_id`, `worker_task_runs.client_id + agency_id`, `client_knowledge.agency_id`, `worker_performance.agency_id`, `dispatch_events.agency_id`.
- Parallel plan taxonomies: `users.plan` vs `agencies.plan`.
- 4 places store GHL OAuth tokens (`integrations`, `pipeline_integrations`, `agencies`, `agency_clients`).
- Encryption comments never enforced (plain TEXT columns).
- `site_pages` has 5 coexisting render paths (content_sections / section_order / html_content / generation_mode / template_preset).
- Two migration directories with no documented tooling split.

---

## 5. Batch 2 — Core Library

Full detail: `kyra-analysis-batch2.md` (6,147 words). **51 subdirs** under `lib/` + 4 top-level files.

### 51 domains at a glance

Agency backbone (`agency/`), Anthropic wrapper (`ai/`), role templates (`ai-workers/`), reporting (`analytics/`), cron auth (`auth/`), event-driven workflows (`automations/`), time-based scheduler (`autopilot/`), **billing SSOT** (`billing/`), static posts (`blog/`), AI booker (`booking/`), daily briefing (`briefing/`), one-click deploy (`business-box/`), campaign generator (`campaigns/`), unified channels (`channels/`), shared chat core (`chat/`), WhatsApp commerce (`commerce/`), feature flags (`config/`), content pillars (`content/`), **CRM** (24 files, `crm/`), roles data (`data/`), email stack (`email/`), funnels generator (`funnels/`), **GHL integration** (23 files + 9 skill files, `ghl/`), setup guides (`guides/`), persona presets (`instructions/`), third-party adapters (`integrations/`), agency analytics (`intelligence/`), RAG (`knowledge/`), customer memory (`memory/`), department routing (`multi-agent/`), onboarding tracker (`onboarding/`), delivery dispatch (`onfleet/`), **legacy OpenClaw** (`openclaw/`, 3 importers), **current OVH gateway** (`ovh/`, 30 importers), industry packages (`packages/`), payment links (`payments/`), **AI sales pipeline** (`pipeline/`), review engine (`reviews/`), per-client secrets vault (`secrets/`), prompt-injection defense (`security/`), SEO stack (`seo/`), AI website builder (`sites/`), skill registry (`skills/`), delivery SMS (`sms/`), Stripe platform (`stripe/`), Supabase factories (`supabase/`), task engine (`tasks/`), industry templates (`templates/`), tool-use implementations (`tools/`), multi-provider voice (`voice/`), worker health (`worker/`).

Top-level: `utils.ts`, `pinecone.ts`, `rate-limit.ts`, `ai-health-score.ts`.

### A. Dependency graph

**Foundation (imported by most):**
- `lib/supabase/server.ts` — universal. `createServiceClientWithoutCookies()` is the correct service-role factory; commented at `server.ts:31-40` to explain why NOT to use `@supabase/ssr::createServerClient` (it extracts JWT from cookies and applies RLS even with service_role key).
- `lib/billing/credit-engine.ts` — every billable action flows through `requireCredits` + `deductCredits`.
- `lib/utils.ts`, `lib/pinecone.ts`, `lib/rate-limit.ts`.

**Core services:** `lib/ai/*`, `lib/openclaw/*` (3 importers), `lib/ovh/*` (**30 importers — dominant**), `lib/stripe/*`, `lib/agency/*`, `lib/secrets/*`.

**Integration layer:** `lib/ghl/*`, `lib/voice/*`, `lib/sms/*`, `lib/channels/*`, `lib/email/*`, `lib/onfleet/*`, `lib/integrations/*`.

**Top of stack:** `lib/autopilot/*`, `lib/business-box/*`, `lib/pipeline/*`, `lib/sites/*`, `lib/seo/*`, `lib/tasks/*`.

`lib/ovh/provisioner.ts` is the single most-depended-on integration file — **30 importers**.

### B. OpenClaw integration

**Legacy `lib/openclaw/*` (5 files, 3 route importers):**
- Per-**agency** gateway model. Session: `kyra-user-${userId}` (`openclaw/sessions.ts:36-38`).
- Hand-rolled WebSocket client (`gateway-ws.ts`) to bypass webpack issues with `ws` library.
- 30-min in-memory session TTL.
- Only 3 route files use it: `app/api/chat/openclaw`, `app/api/openclaw/health`, `app/api/openclaw/tools`.

**Current `lib/ovh/*` (4 files, 30 importers):**
- Per-**CLIENT** Docker container on OVH VPS. Traefik wildcard `{clientId}.gw.kyra.conversionsystem.com`.
- OpenAI-compatible `/v1/chat/completions` HTTP (not WebSocket).
- Session: `agent:client:${clientId}` (from `lib/agency/container.ts:14-16`), header `X-OpenClaw-Session-Key` / `X-Session-Key`.
- Anthropic prompt caching auto-applied for `claude*` models (`provisioner.ts:677-696`).
- BYOK routing bypass: if agency has any key, skip `kyra-router` sidecar (`provisioner.ts:281-295`).
- `resolveWinningKey` priority: `anthropic > openrouter > openai > google` (`provisioner.ts:36-48`).

**Session key evolution:**
- Old: `kyra-user-${userId}` — still documented in `CLAUDE.md:75` + `TECHNICAL-SPEC.md:435` (**stale docs**).
- Current per-client: `agent:client:${clientId}`.
- Current per-user: `agent:main:${userId}`.
- Planned next step (in roadmap not in code): `agent:client:{id}:contact:{contactId}`.

**Feature flags (`lib/config/features.ts`):** `useWorker`, `useOpenClaw`, `openclawSkills`. All predate the OVH architecture — new code paths skip the flags and call `resolveClientGateway` + `chatViaGateway` directly.

### C. AI orchestration — 4 overlapping call paths

1. **Dashboard chat → `lib/ai/claude.ts`** — direct Anthropic, 5-round tool loop, `resolveModelPreference()` via `lib/ai/model-router.ts`.
2. **Widget/GHL webhook → `lib/chat/core.ts` + `lib/ghl/webhook-handler.ts` + `smart-handler.ts`** — direct LLM via `lib/ghl/direct-llm.ts::callLLMWithTools`. Falls back to OVH bridge if smart engine fails.
3. **Containerized OpenClaw → `lib/ovh/gateway-client.ts::gatewayChat` / `lib/ovh/provisioner.ts::chatViaGateway`** — `{gateway_url}/v1/chat/completions` with session persistence. Used by worker chat, portal chat, GHL poller, AI Closer, channel router (when `features.useWorker=true`).
4. **GHL direct-LLM → `lib/ghl/direct-llm.ts`** — **bypasses OpenClaw specifically because the proxy doesn't forward `tools`**. Priority: override key → `byok.ts::resolveAgencyApiKey` (`openai > anthropic > openrouter > google`) → `OPENAI_API_KEY` → `OPENROUTER_API_KEY`.

**Two model routers drift:**
- `lib/ai/model-router.ts` — 3-tier (economy/standard/premium), supports agency custom premiumPatterns, 6 ECONOMY_PATTERNS.
- `lib/ghl/model-router.ts` — provider-aware per-tier, 7 SIMPLE_PATTERNS.
- Same `COMPLEX_KEYWORDS`, same `routeMessage()` shape, both headers ask for sync. Already diverged.

**Multi-Agent** (`lib/multi-agent/agent-manager.ts`) — keyword-based, NOT LLM-routed. Pure data. Overlaps conceptually with `ROLE_WORKERS` in `lib/ai-workers/` and `ghl-tools.ts` — three places define "agent archetypes" for different purposes.

**Models in use:**
- Anthropic `claude-haiku-4-5` / `claude-sonnet-4-5` / `claude-opus-4-6`.
- `gpt-4o-mini` — cost-efficient utility.
- `claude-sonnet-4-6` via OpenRouter or `gpt-4o` — HTML gen.
- `text-embedding-3-small`, `whisper-1`, `nova` TTS.

### D. Billing architecture

**Plans** (`lib/billing/plans.ts`): 5 tiers with `maxClients`, `monthlyCredits`, `monthlyWebScrapes`, `maxTeamMembers`, `trialDays`, `stripePriceKey`.
- free (1 client, 0cr, 50 welcome)
- solo_pro ($39, 1 client, 2000cr, hidden)
- starter/Lite ($99, 4 clients, 5000cr)
- pro ($299, 11 clients, 15000cr)
- scale ($499, 21 clients, 30000cr)

Annual: 20% discount. Voice addon: $79/mo or $63/mo annual for 300 min.

**Credits SSOT** (`lib/billing/credit-engine.ts`): `CREDIT_COSTS` dict at lines 54-101 — 26 action types. `requireCredits` (preflight) → run op → `deductCredits` (post-success). `LOW_BALANCE_THRESHOLD = 50` triggers `fireLowBalanceNotification` via `ESCALATION_WEBHOOK_URL`. `overrideCost` supports per-model pricing so Sonnet (75cr) doesn't get billed as Haiku (1cr).

**Model credits** (`lib/billing/model-credits.ts`): per-turn costs calibrated Mar 30 2026 vs real OpenRouter spend — Sonnet 4.6 went 15→75cr, Opus 4.6 went 35→125cr. `MODEL_ID_ALIASES` (~40 entries) normalizes OpenRouter slugs, dot→dash, provider prefixes.

**BYOK** (`lib/billing/byok.ts`): priority `preferred > openai > anthropic > openrouter > google` (line 63-65). **NOTE: this differs from `ovh/provisioner.ts:36-48` + `ghl/poller.ts:68-80`** which use `anthropic > openrouter > openai > google`. Three functions, two orderings. `skipCredits=true` only when `isByok && plan ∈ PAID_PLANS`.

**Referral activation** (`lib/billing/referral-activation.ts`): fires immediately on signup (no email confirmation gate). `isEarlyBird ? 150 : 100` to referrer + 100 to friend. Streak bonus +50 for 3 activations in 7 days. Idempotent via `.eq('status', 'signed_up')` guard.

**Stripe webhook flow** (`lib/stripe/webhooks.ts`):
1. `verifyStripeWebhook` via `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`.
2. `invoice.paid` → `agency_billing` insert (subscription/client_fee/credit_topup).
3. `customer.subscription.updated` → `planFromPriceId` reverse-lookup, update `agencies.plan`, mark referral converted.
4. `customer.subscription.deleted` → downgrade to free.
5. `checkout.session.completed` → safety net via session metadata + `planRank` (only upgrades, never downgrades).
6. `account.updated` (Connect) → dynamic import `syncConnectAccountStatus`.

**Stripe Connect** (`lib/stripe/connect.ts`): 10% platform fee (`APPLICATION_FEE_PERCENT = 10`). Agencies can resell via destination charges.

**NEW: `lib/stripe/webhook-health.ts`** (141 LOC):
- `getWebhookHealth()` retrieves primary webhook endpoint by hardcoded ID `we_1TCcvQDr3LPJOIaMuaY1zJhG`.
- Alerts if `status !== 'enabled'`.
- Verifies 5 required events registered (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`) or `*` wildcard.
- Scans last 24h events, counts succeeded (pending_webhooks=0) vs pending.
- Motivation: post-Apr 18 incident where webhook was silently disabled, plan activation failed.

### E. Integrations layer

**GHL** (largest surface — 23 files + 9 skill files):
- Dual ingestion: poller (`poller.ts`, works for draft marketplace apps) + webhook (`webhook-handler.ts` → `smart-handler.ts`).
- 50 tools across `skills/`: contacts/calendar/conversations/opportunities/tasks/invoices/marketing + validate.
- Token refresh with dedup (one in-flight at a time), 401→refresh+retry. `onTokenRefresh` persists tokens back to `agency_clients`.
- Every inbound message runs through `defend()` + `scanOutput()`.
- **`direct-llm.ts` shim** is the explanation for the 4th AI call path — OpenClaw proxy strips `tools` parameter.
- `GHL_API_VERSION = '2021-04-15'` (`'2021-07-28'` for Voice AI).

**integrations/** (non-GHL): Google Calendar, Google Search Console, WordPress, HeyGen (AI video), Jane (medical/dental scheduling). `sync.ts` pushes state to container.

**channels/**: `router.ts::processChannelMessage(userId, text, channelType)` unifies Telegram/WhatsApp/Discord/voice. Routes through OVH gateway when `features.useWorker=true`, falls back to direct Claude.

**sms/**: delivery-focused. Onfleet → template → Springbig/Blackleaf/Mock. Separate AI SMS campaigns via `campaign-engine.ts`.

**voice/** (5 providers): `VoiceProviderClient` interface with `VapiClient | SynthflowClient | RetellClient | KyraNativeClient | GHLVoiceClient`. `buildVoiceSystemPrompt(ctx)` injects phone-call conventions. $79/mo add-on for 300 min.

**email/**: GHL-first routing. `sender.ts` priority: GHL client sub → GHL platform (`hello@conversionsystem.com`) → Resend fallback (unverified `onboarding@resend.dev`). 7-email / 21-day nurture via `nurture-sequence.ts` + `email_nurture_queue` table. `sequences.ts` is DEPRECATED stub.

**onfleet/**: self-contained dispatch stack (SLA, routes, notification gates, rule engine).

### F. Security & auth

Covered in §1 top risks. Key files: `lib/supabase/server.ts:31-40` (critical service-role comment), `lib/auth/cron.ts:27-29` (fail-closed), `lib/agency/middleware.ts:requireAgencyMember` (auth + membership + role), `lib/secrets/crypto.ts` (AES-256-GCM, SHA-256-derived key, `[IV 12B][AuthTag 16B][ct]` base64), `lib/security/prompt-injection.ts::defend()` (3-layer, 40+ patterns, rate-limited 2 attempts/min → 5-min cooldown), `lib/rate-limit.ts::isRateLimited` (opt-in, 2-tier Supabase + in-memory).

### G. Dead/legacy/risky

- **`lib/fly/*` REMOVED** (confirmed: `ls lib/fly` → No such file or directory; `grep -r "from '@/lib/fly"` → 0 matches).
- **`lib/openclaw/*`** — 3 route importers. Safe to remove once those routes migrate.
- **`lib/email/sequences.ts`** — DEPRECATED stub file.
- **5 `@deprecated` in `lib/billing/plans.ts:203-243`** — `getPlanLimit`, `isWithinLimit`, `getCreditCost`, `getUsagePercentage`, `classifyChatAction`. Return permissive values. Active engine is `credit-engine.ts`.
- **4 `@deprecated` in `lib/security/prompt-injection.ts:289-331`** — `scanMessage`, `getBlockResponse`, `logSecurityEvent`, `buildInjectionDefensePromptSuffix`.
- **1 `@deprecated` in `lib/seo/schema-markup.ts:92-95`** — `generateVetSchema`.
- **`VeterinaryCare` hardcoded twice** — `lib/seo/schema-markup.ts:16` + `lib/sites/schema-generator.ts:31`.
- **2 model routers** drifted despite "keep in sync" comments.
- **3 `resolveAgencyApiKey` variants with 2 priorities.**
- **8 TODOs across 7 files** — lean codebase.

**Risky specifics:**
- `lib/stripe/webhook-health.ts:16` — hardcoded Stripe endpoint ID (not env-driven).
- `lib/stripe/config.ts:11` — `@ts-expect-error` for Stripe API version 2025-04-30.basil.
- `lib/ghl/poller.ts` — 700+ LOC god-file importing from 15+ paths.
- `lib/ovh/provisioner.ts` — 1,142 LOC.
- `lib/channels/router.ts` partially reimplements `chatViaGateway`.
- `CLAUDE.md:75` + `TECHNICAL-SPEC.md:435` document stale session key format.

---

## 6. Batch 3 — HTTP API Surface

Full detail: `kyra-analysis-batch3.md`. **357 `route.ts` files across 41 top-level subfolders.**

### New endpoint

**`/api/admin/webhook-health`** (`app/api/admin/webhook-health/route.ts:14-23`) — GET-only, gated on 2-email `ADMIN_EMAILS` (`hello@`, `angel@`). Proxies `getWebhookHealth()` from `lib/stripe/webhook-health`. Rendered in `components/admin/webhook-health-card.tsx` → `admin-client.tsx:10` line 407.

### Admin auth protection table (summary)

| Route | Auth |
|---|---|
| `/api/admin/webhook-health` | cookie + `ADMIN_EMAILS` (2) |
| **`/api/admin/orphaned-users`** | **NONE** — leaks auth emails |
| **`/api/admin/health-check`** | **NONE** — leaks env + DDL + project ID |
| `/api/admin/stats` | cookie + 3-email list (incl. `steve@`) |
| `/api/admin/kyra-stats` | cookie + 2 emails (no `steve@`) |
| `/api/admin/router-migrate` | `process.env.MASTER_EMAILS` split (only env-driven) |
| `/api/admin/accounts/*`, `/seed-templates/*` | cookie + `MASTER_EMAILS` (2) |
| `/api/master/*`, `/api/debug`, `/api/stripe/env-check`, `/api/stripe/test` | cookie + `MASTER_EMAILS` (2) |
| `/api/admin/content-calendar` | cookie + 3-email list |

### Auth models

1. Supabase cookie + `requireAgencyMember()` — vast majority (176 routes under `/agency/`).
2. Supabase cookie + hardcoded email allowlist — admin/master/debug.
3. Bearer shared secret — cron (`CRON_SECRET`), `KYRA_API_SECRET` cross-service, provider webhooks.
4. Provider HMAC — Stripe (works), GHL marketplace.
5. Per-resource tokens — `/api/inbound/webhook` (per-client `webhook_token`), widget script (clientId).
6. None — `/api/widget/chat`, `/api/portal/[clientId]/chat`, `/api/try`, `/api/playground`, `/api/leads`, `/api/roi`, `/api/public/workers`, the 2 unauth admin endpoints.

### Webhooks summary

| Path | Signed? | Notes |
|---|---|---|
| `/api/webhooks/stripe` | ✅ | Primary, `constructEvent` with `STRIPE_WEBHOOK_SECRET`, endpoint ID `we_1TCcvQDr3LPJOIaMuaY1zJhG` |
| `/api/webhooks/ghl` | ⚠ | Fails open without `GHL_WEBHOOK_SECRET`; in-memory dedup doesn't survive cold start |
| `/api/crm/webhook` | ⚠ | Fails open same way; renamed because "GHL blocks URLs containing 'ghl'" |
| `/api/ghl/webhook` | ⚠ | Fails open same way |
| `/api/webhooks/resend` | ❌ | No `svix-signature` — fake events inflate CRM, force unsubscribes |
| `/api/webhooks/openclaw-usage` | ✅ | Bearer `OPENCLAW_USAGE_WEBHOOK_SECRET`, fails closed. **N+1 loop at `:62-66`** |
| `/api/webhooks/unsubscribe` | ❌ | Public, no signed token |
| `/api/webhooks/onfleet/[clientId]` | per-client `?secret=` | Validated against `agency_clients.settings.sms.webhookSecret` |
| `/api/voice/retell/webhook` | ❌ | No signature, writes to conversations/usage/activities |
| `/api/voice/twilio/{webhook,gather}` | ❌ | No `x-twilio-signature` |
| `/api/voice/webhook` | ❌ | Multi-provider, no verification |
| `/api/channels/discord/webhook` | ✅ | Ed25519 signature |
| `/api/channels/telegram/webhook` | ❌ | URL obscurity only |
| `/api/channels/whatsapp/webhook` | ⚠ | GET challenge works, POST has no `x-hub-signature-256` check |
| `/api/stripe/credits/webhook` | ✅ | Separate secret `STRIPE_CREDITS_WEBHOOK_SECRET` |

### Cron routes (15 scheduled in `vercel.json`, all `requireCron`)

| Path | Schedule |
|---|---|
| `/api/cron/scheduled-tasks` | `*/30 * * * *` |
| `/api/cron/weekly-report` | `0 8 * * 1` |
| `/api/cron/email-sequence` | `0 8 * * *` |
| `/api/cron/follow-ups` | `0 * * * *` |
| `/api/cron/crm-autopilot` | `0 7 * * *` |
| `/api/cron/briefing` | `0 8 * * *` |
| `/api/cron/seo-worker` | `0 6 * * 1-5` |
| `/api/cron/alerts` | `*/30 * * * *` |
| `/api/cron/terminal-credits` | `*/30 * * * *` |
| `/api/cron/gateway-token-sync` | `0 4 * * *` (+ POST behind `MASTER_EMAILS`) |
| `/api/cron/usage-alerts` | `0 8 * * *` |
| `/api/cron/worker-tasks` | `*/30 * * * *` |
| `/api/cron/idle-containers` | `0 4 * * *` |
| `/api/cron/container-health` | `*/5 * * * *` |
| `/api/cron/dispatch-optimize` | `*/15 * * * *` |

Also present but not scheduled: `/api/cron/seo/gsc-sync`, `/api/cron/seo/publish-queue`.

### Streaming endpoints

1. `/api/chat` — true SSE via `ReadableStream`; typed events; prompt-injection scan; 5-round tool loop via `streamChatWithTools`.
2. `/api/chat/openclaw` — fake streaming (20-char slices).
3. `/api/chat/worker` — true pipe-through of gateway SSE.
4. `/api/portal/[clientId]/chat` — **unauth**, IP-rate-limited, true body-proxy from OVH.
5. `/api/try` — edge runtime, true OpenAI-compat streaming.
6. `/api/agency/clients/[id]/chat` — member-verified SSE proxy, credit pre-flight.
7. `/api/widget/chat` — non-streaming JSON (direct LLM via `getDirectLLMClient()`).

### Duplicates

- GHL webhook × 3, Stripe webhook × 3 (1 active / 1 disabled / 1 credits-specific), Stripe checkout × 2, Stripe portal × 2, impersonation × 2, voice webhooks × 4, admin stats × 2, Onfleet × 2.

### Route-level concerns (summary — see §1 for full list)

Stored XSS in `/api/leads`, orphan-record creation in `/api/widget/[clientId]/lead`, N+1 credit loop in `/api/webhooks/openclaw-usage`, model/host mismatch in `/api/playground/chat` (uses `api.openai.com` with OpenRouter model slug `openrouter/anthropic/claude-haiku-4.5`), permissive redirect param in `/api/auth/callback`.

### External integration routes

**Firecrawl proxy** `/api/fc/[...path]` — elegant pattern. Agencies send `Authorization: Bearer kyra-agency-{agencyId}` or `X-Kyra-Agency-ID`. Kyra extracts, checks plan (free/solo blocked 402), usage-gates (per-endpoint `ENDPOINT_COST` map, 429 when over monthly cap), forwards with master `FIRECRAWL_API_KEY`, increments usage.

---

## 7. Batch 4 — Page Layer

Full detail: `kyra-analysis-batch4.md`. 107 `page.tsx` + 5 `layout.tsx` + 5 non-API `route.ts` files.

### Route groups

- **`(auth)`** — Login/signup funnel plus 4 activation landings (`build`, `solo`, `website-builder`, `get-started`) all `'use client'` wizards. `(auth)/signup/page.tsx` is a 1-line redirect to `/signup/agency` (personal signup removed).
- **`(dashboard)`** — Authenticated app, all routes under `/agency/*`. `agency/layout.tsx` does auth + agency lookup + `isMaster` (2-email hardcode). **`CommandPaletteWrapper` import removed** (verified).
- **`(onboarding)`** — One layout + one page. Gates on `settings.onboarding_complete`.
- **`(portal)`** — White-label client-facing. `layout.tsx` is passthrough ("no agency sidebar"). Auth: `agency_members OR sub_account_members`. Dead redirect target: `/client-portal/[clientId]/request-access` (directory exists, no page).
- **`(public)`** — No layout. 4 pages (launch, playground, tools/ai-readiness, workers + [id]).

### Sidebar (`agency-sidebar.tsx:76-105`)

Primary: Mission Control, Analytics (master), Intelligence (pro/scale), Clients, Terminal, Inbox, Websites (master), SEO/GEO (master), Build Requests.
Account (collapsible): Billing, Referrals, API Keys, Settings, Help, What's New.

CRM, Agents, Channels, AI Setup, Autopilot, Performance, Website moved **inside each client's dashboard**.

### 7 stub redirect pages

All in `/agency/*`: agents, ai-setup, channels, ghl-setup → `/agency/clients`; autopilot → `/agency/automations`; performance → `/agency/clients`; website → `/agency/clients`. Each explains *why* in a comment. Could be `next.config.js` 301 rewrites.

### Programmatic-SEO surface

`ai-for/[slug]` (50 static pages from `INDUSTRY_TEMPLATES`), `ai-for/[niche]` (hand-curated rich pages), `demo/[industry]`, `try/[industry]`, `for/[industry]` (inline data), plus `blog/[slug]`, `guides/[id]`. Hand-authored verticals: `cannabis`, `ecommerce` (rich), `india` (HighLevel LIVE 2026 event), `march-16` (past SF event, stale).

**Route conflict confirmed:** `app/ai-for/[niche]` + `app/ai-for/[slug]` at same level. Next.js won't build this.

### 4 pitch deck variants (no shared `<Deck>`)

`/pitch/` + `/pitch/ai-agency/` + `/pitch/agencies/` + `/pitch/inbound-growth/` + `/pitch/[agencyId]/[industry]`. ~500 LOC of copy-paste.

### Unsigned/unauth routes in the page layer

- `app/unsubscribe/page.tsx` — base64-decodes `?token` into `agencyId:email`, POSTs unsubscribe. No signature.
- `app/portal/[clientId]` — public, service-client fetches `agency_clients`, `?terminal=1` escape hatch.
- `app/a/[agencyId]`, `app/results/[agencySlug]` (gated on `settings.public_results !== false`), `app/pitch/[agencyId]/[industry]` — all public server-rendered.

### Special routes

- `app/llms.txt/route.ts` — 1-day cache. **Hardcodes plan pricing** (drift risk vs `plans.ts`).
- `app/llms-full.txt/route.ts` — extended; concatenates every blog post + `INDUSTRY_TEMPLATES`. Same price drift.
- `app/feed.xml/route.ts` — RSS 2.0, 1h cache.
- `app/invite/[code]/route.ts` — cookie `httpOnly: false` (+ `kyra_ref_name`) + redirect to `/solo?ref=...`.
- `app/ref/[agencyId]/route.ts` — cookie `httpOnly: true` (**inconsistent**).
- `app/robots.ts:13` disallows `/(auth)/` — dead line (group names aren't URLs). `/master/` not disallowed.
- `app/not-found.tsx`, `app/sitemap.ts` (no `/guides/*` entries).

### Dynamic segments catalogue

`[slug]` (ai-for/blog — two files), `[niche]` (ai-for), `[industry]` (demo/try/for/pitch), `[id]` (guides/clients/contacts), `[clientId]` (portal/report/terminal/client-portal), `[agencyId]` (a/ref/pitch), `[agencySlug]` (results), `[code]` (invite), `[token]` (client-portal/invite), `[siteId]` (website).

### Cross-cutting

- 22 pages duplicate the auth preamble; `requireAgencyMember()` used only once.
- 4 hardcoded email lists drift.
- Portal consolidation incomplete (dead `/request-access` redirect).
- Plan-limit table inlined at `(dashboard)/agency/page.tsx:49`.
- `sites` / `seo` pages don't enforce master-only gate (only sidebar does).
- `templates/page.tsx:14` redirects to `/signup` not `/signup/agency` — micro-drift.
- 35 of ~100 pages are `'use client'`; auth-critical pages stay RSC.

---

## 8. Batch 5 — Components & Hooks

Full detail: `kyra-analysis-batch5.md`. **100 components across 19 subdirs + 1 hook file.**

### Confirmed deletions

- `components/command-palette.tsx` + `components/command-palette-wrapper.tsx` — gone from active tree, only stale copies in `.claude/worktrees/`. Zero importers.
- `components/agency/VoiceCommandButton.tsx` (333 LOC) — still physically present but orphaned. `(dashboard)/agency/layout.tsx:5` has explicit comment `// VoiceCommandButton removed — not functional, just UI noise`.

### New subdir

- `components/admin/webhook-health-card.tsx` (212 LOC) — polls `/api/admin/webhook-health` every 5 min via hand-rolled `setInterval` (didn't adopt `usePolling`). Rendered on `/admin` at `admin-client.tsx:10` line 407. **Adds 7th `timeAgo` copy**.

### Design system (`components/ui/`)

6 hand-rolled primitives (no Radix, no `components.json`): button, badge (with 5 memory-type variants: fact/person/decision/event/preference), card, input, textarea, switch.

**Missing compound primitives:** Dialog, Select, Dropdown, Tooltip, Tabs, Popover, Command, Checkbox, Radio, Accordion, Sheet, Toast, Skeleton, Alert, Combobox, Form, Table, Avatar.

### Tab-pill-bars reimplemented (at least 10)

`crm-tab`, `marketing-tab`, `delivery-sms-tab`, `worker-performance-card`, `email-marketing-tab`, `skills-tab`, `secrets-tab`, `dispatch-tab`, `insights-tab`, `train-tab`, `seo-geo-command-center`. A single `<Tabs>` would delete hundreds of LOC.

### Client-tabs (13-tab `client-detail-view.tsx:198`)

`inbox | terminal | crm | voice-sms | dispatch | marketing | website | seo-geo | ai-setup | integrations | it-operations | settings | insights` — plan/role-gated (master-only: marketing, seo-geo, voice-sms, dispatch).

### Hooks — only one

`hooks/use-polling.ts` (173 LOC). Module-level cache, ref-counted intervals. **Used by only 4 files**. **11+ other components hand-roll `useEffect + setInterval`**.

### State management: none global

- Zero `createContext` / `useContext` in source.
- No `zustand`/`redux`/`jotai`/`@tanstack/react-query`.
- State flows: server props → `useState` → `usePolling` cache → custom `window` event (only `kyra:credit-update`, 1 listener + 3 dispatchers) → `localStorage` for banner dismissal.

### 90/100 components are `'use client'`

Server-compatible: 5 ui primitives (not switch), brand/kyra-logo, widget/powered-by-badge, marketing/testimonial-placeholder, dashboard/client-status-banner, layout/public-nav (mostly), layout/public-footer.

### Orphans (~1,900 LOC)

Verified via `rg "from '@/components/..."`:
- `components/chat/WakingUpIndicator.tsx` (73)
- `components/pipelines/PipelineProgress.tsx` (158)
- `components/landing/*` (360 total)
- `components/marketing/testimonial-placeholder.tsx` (26)
- `components/onboarding/guided-tour.tsx` (268) + `launch-progress.tsx` (170)
- `components/agency/*` (666 total — 3 files including `VoiceCommandButton`)
- `components/open-control-ui-button.tsx` (36)
- `components/billing/PlanRedirect.tsx` (10 — no-op stub)

### Duplication

- **`timeAgo`**: 7 copies (webhook-health-card, NotificationCenter, mission-control-live, solo-overview, web-chat-leads, crm-tab, payments-sub-tab).
- **`CopyButton`**: 5 copies (sms-campaigns/marketing/campaigns/funnels/reviews sub-tabs).
- Channel color maps: 3+ inline copies.
- Tab-pill-bars: 10+ reimplementations.

### Hardcoded IDs

- Master agency UUID `1511e077-77ef-4c47-81fd-06a3bc9f1dbb` — 4 components (`client-detail-view:335,340,347`, `marketing-tab:1019`, `ai-setup-tab:12`, `ai-workers-tab:77,83`) + 1 page + 2 API routes + 1 lib file.
- Meta Pixel `735277348604833` — `analytics/MetaPixel.tsx:5` (literal, no env).

---

## 9. Batch 6 — Config, Middleware, Scripts, Infra, Tests, Types

Full detail: `kyra-analysis-batch6.md`.

### Middleware (19 lines)

Skips `/api/*` entirely; delegates pages to `lib/supabase/middleware.ts::updateSession` (auth cookie refresh + gates `/agency`, `/admin`). **Unguarded `console.log('[middleware]', method, path)` at top** — floods Vercel logs.

### next.config.mjs

- `serverExternalPackages: ['ws']` (Cloudflare compat).
- Exhaustive headers: X-Frame-Options SAMEORIGIN, XSS-Protection, Referrer-Policy strict-origin-when-cross-origin, HSTS 1y includeSubDomains, Permissions-Policy (`payment=()` despite Stripe — acceptable since Checkout is redirect-based).
- CSP: `unsafe-inline` + **`unsafe-eval`** in script-src (TODO'd in the config itself). `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.
- No `images.domains`, no custom webpack, no `reactStrictMode` setting.

### vercel.json (77 lines)

- `ignoreCommand: "exit 1"` — kill-switch for git-triggered builds.
- **`git.deploymentEnabled: false` was removed in `b8a2106a` and NOT restored by `d665b07c`** — Vercel git integration still enabled but kill-switched.
- 9 function `maxDuration` overrides (sites build 300s, dispatch 30-60s, onfleet webhook 30s).
- **15 crons** (see Batch 3).

### `.github/workflows/deploy.yml`

Misnamed — workflow name is `CI Check`. Runs `npm ci → tsc --noEmit → eslint --max-warnings 9999 → vitest`. **Deploy job present but `if: false`.** Explicit comment: "NEVER auto-deploy from CI — use 'npx vercel --prod --yes' locally." PR `b8a2106a` briefly enabled auto-deploy on merge; `d665b07c` reverted.

### Scripts (8 files, 2,088 LOC total)

- **`deploy.sh`** — max 2 deploys/day via `/tmp/.kyra_deploy_YYYYMMDD` counter. `FORCE=1` bypass. Cost model `~$0.40/deploy, target ≤10/mo = $24`. On success auto-removes older deployments. Failed attempts don't burn quota.
- **`qa-check.sh`** (425 LOC) — nightly 7-check health agent. Stripe webhook active / plan-credits consistency / Docker container health / provisioner image pinned / paid signups with plan=free / deploy counter / dead webhook handlers. Telegram alerts. `DRY_RUN=1`.
- **`seed-templates.ts`** (618 LOC) — seeds `agency_templates` via service-role key. No upsert — rerun risks duplication.
- **`backfill-templates.js`** — **LEAKED JWT at line 15** (decoded: `{"iss":"supabase","ref":"yaijdtsunxicuphrakcc","role":"service_role","iat":1770277939,"exp":2085853939}`, valid until 2036). Line 17 hardcodes `PROV_SECRET='kyra-provisioner-2026'`.
- **`fix-marketing-data.mjs`** (425 LOC) — hardcoded `AGENCY_ID` + `CLIENT_ID` + `SUPABASE_URL`. Service key read from `.env.local` correctly. Idempotent on `source='admin-migration'`.
- **`reembed-memories.js`** — no dry-run, no pagination, no rate-limit backoff. Dangerous at scale.
- **`run-migration.mjs`** — `PROJECT_REF` hardcoded. `ssl: { rejectUnauthorized: false }` (Supabase pooler).
- **`test-templates.ts`** — validates `INDUSTRY_TEMPLATES` shape. Not in CI.

### Infra

- **`infra/nginx/kyra-css-proxy.conf`** (55 LOC) — sidecar nginx on `:19000`. Resolves `<uuid>.<host>` → `http://kyra-cl-${uuid}:18789`. Injects `<style>` to hide OpenClaw white-label banners. Critical fix: `proxy_set_header Sec-WebSocket-Extensions ""` strips permessage-deflate.
- **`infra/provisioner/server.js`** (1,114 LOC) — Node/Express on `:9090`. Bearer `PROVISIONER_SECRET` (default `'kyra-provisioner-2026'`). Manages per-client Docker containers + shared `kyra-router` Python sidecar on `:8104` (`KYRA_MAX_TIER=2`, `KYRA_DAILY_CAP=$50`, `KYRA_MONTHLY_BUDGET=$500`). Writes Traefik dynamic config. Pre-creates `devices/paired.json` so `dangerouslyDisableDeviceAuth` works.
- **`infra/scripts/deploy-kyra-router.sh`** — one-shot `kyra-router` bootstrap.
- **`infra/restart-all.sh`** — iterates `kyra.managed=true` containers; reads tokens from `meta.json` NOT `docker inspect` (inspect env can be corrupted). 1GiB mem, 256 CPU shares, cap-drop NET_RAW/SYS_ADMIN/MKNOD.
- **`infrastructure/openclaw/`** — post-cleanup: Dockerfile (Debian bookworm + Node 22 + `openclaw@latest` + himalaya + Chromium + gh), `kyra-bridge.js` (44KB), `start.sh` (16KB), `README.md` (rewritten to describe OVH+Traefik), `workspace/`, `.dockerignore`. **`fly.toml` + `deploy.sh` deleted in `3d2fd918`**.

### Deploy targets: 2 active, 1 latent

- **Vercel** (Next.js app, 15 crons)
- **OVH VPS** `15.204.91.157` (provisioner + nginx + Traefik + per-client Docker + kyra-router)
- **Cloudflare Workers** (latent; `@opennextjs/cloudflare` + wrangler in devDeps but not exercised)
- **Fly.io** — decommissioned (`lib/fly/*`, `infrastructure/openclaw/fly.toml`, `deploy.sh` all removed in `3d2fd918`).

### Tests (3 files)

- **`billing.test.ts`** (9.8KB, 40+ assertions) — `CREDIT_COSTS`, `getCreditCost`, `getCreditsForModel`, `normalizeModelId`, OpenRouter slug resolution, `PLANS` constants (free/solo_pro/starter/pro/scale), `HANDLED_EVENTS` shape, `resolveModel`.
- **`cron-auth.test.ts`** (4.8KB) — fail-closed on missing `CRON_SECRET`, Bearer + `?secret=`, rejects `'Bearer undefined'`.
- **`ghl-id-validate.test.ts`** (4.3KB) — 10-64 char base62, rejects path traversal / URL injection / scheme injection / whitespace / non-string.

**Coverage gaps:** no API route / webhook integration / cron handler / component / middleware / container bridge / memory / OpenClaw / E2E tests. ~3% footprint.

### Types (5 files, ~350 LOC — all aspirational)

- `index.ts` — **stale `Plan = 'free'|'starter'|'business'|'max'`**. Production is `free|solo_pro|starter|pro|scale`.
- `channels.ts` — `ChannelType` with `telegram`, `discord` that aren't really wired.
- `memory-graph.ts` — graph model; current memories are flat with Pinecone.
- `notifications.ts` — shape doesn't match live pipeline.
- `pipelines.ts` — multi-step checkpointing not a live surface.

All safe to delete after grep-sweep.

### Env vars (`.env.example`, 86 lines)

Groups: APP, SUPABASE, KYRA INTER-SERVICE AUTH (`KYRA_API_SECRET`), OPENCLAW GATEWAY (legacy Mac mini `OPENCLAW_GATEWAY_URL`, `OPENCLAW_API_KEY`), FEATURE FLAGS (`KYRA_USE_WORKER` / `KYRA_USE_OPENCLAW` / `KYRA_OPENCLAW_SKILLS`), AI MODELS, PINECONE, STRIPE (4 price IDs — **missing `STRIPE_SOLO_PRO_PRICE_ID`**), SLACK, GOOGLE, BRAVE, CRON (`CRON_API_KEY` — **drift: code uses `CRON_SECRET`**).

**Removed post-Fly cleanup:** `KYRA_WORKER_URL` (confirmed).

**Missing from example but referenced by code:** `FIRECRAWL_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_NOTIFY_CHAT_ID`, `RESEND_API_KEY`, `OPENROUTER_API_KEY`, `SUPABASE_DB_PASSWORD`, `KYRA_PROVISIONER_URL`, `PROVISIONER_SECRET`, `RETELL_API_KEY`, LiveKit keys.

### ESLint/TS

- `tsconfig.json`: strict, ES2017, bundler resolution, `@/*` alias. Excludes sibling dirs `kyra`, `openclaw`, `kyra-worker`, `site-templates`.
- `.eslintrc.json`: `next/core-web-vitals` + `next/typescript`. Warnings for `no-explicit-any`, `no-unused-vars`, `no-unescaped-entities`, `prefer-const`, `react-hooks/exhaustive-deps`. Errors only on `no-html-link-for-pages` + `react-hooks/rules-of-hooks`. `--max-warnings 9999` → only errors block.

### Concerns (12 items)

Listed in §1 plus: middleware hot-path logging; missing `STRIPE_SOLO_PRO_PRICE_ID` in env.example; `KYRA_USE_WORKER` naming historical (today means OVH, not Cloudflare); `vercel.json` double-belt-and-suspenders (both `ignoreCommand` and CI `if: false`).

---

## 10. Batch 7 — Gap Coverage

Full detail: `kyra-analysis-batch7.md`.

### Vet-SEO worker template (`templates/vet-seo-worker/`)

$79/mo premium upsell per client. Layout: SOUL.md (templated persona) + `config/*.json` (5 files) + `prompts/*.md` (5) + `skills/*/SKILL.md` (10 skills) + 2 runnable `run.ts` files.

**10 skills:** geo-tester (runnable), nap-auditor (runnable), seo-content-writer, web20-publisher, semantic-stacker, outreach-scout, backlink-monitor, gbp-posts, ugc-monitor, seo-reporter.

**`nap-auditor/run.ts` (388 LOC):** Firecrawl-based scraper across 20 directories. Normalization (phone last-10, address abbreviation expansion, name stripping `LLC|Inc|DBA|Corp|Ltd|PLLC`, vet-equivalence: "vet↔veterinary", "clinic↔hospital", "animal↔pet") + hand-rolled Levenshtein (tolerance 3). Status: `match/mismatch/not_found/error/blocked`. 429→"rate_limited", 403→"blocked". 500ms rate limit.

**`geo-tester/run.ts` (345 LOC):** parallel-batched ChatGPT (`gpt-4o-mini` temp 0.7, 1000 tokens) + Perplexity (`sonar`) probing. Expands `{{SERVICE}}` across top-3 services → ~27-30 queries × 2 providers. Batches of 5 × 2 = 10 concurrent per batch + 300ms delay. Citation analysis: clinic name / raw phone digits / website-without-protocol. Position by numbered-list prefixes. Recommendations by theme (emergency/service/general) + provider skew.

**Weekly schedule:** Mon GEO | Tue/Thu content + GBP post | Wed NAP | Fri SEO report | 2×/day Reddit/UGC | 1st/month backlink scan.

### Site-templates/generic (Next.js 16.1.6 static export)

React 19.2.3, Tailwind 4, Lucide. Single dep: `lucide-react`.

**Two-layer content injection:**
1. `lib/constants.ts` — structural `BUSINESS` / `SERVICES` / `SERVICE_AREAS`. Template file overwritten by build service (sample data is law firm).
2. `content/pages.json` — long-form AI content keyed by slug. `parseSubSections()` splits `**bold**\nbody` into cards.

**Routes:** `/`, `/about`, `/contact`, `/faq`, `/reviews`, `/services/[slug]`, `/[city]`, `/[city]/[service]` (cross-product with `dynamicParams = false`), `/sitemap.xml`, `/robots.txt`.

**CRITICAL bug still present:** `app/layout.tsx:57` hardcodes literal string `WIDGET_CLIENT_ID` in the script src URL. Build-service substitution required — silent 404 if missed. Separately, `NEXT_PUBLIC_WIDGET_CLIENT_ID` meta tag — two injection mechanisms that must stay in sync.

`INDUSTRY_LABELS` covers 15 industries: hvac, plumbing, dental, legal, restaurant, real-estate, auto, med-spa, fitness, veterinary, cannabis, consulting, electrical, roofing, landscaping.

### Top-level `ghl-crm` skill (`skills/`)

Anthropic Skill format (not an OpenClaw skill). Structure:
- `SKILL.md` — frontmatter + command grammar.
- `references/api-reference.md` — GHL v2 endpoint specs.
- `scripts/ghl.sh` (13.8KB executable) — bash+Python wrapper over `services.leadconnectorhq.com`.

Binds `GHL_API_TOKEN` + `GHL_LOCATION_ID`. Command groups: contacts/conversations/messages/opportunities/pipelines/calendars/location/workflows. Error handling: 401/422/429 (auto-retry once after 2s).

**Note:** distinct from the empty `kyra-ghl-skill/` directory (aspirational Phase 2 OpenClaw skill, unimplemented) and from `templates/vet-seo-worker/skills/` (OpenClaw runtime skills).

### docs/ inventory (34 files)

**14 operationally critical:** CONTAINER-SYNC-API, CONTENT-VOICE, CONTENT-VOICE-RESEARCH-2026, RETELL-AI-INTEGRATION-PLAN, vet-seo-worker-build-spec, WEBSITE-BUILDER-ANALYSIS (V1+V2), TEMPLATE-EXPANSION-ANALYSIS, dashboard-audit-2026-03-11, MOLTCLAW-COMPETITIVE-ANALYSIS, blackleaf-kyra-sms-overview, springbig-kyra-sms-overview, provisioner-rules ("never set `OPENAI_BASE_URL` for BYOK accounts"), ghl-workflow-setup, stripe-setup-checklist, meetkyra-domain-migration.

**19 marketing/campaign** (playbooks, outreach scripts, Product Hunt listing, Facebook series, etc.).

### Root operational docs

- **`AUDIT-RESULTS.md` (Apr 13, fresh):** SEO Command Center universalized, 2 new endpoints (`seo/geo-scores`, `seo/nap-status`), dual-read normalized + JSONB fallback. Open issues: `VeterinaryCare` hardcode, vet subreddit hardcode, vet-specific content prompt, similarity checker advisory at 65%, 9 stale `.next/types/` errors.
- **`ARCHITECTURE-ANALYSIS.md` (stale):** Describes 3 paths (A direct Claude live / B OpenClaw Gateway built-off / C kyra-worker built-off). **But `lib/fly/*` is gone now** — the framework itself is stale.
- **`SECURITY-AUDIT-2026-03-06.md` (still pending):** `GHL_WEBHOOK_SECRET` for Angel, rate limiting, CSP `unsafe-eval`, Supabase RLS audit.
- **`KYRA-STRATEGIC-ROADMAP.md` (v2.2, Feb 13 — STALE):** Still describes Vercel + **Fly.io AI bridge** (`kyra-gateway.fly.dev` as LIVE). **Fly is decommissioned.** Current live path is Vercel → OVH provisioner → per-client containers. `OVH-ARCHITECTURE-SPEC.md` is likely canonical now but not cross-referenced.
- **`tasks/todo.md`:** Unified SEO/GEO Command Center 5-step plan, all unchecked. Review empty.
- **`HEARTBEAT.md` (Feb 23, stale):** 5 items still need Angel (RESEND, 2 migrations, SIGNUP_WEBHOOK_URL, GHL Marketplace submission, demo video).
- **`CHANGELOG.md`:** last entry Feb 9 (0.3.0). Dozens of PRs unrecorded (including billing fixes `8f69ab60`, `1936386f`, the ⌘K removal `3b9ed53e`, `d9dda248` webhook monitor, `3d2fd918` Fly cleanup).

### `KYRA/` — 2 binary docx files (new, dated Apr 20)

- `Kyra_Bugs_Defects_Analysis.docx` (30KB)
- `Kyra_Claude_Integration_Analysis.docx` (29KB)

Binary — not parsed here. Likely external analysis artifacts (Claude Projects exports or another analyst). Action: reconcile with Markdown audit docs or move into `docs/`.

### Remaining gaps

- `kyra-ghl-skill/` — empty directory (aspirational Phase 2 OpenClaw skill, unimplemented).
- `marketplace/`, `marketing/social/`, `content-drafts/` — pure marketing copy.
- Root docs not covered in detail: `BRANDING.md`, `CLOUDFLARE-MIGRATION.md` (historical), `CONTAINER-ARCHITECTURE.md` (40KB — likely canonical), `E2E-TEST-RESULTS.md` / `E2E-VERIFICATION.md`, `KYRA-AGENCY-PLATFORM-PLAN.md`, `KYRA-ROADMAP-2026-02-12.md` (predates roadmap), `OVH-ARCHITECTURE-SPEC.md` (22KB — likely current canonical), `PIPELINE-REDESIGN-SPEC.md`, `PRODUCT.md`, `SECURITY-ARCHITECTURE-ANALYSIS.md`, `SUMMARY.md`, `TECH-STACK.md`, `WORKER-DEPLOY-GUIDE.md`, 3 `video-analysis-*.md`, 4 `ghl-preview-*.{png,html}`.

---

_End of analysis. Per-batch source files retained at `kyra-analysis-batch{1..7}.md`; previous snapshot at `kyra-analysis-8f69ab60.md` + `kyra-analysis-batch{1..7}-8f69ab60.md`._
