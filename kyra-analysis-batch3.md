# Kyra HTTP API Surface Analysis (Batch 3)

Repo `HEAD` 9bdbb95d — 357 `route.ts` files under `app/api/`. Domains, auth model, webhook signing, crons, streaming, integrations, admin surface, duplicates, and security concerns.

## Admin

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/webhook-health` | **NEW** — Stripe webhook endpoint health status via `getWebhookHealth()` |
| GET | `/api/admin/orphaned-users` | Lists auth users with no `agency_members` row (top 200) |
| GET | `/api/admin/health-check` | Env/migration checklist (RESEND, `agency_referrals`, `kyra_waitlist`) |
| GET | `/api/admin/stats` | Full user stats + MRR estimate (legacy per-user `users` table) |
| GET | `/api/admin/kyra-stats` | Granular growth metrics: MRR, ARPU, activation, churn, referrals |
| GET/POST | `/api/admin/accounts` + `/[id]` | List all agencies, per-agency detail |
| POST | `/api/admin/accounts/[id]/credits` | Grant credits to an agency |
| POST | `/api/admin/accounts/[id]/login-as` | Generate magic link → impersonate owner |
| POST | `/api/admin/accounts/[id]/reset-password` | Force password reset |
| POST | `/api/admin/batch-regen` | Regenerate containers in bulk |
| POST | `/api/admin/enable-weekly-report` | Flip `weekly_report_enabled` for an agency |
| POST | `/api/admin/ghl-backfill` | Backfill GHL contacts |
| POST | `/api/admin/ghl-register-webhooks` | Register GHL Marketplace webhooks |
| POST | `/api/admin/migrate-contacts` | One-off CRM migration |
| GET/POST | `/api/admin/nurture-audit` · `/nurture-trigger` | Audit/trigger email nurture |
| POST | `/api/admin/qa-health` | QA suite trigger |
| POST | `/api/admin/router-migrate` | Model router migration (uses env `MASTER_EMAILS`) |
| POST | `/api/admin/seed-templates` | Seed template library |
| POST | `/api/admin/seo/seed-pack/[industry]` | Seed SEO topic packs |
| POST | `/api/admin/sync-leads` | Reconcile `kyra_waitlist` ⇄ CRM |
| GET/POST | `/api/admin/content-calendar` · `/recent-topics` | Marketing content planner |

### Admin auth model — protection table

| Route | Auth | Allowlist source |
|---|---|---|
| `/api/admin/webhook-health` | Supabase cookie → email ∈ `ADMIN_EMAILS` | hardcoded 2 (`hello@`, `angel@`) (`app/api/admin/webhook-health/route.ts:14`) |
| `/api/admin/orphaned-users` | **NONE** (service client, no auth check) | — (`app/api/admin/orphaned-users/route.ts:6`) |
| `/api/admin/health-check` | **NONE** | — (`app/api/admin/health-check/route.ts:26`) |
| `/api/admin/stats` | cookie → `ADMIN_EMAILS` | 3 emails **including `steve@`** (`app/api/admin/stats/route.ts:4`) |
| `/api/admin/kyra-stats` | cookie → `ADMIN_EMAILS` | 2 emails only — `steve@` missing (`app/api/admin/kyra-stats/route.ts:8`) |
| `/api/admin/accounts` + nested | cookie → `MASTER_EMAILS` | 2 emails (`app/api/admin/accounts/route.ts:6`) |
| `/api/admin/router-migrate` | cookie → env `MASTER_EMAILS` split(',') | uses env var (drift from hardcoded) (`app/api/admin/router-migrate/route.ts:14`) |
| `/api/admin/seed-templates` · `/seo/seed-pack/[industry]` · `/ghl-backfill` etc | cookie → `MASTER_EMAILS` | hardcoded 2 |
| `/api/admin/content-calendar` | cookie → `ADMIN_EMAILS` (3-entry list) | includes `steve@conversionsystem.com` |
| `/api/debug` | cookie → `ADMIN_EMAILS` | 2 emails (`app/api/debug/route.ts:6`) |
| `/api/master/vps-health` · `/stats` · `/impersonate` | cookie → `MASTER_EMAILS` | 2 emails |
| `/api/stripe/env-check` · `/test` | cookie → `MASTER_EMAILS` | 2 emails |

**Critical findings:**

- `/api/admin/orphaned-users` (`route.ts:6`) has **zero auth** and returns up to 200 auth emails with `created_at`. An unauthenticated attacker can enumerate real user emails. Same pattern as `/api/admin/health-check` but more sensitive — health-check returns env/migration state (SQL DDL inline), leaking both infra posture and the production Supabase project ID `yaijdtsunxicuphrakcc` (`route.ts:50`).
- **Three-location allowlist drift.** `admin/stats` includes `steve@conversionsystem.com` (`route.ts:4`); `admin/kyra-stats` does not (`route.ts:8`); `admin/webhook-health` does not; `content-calendar` does; `router-migrate` pulls from `process.env.MASTER_EMAILS` string split. Rotating a founder's email in one spot silently de-syncs the others.
- `/api/admin/accounts/[id]/login-as` (`route.ts:8`) and `/api/master/impersonate` (`route.ts:8`) are **duplicate impersonation endpoints** — both generate a Supabase magic-link for arbitrary user, both gated by `MASTER_EMAILS`, identical behaviour. One should be removed.

## Agency

~100 endpoints, the largest domain. All protected by Supabase cookie auth via `createClient()` + `agency_members` lookup or `requireAgencyMember()` / `requireAgencyAdmin()` / `requireAgencyOwner()` at `lib/agency/middleware.ts`.

### Notable sub-clusters

| Path | Purpose |
|---|---|
| `/api/agency/gateway/{provision,destroy,restart,status}` | OVH per-client gateway lifecycle |
| `/api/agency/clients/[id]/{heatmap,memory,sparkline,export,reprovision,health-score,knowledge,skills,usage,templates,scheduled-tasks,ghl/connect,ghl/disconnect,secrets,email/campaigns,email/contacts}` | Per-client admin actions |
| `/api/agency/clients/[id]/chat` | True SSE stream proxy to per-client OVH gateway (`route.ts:120-206`) |
| `/api/agency/crm/{companies,contacts,rules,score,segments,tags,merge,tasks,autopilot,intelligence,import,export}` | In-app CRM |
| `/api/agency/pipeline/{leads,ab-tests,activity,analytics,approve,campaigns,conversations,follow-ups,launch,enrich,run,webhooks}` | Outreach / closer pipeline |
| `/api/agency/leads/{push-ghl,push-ghl-direct,run-campaign,campaign-status,web-chat}` | Lead pushing + AI campaigns; `push-ghl-direct`, `run-campaign`, `campaign-status` additionally gate on `MASTER_EMAILS` (`campaign-status/route.ts:19,71`) |
| `/api/agency/sites/[id]/{build,generate,deploy,pages,growth,photos,leads,deploys,sync-status}` | Hosted mini-sites, 5-minute Vercel function limits (vercel.json:4-6) |
| `/api/agency/credits/{reconcile,bonus,usage}` | Credit admin |
| `/api/agency/knowledge` + `import-url` + `sync` | Knowledge base training |
| `/api/agency/outreach/setup` | **Extra lock** — also gates on `MASTER_EMAILS` (`route.ts:59,104`) despite being under `/agency/` |
| `/api/agency/settings/test-webhook` | Fires a test webhook using stored URL |

`/api/agency/clients/[id]/chat` is a true body-proxy (reads upstream OVH `ReadableStream`, re-emits OpenAI-delta parsing as `{type:'content', content}` — `route.ts:162-206`). Model-aware pre-flight credit check via `requireCredits` (`route.ts:63-77`).

## Agent

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/agent/ghl-tool` | OpenClaw container → GHL tool bridge. Auth: Bearer `gateway_token`, DB lookup on `agency_clients.gateway_token` (`app/api/agent/ghl-tool/route.ts:38-54`) |
| POST | `/api/agent/crm-context` | Container fetches CRM context for a contact |

