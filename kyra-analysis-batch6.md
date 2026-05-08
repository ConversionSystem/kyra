## Middleware

`/Users/steve/projects/kyra/middleware.ts` is a 19-line shim. It imports `updateSession` from `@/lib/supabase/middleware` (the standard Supabase SSR auth refresh pattern) and wraps it with a single early-return path gate. The top of the function logs every request to stdout with `console.log('[middleware]', request.method, path)` — hot-path noise that in steady-state production will flood Vercel logs, and is otherwise unguarded (no NODE_ENV check).

The only routing rule is: `if (path.startsWith('/api/')) return NextResponse.next();`. Every API route — webhooks, cron, billing, auth, agency/client data — bypasses the Supabase session refresh middleware entirely. For webhooks (`/api/webhooks/stripe`, `/api/webhooks/ghl`) that is correct; for billing and agency CRUD routes it means auth happens individually inside each handler via the server Supabase client. Confirmed: there is no rate limiting, no IP throttling, no per-user quota in middleware. Any gate on `/api/*` lives inside the route file itself or nowhere.

The `config.matcher` excludes `_next/static`, `_next/image`, `favicon.ico`, and raw image extensions — standard. For everything else (pages, layouts, `/agency/*`, `/admin/*`, `/onboarding`, etc.) the Supabase session cookie is refreshed via `updateSession`. Redirect logic (anon → login, onboarding flow, 2FA) lives in `lib/supabase/middleware.ts`, not here.

## Next.js config

`/Users/steve/projects/kyra/next.config.mjs` is 58 lines. The only runtime option is `serverExternalPackages: ['ws']` (to keep the `ws` package out of the bundler for Cloudflare Workers compat — the comment explicitly flags that it "may not fully work on Cloudflare Workers"). `experimental` is declared empty.

All other content is an `async headers()` block that applies a global header set to `/(.*)`:

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block` (legacy)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (no `preload`)
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` — blocks `payment=()` despite Stripe Checkout being used via redirect (not embedded), so acceptable
- Content Security Policy, joined into one header

