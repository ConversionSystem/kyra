# Kyra HTTP API Surface Analysis

Catalog and cross-cutting review of 356 `route.ts` files under `app/api/`. Conventions observed: the app is a Next.js 15 App Router deployment that mixes three auth styles (Supabase cookie JWTs, bearer-token shared secrets, and fully-public) and routes most inbound traffic through Supabase + Pinecone, a single multi-tenant worker (Fly.io), and per-client OpenClaw gateways on OVH.

## /api/admin

Admin-grade endpoints scoped to Conversion System staff. Not a uniform surface — some routes gate on an email allowlist, some on bearer shared secrets, and some are completely open.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/accounts` | List all agencies with credits, client counts, owner emails (`app/api/admin/accounts/route.ts:8`) |
| GET/PATCH/DELETE | `/api/admin/accounts/[id]` | Inspect / tweak / soft-delete an agency |
| POST | `/api/admin/accounts/[id]/credits` | Grant or adjust credit balance |
| POST | `/api/admin/accounts/[id]/login-as` | Mint a magic-link to impersonate an agency owner (`app/api/admin/accounts/[id]/login-as/route.ts:28`) |
| POST | `/api/admin/accounts/[id]/reset-password` | Admin-triggered password reset |
| POST | `/api/admin/batch-regen` | Regenerate live site content via Claude Sonnet (bearer `KYRA_API_SECRET`) |
| GET/POST | `/api/admin/content-calendar` | Curate platform-wide blog schedule |
| GET | `/api/admin/content-calendar/recent-topics` | Recently published topics |
| POST | `/api/admin/enable-weekly-report` | Toggle weekly report flag per agency |
| POST | `/api/admin/ghl-backfill` | Backfill GHL conversation history into Kyra DB |
| POST | `/api/admin/ghl-register-webhooks` | Register Kyra's webhook on every GHL client (bearer secret) |
| GET | `/api/admin/health-check` | Platform readiness checks (RESEND key, migrations, GHL listing) |
| GET | `/api/admin/kyra-stats` | Platform KPIs: MRR, ARPU, activation, churn, credit usage |
| POST | `/api/admin/migrate-contacts` | One-shot migration tool |
| GET/POST | `/api/admin/nurture-audit` / `nurture-trigger` | Email sequence auditing / manual trigger |
| GET | `/api/admin/orphaned-users` | Auth users without an agency (`app/api/admin/orphaned-users/route.ts:6`) |
| GET | `/api/admin/qa-health` | Runs 7 QA health checks (`X-Admin-Key` or service role) |
| POST | `/api/admin/router-migrate` | Migrate clients onto new model router |
| POST | `/api/admin/seed-templates` | Seed industry templates table |
| POST | `/api/admin/seo/seed-pack/[industry]` | Bulk seed SEO keywords per industry |
| GET | `/api/admin/stats` | Legacy user/plan stats (email allowlist: `hello@`, `angel@`, `steve@conversionsystem.com`) |
| POST | `/api/admin/sync-leads` | Resync kyra_waitlist |

**Auth audit (critical)** — Admin routes are inconsistently protected:

- **Unprotected (no auth check at all)**: `app/api/admin/orphaned-users/route.ts` — returns every email of any auth user who never joined an agency, 200-row limit. `app/api/admin/health-check/route.ts` — leaks which env vars / migrations are missing (includes Supabase project URL and full migration SQL). Both were confirmed via `head -30`; neither references `ADMIN_EMAILS`, `MASTER_EMAILS`, `requireAuth`, `CRON_SECRET`, `KYRA_API_SECRET`, or `getUser()`. These are live information leaks.
- **Email allowlist gate**: `admin/stats`, `admin/kyra-stats` — check `user.email ∈ ['hello@conversionsystem.com', 'angel@conversionsystem.com', ...]`.
- **Shared secret bearer**: `admin/batch-regen` (`KYRA_API_SECRET`), `admin/ghl-register-webhooks` (`KYRA_API_SECRET` OR `CRON_SECRET`), `admin/qa-health` (`X-Admin-Key` OR service role).

The email allowlist is hardcoded in three places with different membership (`stats` includes `steve@`; `kyra-stats`, `debug`, `master/*` do not). That inconsistency is a maintenance hazard — add someone to `stats` and they cannot see `kyra-stats`, or vice versa. Consolidating into a single `isAdmin(email)` helper is the obvious fix.

## /api/master

Parallel "master console" for platform operators. Three routes, all cookie-gated on `MASTER_EMAILS`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/master/impersonate` | Generate a one-time magic-link for any auth user (`app/api/master/impersonate/route.ts:8`) |
| GET | `/api/master/stats` | Global platform stats (agencies, clients, credits, conversations) (`app/api/master/stats/route.ts:8`) |
| GET | `/api/master/vps-health` | Fly.io + OVH health probe |

`/api/master/impersonate` is functionally a session-hijack endpoint — it accepts any user ID and produces a magic link that redirects to `/agency`. The only defense is the `MASTER_EMAILS` check. A log line is emitted but no audit table is written (searched; there is no `admin_audit_log` insert). For an endpoint this powerful, a dedicated audit row plus a short TTL on the magic link (Supabase default is 1 hour) would be appropriate.

Overlap: `/api/master/impersonate` duplicates `/api/admin/accounts/[id]/login-as` — both mint magic links via `db.auth.admin.generateLink({ type: 'magiclink' })`. Only the target lookup differs (user id vs agency id). Merge candidate.

## /api/debug

One route, cookie-gated on two admin emails.

- GET `/api/debug` — returns `{ hasCronSecret, hasKyraApiSecret, hasSupabaseUrl, hasSupabaseKey, hasGhlClientId, nodeEnv }`. Safe (booleans only) and correctly gated (`app/api/debug/route.ts:21`). No keys leak; only env-presence flags.

Debug is not exposed as a blanket route prefix — there is no `/api/debug/anything` surface. The only debug-ish endpoints currently in production are this and `/api/stripe/env-check`, `/api/stripe/test`. The latter two should be re-reviewed; both live under the public Stripe prefix.

## /api/auth

Supabase auth bridge + Google OAuth + GSC.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/auth/callback` | Supabase PKCE code → session exchange, referral activation, redirect (`app/api/auth/callback/route.ts:5`) |
| GET | `/api/auth/google/route.ts` | Initiate Google OAuth (calendar/gmail scopes) |
| GET | `/api/auth/google/callback` | OAuth redirect landing |
| GET | `/api/auth/gsc` | Initiate Google Search Console OAuth |
| GET | `/api/auth/gsc/callback` | GSC redirect landing |
| POST | `/api/auth/signout` | Clears Supabase session cookie |
| POST | `/api/auth/signup-intent` | Track signup funnel analytics (pre-auth) |
| POST | `/api/auth/solo-signup` | Solo-plan-specific signup (pre-fills agency + client) |

`/api/auth/callback` also handles the password-reset `type=recovery` branch. It honors both `?redirect=` and `?next=` params with a `decodeURIComponent`. The decoded value flows straight into `NextResponse.redirect(\`${origin}${destination}\`)` — the `${origin}` prefix saves it from open-redirect, but any path is allowed. Worth adding an allowlist check.

## /api/chat

Three routes. This is the hot path.

| Method | Path | Purpose |
|---|---|---|
| POST/OPTIONS | `/api/chat` | Primary chat entry. Routes to `worker/` or `openclaw/` based on feature flags, falls back to direct Claude (`app/api/chat/route.ts:34`) |
| POST | `/api/chat/openclaw` | Proxies to per-user OpenClaw session via `sessionsSend` (`app/api/chat/openclaw/route.ts:51`) |
| POST | `/api/chat/worker` | New multi-tenant Kyra Worker path (Fly.io) |

All three require a Supabase cookie JWT (`supabase.auth.getUser()`); unauthenticated requests get 401. All three:

- Look up the user → resolve agency via `agency_members.agency_id`
- Call `getAgencyCredits()`; return 402 if balance ≤ 0
- Persist a `conversations` row on first message, append `messages`
- Run prompt-injection defense via `scanMessage` → `logSecurityEvent`
- Deduct credits via `checkAndDeductCredits(agencyId, modelId, action)` using `getCreditsForModel`

Streaming: implemented as a `new ReadableStream({ start(controller) })` emitting `data: ${JSON.stringify(...)}\n\n` frames with a terminal `data: [DONE]`. Content-Type is `text/event-stream` with `Cache-Control: no-cache`. See `app/api/chat/route.ts:383-568` for the canonical shape (`type: 'conversation' | 'usage' | 'content' | 'tool_use' | 'memory_saved' | 'reminder_saved' | 'message' | 'error'`).

For the OpenClaw path (`app/api/chat/openclaw/route.ts:247`), streaming is faked: the gateway call is non-streaming, then the response is chunked in 20-char slices into the SSE stream. This preserves the client contract but loses true token-by-token flow.

## /api/widget

Public embeddable chat + script + form lead capture.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/widget/[clientId]/script` | Returns self-contained IIFE JS (styles, DOM, localStorage sessions); 5-min cache (`app/api/widget/[clientId]/script/route.ts:90`) |
| POST | `/api/widget/[clientId]/lead` | Contact-form lead capture; upserts `crm_contacts`, logs activity, pushes to GHL (`app/api/widget/[clientId]/lead/route.ts:22`) |
| POST/OPTIONS | `/api/widget/chat` | Unauth AI chat; IP rate-limit 60/60s; injects knowledge + RAG + CRM memory (`app/api/widget/chat/route.ts:60`) |

`/api/widget/chat` is the largest single public attack surface. Defenses:
- `isRateLimited('widget:${ip}')` via Supabase-backed limiter persists across cold starts.
- `defend(rawMessage, widgetContactId)` pre-filters prompt injection before the LLM call, and `scanOutput` post-filters for leaks.
- Message size capped at 2000 chars.
- `CORS: Access-Control-Allow-Origin: *` — by design for embedding.
- Gracefully replies on missing/suspended client rather than 404 (good UX, avoids enumeration).

The widget also bypasses OpenClaw and calls the LLM directly (`getDirectLLMClient()`), with hardcoded `WIDGET_MODEL = 'openai/gpt-4o-mini'` but fallback to the client's configured `ai_model`. Integration with Jane (cannabis dispensary product search) is inline. Lead extraction + CRM auto-log are fire-and-forget `void (async () => ...)`.

## /api/public

Only one route currently.

- GET `/api/public/workers` — anonymous directory of all non-deleted `agency_clients`, filterable by `search` and `industry` (`app/api/public/workers/route.ts:4`). No auth, no rate limit. Returns `{ id, name, industry, status, channels, agency_name }`. Presumably intentional for the "workers showcase" page, but it leaks the internal client-id (UUID) — these IDs are used by `/api/widget/chat`, `/api/portal/[clientId]/chat`, etc., so exposing them allows any third party to attempt chat with any agency's worker.

## /api/try and /api/playground

Unauth marketing demos.

- POST `/api/try` — edge runtime, in-memory IP limiter (20/min), streams fixed industry persona replies via OpenRouter Claude Haiku 4.5 (`app/api/try/route.ts:101`). No DB touch.
- POST `/api/playground/chat` — Supabase-backed IP limiter (20/hour), no streaming (single JSON reply), hits `api.openai.com/v1/chat/completions` directly with model string `openrouter/anthropic/claude-haiku-4.5` (`app/api/playground/chat/route.ts:5`). Note the bug: uses `api.openai.com` as base but passes an OpenRouter-style model slug — this only works if `OPENAI_API_KEY` is actually an OpenRouter key configured as OAI-compat, otherwise it 400s.

## /api/roi and /api/leads

Marketing funnel capture.

- POST `/api/roi/capture` — unauth; forwards ROI calculator data to `SIGNUP_WEBHOOK_URL` (GHL). No DB write, just the webhook call + `ok: true` response (`app/api/roi/capture/route.ts:5`).
- POST `/api/leads` — unauth; upserts to `kyra_waitlist` + fires a Resend email to `angel@conversionsystem.com`. Basic email regex only; no CAPTCHA, no rate limit, no dedupe beyond the unique-email upsert (`app/api/leads/route.ts:19`). Spamable.

## /api/portal

One route.

- POST `/api/portal/[clientId]/chat` — unauth public chat; IP limiter 20/60s; streams through per-client OVH gateway. Gateway tokens never hit the browser (proxied server-side) (`app/api/portal/[clientId]/chat/route.ts:20`). This is the canonical "end-customer talks to an agency's worker without an account" endpoint.
- POST `/api/portal/invite` / `/api/portal/accept` — Supabase JWT gated; invite + accept flow for white-label client portals.

## /api/agency

176 routes under `agency/` — the biggest surface. All `requireAgencyMember()` gated with a handful of exceptions noted below. The middleware resolves the caller's agency by `agency_members.user_id = auth.uid()`, scopes queries to that agency, and rejects cross-agency client IDs.

Top-level domains:

- **Clients** (`agency/clients/*`): CRUD + per-client sub-resources (bookings, capabilities, conversations, dispatch, email campaigns, funnels, GHL connection, GSC, health score, heatmap, knowledge, memory, messages, permissions, reply, reprovision, scheduled tasks, secrets, SEO, skills, SMS, tasks, templates, threads, usage, video generation, widget stats, WordPress, workflows).
- **CRM** (`agency/crm/*`): activities, analytics, autopilot, companies, contacts (+bulk), deals, feed, export/import, intelligence, merge, rules, score, segments, tags, tasks.
- **Email** (`agency/email/*`): sequences with steps + analytics + AI-write + test-send; nurture stats.
- **Pipeline** (`agency/pipeline/*`): outbound cold outreach automation — campaigns, leads, activities, follow-ups, AB tests, enrichment, GHL integration, approvals, launches, webhooks.
- **Sites** (`agency/sites/*`): per-client marketing sites — build, generate, deploy, pages, photos, SEO sub-tree. Five of these have `maxDuration: 60-300s` in `vercel.json:7-11`.
- **Gateway** (`agency/gateway/*`): provision, restart, destroy the agency's Fly.io / OVH container.
- **Knowledge** (`agency/knowledge/*`): auto-train, import-url, sync.
- **Leads** (`agency/leads/*`): push to GHL (direct + OAuth), run campaigns, web-chat fallback.
- **Settings**, **Credits**, **API keys**, **Members**, **Roles**, **Templates**, **Agents**, **AI-setup**, **AI-model**, **Automations**, **Calendar**, **Fleet**, **Outreach**, **Performance**, **Review queue**, **Sales pipeline**, **Ultron summary**, **Usage**, **Web intelligence**, **Worker performance**, **Analytics** (incl. chat-widget, intelligence, overview), **Plan status**, **Router stats**, **Stats**, **Intelligence**.

Representative endpoints:

- POST `/api/agency/clients` — create a new client (triggers container provisioning)
- GET `/api/agency/clients/[id]/conversations` — unified inbox view
- POST `/api/agency/clients/[id]/chat` — agency-side test chat against client's container
- POST `/api/agency/gateway/provision` — spin up Fly.io gateway for this agency
- POST `/api/agency/credits/reconcile` — reconcile Stripe credit balance drift
- POST `/api/agency/pipeline/run` — kick off an outbound campaign run
- POST `/api/agency/sites/[id]/deploy` — Vercel deploy (maxDuration 300)
- POST `/api/agency/knowledge/auto-train` — scrape URL → chunk → Pinecone embed

## /api/webhooks

Seven routes under the webhook prefix plus several "webhook" routes scattered outside it.

| Method | Path | Signature / Auth | Events |
|---|---|---|---|
| POST | `/api/webhooks/stripe` | `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)` (`app/api/webhooks/stripe/route.ts:296`) | `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_succeeded/failed` |
| POST | `/api/webhooks/ghl` | HMAC-SHA256 via `GHL_WEBHOOK_SECRET` OR shared-secret header/query (`app/api/webhooks/ghl/route.ts:37`) | `InboundMessage`, `OutboundMessage`, Contact*, Opportunity*, Appointment*, `CallCompleted`, `FormSubmission`, `SurveySubmission`, `ConversationUnreadUpdate` |
| POST | `/api/webhooks/onfleet/[clientId]` | (not shown here — token in path) | Onfleet dispatch events |
| POST | `/api/webhooks/onfleet` | Legacy query-string `?clientId=` forwarder (`app/api/webhooks/onfleet/route.ts:29`) |
| POST | `/api/webhooks/openclaw-usage` | Bearer token OR `x-kyra-secret` matching `OPENCLAW_USAGE_WEBHOOK_SECRET` (`app/api/webhooks/openclaw-usage/route.ts:18`) | Tallies per-client credit deduction from OpenClaw router |
| POST | `/api/webhooks/resend` | **No signature check** (`app/api/webhooks/resend/route.ts:9`) | `email.delivered/opened/clicked/bounced/complained` |
| POST | `/api/webhooks/unsubscribe` | (likely token-based) | One-click unsubscribe |

The Stripe handler is the canonical example: `export const runtime = 'nodejs'`, reads `request.text()` for raw body, constructs the event with the webhook secret, then routes to per-event handlers. It grants credits idempotently keyed on `checkout:${session.id}` / `sub_renewed:${sub.id}:${period_start}` / `invoice:${invoice.id}`.

GHL has two-mode auth: marketplace HMAC signature *or* a shared-secret header. The handler builds an in-memory `Map<messageId, timestamp>` for dedup (capped at 1000 entries). For InboundMessage it has two paths: `processWithSmartEngine` (when client has GHL tokens) or `forwardToContainer` (the OVH gateway). It also logs each event to `ghl_webhook_logs`.

**Critical: `/api/webhooks/resend` has no signature verification** (`app/api/webhooks/resend/route.ts:9`). Anyone who knows the URL can inject fake `email.bounced` events to mark contacts as bounced, fake `email.complained` to force unsubscribes, or flood with fake `opened`/`clicked` to inflate scoring. Resend provides webhook secrets via `svix-id`/`svix-signature` headers — these are not checked.

**Also unsigned: `/api/voice/retell/webhook`** (`app/api/voice/retell/webhook/route.ts:25`). No Retell signature verification on `call_started`/`call_ended`/`call_analyzed`. An attacker can inject fake call records that write to `client_conversations`, `voice_usage` (billing-impacting), and `crm_activities`. Retell supports webhook signatures; they need to be added.

Webhooks living **outside** `/api/webhooks/`:

- `/api/ghl/webhook` — earlier version of the GHL handler (dup).
- `/api/crm/webhook` — newer GHL handler, renamed because "GHL blocks webhook URLs with 'ghl' in them" (`app/api/crm/webhook/route.ts:1`). Optional `x-webhook-secret` — only enforced if `GHL_WEBHOOK_SECRET` is set (fails open if env var unset).
- `/api/crm/callback` — GHL OAuth callback.
- `/api/channels/discord/webhook`, `/api/channels/telegram/webhook`, `/api/channels/whatsapp/webhook`, `/api/channels/voice-webhook` — provider webhooks; WhatsApp does challenge/response via `WHATSAPP_VERIFY_TOKEN` (`app/api/channels/whatsapp/webhook/route.ts:27`); Telegram checks nothing (relies on obscurity — bot path not guessable, but a leaked token would be catastrophic) (`app/api/channels/telegram/webhook/route.ts:20`).
- `/api/voice/twilio/webhook`, `/api/voice/twilio/gather` — Twilio form-encoded webhooks; `TWILIO_AUTH_TOKEN` mentioned in header comment (`app/api/channels/voice-webhook/route.ts:15`) but the snippet checked does not call `twilio.webhook.validate` on the signature — worth a deeper look.
- `/api/pipeline/webhooks` (under `agency`) — outbound pipeline event dispatcher (Kyra → customer webhook URLs).
- `/api/inbound/webhook` — Zapier/Make/n8n universal entry; verified via per-client `webhook_token` stored in `container_config` (`app/api/inbound/webhook/route.ts:98-106`). Reasonable — tokens are per-client.
- `/api/stripe/webhooks` — **Secondary Stripe handler, intentionally disabled in the Stripe dashboard** (`app/api/stripe/webhooks/route.ts:1-6`). Exists only as a failover. Duplicates `/api/webhooks/stripe` entirely.
- `/api/stripe/credits/webhook` — Stripe webhook specifically for credit-pack `checkout.session.completed` using `STRIPE_CREDITS_WEBHOOK_SECRET` (different secret from the main Stripe webhook) (`app/api/stripe/credits/webhook/route.ts:13`).

## /api/cron

16 scheduled routes, all registered in `vercel.json:17-78` and all gated by `requireCron(req)` which fails closed if `CRON_SECRET` is unset (`lib/auth/cron.ts:27`).

| Cron | Schedule | Purpose |
|---|---|---|
| `/api/cron/scheduled-tasks` | `*/30 * * * *` | Executes user-defined scheduled tasks and autopilot actions per client by calling their gateway (`app/api/cron/scheduled-tasks/route.ts:100`) |
| `/api/cron/weekly-report` | `0 8 * * 1` (Mon 8am UTC) | Generates + emails weekly agency reports |
| `/api/cron/email-sequence` | `0 8 * * *` (daily 8am) | Advances email nurture sequences |
| `/api/cron/follow-ups` | `0 * * * *` (hourly) | Sends pipeline follow-up messages |
| `/api/cron/crm-autopilot` | `0 7 * * *` (daily 7am) | Runs CRM autopilot actions |
| `/api/cron/briefing` | `0 8 * * *` (daily 8am) | Emails daily briefing to clients |
| `/api/cron/seo-worker` | `0 6 * * 1-5` (weekdays 6am) | Runs SEO keyword/rank work |
| `/api/cron/seo/gsc-sync` | — | GSC data sync (not in vercel.json — on-demand?) |
| `/api/cron/seo/publish-queue` | — | SEO publish queue |
| `/api/cron/alerts` | `*/30 * * * *` | Evaluates `agency_alerts` rules and fires notifications |
| `/api/cron/terminal-credits` | `*/30 * * * *` | Reconciles terminal credit usage from gateway |
| `/api/cron/gateway-token-sync` | `0 4 * * *` (daily 4am) | Rotates gateway tokens |
| `/api/cron/usage-alerts` | `0 8 * * *` | Low-credit / over-usage email alerts |
| `/api/cron/worker-tasks` | `*/30 * * * *` | Drains Kyra Worker task queue |
| `/api/cron/idle-containers` | `0 4 * * *` | Pauses idle gateways |
| `/api/cron/container-health` | `*/5 * * * *` | Per-5min gateway health probe |
| `/api/cron/dispatch-optimize` | `*/15 * * * *` | Dispatch (Onfleet) route optimization |

Cron auth accepts `Authorization: Bearer <CRON_SECRET>` or `?secret=<CRON_SECRET>`. Vercel cron sends the bearer form automatically. Two cron files (`seo/gsc-sync`, `seo/publish-queue`) are not in `vercel.json` — they exist as endpoints but presumably are invoked from other cron runs or manually. Worth confirming they aren't dead code.

## Streaming endpoints

Four places implement streaming. Three use the `ReadableStream + SSE` pattern; one proxies a native streaming body.

1. **`/api/chat`** (`route.ts:383-568`) — true token-by-token streaming from Claude via `for await (chunk of streamChat(...))`. Emits typed SSE events; most complete example.
2. **`/api/chat/openclaw`** (`openclaw/route.ts:247-286`) — fake streaming: awaits full OpenClaw response, then slices into 20-char chunks. Preserves client contract.
3. **`/api/chat/worker`** — (not examined here; imported dynamically by `/api/chat`). Likely similar to `/api/chat`.
4. **`/api/portal/[clientId]/chat`** (`portal/[clientId]/chat/route.ts:116-163`) — proxies a true streaming body from the OVH gateway (`gatewayRes.body`) by reading/decoding/re-emitting. Handles both SSE and non-SSE upstream.
5. **`/api/try`** (`try/route.ts:128-155`) — edge runtime, true OpenAI-compatible streaming. Emits `data: {content}\n\n` frames.
6. **`/api/agency/clients/[id]/chat`** — agency-side test chat (not fully examined; likely streaming).

No streaming uses `TransformStream` or Vercel's edge stream helpers — all go through `new ReadableStream({ start(controller) })`.

## External integrations exposed via API

### GHL (GoHighLevel)

- `/api/ghl/callback` — OAuth return landing pad (stores tokens per-agency).
- `/api/ghl/poll` — manual refresh/poll endpoint.
- `/api/ghl/webhook` — legacy GHL webhook receiver (pre-rename).
- `/api/crm/webhook` — current GHL webhook (GHL blocks URLs containing "ghl").
- `/api/webhooks/ghl` — marketplace-mode GHL webhook.
- `/api/agency/ghl/connect|disconnect|status` — agency-scoped OAuth lifecycle.
- `/api/agency/clients/[id]/ghl/connect|disconnect|create-subaccount|request-subaccount|audit|actions|connect-token|test-connection` — per-client GHL CRUD.
- `/api/agent/ghl-tool` — agent-side tool invocation wrapper.

Pattern: **three different webhook receivers** ultimately route to the same `processWithSmartEngine` / `forwardToContainer` handlers. This is historical baggage — `/api/ghl/webhook` + `/api/crm/webhook` + `/api/webhooks/ghl` are redundant. Consolidation: keep `/api/webhooks/ghl`, make the others thin aliases.

### Stripe

- `/api/billing/checkout` — **returns 400 unconditionally** because billing is disabled during beta (`app/api/billing/checkout/route.ts:4`).
- `/api/billing/portal` — Stripe Customer Portal.
- `/api/stripe/checkout` — Creates subscription or voice add-on checkout session; owner/admin only (`app/api/stripe/checkout/route.ts:22`).
- `/api/stripe/portal` — duplicate of `/api/billing/portal`.
- `/api/stripe/webhooks` — **secondary, disabled in Stripe** (`app/api/stripe/webhooks/route.ts:1-6`).
- `/api/webhooks/stripe` — primary.
- `/api/stripe/credits/route.ts` — initiate credit-pack checkout.
- `/api/stripe/credits/webhook` — credit-pack fulfillment webhook (separate secret).
- `/api/stripe/connect/onboard|dashboard|status` — Stripe Connect for agencies who want to resell.
- `/api/stripe/env-check` / `/api/stripe/test` — debugging helpers. **`env-check` and `test` should not be live in prod** — need auth review.
- `/api/stripe/premium-template` — premium template purchase.

Overlap: `/api/billing/checkout` vs `/api/stripe/checkout` (one disabled, one active). `/api/billing/portal` vs `/api/stripe/portal` (near-identical). `/api/webhooks/stripe` vs `/api/stripe/webhooks` (one active, one disabled). Three active Stripe webhook secrets: `STRIPE_WEBHOOK_SECRET`, `STRIPE_CREDITS_WEBHOOK_SECRET`, and the disabled one. Three is defensible (subscriptions / credits / connect), but the naming is confusing.

### Voice (Retell + Twilio)

- `/api/voice/assistants` — list, provision-phone variant.
- `/api/voice/call-logs` — inbox view.
- `/api/voice/ghl-sync` — push voice events into GHL.
- `/api/voice/outbound` — kick an outbound AI call.
- `/api/voice/recording-status` — Twilio recording status callback.
- `/api/voice/retell/{agents,calls,phone-numbers}` — Retell management proxy.
- `/api/voice/retell/webhook` — Retell event webhook (**no signature check**).
- `/api/voice/transcribe` / `/api/voice/transcribe-recording` — Whisper transcription.
- `/api/voice/tts` — text-to-speech.
- `/api/voice/twilio/{gather,outbound-twiml,webhook}` — Twilio voice webhooks.
- `/api/voice/usage` — per-agency minute counter.
- `/api/voice/webhook` — generic voice webhook.
- `/api/channels/voice-webhook` — fallback voice endpoint (overlaps `/api/voice/webhook`).

Pattern: Retell and Twilio are the two providers; Retell is newer. Webhooks should all signature-verify; spot-check shows they don't.

### OpenClaw

- `/api/openclaw/channels` / `/api/openclaw/channels/pair` — bind external channels to OpenClaw session.
- `/api/openclaw/dashboard-url` — mint authenticated URL to OpenClaw web UI.
- `/api/openclaw/health` — upstream health probe.
- `/api/openclaw/tools` — list available skills.

### ClawHub

- `/api/clawhub` — skill marketplace search/browse proxy with 5-min in-memory cache (`app/api/clawhub/route.ts:12`).
- `/api/clawhub/install` — install a skill to a client's container (cookie-gated agency member).

### Firecrawl

- `/api/fc/[...path]` — **catch-all reverse proxy** to `api.firecrawl.dev`. Agencies send `Authorization: Bearer kyra-agency-{agencyId}`; Kyra extracts the agencyId, checks per-plan monthly scrape limits, forwards with the master `FIRECRAWL_API_KEY`, then increments usage (`app/api/fc/[...path]/route.ts:94-209`). Pass-through list for status/health. 402 for unauthorized plans, 429 when over cap. Clean pattern.

## Admin/master/debug endpoints — protection summary

| Route | Protection |
|---|---|
| `/api/admin/orphaned-users` | **None** — public leak of auth emails |
| `/api/admin/health-check` | **None** — leaks env/migration status + migration SQL |
| `/api/admin/batch-regen` | `KYRA_API_SECRET` bearer |
| `/api/admin/ghl-register-webhooks` | `KYRA_API_SECRET` OR `CRON_SECRET` bearer |
| `/api/admin/qa-health` | `X-Admin-Key` OR service-role header |
| `/api/admin/{accounts,stats,kyra-stats,login-as,reset-password,…}` | Supabase cookie JWT + email allowlist (hardcoded) |
| `/api/master/*` | Supabase cookie JWT + MASTER_EMAILS allowlist |
| `/api/debug` | Supabase cookie JWT + hardcoded emails |
| `/api/stripe/env-check`, `/api/stripe/test` | Unknown — worth a direct read |

Actions:
1. Protect `/api/admin/orphaned-users` and `/api/admin/health-check` immediately.
2. Extract the admin allowlist into `lib/auth/admin.ts` so all three copies stay in sync.
3. Add `admin_audit_log` inserts on `impersonate`, `login-as`, `reset-password`, `credits` mutations.

## Duplicate / overlapping routes

- **GHL webhook**: `/api/webhooks/ghl`, `/api/ghl/webhook`, `/api/crm/webhook` — three implementations.
- **Stripe webhook**: `/api/webhooks/stripe` (primary), `/api/stripe/webhooks` (secondary, disabled).
- **Stripe checkout**: `/api/billing/checkout` (disabled 400), `/api/stripe/checkout` (active).
- **Stripe portal**: `/api/billing/portal`, `/api/stripe/portal`.
- **Impersonation**: `/api/master/impersonate`, `/api/admin/accounts/[id]/login-as`.
- **Onfleet webhook**: `/api/webhooks/onfleet` (legacy query-string), `/api/webhooks/onfleet/[clientId]` (new path-based).
- **Voice webhooks**: `/api/voice/webhook`, `/api/voice/twilio/webhook`, `/api/channels/voice-webhook`, `/api/voice/retell/webhook` — four distinct voice entry points with overlapping responsibilities.
- **Agency ultron vs intelligence**: `/api/agency/ultron/summary`, `/api/agency/analytics/intelligence`, `/api/agency/intelligence` — names suggest convergent evolution.
- **Chat paths**: `/api/chat`, `/api/chat/openclaw`, `/api/chat/worker` — this is fine, it's a feature-flag fan-out.

## Route-level concerns

- **Unsigned Resend webhook** (`app/api/webhooks/resend/route.ts:9`) — can fake email events, force unsubscribes, inflate engagement scores. Add `svix-signature` verification.
- **Unsigned Retell webhook** (`app/api/voice/retell/webhook/route.ts:25`) — can fake call records, write fraudulent CRM activities, inflate `voice_usage` minutes.
- **Unauth admin info leak** (`app/api/admin/orphaned-users/route.ts:6`, `app/api/admin/health-check/route.ts:26`) — both return admin data with zero auth.
- **`/api/public/workers`** (`app/api/public/workers/route.ts:4`) — no auth, no pagination cap. Leaks `client.id` UUIDs. These IDs are inputs to public chat/widget/portal routes. Enumeration concern.
- **`/api/leads`** (`app/api/leads/route.ts:19`) — no rate limit, no CAPTCHA. Spam vector into `kyra_waitlist` + automated notification emails to `angel@conversionsystem.com`.
- **`/api/playground/chat`** (`app/api/playground/chat/route.ts:35`) — calls `api.openai.com` with an OpenRouter model slug. Likely broken unless `OPENAI_API_KEY` is an OAI-compat OpenRouter key — worth verifying.
- **`/api/auth/callback`** (`app/api/auth/callback/route.ts:10-29`) — accepts `?redirect=` and `?next=` both. Origin-prefixed so not an open-redirect, but any app path is allowed. Consider path allowlist.
- **`/api/crm/webhook` fail-open** (`app/api/crm/webhook/route.ts:48-54`) — if `GHL_WEBHOOK_SECRET` env var is unset, the auth check is skipped. Should fail closed.
- **`/api/ghl/webhook` verify short-circuits** (`app/api/webhooks/ghl/route.ts:40-45`) — warns but returns true when `GHL_WEBHOOK_SECRET` is missing. Same pattern.
- **Memory-based idempotency in GHL webhook** (`app/api/webhooks/ghl/route.ts:233-246`) — `Map<messageId, timestamp>` doesn't survive cold starts; duplicates possible across instances. Use Supabase `ghl_webhook_logs` uniqueness instead.
- **`/api/chat/route.ts` CORS = app URL**, but `/api/chat/openclaw/route.ts:42` CORS = `'*'`. Inconsistent. The OpenClaw path allows any origin to reach authenticated user chat — not a vuln per se (auth still required), but inconsistent.
- **Many routes silently swallow errors with `.catch(() => {})`** — e.g. `app/api/webhooks/ghl/route.ts:383` and `404`, `app/api/chat/openclaw/route.ts:307`. Good for UX, bad for ops. No trace ID hook visible.
- **Missing input validation** across unauth endpoints: `/api/try` does not validate `industry` (defaults to "dental"), `/api/leads` accepts arbitrary `message` field that ends up in email HTML unescaped (`app/api/leads/route.ts:65` — direct interpolation into `${body.message}` in HTML string — stored XSS risk in the admin email).
- **N+1 deduction loop** in `/api/webhooks/openclaw-usage/route.ts:62-66`: `for (let i = 0; i < totalCredits; i++) { await deductCredits(...) }` — if `count * creditsPerTurn` is large, this makes one DB round-trip per credit. Should batch.
- **Auto-creation of orphan records**: `/api/widget/[clientId]/lead/route.ts:46-77` auto-creates `agency_clients` rows when a lead hits an unknown clientId but matches a site row. Convenient but surprising — generates writes in response to anonymous input.

## Cross-cutting patterns

- **Auth models** (in order of usage):
  1. Supabase cookie JWT + `requireAgencyMember()` — the vast majority (agency/* tree).
  2. Supabase cookie JWT + hardcoded email allowlist — admin/master/debug.
  3. Bearer shared secret (`KYRA_API_SECRET`, `CRON_SECRET`, `STRIPE_WEBHOOK_SECRET`, etc.) — cron + provider webhooks + cross-service calls.
  4. Provider-specific HMAC signatures — Stripe, GHL (marketplace mode), WhatsApp (verify-token challenge).
  5. Per-resource tokens — `/api/inbound/webhook` uses per-client `webhook_token`, widget script uses `clientId` as capability token.
  6. None — portal chat, widget chat, try, playground, leads, roi, public workers, roi/capture, admin/orphaned-users, admin/health-check.

- **Service-role vs cookie clients**: authenticated routes typically use `createClient()` (cookie-scoped, RLS-enforced) for auth and `createServiceClient()` / `createServiceClientWithoutCookies()` for DB writes. The service client bypasses RLS. This is standard but means the caller's agency scoping happens in application code, not at the DB layer, for writes — a wrong `eq('agency_id', ...)` filter on a service query silently returns cross-tenant data.

- **Rate limiting**: `lib/rate-limit.ts` is Supabase-backed (`isRateLimited`) and persists across cold starts; used by widget, portal, playground. `/api/try` uses an in-memory edge limiter that resets per instance — weaker. `/api/leads` has no rate limit.

- **CORS**: most public endpoints use `Access-Control-Allow-Origin: *`. `/api/chat` uses `process.env.NEXT_PUBLIC_APP_URL`. `/api/widget/[clientId]/script` sets `*` explicitly because the JS is embedded on external origins.

- **Shape of responses**: authenticated JSON routes generally return `NextResponse.json(...)`. Streaming returns a raw `new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })`. Error shapes are inconsistent — sometimes `{ error: string }`, sometimes `{ error: string, message: string, buyUrl: '/…' }`, sometimes `{ ok: false }`.

- **`export const dynamic = 'force-dynamic'`** set on ~30 routes (cron, webhooks, edge-sensitive). `export const maxDuration` set on long-running routes (site build 300s, deploys 300s, dispatch 60s, widget 45s, scheduled-tasks 60s, clawhub/install 30s). `export const runtime = 'edge'` used only on `/api/try`. `runtime = 'nodejs'` explicit on `/api/webhooks/stripe` to get raw body.

- **Credit system**: every billable action goes through `deductCredits(agencyId, action, { override, clientId, description })` with action strings like `chat.message`, `chat.web_search`, `chat.image_analysis`, `chat.file_analysis`, `chat.deep_research`, `channel.ghl_sms`, `channel.voice_call`, `channel.inbound_webhook`. Model-aware cost via `getCreditsForModel(modelId)`. Centralized in `lib/billing/credit-engine.ts` and `lib/billing/model-credits.ts`. Clean.