Both are called from *inside* agency containers. Bearer gateway-token model is consistent with `/api/secrets/[key]`.

## Auth

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/auth/callback` | Supabase PKCE exchange + optional referral activation |
| POST | `/api/auth/signout` | Clear session |
| POST | `/api/auth/solo-signup` | One-shot free signup (saga: auth→agency→member→credits→client→container) |
| POST | `/api/auth/signup-intent` | Log abandoned-signup emails to GHL webhook |
| GET | `/api/auth/google/callback` | OAuth code exchange → Google Calendar tokens |
| GET | `/api/auth/google` | Redirect to Google consent |
| GET | `/api/auth/gsc/callback` · `/api/auth/gsc` | GSC (Google Search Console) OAuth |

**Concerns:**
- `/api/auth/callback` (`route.ts:10-11`) reads both `?redirect` and `?next` query params and passes *either one* through to `NextResponse.redirect(origin + destination)`. The only constraint is `destination.includes('reset-password')` for recovery. **Any path that starts with `/` is accepted** — including `/../..`? The interpolation is `origin + destination`, not `new URL(destination, origin)`, so an attacker-controlled `redirect=//evil.com` would produce `https://kyra.conversionsystem.com//evil.com` — a protocol-relative URL. Browsers treat `https://host//evil.com` as `https://host/` path `//evil.com`, so Vercel routes it internally. But an attacker-supplied `redirect=/anywhere` with `data:` URL in a Meta-refresh etc. is an open-redirect primitive depending on downstream interpretation. Worth verifying.
- `/api/auth/solo-signup` has a saga rollback with best-effort deletes. Rate-limited 5/IP/min. IP is taken from `x-forwarded-for` first entry without strict parsing.