The CSP flags both `unsafe-inline` and `unsafe-eval` on `script-src` with an inline comment acknowledging the tech debt: *"Tighten as the app matures (remove unsafe-eval once no eval deps remain)."* Allowed script hosts: `https://js.stripe.com`, `https://cdn.jsdelivr.net`. Connect-src allows `*.supabase.co`, Stripe API, `api.openai.com`, `api.anthropic.com`, `*.kyra.conversionsystem.com` (wildcard — includes every per-client subdomain), `api.retellai.com`, `*.livekit.cloud`. `frame-ancestors 'none'` (better than the X-Frame-Options directive), `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. No `img-src` domain allowlist — `https:` is wide open, acceptable for a content-heavy app.

There are no `images.domains` / `images.remotePatterns`, no custom webpack config, and no `reactStrictMode` setting. No image optimization remote allowlist is unusual but matches the codebase's light use of `next/image`.

## Deployment config

`/Users/steve/projects/kyra/vercel.json` is 77 lines. Top-level keys:

- `"ignoreCommand": "exit 1"` — intentional build-skip gate. When Vercel's git integration fires (it still does on pushes to the linked project) this command makes the project *always* say "don't build". Deployment is performed out-of-band by CLI-driven flow, so returning `exit 1` on every git-fired build is the kill-switch.
- `"functions"` — nine route-specific `maxDuration` overrides, all in the agency/site-builder and dispatch domains:
  - `/api/agency/sites/[id]/build`, `generate`, `deploy` → 300s (5 min)
  - `/api/agency/sites/[id]/growth`, `pages` → 60s
  - `/api/agency/clients/[id]/dispatch/optimize` → 60s
  - `/api/agency/clients/[id]/dispatch/drivers`, `dispatch/webhooks` → 30s
  - `/api/webhooks/onfleet/[clientId]` → 30s
- `"crons"` — 15 scheduled entries, all pointing to `/api/cron/*` routes. Here is the full table:

| Path | Schedule | Cadence |
|---|---|---|
| `/api/cron/scheduled-tasks` | `*/30 * * * *` | every 30 min |
| `/api/cron/weekly-report` | `0 8 * * 1` | Mondays 08:00 UTC |
| `/api/cron/email-sequence` | `0 8 * * *` | daily 08:00 |
| `/api/cron/follow-ups` | `0 * * * *` | hourly |
| `/api/cron/crm-autopilot` | `0 7 * * *` | daily 07:00 |
| `/api/cron/briefing` | `0 8 * * *` | daily 08:00 |
| `/api/cron/seo-worker` | `0 6 * * 1-5` | weekdays 06:00 |
| `/api/cron/alerts` | `*/30 * * * *` | every 30 min |
| `/api/cron/terminal-credits` | `*/30 * * * *` | every 30 min |
| `/api/cron/gateway-token-sync` | `0 4 * * *` | daily 04:00 |
| `/api/cron/usage-alerts` | `0 8 * * *` | daily 08:00 |
| `/api/cron/worker-tasks` | `*/30 * * * *` | every 30 min |
| `/api/cron/idle-containers` | `0 4 * * *` | daily 04:00 |
| `/api/cron/container-health` | `*/5 * * * *` | every 5 min |
| `/api/cron/dispatch-optimize` | `*/15 * * * *` | every 15 min |

The three lines removed recently were the `git.deploymentEnabled: false` object (commit `b8a2106a`, "ci: auto-deploy to Vercel on merge to main") which peeled back both `"git": { "deploymentEnabled": false }` (2 lines) and `"ignoreCommand": "exit 1"` (1 line) — the intent being to let CI drive deploys. Then `d665b07c` ("fix: disable CI auto-deploy + restore ignoreCommand (cost control)") put `ignoreCommand` back but did **not** restore `git.deploymentEnabled: false`. Net result today: three lines gone from the original (both `git` keys + their brace pair), only `ignoreCommand` is back — so the git integration is still "enabled" but every auto-triggered build dies immediately on `exit 1`. Redundant to having CI's deploy job disabled, but a defense-in-depth pair.

`package.json` advertises `cf:build`, `preview`, and `deploy` scripts that shell out to `@opennextjs/cloudflare` — the repo retains Cloudflare Worker scaffolding (`wrangler` and `@opennextjs/cloudflare` are in `devDependencies`) as a second potential deploy target, but the live production path uses Vercel. The OpenNext Cloudflare path is wired but not exercised by `deploy:prod`.

## CI/CD

`/Users/steve/projects/kyra/.github/workflows/deploy.yml` is 74 lines and misnamed — the file is called "deploy" but the workflow's `name:` is `CI Check`. It triggers on push to `main`, every PR to `main`, and `workflow_dispatch`.

The `ci` job runs on ubuntu-latest with Node 22 and `cache: 'npm'`:
1. `npm ci`
2. `npx tsc --noEmit`
3. `npx eslint . --ext .ts,.tsx --max-warnings 9999`
4. `npm test` (vitest)

The `deploy` job is defined but **hard-disabled** via `if: false`. Its display name in the YAML is `"Deploy to Vercel (production) [DISABLED — use CLI only]"`, with an inline comment: *"NEVER auto-deploy from CI — use 'npx vercel --prod --yes' locally to control deploy count"*. The job body still contains the full Vercel CLI sequence (`vercel pull` → `vercel build` → `vercel deploy --prebuilt --prod`) using `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets.

Recent churn: `b8a2106a` (Apr 18) enabled auto-deploy (`if: github.event_name == 'push' && github.ref == 'refs/heads/main'`). Three days later, `d665b07c` (Apr 20) flipped it to `if: false` and restored `ignoreCommand` in `vercel.json` — the commit message is "fix: disable CI auto-deploy + restore ignoreCommand (cost control)". So the PR landed and was then explicitly reverted. Current state: **CI does not deploy**. The file is intentionally kept as a documented, disabled job so the plumbing is obvious the next time auto-deploy is re-enabled.

## Scripts

Eight files in `/Users/steve/projects/kyra/scripts/`, 2,088 LOC total:

- **`deploy.sh`** (164 LOC). Sourced by `npm run deploy:prod`. Hard gate: max 2 deploys/day, counter at `${TMPDIR:-/tmp}/.kyra_deploy_$(date +%Y%m%d)`, configurable via `DAILY_DEPLOY_LIMIT` and `KYRA_COUNTER_FILE`. `FORCE=1` bypasses the gate (emergency escape). On deploy #2, interactively confirms if stdin is a TTY. Also checks for uncommitted git changes and prompts before proceeding. Cost model in the header: "~$0.40 per deploy, target ≤10 deploys/month = ~$4 in build minutes + $20 base = $24/mo". After a successful `npx vercel --prod --yes`, writes the new count back, then automatically removes all older deploys via `vercel rm` scoped to team `conversionsystem`. On failure, the counter is NOT incremented — failed attempts don't burn quota.

