# Kyra Codebase — Full Analysis

**Generated:** 2026-04-20
**Repo:** `/Users/steve/projects/kyra`
**Branch:** `main` (HEAD `8f69ab60`)
**Scope:** 1,082 code files (979 TS/TSX, 84 SQL, 14 JSON, 5 MJS) across `app/`, `lib/`, `components/`, `supabase/`, `migrations/`, `scripts/`, `infra/`, `infrastructure/`, `templates/`, `site-templates/`, `skills/`, `hooks/`, `types/`, `__tests__/`, root configs, and 34 operational docs.

---

## Table of Contents

1. [Executive Synthesis](#executive-synthesis)
2. [File Inventory](#file-inventory)
3. [Batch 1 — Database Layer (Schema + 83 Migrations)](#batch-1--database-layer)
4. [Batch 2 — Core Library (`lib/`, 282 files / 56 domains)](#batch-2--core-library)
5. [Batch 3 — HTTP API Surface (`app/api/`, 356 routes)](#batch-3--http-api-surface)
6. [Batch 4 — Page Layer (`app/`, 107 `page.tsx` + 5 layouts)](#batch-4--page-layer)
7. [Batch 5 — Components & Hooks (101 files)](#batch-5--components--hooks)
8. [Batch 6 — Config, Middleware, Scripts, Infra, Tests, Types](#batch-6--config-middleware-scripts-infra-tests-types)
9. [Batch 7 — Gap Coverage: Templates, Site-templates, Skills, Docs](#batch-7--gap-coverage)

---

## Executive Synthesis

### What Kyra is, as the code reveals it

Kyra is a **multi-tenant AI-workforce-as-a-service platform** built on top of OpenClaw. The domain model and code structure describe a four-tier tenant hierarchy (master → agency → client/sub-account → user) where each `agency_client` represents an AI worker that runs in its own Docker container on an OVH VPS. Paying agencies configure these workers via a large Next.js 15 dashboard, connect them to GoHighLevel (GHL) CRM, wire them into channels (SMS, voice, WhatsApp, Telegram, web chat, Discord, email), and monetize them either with Kyra's own billing or Stripe Connect pass-through.

The codebase is large for a solo/small-team shop: ~280 `lib/` files across 56 domains, 356 API routes, ~100 page routes, ~100 components. The "SIMPLICITY ABOVE ALL" directive in `CLAUDE.md` is strained by real feature breadth — CRM, email marketing, SEO command center, website builder, voice AI, delivery dispatch, pipelines, multi-agent routing, GHL action engine, content calendar, referrals, widgets, playground — but the actual TODO/FIXME rot is unusually low (only 9 TODOs across 8 files), suggesting disciplined, code-first iteration.

### Top-priority risks (security + correctness)

These are the findings that would move to the top of any reviewer's list. Each is grounded in a specific file/line.

| # | Risk | Location | Impact |
|---|---|---|---|
| 1 | **Production service-role JWT leaked in tracked file** | `scripts/backfill-templates.js:15` | Full admin access to the production Supabase project `yaijdtsunxicuphrakcc`. Rotate the key, purge from git history. |
| 2 | **Unauthenticated admin endpoint leaks auth emails** | `app/api/admin/orphaned-users/route.ts:6` | Any visitor can list every auth user without an agency (up to 200 rows). |
| 3 | **Unauthenticated admin endpoint leaks infra state** | `app/api/admin/health-check/route.ts:26` | Returns migration SQL, env presence, Supabase project URL — a reconnaissance goldmine. |
| 4 | **Unsigned Resend webhook** | `app/api/webhooks/resend/route.ts:9` | Anyone can forge `email.bounced`/`complained` to force unsubscribes or inflate engagement. No `svix-signature` check. |
| 5 | **Unsigned Retell (voice) webhook** | `app/api/voice/retell/webhook/route.ts:25` | Attackers can inject fake call records into `client_conversations` + `voice_usage` (billing-impacting). |
| 6 | **GHL webhooks fail-open on missing secret** | `app/api/webhooks/ghl/route.ts:40-45`, `app/api/crm/webhook/route.ts:48-54` | If `GHL_WEBHOOK_SECRET` env var is unset, signature check is skipped silently. |
| 7 | **Stored XSS via admin notification email** | `app/api/leads/route.ts:65` | `body.message` is interpolated raw into an HTML email sent to `angel@conversionsystem.com`. Also no rate limit + no CAPTCHA. |
| 8 | **Broken RLS policy** | `delivery_sms_log` policy `WHERE agency_id = auth.uid()` | Compares a user UUID to an agency UUID — policy matches nothing. Effectively service-role-only, but that is not what the policy says. |
| 9 | **RLS wholly missing on sensitive tables** | `agency_credits`, `credit_transactions`, entire `email_*` family (`sequences`, `sequence_steps`, `enrollments`, `nurture_queue`, `templates`, `contacts`, `campaigns`, `analytics`, `unsubscribes`), `pipeline_ab_tests`, `pipeline_message_templates`, `site_deploys`, `client_sites`, `site_pages` | Everything relies on service-role correctness. A single route that forgets `.eq('agency_id', ...)` exposes cross-tenant data. |
| 10 | **Encryption-at-rest promised in migration comments, never enforced** | `ghl_access_token`, `ghl_refresh_token`, `pipeline_integrations.access_token`, `agencies.api_keys`, `client_secrets.encrypted_value` (though `lib/secrets/crypto.ts` does implement AES-256-GCM for `client_secrets` only) | Most tokens are plain TEXT. |
| 11 | **`/api/public/workers` leaks internal client UUIDs** | `app/api/public/workers/route.ts:4` | Those UUIDs are capability tokens for `/api/widget/chat`, `/api/portal/[clientId]/chat`. Enumeration → unauth chat with any agency's worker. |
| 12 | **Middleware has no rate limiting; all `/api/*` bypasses it** | `middleware.ts:1-13` | `lib/rate-limit.ts` exists but is opt-in per route; most routes don't use it. |
| 13 | **Route conflict in Next.js router** | `app/ai-for/[niche]/page.tsx` + `app/ai-for/[slug]/page.tsx` | Two dynamic segments at the same level. Next.js will build one and shadow the other. |
| 14 | **CSP allows `'unsafe-eval'`** | `next.config.mjs` (comment acknowledges it) | Next.js 15 doesn't strictly require it once dynamic-eval deps are gone. |
| 15 | **Master impersonation endpoints have no audit trail** | `app/api/master/impersonate/route.ts`, `app/api/admin/accounts/[id]/login-as/route.ts` | Both mint magic links for arbitrary users. Only defense is `MASTER_EMAILS` allowlist; no DB audit row. |

### Architectural debt

Kyra is running **four co-existing AI gateway architectures** at once. This is the single biggest structural risk.

| Path | State | Env / Flag | Code |
|---|---|---|---|
| **Direct Claude** | LIVE | default | `lib/ai/claude.ts` |
| **OVH per-client Docker** | LIVE (production) | implicit when `agency_clients.gateway_url` set | `lib/ovh/*` (30+ importers) |
| **Legacy Fly.io `kyra-gateway`** | Warm fallback | `OPENCLAW_GATEWAY_URL` | `lib/fly/*`, `infrastructure/openclaw/` |
| **Legacy OpenClaw Mac-mini tunnel** | off by default | `KYRA_USE_OPENCLAW=true` | `lib/openclaw/*` (6 importers) |
| **Cloudflare Worker `kyra-worker`** | built, off | `KYRA_USE_WORKER=true`, `KYRA_WORKER_URL`, `KYRA_API_SECRET` | `lib/config/features.ts`, sibling dir excluded from tsconfig |

Known bug: `kyra-worker/kyra-api.ts:72` targets `/api/chat` on the OpenClaw container — OpenClaw exposes `/v1/chat/completions` instead. Cloudflare path cannot work until this is fixed.

Related duplication:
- **Session key pattern evolved** from `kyra-user-${userId}` (`lib/openclaw/sessions.ts:36-38`) to `agent:client:${clientId}` (`lib/agency/container.ts:14-16`). Old values still live in some code paths.
- **Three GHL webhook receivers** do the same job: `/api/webhooks/ghl`, `/api/ghl/webhook`, `/api/crm/webhook` (renamed because GHL blocks URLs containing "ghl").
- **Two Stripe checkout routes**, **two portal routes**, **two webhook handlers** (`/api/billing/checkout` returns 400 during beta, `/api/stripe/checkout` is active; `/api/stripe/webhooks` is disabled in the Stripe dashboard but still live in code).
- **Four voice webhook entry points**: `/api/voice/webhook`, `/api/voice/twilio/webhook`, `/api/voice/retell/webhook`, `/api/channels/voice-webhook`.
- **Two `updated_at` trigger functions** (`set_updated_at`, `update_updated_at_column`) plus 5 table-specific copies.
- **Two model routers** (`lib/ai/model-router.ts`, `lib/ghl/model-router.ts`) with `keep-in-sync` comments — guaranteed drift.
- **Two migration directories** (`migrations/` + `supabase/migrations/`) with no documented tooling split.
- **Two plan taxonomies** — `users.plan` checks `free|starter|business|max|enterprise`; `agencies.plan` checks `free|starter|pro|scale|beta`. No mapping table.
- **Stale `Plan` type** in `types/index.ts` — `'free' | 'starter' | 'business' | 'max'` — doesn't match any real plan catalog.

### Coverage & Quality

- **Tests:** only 3 files (`__tests__/billing.test.ts`, `cron-auth.test.ts`, `ghl-id-validate.test.ts`). **Zero** tests for any of the 356 API routes, no webhook integration tests, no component tests, no E2E tests. For a repo with 15 cron endpoints running every ~5-30 minutes and real money flowing through, this is the biggest correctness risk.
- **CI/CD:** `.github/workflows/deploy.yml` is misnamed — it runs only typecheck/lint/test. Deploys happen manually via `npm run deploy:prod` → `scripts/deploy.sh` which hard-caps 2 deploys/day via a `/tmp` counter (advisory, not authoritative).
- **Environments:** production only. No staging, no PR previews (`vercel.json` disables git-triggered builds). Developers test against `next dev -p 3001` locally.
- **CRON secret naming drift:** `.env.example` documents `CRON_API_KEY`, but `lib/auth/cron.ts` and its tests use `CRON_SECRET`. One of these is dead.

### Code smells worth surfacing

| Smell | Count / Example |
|---|---|
| Admin email allowlist duplicated | 3+ hardcoded copies with different membership (`admin/stats` includes `steve@`, `master/*` and `admin/kyra-stats` don't). |
| `user → agency → redirect` auth preamble duplicated | ~15 dashboard pages reimplement the same 6-line stanza. `requireAgencyMember()` helper exists in `lib/agency/middleware.ts`, imported once. |
| Tab-pill-bar reimplemented | ~10 distinct copies across `ai-setup-tab.tsx`, `train-tab.tsx`, `marketing-tab.tsx`, `insights-tab.tsx`, `voice-sub-tab.tsx`, etc. No `ui/tabs.tsx` primitive. |
| `timeAgo()` reimplemented | 3 copies: `mission-control-live.tsx:63-72`, `solo-overview.tsx:63-73`, `NotificationCenter.tsx:47-56`. |
| `CopyButton` reimplemented | ≥4 ad-hoc copies. |
| Channel-color map reimplemented | 3 copies. |
| Master agency UUID hardcoded | `1511e077-77ef-4c47-81fd-06a3bc9f1dbb` inline in `ai-setup-tab.tsx:12`, `ai-workers-tab.tsx:77`, scripts, etc. Should live in `lib/constants.ts`. |
| Meta Pixel ID hardcoded | `components/analytics/MetaPixel.tsx:5` (should be env var). |
| Plan-limit table inlined | `app/(dashboard)/agency/page.tsx:49` duplicates `lib/billing/plans.ts`. |
| Referral cookie `httpOnly` inconsistent | `app/invite/[code]/route.ts` sets `httpOnly: false`; `app/ref/[agencyId]/route.ts` sets `httpOnly: true`. |
| `robots.ts` lists literal group name | `/(auth)/` is a build-time group name, never appears in URLs. Dead line. |

### Monoliths (>500 LOC components)

Refactor targets, roughly in order of size:

1. `components/dashboard/client-tabs/crm-tab.tsx` — **2920 LOC**. A complete CRM in one file.
2. `components/seo-geo-command-center.tsx` — **1966 LOC**.
3. `components/dashboard/client-tabs/email-marketing-tab.tsx` — **1382 LOC**.
4. `components/dashboard/client-tabs/dispatch-tab.tsx` — **1275 LOC**.
5. `components/dashboard/client-tabs/marketing-tab.tsx` — **1077 LOC**.
6. `components/dashboard/client-tabs/ai-workers-tab.tsx` — **996 LOC**.
7. `components/dashboard/client-tabs/website-tab.tsx` — **902 LOC**.
8. `components/dashboard/client-tabs/workflows-tab.tsx` — **706 LOC**.
9. `components/dashboard/solo-overview.tsx` — **652 LOC**.
10. `components/dashboard/client-tabs/tasks-card.tsx` — **631 LOC**.

The top ~15 account for >15 KLOC — more than half the component tree. `retell-voice-tab.tsx` (529), `voice-sub-tab.tsx` (375), `voice-channel-card.tsx` (529) are three overlapping voice UIs — consolidation candidate.

### Orphans (likely deletable)

- `components/chat/WakingUpIndicator.tsx` (73 LOC) — no import sites.
- `components/pipelines/PipelineProgress.tsx` (158 LOC) — not imported anywhere in `app/` or `components/`.
- `components/billing/PlanRedirect.tsx` (10 LOC) — explicit no-op stub during beta.
- `components/landing/{activity-ticker, live-stats, lead-capture}.tsx` — zero import matches; likely orphaned from a previous marketing-page iteration.
- `lib/email/sequences.ts` — explicit `DEPRECATED — use nurture-sequence.ts`.
- `lib/fly/*` — legacy Fly.io provisioner, fully superseded by `lib/ovh/*`.
- `lib/billing/plans.ts:203-243` — 5 `@deprecated` credit helpers kept for back-compat. Duplicate `CREDIT_COSTS` is a footgun (real one is in `lib/billing/credit-engine.ts`).

### What's actually live vs. aspirational

- **LIVE production path:** Next.js 15 on Vercel → Supabase (users, agencies, 80 tables) → `lib/ovh/*` per-client Docker containers on OVH VPS `15.204.91.157` (with provisioner on :9090, nginx CSS proxy on :19000, shared `kyra-router` on :8104 with tier/spend caps) → GHL poller (via `/api/cron/scheduled-tasks` every 30m for container-level tasks + GHL poll every 60s).
- **Legacy warm:** Fly.io `kyra-gateway` Frankfurt single-tenant (backup).
- **Off:** Cloudflare Worker `kyra-worker` (built, flagged off, has a known bug).
- **Partially aspirational:** memory graph (`entities`/`relationships` tables exist but only user-scoped, not wired into agency workers), `pipelines` legacy user-scoped table (separate from `pipeline_campaigns`/`pipeline_leads`), `types/index.ts` `Plan`/`Pipeline`/`Memory` unions don't match current app.
- **Incomplete:** SEO/GEO Command Center unified dashboard (checklist in `tasks/todo.md`, not started); schema generalization (`schema-markup.ts` still hardcodes `VeterinaryCare`); portal consolidation (`(portal)` group + `/portal/[clientId]` + `/report/[clientId]` coexist).

### Top-10 consolidation targets

1. Delete the leaked service-role key in `scripts/backfill-templates.js:15`, rotate the JWT, purge from git history.
2. Add auth + an admin allowlist helper to `/api/admin/orphaned-users` and `/api/admin/health-check`. Consolidate the 3-place email allowlist into `lib/auth/admin.ts`.
3. Add signature verification to `/api/webhooks/resend` and `/api/voice/retell/webhook`. Flip `GHL_WEBHOOK_SECRET` fail-open to fail-closed in `/api/webhooks/ghl` and `/api/crm/webhook`.
4. Fix the broken RLS policy on `delivery_sms_log`; add RLS (even permissive) to the `email_*` family, `agency_credits`, `credit_transactions`, `pipeline_ab_tests`, `pipeline_message_templates`, `site_*` tables.
5. Resolve `app/ai-for/[niche]` vs `app/ai-for/[slug]` route conflict.
6. Decide the gateway story: consolidate to OVH + Cloudflare Worker, decommission Fly.io + Mac-mini tunnel, or document why all four stay. Fix the `/v1/chat/completions` endpoint bug in the worker if keeping.
7. Extract the tab-bar pattern into `components/ui/tabs.tsx` (probably auto-cleans 1000+ LOC across 10 tabs).
8. Start chipping at the 10 biggest monoliths. `crm-tab.tsx` should become a folder with contacts/deals/companies/tasks per file.
9. Write tests for at least the five most critical routes: `/api/chat`, `/api/webhooks/stripe`, `/api/webhooks/ghl`, `/api/cron/scheduled-tasks`, `/api/agency/clients` creation.
10. Ship a proper rate limiter at the edge (middleware or CDN/WAF), not opt-in in `lib/rate-limit.ts`. Start with `/api/leads`, `/api/webhooks/*`, `/api/widget/chat`, `/api/portal/[clientId]/chat`.

---

## File Inventory

| Category | Count |
|---|---|
| TypeScript / TSX files | 979 |
| SQL files | 84 |
| JSON files | 14 |
| MJS files | 5 |
| **Total analyzed** | **1,082** |

### Top-level layout
- `app/` — Next.js 15 App Router (57 route folders, 356 `route.ts`, 107 `page.tsx` + 5 layouts)
- `lib/` — 282 TS files across 56 domain directories
- `components/` — 101 React components across 18 subdirs + `hooks/` (1 file)
- `supabase/schema.sql` baseline + `supabase/migrations/` (81 files) + `migrations/` root (2 files)
- `scripts/` — deploy, seed, backfill, migration runners, QA check
- `infra/` (nginx, provisioner, restart scripts) + `infrastructure/openclaw/` (Fly.io image)
- `templates/vet-seo-worker/` (reusable worker blueprint) + `site-templates/generic/` (Next.js site template)
- `skills/` (Anthropic-style `ghl-crm` skill) + `docs/` (34 operational docs) + `types/` (5 files) + `__tests__/` (3 files)

### Stack (from `package.json`)
- Next.js 15.5.12, React 19.2.4
- Supabase (`@supabase/ssr` 0.8, `@supabase/supabase-js` 2.94)
- Anthropic SDK 0.72, OpenAI SDK 6.17
- Pinecone 7, Stripe 14.25, Resend 6.9, Slack Web API 7
- Retell Client JS SDK (voice), Zod 4, Tailwind 3.4
- OpenNext Cloudflare 1.16 (Wrangler 4.64) — alternative path, not production
- Vitest 4 (3 test files), Playwright/JSDOM

---

## Batch 1 — Database Layer

Scope: `supabase/schema.sql` (baseline), 81 files in `supabase/migrations/`, 2 root files in `migrations/`, `supabase/seeds/seed-templates.sql`.

### Domain Model Map

#### Auth / Users (legacy single-tenant, still present)
- `public.users` — extends `auth.users` with plan, Stripe IDs, `custom_instructions_knowledge`, `custom_instructions_style`, `usage_this_month`, `settings` JSONB. Plan check: `free|starter|business|max|enterprise`.
- `public.conversations` / `public.messages` — single-user chat log. Pre-agency model.
- `public.memories` — per-user typed memories with Pinecone vector ID link. Types: fact/person/decision/event/preference.
- `public.integrations` — legacy per-user OAuth (slack/google/notion/github).
- `public.reminders`, `entities` + `relationships` (knowledge graph), `notifications`, `user_skills`, `automations`, `user_files`, `user_channels` — pre-agency.

#### Agency (multi-tenant tier 1)
- `public.agencies` — agency tenant; `owner_id`, `slug`, `plan` (free/starter/pro/scale/beta), `account_level` (master/agency), Stripe Connect fields, GHL agency-level OAuth, `gateway_*` columns, `api_keys` JSONB (BYOK), `settings` (white-label), `onboarding_steps` JSONB, `default_client_price_cents`.
- `public.agency_members` — user↔agency mapping, role `owner|admin|member`.
- `public.agency_templates` — reusable client configs; `agency_id IS NULL` = built-in.
- `public.agency_clients` — tenant tier 2; `ghl_location_id`, `ghl_access_token`, `ghl_refresh_token`, `ghl_private_token`, `ghl_last_contact_scan`, per-client gateway (`gateway_url/token/container_id/status`), Stripe Connect customer/subscription, `billing_status`, `ai_model`, `settings` JSONB, `container_config`.
- `public.sub_account_members` — tenant tier 3 (client staff portal users).
- `public.sub_account_invitations` — invite tokens (7-day expiry).
- `agency_billing` — immutable billing ledger.
- `agency_credits` + `credit_transactions` — credit wallet per agency.
- `agency_referrals` — referrer→referred graph with `early_bird`, credit grants, statuses `pending→signed_up→activated→converted→paid_out`.

#### Billing / Stripe
- Stripe fields on `users`, `agencies`, `agency_clients`.
- `premium_template_subscriptions` (root `migrations/20260305001...sql`) — per-client premium billing.
- `payment_requests` — AI-generated invoices.
- `kyra_waitlist` — pre-launch capture.

#### CRM (agency-scoped)
- `crm_companies`, `crm_contacts` (AI fields: `ai_summary`, `ai_next_action`, `score`, `stage`), `crm_activities` (unified timeline), `crm_deals` (stages with probability), `crm_tasks`.
- `customer_memory` — per-contact structured memory.
- `client_knowledge` — extracted insights with SHA-256 dedup.

#### Sales Pipeline
- `pipeline_campaigns`, `pipeline_leads` (stages: `found→researched→approved→outreach_approved→messaged→replied→interested→booked→closed|skipped`).
- `pipeline_webhooks`, `pipeline_activity_log`, `pipeline_integrations` (GHL/HubSpot/Salesforce/Pipedrive), `pipeline_crm_sync_log`, `pipeline_follow_ups`, `pipeline_ab_tests`, `pipeline_message_templates`.

#### Channels / Messaging / Voice
- `user_channels` (defined twice — `005_channels.sql` and `20260211_user_channels.sql`).
- `client_conversations` — per-client AI conversation log (channels: test_chat/portal/telegram/sms/whatsapp/web_chat).
- `web_chat_leads`, `ghl_message_log`, `ghl_webhook_logs`, `ghl_action_proposals` + `ghl_action_log` (risk levels low/medium/high, 24h expiry), `ghl_subaccount_requests`.
- `voice_call_logs`, `voice_call_history`, `voice_usage`, `delivery_sms_log`.

#### Email Marketing
- `email_templates`, `email_contacts`, `email_campaigns`, `email_analytics`, `email_unsubscribes`.
- `email_sequences` + `email_sequence_steps` + `email_sequence_enrollments`.
- `email_nurture_queue` — 7-email signup drip.

#### Bookings / Workflows / Automations
- `client_bookings` + `client_booking_config`, `client_workflows` + `workflow_runs`, `worker_tasks` + `worker_task_runs`, `worker_performance`, `review_requests`, legacy `pipelines`.

#### Knowledge / Files
- `knowledge_documents` (per-client docs with `synced_at`), `client_secrets` (encrypted key/value), `client_knowledge` (extracted insights).

#### Website Builder
- `client_sites` — full wizard dump: branding, services, cities, AI personality, GSC tokens, `ga4_id`, `white_label`, `section_order`/`section_overrides`, `generation_mode` (template|ai-custom).
- `site_pages` (per-page content with `html_content`, SEO metrics), `site_deploys`, `build_requests`.

#### SEO Command Center
- `seo_industry_packs`, `seo_city_data`, `seo_page_metrics`, `seo_geo_results`, `seo_nap_audits`, `seo_competitor_scores`, `seo_content_gaps`, `seo_keyword_rankings`, `seo_published_content`, `seo_publish_queue`.

#### Ops / Admin / Misc
- `firecrawl_usage` (monthly scrape quota), `dispatch_events` (optimization run / SLA breach log).
- `content_calendar` (root `migrations/20260417001`) — editorial pipeline for scheduled content (blog/linkedin/facebook/x), 7 content pillars.
- `orphaned_auth_users` view — auth users without agency membership.

#### ENUMs / Types / Views
- **No native `CREATE TYPE` ENUMs** — all enumeration is done via `CHECK (col IN (...))` on TEXT columns. Brittle (adding a status requires DROP + ADD CONSTRAINT).
- Single VIEW: `public.orphaned_auth_users`. No materialized views.

### Migration Timeline & Evolution

1. **Baseline single-tenant** (`schema.sql`) — user-centric chat model, Pinecone vector link in `memories.pinecone_id`, plans: free/starter/business/enterprise.
2. **Plan expansion + trigger hardening** (`001_fix_plans_and_trigger.sql`) — adds `max` plan, hardens `handle_new_user`.
3. **Proactive intelligence** (`003_notifications.sql`, `004_pipelines.sql`, `005_channels.sql`, `006_memory_graph.sql`) — notifications, pipelines, channels, entities/relationships.
4. **User productivity add-ons** (`20260211_user_channels.sql`, `20260212_skills_automations.sql`, `20260213001-003`) — second `user_channels`, skills, automations, custom instructions, Discord, files.
5. **Inflection point: Agency multi-tenancy** (`20260213004_agency_schema.sql`) — introduces `agencies`, `agency_members`, `agency_templates`, `agency_clients`, `agency_billing`. Creates `user_agency_ids()` RLS helper. Seeds 5 built-in templates.
6. **GHL Phase 2** (`20260214001_ghl_phase2.sql`).
7. **Billing + template polish** (`20260216001_enhanced_templates.sql`, `20260216001_stripe_connect_billing.sql` — **name collision!**, `20260216002_ghl_message_log.sql`) — Stripe Connect per-client billing, enhanced templates.
8. **Template proliferation** (`20260217001-004`, `seed-templates.sql`).
9. **Gateway architecture V1** (`20260218001_add_beta_plan.sql`, `20260218002_agency_gateway.sql`) — per-agency Fly.io gateway.
10. **Knowledge base** (`20260219001_knowledge_base.sql`).
11. **Gateway pivot to OVH** (`20260220001_per_client_gateway.sql`) — gateway columns on `agency_clients`; agency-level gateway rewritten in `20260222001_agency_gateway.sql`. **Two overlapping agency_gateway migrations.**
12. **Client observability** (`20260221001-002`).
13. **Plan shake-up + GHL polling** (`20260222002_add_free_plan.sql` / `20260222002_ghl_contact_scan.sql` — **numeric collision!**) — `free|starter|pro|scale|beta` replaces old plans.
14. **Referrals + hierarchy + credits** (`20260223001-004`) — `agency_referrals`, `kyra_waitlist`, 4-tier hierarchy, `agency_credits`. `orphaned_auth_users` view (`20260224001`).
15. **Sales pipeline** (`20260225001-20260228001`) — full lead-gen engine with HITL approvals, multi-CRM integrations, follow-ups, A/B optimization.
16. **Native CRM** (`20260227001-002`) — agency-scoped CRM.
17. **Widget + customer memory + billing flows** (`20260301001-20260302002`).
18. **Premium template + referral polish** (`20260305001` in root `migrations/`, `20260305002`).
19. **Voice AI** (`20260306001-20260313002`) — Twilio voice with call logs, per-turn history, `increment_voice_minutes()` SECURITY DEFINER.
20. **Stuck-referral backfill + constraint fix** (`20260308001-002`).
21. **Per-client AI model + dispatch + email marketing** (`20260309001-20260313004`) — `ai_model` column, `delivery_sms_log`, 5-table email marketing, website builder, `client_secrets` vault.
22. **Website builder expansion** (`20260314001` through `20260321001`) — GA4, white-label, deploy history, build requests, AI HTML mode, GHL action confirmation.
23. **Nurture + onboarding + Firecrawl + GHL agency OAuth** (`20260322001`-`20260330002`).
24. **Website editor + client knowledge** (`20260331001-002`, `20260401001_client_knowledge.sql`).
25. **Modular worker system** (`20260401002-003`).
26. **Email + bookings + workflows** (`20260403001-003`).
27. **SEO Command Center** (`20260413001`) — 10 new SEO tables.
28. **GSC OAuth tokens** (`20260414001`).
29. **Dispatch events** (`20260415001`).
30. **Content calendar** (root `migrations/20260417001`).

### Multi-Tenancy & Isolation

**Tenant hierarchy (4 tiers):** `agencies` (master or regular) → `agency_clients` (sub-account / AI instance) → `sub_account_members` (portal users) → end users / contacts.

**Scoping columns:**
- `agency_id UUID REFERENCES agencies(id)` — primary tenant key.
- `client_id UUID REFERENCES agency_clients(id)` — secondary scope.
- `user_id UUID REFERENCES auth.users(id)` — legacy single-tenant scope, still used by the pre-agency world.
- `contact_id UUID REFERENCES crm_contacts(id)` — tertiary.

**Isolation mechanism:**
- `public.user_agency_ids()` (SECURITY DEFINER STABLE, in `20260213004_agency_schema.sql`) — returns `setof uuid` for current `auth.uid()`. RLS canary.
- **Service-role bypass is the dominant write path.** API routes use the service-role client (bypasses RLS). Many tables have only a token SELECT policy.
- **Master-account designation** lives on `agencies.account_level`.

### Row Level Security

**~50 tables have RLS enabled.** Patterns:

1. **User-scoped (legacy):** `USING (auth.uid() = user_id)` — `users`, `conversations`, `memories`, `messages`, `integrations`, `reminders`, `user_skills`, `automations`, `user_files`, `pipelines`, `notifications`, `user_channels`.
2. **Agency-scoped:** `USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()))` — the dominant pattern.
3. **Via helper:** `USING (agency_id IN (SELECT public.user_agency_ids()))`.
4. **Client-scoped via parent:** `ghl_message_log`, `dispatch_events`.
5. **Service-role-only / `USING (true)`:** `voice_call_logs`, `voice_usage`, `voice_call_history`, `customer_memory`, `review_requests`, `payment_requests`, `build_requests`, various inserts.
6. **Public token lookup:** `sub_account_invitations`.
7. **Public-config read:** `seo_industry_packs`, `seo_city_data`.

**RLS GAPS (NO RLS AT ALL):**
- `email_sequences`, `email_sequence_steps`, `email_sequence_enrollments`, `email_nurture_queue`, `email_templates`, `email_contacts`, `email_campaigns`, `email_analytics`, `email_unsubscribes` — **entire email stack.**
- `agency_credits`, `credit_transactions` — **billing data.**
- `pipeline_message_templates`, `pipeline_ab_tests`.
- `site_deploys`, `client_sites`, `site_pages`.
- `content_calendar` has RLS enabled but zero policies.

**BROKEN RLS:** `delivery_sms_log` has `USING (agency_id = auth.uid())` — comparing a user UUID to an agency UUID. Policy matches nothing.

### Key Integrations Surfaced in Schema

**Stripe** — customer/subscription IDs on `users`, `agencies`, `agency_clients`; Connect on `agencies`; `agency_billing` + `credit_transactions` reference payment intents.

**GHL (GoHighLevel)** — per-client + agency-level OAuth tokens on `agency_clients`/`agencies`; `ghl_webhook_logs`, `ghl_message_log`, `ghl_action_proposals`/`ghl_action_log`, `ghl_subaccount_requests`. `pipeline_integrations` supports GHL as a provider.

**OpenClaw Gateway** — `agency_clients.gateway_*` (OVH) and `agencies.gateway_*` (Fly.io). Two architectures side-by-side.

**Pinecone** — `public.memories.pinecone_id`. Only reference in schema.

**OAuth / Tokens** — user `integrations`, agency/client GHL, pipeline CRM, GSC (on `client_sites`), BYOK AI (`agencies.api_keys`).

**Webhooks** — `pipeline_webhooks` (outbound), `ghl_webhook_logs` (inbound audit), `pipeline_crm_sync_log`.

### Indexes, Constraints, Triggers, Functions

**Non-trivial indexes:**
- Partial indexes abound: `WHERE NOT delivered` on reminders, `WHERE stripe_subscription_id IS NOT NULL`, `WHERE gateway_status IS NOT NULL`, `WHERE ghl_location_id IS NOT NULL`, `WHERE read = FALSE AND dismissed = FALSE`, `WHERE status IN ('running','paused')`, `WHERE status = 'pending'`.
- Composite indexes: `(agency_id, needs_attention, resolved, created_at DESC)`, `(agency_id, last_activity_at DESC NULLS LAST)`, `(platform, pillar, scheduled_for DESC)`.
- GIN on JSONB/array: `tags` on `email_contacts`, `customer_memory`.
- Case-insensitive: `lower(name)` on `entities`.

**Functions:**
- `public.set_updated_at()` (canonical, from `20260213004`).
- `public.update_updated_at_column()` (parallel implementation, from `schema.sql` + later migrations). **Two competing functions.**
- `public.handle_new_user()` — auth user → `public.users` insertion.
- `public.user_agency_ids()` — RLS helper.
- `public.create_agency_credits()` — auto-provisions credit wallet.
- `increment_voice_minutes()`, `increment_firecrawl_usage()` — SECURITY DEFINER atomic upserts.
- 5+ table-specific `updated_at` functions (drift from the canonical).

### Smells / Concerns

**Duplicate / colliding migration filenames:**
- `20260216001_enhanced_templates.sql` **and** `20260216001_stripe_connect_billing.sql` — same timestamp, different content.
- `20260222001_agency_gateway.sql` **vs** `20260218002_agency_gateway.sql` — overlapping intent.
- `20260222002_add_free_plan.sql` **and** `20260222002_ghl_contact_scan.sql`.
- `20260211_user_channels.sql` (no seq digits) **and** `005_channels.sql` — both define `user_channels`.
- Dual-definition of `voice_call_logs` across `20260306001`/`20260306002`/`20260313002`.

**Inconsistent patterns:**
- Two `updated_at` trigger functions + 5+ table-specific duplicates.
- **Scoping-column type drift** — `client_id` is `TEXT` on `review_requests`, `delivery_sms_log`, `voice_call_logs`, `customer_memory`, `payment_requests`; every other table types it as `UUID REFERENCES agency_clients(id)`. Same drift for `agency_id`. No ON DELETE CASCADE. Orphaned-data risk.
- **Missing foreign keys** — `review_requests`, `payment_requests`, `customer_memory`, `worker_performance`, `worker_tasks`, `worker_task_runs` all have `agency_id UUID NOT NULL` but no REFERENCES.
- **Mixed plan vocabulary** — `users.plan` vs `agencies.plan` (two taxonomies, no mapping).
- **Broken RLS** — `delivery_sms_log` compares `agency_id = auth.uid()` (user ID to agency ID).

**Dead weight / open questions:**
- `public.users` legacy table still receiving new columns (`custom_instructions_*`); referenced by 12+ pre-agency tables that don't integrate with the agency model. Huge parallel-world surface.
- `public.conversations`/`messages`/`memories`/`reminders`/`integrations` — pre-agency, probably orphaned.
- `entities`/`relationships` (knowledge graph) — user-scoped only, unused by agency workers.
- `pipelines` table vs `pipeline_campaigns`/`pipeline_leads` — name collision, different purposes.
- `kyra_waitlist` RLS enabled with no policies.
- `premium_template_subscriptions` + `content_calendar` live in `migrations/` (root) not `supabase/migrations/`. Two migration directories, tooling split undocumented.
- **Encryption-at-rest promised, not enforced** — migrations comment `"encrypt at rest via Supabase Vault in production"` on `ghl_access_token`, `ghl_refresh_token`, `access_token`, `api_keys`, `pipeline_integrations.access_token`. Columns are plain TEXT. Only `client_secrets` actually uses AES-256-GCM via `lib/secrets/crypto.ts`.
- `agency_billing` has no UPDATE policy (intentionally immutable) but also no audit trigger preventing service-role updates.
- No `CREATE TYPE` ENUMs — all TEXT + CHECK. Adding a value requires DROP + ADD CONSTRAINT.

---

## Batch 2 — Core Library

Scope: `lib/` — 282 TS files across 56 domains + `lib/utils.ts`, `lib/pinecone.ts`, `lib/rate-limit.ts`, `lib/ai-health-score.ts`.

### Per-domain summary

- **agency** — agency-tenant backbone. `container.ts` session-key helpers (`getSessionKeyForClient`/`getSessionKeyForUser`), `workspace.ts` generates SOUL.md/USER.md/AGENTS.md/INTEGRATIONS.md, `middleware.ts::requireAgencyMember`, `permissions.ts` (read-only / supervised / autonomous modes), `webhook-dispatcher.ts`, `voice-parser.ts` (regex, no AI).
- **ai** — Anthropic + OpenAI wrapper for dashboard chat. `claude.ts::streamChat`/`streamChatWithTools` (5-round tool loop), `model-router.ts` (economy/standard/premium), `embeddings.ts` (text-embedding-3-small), `memory.ts` (saveMemory/searchMemories), `truncate.ts` (80k-token cap), `prompts.ts`.
- **ai-workers** — role-based AI worker catalog. `role-workers.ts::ROLE_WORKERS` with SOUL.md templates, `capabilities.ts` (risk levels), `tool-scoping.ts`, `performance-tracker.ts`, `team-templates.ts`.
- **analytics** — NL analytics via gpt-4o-mini. Single-entry `ai-reporter.ts`.
- **auth** — server-side cron helpers (not user auth). `cron.ts::requireCron` fails closed if `CRON_SECRET` missing.
- **automations** — NL → workflow generation. `ai-workflow-engine.ts` (gpt-4o-mini), `workflow-executor.ts`, `sync.ts` pushes state to container.
- **autopilot** — proactive AI scheduling. `DEFAULT_AUTOPILOT_SCHEDULE` with Mon-Sat defaults.
- **billing** — **`credit-engine.ts` is the canonical SSOT** — every billable action goes through `requireCredits`/`deductCredits`. Also `plans.ts` (5-tier catalog), `model-credits.ts`, `byok.ts` (anthropic > openrouter > openai > google priority; `skipCredits=true` only on paid plans), `referral-activation.ts` (150 early-bird / 100 standard credits), `premium-templates.ts`, `template-builder.ts`, `stripe.ts`. **Legacy `CREDIT_COSTS` + 5 `@deprecated` functions in `plans.ts:203-243` — footgun.**
- **blog** — static `POSTS: BlogPost[]`.
- **booking** — keyword-detected booking intent, falls through to GHL calendar or native `client_bookings`.
- **briefing** — daily morning summary; single-file feature aggregating CRM + worker performance.
- **business-box** — "Business-in-a-Box" one-click orchestrator. Primary onboarding happy-path, fans out to every feature module.
- **campaigns** — multi-channel campaign generator (email/SMS/social), 3 credits.
- **channels** — shared multi-channel ingestion. `router.ts::processChannelMessage` dispatches Telegram/WhatsApp/Discord, resolves user, memory, tools, model, gateway. `voice.ts` (OpenAI TTS `nova`), `whisper.ts` (OpenAI Whisper STT), `discord.ts` (REST send, 2000-char cap).
- **chat** — shared chat core. `core.ts::resolveModel`, `getDirectLLMClient`, `checkAndDeductCredits`, `saveConversation`, `OPENROUTER_SLUGS` (verified 2026-04-03). `lead-capture.ts` regex extraction of name/email/phone, 24h dedup.
- **commerce** — WhatsApp-commerce tool definitions (LLM tool schemas only).
- **config** — `features.ts::useWorker`/`useOpenClaw`/`openclawSkills` feature flags.
- **content** — marketing content pillars, platform rotation.
- **crm** — largest single domain (23 files). Contacts, companies, deals (`prospect→qualified→proposal→negotiation→won/lost`), activities, pipeline-sync, AI lead scorer, enrichment (2 credits), deal-autopilot, relationship-memory, scoring, segments, stale-deals, merge, import/export.
- **data** — static `AgentRole[]`, `PRODUCT_ROLE_IDS` (agency-ultron|knowledge-brain|growth-worker|qa-compliance).
- **email** — GHL-first routing. `sender.ts` priority: GHL client → GHL platform (`hello@conversionsystem.com`) → Resend fallback. `ai-writer.ts` (gpt-4o-mini), `nurture-sequence.ts` (7 emails over 21 days via `email_nurture_queue`), `weekly-report.ts`, `sequences.ts` (**DEPRECATED stub**).
- **fly** — **LEGACY** Fly.io provisioner. Superseded by `ovh/`. Candidate for deletion.
- **funnels** — AI funnel builder (landing → form → thank-you → upsell).
- **ghl** — **biggest integration surface.** `client.ts::GHLClient` (retries, 401 refresh, 429 rate limit), `api.ts`, `poller.ts` (**replaces webhooks** for marketplace apps), `oauth.ts` (HMAC state), `skills/` (50 tool definitions in 7 files), `action-engine.ts` (propose/approve/reject), `model-router.ts` (widget-side), `direct-llm.ts` (bypasses OpenClaw because its proxy strips `tools`), `conversation-memory.ts`, `conversation-ai.ts` (syncs into GHL *Voice AI* agents), `review-gate.ts`, `agency-api.ts`/`agency-oauth.ts`, `resolve-ghl-config.ts`, `risk-config.ts`. `GHL_API_VERSION = '2021-04-15'` (`'2021-07-28'` for Voice AI).
- **guides** — static `SetupGuide[]`.
- **instructions** — preset AI tone snippets.
- **integrations** — Google Calendar, GSC, WordPress, HeyGen (AI video), Jane (cannabis Algolia). `sync.ts` writes INTEGRATIONS.md into container.
- **intelligence** — cross-client agency analytics; SQL/rule-based, no LLM.
- **knowledge** — `extractor.ts::extractKnowledge` (gpt-4o-mini, 6 categories), `rag.ts` (retrieval), SHA-256 dedup.
- **memory** — customer-level knowledge graph (`customer-memory.ts`) + entity/relationship extraction (`graph.ts`, Anthropic-powered).
- **multi-agent** — department routing (Front Desk, Sales, Support, Collections, Review, Content Creator). Keyword-count × priority scoring; Front Desk is fallback.
- **onboarding** — step tracker (profile, first client, container, Stripe, GHL, first message).
- **onfleet** — self-contained delivery dispatch stack (SLA, route optimization, notification gate, rule engine).
- **openclaw** — **ORIGINAL** Gateway client. Only 6 route files still import it. `client.ts` HTTP proxy, `sessions.ts` 30-min TTL, `gateway-resolver.ts` (**NO fallback** to shared gateway), `gateway-ws.ts` hand-rolled WebSocket RPC (documented at lines 1-13 to avoid webpack bundling `ws`).
- **ovh** — **CURRENT** per-client Docker architecture on OVH VPS. `provisioner.ts::provisionClient`, `gateway-resolver.ts` (`resolveClientGateway`, `chatWithClient`, `getGatewayByClientId`, `getGatewayByGhlLocation`), `gateway-client.ts` (HTTP chat with `X-Session-Key`, streaming), `sync.ts`. Traefik wildcard `{client-id}.gw.kyra.conversionsystem.com`.
- **packages** — pre-built home-services packages (`ServicePackage[]`).
- **payments** — Stripe Payment Link loop with reminders.
- **pipeline** — outbound AI sales (find → enrich → outreach → closer → CRM sync → webhooks). `ai-closer.ts` is the flagship OpenClaw-backed autonomous agent; `soul-injector.ts` writes SOUL.md + CAMPAIGN.md into container. `webhooks.ts` event dispatcher.
- **reviews** — AI review responder (1 credit, 4 tones), review engine.
- **secrets** — per-client AES-256-GCM vault. Strict `^[A-Z][A-Z0-9_]*$` regex, throws (not fails open) when `SECRETS_ENCRYPTION_KEY` unset. Every operation calls `assertClientBelongsToAgency`.
- **security** — `prompt-injection.ts::defend()` — three-layer (pattern scoring / XML isolation / output scanning), 80+ weighted regex patterns, risk tiers (low/medium/high; high blocks entirely). 4 `@deprecated` helpers kept for compat.
- **seo** — DataForSEO + GSC sync, `growth-engine-v2.ts` (**data-driven, rejects LLM hallucination**), schema-markup (still hardcodes `VeterinaryCare` — flagged in audit), internal-linker, `publish-scheduler.ts` (queue to Telegraph/WordPress/GitHub Pages/Notion/Blogger/Google Docs/Sites), `platform-provisioner.ts`, `worker-dispatcher.ts`, `city-data.ts`, `industry-packs.ts`.
- **sites** — AI website builder. `ai-html-engine.ts` (Sonnet 4-6 via OpenRouter, 5 credits/page, 8000 max tokens), `content-engine.ts`, `design-quality-checker.ts`, `html-sanitizer.ts`, `industry-defaults.ts`, `knowledge-sync.ts`, `schema-generator.ts`, `section-variants.ts`, `seo-helpers.ts`, `templates/`, `unsplash.ts`.
- **skills** — built-in skill registry. 16 skills with plan gating + API-key requirement + credit multipliers. `sync.ts` writes SKILLS.md.
- **sms** — delivery SMS (Onfleet webhook → template → Springbig/Blackleaf/Mock → log). Separate AI SMS campaign engine (`campaign-engine.ts`).
- **stripe** — platform integration (subscriptions, Connect, webhooks). `APPLICATION_FEE_PERCENT = 10`. `verifyStripeWebhook` + per-event handlers. Stripe optional during beta (`config.ts:8-14`).
- **supabase** — client factories. **`server.ts:31-40` is a critical correctness comment** — `createServerClient` from `@supabase/ssr` applies RLS even with service-role because it pulls JWT from cookies. `createServiceClientWithoutCookies` uses plain `supabase-js` to bypass.
- **tasks** — autonomous task engine (Phase 3). `task-executor.ts` (gpt-4o-mini, structured JSON), task types: seo_audit, lead_followup, content_calendar, review_response, custom.
- **templates** — pre-built industry SOUL.md templates with `{{variable}}` placeholders.
- **tools** — Claude tool definitions + executors. Brave Search, URL fetch, Cloudflare Browser Rendering screenshots, image analysis, file processor.
- **voice** — unified `VoiceProviderClient` interface for VAPI, Synthflow, Retell, GHL Voice AI, Kyra Native (Twilio). Voice add-on $79/mo for 300 min.
- **worker** — gateway health check (`checkGatewayHealth`, legacy `checkWorkerHealth` using `KYRA_WORKER_URL`).

**Top-level files:**
- `lib/utils.ts` — shadcn `cn()` + helpers.
- `lib/pinecone.ts` — singleton + upsert/query/delete with user-scoped filter.
- `lib/rate-limit.ts` — **serverless-safe two-layer limiter** (in-memory + Supabase `rate_limit_hits` table, 1% probabilistic GC). Opt-in per route.
- `lib/ai-health-score.ts` — 0-100 AI health grade per client (GHL 30pts, personality 20, activity 20, low escalation 15, calendar 10, opt-out 2.5, hours 2.5). Container not running → zero "Offline".

### A. Dependency graph sketch

**Foundation (imported by ~everything):**
- `lib/supabase/*` — every persistence-using domain imports `createServiceClientWithoutCookies`.
- `lib/billing/credit-engine` — every AI action deducts credits (imported by crm/pipeline/chat/ghl/channels/sites/sms/seo/analytics/campaigns/funnels/reviews/automations).
- `lib/utils.ts`, `lib/pinecone.ts`.

**Core services:** `lib/ai/*`, `lib/agency/*`, `lib/stripe/*` + `lib/billing/*`, `lib/openclaw/*` (legacy) + `lib/ovh/*` (current, 30+ importers vs OpenClaw's 6).

**Integrations:** `lib/ghl/*`, `lib/integrations/*`, `lib/voice/*`, `lib/sms/*`, `lib/channels/*`, `lib/email/*`, `lib/onfleet/*`.

**Feature/top-of-stack:** `lib/autopilot/`, `lib/multi-agent/`, `lib/chat/`, `lib/business-box/`, `lib/campaigns/`, `lib/funnels/`, `lib/reviews/`, `lib/seo/`, `lib/sites/`, `lib/briefing/`, `lib/analytics/`, `lib/intelligence/`, `lib/pipeline/ai-closer.ts`, `lib/tasks/`.

### B. OpenClaw integration

OpenClaw is the AI runtime — a per-client daemon hosting memory, workspace files (SOUL.md, CAMPAIGN.md, SKILLS.md, INTEGRATIONS.md), and 60+ skills. Kyra talks over HTTP (OpenAI-compatible `/v1/chat/completions`) with a raw-Node WebSocket RPC for sub-agent spawning.

**Two eras:**
1. **Original (`lib/openclaw/*`):** Per-agency gateway. Session `kyra-user-{userId}` / `agent:client:{clientId}` / `agent:main:{userId}`. Hand-rolled WebSocket in `gateway-ws.ts` to bypass webpack.
2. **Current (`lib/ovh/*`):** Per-**client** containers behind Traefik on OVH VPS. Resolver keyed on client not agency. Traefik wildcard routing.

**Feature flags:** `useWorker` (Cloudflare), `useOpenClaw` (legacy Mac-mini), `openclawSkills`. `/api/chat/route.ts` branches on these.

`lib/openclaw/*` is legacy but not dead. The WS RPC client still references `OPENCLAW_GATEWAY_URL`/`OPENCLAW_API_KEY` env vars — the code declares `role: 'operator'`, `scopes: ['operator.admin']`, so it's for the kyra-backend operator connection, not tenant chat. Worth a guard.

### C. AI/agent orchestration — 4 overlapping call paths

1. **Dashboard chat** (`lib/ai/claude.ts` + `lib/ai/model-router.ts`) — Anthropic direct. Tiers: Haiku/Sonnet/Opus. Tool loop caps at 5 rounds.
2. **Widget/GHL chat** (`lib/chat/core.ts` + `lib/ghl/model-router.ts`) — OpenRouter/OpenAI. `OPENROUTER_SLUGS` verified 2026-04-03. **Two routers with "keep in sync" comments — drift risk.**
3. **Containerized OpenClaw** (`lib/ovh/gateway-client.ts`) — posted to `{client-gateway}/v1/chat/completions` with `X-Session-Key` header.
4. **GHL direct-LLM** (`lib/ghl/direct-llm.ts`) — bypasses OpenClaw entirely because its proxy strips `tools` parameter.

**Multi-agent:** department routing (keyword × priority); Front Desk fallback.
**AI Workers:** role templates persisted per-client, seeded into container SOUL.md.
**Autopilot:** 7-day action schedule via cron.
**Pipeline AI Closer:** flagship OpenClaw-backed autonomous sales agent; SOUL.md + CAMPAIGN.md injected pre-launch.

**Model selection:**
- Anthropic `claude-haiku-4-5` / `claude-sonnet-4-5` / `claude-opus-4-6` — primary chat.
- `gpt-4o-mini` — cost-efficient utility (campaigns/funnels/reviews/lead scoring/task executor/email writer/automations/analytics).
- `claude-sonnet-4-6` via OpenRouter or `gpt-4o` — HTML page generation.
- `text-embedding-3-small` — embeddings.
- `whisper-1` — STT. OpenAI `nova` — TTS.

### D. Billing architecture

**Plans** — 5-tier catalog: `free`, `solo_pro` (hidden legacy $39), `starter`/Lite $99, `pro` $299, `scale` $499. **Client-count based**, credits layered on top. `plans.ts:203-243` has `@deprecated` credit helpers kept for compile compat.

**Credits** — `credit-engine.ts` is SSOT. Every billable action in `CREDIT_COSTS`: `pipeline.find_leads=5`, `chat.message=1`, `chat.deep_research=5`, `ghl_sms=1`, `voice_call=2`, `crm_enrichment=2`, `page_generation=5`, `geo_test=5`. Free actions (calendar/reminder/memory) log but don't deduct.

**Flow:** `requireCredits` → run op → `deductCredits`. Logs to `credit_transactions`. Crossing `LOW_BALANCE_THRESHOLD = 50` fires one-time notification via `ESCALATION_WEBHOOK_URL`.

**Model-aware credits:** `model-credits.ts` defines per-model costs so Sonnet requests drain more than Haiku. Callers pass `overrideCost` from `getCreditsForModel(model)`.

**BYOK:** `byok.ts` — priority anthropic > openrouter > openai > google. `skipCredits=true` only on paid plans; free-plan BYOK still consumes platform credits (for routing/CRM/infra).

**Stripe state:**
- `agencies.stripe_customer_id` / `plan` / `stripe_connect_account_id`.
- `agency_credits.{balance, lifetime_purchased, lifetime_used}`.
- `agency_billing` (invoice history).
- `credit_transactions` (usage log).

**Webhook flow (`lib/stripe/webhooks.ts`):**
1. `verifyStripeWebhook(body, signature)`.
2. `invoice.paid` → classifies as subscription / client_fee / credit_topup.
3. `customer.subscription.updated` → `planFromPriceId` reverse-lookup (annual → base), updates `agencies.plan`, grants credits (per commit `8f69ab60`).
4. `customer.subscription.deleted` → downgrade.
5. `account.updated` (Connect) → syncs status.

**Stripe Connect:** Express accounts per agency, `APPLICATION_FEE_PERCENT = 10`, agency-to-client invoicing via `createClientInvoice`.

### E. Integrations layer

**GHL** — biggest surface. Bidirectional. Poller-based inbound (`/conversations/search`, no webhooks needed for draft marketplace apps). 50 outbound tools across contacts/conversations/opportunities/calendar/invoices/marketing/tasks. OAuth2 with HMAC state. Token refresh persists via `onTokenRefresh` callback.

**Other integrations:**
- Google Calendar (OAuth, event r/w).
- Google Search Console (metrics fetch).
- WordPress (REST + App Passwords auto-publish).
- HeyGen (avatar video).
- Jane (Algolia direct-query ~4ms for Purple Lotus, Firecrawl fallback).
- `integrations/sync.ts` writes INTEGRATIONS.md into container (never includes secrets).

**Channels** — unified inbound for Telegram/WhatsApp/Discord via `router.ts`. TTS (OpenAI) + STT (Whisper-1) for voice.

**SMS** — delivery-focused: Onfleet → template → Springbig/Blackleaf → log. Separate GHL-backed AI SMS campaigns.

**Voice** — 5 providers via `VoiceProviderClient` interface. $79/mo add-on for 300 min.

**Email** — outbound only. GHL client → GHL platform → Resend fallback. `conversionsystem.com` not verified in Resend. 7-email nurture via `email_nurture_queue` + `/api/cron/email-sequence`.

**Onfleet** — self-contained delivery stack.

### F. Security & auth

**User auth** — Supabase Auth with cookie JWT. `lib/supabase/middleware.ts::updateSession` gates `/agency` and `/admin`, redirects to `/login?redirect=...`.

**Service-role access** — `createServiceClientWithoutCookies()` uses plain `supabase-js` (bypasses cookies + RLS). Documented critically at `server.ts:31-40`. Every cron/webhook/background job uses this.

**Agency membership enforcement** — `lib/agency/middleware.ts::requireAgencyMember()` resolves user → agency → returns `{ user, agency, membership }`. Used inconsistently.

**Cron auth** — `lib/auth/cron.ts::requireCron()` fail-closed if `CRON_SECRET` unset. Accepts Bearer or `?secret=` query.

**Secrets** — `lib/secrets/` — AES-256-GCM, key from `SECRETS_ENCRYPTION_KEY` via SHA-256, 12-byte IV, 16-byte tag. Throws not fails open.

**Prompt-injection defense** — `lib/security/prompt-injection.ts::defend()`. 3-layer. 80+ weighted regex patterns. Applied to untrusted channels (SMS, email, webhooks).

**Rate limiting** — `lib/rate-limit.ts` Supabase-backed two-layer. **Opt-in per route.** `lib/rate-limit.ts` is the only file; adoption is sparse.

**GHL action risk gating** — propose→approve workflow with audit trail via `action_proposals` + `action_log` tables.

### G. Dead/legacy/risky code

- **`lib/fly/*`** — legacy Fly.io provisioner, fully superseded. Archive candidate.
- **`lib/openclaw/*`** — only 6 route files still import it. Hand-rolled WS client still references shared env vars — worth a guard.
- **`lib/email/sequences.ts`** — explicit `DEPRECATED`. Stub file.
- **`lib/billing/plans.ts:203-243`** — 5 `@deprecated` credit helpers + legacy `CREDIT_COSTS` duplicate.
- **`lib/security/prompt-injection.ts:289-319`** — 4 `@deprecated` helpers.
- **`lib/seo/schema-markup.ts:92`** — `@deprecated generateBusinessSchema`.
- **Two model routers** — sync drift risk.
- **`lib/channels/router.ts:1-17`** imports `resolveGatewayForUser` — worth verifying the export still exists.
- **Three co-existing gateway architectures** plus fourth `KYRA_USE_WORKER` — **biggest structural risk surface.** Consolidation should be #1 cleanup target.
- **TODO/FIXME scan** — only 9 across 8 files. Codebase unusually disciplined. Only substantive TODO: `lib/sites/templates/sections/heroes/video-hero.ts:3` ("Accept a `videoUrl` prop").

---

## Batch 3 — HTTP API Surface

Scope: 356 `route.ts` files under `app/api/`.

### Endpoint catalog by domain

#### /api/admin
Admin-grade endpoints. Inconsistent auth: some email-allowlist-gated, some bearer-secret, some **completely open**.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/accounts` | List all agencies with credits, client counts, owner emails |
| GET/PATCH/DELETE | `/api/admin/accounts/[id]` | Inspect / tweak / soft-delete |
| POST | `/api/admin/accounts/[id]/credits` | Grant or adjust credit balance |
| POST | `/api/admin/accounts/[id]/login-as` | Mint magic-link to impersonate |
| POST | `/api/admin/accounts/[id]/reset-password` | Admin-triggered reset |
| POST | `/api/admin/batch-regen` | Regen live site content (bearer `KYRA_API_SECRET`) |
| GET/POST | `/api/admin/content-calendar` | Curate platform blog schedule |
| POST | `/api/admin/enable-weekly-report` | Toggle weekly report |
| POST | `/api/admin/ghl-backfill` | Backfill GHL conversation history |
| POST | `/api/admin/ghl-register-webhooks` | Register Kyra webhook on every GHL client |
| GET | `/api/admin/health-check` | **Unauthenticated** — leaks env / migration state / project URL |
| GET | `/api/admin/kyra-stats` | Platform KPIs (MRR, ARPU, activation, churn) |
| POST | `/api/admin/migrate-contacts` | One-shot migration |
| GET/POST | `/api/admin/nurture-audit` / `nurture-trigger` | Email sequence audit/manual trigger |
| GET | `/api/admin/orphaned-users` | **Unauthenticated** — auth emails without agency |
| GET | `/api/admin/qa-health` | 7 QA checks (`X-Admin-Key` or service role) |
| POST | `/api/admin/router-migrate` | Migrate to new model router |
| POST | `/api/admin/seed-templates` | Seed industry templates |
| POST | `/api/admin/seo/seed-pack/[industry]` | Bulk seed SEO keywords |
| GET | `/api/admin/stats` | Legacy stats (email allowlist includes `steve@`) |
| POST | `/api/admin/sync-leads` | Resync `kyra_waitlist` |

**Admin auth audit (critical):** The email allowlist is hardcoded in three places with different membership (`admin/stats` includes `steve@`; `kyra-stats`, `debug`, `master/*` do not). Maintenance hazard. Consolidate into `lib/auth/admin.ts`.

#### /api/master
Parallel "master console," all cookie-gated on `MASTER_EMAILS`.

- POST `/api/master/impersonate` — magic-link for any user. **Session-hijack endpoint.** No audit row written.
- GET `/api/master/stats` — global platform stats.
- GET `/api/master/vps-health` — Fly.io + OVH probes.

Overlap: `/api/master/impersonate` + `/api/admin/accounts/[id]/login-as` both mint magic links. Merge candidate.

#### /api/debug
- GET `/api/debug` — booleans only (env presence). Correctly gated on two admin emails.

#### /api/auth
- GET `/api/auth/callback` — Supabase PKCE + referral activation + redirect. Accepts `?redirect=` and `?next=` with `decodeURIComponent`. Origin-prefixed so not open-redirect, but any app path allowed.
- GET `/api/auth/google/*` — OAuth init/callback.
- GET `/api/auth/gsc/*` — GSC OAuth.
- POST `/api/auth/signout`, `/signup-intent`, `/solo-signup`.

#### /api/chat — hot path
- POST `/api/chat` — primary entry. Routes to worker/openclaw based on flags, falls back to direct Claude. Cookie JWT required. Credits preflight. Prompt-injection scan. Credits deduction. True SSE streaming via `new ReadableStream`. Typed events: `conversation`, `usage`, `content`, `tool_use`, `memory_saved`, `reminder_saved`, `message`, `error`.
- POST `/api/chat/openclaw` — proxies per-user OpenClaw session. **Fake streaming:** awaits full response, chunks in 20-char slices.
- POST `/api/chat/worker` — new Fly.io Kyra Worker path.

All three require Supabase JWT and share credit/prompt-injection/persistence flow.

#### /api/widget — public embeddable
- GET `/api/widget/[clientId]/script` — self-contained IIFE (styles, DOM, localStorage sessions); 5-min cache.
- POST `/api/widget/[clientId]/lead` — contact-form capture; upserts `crm_contacts`, logs, pushes to GHL.
- POST `/api/widget/chat` — unauth AI chat; IP rate-limit 60/60s; injects knowledge + RAG + CRM memory. Largest public attack surface. `defend()` + `scanOutput`. 2000-char cap. `CORS: *`. Bypasses OpenClaw (direct LLM). `WIDGET_MODEL = 'openai/gpt-4o-mini'`.

#### /api/public
- GET `/api/public/workers` — **no auth, no rate limit.** Returns all non-deleted `agency_clients`. **Leaks internal client UUIDs** used as capability tokens in `/api/widget/chat`, `/api/portal/[clientId]/chat`. Enumeration concern.

#### /api/try, /api/playground — unauth demos
- POST `/api/try` — edge runtime, in-memory IP limiter (20/min), streams Claude Haiku 4.5 via OpenRouter.
- POST `/api/playground/chat` — Supabase-backed 20/hr limiter. **Uses `api.openai.com` with OpenRouter model slug — likely broken** unless `OPENAI_API_KEY` is an OAI-compat OpenRouter key.

#### /api/roi, /api/leads
- POST `/api/roi/capture` — unauth; forwards to `SIGNUP_WEBHOOK_URL`.
- POST `/api/leads` — unauth; upserts `kyra_waitlist` + Resend email. **No rate limit, no CAPTCHA. Body.message interpolated raw into HTML — stored XSS risk.**

#### /api/portal
- POST `/api/portal/[clientId]/chat` — unauth public; IP limit 20/60s; **true streaming body proxy** from OVH gateway.
- POST `/api/portal/invite` / `/api/portal/accept` — invite/accept for white-label portals.

#### /api/agency — biggest surface (176 routes)
All `requireAgencyMember()`-gated with exceptions. Top-level domains: Clients (CRUD + per-client sub-resources), CRM (activities/analytics/autopilot/companies/contacts/deals/feed/import/export/intelligence/merge/rules/score/segments/tags/tasks), Email sequences, Pipeline (outbound outreach), Sites (build/generate/deploy/pages/photos/SEO), Gateway (provision/restart/destroy), Knowledge, Leads, Settings, Credits, API keys, Members, Roles, Templates, Agents, AI-setup, AI-model, Automations, Calendar, Fleet, Outreach, Performance, Review queue, Sales pipeline, Ultron summary, Usage, Web intelligence, Worker performance, Analytics, Plan status, Router stats, Intelligence.

#### /api/webhooks — 7 routes + scattered externals

| Path | Signature | Events |
|---|---|---|
| `/api/webhooks/stripe` | `stripe.webhooks.constructEvent` | `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_succeeded/failed` |
| `/api/webhooks/ghl` | HMAC-SHA256 via `GHL_WEBHOOK_SECRET` OR shared-secret | `InboundMessage`, Contact*, Opportunity*, Appointment*, `CallCompleted`, `FormSubmission`, `SurveySubmission` |
| `/api/webhooks/onfleet/[clientId]` | token in path | Onfleet events |
| `/api/webhooks/onfleet` | Legacy `?clientId=` | forwarder |
| `/api/webhooks/openclaw-usage` | Bearer OR `x-kyra-secret` | Per-client credit deduction |
| `/api/webhooks/resend` | **NONE** | `email.delivered/opened/clicked/bounced/complained` |
| `/api/webhooks/unsubscribe` | token-based | One-click unsubscribe |

**Critical unsigned webhooks:**
- `/api/webhooks/resend` — attacker can fake `email.bounced` to force unsubscribes, inflate engagement.
- `/api/voice/retell/webhook` — fake call records hit `client_conversations`, `voice_usage` (billing-impacting), `crm_activities`.

**Webhooks outside `/api/webhooks/`:**
- `/api/ghl/webhook` — earlier GHL (dup).
- `/api/crm/webhook` — newer GHL (renamed because "GHL blocks URLs with 'ghl'"). **Fails open if `GHL_WEBHOOK_SECRET` unset.**
- `/api/crm/callback` — GHL OAuth callback.
- `/api/channels/{discord,telegram,whatsapp,voice}-webhook` — provider webhooks. WhatsApp has challenge/response. Telegram relies on obscurity.
- `/api/voice/twilio/{gather,outbound-twiml,webhook}` — Twilio webhooks.
- `/api/pipeline/webhooks` — outbound event dispatcher.
- `/api/inbound/webhook` — Zapier/Make/n8n entry; verified via per-client `webhook_token`. Reasonable.
- `/api/stripe/webhooks` — **secondary, disabled in Stripe dashboard.** Duplicates `/api/webhooks/stripe`.
- `/api/stripe/credits/webhook` — credit-pack fulfillment using `STRIPE_CREDITS_WEBHOOK_SECRET`.

**GHL webhook dedup** uses in-memory `Map<messageId, timestamp>` (cap 1000) — loses state across instances. Use `ghl_webhook_logs` uniqueness instead.

#### /api/cron — 16 scheduled routes

All `requireCron()`-gated, fail-closed on missing `CRON_SECRET`.

| Cron | Schedule | Purpose |
|---|---|---|
| `/api/cron/scheduled-tasks` | `*/30 * * * *` | Scheduled tasks + autopilot |
| `/api/cron/weekly-report` | `0 8 * * 1` (Mon 8am UTC) | Weekly agency reports |
| `/api/cron/email-sequence` | `0 8 * * *` | Advances email nurture |
| `/api/cron/follow-ups` | `0 * * * *` | Pipeline follow-ups |
| `/api/cron/crm-autopilot` | `0 7 * * *` | CRM actions |
| `/api/cron/briefing` | `0 8 * * *` | Daily briefing |
| `/api/cron/seo-worker` | `0 6 * * 1-5` | SEO work |
| `/api/cron/alerts` | `*/30 * * * *` | Agency alerts |
| `/api/cron/terminal-credits` | `*/30 * * * *` | Reconcile terminal credits |
| `/api/cron/gateway-token-sync` | `0 4 * * *` | Rotate gateway tokens |
| `/api/cron/usage-alerts` | `0 8 * * *` | Low-credit alerts |
| `/api/cron/worker-tasks` | `*/30 * * * *` | Worker task queue |
| `/api/cron/idle-containers` | `0 4 * * *` | Pause idle gateways |
| `/api/cron/container-health` | `*/5 * * * *` | Gateway health probe |
| `/api/cron/dispatch-optimize` | `*/15 * * * *` | Onfleet route optimization |

Two cron files (`seo/gsc-sync`, `seo/publish-queue`) are not in `vercel.json`.

### Streaming endpoints

1. **`/api/chat`** — true token-by-token via `streamChat()`; typed SSE events; most complete example.
2. **`/api/chat/openclaw`** — fake streaming (awaits, 20-char slices).
3. **`/api/chat/worker`** — new Fly.io path.
4. **`/api/portal/[clientId]/chat`** — proxies true streaming body from OVH gateway.
5. **`/api/try`** — edge runtime, true OpenAI-compat streaming.
6. **`/api/agency/clients/[id]/chat`** — agency-side test chat.

All via `new ReadableStream({ start(controller) })`.

### External integrations exposed via API

**GHL** — 3 webhook receivers, 7 agency/client OAuth endpoints, 1 agent-side tool wrapper.

**Stripe** — 2 checkout routes (one disabled), 2 portal routes, 3 webhook endpoints (`/api/webhooks/stripe` primary; `/api/stripe/webhooks` disabled; `/api/stripe/credits/webhook` separate). Premium template purchase, Connect onboard/dashboard/status. **`/api/stripe/env-check` + `/api/stripe/test`** — debugging helpers of unknown protection.

**Voice (Retell + Twilio)** — Retell is newer; 4 voice webhook entry points with overlapping responsibilities. None signature-verify.

**OpenClaw** — dashboard-url, health, tools, channels pair.

**ClawHub** — skill marketplace (5-min cache), install endpoint.

**Firecrawl** — **catch-all reverse proxy** `/api/fc/[...path]`. Agencies send `Bearer kyra-agency-{agencyId}`; Kyra extracts agencyId, checks plan limits, forwards with master `FIRECRAWL_API_KEY`, increments usage. Clean pattern.

### Duplicate / overlapping routes

- **GHL webhook:** `/api/webhooks/ghl`, `/api/ghl/webhook`, `/api/crm/webhook`.
- **Stripe webhook:** `/api/webhooks/stripe` (active), `/api/stripe/webhooks` (disabled).
- **Stripe checkout:** `/api/billing/checkout` (disabled 400), `/api/stripe/checkout` (active).
- **Stripe portal:** `/api/billing/portal`, `/api/stripe/portal`.
- **Impersonation:** `/api/master/impersonate`, `/api/admin/accounts/[id]/login-as`.
- **Onfleet:** `/api/webhooks/onfleet`, `/api/webhooks/onfleet/[clientId]`.
- **Voice:** `/api/voice/webhook`, `/api/voice/twilio/webhook`, `/api/channels/voice-webhook`, `/api/voice/retell/webhook`.
- **Intelligence:** `/api/agency/ultron/summary`, `/api/agency/analytics/intelligence`, `/api/agency/intelligence`.

### Route-level concerns

- **Unsigned Resend webhook** (`route.ts:9`) — can fake email events.
- **Unsigned Retell webhook** (`route.ts:25`) — fake call records.
- **Unauth admin info leak** (`orphaned-users`, `health-check`).
- **`/api/public/workers`** — leaks client UUIDs.
- **`/api/leads`** — no rate limit + CAPTCHA + stored XSS.
- **`/api/playground/chat`** — OpenAI base URL with OpenRouter slug.
- **`/api/auth/callback`** — accepts any app path for redirect.
- **`/api/crm/webhook` fail-open** — skips auth if `GHL_WEBHOOK_SECRET` unset.
- **`/api/ghl/webhook` verify short-circuits** — warns but returns true.
- **Memory-based GHL webhook dedup** — doesn't survive cold starts.
- **`/api/chat` CORS = app URL**, `/api/chat/openclaw` CORS = `*` — inconsistent.
- **N+1 deduction loop** in `/api/webhooks/openclaw-usage/route.ts:62-66`.
- **Auto-creation of orphan records** — `/api/widget/[clientId]/lead` auto-creates `agency_clients` rows on unknown clientId.
- **Missing input validation** — `/api/try` doesn't validate industry, `/api/leads` accepts arbitrary message.

### Cross-cutting patterns

**Auth models (in order of usage):**
1. Supabase cookie JWT + `requireAgencyMember()` — vast majority.
2. Supabase cookie JWT + hardcoded email allowlist — admin/master/debug.
3. Bearer shared secret — cron + provider webhooks + cross-service.
4. Provider-specific HMAC — Stripe, GHL, WhatsApp verify-token.
5. Per-resource tokens — `/api/inbound/webhook` (per-client `webhook_token`), widget script (clientId).
6. None — portal/chat, widget/chat, try, playground, leads, roi, public/workers, admin/orphaned-users, admin/health-check.

**Service-role vs cookie clients** — `createClient()` (cookie, RLS-enforced) for auth; `createServiceClient()` (bypass RLS) for writes. Tenant scoping is in application code, not DB layer, for writes.

**Rate limiting** — `lib/rate-limit.ts` used by widget/portal/playground only. `/api/try` uses weaker in-memory edge limiter. `/api/leads` has none.

**CORS** — most public endpoints `*`. `/api/chat` = `NEXT_PUBLIC_APP_URL`. `/api/widget/[clientId]/script` = `*` explicitly.

**Dynamic/runtime** — `force-dynamic` set on ~30 routes. `maxDuration` on long routes (site build 300s). `runtime = 'edge'` only on `/api/try`. `runtime = 'nodejs'` explicit on `/api/webhooks/stripe` for raw body.

**Credit system** — every billable action `deductCredits(agencyId, action, { override, clientId })`. Model-aware. Centralized in `credit-engine.ts`. Clean.

---

## Batch 4 — Page Layer

Scope: 107 `page.tsx` + 5 `layout.tsx` + 3 `route.ts` (llms.txt, llms-full.txt, feed.xml) + 2 short-URL routers (invite, ref) + robots.ts + sitemap.ts + not-found.tsx.

Everything wraps in `app/layout.tsx`:10-71 (Inter font, Kyra metadata, OG/Twitter, RSS alt, Meta Pixel, `bg-gray-50`). No auth at root.

### `(auth)` — unauthenticated entry surface

Only `(auth)/login/layout.tsx` exists (force-dynamic passthrough). No group-level layout. Does NOT gate on auth — holds both pre-auth and public marketing funnels.

**Pages:**
- `login/page.tsx` — email/password + Google OAuth, `<Suspense>` for `useSearchParams`.
- `login/impersonate/page.tsx` — master impersonation landing.
- `signup/page.tsx` — **1-line redirect** to `/signup/agency` (personal signup removed).
- `signup/agency/page.tsx` — renders `AgencySignupWrapper`.
- `signup/success/page.tsx` — viral referral screen with early-bird countdown.
- `forgot-password/page.tsx`, `reset-password/page.tsx`.
- `build/page.tsx` — ~800-line DFY worker-shopping funnel (lead magnet).
- `solo/page.tsx` — free-tier landing. Referral capture (`?ref=` + `kyra_ref` cookie).
- `website-builder/page.tsx` — website-focused funnel → `/signup/agency?plan=...`.
- `get-started/page.tsx` — compressed 5-step wizard (Building / Industry / Capabilities / Personality / Account).

`(auth)` is overloaded — grouping criterion is "pre-auth-or-signup flow," not "must-be-logged-out."

### `(dashboard)` — the paying-user app

`app/(dashboard)/agency/layout.tsx`:
1. Fetches user → `redirect('/login')` if none.
2. `getAgencyForUser(user.id)` → `redirect('/signup/agency')` if none.
3. Pulls clients for command palette, flags `isMaster` against two hardcoded emails (`hello@conversionsystem.com`, `angel@conversionsystem.com`).
4. Renders `<AgencySidebar />`, main column, `<CommandPaletteWrapper />`. Solo not blocked.

Every child page also re-runs `getUser`/`getAgencyForUser`. Auth preamble duplicated ~15 times; `requireAgencyMember()` exists but used once (`clients/[id]/seo-guide/page.tsx:13`).

**Sidebar:** intentionally minimal — Mission Control (`/agency`), Analytics (master-only), Intelligence (pro/scale gate), Clients, Terminal, Inbox, Websites (master-only), SEO/GEO (master-only), Build Requests. Account section: Billing, Referrals, API Keys, Settings, Help.

**Top-level pages:**

| Route | Purpose |
|---|---|
| `/agency` | Mission Control |
| `/agency/clients` | Client grid |
| `/agency/clients/new` | New client form |
| `/agency/clients/[id]` | Client detail with 13 tabs |
| `/agency/clients/[id]/{booking,seo-guide,site-portal}` | Per-client sub-pages |
| `/agency/billing` | Stripe plans + credits, handles post-checkout |
| `/agency/credits` | Balance + tx list |
| `/agency/usage` | Usage dashboard |
| `/agency/analytics` | Master-only per-client rates |
| `/agency/intelligence` | Pro/Scale gated web intelligence workspace |
| `/agency/crm` | `CrmCommandFeed` |
| `/agency/crm/contacts`, `/[id]` | CRM list + detail |
| `/agency/calendar` | Bookings view |
| `/agency/email` | Email sequences |
| `/agency/automations` | Proactive rules |
| `/agency/review-queue` | Human review queue |
| `/agency/build-requests` | DFY inbound queue |
| `/agency/referrals` | Referral machine |
| `/agency/api-keys` | BYOK keys |
| `/agency/templates` | Premium template gallery |
| `/agency/voice` | Voice/phone config |
| `/agency/widget` | Widget builder |
| `/agency/ai-model` | Agency model preference |
| `/agency/settings` | Profile, members, roles |
| `/agency/settings/webhooks` | JSONB webhook editor |
| `/agency/sites` (master-only) | Cross-agency site index |
| `/agency/seo` (master-only) | SEO/GEO command center |
| `/agency/website`, `/[siteId]/{editor,seo,settings}` | Per-site editor; `growth` redirects to `/seo?tab=growth` |
| `/agency/website/{create,quick-start,bulk}` | Provisioning wizards |

**Stub redirects** (from feature consolidations):
- `/agency/agents → /clients` ("no agency-level OpenClaw exists")
- `/agency/ai-setup → /clients`
- `/agency/channels → /clients`
- `/agency/ghl-setup → /clients`
- `/agency/autopilot → /automations`
- `/agency/performance → /clients`
- `/agency/website → /clients`

### `(onboarding)`

Minimal gradient header. `app/(onboarding)/onboarding/page.tsx`: auth → fetch agency → short-circuit if `settings.onboarding_complete` → render wizard.

**Signup → activation funnel:**
```
/signup/agency → /signup/success?agencyId= → /onboarding → /agency
```

Alternate entry points: `/build` (DFY), `/solo?ref=` (free), `/website-builder?plan=` (plan preselected), `/get-started` (5-step).

### `(portal)` — sub-account portal

`app/(portal)/layout.tsx` is passthrough ("no agency sidebar"). Sub-account users see clean white-labeled experience. Auth check: agency_members OR `sub_account_members`. Only part of app using `sub_account_members`/`invitations`.

### `(public)` — logged-out marketing

No group layout — each page has `<PublicNav/><PublicFooter/>` inline.
- `launch/` — long-form landing.
- `playground/` — 25-template try-chat.
- `tools/ai-readiness/` — scored quiz.
- `workers/` + `/[id]` — public AI worker directory.

### Portal-adjacent routes (top-level, not in `(portal)`)

| Route | Audience | Auth |
|---|---|---|
| `/portal/[clientId]` | End customer | No |
| `/report/[clientId]` | End customer | No |
| `/terminal/[clientId]` | Agency staff | Yes (redirect to raw OpenClaw UI) |
| `/a/[agencyId]` | Public | No |
| `/pitch/[agencyId]/[industry]` | Cold-pitch | No |
| `/results/[agencySlug]` | Prospects | No (public gated by `settings.public_results !== false`) |
| `/invite/[code]` | Referred | No (cookie + redirect) |
| `/ref/[agencyId]` | Same | No |

Sharing surface: agencies send `/ref/<id>` or `/invite/<code>` for leads; link prospects to `/results/<slug>`, `/a/<id>`, `/pitch/<id>/<industry>`; end customers get `/portal/<clientId>` or `/report/<clientId>`; staff use `/terminal/<clientId>`.

### Public marketing / programmatic-SEO surface

**Hand-authored one-offs:** home, pricing, vs, compare/mission-control, use-cases, roi, openclaw, zapier, web-intelligence, get-demo, help, changelog, partners, privacy, terms, ghl/*, cannabis (311 LOC), ecommerce, india (HighLevel LIVE 2026), march-16 (Launch event).

**Template-driven:**
- `app/demo/[industry]/page.tsx` — animated chat demo.
- `app/try/[industry]/page.tsx` — interactive demo.
- `app/for/[industry]/page.tsx` — niche pages.
- `app/for/page.tsx` — personalized outreach (`?name=&agency=&niche=`).
- `app/pitch/[agencyId]/[industry]/page.tsx` — per-agency × per-industry pitch.
- **`app/ai-for/[slug]/page.tsx`** — programmatic 50-industry generator.
- **`app/ai-for/[niche]/page.tsx`** — **CONFLICTING second dynamic segment at same level.** Next.js route conflict.
- `app/ai-for/page.tsx` — index with 8 categories.
- `app/blog/page.tsx` + `[slug]` — blog.
- `app/guides/page.tsx` + `[id]` — setup guides.

`app/sitemap.ts`:10-60 ties it together. `app/robots.ts` disallows `/api/`, `/agency/`, `/admin/`, `/portal/`, `/(auth)/`, `/signup/`, `/login` (**`/(auth)/` is a dead line** — group names don't appear in URLs).

### Admin & master consoles

Two parallel consoles; both gate on same two hardcoded emails. `admin/content/page.tsx` uses a 4-email list (drift).

**`app/admin/`** — `page.tsx`, `content/`, `orphaned-users/`.
**`app/master/`** — `page.tsx`, `accounts/`, `stripe-setup/`.

### Special routes

- `app/llms.txt/route.ts` — llmstxt.org spec. `force-static`, 24h cache.
- `app/llms-full.txt/route.ts` — extended; concatenates every blog post body (HTML-stripped) + full `INDUSTRY_TEMPLATES`. Designed for RAG.
- `app/feed.xml/route.ts` — RSS 2.0. Escaped XML, 1h/24h caching.
- `app/sitemap.ts`, `app/robots.ts`, `app/not-found.tsx`.

### Dynamic segments

| Segment | Source |
|---|---|
| `/a/[agencyId]` | `agencies.id` |
| `/pitch/[agencyId]/[industry]` | id × INDUSTRIES map |
| `/ref/[agencyId]` | no DB |
| `/invite/[code]` | `agencies.settings->>invite_code` |
| `/ai-for/[niche]` | inline NICHES (~6-10) |
| `/ai-for/[slug]` | `INDUSTRY_TEMPLATES` (50) |
| `/blog/[slug]` | `POSTS` |
| `/guides/[id]` | `SETUP_GUIDES` |
| `/demo/[industry]` | inline DEMOS |
| `/try/[industry]` | inline INDUSTRIES |
| `/for/[industry]` | inline PAGES |
| `/portal/[clientId]`, `/report/[clientId]`, `/terminal/[clientId]` | `agency_clients` |
| `/results/[agencySlug]` | `agencies.slug` + `public_results` gate |
| `/(portal)/client-portal/[clientId]`, `/invite/[token]` | clients + invitations |
| `/(public)/workers/[id]` | `agency_clients` (non-deleted) |
| `/(dashboard)/agency/clients/[id]` | gated on `agency_id` |
| `/(dashboard)/agency/crm/contacts/[id]` | client-side |
| `/(dashboard)/agency/website/[siteId]/...` | client-side via `useParams` |

### Server vs client components

- 35 of 107 `page.tsx` are `'use client'`.
- **Auth-critical pages are RSC** (login is exception — Supabase client flow).
- **Interactive/stateful → client** (signup wizards, build-request, calendar, site editor, chat playground, ROI calculator, pricing toggle).
- **Content-dense SEO → RSC with metadata**.
- **Thin pages** — `crm/page.tsx` (5 lines), `contacts/page.tsx` (3 lines), `email/page.tsx` (3 lines).

Recurring server-page skeleton:
```ts
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');
const result = await getAgencyForUser(user.id);
if (!result) redirect('/signup/agency');
```

### Stale / mystery / incomplete

- **`app/march-16/`** — past event landing (March 16-17 SF). Archive candidate.
- **`app/india/`** — HighLevel LIVE India 2026 event lander.
- **`app/cannabis/`, `app/ecommerce/`** — rich vertical pages, not mystery.
- **`app/ai-for/[niche]` + `[slug]` route conflict** — Next.js will pick one and shadow the other.
- **Redirect-only dashboard pages** — intentional historical redirects.
- **`app/get-demo/`** + `app/pitch/*` — four parallel pitch decks (A/B testing).
- **`app/openclaw/`, `app/vs/`, `app/compare/mission-control/`** — product positioning.

### Cross-cutting observations

1. **Auth guard sprawl** — 15 copies of same 6-line block; `requireAgencyMember()` used once.
2. **Two account types share dashboard** — `settings.account_type === 'solo'` branches in pages, not route groups.
3. **Two master email lists drift apart** — 2 emails in `admin`/`master`/`agency layout`; 4 emails in `admin/content`.
4. **Portal consolidation incomplete** — `(portal)` group + `/portal/[clientId]` + `/report/[clientId]` coexist.
5. **Programmatic-SEO layer is substantial** — 50 × 3 demo types + blog + guides = large crawlable surface.
6. **Three hard-coded short URL sinks** — `/invite/[code]`, `/ref/[agencyId]`, `/solo`. Cookie strategy inconsistent (`httpOnly: false` vs `true`).
7. **`robots.ts` has dead `/(auth)/` entry.**
8. **`/agency/page.tsx:49` inlines plan-limit table** — drift vs `plans.ts`.

---

## Batch 5 — Components & Hooks

Scope: `components/` — 101 files across 18 subdirs + `hooks/` (1 file).

### `components/ui/` — Design system (6 files)

Hand-rolled shadcn-flavored — **NOT installed via CLI** (no `components.json`, no Radix). Each uses `class-variance-authority` + `tailwind-merge`.

| File | Notes |
|---|---|
| `button.tsx:5-29` | cva variants (default indigo, destructive, outline, secondary, ghost, link) + sizes. `asChild` prop accepted but ignored. |
| `badge.tsx:5-25` | Standard variants **plus Kyra memory types** (fact/person/decision/event/preference). |
| `card.tsx` | Standard Card/Header/Title/Description/Content/Footer. Plain divs. |
| `input.tsx`, `textarea.tsx` | Minimal forwardRef. |
| `switch.tsx:13-40` | Hand-rolled `<button role="switch">`. Not Radix. |

**Missing primitives:** Dialog, Select, Dropdown, Tooltip, Tabs, Popover, Command, Checkbox, Radio, Accordion, Sheet, Toast, Skeleton. Every dialog, tabbed surface, popover, palette, notification, confirmation is a bespoke feature-owned implementation. **Tabs pill-bar pattern reimplemented 10+ times** across tab files.

Render stack: `react-markdown` + `remark-gfm` + `rehype-highlight` for chat, `lucide-react` icons everywhere (~90% of components), Tailwind + `@tailwindcss/typography`.

### `components/chat/` (8 files, ~1280 LOC)

| File | LOC | Purpose |
|---|---|---|
| `ChatInterface.tsx` | 358 | Top-level chat page — conversations, messages, streaming, credits, mobile sidebar |
| `ChatInput.tsx` | 214 | Textarea + paperclip + submit, drag-drop file upload, attachment chips, auto-resize |
| `MessageBubble.tsx` | 154 | Renders one message. Assistant: ReactMarkdown + remarkGfm, copy button, VoiceButton |
| `ConversationSidebar.tsx` | 226 | Gray-900 sidebar, grouped conversations (Today/Yesterday/7d/Older), credit counter |
| `CreditBadge.tsx` | 85 | Floating pill + zero-balance banner. `usePolling('credits', 15s)` |
| `SearchResults.tsx` | 104 | Parses `[SEARCH_SOURCES]...[/SEARCH_SOURCES]` JSON, renders dropdown |
| `VoiceButton.tsx` | 71 | POSTs to `/api/voice/tts`, plays blob |
| `WakingUpIndicator.tsx` | 73 | **ORPHANED** — no import sites |

**Chat architecture:** Main SSE loop in `ChatInterface.tsx:148-229` consumes `data: {json}` lines. Events: `conversation`, `usage`, `content`, `message`, `memory_saved`. **Memory surfacing is just `console.log('Memory saved:', parsed.memory)` at line 218** — no visible UI despite `Badge` variants existing. Pipeline rendering NOT in chat — `PipelineProgress` never imported.

### `components/dashboard/` (31 top-level + 29 client-tabs)

**Top-level widgets:**

| File | LOC | Purpose |
|---|---|---|
| `solo-overview.tsx` | 652 | Solo mission control (gateway/credits/feed/CTAs) |
| `mission-control-live.tsx` | 468 | Agency live fleet + feed |
| `ceo-action-board.tsx` | 168 | Agency health check via `/api/admin/health-check` |
| `agency-analytics-strip.tsx` | 91 | 4-stat hero strip |
| `agency-checklist.tsx` | 175 | 6-item launch checklist |
| `fleet-status-bar.tsx` | 93 | Stacked running/starting/errored bar |
| `credit-wall-modal.tsx` | 139 | Buy-credits modal |
| `low-credit-banner.tsx` | 83 | Amber/red banner, localStorage dismiss |
| `trial-countdown-banner.tsx` | 60 | Upgrade nudge (trials removed) |
| `whats-new-banner.tsx` | 100 | `BANNER_VERSION = '2026-04-18-v1'` |
| `referral-nudge.tsx` | 130 | Low-credit + 48h early-bird |
| `referral-share-widget.tsx` | 104 | Copy/tweet/LinkedIn |
| `revenue-unlock-card.tsx` | 114 | Next-tier MRR uplift ($997/client × plan-max) |
| `roi-summary-card.tsx` | 159 | Churn-prevention ROI (4min × $30/hr heuristic) |
| `router-savings-widget.tsx` | 66 | % answered free |
| `sales-lead-widget.tsx` | 146 | Master-only, 10 hardcoded hot leads (internal CRO tool) |
| `web-chat-leads.tsx` | 416 | Widget-captured-leads inbox |
| `ultron-summary-card.tsx` | 196 | Agency-wide risk summary |
| `ai-suggestions-card.tsx` | 103 | Per-client GPT suggestions |
| `client-activity-heatmap.tsx` | 161 | Day × hour indigo heatmap |
| `client-sparkline.tsx` | 114 | Inline SVG sparkline + trend icon |
| `client-status-banner.tsx` | 187 | **Pure server-compat** — no hooks |
| `health-score-badge.tsx` | 94 | Red/amber/green via `/api/agency/clients/:id/health-score` |
| `onboarding-progress.tsx` | 114 | Dismissable progress bar |
| `section-nav.tsx` | 87 | In-page tab strip |
| `model-selector.tsx` | 110 | Grouped-by-tier model picker |
| `widget-builder-embedded.tsx` | 495 | Purple Lotus–style widget builder (4 tabs) |
| `voice-channel-card.tsx` | 529 | Full voice-AI config (5 providers) |
| `quick-answers-editor.tsx` | 167 | Hours/address/services/pricing + custom Q&A |
| `ghl-webhook-config.tsx` | 169 | GHL Workflow → Custom Webhook wizard |
| `outreach-webhook-setup.tsx` | 383 | Outreach webhook wizard |

**`client-tabs/` (29 files, ~14.8K LOC):**

`client-detail-view.tsx:198` declares 13 tabs: `inbox | terminal | crm | voice-sms | dispatch | marketing | website | seo-geo | ai-setup | integrations | it-operations | settings | insights`. Plan/role-gated (master-only: marketing, seo-geo, voice-sms, dispatch).

| Tab | File | LOC |
|---|---|---|
| AI Setup | `ai-setup-tab.tsx` | 61 |
| Train | `train-tab.tsx` | 62 |
| Identity | `identity-sub-tab.tsx` | 171 |
| Training | `training-sub-tab.tsx` | 607 |
| Behavior | `behavior-sub-tab.tsx` | 198 |
| AI Workers | `ai-workers-tab.tsx` | **996** |
| Booking | `booking-config-tab.tsx` | 377 |
| Channels Live | `channels-live-tab.tsx` | 36 |
| **CRM** | `crm-tab.tsx` | **2920** |
| Dispatch | `dispatch-tab.tsx` | **1275** |
| Email Marketing | `email-marketing-tab.tsx` | **1382** |
| Voice | `voice-sub-tab.tsx` + `retell-voice-tab.tsx` | 375 + 529 |
| Delivery SMS | `delivery-sms-tab.tsx` | 523 |
| SMS Campaigns | `sms-campaigns-sub-tab.tsx` | 488 |
| Marketing | `marketing-tab.tsx` | **1077** |
| Campaigns | `campaigns-sub-tab.tsx` | 330 |
| Funnels | `funnels-sub-tab.tsx` | 288 |
| Reviews | `reviews-sub-tab.tsx` | 490 |
| Workflows | `workflows-tab.tsx` | 706 |
| Website | `website-tab.tsx` | **902** |
| SEO/GEO | `seo-geo-tab.tsx` | 82 (wraps `components/seo-geo-command-center.tsx` 1966) |
| IT Operations | `it-operations-tab.tsx` | 564 |
| Secrets | `secrets-tab.tsx` | 455 |
| Skills | `skills-tab.tsx` | 519 |
| Insights | `insights-tab.tsx` | 281 |
| Tasks | `tasks-card.tsx` | 631 |
| Worker Perf | `worker-performance-card.tsx` | 202 |
| Knowledge | `knowledge-engine-card.tsx` | 229 |
| Payments | `payments-sub-tab.tsx` | 391 |

### `components/landing/` + `marketing/` + `brand/`

| File | LOC | Purpose |
|---|---|---|
| `landing/HeroChatWidget.tsx` | 197 | Fake-Chrome chat demo with streaming + rate-limit→signup |
| `landing/activity-ticker.tsx` | 52 | **Likely orphaned.** 12 hardcoded fake wins |
| `landing/live-stats.tsx` | 54 | **Likely orphaned.** 4-stat grid from `/api/stats` |
| `landing/lead-capture.tsx` | 57 | **Likely orphaned.** Email form → `/api/leads` |
| `marketing/testimonial-placeholder.tsx` | 26 | Default quote card |
| `brand/kyra-logo.tsx` | 60 | **Single source of truth for wordmark.** Comment: "Stop creating new logos." |

### `components/layout/`
- `public-nav.tsx` (94) — sticky nav.
- `public-footer.tsx` (83) — 4-col footer with 6 `/try/:vertical` links.

### `components/agency/` (3 files)

| File | LOC | Purpose |
|---|---|---|
| `VoiceCommandButton.tsx` | 333 | Floating mic → MediaRecorder → `/api/agency/voice-command`. Mounted globally in layout |
| `gateway-status.tsx` | 123 | Summary banner via `/api/agency/gateway/status` |
| `ghl-agency-connection.tsx` | 210 | Agency-level GHL Marketplace OAuth status |

### `components/master/`
- `growth-chart.tsx` (207) — Platform growth chart for master agency `1511e077-77ef-4c47-81fd-06a3bc9f1dbb`.

### Specialized feature UIs

| Subdir | File (LOC) | Notes |
|---|---|---|
| `pipelines/` | `PipelineProgress.tsx` (158) | **ORPHANED** |
| `notifications/` | `NotificationCenter.tsx` (249) | Bell icon + panel. 7 types. Polls 30s |
| `reminders/` | `ReminderNotification.tsx` (95) | Toast stack. Polls `/api/reminders/due` every 60s |
| `billing/` | `PlanRedirect.tsx` (10) | **No-op stub** during beta |
| `widget/` | `powered-by-badge.tsx` (21) | Footer for embeddable widget |
| `ai/` | `suggest-button.tsx` (123) | AI Suggest popover |
| `analytics/` | `MetaPixel.tsx` (88) + `PixelEvent.tsx` (36) | Pixel ID `735277348604833` **hardcoded** |
| `onboarding/` | `guided-tour.tsx` (268) + `launch-progress.tsx` (170) | Product tour + 5-stage tracker |

### Root-level

| File | LOC |
|---|---|
| `command-palette.tsx` | 323 |
| `command-palette-wrapper.tsx` | 11 |
| `open-control-ui-button.tsx` | 36 |
| `seo-geo-command-center.tsx` | **1966** |

### Hooks layer

**Only one:** `hooks/use-polling.ts` (173 LOC). Module-level cache keyed by `key`. Used by: `ChatInterface` (conversations 30s), `CreditBadge` + `CreditWarningBanner` (15s), `NotificationCenter` (30s). ~15+ other components reimplement `useEffect + setInterval`.

**No `useAuth`, `useUser`, `useSupabase`, `useDebounce`, `useLocalStorage`.**

### State management

**None.**
- No `zustand` / `redux` / `jotai` / `@tanstack/react-query` in `package.json`.
- Zero `createContext(` in `components/`, `hooks/`, `lib/`, `app/`.
- Zero React Provider wrappers.

**State flows:** server props → local `useState` → `usePolling` (module cache) → custom `window` events (`kyra:credit-update`) → `localStorage` for banners.

For ~100 components, zero contexts is notable and consistent with CLAUDE.md's simplicity rule. Cost: duplicated polling + `fetch('/api/...')` boilerplate ~40 times.

**`"use client"` density:** 91 of 107 components are client. Server-compatible: `ui/*` primitives, `brand/kyra-logo`, `layout/public-footer`, `marketing/testimonial-placeholder`, `widget/powered-by-badge`, `dashboard/client-status-banner`.

### Component health

**Orphans:**
- `components/chat/WakingUpIndicator.tsx` — no imports outside own file.
- `components/pipelines/PipelineProgress.tsx` — no imports.
- `components/billing/PlanRedirect.tsx` — explicit no-op.
- `components/landing/{activity-ticker,live-stats,lead-capture}.tsx` — zero import matches.

**Duplicated logic:**
- Tab/sub-tab pill-bars — ≥10 reimplementations.
- `CopyButton` — ≥4 copies.
- `timeAgo()` — 3 implementations (mission-control-live, solo-overview, NotificationCenter).
- Polling setup — `usePolling` used 4×, hand-rolled 15×+.
- Channel-color maps — 3 copies.
- GHL + outreach webhook wizards structurally similar.

**Monoliths (>500 LOC, top 15 > 15 KLOC):**
1. `crm-tab.tsx` — 2920
2. `seo-geo-command-center.tsx` — 1966
3. `email-marketing-tab.tsx` — 1382
4. `dispatch-tab.tsx` — 1275
5. `marketing-tab.tsx` — 1077
6. `ai-workers-tab.tsx` — 996
7. `website-tab.tsx` — 902
8. `workflows-tab.tsx` — 706
9. `solo-overview.tsx` — 652
10. `tasks-card.tsx` — 631
11. `training-sub-tab.tsx` — 607
12. `it-operations-tab.tsx` — 564
13. `voice-channel-card.tsx` — 529
14. `retell-voice-tab.tsx` — 529
15. `delivery-sms-tab.tsx` — 523

**Voice UI sprawl:** 3 voice components with overlapping responsibilities — `voice-channel-card` (all 5 providers), `retell-voice-tab` (Retell-only), `voice-sub-tab`.

**Other concerns:**
- Master agency UUID `1511e077-...` inline in multiple files.
- Meta Pixel ID hardcoded.
- Hardcoded demo data in `activity-ticker.tsx:8-22` and `sales-lead-widget.tsx`.

---

## Batch 6 — Config, Middleware, Scripts, Infra, Tests, Types

### Middleware

`middleware.ts` is 13 lines. Logs every request, skips `/api/*` entirely, delegates to `updateSession`. Matcher excludes static assets.

`updateSession`:
- Supabase SSR server client bound to cookies.
- `supabase.auth.getUser()` refreshes session.
- `/agency` or `/admin` + no user → redirect `/login?redirect=<original>`.
- `/login` + user → redirect `/agency`.

**No rate limiting** at edge. Rate limiting needs to be per-route or CDN.

### Next.js config (`next.config.mjs`, 58 lines)

- `serverExternalPackages: ['ws']`.
- `experimental: {}` (empty).
- **Exhaustive security headers** for `/(.*)`: X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff, X-XSS-Protection, Referrer-Policy strict-origin-when-cross-origin, HSTS max-age 31536000 includeSubDomains, Permissions-Policy (camera=(), microphone=(), geolocation=(), payment=()), CSP permitting Stripe/Supabase/OpenAI/Anthropic/Retell/LiveKit/kyra.conversionsystem.com/cdn.jsdelivr.net. `frame-ancestors 'none'`, `object-src 'none'`, **`'unsafe-inline' 'unsafe-eval'` in script-src** (required for Next.js, flagged to tighten later).

No image domains, no rewrites, no redirects.

### Deployment — vercel.json vs Cloudflare

`vercel.json`:
- `git.deploymentEnabled: false` — no auto-deploy.
- `ignoreCommand: "exit 1"` — skip any build.
- `functions` with `maxDuration` for 9 routes (site build/generate/deploy 300s, dispatch 30-60s).
- **15 crons** (see Batch 3).

`package.json` has `@opennextjs/cloudflare` toolchain (`cf:build`, `preview`, `deploy`), Wrangler in devDeps. But `scripts/deploy.sh` runs `npx vercel --prod --yes`; CI comment explicitly says "Deployments via CLI."

**Reconciliation:** Production is Vercel. Cloudflare scripts are dormant migration path, not active.

### CI/CD

`.github/workflows/deploy.yml` (misnamed — runs only CI checks). Triggers: push/PR to main + `workflow_dispatch`. Node 22 runs:
1. `npm ci`
2. `npx tsc --noEmit`
3. `npx eslint . --max-warnings 9999`
4. `npm test` (Vitest)

Comment calls out prior auto-deploy cost ~$150/mo duplicate build minutes. Deploys happen manually via `bash scripts/deploy.sh`.

### Scripts

- **`deploy.sh`** (165 lines) — Vercel deploy gate. **Hard 2-deploy/day limit** via `/tmp/.kyra_deploy_<YYYYMMDD>`. Warns before #2, blocks #3 unless `FORCE=1`. Warns on uncommitted. `npx vercel --prod --yes`. Auto-deletes prior deployments via `npx vercel rm`. Target: project `kyra`, team `conversionsystem`. Aim: Vercel spend near $24/mo.
- **`qa-check.sh`** (425 lines) — Nightly. 7 checks: Stripe webhook is `/api/webhooks/stripe`; paid agencies have ≥500 credits; container health SSH to `ubuntu@15.204.91.157`; provisioner image pin `kyra-gateway:v2026.3.23-full`; recent paid signups with `plan='free'`; Vercel deploy count; dead webhook handlers. Telegram alerts on failure. `DRY_RUN=1` supported.
- **`seed-templates.ts`** (618 lines) — seeds `agency_templates`. First is "LeadPilot." Uses `SUPABASE_SERVICE_ROLE_KEY`.
- **`backfill-templates.js`** (177 lines) — **Hardcodes production service-role JWT at line 15.** Reads `quick_answers` JSON, POSTs to provisioner, reloads kyra-router cache. Supports `--dry-run`.
- **`test-templates.ts`** (153 lines) — static validation of `INDUSTRY_TEMPLATES`. Not in CI.
- **`fix-marketing-data.mjs`** (426 lines) — hardcoded `AGENCY_ID` (`1511e077-…`) + `CLIENT_ID` (`f91b28a1-…`). Updates email templates, backfills agency-owner contacts, recreates Kyra Onboarding sequence.
- **`reembed-memories.js`** (58 lines) — re-embeds `memories` table with text-embedding-3-small. **No dry-run, no batching.**
- **`run-migration.mjs`** (72 lines) — `pg` library direct Postgres. `yaijdtsunxicuphrakcc` hardcoded. `SUPABASE_DB_PASSWORD` or `DATABASE_URL`.

### Infra

**`infra/nginx/kyra-css-proxy.conf`** — Custom nginx on VPS `15.204.91.157:19000`. Routes `<uuid>.<host>` to `http://kyra-cl-<uuid>:18789`. Strips `Accept-Encoding`, injects `<style>` to hide OpenClaw UI artifacts (white-label). Serves inline favicon.svg. **Critical WebSocket fix:** `proxy_set_header Sec-WebSocket-Extensions ""` removes permessage-deflate (nginx can't relay compressed frames).

**`infra/provisioner/server.js`** (1114 lines) — Node/Express on `:9090`. Bearer `PROVISIONER_SECRET=kyra-provisioner-2026` (also hardcoded default). Manages `kyra-gateway:latest` per client, generates `openclaw.json`, runs shared `kyra-router` (`:8104`, `KYRA_MAX_TIER=2`, `KYRA_DAILY_CAP=$50`, `KYRA_MONTHLY_BUDGET=$500`), writes Traefik dynamic config, persists meta/auth to `/opt/kyra/data/clients/<id>/meta.json`. Uses `dockerode`, `helmet`, `cors`.

**`infra/scripts/deploy-kyra-router.sh`** — one-shot `kyra-router` build/start.

**`infra/restart-all.sh`** — Safe restart of all `kyra.managed=true` containers. Reads tokens from `meta.json` (not `docker inspect` — tokens can be corrupted there). Memory 1GB, CPU 256, `cap-drop NET_RAW/SYS_ADMIN/MKNOD`. Per-client or master OpenAI key. Bind-mount `/opt/kyra/data/clients/<id>/openclaw`.

**`infrastructure/openclaw/`** — DIFFERENT deployment. Fly.io (`kyra-gateway`), region `fra`, 2GB RAM, shared CPU, persistent volume `openclaw_data`. Dockerfile: Debian bookworm + Node 22.13.1 + `openclaw@latest` + Chromium + `himalaya` (email) + `gh`. `start.sh` (432 lines) has a 120s watchdog that kills/restarts if gateway doesn't bind `:18789` (up to 3x). `kyra-bridge.js` (1235 lines) — HTTP API `POST /chat` translating to OpenClaw WebSocket RPC. `workspace/` has default SOUL.md/AGENTS.md/USER.md/MEMORY.md/TOOLS.md/HEARTBEAT.md.

### Backend deployment targets

1. **Vercel** — Next.js app (UI, routes, cron).
2. **VPS (OVH, 15.204.91.157)** — provisioner + nginx + Traefik + per-client Docker + kyra-router.
3. **Fly.io (`kyra-gateway`)** — legacy single-tenant OpenClaw Frankfurt (warm fallback).
4. **Cloudflare Workers (`kyra-worker`)** — multi-tenant sandboxes (env-referenced, sibling dir excluded from tsconfig).

### Tests (3 files)

- **`billing.test.ts`** (247 lines, 40+ assertions) — `CREDIT_COSTS`, `getCreditCost`, free actions, `getCreditsForModel`, `normalizeModelId`, OpenRouter slug resolution, plan enforcement (maxClients/monthlyCredits for free/solo_pro/starter/pro/scale), Stripe webhook idempotency-key format, `resolveModel`. Mocks Supabase manually.
- **`cron-auth.test.ts`** (147 lines) — `checkCronAuth`/`requireCron`. Fail-closed when `CRON_SECRET` unset. Bearer + `?secret=` + rejection of `Bearer undefined`. Multi-secret rotation.
- **`ghl-id-validate.test.ts`** (129 lines) — `isValidGhlId`/`validateGhlIds`. 10-64 char base62. Rejects path traversal, URL injection, scheme injection, whitespace, URL-encoded chars, hyphens/underscores/dots, non-strings, empty.

**Coverage gaps** (significant):
- No tests for any API route.
- No tests for Stripe webhook integration beyond event-type list.
- No tests for provisioner, kyra-bridge, kyra-worker.
- No tests for Supabase middleware.
- No tests for template engine, GHL skills, memory/Pinecone, email rendering.
- No tests for any React component.
- No E2E.

### Type definitions (5 files, ~350 lines)

- **`index.ts`** (121 lines) — `Plan` **stale: 'free' | 'starter' | 'business' | 'max'** (doesn't match real `free | solo_pro | starter | pro | scale`), `Channel`, `MessageRole`, `MemoryType`. Interfaces: User, UserSettings, Conversation, Message, MessageMetadata, Memory, MemoryMetadata, UserFile. Request/response: ChatRequest, ChatResponse, ConversationWithMessages. Component prop types.
- **`channels.ts`** (57 lines) — `ChannelType = web|whatsapp|telegram|discord|voice|email|slack`. Interfaces: ChannelMessage, ChannelAttachment, ChannelResponse, ChannelButton, ChannelConfig, UserChannelLink.
- **`memory-graph.ts`** (47 lines) — EntityType (person/company/project/goal/place/topic/event), RelationType (knows/works_at/works_on/wants/located_in/related_to/deadline/depends_on/part_of). Confidence + source_memory_ids.
- **`notifications.ts`** (40 lines) — NotificationType (insight/reminder_followup/calendar_prep/weekly_summary/nudge/morning_brief/pattern_alert), 4-level priority.
- **`pipelines.ts`** (56 lines) — PipelineStatus, StepStatus, step types (ai_task/web_search/file_create/email/approval/custom). Credit cost, requires_approval.

These describe **aspirational features** only partially implemented. No `pipelines` table matching this shape.

### Env vars

From `.env.example` (85 lines) + `.env.local.example` (adds `FIRECRAWL_API_KEY`):

- **App:** `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`.
- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Kyra Worker:** `KYRA_WORKER_URL`, `KYRA_API_SECRET`.
- **OpenClaw Gateway (legacy):** `OPENCLAW_GATEWAY_URL`, `OPENCLAW_API_KEY`.
- **Feature flags:** `KYRA_USE_WORKER`, `KYRA_USE_OPENCLAW`, `KYRA_OPENCLAW_SKILLS`.
- **AI:** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`.
- **Pinecone:** `PINECONE_API_KEY`, `PINECONE_INDEX` (`kyra-memories`).
- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_{STARTER,PRO,SCALE}_PRICE_ID`, `STRIPE_PER_CLIENT_PRICE_ID`.
- **Slack:** `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`.
- **Google:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- **Brave:** `BRAVE_API_KEY`.
- **Cron:** `CRON_API_KEY` (but `lib/auth/cron.ts` uses `CRON_SECRET` — **drift**).
- **Firecrawl:** `FIRECRAWL_API_KEY`.

**Observed but not documented** (referenced by scripts/infra):
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_NOTIFY_CHAT_ID`
- `SUPABASE_DB_PASSWORD` / `DATABASE_URL`
- `OPENROUTER_API_KEY`
- `KYRA_MAX_TIER`, `KYRA_DAILY_CAP`, `KYRA_MONTHLY_BUDGET`
- `PROVISIONER_SECRET`
- `EMAIL_ADDRESS`
- `CRON_SECRET`

### ESLint / TS config

**`tsconfig.json`** — `strict: true`, `target: ES2017`, `module: esnext`, `moduleResolution: bundler`, `jsx: preserve`, `allowJs: true`, `skipLibCheck: true`, `isolatedModules: true`. Path alias `@/*` → `./*`. **Exclude:** `node_modules`, `kyra`, `openclaw`, `kyra-worker`, `site-templates` — implies sibling directories.

**`.eslintrc.json`** — `next/core-web-vitals` + `next/typescript`. Downgraded to warn (unblocks CI debt): `no-explicit-any`, `no-unused-vars`, `no-unescaped-entities`, `prefer-const`. Error-level: `no-html-link-for-pages`, `react-hooks/rules-of-hooks`. `--max-warnings 9999` in CI → only errors block. `.eslintignore`: `next-env.d.ts`, `.next/`, `node_modules/`.

**`vitest.config.ts`** — `@` alias, `globals: true`. No coverage/timeout/setup.

**`tailwind.config.ts`** — `darkMode: ['class']`, CSS-variable tokens, typography plugin. Content: `pages/`, `components/`, `app/`.

**`postcss.config.mjs`** — `{ tailwindcss: {} }` only.

### Ops / deploy story

1. Developer commits on `main` or opens PR.
2. CI runs typecheck + lint + tests. **Does not deploy.**
3. Developer runs `npm run deploy:prod` → `scripts/deploy.sh`:
   - 2-deploy/day gate (blocks #3 unless `FORCE=1`).
   - Uncommitted-changes warning.
   - `npx vercel --prod --yes`.
   - Auto-deletes prior deployments.
4. Vercel hosts app + 15 crons.
5. Out-of-band: OVH VPS (SSH + bash, no CI), Fly.io `kyra-gateway` (fly deploy), Cloudflare Workers (sibling dir).
6. Production only — no staging, no previews.
7. `qa-check.sh` as nightly QA (manual or external cron). Telegram alerts.

### Concerns

1. **Conflicting deployment setups** — Cloudflare scripts dormant.
2. **Leaked secret** — `scripts/backfill-templates.js:15` production service-role JWT.
3. **Stale `Plan` type union** — `types/index.ts`.
4. **Extremely thin test coverage** — 3 files.
5. **Dangerous scripts** — no dry-run: `reembed-memories.js`, `infra/restart-all.sh`, `fix-marketing-data.mjs`.
6. **Misnamed CI** — `deploy.yml` doesn't deploy.
7. **No middleware rate limiting** — `/api/*` bypassed.
8. **Fly.io vs OVH duplication** — plus Mac-mini tunnel + Cloudflare = 4 deployments.
9. **CSP `unsafe-eval`** — remains an XSS risk.
10. **CRON secret naming drift** — `CRON_API_KEY` vs `CRON_SECRET`.
11. **tsconfig excludes non-existent siblings** — vestigial or actually present.
12. **No environment isolation** — production-only.
13. **Manual deploy gating advisory** — `/tmp` counter, `FORCE=1` bypass.

---

## Batch 7 — Gap Coverage

### Vet-SEO Worker Template (`templates/vet-seo-worker/`)

A reusable blueprint for an autonomous SEO worker inside an OpenClaw container. Generalized since into the universal SEO Command Center (`AUDIT-RESULTS.md`).

**Structure:**
- **`SOUL.md`** — persona/system prompt with `{{CLINIC_NAME}}`, `{{ADDRESS}}`, etc.
- **`config/`** — 5 JSON files:
  - `cron-schedule.json` — 11 cron jobs (GEO Mon 09:00, content Tue/Thu 09:00, NAP Wed 10:00, GBP posts Tue/Thu 10:00, UGC scan daily 08:00 + 18:00, weekly report Fri 15:00, monthly backlink scan 1st 08:00).
  - `geo-queries.json` — 25 query templates + 3 competitor + providers (chatgpt/perplexity, gemini disabled).
  - `subreddits.json` — 13 global subreddits + 25+ city-to-metro map + 21 keywords.
  - `vet-directories.json` — 20 directories with priority (critical/high/medium/low).
  - `web20-platforms.json` — 4 web 2.0 (WordPress/Blogger/Telegraph/Notion) + 5 semantic stack (Google Docs/Sites/GitHub Pages/Notion/Telegraph).
- **`prompts/`** — 5 authoring prompts (press-release 450-550w AP style, web20-article 650-800w Maps iframe + 2-3 website links, stack-content 600-1,000w VeterinaryCare JSON-LD, outreach-pitch 100-150w forbids generic openers, ugc-reply 50-100w bans phone/URL).
- **`skills/`** — 10 skills. Two have runnable TS:

**`skills/nap-auditor/run.ts`** (~390 lines) — Real scraper. Imports `config/vet-directories.json`, walks 20 directories, POSTs to Firecrawl `/v1/scrape`, extracts NAP with regex + normalization (street abbreviations, phone-to-last-10, name stripping `LLC|Inc|DBA|Corp|Ltd|PLLC`). **Hand-rolled Levenshtein** + vet-equivalence rules ("vet"↔"veterinary", "clinic"↔"hospital", "animal"↔"pet"). Address: street# + street name + ZIP. Returns `NAPAuditReport` with per-directory status (`match/mismatch/not_found/error/blocked`). 500ms rate-limiting. `429` → `rate_limited`, `403` → `blocked`.

**`skills/geo-tester/run.ts`** (~345 lines) — AI citation probe. `queryChatGPT()` → `api.openai.com/v1/chat/completions` (gpt-4o-mini, temp 0.7, 1000 tokens). `queryPerplexity()` → `api.perplexity.ai/chat/completions` (`sonar`). **Batched 5-at-a-time with `Promise.allSettled` + 300ms pauses.** `analyzeCitation()` checks text for clinic name (case-insensitive), phone-digits-only, website-without-protocol. Infers rank by counting numbered-list prefixes. Extracts 80-char-left / 120-char-right context. `overallScore = round(citedCount / totalCount × 100)`. Trend vs `previousScore` (up >+5, down <−5, stable). `generateRecommendations()` groups by theme (emergency/service/general) and provider skew.

Other 8 skills are **SKILL.md only** — runtime lives in main-app `lib/seo/worker-dispatcher.ts` + `lib/seo/publish-scheduler.ts`.

**Skill roster:** geo-tester, nap-auditor, seo-content-writer, web20-publisher, semantic-stacker, outreach-scout, backlink-monitor, gbp-posts, ugc-monitor, seo-reporter.

**Workflow:** intake at provision → Monday GEO test → Tue/Thu content + GBP → daily UGC scan 2× → Friday report → monthly backlinks.

### Site-Templates Generic (`site-templates/generic/`)

Standalone **Next.js 16.1** app with React 19, Tailwind v4, `lucide-react`. `next.config.ts: output: "export"` — static bundle.

**Content injection — 2 orthogonal layers:**
1. **Structural (`lib/constants.ts`):** `BUSINESS` (name/phone/email/address/license/rating/coordinates/hours/tagline), `SERVICES` (name/slug/description), `SERVICE_AREAS` (name/slug/state). Marked "TEMPLATE FILE - Will be overwritten by the Kyra build service." Industry-agnostic (`INDUSTRY_LABELS` covers 15: hvac/plumbing/dental/legal/restaurant/real-estate/auto/med-spa/fitness/veterinary/cannabis/consulting/electrical/roofing/landscaping).
2. **Long-form (`content/pages.json`):** 19k JSON blob keyed by slug. Each entry has `type`, `metaTitle`, `metaDescription`, `heroH1`, `heroSubtitle`, `sections[]` (`heading`, `body`, `bullets[]`), `faq[]`, `testimonials[]`, `schema`. `app/page.tsx::parseSubSections()` splits `**bold-wrapped**` lines into cards. `cleanText()` strips `**`, `*`, leading `#`, leading `:`.

**`lib/seo.ts`** — JSON-LD for LocalBusiness (conditional `geo`/`aggregateRating`/`hasOfferCatalog`/`areaServed`), breadcrumbs, FAQPage, Service.

**Routes:**
- `app/page.tsx` — homepage (hero, stats, services grid, Services Overview, Why Choose Us card grid with 8 lucide icons, testimonials, service-areas, CTA, FAQ schema).
- `app/layout.tsx` — root layout, metadata, CSS custom props from `lib/theme.ts`, LocalBusiness schema, optional `<meta name="kyra-client-id">`, loads Kyra widget script from `https://kyra.conversionsystem.com/api/widget/WIDGET_CLIENT_ID/script?v=2`. **`WIDGET_CLIENT_ID` is a literal placeholder — silently fails if build-service substitution doesn't run.**
- `app/[city]/page.tsx` — city page, `generateStaticParams()` over `SERVICE_AREAS`, `dynamicParams = false`.
- `app/[city]/[service]/page.tsx` — City × Service matrix (5 × 6 = 30 pages + variations).
- `app/services/[slug]/page.tsx`, `app/about/`, `app/contact/` (+ `contact-form.tsx` client), `app/faq/`, `app/reviews/`.
- `app/sitemap.ts` — `/`, `/about`, `/contact`, `/faq`, `/reviews`, all services/cities, all city×service combos. `force-static`.
- `app/robots.ts`.

**Contact form** — POSTs to `https://kyra.conversionsystem.com/api/widget/${clientId}/lead` where `clientId` from `<meta name="kyra-client-id">`. On fail: `.catch(() => {})` + shows success. **Leads silently drop if meta tag missing.**

**Relation to main app:** `lib/sites/` is the generator/pipeline. Composes `pages.json`, writes `lib/constants.ts` + `lib/theme.ts` per-client, calls `lib/seo/city-data.ts` + `internal-linker.ts` + `content-engine.ts` for differentiation, injects schema, runs `next build`.

### Top-Level Skill (`skills/`)

**`ghl-crm`** — Anthropic-style agent Skill (YAML frontmatter `name: ghl-crm` + `description`). Used by Claude itself (not OpenClaw), driving GHL from natural language.

- `SKILL.md` (5.4 KB) — tells Claude when/how to invoke. Binds `GHL_API_TOKEN`, `GHL_LOCATION_ID`. Commands: `bash scripts/ghl.sh <resource> <action>`. Groups: contacts, conversations/messages, opportunities, pipelines, calendars, location. Four workflows: Lead Intake, Follow-up, Pipeline Management, Appointment Booking.
- `references/api-reference.md` (8.6 KB) — Full GHL v2 reference. Base `services.leadconnectorhq.com`, Version `2021-07-28`, ~100 req/min, auth (PIT vs OAuth2), scopes matrix, every endpoint with payloads, complete webhook event catalog (19 events).
- `scripts/ghl.sh` (13.8 KB, executable) — bash + Python helper. `set -euo pipefail`, curl + `python3 -m json.tool`, one-shot 429 retry with 2s backoff, URL-encoding via Python, JSON `locationId` injection. Sub-commands: contacts, conversations, messages, opportunities, pipelines, calendars, location, workflows.

Aligned with Layer 3 (Deep GHL Integration) of `KYRA-STRATEGIC-ROADMAP.md`.

### `docs/` Inventory (34 files)

**Operationally critical (read first):**

1. **CLAUDE-PROJECT-INSTRUCTIONS.md** — Claude Project config for bulk content.
2. **CONTAINER-SYNC-API.md** — Provisioner API ref. `OVH_PROVISIONER_URL` `15.204.91.157:9090`.
3. **CONTENT-VOICE.md** + **CONTENT-VOICE-RESEARCH-2026.md** — Blog/social source of truth. Refresh quarterly.
4. **RETELL-AI-INTEGRATION-PLAN.md** (2026-04-06) — Replace Twilio-based voice with Retell AI as primary.
5. **vet-seo-worker-build-spec.md** — 18KB original spec.
6. **WEBSITE-BUILDER-ANALYSIS.md** + **V2** (2026-03-14) — Audit of `lib/sites/`. V2 flags critical: **Unsplash Source API dead**, breaking images.
7. **TEMPLATE-EXPANSION-ANALYSIS.md** (2026-03-20).
8. **dashboard-audit-2026-03-11.md** — "64 dashboard pages, 212 API routes, 2 sidebar variants." Dead pages, duplicates.
9. **MOLTCLAW-COMPETITIVE-ANALYSIS.md** (2026-03-20).
10. **blackleaf-kyra-sms-overview.md** + **springbig-kyra-sms-overview.md** (2026-03) — Purple Lotus Delivery SMS.
11. **provisioner-rules.md** — "never set `OPENAI_BASE_URL` for BYOK accounts."
12. **ghl-workflow-setup.md** — GHL → Kyra email notifications.
13. **stripe-setup-checklist.md** — New price IDs needed.
14. **meetkyra-domain-migration.md** (2026-03-19) — Migration plan off `kyra.conversionsystem.com`.

**Marketing/campaign (lower priority):** brand-strategy-v2, social-media-strategy, agency-outreach-playbook, outbound-sequence, outreach-messages-ready-to-send, facebook-posts-series, viral-content-package, product-hunt-listing, india-facebook-campaign, launch-event-pitch-email, march-16-demo-script, demo-video-script, ghl-marketplace-submission-guide, Kyra-Facebook-Posts-Series.docx, lead-tracker-template.csv, leads-top-50.csv, scrape-ghl-directory.sh.

### Root-Level Operational Docs

**`AUDIT-RESULTS.md`** (2026-04-13):
- Vet-only gate removed.
- `/api/agency/clients/[id]/seo/geo-scores` + `nap-status` created.
- `/api/agency/clients/[id]/seo` GET dual-reads normalized `seo_*` tables with JSONB fallback.
- Dashboard universalized.
- **Open issues:** 9 stale TS errors in `.next/types/`; `content-engine.ts` similarity checker advisory at 65% (should block); `schema-markup.ts` hardcodes `VeterinaryCare`; `seo/run/route.ts` Reddit hardcoded vet subreddits; content prompt still vet-specific.

**`ARCHITECTURE-ANALYSIS.md`** (2026-02-12):
- **Three integration paths built, only Path A active:**
  - Path A: Direct Claude — LIVE.
  - Path B: OpenClaw Gateway — BUILT, OFF.
  - Path C: Kyra Worker → Cloudflare Containers — BUILT, OFF. **Known bug:** `kyra-worker/kyra-api.ts:72` sends to `/api/chat` (doesn't exist) — should use `/v1/chat/completions`.
- Config state: no `KYRA_WORKER_URL` / `KYRA_API_SECRET` in wrangler.toml.

**`SECURITY-AUDIT-2026-03-06.md`:**
- 1 critical fixed (unauth `/api/debug`).
- 3 high: GHL webhooks no verification (FIXED: HMAC or shared secret); zero security headers (FIXED); third item unclear.
- 2 medium: unauth `/api/openclaw/health` (FIXED).
- **Still pending:** Angel to set `GHL_WEBHOOK_SECRET`; **no rate limiting anywhere**; `unsafe-eval` still required; **Supabase RLS not audited**; tighten `frame-ancestors` from SAMEORIGIN to `'none'`.

**`KYRA-STRATEGIC-ROADMAP.md`** (v2.2, 2026-02-16):
- Phase 3 ~85%, Phase 6 queued.
- Vision: OpenClaw into deployable AI workforce for agencies. MacBook (Kyra) vs raw Linux (competitor).
- **7-layer moat:** Intelligence not hosting; multi-tenant agency; Deep GHL; White-label; Stripe Connect; Template marketplace; OpenClaw ecosystem.
- **Architecture in use:** Vercel + Fly.io AI bridge (Frankfurt, Claude Sonnet 4, SSE, auto-stop-on-idle), GHL polling via Vercel Cron every 60s, Supabase + Stripe Connect. Supersedes `TECHNICAL-SPEC.md` Option C.
- **SMS AI reply (LIVE Feb 16):** GHL → Vercel Cron → Fly bridge → Claude → GHL.

**`SEO-COMMAND-CENTER-SPEC.md`:**
- 6-phase build. Phase 1 (DB + GSC sync) DONE; 2-6 queued.
- Confirms migration `20260413001_seo_command_center.sql` with 10 tables.
- Do-not-recreate list of 20+ existing `lib/seo/*` modules.

**`TECHNICAL-SPEC.md`** (v1.0, 2026-02-06):
- Earliest arch doc. Option C (Session-Based Isolation). Superseded by Fly.io bridge.
- Constraints: MVP 4 weeks, infra <$500/mo at 50 users.

**`tasks/todo.md`:**
- Active: Unified SEO/GEO Command Center. 2-tab bar (SEO | GEO).
- 5-step checklist **untouched**.

**`HEARTBEAT.md`** (2026-02-23):
- Nightly "build until 8am" directive. 18+ PRs shipped.
- Shipped: pricing, privacy/ToS, lead capture, CEO Action Board, SEO blog + sitemap, /try/[industry], i18n (15 langs), /vs, /changelog, /get-demo.
- **Still needs Angel:** `RESEND_API_KEY`, 2 Supabase migrations, `SIGNUP_WEBHOOK_URL`, GHL Marketplace submission, 60-second demo video.
- 9 containers expected running.

**`CHANGELOG.md`:**
- Latest `0.3.0` (2026-02-09, Phase 2B): OpenClaw Gateway feature-flagged. `/api/chat/openclaw/route.ts`, `lib/openclaw/sessions.ts`. Automatic fallback.

### Gap Summary

After Batch 7, remaining directories confirmed covered in earlier batches:
- `app/` — Batch 4 covers pages, Batch 3 covers API.
- `lib/` — Batch 2 covers all 56 domains.
- `kyra-ghl-skill/` — **empty directory.**
- `infra/`, `infrastructure/openclaw/` — Batch 6.
- `marketplace/`, `marketing/social/`, `content-drafts/` — pure marketing copy.
- Root docs not in Batch 7: `BRANDING.md`, `CLOUDFLARE-MIGRATION.md`, `CONTAINER-ARCHITECTURE.md`, `E2E-TEST-RESULTS.md`, `E2E-VERIFICATION.md`, `KYRA-AGENCY-PLATFORM-PLAN.md`, `KYRA-ROADMAP-2026-02-12.md`, `OVH-ARCHITECTURE-SPEC.md`, `PIPELINE-REDESIGN-SPEC.md`, `PRODUCT.md`, `SECURITY-ARCHITECTURE-ANALYSIS.md`, `SUMMARY.md`, `TECH-STACK.md`, `WORKER-DEPLOY-GUIDE.md` — operational but not load-bearing vs. the ones already summarized.

**Site-templates gap:** only `generic` present — no industry-specific templates yet. The widget script src contains a literal `WIDGET_CLIENT_ID` that must be substituted by the build service; otherwise widget fails silently.

---

_End of analysis. Batch files (`kyra-analysis-batch{1..7}.md`) retained as raw source._