## Billing

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/billing/checkout` | **DISABLED** (returns 400 "Billing is disabled during the beta") (`app/api/billing/checkout/route.ts:5`) |
| POST | `/api/billing/portal` | **DISABLED** (same) (`app/api/billing/portal/route.ts:5`) |

Only stubs — live billing lives under `/api/stripe/*`.

## Briefing, Build-Request, Business-Box, Briefing

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/briefing` | Legacy daily briefing (replaced by `/api/cron/briefing`) |
| POST | `/api/build-request` | Submit a build request for a mini-site |
| POST | `/api/business-box` | Generate a "business box" onboarding artifact |

## Channels

Connect + webhook for each external chat channel.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/channels/discord/connect` · `/telegram/connect` · `/whatsapp/connect` | User-initiated channel pairing, generates 6-char token |
| POST | `/api/channels/discord/webhook` | Ed25519 signature verification (`route.ts:20-42`) |
| POST | `/api/channels/telegram/webhook` | **No signature verification** — anyone who knows the URL can send fake messages (`route.ts:20`) |
| GET/POST | `/api/channels/whatsapp/webhook` | Meta verify_token GET challenge (`route.ts:22`), POST has **no signature check** (`route.ts:40`) — relies only on URL obscurity |
| GET | `/api/channels/status` | Connected-channel status for UI |
| POST | `/api/channels/twilio-sms` · `/email` · `/whatsapp-direct` · `/voice-webhook` | Channel-specific direct entry points |

**Security findings:**
- Telegram webhook accepts any POST, extracts `msg.from.id`, looks up `user_channels` by unverified `channel_user_id`. An attacker spoofing that path can receive another user's AI replies if they know the target's Telegram user ID. Depends on URL secrecy (set in Telegram Bot API).
- WhatsApp webhook has the same issue — the POST has no HMAC check against `WHATSAPP_APP_SECRET`. Meta sends an `x-hub-signature-256`; the code does not verify it.

## Chat

| Method | Path | Purpose | Streaming |
|---|---|---|---|
| POST | `/api/chat` | Top-level chat (per-user Kyra). Dispatches to `/chat/worker` when `features.useWorker`, else `/chat/openclaw`, else direct Claude | True SSE via `ReadableStream` with prompt-injection scan, memory search, skill tool loop (`streamChatWithTools`), credit deduct (`route.ts:381-568`) |
| POST | `/api/chat/openclaw` | OpenClaw session + chunked fake streaming (20-char slices of the full `result.content`) (`app/api/chat/openclaw/route.ts:285-291`) | Fake streaming |
| POST | `/api/chat/worker` | Multi-tenant worker. True pipe-through of gateway SSE, converts OpenAI delta to Kyra format (`route.ts:295-351`) | True (when gateway streams) + chunk fallback |
| POST | `/api/portal/[clientId]/chat` | **Unauth** public portal. Rate-limited, parses gateway SSE stream, re-emits. (`route.ts:116-164`) | True |
| POST | `/api/try` | `runtime = 'edge'`. OpenAI-compatible stream directly from OpenAI SDK. Rate-limited 20/min/IP. (`route.ts:11, 128-155`) | True |
| POST | `/api/agency/clients/[id]/chat` | Verified-member proxy to per-client gateway, streams (`route.ts:160-241`) + fire-and-forget log + credit deduct | True |
| POST | `/api/widget/chat` | Embedded widget. Direct LLM call (`getDirectLLMClient()`), not gateway. Non-streaming JSON. (`route.ts:469-501`) | Non-streaming |
| POST | `/api/playground/chat` | **Uses `api.openai.com` but model slug is OpenRouter format** — `openrouter/anthropic/claude-haiku-4.5` (`route.ts:35,42`). This will 404 unless `OPENAI_API_KEY` is an OpenRouter key, or it's a bug. |

## Clawhub, OpenClaw

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/clawhub` · `/install` | ClawHub skill registry |
| GET | `/api/openclaw/health` | Gateway health ping |
| GET | `/api/openclaw/tools` | List available tools |
| GET/POST | `/api/openclaw/channels` · `/pair` | Channel pairing |
| GET | `/api/openclaw/dashboard-url` | Generate iframe dashboard URL |

## CRM, GHL

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/crm/webhook` | **FAILS OPEN** if `GHL_WEBHOOK_SECRET` unset (`app/api/crm/webhook/route.ts:49-53`). When set, checks `x-webhook-secret` header or `?secret=`. Header name different from `/api/webhooks/ghl` and `/api/ghl/webhook`. |
| POST | `/api/crm/callback` | OAuth callback for GHL Marketplace install |
| GET | `/api/crm/test-callback` | Manual OAuth test |
| POST | `/api/ghl/webhook` | **FAILS OPEN** (`route.ts:32-38` — returns `true` with only a `console.warn`). Supports HMAC `x-ghl-signature` or shared-secret header/query. |
| GET | `/api/ghl/callback` | OAuth |
| GET | `/api/ghl/poll` | Poll GHL for missed messages |

**Three separate GHL inbound receivers — `/api/webhooks/ghl`, `/api/crm/webhook`, `/api/ghl/webhook` — all reading `agency_clients` by `ghl_location_id` and forwarding to the container's `/v1/chat/completions`.** Two of three fail-open without `GHL_WEBHOOK_SECRET`. Accept-header names drift (`x-webhook-secret` vs `x-kyra-secret` vs `x-ghl-signature` vs `x-hub-signature-256`). Only `/api/webhooks/ghl` has the in-memory idempotency dedup (`processedMessages` Map, TTL 5 min, cap 1000 entries — `route.ts:233-246`). Serverless lambdas do not share memory, so this dedup works only within a single instance's warm pool. On cold-start Vercel fleets the same GHL retry can reach different lambdas and be processed twice.

## Cron (15 scheduled + more unlisted)

Schedules from `vercel.json:14-75`. Every listed cron uses `requireCron(req)` from `lib/auth/cron.ts` — validates `Authorization: Bearer <CRON_SECRET>` or `?secret=`. Fails closed when `CRON_SECRET` unset (`lib/auth/cron.ts:27-29`).

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/scheduled-tasks` | `*/30 * * * *` | Scheduled task runner |
| `/api/cron/weekly-report` | `0 8 * * 1` | Monday 08:00 UTC weekly emails (`route.ts:15`) |
| `/api/cron/email-sequence` | `0 8 * * *` | Daily email sequence step |
| `/api/cron/follow-ups` | `0 * * * *` | Hourly follow-up dispatch |
| `/api/cron/crm-autopilot` | `0 7 * * *` | Daily CRM autopilot |
| `/api/cron/briefing` | `0 8 * * *` | Agency daily briefing via gateway (`route.ts:24-26`) |
| `/api/cron/seo-worker` | `0 6 * * 1-5` | Weekday SEO worker |
| `/api/cron/alerts` | `*/30 * * * *` | Alert rule evaluator (`route.ts:13-15`) |
| `/api/cron/terminal-credits` | `*/30 * * * *` | Terminal credits top-up |
| `/api/cron/gateway-token-sync` | `0 4 * * *` | Sync `agency_clients.gateway_token` from provisioner. Accepts extra secret `OVH_PROVISIONER_SECRET` via `extraSecretEnvVars` (`route.ts:99`). Also exposes `POST` behind `MASTER_EMAILS` for manual trigger (`route.ts:111-127`) |
| `/api/cron/usage-alerts` | `0 8 * * *` | Usage threshold alerts |
| `/api/cron/worker-tasks` | `*/30 * * * *` | Worker task runner |
| `/api/cron/idle-containers` | `0 4 * * *` | Idle container reaper |
| `/api/cron/container-health` | `*/5 * * * *` | Container health |
| `/api/cron/dispatch-optimize` | `*/15 * * * *` | Dispatch route optimizer |

Also present but **not scheduled** in `vercel.json`: `/api/cron/seo/gsc-sync`, `/api/cron/seo/publish-queue`.

## Stripe

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/stripe/checkout` | Subscription checkout (4 plans × monthly/annual + voice addon). Owner/admin only (`route.ts:47-49`) |
| POST | `/api/stripe/portal` | Customer Portal |
| POST | `/api/stripe/credits` | Credit-pack checkout (one-time payment) |
| POST | `/api/stripe/premium-template` | One-time template purchase |
| POST | `/api/stripe/connect/onboard` · `/dashboard` · `/status` | Stripe Connect for agencies to take their own payments |
| GET | `/api/stripe/env-check` | **MASTER_EMAILS gated** env presence check (`route.ts:5,11`) |
| POST | `/api/stripe/test` | **MASTER_EMAILS gated** — calls `stripe.accounts.retrieve()` |
| POST | `/api/webhooks/stripe` | **PRIMARY** webhook (registered with Stripe — `we_1TCcvQDr3LPJOIaMuaY1zJhG`, comment `route.ts:19-21`). Handles `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed/succeeded`. Verifies via `stripe.webhooks.constructEvent` (`route.ts:296`) |
| POST | `/api/stripe/webhooks` | **SECONDARY / disabled** (`route.ts:1-6` comment). Uses `verifyStripeWebhook` helper. Do not register. |
| POST | `/api/stripe/credits/webhook` | **THIRD** webhook for credit-pack fulfilment. Separate secret `STRIPE_CREDITS_WEBHOOK_SECRET` (`route.ts:13-25`) |