- **`qa-check.sh`** (425 LOC). Nightly health agent; loads env from `.env.local` via a `grep+sed+xargs` pipeline (brittle to values with spaces or quotes). Seven checks with pass/warn/fail/skip categorization:
  1. Correct Stripe webhook (`/api/webhooks/stripe`) is active and old ones (`/api/billing/webhook`, `/api/stripe/webhooks`) are disabled.
  2. Plan vs credits consistency: queries `agencies` where `plan in (starter,pro,scale)` and flags any with `credit_balance < 500` (hardcoded floor).
  3. Container health over SSH to `ubuntu@15.204.91.157`: `docker ps -a`, flag exited/restarting/oom.
  4. Provisioner image digest — checks that `kyra-gateway:latest` and `kyra-gateway:v2026.3.23-full` resolve to the same image ID on the VPS.
  5. Recent signups with Stripe customer ID but `plan=free` in the last 7 days (webhook drift detector).
  6. Vercel deploy counter sanity — warns if `>2` (FORCE abuse) or `==2` (limit hit).
  7. Duplicate of (1)'s second half — dead-webhook-handler re-check.
  On any FAIL, POSTs a Telegram alert via `TELEGRAM_BOT_TOKEN` + `TELEGRAM_NOTIFY_CHAT_ID`. `DRY_RUN=1` prints the alert without sending. The VPS hostname and pinned image tag are hardcoded constants at the top.

- **`seed-templates.ts`** (618 LOC). `npx tsx scripts/seed-templates.ts`. Imports `@supabase/supabase-js`, reads env (either `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`, plus `SUPABASE_SERVICE_ROLE_KEY`), then inserts rows into the `agency_templates` table — includes LeadPilot, industry-specific SOUL templates, skill lists, sample responses, `ghl_config`, and `cron_config`. `agency_id: null` means these are public/global templates. No `upsert` — runs risk duplicating rows on rerun.

- **`backfill-templates.js`** (176 LOC). **CRITICAL — leaked secret still present.** Line 15 contains the hardcoded production service-role JWT in plaintext as a fallback for `SUPABASE_KEY`:
  ```js
  const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhaWpkdHN1bnhpY3VwaHJha2NjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI3NzkzOSwiZXhwIjoyMDg1ODUzOTM5fQ.13OWEHyuk7EOLZRGbmxgVKqd2HJ_ouA78BFbEhwChmA';
  ```
  The JWT decodes to `{"iss":"supabase","ref":"yaijdtsunxicuphrakcc","role":"service_role","iat":1770277939,"exp":2085853939}` — a service-role token valid until 2036. `SUPABASE_URL` defaults to `https://yaijdtsunxicuphrakcc.supabase.co`, and line 17 hardcodes `PROV_SECRET` = `'kyra-provisioner-2026'` as a fallback for the VPS provisioner bearer. This is a committed, public-if-the-repo-ever-leaks credential that grants full-DB bypass-RLS access. File status is unchanged since `Mar 11`. **Rotate the service-role key and refactor this script to hard-fail if env is unset.**

- **`fix-marketing-data.mjs`** (425 LOC). One-off repair script with hardcoded IDs at top: `AGENCY_ID = '1511e077-77ef-4c47-81fd-06a3bc9f1dbb'`, `CLIENT_ID = 'f91b28a1-2911-477e-b228-9a21cdbb1dca'`, `SUPABASE_URL = 'https://yaijdtsunxicuphrakcc.supabase.co'`. Unlike `backfill-templates.js`, the service key is read from `.env.local` via regex on the `SUPABASE_SERVICE_ROLE_KEY=` line (correctly). Three tasks: (1) updates 13 system email templates with real HTML drawn from `lib/email/nurture-sequence.ts` and `lib/email/weekly-report.ts`, (2) inserts 82 agency owners from Supabase Auth → `crm_contacts`, (3) creates/recreates the `Kyra Onboarding` email sequence with 7 steps. Uses `supabase.auth.admin.listUsers` paginated at 1000. Before insert it hard-deletes any `source='admin-migration'` rows in `crm_contacts` — idempotent rerun.

