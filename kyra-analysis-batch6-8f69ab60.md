## Middleware

`middleware.ts` is the Next.js edge middleware entrypoint. It is intentionally thin — 13 lines total. On every request it logs `[middleware] <METHOD> <path>`, then skips auth entirely for `/api/*` routes (webhooks, billing, cron, chat, etc.), returning `NextResponse.next()`. For everything else it delegates to `updateSession` in `/Users/steve/projects/kyra/lib/supabase/middleware.ts`.

The matcher regex `/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)` matches essentially all page routes except static assets and image files.

`updateSession` is where the real work happens:
- Instantiates a Supabase SSR server client bound to the request's cookies (using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- Calls `supabase.auth.getUser()` to refresh the session.
- If the path starts with `/agency` or `/admin` and there is no user, it redirects to `/login?redirect=<original>`.
- If the path is `/login` and there *is* a user, it redirects to `/agency` (prevents authenticated users from seeing the login page).

There is **no rate limiting** at this layer — no in-memory counter, no KV/Durable-Object calls. Rate limiting would need to happen downstream in route handlers or at a CDN/WAF layer.

## Next.js config

`next.config.mjs` is 58 lines:

- `serverExternalPackages: ['ws']` — externalizes the `ws` package. A comment notes this "may not fully work on Cloudflare Workers but OpenNext has better Node.js compat than next-on-pages", which is a tell that the project is aware of Workers runtime limitations.
- `experimental: {}` — an empty block with a misleading "Prevent build errors from dynamic routes" comment; no experimental flags are set.
- `headers()` — exhaustive security headers applied to every route via `source: '/(.*)`:
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
  - A detailed CSP that permits Stripe, Supabase, OpenAI, Anthropic, Retell AI, LiveKit, the kyra.conversionsystem.com subdomains, and `cdn.jsdelivr.net`. `frame-ancestors 'none'`, `object-src 'none'`, no inline eval allowed *except* `'unsafe-inline' 'unsafe-eval'` in `script-src` (with a comment flagging this is required for Next.js and should be tightened later). `Permissions-Policy` notably blocks `payment=()` which is curious given Stripe Checkout is used, but Checkout is hosted on stripe.com (a redirect), so the payment API isn't actually needed in-app.

No image domains, no rewrites, no redirects, no env pass-through. Relatively standard for a Next.js 15 app.

## Deployment config — vercel.json vs. Cloudflare

`vercel.json` paints one picture, the scripts paint another.

`vercel.json` declares:
- `git.deploymentEnabled: false` — Vercel will not auto-deploy from git pushes.
- `ignoreCommand: "exit 1"` — if a build ever *does* trigger, always skip. A safety belt.
- `functions` with `maxDuration` set for nine specific API routes: site build/generate/deploy/growth/pages (300s each), dispatch optimize/drivers/webhooks (30-60s), and Onfleet webhook (30s).
- `crons` — 15 scheduled endpoints (see table below).

| Cron path | Schedule | Purpose |
|---|---|---|
| `/api/cron/scheduled-tasks` | `*/30 * * * *` | Generic every-30-min task runner |
| `/api/cron/weekly-report` | `0 8 * * 1` | Mondays 8am — weekly agency reports |
| `/api/cron/email-sequence` | `0 8 * * *` | Daily 8am — nurture sequence |
| `/api/cron/follow-ups` | `0 * * * *` | Hourly — CRM follow-ups |
| `/api/cron/crm-autopilot` | `0 7 * * *` | Daily 7am — CRM automation |
| `/api/cron/briefing` | `0 8 * * *` | Daily 8am — morning briefing |
| `/api/cron/seo-worker` | `0 6 * * 1-5` | Weekdays 6am — SEO tasks |
| `/api/cron/alerts` | `*/30 * * * *` | Every 30 min — alert checks |
| `/api/cron/terminal-credits` | `*/30 * * * *` | Every 30 min — terminal credits |
| `/api/cron/gateway-token-sync` | `0 4 * * *` | Daily 4am — sync gateway tokens |
| `/api/cron/usage-alerts` | `0 8 * * *` | Daily 8am — usage alerts |
| `/api/cron/worker-tasks` | `*/30 * * * *` | Every 30 min — worker-backed tasks |
| `/api/cron/idle-containers` | `0 4 * * *` | Daily 4am — shut idle containers |
| `/api/cron/container-health` | `*/5 * * * *` | Every 5 min — container healthcheck |
| `/api/cron/dispatch-optimize` | `*/15 * * * *` | Every 15 min — dispatch route optimization |