Three Stripe webhook endpoints, two stripe checkout routes (`/api/stripe/checkout` live + `/api/billing/checkout` disabled), two portal routes (`/api/stripe/portal` live + `/api/billing/portal` disabled). All live stripe webhooks verify signatures; the duplicate at `/api/stripe/webhooks` is kept but explicitly marked as disabled in the file header.

## Voice (Retell + Twilio + generic)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/voice/retell/webhook` | Retell lifecycle events (`call_started`, `call_ended`, `call_analyzed`). **No signature verification** at all (`app/api/voice/retell/webhook/route.ts:25-44`). CORS `*`, OPTIONS supported. |
| POST/GET | `/api/voice/twilio/webhook?clientId=XXX` | TwiML entry. No Twilio signature check (standard check is `X-Twilio-Signature` HMAC). Accepts any clientId, returns TwiML greeting. Recording & gather URLs built from `NEXT_PUBLIC_APP_URL`. (`app/api/voice/twilio/webhook/route.ts:39-84`) |
| POST | `/api/voice/twilio/gather` | Loops speech → AI → TwiML `<Say>` + `<Gather>`. Same unverified. |
| POST | `/api/voice/twilio/outbound-twiml` | Outbound TwiML generator |
| POST | `/api/voice/webhook?provider=vapi\|synthflow\|retell&clientId=XXX` | Generic voice webhook multiplexer (`app/api/voice/webhook/route.ts:14-126`). Passes to `parseWebhook` per provider. **No signature check** — comment on line 23 says "get raw body for signature verification" but code never verifies. |
| POST | `/api/voice/recording-status` | Twilio recording callback |
| POST | `/api/voice/transcribe-recording` | Whisper transcription of URL |
| POST | `/api/voice/transcribe` · `/tts` | User-facing STT/TTS |
| POST | `/api/voice/outbound` | Start outbound call |
| POST | `/api/voice/call-logs` · `/usage` | Logs + aggregate usage |
| POST | `/api/voice/ghl-sync` | Sync voice call to GHL contact |
| GET/POST | `/api/voice/assistants` · `/provision-phone` | Retell assistant + phone mgmt |
| GET/POST | `/api/voice/retell/{agents,calls,phone-numbers}` | Retell admin proxy |