- **`reembed-memories.js`** (57 LOC). Reads all rows from `memories`, generates OpenAI `text-embedding-3-small` embeddings, upserts them into Pinecone with the memory metadata. **No dry-run, no batching, no pagination, no rate-limit backoff** — iterates row-by-row awaiting each network call. Fine at ≤1000 rows, dangerous if memory count grows. Re-reads env via two `dotenv` calls (`.env.local` then `.env.openai` with `override: true`).

- **`run-migration.mjs`** (71 LOC). Direct `pg` client to Supabase's transaction-mode pooler. `PROJECT_REF = 'yaijdtsunxicuphrakcc'` hardcoded on line 15. Reads `SUPABASE_DB_PASSWORD` or `DATABASE_URL` from env, builds `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`, connects with `ssl: { rejectUnauthorized: false }` (accepts any cert — acceptable for a pooled-connection dev tool but not for hardened use), executes each SQL file passed on argv, then runs a verification query on six expected tables. `rejectUnauthorized: false` is the minor quality issue; the script otherwise correctly fails if password env is missing.

- **`test-templates.ts`** (152 LOC). Not a vitest file — runs `npx tsx scripts/test-templates.ts` and prints pass/fail counts. Iterates `INDUSTRY_TEMPLATES` from `lib/templates/industry-templates.ts` and asserts: no duplicate IDs/names, description length, tag minimums, `soulTemplate` length, that every `{{var}}` in the template has a matching definition and vice versa, tools are in a VALID_TOOLS allowlist. Self-contained validator, not part of `npm test`.

## Infra

`/Users/steve/projects/kyra/infra/` holds the OVH VPS operational artifacts (hostname `ubuntu@15.204.91.157`, referenced throughout).

- **`nginx/kyra-css-proxy.conf`** (55 LOC). The sidecar nginx that strips the OpenClaw white-label chrome for per-client subdomains. Listens on 19000, resolves `$host` via Docker DNS (`127.0.0.11`), extracts the 36-char UUID from the leftmost subdomain label (`"~^(?<uuid>[0-9a-f-]{36})\."`), and reverse-proxies to `http://kyra-cl-${uuid}:18789`. `sub_filter` injects a CSS rule into every `</head>` that hides the OpenClaw update banner and "danger"/"error" callouts. A hand-built SVG favicon is served from the proxy so the logo is correct even when the upstream is booting (fixes the "blue question mark" caching issue documented in `infra/README.md`). The WebSocket fix is the key piece: `proxy_set_header Sec-WebSocket-Extensions "";` strips permessage-deflate before the upgrade handshake, preventing RSV2/RSV3 frame corruption when nginx proxies compressed WS frames. Upstream timeout is 300s.

- **`provisioner/server.js`** (1,114 LOC). Node/Express service bound to `:9090` on the VPS. Uses `dockerode` to manage Docker containers and writes Traefik dynamic config to `/opt/kyra/traefik/dynamic`. `PROVISIONER_SECRET` from env (fallback: `'kyra-provisioner-2026'` — hardcoded default), Bearer-token middleware on `/containers` and `/image` routes. Manages a shared `kyra-router` sidecar container (Python model-routing service on port 8104, memory capped at 256MB, `KYRA_DAILY_CAP=50.00` and `KYRA_MONTHLY_BUDGET=500.00` env-controlled budgets). Per-client container creation: writes `openclaw.json`, `SOUL.md`, `USER.md`, `TOOLS.md`, `AGENTS.md`, knowledge-base chunks, and a `meta.json` with the `authToken`; pre-creates `devices/paired.json` + `devices/pending.json` so `dangerouslyDisableDeviceAuth` works; `chown -R 1000:1000` to align with the `node` user in the container. BYOK logic branches: if the agency supplies any provider key, the router bypass is enforced (OpenClaw talks directly to the provider with no `OPENAI_BASE_URL` override).

- **`scripts/deploy-kyra-router.sh`** (49 LOC). One-shot bootstrap for the router container on the VPS: `docker build`, stop/rm, re-run with limits and env-vars (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `KYRA_MAX_TIER=2`, `KYRA_DAILY_CAP=50.00`, `KYRA_MONTHLY_BUDGET=500.00`). After first run the provisioner auto-restarts it.