Meanwhile, `package.json` has an `@opennextjs/cloudflare` toolchain: `cf:build`, `preview`, `deploy` all call `npx opennextjs-cloudflare` — suggesting deploys go to Cloudflare Workers. `wrangler` is in devDependencies. But `scripts/deploy.sh` (the actual `deploy:prod` target) runs `npx vercel --prod --yes`, and the CI workflow comment explicitly says "Deployments are done via CLI (npx vercel --prod --yes)".

**Reconciliation:** The production target is Vercel. The Cloudflare scripts look like either a dormant migration path or local-preview tooling — not actively used. Evidence: `deploy:prod` is the one run by humans, it targets Vercel, `vercel.json` has real cron + function config, and `qa-check.sh` monitors Vercel-specific things (deploy counter, `vercel ls`). The `cf:build / preview / deploy` scripts are there but nothing in CI or the repo calls them. This is a configuration ambiguity — somebody experimented with Cloudflare migration, left the tooling, and the project stayed on Vercel.

## CI/CD

`.github/workflows/deploy.yml` is a misnamed file — it runs *only CI checks*, not deploys. Triggers: `push` to main, `pull_request` to main, and manual `workflow_dispatch`. On Node 22 it runs:
1. `npm ci`
2. `npx tsc --noEmit` (typecheck)
3. `npx eslint . --ext .ts,.tsx --max-warnings 9999` (lint allows essentially unlimited warnings — only errors block)
4. `npm test` (runs `vitest run`)

An explicit comment calls out why it doesn't deploy: a previous version did, and it cost ~$150/mo in duplicate Vercel build minutes. Deploys now happen manually via CLI from a developer's machine using `bash scripts/deploy.sh`.

## Scripts

- **`deploy.sh`** (165 lines) — Production Vercel deploy gate. Enforces a **hard limit of 2 deploys per calendar day** via a per-day counter file at `/tmp/.kyra_deploy_<YYYYMMDD>`. Warns before deploy #2, blocks deploy #3 unless `FORCE=1`. Warns on uncommitted changes. On success: runs `npx vercel --prod --yes`, prints elapsed time and estimated cost (~$0.108/min), then auto-cleans all *non-current* deployments via `npx vercel rm`. Color-coded terminal output. Targets project `kyra`, team `conversionsystem`. This is unusually strict cost control — aimed at keeping Vercel spend near $24/mo.