**Four voice webhook entry points** (`/voice/retell/webhook`, `/voice/twilio/webhook`, `/voice/twilio/gather`, `/voice/webhook`) — none verify signatures. `/voice/retell/webhook` is especially exposed: it enqueues conversations/credits keyed by the `agent_id` found inside the payload.

## Webhooks

| Method | Path | Signature? | DB writes |
|---|---|---|---|
| POST | `/api/webhooks/stripe` | ✅ `stripe.webhooks.constructEvent` (`route.ts:296`) | `agencies`, `credit_transactions`, `agency_credits` |
| POST | `/api/webhooks/ghl` | ⚠ Fails open when `GHL_WEBHOOK_SECRET` unset (`route.ts:40-45`). HMAC `x-ghl-signature` or shared `x-kyra-secret` or `?secret=` | `agency_clients`, `client_conversations`, `ghl_webhook_logs`, `credit_transactions` |
| POST | `/api/webhooks/resend` | ❌ **NO verification** (no `svix-signature` check) (`app/api/webhooks/resend/route.ts:9`). Writes to `email_analytics`, `email_campaigns`, `email_contacts`, and boosts CRM `crm_contacts.score` for any email event an attacker claims. |
| POST | `/api/webhooks/openclaw-usage` | ✅ `OPENCLAW_USAGE_WEBHOOK_SECRET` via `Authorization: Bearer` **or** `x-kyra-secret`. Fails closed. (`route.ts:8-20`) |
| POST | `/api/webhooks/unsubscribe` | ❌ Public, anyone can unsubscribe any contact by knowing `{agency_id,email}` (`app/api/webhooks/unsubscribe/route.ts:9-17`). Used to support one-click unsubscribe; pair it with a signed token. |
| GET/POST | `/api/webhooks/onfleet/[clientId]` · `/api/webhooks/onfleet` (legacy) | Per-client `webhookSecret` via `?secret=` (`app/api/webhooks/onfleet/[clientId]/route.ts:69-71`), validated against `agency_clients.settings.sms.webhookSecret`. Legacy variant forwards to the path-based one. |

### Critical webhook concerns

- **`/api/webhooks/resend`** (`route.ts:9`): accepts any POST claiming to be a Resend event and writes event rows keyed by `resend_email_id`. Impact: an attacker can fabricate `opened`, `clicked`, `bounced`, `complained` events for known email IDs. `complained` forces `unsubscribeContact(camp.agency_id, recipientEmail, ...)`. Lines 105-166 auto-bump CRM `crm_contacts.score` by +5 (opened) or +10 (clicked) per event — no upper bound per attacker, only bound to 100 via `Math.min(100, ...)`. Combined with `/api/webhooks/unsubscribe` (also unauthenticated), an attacker with guessed agency/email pairs can tamper with CRM scoring and unsubscribe lists at will.
- **`/api/webhooks/openclaw-usage` N+1 loop** (`route.ts:62-66`): `for (let i = 0; i < totalCredits; i++) await deductCredits(...)` — if a router reports `count=50` turns on Claude Sonnet (75 credits/turn → 3,750 loops), this runs 3,750 sequential DB writes.
- **`/api/webhooks/ghl` in-memory dedup** (`route.ts:233-246`): Map per lambda instance, capped at 1000 entries with lazy eviction. Serverless = no shared memory → duplicates slip through on cold-start spread and after 5-minute TTL.
- **`/api/ghl/webhook` fails open** (`route.ts:32-38`): Returns `true` with console warning when `GHL_WEBHOOK_SECRET` unset, "dev mode / legacy". Production leaves this behaviour unless the env var is set.
- **`/api/crm/webhook` fails open** (`route.ts:49-53`): `if (webhookSecret)` pattern — when unset, any request passes.