- **`restart-all.sh`** (46 LOC). Iterates every container with label `kyra.managed=true`, reads each client's `authToken` and `agencyId` from `/opt/kyra/data/clients/<id>/meta.json` (NEVER from `docker inspect` env, per the file's own comment — inspect-env tokens can be corrupted), uses a per-client `.api-key` file if present else falls back to the provisioner master `OPENAI_API_KEY`, then stops/removes/re-creates the container with 1GiB memory, 256 CPU shares, dropped `NET_RAW`/`SYS_ADMIN`/`MKNOD` caps, `--restart unless-stopped`. Usage: `bash /opt/kyra/restart-all.sh [client-id-prefix]` (optional filter).

- **`infrastructure/openclaw/`** (after recent cleanup). Still present:
  - `Dockerfile` (4,304 bytes) — Debian bookworm-slim, Node 22, `openclaw@latest` from npm, `himalaya` email CLI, Chromium + `fonts-noto-color-emoji` for browser automation, plus `gh` and `himalaya` wrapper scripts that auto-source `.secrets.env`. Exposes 3100 (bridge). Comment text references Traefik (updated from Fly.io in the cleanup commit).
  - `kyra-bridge.js` (44,224 bytes) — HTTP-to-WebSocket bridge translating `POST /chat` into OpenClaw's RPC calls.
  - `start.sh` (16,691 bytes) — entry point; generates per-client config, starts gateway, starts bridge.
  - `README.md` (4,340 bytes) — rewritten to describe the OVH+Traefik topology, lists health check at `https://{client-id}.gw.kyra.conversionsystem.com/health`.
  - `workspace/` — base workspace files (SOUL.md, AGENTS.md, etc.).
  - `.dockerignore` (39 bytes).
  
  **Deleted** in commit `3d2fd918` (Apr 19): `fly.toml` and `deploy.sh` (the flyctl-based deploy wrapper). `lib/fly/client.ts` and `lib/fly/provisioner.ts` were also removed in the same commit — `lib/fly/` no longer exists. Some historical Fly.io references remain in strategy docs (KYRA-STRATEGIC-ROADMAP.md, TECH-STACK.md, etc.) and in a Supabase migration comment (`20260218002_agency_gateway.sql`) — explicit follow-ups called out in the commit body.

## Tests

Only three test files in `/Users/steve/projects/kyra/__tests__/`:

- **`billing.test.ts`** (9.8 KB). Uses vitest with a manual Supabase mock factory. Covers: `CREDIT_COSTS` and `getCreditCost` from `lib/billing/credit-engine`; the `MODELS` list and `MODEL_CREDITS` map from `lib/billing/model-credits`; `normalizeModelId` (OpenRouter slug → canonical ID mapping); `PLANS` constants from `lib/billing/plans` (asserts specific monthly-credit and maxClients values for `free`, `solo_pro`, `starter`, `pro`, `scale`); a shape-only check for the Stripe webhook `HANDLED_EVENTS` list and idempotency-key format; and `resolveModel` + `OPENROUTER_SLUGS` from `lib/chat/core`. Note the mismatch to production reality: this file uses the real plan IDs (`free | solo_pro | starter | pro | scale`), not the stale `types/index.ts` shapes.

- **`cron-auth.test.ts`** (4.8 KB). Validates `checkCronAuth` and `requireCron` from `lib/auth/cron` in both env-set and env-unset conditions. Enforces fail-closed: returns 500 when `CRON_SECRET` is unset or empty, 401 on mismatch, accepts both `Authorization: Bearer <secret>` and `?secret=<secret>` query param, refuses the literal string `'undefined'`, and supports `extraSecretEnvVars` / extra-secret fallbacks. Explicitly tests the historic `'Bearer ${undefined}'` → `'Bearer undefined'` interpolation bug.

- **`ghl-id-validate.test.ts`** (4.3 KB). Tests `isValidGhlId` and `validateGhlIds` from `lib/ghl/skills/validate`. Accepts 10–64 char base62 strings, rejects path traversal, URL injection (`?`/`#`/`&`/`;`), scheme injection (`http://`, `javascript:`), whitespace, URL-encoded bytes, non-string inputs, empty string, and any hyphens/underscores/dots.