- **`qa-check.sh`** (425 lines) — Nightly health agent. Loads `.env.local`, runs seven checks, sends Telegram alerts on failures:
  1. Stripe webhook endpoint — confirms `/api/webhooks/stripe` is the active enabled endpoint (not old `/api/billing/webhook` or `/api/stripe/webhooks`).
  2. Plan vs credits consistency — paid agencies (`starter`/`pro`/`scale`) must have ≥500 credits.
  3. Container health — SSHes to `ubuntu@15.204.91.157` and checks `docker ps` for exited/restarting/OOM containers.
  4. Provisioner image pin — verifies `kyra-gateway:v2026.3.23-full` matches digest of `kyra-gateway:latest` on VPS.
  5. Recent signups with wrong plan — paid Stripe customer with `plan='free'` in last 7 days (indicates webhook didn't fire).
  6. Vercel deploy count — reads `/tmp/.kyra_deploy_<date>`, warns if > 2 (FORCE abuse).
  7. Dead webhook handlers — verifies old Stripe webhook endpoints are disabled.
  Failure alerts go to Telegram using `TELEGRAM_BOT_TOKEN` + `TELEGRAM_NOTIFY_CHAT_ID` env vars. Supports `DRY_RUN=1`.

- **`seed-templates.ts`** (618 lines) — Seeds industry-specific agent templates into Supabase's `agency_templates` table. Each template has `soul_template`, `system_prompt_prefix`, skills list, suggested skills, sample Q&A, GHL config, cron config. First template is "LeadPilot" (general lead qualification). Uses `SUPABASE_SERVICE_ROLE_KEY`. `is_public: true`, `agency_id: null` — these become the public template library.

- **`backfill-templates.js`** (177 lines) — One-off migration script. Reads `quick_answers` JSON from `agency_clients.settings` and `agencies.settings` (for solo agencies), converts them into a map of trigger-phrase → canned-response templates, then POSTs to the provisioner at `POST /containers/{clientId}/templates`. After pushing, hits `POST /router/reload` to flush the kyra-router template cache. **Concern:** the `SUPABASE_KEY` default value (line 15) is a **hardcoded service-role JWT for the production project `yaijdtsunxicuphrakcc`** — a significant secret leak in a checked-in file. Supports `--dry-run`.

- **`test-templates.ts`** (153 lines) — Static validation harness for `INDUSTRY_TEMPLATES`. Verifies unique IDs and names, checks SOUL template substance (>100 chars, references `ai_name`/`business_name`), variable sanity (≥3 vars, ≥2 required, all used, all declared), tools whitelist (`book_appointment`, `tag_contact`, `create_opportunity`, `escalate_to_human`, `send_email`, `send_sms`, `search_knowledge`), FAQ quality, automations presence. Applies placeholder values and verifies no unresolved `{{...}}` remain. Returns non-zero on failure. Not run in CI — meant to be invoked with `npx tsx scripts/test-templates.ts`.

- **`fix-marketing-data.mjs`** (426 lines) — Another one-off data fixer. Three issues in one script: (1) updates 13 system email templates with real HTML bodies for hardcoded `AGENCY_ID` (`1511e077-…`) and `CLIENT_ID` (`f91b28a1-…`); (2) backfills agency owners into `crm_contacts` by pulling all users from Supabase auth admin API and joining against `agencies.owner_id`; (3) recreates the "Kyra Onboarding" 7-step email sequence using `getNurtureEmail` from `lib/email/nurture-sequence.ts`. Reads `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`.

- **`reembed-memories.js`** (58 lines) — Migration utility to re-embed every row in the `memories` table using `text-embedding-3-small` (replacing the old `ada-002` embeddings). Upserts to Pinecone with metadata (`user_id`, `content`, `type`, `created_at`). No dry-run mode, no batching — if run accidentally it re-embeds everything.

- **`run-migration.mjs`** (72 lines) — Direct Postgres migration runner. Connects to Supabase via `pg` library and the transaction-mode pooler (`aws-0-eu-central-1.pooler.supabase.com:6543`). Takes SQL filenames as argv, executes each, verifies specific tables (`agencies`, `agency_members`, `agency_templates`, `agency_clients`, `agency_billing`, `ghl_webhook_logs`) exist and counts rows in `agency_templates`. The project ref `yaijdtsunxicuphrakcc` is hardcoded. Requires `SUPABASE_DB_PASSWORD` or a full `DATABASE_URL`. Uses `rejectUnauthorized: false` on SSL — fine for Supabase.

## Infra

Three distinct deployment targets live under `infra/` and `infrastructure/`:

- **`infra/nginx/kyra-css-proxy.conf`** — Custom nginx reverse-proxy running on the VPS (`15.204.91.157`). Listens on port 19000. Routes `<uuid>.<host>` to `http://kyra-cl-<uuid>:18789` (each agency client has its own Docker container). Key behaviors: (a) strips `Accept-Encoding` and injects a `<style>` block that hides callouts/error banners/update notifications in the OpenClaw UI via `sub_filter` (so agencies see a white-labeled UI); (b) serves a custom favicon.svg inline (mitigation for the 502 → cached-question-mark bug during container startup); (c) **the critical WebSocket fix** — `proxy_set_header Sec-WebSocket-Extensions ""` removes permessage-deflate negotiation because nginx can't relay compressed frames transparently (documented in `infra/README.md`, Feb 22 2026).

- **`infra/provisioner/server.js`** (1114 lines) — Node/Express service on the VPS that manages Docker containers for each agency client. Runs on port 9090 with bearer-token auth (`PROVISIONER_SECRET=kyra-provisioner-2026` — also hardcoded as default). Responsibilities: spin up a `kyra-gateway:latest` container per client, generate `openclaw.json` config pointing at `<clientId>.gw.kyra.conversionsystem.com`, manage the shared `kyra-router` Python container (port 8104) that does tiered model routing with daily/monthly spend caps (`KYRA_MAX_TIER=2`, `KYRA_DAILY_CAP=$50`, `KYRA_MONTHLY_BUDGET=$500`), write Traefik dynamic config to `/opt/kyra/traefik/dynamic`, and persist per-client metadata/auth tokens to `/opt/kyra/data/clients/<id>/meta.json`. Uses `dockerode`, `helmet`, `cors`.

- **`infra/scripts/deploy-kyra-router.sh`** — One-shot bash to build and start the `kyra-router` container (shared sidecar for model routing). After first run, the provisioner auto-manages it.

- **`infra/restart-all.sh`** — Safe restart script for all `kyra.managed=true` containers. Critically, reads auth tokens and agency IDs from `meta.json` rather than `docker inspect` (tokens can be corrupted there). Creates each container with: memory 1GB, CPU 256 shares, `cap-drop NET_RAW/SYS_ADMIN/MKNOD`, per-client or master OpenAI key, bind-mount of `/opt/kyra/data/clients/<id>/openclaw` into the container.

- **`infrastructure/openclaw/`** — A *different* OpenClaw deployment targeted at **Fly.io**, not the VPS. `fly.toml` declares `app = 'kyra-gateway'`, region `fra` (Frankfurt), 2GB RAM, shared CPU, persistent volume `openclaw_data` mounted at `/root/.openclaw`. `Dockerfile` builds Debian bookworm with Node 22.13.1, installs `openclaw@latest` from npm, Chromium for browser automation, `himalaya` (email CLI with wrapper for auto-sourcing secrets), `gh` (with wrapper), and a custom `send-email` helper. `start.sh` is a 432-line startup script with a watchdog: if the gateway doesn't bind port 18789 within 120s, kills and restarts it (up to 3 times), plus a 60s liveness loop. `kyra-bridge.js` (1235 lines) is an HTTP API (`POST /chat`) that translates inbound requests to OpenClaw's WebSocket RPC. `workspace/` contains `SOUL.md`, `AGENTS.md`, `USER.md`, `MEMORY.md`, `TOOLS.md`, `HEARTBEAT.md` — the default character/identity files. This is the legacy single-tenant deployment that predates the multi-tenant VPS setup.

So Kyra's backend surface is:
- **Vercel** — the Next.js app (UI, routes, cron).
- **VPS (OVH, 15.204.91.157)** — provisioner + nginx + Traefik + per-client OpenClaw Docker containers + shared kyra-router.
- **Fly.io (kyra-gateway)** — legacy/fallback single-tenant OpenClaw gateway in Frankfurt.
- **Cloudflare Workers (kyra-worker)** — multi-tenant sandboxes referenced via `KYRA_WORKER_URL` in `.env.local.example`/`.env.example`.

## Tests

Only three test files exist in `__tests__/`:

- **`billing.test.ts`** (247 lines, 40+ assertions) — Covers `CREDIT_COSTS` table, `getCreditCost` for known action types (`chat.message`, `chat.web_search`, `chat.deep_research`, `pipeline.find_leads`), free action costs, model→credits mapping (`getCreditsForModel`, `normalizeModelId`, OpenRouter slug resolution), plan enforcement (monthlyCredits/maxClients for `free`, `solo_pro`, `starter`, `pro`, `scale`), Stripe webhook idempotency-key format, and `resolveModel` from `lib/chat/core`. Mocks Supabase via manual `vi.mock`.

- **`cron-auth.test.ts`** (147 lines) — Tests `checkCronAuth` and `requireCron` from `lib/auth/cron`. Verifies fail-closed behavior: rejects with 500 when `CRON_SECRET` is unset or empty, accepts valid Bearer token or `?secret=` query param, rejects mismatched tokens with 401, rejects `Bearer undefined` (guarding against a past template-string bug), supports extra secret env vars for multi-secret rotation.

- **`ghl-id-validate.test.ts`** (129 lines) — Tests `isValidGhlId` and `validateGhlIds`. Accepts 10-64 char base62 IDs, rejects path traversal (`../admin/secrets`), URL injection (`?`, `#`, `&`, `;`), scheme injection (`http://`, `javascript:`), whitespace, URL-encoded chars, hyphens/underscores/dots, non-string inputs, and empty strings. `validateGhlIds` returns `null` on valid/absent, error `ToolResult` on invalid, catches first invalid field.

**Coverage gaps** (significant):
- No tests for any API route (`app/api/**`) — no chat, no webhook signature validation, no auth.
- No tests for the cron endpoints themselves, only the auth helper.
- No tests for the provisioner, kyra-bridge, kyra-worker integrations.
- No tests for Supabase middleware / `updateSession`.
- No tests for the template engine, GHL skills beyond ID validation, memory/Pinecone, email rendering.
- No tests for Stripe webhook body handling — just event type list and idempotency key shape.
- No tests for any React component.
- No integration or E2E tests.

Three test files is extremely thin for a codebase with this many cron endpoints, API routes, and data-migration scripts.

## Type definitions

`types/` contains five files totaling ~350 lines:

- **`index.ts`** (121 lines) — Core domain types matching the Supabase schema. Defines `Plan` (as a **stale** enum: `'free' | 'starter' | 'business' | 'max'` — doesn't match the actual plans used elsewhere, which are `free | solo_pro | starter | pro | scale`), `Channel`, `MessageRole`, `MemoryType`. Interfaces: `User`, `UserSettings`, `Conversation`, `Message`, `MessageMetadata`, `Memory`, `MemoryMetadata`, `UserFile`. Request/response types: `ChatRequest`, `ChatResponse`, `ConversationWithMessages`. Component prop types: `ChatInputProps`, `MessageBubbleProps`, `ConversationSidebarProps`. The stale `Plan` union is a real concern — it diverges from `lib/billing/plans.ts`.

- **`channels.ts`** (57 lines) — Multi-channel adapter types. `ChannelType = 'web' | 'whatsapp' | 'telegram' | 'discord' | 'voice' | 'email' | 'slack'`. Interfaces: `ChannelMessage`, `ChannelAttachment`, `ChannelResponse`, `ChannelButton`, `ChannelConfig`, `UserChannelLink`. Supports voice responses via audio URL and duration.

- **`memory-graph.ts`** (47 lines) — Knowledge graph types. `EntityType` (`person/company/project/goal/place/topic/event`), `RelationType` (`knows/works_at/works_on/wants/located_in/related_to/deadline/depends_on/part_of`). Interfaces: `Entity`, `Relationship`, `MemoryGraphQuery`, `GraphContext`. Each entity/relationship carries `confidence` (0-1) and `source_memory_ids`.

- **`notifications.ts`** (40 lines) — Proactive notification types. `NotificationType = 'insight' | 'reminder_followup' | 'calendar_prep' | 'weekly_summary' | 'nudge' | 'morning_brief' | 'pattern_alert'`, `NotificationPriority` four levels. Interfaces: `Notification`, `ProactiveInsight`.

- **`pipelines.ts`** (56 lines) — Task pipeline types for multi-step async work. `PipelineStatus`, `StepStatus`, step types (`ai_task/web_search/file_create/email/approval/custom`). Each step has `credit_cost`, optional `requires_approval`. `Pipeline` tracks `current_step`, `total_credits`, `credits_used`. `PipelinePlan` for initial plan estimates.

These type files describe aspirational features (pipelines, memory graph, multi-channel) that are only partially implemented — there's no `pipelines` table/endpoint matching this shape in the core app, so these are either idealized contracts or remnants from a pre-agency-pivot design.

## Env vars

From `.env.example` (85 lines) and `.env.local.example` (the second just adds `FIRECRAWL_API_KEY`):

**App**
- `NEXT_PUBLIC_APP_URL` — Base public URL (prod: `https://kyra.conversionsystem.com`).
- `NEXT_PUBLIC_APP_NAME` — Display name "Kyra".

**Supabase**
- `NEXT_PUBLIC_SUPABASE_URL` — Project URL (client + server).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anonymous JWT for client-side RLS.
- `SUPABASE_SERVICE_ROLE_KEY` — Server-only admin JWT.

**Kyra Worker (Cloudflare)**
- `KYRA_WORKER_URL` — Cloudflare Workers URL for the multi-tenant sandbox.
- `KYRA_API_SECRET` — Shared-secret for authenticating Next.js → Worker calls.

**OpenClaw Gateway (Legacy)**
- `OPENCLAW_GATEWAY_URL` — HTTP base for OpenClaw (local: `localhost:18789`, prod: Mac mini tunnel).
- `OPENCLAW_API_KEY` — Bearer token for gateway.

**Feature flags**
- `KYRA_USE_WORKER` — Route chat via Cloudflare Worker (recommended, takes priority).
- `KYRA_USE_OPENCLAW` — Legacy OpenClaw gateway routing.
- `KYRA_OPENCLAW_SKILLS` — Enable OpenClaw skill ecosystem (web search, sub-agents, file ops).

**AI providers**
- `ANTHROPIC_API_KEY` — Claude API key.
- `OPENAI_API_KEY` — OpenAI API key.

**Pinecone**
- `PINECONE_API_KEY` — Vector DB key.
- `PINECONE_INDEX` — Index name (`kyra-memories`).

**Stripe**
- `STRIPE_SECRET_KEY` — Server-side secret (sk_…).
- `STRIPE_WEBHOOK_SECRET` — Webhook signature validation (whsec_…).
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Client-side key (pk_…).
- `STRIPE_STARTER_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_SCALE_PRICE_ID` — Monthly plan prices.
- `STRIPE_PER_CLIENT_PRICE_ID` — Per-client metered price.

**Slack**
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET` — OAuth + webhook signing.

**Google**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth for Calendar integration.

**Brave Search**
- `BRAVE_API_KEY` — Web search API.

**Cron**
- `CRON_API_KEY` — Cron endpoint auth. (Note: `lib/auth/cron.ts` tests reference `CRON_SECRET`, not `CRON_API_KEY` — possible naming drift.)

**Firecrawl** (only in `.env.local.example`)
- `FIRECRAWL_API_KEY` — Firecrawl web intelligence; comment notes Kyra manages one account and agencies never see this key.

**Observed but not documented in .env.example** (referenced by scripts and nginx config):
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_NOTIFY_CHAT_ID` — QA alerts (qa-check.sh).
- `SUPABASE_DB_PASSWORD` / `DATABASE_URL` — direct PG connection (run-migration.mjs).
- `OPENROUTER_API_KEY` — referenced by kyra-router and openclaw.
- `KYRA_MAX_TIER`, `KYRA_DAILY_CAP`, `KYRA_MONTHLY_BUDGET` — router budget controls.
- `PROVISIONER_SECRET` — provisioner bearer token.
- `EMAIL_ADDRESS` — used by the Dockerfile's `send-email` helper.
- `CRON_SECRET` — used by `lib/auth/cron` tests (as opposed to `CRON_API_KEY` documented here).

## ESLint / TS config

**`tsconfig.json`** — `strict: true`, `target: ES2017`, `module: esnext`, `moduleResolution: bundler`, `jsx: preserve`, `allowJs: true`, `skipLibCheck: true`, `isolatedModules: true`. Path alias `@/*` → `./*` (root-relative imports). Includes `next-env.d.ts`, all `.ts`/`.tsx`, and `.next/types/`. **Exclude list is notable:** `node_modules`, `kyra`, `openclaw`, `kyra-worker`, `site-templates` — implies sibling project directories exist that are excluded from typechecking. No `composite`/project references.

**`.eslintrc.json`** — Extends `next/core-web-vitals` and `next/typescript`. Downgraded-to-warn rules (explicitly to unblock CI on pre-existing debt): `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars`, `react/no-unescaped-entities`, `prefer-const`. Stays at error: `@next/next/no-html-link-for-pages`, `react-hooks/rules-of-hooks`. The `--max-warnings 9999` in CI means only errors actually block. Inline `eslint-disable` in `tailwind.config.ts` disables `@typescript-eslint/no-require-imports` for the typography plugin require. `.eslintignore` excludes `next-env.d.ts`, `.next/`, `node_modules/`.

**`vitest.config.ts`** — Matches the TS path alias (`@` → repo root), `globals: true`. Nothing fancy — no coverage config, no test-timeout overrides, no setup files.

**`tailwind.config.ts`** — `darkMode: ['class']`, CSS-variable-driven design tokens (`border`, `input`, `ring`, `background`, `foreground`, plus semantic pairs for `primary/secondary/destructive/muted/accent/popover/card`), custom keyframes/animations (`accordion-down`, `accordion-up`, `spin-slow`), typography plugin. Content scan: `pages/`, `components/`, `app/`. Standard shadcn-style config.

**`postcss.config.mjs`** — Just `{ tailwindcss: {} }`. No Autoprefixer shown (Next.js bundles it separately).

## Ops / deploy story

From git push to prod:
1. Developer commits on `main` (or opens PR).
2. GitHub Actions CI (`.github/workflows/deploy.yml`) runs on Node 22: typecheck, lint, tests. **It does not deploy.**
3. When ready, developer runs `npm run deploy:prod` locally, which invokes `scripts/deploy.sh`:
   - Enforces the 2-deploy-per-day gate (blocks #3 unless `FORCE=1`).
   - Warns on uncommitted changes.
   - Runs `npx vercel --prod --yes`. Vercel builds against `vercel.json`, which tells it to **not** deploy from git and to skip any build it does get (`ignoreCommand: exit 1`). Only manual CLI triggers result in real builds.
   - On success, auto-deletes prior deployments via `npx vercel rm`.
4. Vercel hosts the Next.js app and runs the 15 cron endpoints.
5. Out-of-band infrastructure lives on:
   - **OVH VPS (15.204.91.157)** — provisioner + nginx + per-client Docker containers + shared `kyra-router`. Managed via SSH + bash scripts; no CI. Restarts done with `bash /opt/kyra/restart-all.sh`. Deploys done via `docker build` + `docker run` in the provisioner.
   - **Fly.io (`kyra-gateway`)** — legacy single-tenant OpenClaw. Deployed with `fly deploy` from `infrastructure/openclaw/`. Frankfurt region, 2GB RAM, min-machines-running 1 (always warm), watchdog in start.sh.
   - **Cloudflare Workers (`kyra-worker`)** — new multi-tenant path. Referenced via env var; the actual Worker code is in a sibling directory excluded from tsconfig (`exclude: ['kyra-worker', ...]`).
6. **Environments:**
   - Production only. No "preview" or "staging" environment is declared anywhere. PRs don't build (CI is TS+lint+test only). `vercel.json` sets `git.deploymentEnabled: false` so PR preview URLs are actively disabled. Developers likely test against `next dev -p 3001` locally.
7. Monitoring: `scripts/qa-check.sh` runs as a nightly QA agent (seemingly invoked manually or from another host's cron — not set up in GitHub Actions) and sends Telegram alerts on check failures.

## Concerns

1. **Conflicting deployment setups.** `vercel.json` + Vercel-CLI deploy path is authoritative. The `@opennextjs/cloudflare` scripts in `package.json` and the `wrangler` dev-dep suggest a half-done Cloudflare migration. If the intent is to move, this needs follow-through; if not, remove the scripts and the dep to avoid confusion.

2. **Leaked secret in repo.** `scripts/backfill-templates.js` has a hardcoded `SUPABASE_KEY` default that is a real service-role JWT for the production project (`yaijdtsunxicuphrakcc`). This must be rotated and removed. The file is tracked in git. Also `scripts/run-migration.mjs` hardcodes the project ref, which is lower risk but still should be env-only.

3. **Stale type union.** `types/index.ts` exports `Plan = 'free' | 'starter' | 'business' | 'max'`, which doesn't match the actual `PLANS` in `lib/billing/plans.ts` (`free`, `solo_pro`, `starter`, `pro`, `scale` per `billing.test.ts`). Any code typed against this `Plan` is either unused or silently accepting invalid values.

4. **Extremely thin test coverage.** Only 3 files: billing math/constants, cron auth, GHL ID validation. No tests for any API route, no Stripe webhook integration tests beyond the event-type list, no tests for the provisioner, the chat pipeline, Pinecone, middleware, or any React component. Given the volume of cron endpoints (15) and API routes, this is the single biggest risk factor in the repo.

5. **Dangerous / undocumented scripts.**
   - `reembed-memories.js` — no dry-run, no batching, no confirmation. An accidental invocation re-embeds the entire production memory table and racks up OpenAI embedding bills.
   - `fix-marketing-data.mjs` — hardcoded `AGENCY_ID` and `CLIENT_ID`, deletes `crm_contacts` where `source='admin-migration'` before re-inserting. Safe if the constants are correct, data-loss risk if run against the wrong environment.
   - `backfill-templates.js` — defaults to production Supabase + production provisioner with hardcoded secrets.
   - `infra/restart-all.sh` — no dry-run; a filter-less invocation stops and recreates every managed container. Has a `docker stop && docker rm && docker run` loop with no rollback on partial failure.

6. **Misnamed CI workflow.** `.github/workflows/deploy.yml` doesn't deploy. Rename to `ci.yml` to match what it does.

7. **Middleware is auth-only; no rate limiting.** `/api/*` bypasses middleware entirely. Any rate limiting for webhooks, chat, or cron endpoints must happen inside each route; there's no evidence of a shared limiter. The Stripe and Slack webhooks rely on signature verification but nothing caps raw request volume.

8. **Fly.io vs OVH duplication.** There are two OpenClaw deployments: the Fly.io `kyra-gateway` (single-tenant) and the VPS-hosted per-client `kyra-gateway:latest` containers (multi-tenant). The env-var comment ("OPENCLAW_GATEWAY_URL — Legacy — Mac mini tunnel") describes a *third* location. This three-way split plus the Cloudflare Worker (a fourth) is costly to maintain and hard to reason about. At least the feature flags (`KYRA_USE_WORKER`, `KYRA_USE_OPENCLAW`) expose the choice, but the graveyard of old deployments should be pruned.

9. **CSP allows `unsafe-eval`.** Called out in the config comment, but remains a real XSS risk surface. Next.js 15 doesn't strictly require it once dynamic-eval deps are gone — worth a pass.

10. **Cron secret naming drift.** `.env.example` documents `CRON_API_KEY` but `lib/auth/cron.ts` uses `CRON_SECRET`. These must be the same or one is dead. Test file explicitly uses `CRON_SECRET`.

11. **TypeScript `exclude` references non-existent siblings.** The `exclude` list mentions `kyra`, `openclaw`, `kyra-worker`, `site-templates`. Only some of these likely exist as sibling directories. If they are not checked in here, the excludes are vestigial noise; if they are, they represent additional code that is intentionally untyped from this tree.

12. **No environment isolation.** Production URL, production Supabase project, production provisioner, production OpenAI/Anthropic keys all feed from the same `.env.local`. No separate staging config, no feature-flag mechanism for safe rollout other than the coarse `KYRA_USE_*` flags.

13. **Manual deploy gating in shell.** `scripts/deploy.sh` enforces cost control client-side using `/tmp` counter files. A fresh machine or TMPDIR flush resets the counter. `FORCE=1` is documented as "emergencies only" but is trivially invokable. The guard is advisory, not authoritative.