## Public-facing marketing / tool endpoints

| Path | Auth | Concern |
|---|---|---|
| `/api/public/workers` | None | Returns `agency_clients.id` (UUID), `agency_clients.name`, industry, and `agencies(name)`. Comment says marketing gallery, but leaks **all non-deleted client UUIDs** across the platform. Paired with `/api/portal/[clientId]/chat` (unauth) an attacker can enumerate and chat as any customer's worker. (`app/api/public/workers/route.ts:9-53`) |
| `/api/portal/[clientId]/chat` | None + IP rate-limit (20/min) | Chat against live gateway, credits deducted from owning agency (`route.ts:107-110`). `client_id` is not secret (see above). |
| `/api/try` | Edge + IP rate-limit (20/min) | Demo personas hardcoded, stream via OpenAI SDK |
| `/api/widget/chat` | None + IP rate-limit (60/min) | Chat widget, triggers RAG + lead capture |
| `/api/widget/[clientId]/script` | None | Serves widget JS |
| `/api/widget/[clientId]/lead` | None | **Auto-creates orphan `agency_clients` rows** from anonymous form submissions (`app/api/widget/[clientId]/lead/route.ts:47-100`). If a malicious POST sends an arbitrary `clientId` matching an orphaned `client_sites` row, it inserts a new `agency_clients` row under that site's `agency_id` with attacker-controlled `name`. Always returns 200 so the attacker gets no error signal. |
| `/api/playground/chat` | Supabase rate-limit | Uses `api.openai.com` URL with `openrouter/anthropic/claude-haiku-4.5` slug — wrong host for that model |
| `/api/roi/capture` | None | Forwards email + ROI metrics to `SIGNUP_WEBHOOK_URL` |
| `/api/leads` | None | Landing-page lead capture. **Stored-XSS sink**: interpolates `body.name`, `body.company`, `body.industry`, `body.size`, `body.how`, `body.message` unescaped into the admin notification email HTML (`app/api/leads/route.ts:58-68`). If Angel's mail client renders HTML, an attacker gets a rendered `<img onerror>` in the inbox. |
| `/api/partners/apply` | None | Stores to `partner_applications`, fires webhook |
| `/api/sites/contact` | None | Public site contact form |
| `/api/reviews` | None | Public review submission |
| `/api/report/[clientId]` | None | Signed-URL style report fetch |
| `/api/stats` | None | Public aggregate counters (sanity check for landing) |

## External integrations via API