**Coverage gaps.** No API route handler tests, no Stripe webhook signature tests (only shape checks), no cron handler tests, no component tests, no React/client-hook tests, no GHL integration-path tests, no session/middleware tests, no memory/Pinecone tests, no OpenClaw gateway bridge tests, no E2E. Total unit surface is narrow (billing plans + cron auth + one input validator). `npm test` runs everything in ~seconds, which is by necessity — the coverage footprint is ≈3% of the codebase's concerns.

## Type definitions

`/Users/steve/projects/kyra/types/` contains five ambient type files, none of which are the actively-used billing types. They appear to be legacy "consumer Kyra" schema from before the agency-platform pivot.

- **`index.ts`** — declares `export type Plan = 'free' | 'starter' | 'business' | 'max';`. This is **stale**. The production plan union (in `lib/billing/plans.ts`, exercised by `billing.test.ts`) is `'free' | 'solo_pro' | 'starter' | 'pro' | 'scale'`. `'business'` and `'max'` don't exist; `'solo_pro'`, `'pro'`, and `'scale'` are missing here. The `User` interface also references a per-user `plan`, `stripe_customer_id`, and `usage_this_month` model — in reality `agencies` holds that state, not `users`. Anything importing `Plan` from `@/types` will silently widen to a literal set with no real-world meaning. Grep for usage: this file exports are probably orphaned, but any lingering `Plan` or `User` imports from `@/types` would compile against wrong shapes.

- **`channels.ts`** — declares `ChannelType = 'web'|'whatsapp'|'telegram'|'discord'|'voice'|'email'|'slack'`, plus `ChannelMessage`, `ChannelResponse`, `ChannelConfig`, `UserChannelLink`. Aspirational. The live channels are web, GHL-SMS (not its own entry), Slack (integration), and email. Telegram, Discord, and standalone voice are not wired.

- **`memory-graph.ts`** — graph memory model with `Entity`, `Relationship`, `MemoryGraphQuery`, `GraphContext`. Not reflected in any migration. Memories today are a flat table with Pinecone embeddings. Aspirational.

- **`notifications.ts`** — `NotificationType` union covering `insight`/`reminder_followup`/`calendar_prep`/`weekly_summary`/`nudge`/`morning_brief`/`pattern_alert`. The live notification pipeline uses a different shape (admin + agency per-client alerts). Aspirational.

- **`pipelines.ts`** — `Pipeline`/`PipelineStep` multi-step workflow with checkpointing and per-step credit costs. Not a live surface; `pipeline.find_leads` is referenced in `CREDIT_COSTS` but that's the extent of it. Aspirational.

All five files carry the "does not match live schema" risk; they're type-level drift. Safe to delete after a grep-sweep to confirm no imports.

## Env vars

`/Users/steve/projects/kyra/.env.example` is 86 lines, grouped by banner:

- **APP:** `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`.
- **SUPABASE:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **KYRA INTER-SERVICE AUTH:** `KYRA_API_SECRET` (shared secret for container↔Vercel calls, e.g. `/api/agency/clients/:id/container-config`).
- **OPENCLAW GATEWAY (Legacy — Mac mini tunnel):** `OPENCLAW_GATEWAY_URL` (default `http://localhost:18789`), `OPENCLAW_API_KEY`.
- **FEATURE FLAGS:** `KYRA_USE_WORKER` (true — routes to per-agency OVH gateway; name is historical, no longer points at Cloudflare Workers), `KYRA_USE_OPENCLAW` (legacy fallback), `KYRA_OPENCLAW_SKILLS`.
- **AI MODELS:** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`.
- **PINECONE:** `PINECONE_API_KEY`, `PINECONE_INDEX=kyra-memories`.
- **STRIPE:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and four price IDs (`STRIPE_STARTER_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_SCALE_PRICE_ID`, `STRIPE_PER_CLIENT_PRICE_ID`). Missing: the `STRIPE_SOLO_PRO_PRICE_ID` that should exist given `solo_pro` is a real plan.
- **SLACK:** `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`.
- **GOOGLE:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- **BRAVE SEARCH:** `BRAVE_API_KEY`.
- **CRON:** `CRON_API_KEY` — doc drift. The real code reads `CRON_SECRET` (see `lib/auth/cron.ts` and `__tests__/cron-auth.test.ts` which mutates `process.env.CRON_SECRET`). `CRON_API_KEY` appears only in `.env.example`. Any operator who follows the example will set `CRON_API_KEY` and get `500`s from every cron endpoint because the auth module fails-closed when `CRON_SECRET` is unset.

**KYRA_WORKER_URL** is no longer in `.env.example` — confirmed removed by commit `3d2fd918` (diff shows it was dropped from the "FEATURE FLAGS" section). The commit also updated the section label for `KYRA_USE_WORKER`. Grep confirms no active code path reads `KYRA_WORKER_URL`; the only remaining references are in historical docs (`WORKER-DEPLOY-GUIDE.md`, `KYRA-STRATEGIC-ROADMAP.md`, `KYRA-AGENCY-PLATFORM-PLAN.md`, `CONTAINER-ARCHITECTURE.md`, `ARCHITECTURE-ANALYSIS.md`).

The `lib/worker/health.ts` file still exists and is now 40 lines (the 11-line `checkWorkerHealth` was removed by `3d2fd918`; only `checkGatewayHealth(gatewayUrl)` remains).

Also missing from `.env.example`: `FIRECRAWL_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_NOTIFY_CHAT_ID`, `RESEND_API_KEY`, `OPENROUTER_API_KEY`, `SUPABASE_DB_PASSWORD`, `KYRA_PROVISIONER_URL`, `PROVISIONER_SECRET`, `RETELL_API_KEY` / LiveKit keys. `.env.local.example` only contains the Firecrawl hint. The example is incomplete relative to the surface the code expects.

## ESLint/TS config

`/Users/steve/projects/kyra/tsconfig.json`:
- `strict: true`, `target: ES2017`, `module: esnext`, `moduleResolution: bundler`, `allowJs: true`, `skipLibCheck: true`, `incremental: true`, `isolatedModules: true`, `noEmit: true`, `jsx: preserve`.
- Path alias: `"@/*": ["./*"]` (matched in `vitest.config.ts` as `'@': path.resolve(__dirname, '.')`).
- Plugins: next's LSP plugin.
- Includes: `next-env.d.ts`, `**/*.ts`, `**/*.tsx`, `.next/types/**/*.ts`.
- Excludes: `node_modules`, `kyra`, `openclaw`, `kyra-worker`, `site-templates` — the four sibling-repo names the monorepo root expects.

`/Users/steve/projects/kyra/.eslintrc.json` extends `next/core-web-vitals` + `next/typescript`. Rules:
- Warnings (pre-existing debt): `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars`, `react/no-unescaped-entities`, `prefer-const`, `react-hooks/exhaustive-deps`.
- Errors (runtime-breaking only): `@next/next/no-html-link-for-pages`, `react-hooks/rules-of-hooks`.

`/Users/steve/projects/kyra/.eslintignore` is just `next-env.d.ts` + `.next/` + `node_modules/` (4 lines). The CI workflow passes `--max-warnings 9999` so lint warnings never fail the build — a conscious tradeoff documented in the `.eslintrc.json` header comment. Effectively, only the two error-level rules plus TypeScript errors (via `tsc --noEmit`) can block CI.

## Ops/deploy story

Production deploy flow today:

1. `git push origin main` (or merge PR).
2. GitHub Actions fires `.github/workflows/deploy.yml` → runs `ci` job (tsc → eslint `--max-warnings 9999` → vitest). The `deploy` job is defined but `if: false` — never executes.
3. Vercel's git integration ALSO fires but immediately aborts via `ignoreCommand: "exit 1"` — the build is skipped before it starts.
4. Engineer runs `npm run deploy:prod` locally → `bash scripts/deploy.sh`. That gate:
   - Reads `/tmp/.kyra_deploy_$(date +%Y%m%d)`, blocks if count ≥ 2 (`FORCE=1` overrides).
   - Prompts on deploy #2 and when there are uncommitted changes.
   - Runs `npx vercel --prod --yes`.
   - On success, increments the counter and auto-cleans older deploys with `vercel rm`.

**Out-of-band deploy targets** (not driven by the Vercel flow):
- **OVH VPS** `ubuntu@15.204.91.157` — hand-operated via SSH. Provisioner at `:9090`, nginx CSS-proxy on `:19000`, Traefik fronting per-client subdomains (`{uuid}.gw.kyra.conversionsystem.com`), shared `kyra-router` sidecar. Updates via `restart-all.sh`, `deploy-kyra-router.sh`, and direct `docker build -t kyra-gateway:latest .`.
- **Cloudflare Workers** — `cf:build`, `preview`, and `deploy` npm scripts route through `@opennextjs/cloudflare`. Not on the active production path but the plumbing is retained. `wrangler` is a devDependency.
- **Fly.io — decommissioned.** `lib/fly/client.ts`, `lib/fly/provisioner.ts`, `infrastructure/openclaw/fly.toml`, and `infrastructure/openclaw/deploy.sh` were all deleted in commit `3d2fd918` (Apr 19). Zero Fly-specific code paths remain active; only stale references in strategy docs and one migration comment survive.

**Deploy target count today: 2 active** (Vercel for the Next.js app, OVH VPS for the per-client OpenClaw containers/provisioner/nginx/router). +1 latent/optional (Cloudflare Workers wiring still present). Previously it was 3 active (Vercel + OVH + Fly.io).

## Concerns

1. **Leaked production service-role JWT in `scripts/backfill-templates.js:15`.** Hardcoded as an env fallback. Valid until 2036. Grants RLS-bypass read/write to every table in the `yaijdtsunxicuphrakcc` project. Unchanged in the recent batch of cleanups — this was flagged before and is still there. Remediation: rotate the key in Supabase, remove the fallback, make the script error if `SUPABASE_KEY` is unset.

2. **Stale `Plan` type in `types/index.ts`.** Declares `'free'|'starter'|'business'|'max'`, production reality is `'free'|'solo_pro'|'starter'|'pro'|'scale'`. Any consumer importing `Plan` from `@/types` is wrong by construction. The four aspirational type files (`channels.ts`, `memory-graph.ts`, `notifications.ts`, `pipelines.ts`) are dead code of the same flavor — aspirational schemas for features that never shipped.

3. **Thin test coverage.** Three files, covering billing constants, cron auth, and one validator. No API route tests, no webhook signature tests, no cron handler tests, no component tests, no E2E, nothing exercising the per-client container bridge, Pinecone, or OpenClaw flows.

4. **Dangerous operational scripts.** `reembed-memories.js` has no pagination or rate-limit handling. `run-migration.mjs` uses `rejectUnauthorized: false`. `fix-marketing-data.mjs` hardcodes AGENCY_ID and CLIENT_ID — safe only because it's a one-off, but easy to re-run against the wrong tenant. `backfill-templates.js` has the leaked-JWT issue plus a hardcoded `kyra-provisioner-2026` fallback for the provisioner bearer.

5. **Misnamed CI workflow.** The file is `deploy.yml` but the workflow is `name: CI Check` with a disabled deploy job. Confuses readers expecting a deploy pipeline. Either rename the file to `ci.yml` or split into two workflows.

6. **No middleware rate limiting.** Every `/api/*` bypasses middleware entirely. Webhooks, cron, billing, agency CRUD — each is responsible for its own auth. No IP throttling, no Turnstile-style challenge, no global throttle. A burst attack on `/api/agency/sites/[id]/build` (300s function budget) could rack up execution minutes quickly.

7. **CSP `unsafe-eval`.** Flagged with a TODO in the config itself. Still required for some prod bundle, needs a dependency audit to remove.

8. **Cron env drift.** `.env.example` says `CRON_API_KEY`, code reads `CRON_SECRET`. Operators following the example template will get 500s from every cron route because the auth helper fails closed.

9. **`console.log('[middleware]', ...)` in the hot path.** Every non-API request logs. Cheap on a quiet account, but flood-prone at scale. Guard with `NODE_ENV !== 'production'` or drop.

10. **Misc naming history.** `KYRA_USE_WORKER` is historical naming (predates the OVH pivot) — today it means "route to the per-agency OVH gateway", not Cloudflare Workers. Called out as a deferred rename in the Fly-cleanup commit message. The feature-flag value is correct; the name is just a source of confusion.

11. **Missing Stripe price ID for solo_pro.** `.env.example` lists `STARTER`, `PRO`, `SCALE`, `PER_CLIENT` price IDs but not `SOLO_PRO`, despite `solo_pro` being a first-class plan in `lib/billing/plans.ts` and `billing.test.ts`. Likely set in Vercel env but never documented in the example.

12. **`vercel.json` is double-belt-and-suspenders.** Both `ignoreCommand: "exit 1"` and the CI `deploy` job `if: false` now block auto-deploy. Either alone is sufficient. Not a bug, just redundancy — worth choosing one source of truth when CI auto-deploy is re-enabled.