- **GHL** — 3 webhook receivers (`/api/webhooks/ghl`, `/api/crm/webhook`, `/api/ghl/webhook`), OAuth `/api/ghl/callback` + `/api/crm/callback`, poll `/api/ghl/poll`, tool bridge `/api/agent/ghl-tool` (bearer gateway-token), `/api/agency/leads/push-ghl` + `-direct`, `/api/agency/clients/[id]/ghl/{connect,disconnect}`.
- **Stripe** — 2 checkout endpoints, 2 portal endpoints, 3 webhook endpoints (1 primary + 1 disabled + 1 credits-specific), Connect suite under `/api/stripe/connect/*`, env-check + test behind master emails.
- **Voice** — 4 webhook entry points (above); Retell admin mirrored under `/api/voice/retell/*`; Twilio outbound TwiML + gather.
- **Google** — `/api/auth/google` (Calendar) + `/api/auth/gsc` (Search Console) OAuth.
- **Firecrawl** — catch-all proxy `/api/fc/[...path]` (`app/api/fc/[...path]/route.ts:94-209`). Agency identified from `Authorization: Bearer kyra-agency-{agencyId}` or `X-Kyra-Agency-ID` header. Free/solo plans blocked (402), paid plans usage-gated (429 when month limit hit). Per-endpoint costs in `ENDPOINT_COST` map (`route.ts:38-45`). Pass-through paths `v1/status`, `health`, `v1/health` (`route.ts:48`).
- **OpenClaw/OVH** — container lifecycle under `/api/agency/gateway/*` and `/api/agency/clients/[id]/reprovision`; gateway URL resolved per-client via `lib/ovh/gateway-resolver`.
- **Telegram/WhatsApp/Discord** — `/api/channels/*/webhook` (Discord has Ed25519 signature, others don't).
- **Onfleet** — `/api/webhooks/onfleet/[clientId]` (per-client secret) + legacy `/api/webhooks/onfleet` redirector. TCPA sending-hours gating, provider dispatch.

## Duplicate / overlapping routes

| Overlap | Files |
|---|---|
| GHL inbound webhook × 3 | `/api/webhooks/ghl`, `/api/crm/webhook`, `/api/ghl/webhook` |
| Stripe checkout × 2 | `/api/stripe/checkout` (live), `/api/billing/checkout` (disabled stub) |
| Stripe portal × 2 | `/api/stripe/portal` (live), `/api/billing/portal` (disabled stub) |
| Stripe webhook × 3 | `/api/webhooks/stripe` (primary), `/api/stripe/webhooks` (secondary, file says "currently disabled in Stripe"), `/api/stripe/credits/webhook` (credit packs only) |
| Impersonation × 2 | `/api/master/impersonate`, `/api/admin/accounts/[id]/login-as` — identical magic-link flow |
| Voice webhooks × 4 | `/api/voice/retell/webhook`, `/api/voice/twilio/webhook`, `/api/voice/twilio/gather`, `/api/voice/webhook` (multi-provider) |
| Admin stats × 2 | `/api/admin/stats` (legacy per-user), `/api/admin/kyra-stats` (agency-native) |
| Onfleet webhook × 2 | `/api/webhooks/onfleet/[clientId]` (path-based), `/api/webhooks/onfleet` (legacy query-based, forwards) |

## Cross-cutting concerns

### Unsigned webhooks (high-severity)

`/api/webhooks/resend` (`route.ts:9`) — no signature, writes to CRM, toggles unsubscribe state.
`/api/voice/retell/webhook` (`route.ts:25`) — no signature, inserts `client_conversations` + `crm_activities` + voice usage.
`/api/voice/twilio/webhook` + `/gather` — no `x-twilio-signature` check.
`/api/voice/webhook` — multi-provider, no verification despite raw-body parsing comment.
`/api/channels/telegram/webhook` — no Telegram secret-token check.
`/api/channels/whatsapp/webhook` — no `x-hub-signature-256` verification on POST.
`/api/webhooks/unsubscribe` — public, no signed unsubscribe token.

### Fail-open webhook auth

`/api/ghl/webhook` (`route.ts:32-38`) and `/api/crm/webhook` (`route.ts:49-53`) both return success when `GHL_WEBHOOK_SECRET` is not set. `/api/webhooks/ghl` has the same pattern (`route.ts:40-45`). Compare to cron where `lib/auth/cron.ts:27-29` explicitly rejects with 500 when `CRON_SECRET` is absent — that's the safer model and should be mirrored.

### Info-leak / no-auth routes

`/api/admin/orphaned-users` — unauthenticated list of up to 200 auth emails (`route.ts:6`).
`/api/admin/health-check` — unauthenticated env + migration checklist including raw DDL and production Supabase project id (`route.ts:26-93`).
`/api/public/workers` — internal client UUIDs + agency names (`route.ts:7`).
`/api/debug` — gated properly under `ADMIN_EMAILS` (`route.ts:21`), returns boolean-only env presence; no change needed.

### Stored-XSS

`/api/leads` (`route.ts:47-74`) interpolates `body.name`, `body.company`, `body.industry`, `body.size`, `body.how`, `body.message` straight into HTML email body without escaping. Sends to `angel@conversionsystem.com` via Resend. Impact is limited to the receiving inbox — Mail clients sandbox HTML — but attacker-controlled `<img src onerror>` / phishing-looking links land in the founders' inbox trivially.

### Orphan record creation from anon input

`/api/widget/[clientId]/lead` (`route.ts:47-100`) accepts an unauthenticated POST with a `clientId`. If that id doesn't exist in `agency_clients` but exists in `client_sites`, the handler **inserts a new `agency_clients` row** using the site's `agency_id` and attacker-controlled `business_name` → unsafe slug. Always returns `{ ok: true }` (`route.ts:96, 229`) so attackers get consistent behaviour for probing.

### N+1 billing loop

`/api/webhooks/openclaw-usage` (`route.ts:62-66`) calls `deductCredits` in a for-loop with `totalCredits = count * creditsPerTurn`. On Sonnet-class models that's 75× per reported turn. Should be a single bulk deduction.

### Model slug / host mismatch

`/api/playground/chat` (`route.ts:35-42`) POSTs to `https://api.openai.com/v1/chat/completions` with `model: 'openrouter/anthropic/claude-haiku-4.5'`. That model slug is not valid for OpenAI's API. Either the `OPENAI_API_KEY` env is actually an OpenRouter key and the URL is wrong, or the model slug should be `gpt-4o-mini`. Same pattern only present here; `/api/widget/chat` uses `getDirectLLMClient()` correctly (`app/api/widget/chat/route.ts:468`).

### Auth callback redirect parameter

`/api/auth/callback` (`route.ts:10-11`) takes `?redirect=` or `?next=` and performs `NextResponse.redirect(${origin}${destination})`. Only restricts `reset-password` into a fixed path. Any in-app path is accepted; protocol-relative (`//attacker.com`) depends on Next.js/Vercel URL parsing behaviour. Worth constraining to a same-origin allowlist or using `new URL(rawRedirect, origin).href` with origin check.

### Triple-source admin allowlist drift

`steve@conversionsystem.com` is in `admin/stats` (`route.ts:4`), `admin/content-calendar`, and `content-calendar/recent-topics` — but not in `admin/kyra-stats` (`route.ts:8`), `admin/webhook-health` (`route.ts:14`), `master/stats` (`route.ts:4`), `master/impersonate` (`route.ts:4`), `master/vps-health` (`route.ts:4`), `debug` (`route.ts:6`), `stripe/env-check` (`route.ts:5`), `stripe/test` (`route.ts:5`), `admin/accounts` (`route.ts:6`), or most of `admin/*`. Meanwhile `admin/router-migrate` (`route.ts:14`) doesn't use a hardcoded list at all — it reads `process.env.MASTER_EMAILS` splitting on `,`. One consolidated helper in `lib/auth/admin.ts` would remove the drift.

### CORS openness

`/api/chat/*`, `/api/widget/chat`, `/api/agent/ghl-tool`, `/api/voice/retell/webhook`, `/api/portal/[clientId]/chat`, and `/api/try` set `Access-Control-Allow-Origin: *` (webhook-level openness is expected, but `/api/chat/*` is meant for first-party UI only). `/api/chat/route.ts:25` ties CORS to `NEXT_PUBLIC_APP_URL` — a safer default — but `/api/chat/openclaw/route.ts:42` and `/api/chat/worker/route.ts:32` override back to `*`.

### Token passing / secret echoing

`lib/auth/cron.ts:47-57` accepts either the Vercel `Authorization: Bearer` header or the legacy `?secret=` query. Multiple cron routes compose this with extra env vars (`gateway-token-sync` adds `OVH_PROVISIONER_SECRET`). The query-param form is visible in Vercel logs and referer headers of any external fetch. Prefer header-only once all consumers migrate.

### Per-client gateway-token auth model

`/api/agent/ghl-tool` (`route.ts:38-54`) and `/api/secrets/[key]` (`route.ts:71-101`) both accept `Authorization: Bearer {gateway_token}` and DB-look-up `agency_clients.gateway_token`. `/api/secrets/[key]` additionally enforces `timingSafeEqual` (`route.ts:19-24`) and a 10/min per-client rate limit; `/api/agent/ghl-tool` uses a plain `.eq('gateway_token', gatewayToken)` query — a constant-time compare is server-side via Postgres but the token is logged on the request if `console.log` ever captures headers. Consistency would help.

---

## Route-path reference (key files)

- `app/api/admin/webhook-health/route.ts:14-23` — ADMIN_EMAILS (2); returns `getWebhookHealth()`
- `app/api/admin/orphaned-users/route.ts:6-25` — **unauth**
- `app/api/admin/health-check/route.ts:26-93` — **unauth**, leaks env
- `app/api/admin/stats/route.ts:4` — ADMIN_EMAILS (3) including `steve@`
- `app/api/admin/kyra-stats/route.ts:8` — ADMIN_EMAILS (2)
- `app/api/webhooks/stripe/route.ts:296` — signed (primary)
- `app/api/webhooks/ghl/route.ts:40-45, 233-246` — fails open; in-mem dedup
- `app/api/ghl/webhook/route.ts:32-38` — fails open
- `app/api/crm/webhook/route.ts:49-53` — fails open
- `app/api/webhooks/resend/route.ts:9` — **no signature**
- `app/api/webhooks/openclaw-usage/route.ts:8-20, 62-66` — bearer auth; N+1 loop
- `app/api/webhooks/unsubscribe/route.ts:9-17` — public unsubscribe
- `app/api/voice/retell/webhook/route.ts:25-44` — **no signature**
- `app/api/voice/twilio/webhook/route.ts:39-84` — no X-Twilio-Signature check
- `app/api/voice/webhook/route.ts:14-126` — no verification
- `app/api/leads/route.ts:47-74` — stored-XSS sink (admin email)
- `app/api/widget/[clientId]/lead/route.ts:47-100` — auto-creates orphan agency_clients
- `app/api/public/workers/route.ts:7-53` — leaks client UUIDs
- `app/api/chat/route.ts:381-568` — true SSE with prompt-injection scan + skills
- `app/api/chat/openclaw/route.ts:285-291` — fake 20-char stream
- `app/api/chat/worker/route.ts:295-351` — true gateway proxy stream
- `app/api/portal/[clientId]/chat/route.ts:116-164` — unauth, true SSE, rate-limited
- `app/api/try/route.ts:11, 128-155` — edge runtime, OpenAI stream
- `app/api/agency/clients/[id]/chat/route.ts:160-241` — member-verified SSE proxy
- `app/api/widget/chat/route.ts:468-501` — direct LLM, no streaming
- `app/api/playground/chat/route.ts:35-42` — **api.openai.com + OpenRouter slug**
- `app/api/auth/callback/route.ts:10-29` — permissive redirect param
- `app/api/fc/[...path]/route.ts:94-209` — Firecrawl proxy with per-agency plan limits
- `app/api/agent/ghl-tool/route.ts:38-54` — bearer gateway-token
- `app/api/secrets/[key]/route.ts:19-24, 71-101` — bearer gateway-token w/ timing-safe compare
- `lib/auth/cron.ts:27-29` — fails closed when `CRON_SECRET` unset
- `lib/agency/middleware.ts:20-100` — `requireAgencyMember/Admin/Owner`
- `vercel.json:14-75` — 15 cron schedules

Total endpoints catalogued: 357 route.ts files across 41 top-level API subfolders.
