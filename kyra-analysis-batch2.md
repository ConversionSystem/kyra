# Kyra `lib/` Layer — Batch 2 Analysis (HEAD `9bdbb95d`, post-pull, post-`lib/fly` removal)

Scope verified: 51 domain subdirectories under `lib/` (not 55 — list below) plus 4 top-level TS files. `lib/fly/` has been **fully removed** (directory absent; `grep -r "from '@/lib/fly"` returns 0 matches).

Verified subdirs: agency, ai, ai-workers, analytics, auth, automations, autopilot, billing, blog, booking, briefing, business-box, campaigns, channels, chat, commerce, config, content, crm, data, email, funnels, ghl, guides, instructions, integrations, intelligence, knowledge, memory, multi-agent, onboarding, onfleet, openclaw, ovh, packages, payments, pipeline, reviews, secrets, security, seo, sites, skills, sms, stripe, supabase, tasks, templates, tools, voice, worker. (`lib/fly` not present.)

Top-level: `ai-health-score.ts`, `pinecone.ts`, `rate-limit.ts`, `utils.ts`.

**New highlighted file:** `lib/stripe/webhook-health.ts` — see §D.

---

## agency/

**Purpose:** The agency-as-tenant layer. Owns the per-client container lifecycle glue (session keys, system prompt construction, workspace file generation) that bridges the Next.js world to the OpenClaw container world. Also houses agency-scoped middleware, types, and model-routing metadata.

**Key files:**
- `container.ts` — `getSessionKeyForClient(clientId)` → `agent:client:${clientId}` (line 14-16) and `getSessionKeyForUser(userId)` → `agent:main:${userId}` (line 21-23). Also `getSystemPromptForClient()` which builds the per-client LLM system prompt by stacking persona → instructions → business hours → calendar URL → language → GHL context → template soul.
- `workspace.ts` — `buildWorkspaceFiles()` renders SOUL.md / USER.md / AGENTS.md / TOOLS.md from client + agency + GHL data with `{{variable}}` substitution (`workspace.ts:18-25`).
- `sync.ts` — `syncClientWorkspace(clientId)` uploads generated files to Supabase Storage bucket `kyra-workspaces` (`sync.ts:14`).
- `middleware.ts` — `requireAgencyMember()` / `requireAgencyAdmin()` / `requireAgencyOwner()` do auth + membership + role checks; return `{data, error}` tuples (`middleware.ts:20-100`).
- `webhook-dispatcher.ts` — fan-out for agency-configured outbound webhooks on 5 event types: `new_conversation | escalation | new_lead | credit_low | review_queued` (`webhook-dispatcher.ts:18-23`). Fire-and-forget.
- `ai-models.ts` — `resolveOcModel` / `resolveNativeModel` per-provider model selection for container + native bridge paths.
- `permissions.ts` — `getClientPermissions()` + `buildPermissionPrompt()` for GHL capability gating (e.g. "can book appointments", "can create opportunities").
- `container.ts`, `types.ts`, `queries.ts`, `skill-builder-prompt.ts`, `voice-parser.ts`, `utils.ts` — supporting types/helpers.

**External deps:** Supabase (service client), OpenClaw via HTTP, GHL types.

**Notable patterns:** Session-key pattern lives ONLY here now (`agent:client:${id}` is the current standard); the old `kyra-user-${userId}` format is confined to `lib/openclaw/sessions.ts:36-38`. `middleware.ts` is the canonical auth gate for /agency routes — the pattern returns discriminated unions (`{data, error}`) so routes can `if (error) return NextResponse.json(...)` cleanly.

## ai/

**Purpose:** The Anthropic-first dashboard LLM wrapper. Handles direct Claude calls (non-OpenClaw path), message truncation, embeddings for memories, system prompt construction, and the **dashboard** model router (separate from GHL's).

**Key files:**
- `claude.ts` — `getAnthropic()` singleton, `streamChat()` / `chat()` / `streamChatWithTools()` which implements a 5-round tool-use loop (`claude.ts:95-143`). Default model `claude-sonnet-4-20250514`, max 2048 tokens.
- `model-router.ts` — pattern-based routing (`ECONOMY_PATTERNS`, `COMPLEX_KEYWORDS`, `PREMIUM_PATTERNS`) → `{tier, model, reason}` (`model-router.ts:68-168`). Explicit note at top calling out the duplicate at `lib/ghl/model-router.ts`. Also exports legacy `resolveModelPreference()` for backward compat with pre-router chat routes.
- `prompts.ts` — `getSystemPrompt()` stacks memories + reminders + calendar events + custom instructions into a single system string.
- `embeddings.ts` — `text-embedding-3-small` via OpenAI for memory vectors.
- `memory.ts` — CRUD for memories backed by Pinecone + Supabase: `saveMemory`, `searchMemories`, `deleteMemory`, `updateMemory`. Keeps Pinecone + Supabase IDs in lockstep with cleanup-on-failure (`memory.ts:61-70`).
- `truncate.ts` — context-window trimming.

**External deps:** `@anthropic-ai/sdk`, `openai` (embeddings), Pinecone.

**Notable patterns:** The 5-round tool-use loop in `streamChatWithTools` is a classic Anthropic pattern — non-streaming calls to inspect `stop_reason`, then append assistant `tool_use` blocks + user `tool_result` blocks, repeat until a text response or max rounds. Model router is **purely pattern-based** (no LLM classification), which keeps it O(1) per request.

## ai-workers/

**Purpose:** Role-based AI worker definitions (templates) that show up in the dashboard's "AI Workers" tab and drive the "one-click deploy" in AI Setup. Each worker is a role (Sales Qualifier, Appointment Setter, etc.) with a persona, channels, tool list, and variable form.

**Key files:**
- `role-workers.ts` — `ROLE_WORKERS: RoleWorker[]` — customer-facing vs internal workers, each with `soulMd`, `requiredClawHubSkills` (e.g. `firecrawl-cli`), channel matrix, and `TemplateVariable[]` form spec (`role-workers.ts:14-57`).
- `capabilities.ts` — per-role tool permission maps (which GHL tools each role is allowed).
- `team-templates.ts` — agency team presets (primary + specialists) for Pro/Scale tiers where `maxTeamMembers > 0`.
- `tool-scoping.ts` — scopes tool exposure by worker role.
- `performance-tracker.ts` — `trackConversation()` writes per-worker metrics (conversion rate, escalation rate) used by dashboard KPIs.
- `lead-response-checklist.ts` — quality-gate heuristic for lead-responder workers.

**External deps:** Supabase (performance metrics), ClawHub skill registry.

**Notable patterns:** This is pure config/data — no network calls. The workers defined here feed into the container provisioner (`lib/ovh/provisioner.ts` uses `soulMd` when deploying) and the AI Setup UI (variable forms).

## analytics/

**Purpose:** AI-generated weekly reporting (single file).

**Key files:** `ai-reporter.ts` — consumes conversation + pipeline + CRM data, feeds it to an LLM, emits a human-readable weekly summary used by `lib/email/weekly-report.ts`.

**External deps:** Supabase, LLM (OpenAI/OpenRouter via chat core).

**Notable patterns:** Single consumer is the weekly-report email cron; not exposed to routes directly.

## auth/

**Purpose:** Cron-authentication helpers.

**Key files:** `cron.ts` — `checkCronAuth()` and `requireCron()` for Next.js route handlers. **Fails closed**: if `CRON_SECRET` is unset, every call returns 500 (`cron.ts:27-29`). Accepts either `Authorization: Bearer <secret>` or `?secret=` query param. `extraSecretEnvVars` lets routes accept a second secret (legacy rotation).

**External deps:** None (pure Next.js).

**Notable patterns:** This is the single source of cron-auth truth. Every `/api/cron/*` route uses `requireCron(req)` — returning its response on failure or null on success — which gives fail-closed-by-default semantics. Prior to this helper, the codebase had fail-open behavior when env vars were missing.

## automations/

**Purpose:** Agency-configured workflow engine — "when X happens, do Y". Distinct from `lib/autopilot/` (which is time-driven) and `lib/tasks/` (which is task-scheduler driven).

**Key files:**
- `ai-workflow-engine.ts` — LLM-assisted workflow authoring.
- `workflow-executor.ts` — runs a workflow definition against a trigger event (message, deal moved, etc.).
- `workflow-templates.ts` — prebuilt workflows per industry.
- `workflow-types.ts` — trigger/action type definitions.
- `sync.ts` — persists workflow definitions to container so they run inside OpenClaw (`grep -l "from '@/lib/ovh/"` confirms this).

**External deps:** OVH provisioner (for pushing to container), Supabase.

**Notable patterns:** The automation engine and autopilot engine are separate code paths that both generate outbound AI actions — a known area of overlap.

## autopilot/

**Purpose:** Time-based proactive AI action scheduler. Built around a weekly schedule (Mon = lead follow-up, Tue = post-appointment check-in, etc.).

**Key files:** `autopilot-engine.ts` — `AutopilotAction` type + `DEFAULT_AUTOPILOT_SCHEDULE[]` with 6 prebuilt actions (`autopilot-engine.ts:33-60`). Each action has `dayOfWeek`, `timeHour`, `messageTemplate`, `targetAudience`, `category`.

**External deps:** Called from cron jobs that scan for due actions and dispatch messages.

**Notable patterns:** Pure config + executor. The default schedule is overridable per-client but ships with sane industry-agnostic defaults.

## billing/

**Purpose:** Plan catalog, credit engine (SSOT), BYOK resolution, referral activation, model pricing, premium template gating. The financial backbone.

**Key files:**
- `plans.ts` — 5-tier plan config (`free | solo_pro | starter | pro | scale`) with `maxClients`, `monthlyCredits`, `monthlyWebScrapes`, `maxTeamMembers`, `trialDays`, `stripePriceKey`. `PLANS` at line 28-168. Also `ANNUAL_PRICES` (line 248-253) and `VOICE_ADDON` (line 258-276).
- `credit-engine.ts` — **Single source of truth** for credit ops. `CREDIT_COSTS` at line 54-101 maps every billable action → credit cost. `requireCredits()` (preflight, non-mutating), `deductCredits()` (post-success), `addCredits()` (purchase/bonus/manual), `getAgencyCredits()`, `getCreditTransactions()`. Low-balance notification at 50 credits (`credit-engine.ts:49` + `fireLowBalanceNotification` at 361-387).
- `model-credits.ts` — per-model `creditsPerTurn` for 12 models across mini (1cr) / standard (5cr) / pro (15cr) / flagship (75cr) / reasoning (8cr) / premium (125cr) / ultra (100cr) tiers (`model-credits.ts:34-159`). `normalizeModelId()` handles OpenRouter slugs, dot→dash conversions, provider-prefix variants (huge alias table `MODEL_ID_ALIASES` at 170-212). Calibrated Mar 30 2026 — Sonnet 4.6 went 15cr → 75cr and Opus 4.6 went 35cr → 125cr after real OpenRouter spend data showed losses at the lower pricing (see header comment lines 9-20).
- `byok.ts` — `resolveAgencyApiKey(agencyId, preferredProvider)` returns `{apiKey, provider, model, isByok, skipCredits}`. BYOK priority from user spec **does NOT match code**: provisioner priority is `anthropic > openrouter > openai > google` (see `lib/ovh/provisioner.ts:36` + `lib/ghl/poller.ts:68-80`), but `lib/billing/byok.ts:63-65` uses `openai > anthropic > openrouter > google`. Worth a follow-up. `skipCredits` is true only for paid plans (`PAID_PLANS = starter | pro | scale | solo_pro | beta`, line 26).
- `referral-activation.ts` — `activateReferral()` grants 150cr early-bird / 100cr standard to referrer + 100cr to friend, plus streak bonus of 50cr for 3 activations in 7 days (`referral-activation.ts:20-85`). Idempotent via `.eq('status', 'signed_up')` guard. `checkAndActivateReferral()` is the email-callback safety net.
- `credits.ts` — welcome-gift grant (`WELCOME_CREDITS = 50`) + promo codes + credit pack catalog (`CREDIT_PACKS` $50 / $100 / $250).
- `classify-usage.ts` — `classifyUsage(message)` maps a user message to a `CreditAction` (chat.deep_research | chat.image_analysis | chat.file_analysis | chat.web_search | chat.message).
- `stripe.ts` — Stripe-specific billing glue (distinct from `lib/stripe/*`).
- `premium-templates.ts`, `template-builder.ts` — template marketplace + template authoring tools.

**External deps:** Supabase, Stripe.

**Notable patterns:** `credit-engine.ts` is emphatic that every AI action flows through it (see banner comment at lines 1-14). Preflight + deduct-on-success pattern prevents double-billing on errors. `model-credits.ts` contains ~40 alias entries — symptomatic of historically messy model-id handling across providers.

## blog/

**Purpose:** Blog post entity helpers. Single file.

**Key files:** `posts.ts` — CRUD for blog posts.

**Notable patterns:** Likely used by the `lib/sites/*` website generator to render per-industry blog content.

## booking/

**Purpose:** AI appointment booker — heuristic + LLM logic for parsing booking intent + availability resolution.

**Key files:**
- `ai-booker.ts` — main LLM call + slot proposal.
- `availability.ts` — calendar availability resolver (likely wraps Google Calendar + GHL calendar lookups).
- `types.ts` — booking intent types.

**External deps:** `lib/integrations/google.ts`, `lib/ghl/*` (calendar skills).

## briefing/

**Purpose:** Daily morning briefing for agency owners.

**Key files:** `daily-briefing.ts` — aggregates yesterday's conversations, new leads, appointments booked → LLM-summarized briefing.

**External deps:** LLM, Supabase.

## business-box/

**Purpose:** The "Business-in-a-Box" one-click deploy flow ("Pick your industry → 60 seconds → AI deployed").

**Key files:** `business-in-a-box.ts` — `BusinessBoxConfig` (industry, business details, services, AI config), `BoxDeployResult`, `INDUSTRY_OPTIONS`. Orchestrates: personality config, agents enabled, autopilot schedule, review engine, payment collection, web chat widget, customer memory — all at once (`business-in-a-box.ts:1-58`).

**External deps:** Nearly everything downstream (autopilot, multi-agent, reviews, payments, memory, chat widgets).

**Notable patterns:** This is top-of-stack — it composes many other subsystems into a single deploy.

## campaigns/

**Purpose:** AI-generated marketing campaigns.

**Key files:** `ai-campaign-engine.ts` — single-file LLM campaign generator; paired with `CREDIT_COSTS['campaign.generate'] = 3` in `credit-engine.ts`.

## channels/

**Purpose:** Unified inbound-channel handler for Telegram / WhatsApp / Discord / voice. Messages from any channel land in `processChannelMessage()`.

**Key files:**
- `router.ts` — `processChannelMessage(userId, text, channelType, channelMessageId)` — the unified entry point. Finds/creates per-user conversation, pulls history, optionally routes through the user's agency OVH gateway (`features.useWorker`), falls back to direct Claude API with tool-use loop (single round) (`router.ts:23-307`). Uses `resolveGatewayForUser()` from `lib/ovh/gateway-resolver` and `resolveModelPreference()` from `lib/ai/model-router`.
- `discord.ts` — Discord bot API wrapper.
- `voice.ts` — voice channel input/output bridge.
- `whisper.ts` — transcription helper (Whisper API).

**External deps:** Anthropic direct, OVH gateway, Supabase.

**Notable patterns:** `router.ts` is a critical hot path. When `features.useWorker=true`, it routes to the user's OVH gateway via `/v1/chat/completions` (with SSE parsing); otherwise it goes directly to Anthropic. Skills are bundled via `buildSkillsPrompt()` from `lib/skills/registry`.

## chat/

**Purpose:** Shared chat core used by both dashboard chat and widget chat — keeps the two in sync on model resolution, LLM client creation, credit ops, and conversation storage.

**Key files:**
- `core.ts` — `resolveModel(rawModel, useOpenRouter)`, `getDirectLLMClient()` (returns an `OpenAI` client pointed at OpenRouter or OpenAI), plus credit ops. `OPENROUTER_SLUGS` dict (line 30-43) maps canonical IDs → OpenRouter-valid slugs (verified Apr 3 2026 per comment at line 32).
- `lead-capture.ts` — widget-specific lead capture hook.

**External deps:** `openai` SDK, `lib/billing/credit-engine`, `lib/billing/model-credits`.

**Notable patterns:** The OPENROUTER_SLUGS map duplicates some of what `model-credits.ts:MODEL_ID_ALIASES` does — both are slug-normalization tables.

## commerce/

**Purpose:** WhatsApp Commerce (catalog + checkout over WhatsApp Business).

**Key files:** `whatsapp-commerce.ts`.

## config/

**Purpose:** Runtime feature flags.

**Key files:** `features.ts` — exactly three flags:
- `useWorker` (`KYRA_USE_WORKER=true`) — route chat through Cloudflare sandbox Worker (legacy).
- `useOpenClaw` (`KYRA_USE_OPENCLAW=true`) — route chat through OpenClaw gateway on Mac Mini (even older legacy).
- `openclawSkills` (`KYRA_OPENCLAW_SKILLS=true`) — enable the OpenClaw skill ecosystem (web search, file ops, sub-agents).

**Notable patterns:** All three flags predate the current OVH per-client gateway architecture. The current code path often short-circuits these flags (e.g. `ghl/poller.ts` uses `resolveClientGateway` from `lib/ovh/provisioner.ts` directly, not gated on `useOpenClaw`). These flags are retained for legacy channel routes.

## content/

**Purpose:** Content pillars (topic clusters) generator.

**Key files:** `pillars.ts`.

## crm/

**Purpose:** The largest domain (24 files). Contacts / companies / deals / tasks / activities / tags / segments, plus AI-powered extensions: enrichment, scoring, lead-scorer, stale-deal detection, deal autopilot, relationship memory, conversation logger, import/export, merge, cross-contact intelligence.

**Key files:**
- `contacts.ts`, `companies.ts`, `deals.ts`, `tasks.ts`, `activities.ts`, `tags.ts`, `segments.ts`, `types.ts` — standard CRM entity CRUD.
- `auto-deal.ts`, `deal-autopilot.ts`, `stale-deals.ts` — deal-stage automation.
- `enrichment.ts` — AI enrichment (GPT-4o + web scrape, 2cr/contact per `CREDIT_COSTS`).
- `ai-lead-scorer.ts`, `scoring.ts` — AI lead scoring (1cr/score, or 1cr per batch of 50 per `CREDIT_COSTS['crm_scoring']`).
- `conversation-logger.ts` — writes conversation turns back to the CRM activity log.
- `relationship-memory.ts` — per-contact memory (preferences, objections, personal details) for AI context.
- `intelligence.ts`, `cross-contact.ts` — cross-contact pattern detection (e.g. "who are our hot leads?").
- `lead-sync.ts`, `pipeline-sync.ts` — syncs pipeline leads ↔ CRM contacts.
- `merge.ts`, `import.ts`, `export.ts` — data hygiene tools.
- `rules.ts` — agency-configured CRM automation rules.

**External deps:** Supabase heavily, LLMs for AI features.

**Notable patterns:** The CRM is the central data model — pipeline, GHL webhooks, conversation logger, and agents all read/write here. 2 TODOs in `pipeline-sync.ts:127,130` marked "Phase 2".

## data/

**Purpose:** Static reference data.

**Key files:** `roles-data.ts` — role taxonomy used by AI workers.

## email/

**Purpose:** Email infrastructure (GHL-first, Resend fallback), marketing blasts, 7-email nurture sequence, weekly reports.

**Key files:**
- `sender.ts` — `sendEmail()` with GHL → Resend fallback; `sendEmailViaResend()` routes through `ghl-platform-sender.ts` because conversionsystem.com isn't verified in Resend (see comment at `sender.ts:10-12`).
- `ghl-platform-sender.ts` — sends platform emails via Conversion System's GHL location.
- `marketing.ts` — agency-initiated marketing campaigns.
- `nurture-sequence.ts` + `nurture-enrollment.ts` — 7-email / 21-day unified nurture sequence.
- `sequences.ts` — **DEPRECATED STUB** (see §G).
- `ai-writer.ts` — LLM email draft generator.
- `weekly-report.ts` — agency owner weekly analytics email.

**External deps:** GHL API, Resend, LLM.

**Notable patterns:** The "GHL-first" design reflects that most agencies have a GHL sub-account with a warmed domain, so delivery is better than from a cold Resend domain. Resend is literally `onboarding@resend.dev` fallback when GHL is unavailable.

## funnels/

**Purpose:** AI funnel builder.

**Key files:** `ai-funnel-builder.ts` — `CREDIT_COSTS['funnel.generate'] = 3`.

## ghl/

**Purpose:** GoHighLevel integration — one of the largest/most critical domains alongside `crm/` (23 files + `skills/` subdir with 9 files). Two ingestion modes: **poller** (polls Conversations API every N seconds) and **webhook** (real-time). The 50 "skills" (tools) are split into domains (contacts, calendar, opportunities, conversations, tasks, invoices, marketing).

**Key files:**
- `client.ts` — `GHLClient` REST wrapper with automatic token refresh on 401, exponential backoff on 429, typed responses, deduped concurrent refreshes via `isRefreshing` + `refreshPromise` (`client.ts:90-91`). Throws `GHLError` / `GHLRateLimitError` / `GHLTokenExpiredError`.
- `index.ts` — barrel export + `createGHLClientForAgencyClient()` factory that wires token persistence: when the client refreshes, new tokens are written back to the `agency_clients` row (`index.ts:26-57`).
- `poller.ts` — the dominant ingestion path. For each active agency client with a GHL token, searches conversations with unread inbound messages, skips ones where outbound is newer than inbound, routes through `resolveClientGateway` + `chatViaGateway` (from `lib/ovh/provisioner`) OR direct LLM via `lib/ghl/direct-llm.ts`. Applies `defend()` + `scanOutput()` for prompt-injection defense. 1 TODO at line 729 (fire ESCALATION_WEBHOOK_URL).
- `webhook-handler.ts` — webhook mode equivalent: `processInboundMessage()`. Tries "Smart Engine" first (`smart-handler.ts`), falls back to bridge relay.
- `smart-handler.ts` — rich prompt path: container_config persona + last 10 messages + CRM relationship memory + LLM direct call with tool-use.
- `api.ts` — OAuth + `getValidToken()` + `sendGHLMessage()` + `refreshGHLToken()`.
- `oauth.ts`, `agency-oauth.ts`, `agency-api.ts` — OAuth handshake + agency-level (not sub-account-level) API operations.
- `direct-llm.ts` — critical shim: **bypasses OpenClaw gateway because the proxy doesn't forward the `tools` parameter to the underlying LLM**. Calls OpenAI or OpenRouter directly with function-calling (see header comment `direct-llm.ts:1-9`). Priority: override key → BYOK → `OPENAI_API_KEY` → `OPENROUTER_API_KEY`.
- `model-router.ts` — the **widget/GHL** model router. Classifies simple/medium/complex, selects provider-specific models (`MODEL_TIERS` per provider at `model-router.ts:25-46`). See also `lib/ai/model-router.ts` for the dashboard version — the two have the same `COMPLEX_KEYWORDS` and similar `SIMPLE_PATTERNS` but live in separate files and drift over time.
- `ghl-tools.ts` — backward-compat wrapper around the 50-tool `skills/` modules.
- `skills/` — 9-file skill system: `contacts.ts`, `calendar.ts`, `conversations.ts`, `opportunities.ts`, `tasks.ts`, `invoices.ts`, `marketing.ts`, `validate.ts`, `index.ts` (`ALL_GHL_TOOLS` + `executeGHLTool`).
- `conversation-memory.ts` — per-contact conversation history for LLM context.
- `resolve-ghl-config.ts` — resolves per-client pipelines/calendars/location IDs.
- `review-gate.ts` — holds AI replies for human approval when review mode is on (`isReviewGateActive`, `queueForReview`).
- `action-engine.ts` — high-level action dispatcher.
- `conversation-ai.ts` — older LLM call path (pre-direct-llm).
- `risk-config.ts` — per-client AI risk tier (low/med/high auto-actions).
- `types.ts`, `webhook-types.ts` — domain types.
- `webhooks.ts` — HMAC signature verification + payload parsing.
- `SKILL.md` — markdown doc describing the skill system.

**External deps:** GHL REST API (`services.leadconnectorhq.com`), Supabase, OVH gateway client, LLMs.

**Notable patterns:** `direct-llm.ts` is the explanation for why there are 4 call paths to the LLM (see §C) — the OpenClaw gateway proxy strips the `tools` parameter, so any path that needs function-calling has to go direct. Token refresh uses a deduplication pattern (one in-flight refresh, others await). 2 model routers (`lib/ai/model-router.ts` + `lib/ghl/model-router.ts`) are explicitly flagged in comments as needing to stay in sync — a known drift risk.

## guides/

**Purpose:** Setup guides surfaced in the onboarding flow.

**Key files:** `setup-guides.ts`.

## instructions/

**Purpose:** Pre-built persona/instruction presets.

**Key files:** `presets.ts` — per-industry / per-role instruction templates for AI workers.

## integrations/

**Purpose:** Non-GHL third-party integrations: Google Calendar, Google Search Console, WordPress, HeyGen (AI video), Jane (scheduling).

**Key files:**
- `google.ts` — Google Calendar OAuth + `CalendarEvent` type + event CRUD. Uses `lib/supabase/server` for token storage.
- `google-search-console.ts` + `gsc.ts` — GSC OAuth + property + query-performance pulls (`CREDIT_COSTS['seo.gsc_sync'] = 1`).
- `wordpress.ts` — publishes content to connected WordPress sites.
- `heygen.ts` — AI video generation.
- `jane.ts` — Jane appointment platform (used by medical/dental clients).
- `sync.ts` — pushes integration state to OVH container.

**External deps:** Each provider's OAuth + REST API, Supabase for token storage.

## intelligence/

**Purpose:** Agency-level analytics aggregation.

**Key files:** `agency-analytics.ts` — aggregates across all clients of an agency for the agency dashboard.

## knowledge/

**Purpose:** RAG (retrieve knowledge into prompts) + extraction.

**Key files:**
- `rag.ts` — `getKnowledgeContext(agencyId, clientId, message)` — fetches knowledge documents from Supabase, uses keyword matching + relevance scoring (top-K selection), caps at `MAX_KNOWLEDGE_CHARS = 6000` (`rag.ts:16`). Two strategies: full-inject for < 4000 chars total, relevance-scored for larger.
- `extractor.ts` — `extractKnowledge()` + `getClientKnowledge()` — LLM-powered extraction of facts from conversations into the knowledge base.

**External deps:** Supabase.

**Notable patterns:** This is pre-Pinecone — keyword matching + full-text, not vector. Separate from `lib/ai/memory.ts` which IS Pinecone-backed for per-user memories.

## memory/

**Purpose:** Per-customer memory (distinct from per-user memories in `lib/ai/memory.ts`).

**Key files:**
- `customer-memory.ts` — `getCustomerMemory` / `updateCustomerMemory` / `formatMemoryForPrompt` / `extractFactsFromConversation` — per-contact profile facts used by GHL poller + handler.
- `graph.ts` — relationship graph (1 TODO at line 135: "append source_memory_ids").

**External deps:** Supabase, LLM for fact extraction.

## multi-agent/

**Purpose:** Department AI worker definitions — Front Desk, Sales, Support, Collections, Review. Each with personality, keywords, priority for routing.

**Key files:** `agent-manager.ts` — `AGENT_ROLES: AgentRole[]` with `triggerKeywords` + `priority` for keyword-based agent routing (`agent-manager.ts:26-80`). Not LLM-based routing; this is regex-triggered.

**Notable patterns:** Overlaps conceptually with `lib/ai-workers/role-workers.ts` and `lib/ghl/ghl-tools.ts` — three places that define "agent archetypes" for different purposes (AI worker templates, multi-agent routing, GHL tool scoping). Potential consolidation target.

## onboarding/

**Purpose:** Onboarding step tracker.

**Key files:** `tracker.ts` — `markOnboardingStep(agencyId, step)` — writes progress events (e.g. `first_container_provisioned` — fired from `lib/ovh/provisioner.ts:384`).

## onfleet/

**Purpose:** Dispatch / delivery stack. 10 files.

**Key files:**
- `index.ts` — barrel export.
- `client.ts` — Onfleet REST wrapper.
- `sla-calculator.ts` — `calculateCompleteBefore`, `checkSlaBreach`, `calculateSlaStats`.
- `route-optimizer.ts` — `runOptimization` (Onfleet dispatch).
- `notification-gate.ts` — `evaluateNotificationGate` decides when to SMS customers.
- `rule-engine.ts` + `rules/` — per-client dispatch rule evaluation.
- `types.ts` — worker/task/team/zone types.

**External deps:** Onfleet API, SMS providers (`lib/sms/*`).

**Notable patterns:** Onfleet feeds into SMS delivery tracking (`lib/sms/delivery-tracker.ts`). Pattern is: Onfleet event → rule engine → notification gate → SMS template → SMS provider.

## openclaw/

**Purpose:** **LEGACY** — per-agency OpenClaw gateway client (predecessor to the current per-client OVH architecture). Kept for 6 importers only.

**Key files:**
- `client.ts` — `sendMessage`, `invokeTool`, `healthCheck`, `isOpenClawAvailable`, `OPENCLAW_TOOLS` catalog (17 tools), SSE parser.
- `gateway-resolver.ts` — `getGatewayByAgencyId`, `getGatewayByUserId`, `getGatewayByClientId`, `getGatewayByGhlLocation`, `resolveGatewayUrl`, `getDashboardUrl`. Throws `GatewayNotProvisionedError` on no match — **explicit no-fallback policy** to avoid cross-agency data leak.
- `gateway-ws.ts` — hand-rolled WebSocket client (bypasses the `ws` library due to webpack issues).
- `sessions.ts` — `getSessionKey(userId)` returns `kyra-user-${userId}` (`sessions.ts:36-38`) — the old session key format. 30-minute in-memory TTL via `activeSessions` Map.
- `prompts.ts` — OpenClaw-specific prompt helpers.

**Importers (6 total):**
- Routes: `app/api/chat/openclaw/route.ts`, `app/api/openclaw/health/route.ts`, `app/api/openclaw/tools/route.ts`
- Plus worktree dupes of the same routes (factor of 2× due to worktree structure)

**External deps:** Supabase (agency lookups), WebSocket, HTTP.

**Notable patterns:** `gateway-resolver.ts` is the paranoid version of `lib/ovh/gateway-resolver.ts` — same API shape, same policy (no fallback, no shared gateway), but looking up the agency's own gateway rather than a client's. Kept around because the 3 legacy routes haven't been migrated. All new code uses `lib/ovh/*`.

## ovh/

**Purpose:** **CURRENT** per-CLIENT gateway architecture. Replaces `lib/fly/*` (which was removed) and effectively supersedes `lib/openclaw/*`. Each client gets an isolated Docker container on an OVH VPS with Traefik wildcard routing (`{clientId}.gw.kyra.conversionsystem.com`).

**Key files:**
- `provisioner.ts` — the heart of the new architecture (1142 lines). Manages container lifecycle via HTTP calls to the OVH Provisioner API:
  - `provisionClientGateway(clientId, agencyId, config, resources, clientName)` — creates container with SOUL.md + USER.md + TOOLS.md (auto-generated via `buildContainerToolsMd()` at line 128-220 — documents the GHL tool API + CRM context lookup endpoints that the container calls back into Kyra for) + apiKeys + agentModel + firecrawlEnv + kyraEnv. Sets `gateway_status='running'` + stores `gateway_url/token/container_id` on the `agency_clients` row (`provisioner.ts:369-379`).
  - `provisionAgencyGateway(agencyId, agencyName)` — agency-owner-facing gateway (vs client-facing).
  - `chatViaGateway(clientId, message, options)` — OpenAI-compatible `/v1/chat/completions` call with optional tools + session persistence via `X-OpenClaw-Session-Key` header + Anthropic prompt caching (`cache_control: { type: 'ephemeral' }`) when model starts with `claude`.
  - `resolveClientGateway(clientId)` — DB lookup of gateway URL + token; falls back to agency-level gateway (`resolveClientGateway` at line 1053-1085).
  - `startClientGateway`, `stopClientGateway`, `wakeClientGateway`, `destroyClientGateway` — lifecycle ops.
  - `updateContainerApiKey`, `updateContainerTier` — live config updates (container recreation since Docker env vars are immutable).
  - `getGatewayConfig`, `patchGatewayConfig`, `replaceGatewayConfig`, `execContainerCommand` — openclaw.json config RPC.
  - `pushClientTemplates(clientId, templates)` — pushes per-client quick-answer templates to kyra-router (Tier-0 = $0, no LLM call).
  - `resolveWinningKey()` (line 31-48) — BYOK priority order **anthropic > openrouter > openai > google** (with selected_models override).
- `gateway-resolver.ts` — `getGatewayByClientId`, `getGatewayByGhlLocation`, `getGatewayByAgencyId`, `getFirstGatewayByUserId`, `resolveGatewayForUser`, `getDashboardUrlForClient`, `checkClientHealth`. Token passed via `/__openclaw__/#token=` hash fragment so it never hits server logs (`gateway-resolver.ts:273`).
- `gateway-client.ts` — `gatewayChat`, `gatewayChatStream`, `parseStreamToText` — generic OpenAI-compatible client wrapper (pre-provisioner-level client). Accepts `sessionKey` → sent as `X-Session-Key` header.
- `sync.ts` — per-client config sync (SOUL.md, knowledge base) without restart.

**External deps:** OVH Provisioner HTTP API (`OVH_PROVISIONER_URL`, authed with `OVH_PROVISIONER_SECRET`), Supabase, kyra-router.

**Notable patterns:**
- **BYOK routing bypass** (`provisioner.ts:277-295`): if agency has any key of their own, `hasByok=true` → skip kyra-router and use their provider's model directly. Rationale: router only saves Kyra money when Kyra's keys are in use.
- **Platform fallback model** (`provisioner.ts:293`): `openrouter/anthropic/claude-haiku-4.5` chosen over `gpt-4o-mini` for "better tool use" per comment.
- **Memory sizing** (`provisioner.ts:341`): 1536MB default — raised from 1024 because 1024 "causes OOM under load".
- **Firecrawl proxy** (`provisioner.ts:347-350`): container's `FIRECRAWL_API_KEY=kyra-agency-{agencyId}` is a synthetic token — Kyra's `/api/fc` proxy extracts the agencyId and tracks usage.
- **Agency gateway shares container prefix** (`provisioner.ts:976-979`): `kyra-cl-{agencyId}` — the provisioner-side prefix doesn't distinguish client vs agency; the database distinguishes them via `agencies` vs `agency_clients` tables.
- 30 importers across app routes + lib — dominant gateway path.

**Importers:** 30 files including core routes like `app/api/chat/worker/route.ts`, `app/api/portal/[clientId]/chat/route.ts`, `app/api/agency/clients/[id]/chat/route.ts`, `lib/ghl/poller.ts`, `lib/ghl/webhook-handler.ts`, `lib/automations/workflow-executor.ts`, `lib/integrations/sync.ts`, `lib/secrets/sync.ts`, `lib/skills/sync.ts`.

## packages/

**Purpose:** Industry-vertical package presets.

**Key files:** `home-services.ts` — pre-built config for home-services vertical (plumbing, HVAC, electrical, roofing, landscaping, pest, moving, cleaning).

## payments/

**Purpose:** Payment-link generation for customer invoicing (distinct from Stripe platform billing).

**Key files:** `payment-collection.ts` — likely wraps Stripe Connect invoices + GHL's payment-link API.

## pinecone.ts (top-level)

**Purpose:** Pinecone client singleton + vector CRUD.

**Key exports:** `getPinecone()`, `getIndex()`, `upsertVector`, `queryVectors` (filter by `user_id`), `deleteVector`, `VectorMetadata` type (`pinecone.ts:19-25`).

**Notable patterns:** Used by `lib/ai/memory.ts` for per-user memory search. Metadata filter `{ user_id: userId }` enforces per-user isolation at query time.

## pipeline/

**Purpose:** Autonomous sales pipeline — lead discovery → enrichment → AI Closer (GHL-routed AI replies) → follow-up.

**Key files:**
- `ai-closer.ts` — the flagship autonomous agent. When a lead replies, the closer: routes to correct OpenClaw container (matched by GHL location), uses SOUL.md + CAMPAIGN.md injected at container launch, leverages persistent memory, falls back to direct LLM if no container. Max 5 tool rounds (`ai-closer.ts:46`). `CREDIT_COSTS['pipeline.closer_response'] = 1`.
- `soul-injector.ts` — `resolveCloserContainer(campaignId)` + pushes campaign-specific SOUL.md + CAMPAIGN.md to the container.
- `crm-sync.ts` — bidirectional sync leads ↔ CRM. 2 TODOs at lines 127,130 ("Phase 2").
- `follow-up-engine.ts` — multi-touch follow-up sequencer (`CREDIT_COSTS['pipeline.follow_up'] = 1`).
- `ab-testing.ts` — message variant testing for outreach.
- `webhooks.ts` — `logAndFire(agencyId, event, data)` — pipeline event hooks out to agency webhooks.
- `lead-sources/` — `ai-discovery.ts`, `csv-upload.ts`, `outscraper.ts`, `index.ts`, `types.ts`. `CREDIT_COSTS['pipeline.find_leads'] = 5`, `pipeline.enrich = 2`, `pipeline.outscraper_lead = 1`.

**External deps:** OVH provisioner (for container routing), GHL API, LLMs (Claude + GPT-4o + Outscraper for lead discovery), Supabase.

**Notable patterns:** The AI Closer is the only piece of the platform that consciously **requires** OpenClaw per the header comment (`ai-closer.ts:13-21`): "WHY OpenClaw matters here (and nowhere else in the pipeline)" — for SOUL.md + CAMPAIGN.md + persistent memory across multi-turn sales conversations.

## rate-limit.ts (top-level)

**Purpose:** Serverless-safe rate limiter (Supabase-backed with in-memory fallback).

**Key exports:** `isRateLimited(key, limit=30, windowMs=60_000)`.

**Notable patterns:** In-memory Map approach alone would be useless on Vercel (resets per cold start) — so it does in-memory first as a cheap "already over limit" check, then Supabase `rate_limit_hits` count + insert. Probabilistic cleanup (1% chance per request, `rate-limit.ts:81-84`) prunes rows older than 1hr. **Opt-in, not systemic** — routes must call `isRateLimited()` explicitly.

## reviews/

**Purpose:** Review generation + AI reviewer responder.

**Key files:**
- `review-engine.ts` — post-service review-request generation (Friday autopilot action ties here).
- `ai-review-responder.ts` — LLM-drafted responses to inbound Google/Yelp reviews.

## secrets/

**Purpose:** Per-client encrypted secret vault (client_secrets table).

**Key files:**
- `crypto.ts` — AES-256-GCM encryption. Key derived from `SECRETS_ENCRYPTION_KEY` env var via SHA-256 (`crypto.ts:12-22`). Output format: `[12-byte IV][16-byte AuthTag][ciphertext]` base64-encoded.
- `index.ts` — CRUD for secrets. `SECRET_KEY_NAME_REGEX = /^[A-Z][A-Z0-9_]*$/` enforces uppercase-underscore key names. `assertClientBelongsToAgency()` guards every op (`secrets/index.ts:24-41`).
- `sync.ts` — pushes secrets to container env vars via OVH provisioner.

**External deps:** Node crypto, Supabase.

**Notable patterns:** The encryption key is SHA-256-derived rather than raw — handles arbitrary-length env var values. Unique constraint on (agency_id, client_id, key_name) — caught at error code 23505 (`secrets/index.ts:121-122`).

## security/

**Purpose:** Prompt-injection defense.

**Key files:** `prompt-injection.ts` — 3-layer defense:
1. **Pattern detection** — 40+ weighted regex patterns across instruction overrides, role hijacking, system prompt extraction, structural injection, data exfil, hidden/obfuscated content, boundary manipulation (`prompt-injection.ts:32-85`). Risk tiers: low (0-2) / medium (3-5) / high (6+).
2. **Input isolation** — wraps content in `<customer_message>...</customer_message>` XML delimiters (`wrapUserContent`, line 171-173).
3. **Output scanning** — scans AI replies for 11 leak patterns (SOUL.md / sk-* / pit-* / eyJ*/ 192.99.43.7 / openclaw.json / etc.) (`prompt-injection.ts:97-109`) and auto-redacts them.

`defend(rawInput, contactId)` is the main entry — called by `lib/ghl/poller.ts` + others. Per-contact rate limiting: 2 high/medium attempts/minute → 5-minute cooldown with a deflection reply (`prompt-injection.ts:248-285`).

**Notable patterns:** Four `@deprecated` exports kept for backward compat (`scanMessage`, `getBlockResponse`, `logSecurityEvent`, `buildInjectionDefensePromptSuffix`).

## seo/

**Purpose:** SEO growth engine — internal linking, city data, DataForSEO API, GSC sync, content publishing, schema markup, industry packs, platform provisioner (WordPress site creation).

**Key files:**
- `growth-engine-v2.ts` — orchestrator.
- `internal-linker.ts` + `internal-linker-writer.ts` — auto internal-link generation across site pages.
- `dataforseo.ts` — DataForSEO API wrapper for keyword data.
- `city-data.ts` — `ensureCityData(city)` — resolves lat/lng/population/neighborhoods.
- `gsc-sync.ts` — syncs Google Search Console query performance.
- `publish-scheduler.ts` — schedules content publishes.
- `schema-markup.ts` — 29 industry → Schema.org type mappings (`schema-markup.ts:15-46`) including `veterinary → VeterinaryCare`, `dental → Dentist`, etc. Has 1 `@deprecated` export `generateVetSchema` (line 92-95).
- `industry-packs.ts` — prebuilt SEO content packs per industry.
- `platform-provisioner.ts` — provisions a WordPress site for the client.
- `worker-dispatcher.ts` — dispatches SEO work to background workers.

**External deps:** DataForSEO, GSC, WordPress, Google (city data).

## sites/

**Purpose:** AI-generated website builder (18 files + `templates/` subdir). Separate from `lib/seo/*` but heavily integrated.

**Key files:**
- `content-engine.ts` — tiered LLM page generation: Homepage/About via Sonnet 4, service/city pages via GPT-4o, combos via GPT-4o-mini, FAQ/meta via Haiku, contact/reviews/schema via templates. Target budget ~$0.30/site (`content-engine.ts:2-15`). 1 TODO at line 222.
- `ai-html-engine.ts` + `ai-html-prompts.ts` — HTML generation prompts. 1 TODO.
- `prompts.ts` — page-type prompts.
- `schema-generator.ts` — JSON-LD Schema.org generation (has same veterinary pattern as `lib/seo/schema-markup.ts`).
- `html-sanitizer.ts`, `html-quality-checker.ts`, `design-quality-checker.ts`, `content-checker.ts` — quality gates.
- `industry-defaults.ts`, `section-variants.ts`, `design-system.ts`, `seo-helpers.ts` — design primitives.
- `knowledge-sync.ts` — syncs site content back to knowledge base (`lib/knowledge/rag.ts`).
- `unsplash.ts` — `resolvePhotos()` for hero/section photos.
- `build-helpers.ts`, `types.ts`, `templates/` (contains section variants).

**External deps:** LLMs (Claude + OpenAI + OpenRouter), Unsplash, Supabase, Pinecone (indirect via knowledge-sync).

## skills/

**Purpose:** ClawHub skill registry (container-side skills).

**Key files:**
- `registry.ts` — `buildSkillsPrompt(skillIds)` — prepends skill docs to system prompt.
- `sync.ts` — syncs required skills to the client's OVH container (see `role-workers.ts:requiredClawHubSkills`).

## sms/

**Purpose:** Delivery SMS system (not a generic SMS helper — Onfleet-oriented).

**Key files:**
- `index.ts` — barrel re-export.
- `templates.ts` — `DEFAULT_TEMPLATES`, `processWebhook`, `isWithinSendingHours`, `parseOnfleetEvent`, `extractVariables`, `renderTemplate`, `findTemplate`.
- `providers.ts` — `createProvider`, `SpringbigProvider`, `BlackleafProvider`, `MockProvider` — adapter pattern.
- `delivery-tracker.ts` — `logDeliverySms`, `getOrderTimeline`, `getSmsStats`, `getRecentLog`.
- `types.ts`, `campaign-engine.ts`.

**External deps:** Springbig, Blackleaf, Onfleet (upstream trigger).

**Notable patterns:** Onfleet event → SMS is a first-class flow: `lib/onfleet/index.ts`'s `executeRules` fires into `lib/sms/*` templates which then hit Springbig or Blackleaf via `createProvider`.

## stripe/

**Purpose:** Stripe SDK wrapper + Kyra-to-Kyra platform billing + Connect for agency-to-client billing + webhook handlers + **webhook health monitoring (NEW)**.

**Key files:**
- `config.ts` — `stripe` singleton (null during beta if no key — guarded by all callers). `STRIPE_PRICES` per `StripePriceKey` (4 monthly plans + 4 annual + 2 voice addon + legacy per_client). `planFromPriceId(priceId)` reverse-looks-up plan from price ID, resolving annual keys back to base plan.
- `subscriptions.ts` — `createAgencySubscription`, `updateAgencyPlan`, `cancelSubscription`, `getSubscriptionStatus`. Used for Kyra's own subscription billing.
- `connect.ts` — Stripe Connect **destination charges**. `createConnectAccount`, `createConnectOnboardingLink`, `createExpressDashboardLink`, `getConnectAccountStatus`, `createClientSubscription` (with `APPLICATION_FEE_PERCENT = 10` — Kyra takes 10% platform fee, `connect.ts:11`), `cancelClientSubscription`, `updateClientBillingAmount`, `syncConnectAccountStatus`, `createClientInvoice`. This is how agencies bill their own clients through Kyra and Kyra takes 10%.
- `webhooks.ts` — `verifyStripeWebhook` (HMAC via `constructEvent`), `handleInvoicePaid` (writes to `agency_billing`), `handleSubscriptionUpdated` (syncs plan from `planFromPriceId`, marks referral as `converted` if applicable `webhooks.ts:110-116`), `handleSubscriptionDeleted` (downgrade to `free`), `handleCheckoutSessionCompleted` (critical safety net — upgrades plan from session metadata + voice-addon activation, only upgrades never downgrades, uses `planRank` ordering `webhooks.ts:180-181`), `handleConnectAccountUpdated`.
- `webhook-health.ts` — **NEW** (added Apr 18 after incident where webhook was silently disabled, causing a customer's plan activation to fail — see header comment `webhook-health.ts:3-6`). Exports `getWebhookHealth()` which:
  1. Retrieves the primary webhook endpoint by hardcoded ID (`PRIMARY_WEBHOOK_ID = 'we_1TCcvQDr3LPJOIaMuaY1zJhG'` at line 16).
  2. Checks `endpoint.status !== 'enabled'` → alert.
  3. Verifies the 5 required events are registered: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded` — or wildcard `*` (`webhook-health.ts:72-85`).
  4. Fetches last 24h of events (up to 100), counts succeeded vs pending (`pending_webhooks === 0` = succeeded), alerts if all have pending webhooks.
  Returns `WebhookHealthStatus { healthy, endpoint, recentEvents, alerts, checkedAt }`. Result shape includes aggregate counts, oldest/newest checked, alert strings. Intended as a status-page data source + cron-alerting hook.
- `index.ts` — barrel re-export of all the above.

**External deps:** `stripe` SDK (v2025-04-30.basil API version, type-asserted due to SDK lag `config.ts:11`).

**Notable patterns:** The `checkout.session.completed` handler being a safety net for race conditions is explicit (`webhooks.ts:147-154`) — without that, `customer.subscription.updated` could fire before the agency row is findable by stripe_customer_id, or `planFromPriceId()` could return null if env vars are misconfigured, and the plan upgrade would never happen. Only-upgrade-never-downgrade via `planRank` ordering is a defensive guard against checkout for a lower tier.

## supabase/

**Purpose:** Supabase client factories.

**Key files:**
- `server.ts` — `createClient()` (RLS-respecting server client with cookies), `createServiceClient()` (bypasses RLS), `createServiceClientWithoutCookies()`. **Critical comment block at `server.ts:31-40`**: "Do NOT use createServerClient from @supabase/ssr here. When cookies are present, @supabase/ssr extracts the user's JWT from cookies and uses it for requests — even with the service_role key. This means RLS still applies, which defeats the purpose." The fix is always using `@supabase/supabase-js` (not `@supabase/ssr`) without cookies for service operations.
- `client.ts` — browser client.
- `middleware.ts` — Next.js middleware cookie refresh.

**Notable patterns:** `createServiceClient()` is really just an alias for `createServiceClientWithoutCookies()` preserved for readability. The comment is a painful-lesson artifact worth keeping.

## tasks/

**Purpose:** Autonomous task engine (Phase 3 per `tasks/index.ts:1`).

**Key files:**
- `task-types.ts` — task shape.
- `task-executor.ts` — runs a task (calls LLM, fires webhooks, etc.).
- `task-scheduler.ts` — cron-like schedule evaluation.
- `cron-utils.ts` — cron-string parsing helpers.

**Notable patterns:** Separate from `lib/autopilot/*` (weekly schedule) and `lib/automations/*` (event-triggered). Overlap area — could benefit from consolidation.

## templates/

**Purpose:** Industry templates.

**Key files:** `industry-templates.ts` — prebuilt templates per industry (paired with `lib/billing/premium-templates.ts` for gating).

## tools/

**Purpose:** Dashboard LLM tool-use implementations (not GHL tools — those are in `lib/ghl/skills/`).

**Key files:**
- `definitions.ts` — tool schemas + `getToolDefinitions(skillIds)` + `executeToolCall(name, input)` used by `lib/channels/router.ts`.
- `web-search.ts`, `url-fetch.ts`, `file-processor.ts`, `image-analysis.ts`, `browser-tool.ts` — tool implementations.

## utils.ts (top-level)

**Purpose:** Small helpers.

**Key exports:** `cn(...classes)` (clsx + tailwind-merge), `formatDate`, `truncate`, `generateConversationTitle`.

## voice/

**Purpose:** Multi-provider voice AI abstraction (5 providers).

**Key files:**
- `provider.ts` — `getVoiceProvider(provider, apiKey): VoiceProviderClient` — factory dispatching to: `VapiClient | SynthflowClient | RetellClient | KyraNativeClient | GHLVoiceClient` (`provider.ts:11-20`). Also `buildVoiceSystemPrompt(ctx)` + `buildVoiceConfig(ctx)` + `VOICE_PROVIDERS` display config (per-provider pricing/docs/signup URLs).
- `vapi.ts`, `synthflow.ts`, `retell.ts`, `kyra-native.ts`, `ghl.ts` — per-provider adapters all implementing `VoiceProviderClient`.
- `twilio-phone.ts` — phone number provisioning for Kyra Native (Twilio-backed).
- `types.ts` — `VoiceProvider`, `VoiceProviderClient`, `VoiceAssistantConfig`.

**External deps:** Vapi, Synthflow, Retell, Deepgram (via Kyra Native), OpenClaw TTS (Kyra Native), Twilio, GHL.

**Notable patterns:** Common interface `VoiceProviderClient` lets the rest of the app treat all 5 providers uniformly. `buildVoiceSystemPrompt` injects phone-specific rules ("don't speak in bullet points", "this is a PHONE CALL, not a chat") — a strict departure from chat prompts.

## worker/

**Purpose:** Legacy Cloudflare Worker health check (`features.useWorker=true` path).

**Key files:** `health.ts` — `checkGatewayHealth(gatewayUrl)` — wraps a 10s-timeout fetch to `{url}/health`, returns `{reachable, status, data, error, latencyMs}`.

---

## A. Dependency Graph Sketch

**Foundation (no intra-lib deps, or only a few):**
- `lib/supabase/*` — universal.
- `lib/utils.ts`, `lib/pinecone.ts`, `lib/rate-limit.ts` — universal top-level.
- `lib/secrets/crypto.ts` — only Node `crypto`.
- `lib/auth/cron.ts` — only Next.js.
- `lib/config/features.ts` — only env.
- `lib/security/prompt-injection.ts` — pure string processing.
- `lib/data/roles-data.ts` — static data.

**Core services layer (depend on foundation):**
- `lib/billing/*` (credit-engine, plans, byok, model-credits, credits, classify-usage) → `lib/supabase/server`.
- `lib/stripe/*` → `lib/supabase/server`, `stripe` SDK. Also consumed by `lib/billing/stripe.ts`.
- `lib/ai/*` → `lib/supabase`, `lib/pinecone`, Anthropic + OpenAI SDKs.
- `lib/openclaw/*` (legacy) → `lib/supabase`, hand-rolled WS.
- `lib/ovh/*` → `lib/supabase`, `lib/agency/ai-models`, `lib/billing/model-credits`, `lib/onboarding/tracker`.
- `lib/agency/*` → `lib/supabase`, `lib/ghl/webhook-types`.
- `lib/secrets/*` → `lib/supabase`, `lib/secrets/crypto`, `lib/ovh` (for sync).
- `lib/tools/*` → LLM clients.

**Integration layer (depend on core services):**
- `lib/ghl/*` → `lib/supabase`, `lib/ovh/provisioner` (for `chatViaGateway` + `resolveClientGateway`), `lib/billing/credit-engine`, `lib/security/prompt-injection`, `lib/memory/customer-memory`, `lib/knowledge/extractor`, `lib/ai-workers/performance-tracker`, `lib/agency/container`, `lib/agency/permissions`, `lib/crm/conversation-logger`.
- `lib/voice/*` → per-provider SDKs.
- `lib/sms/*` → `lib/onfleet` (upstream), `lib/supabase`.
- `lib/channels/*` → `lib/ai/*`, `lib/ovh/gateway-resolver`, `lib/tools/definitions`, `lib/skills/registry`.
- `lib/email/*` → `lib/ghl/api` (platform-sender), Resend.
- `lib/onfleet/*` → Onfleet SDK, `lib/sms/*` (downstream).
- `lib/integrations/*` (Google, GSC, WordPress, HeyGen, Jane) → per-provider SDKs, `lib/supabase`, `lib/ovh` (sync).
- `lib/knowledge/*`, `lib/memory/*` → `lib/supabase`, `lib/ai/embeddings` (for `lib/ai/memory` path).

**Feature/top-of-stack (compose everything):**
- `lib/autopilot/*` → `lib/ghl`, `lib/email`, `lib/sms`, `lib/crm`.
- `lib/multi-agent/*` → pure data, routed by agent-manager consumers.
- `lib/chat/*` → `lib/billing/credit-engine`, `lib/billing/model-credits`, `lib/ai/*`.
- `lib/business-box/*` → everything under it (reviews, autopilot, multi-agent, memory, etc.).
- `lib/pipeline/*` → `lib/ovh` (for `resolveCloserContainer`), `lib/ghl`, `lib/billing/credit-engine`, `lib/billing/byok`.
- `lib/sites/*` → `lib/knowledge/rag`, `lib/seo/city-data`, `lib/seo/schema-markup`, LLMs, `lib/billing/credit-engine`.
- `lib/seo/*` → `lib/integrations/gsc`, `lib/integrations/wordpress`, LLMs.
- `lib/tasks/*`, `lib/automations/*` → `lib/ovh` (for pushing to container), `lib/supabase`.
- `lib/reviews/*`, `lib/funnels/*`, `lib/campaigns/*`, `lib/analytics/*`, `lib/briefing/*`, `lib/blog/*`, `lib/commerce/*` → LLMs + Supabase + domain-specific.

**Observation:** `lib/ovh/provisioner.ts` is the single most-depended-on integration file — 30 importers. `lib/billing/credit-engine.ts` is the most-depended-on foundation file after `lib/supabase/server.ts`. The system has a clean layered shape with one notable leak: `lib/ghl/poller.ts` defines its own private `resolveAgencyApiKey` (line 57-81) duplicating `lib/billing/byok.ts:resolveAgencyApiKey` — both with slightly different priority orders.

## B. OpenClaw Integration: `lib/openclaw/*` (legacy) vs `lib/ovh/*` (current)

**Legacy `lib/openclaw/*`:**
- 5 files. Per-**agency** gateway model (one OpenClaw container per agency, multi-tenant via session keys).
- Session key: `kyra-user-${userId}` (`openclaw/sessions.ts:36-38`).
- Hand-rolled WebSocket client in `gateway-ws.ts` (dynamic import from `sessions.ts:10-16` to keep it out of Edge bundles) to bypass webpack issues with the `ws` library.
- 30-minute in-memory session TTL (`openclaw/sessions.ts:31`).
- **6 importers total** — all 3 route paths (`app/api/openclaw/health`, `app/api/openclaw/tools`, `app/api/chat/openclaw`), doubled by worktree copies.
- "No fallback" policy — if no per-agency gateway, `GatewayNotProvisionedError` thrown (`gateway-resolver.ts:32-36`).

**Current `lib/ovh/*`:**
- 4 files (`provisioner.ts`, `gateway-resolver.ts`, `gateway-client.ts`, `sync.ts`).
- Per-**CLIENT** gateway model (one OpenClaw container per `agency_clients` row).
- Gateway URL pattern: `{clientId}.gw.kyra.conversionsystem.com` via Traefik wildcard routing (`provisioner.ts:20`).
- OpenAI-compatible `/v1/chat/completions` HTTP API (not WebSocket — the main architectural shift).
- Session key: `agent:client:${clientId}` (from `lib/agency/container.ts:14-16`) — passed as `X-OpenClaw-Session-Key` header (`provisioner.ts:724`) or `X-Session-Key` (`gateway-client.ts:61`).
- **30 importers** — dominant path, including the GHL poller and webhook, portal chat, worker chat, automations, integrations, secrets, skills.
- Anthropic prompt caching: auto-applied to system prompts when model starts with `claude` (`provisioner.ts:677-696`).
- BYOK routing bypass: if agency has ANY key, skip kyra-router and use their provider's model directly (`provisioner.ts:281-295`).

**Session key pattern evolution:**
- Original: `kyra-user-${userId}` — per agency-user (`lib/openclaw/sessions.ts:36-38`). Still documented in `CLAUDE.md` line 75 and `TECHNICAL-SPEC.md`, but code has moved on.
- Current per-client: `agent:client:${clientId}` (`lib/agency/container.ts:14-16`, used by `lib/ghl/webhook-handler.ts` and `lib/ghl/poller.ts`).
- Current per-individual-user: `agent:main:${userId}` (`lib/agency/container.ts:21-23`) — solo accounts.
- Per-customer within client (mentioned in `KYRA-STRATEGIC-ROADMAP.md:161` and 631 but not found in code): `agent:client:{id}:contact:{contactId}`. This is the planned next step but not yet implemented — current code is a single client-level session for all inbound messages.

**Feature flags (`lib/config/features.ts`):**
- `useWorker` (`KYRA_USE_WORKER=true`) — route chat through Cloudflare sandbox Worker — used by `lib/channels/router.ts:80` for inbound channel messages. Legacy from an earlier architecture.
- `useOpenClaw` (`KYRA_USE_OPENCLAW=true`) — route chat through OpenClaw gateway on Mac Mini — appears dormant in new code (the OVH path is direct, no flag gate).
- `openclawSkills` (`KYRA_OPENCLAW_SKILLS=true`) — enable OpenClaw skill ecosystem (web search, file ops, sub-agents, TTS, etc. — see `OPENCLAW_TOOLS` catalog in `lib/openclaw/client.ts:168-198`).

All three flags predate the current OVH per-client architecture. In practice, new code paths (GHL poller, AI Closer, portal chat) skip these flags and go straight to `resolveClientGateway` + `chatViaGateway`. The flags only meaningfully gate legacy channel routing.

**Dead zone summary:** `lib/openclaw/*` can be deleted once the 3 legacy routes (`app/api/openclaw/*`, `app/api/chat/openclaw`) are migrated or removed. The worktree copies may complicate the count but the logical number is 3 route files.

## C. AI/Agent Orchestration — 4 Overlapping Call Paths

**Path 1: Dashboard chat → `lib/ai/claude.ts`**
- Entry: `streamChat` / `streamChatWithTools` (direct Anthropic).
- Route: presumably `app/api/chat/route.ts` (dashboard path).
- No OpenClaw involvement. Uses `resolveModelPreference()` from `lib/ai/model-router.ts` for auto-routing.
- Tool loop: 5 rounds max (`claude.ts:95`).

**Path 2: Widget/GHL (webhook mode) → `lib/chat/core.ts` + `lib/ghl/webhook-handler.ts` + `lib/ghl/smart-handler.ts`**
- Entry: `processInboundMessage` → `processWithSmartEngine`.
- Goes direct to LLM via `lib/ghl/direct-llm.ts:callLLMWithTools` **because the OpenClaw gateway proxy strips the `tools` parameter** (see explicit comment `direct-llm.ts:1-9`).
- Falls back to bridge relay (OVH gateway) only if the smart engine fails (`webhook-handler.ts:40-41`).
- Uses `lib/ghl/model-router.ts` (provider-aware — picks between `claude-haiku-3-5` / `gpt-4o-mini` / `gemini-2.0-flash` / `meta-llama/llama-3.1-8b-instruct` for simple messages).

**Path 3: Containerized OpenClaw → `lib/ovh/gateway-client.ts:gatewayChat` / `lib/ovh/provisioner.ts:chatViaGateway`**
- Entry: routes call `resolveClientGateway` → HTTP POST to `{gateway_url}/v1/chat/completions` with `X-OpenClaw-Session-Key` header.
- Used by: worker chat (`app/api/chat/worker/route.ts`), portal chat (`app/api/portal/[clientId]/chat/route.ts`), GHL poller (`lib/ghl/poller.ts`), AI Closer (`lib/pipeline/ai-closer.ts`), channel router (`lib/channels/router.ts:116-128` when `features.useWorker=true`).
- Full SOUL.md + USER.md + TOOLS.md + AGENTS.md injected into the container at provision time.
- Session persistence in the container filesystem at `workspace/agents/main/sessions/{sessionId}.jsonl` (per comment in `provisioner.ts:640-641`).
- Anthropic prompt caching auto-applied for `claude*` models.

**Path 4: GHL direct-LLM → `lib/ghl/direct-llm.ts:callLLMWithTools`**
- Entry: when tools are needed (GHL function-calling) — called from `lib/ghl/poller.ts` and `lib/ghl/smart-handler.ts`.
- **Bypasses OpenClaw gateway specifically because the proxy doesn't forward `tools`**. This is the reason for the 4th path — structural, not historical.
- Priority: override key → `lib/billing/byok.ts:resolveAgencyApiKey` (whose priority is `openai > anthropic > openrouter > google`) → `OPENAI_API_KEY` → `OPENROUTER_API_KEY`.

**Model router drift between `lib/ai/model-router.ts` and `lib/ghl/model-router.ts`:**
- **Same:** `COMPLEX_KEYWORDS` list is word-for-word identical (`ai/model-router.ts:36-45` vs `ghl/model-router.ts:69-79`).
- **Same:** Both have a `routeMessage()` function with `classifyMessage()` logic.
- **Different:** `ai/model-router.ts` uses a 3-tier system (economy / standard / premium) via `MODEL_TIERS` from `lib/agency/types.ts`; `ghl/model-router.ts` is provider-aware (anthropic/openai/google/openrouter) with per-provider tier maps.
- **Different:** `ai/model-router.ts` supports agency-configured custom `premiumPatterns` regex (`ai/model-router.ts:92-106`); the GHL one does not.
- **Different:** `ai/model-router.ts` has `ECONOMY_PATTERNS` at lines 20-33 (6 patterns); `ghl/model-router.ts` has `SIMPLE_PATTERNS` at lines 58-66 (7 patterns, overlapping but not identical).
- **Drift risk:** Both files include a header comment acknowledging the duplication and explicitly say "keep classification heuristics in sync when updating either" (`ai/model-router.ts:10-13` + `ghl/model-router.ts:2-7`). Reality: they've already drifted (different pattern counts, different COMPLEX_KEYWORDS in one has been edited to add `'debug', 'implement', 'refactor'...`).

**Multi-Agent (`lib/multi-agent/agent-manager.ts`):**
- Pure data — `AGENT_ROLES[]` with `triggerKeywords` + `priority`. Keyword-based routing to Front Desk / Sales / Support / Collections / Review agents.
- Consumed by higher-level routers to pick which persona to respond as. **Not** an LLM-based router.

**AI Workers (`lib/ai-workers/role-workers.ts`):**
- Also pure data — `ROLE_WORKERS[]` template definitions. Separate from multi-agent roles. Used by the dashboard "AI Workers" tab + AI Setup one-click deploy.

**Autopilot (`lib/autopilot/autopilot-engine.ts`):**
- Time-based (weekly schedule of 6 actions). Not LLM-driven routing; cron-based dispatcher that uses templates.

**Pipeline AI Closer (`lib/pipeline/ai-closer.ts`):**
- Uses Path 3 (containerized OpenClaw) as primary, Path 4 (direct LLM) as fallback. Explicitly requires OpenClaw for persistent memory across multi-turn sales (see header comment).

**Summary:** Four paths exist for structural reasons (tools-not-forwarded, BYOK, dashboard vs channel, legacy) rather than historical accident. Consolidation opportunity: a unified "ai-orchestrator" shim that takes a `(message, context, wantTools, wantContainer)` tuple and dispatches — but the complexity is legitimate.

## D. Billing Architecture

**Plan catalog — `lib/billing/plans.ts`:**
- 5 tiers: `free` (1 client, 0 credits, 50 welcome) / `solo_pro` ($39, 1 client, 2000cr, hidden from signup) / `starter` ($99, 4 clients, 5000cr) / `pro` ($299, 11 clients, 15000cr) / `scale` ($499, 21 clients, 30000cr). Each has `maxClients`, `monthlyCredits`, `monthlyWebScrapes`, `maxTeamMembers` (0/0/2/4/6), `trialDays` (0 across the board currently).
- Annual pricing at line 248-253: 20% discount (`solo_pro` $29/mo / $348/yr, `starter` $79/mo, `pro` $239/mo, `scale` $399/mo).
- Voice addon: $79/mo or $63/mo annual for 300 minutes (`plans.ts:258-276`).
- Legacy `starter → "Lite"` display name (`plans.ts:84`) — env var `STRIPE_LITE_PRICE_ID` aliases `STRIPE_STARTER_PRICE_ID` per comment at `stripe/config.ts:38`.

**Credit engine SSOT — `lib/billing/credit-engine.ts`:**
- `CREDIT_COSTS` dict at line 54-101 — single source of truth for action pricing. 26 action types across pipeline / chat / channel / crm / website / campaign+funnel / seo / system (free).
- `requireCredits(agencyId, action, multiplier, overrideCost?)` — preflight, non-mutating. Returns `{allowed, balance, cost, shortfall}`. Override cost supports model-aware pricing (e.g. Sonnet = 75cr vs mini = 1cr both billed as `chat.message`).
- `deductCredits(agencyId, action, {multiplier, override, clientId, description})` — only after the operation succeeds. Writes to `credit_transactions` + fires low-balance notification at 50 (`LOW_BALANCE_THRESHOLD` at line 49).
- `deductCredit` (legacy single-credit) kept for backward compat with older routes (`credit-engine.ts:269-278`).
- `addCredits` for purchase/bonus/manual — distinguishes `purchase` type to increment `lifetime_purchased`.
- Low-balance notifier: fires `ESCALATION_WEBHOOK_URL` with `{type: 'low_credits', balance, threshold, notifyEmail, message}` (`credit-engine.ts:361-387`).

**Model credits — `lib/billing/model-credits.ts`:**
- Per-turn cost for 12 models. Calibrated Mar 30 2026 against real OpenRouter spend data (header comment at lines 1-20). Key changes post-calibration: Sonnet 4.6 went 15cr → 75cr (was a loss at 15cr), Opus 4.6 went 35cr → 125cr.
- `getCreditsForModel(modelId)` + `normalizeModelId(modelId)` — `MODEL_ID_ALIASES` (lines 170-212) has ~40 entries handling OpenRouter slugs, dot→dash, prefix variants.
- `MODEL_ROUTER_TIER` + `getRouterTierForModel(modelId)` → `KYRA_MAX_TIER` env var on the container, controls kyra-router's max tier (`ovh/provisioner.ts:303-339`).

**BYOK — `lib/billing/byok.ts`:**
- `resolveAgencyApiKey(agencyId, preferredProvider='openai')` — priority on paper: `preferred > openai > anthropic > openrouter > google` (`byok.ts:63-65`). **Note:** The spec claims `anthropic > openrouter > openai > google`, but that order lives in `lib/ovh/provisioner.ts:36-48` (`resolveWinningKey`) and `lib/ghl/poller.ts:68-80` — two functions do related-but-different things with different orderings.
- `isByok = true` when agency has any key; `skipCredits = true` only when `isByok && plan ∈ PAID_PLANS` (starter/pro/scale/solo_pro/beta per `byok.ts:26`). Free-plan BYOK agencies still pay platform credits — rationale at file top: "They're using our routing, CRM, and infrastructure regardless."

**Referral activation — `lib/billing/referral-activation.ts`:**
- `activateReferral(referralRowId, referrerId, referredId, isEarlyBird)` — grants `isEarlyBird ? 150 : 100` credits to referrer + `FRIEND_CREDITS = 100` to friend (`referral-activation.ts:20-23`).
- Fires **immediately on signup** — email confirmation gate was blocking all referral conversions in practice (see header comment lines 3-14). `checkAndActivateReferral` kept as email-callback safety net.
- Streak bonus: +50cr to referrer when 3 activations in 7 days (`referral-activation.ts:69-84`).
- Atomic status update `.eq('status', 'signed_up')` guards against double-activation.

**Stripe webhooks flow (`lib/stripe/webhooks.ts`):**
1. Route receives raw body + `Stripe-Signature` header.
2. `verifyStripeWebhook(body, signature)` → `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`.
3. Route switches on `event.type`:
   - `invoice.paid` → `handleInvoicePaid` → inserts into `agency_billing` with type `subscription` / `client_fee` / `credit_topup` based on metadata.
   - `customer.subscription.updated` → `handleSubscriptionUpdated` → finds agency by `stripe_customer_id`, loops subscription items, resolves `plan` via `planFromPriceId`, writes to `agencies`. Also marks referral `converted` if agency was referred and upgraded off `free`.
   - `customer.subscription.deleted` → `handleSubscriptionDeleted` → downgrade to `free`.
   - `checkout.session.completed` → `handleCheckoutSessionCompleted` — safety net: upgrades plan from session metadata (never downgrades, uses `planRank`), activates voice addon, seeds `voice_usage` row with 300 min limit.
   - `account.updated` → `handleConnectAccountUpdated` → dynamic import of `syncConnectAccountStatus` from `./connect` (DRY with Connect onboarding path).

**Stripe Connect 10% fee (`lib/stripe/connect.ts:10-11`):**
- `APPLICATION_FEE_PERCENT = 10`.
- Applied via `application_fee_percent: 10` on subscription creation (`connect.ts:269`) and `application_fee_amount` on one-time invoices (`connect.ts:537`).
- Price objects created on the connected account, then subscription created with the fee. 10% of the full amount flows to Kyra's platform account, 90% to the agency's connected account.

**NEW — `lib/stripe/webhook-health.ts` (post-Apr 18 incident):**

**Purpose:** Monitor the Stripe webhook endpoint to catch silent outages — like the Apr 18 incident where the webhook was disabled and a customer's plan activation silently failed.

**Exports:**
- `WebhookHealthStatus` interface with: `healthy: boolean`, `endpoint: {id, url, status, enabledEvents} | null`, `recentEvents: {total, succeeded, failed, pending, oldestChecked, newestChecked}`, `alerts: string[]`, `checkedAt: string`.
- `getWebhookHealth(): Promise<WebhookHealthStatus>` — does two things:
  1. **Endpoint check:** `stripe.webhookEndpoints.retrieve(PRIMARY_WEBHOOK_ID)` where `PRIMARY_WEBHOOK_ID = 'we_1TCcvQDr3LPJOIaMuaY1zJhG'` is hardcoded (line 16). Alerts if `status !== 'enabled'`. Verifies the 5 required events (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`) are registered, or `*` wildcard acceptable (`webhook-health.ts:72-85`).
  2. **Delivery check:** `stripe.events.list` with `created: {gte: now-24h}`, limit 100, filter on the 5 required event types. For each, if `pending_webhooks === 0` → counted as succeeded. If ALL have pending webhooks → alert "All recent events have pending/undelivered webhooks!".

**Healthy = no alerts.** Each failure mode produces a distinct string in `alerts[]` so a status page or cron can show the exact issue. Graceful degradation: if Stripe isn't configured, returns `{healthy: false, alerts: ['Stripe not configured']}` rather than crashing. Try/catch around each Stripe call so a Stripe-side failure produces an alert instead of exploding.

**Deployment-specific gotcha:** The hardcoded `PRIMARY_WEBHOOK_ID` means this only works against whatever Stripe account's webhook endpoint has that ID. Not env-driven.

## E. Integrations Layer

**GHL (50 tools, poller vs webhook, token refresh):**
- 23 files in `lib/ghl/` + 9 in `lib/ghl/skills/`. **Dual ingestion** is the structural backbone:
  - **Poller** (`poller.ts`) — polls Conversations API every N seconds, finds new inbound messages, processes through OVH gateway or direct-LLM. Works with draft marketplace apps that can't receive webhooks.
  - **Webhook** (`webhook-handler.ts`) — real-time, preferred when available.
- **50 tools** split across `skills/`: contacts (create/update/search/tag/note), calendar (book/reschedule/cancel/slots/get_calendars), opportunities (create/update/stage/mark_won_lost), conversations (send_sms/send_email/send_whatsapp), tasks, invoices, marketing (trigger_workflow, add_to_workflow). Plus `escalate_to_human` special tool that doesn't call GHL.
- **Token refresh** (`client.ts:90-91`): dedup via `isRefreshing` + `refreshPromise` — one in-flight refresh, other calls await the same promise. On 401, refresh + retry. `onTokenRefresh` callback persists new tokens back to `agency_clients` row (`index.ts:41-50`).
- **Security**: every inbound message passes through `defend(body, contactId)` + `scanOutput(reply)` from `lib/security/prompt-injection`.

**integrations/* (non-GHL):**
- `google.ts` — Google Calendar OAuth + event CRUD.
- `google-search-console.ts` + `gsc.ts` — GSC OAuth + query performance pulls.
- `wordpress.ts` — publishes AI content to WordPress.
- `heygen.ts` — AI-avatar video generation.
- `jane.ts` — Jane scheduling (medical/dental-specialized).
- `sync.ts` — pushes integration state to container.

**channels/* (Telegram/WhatsApp/Discord unified via router.ts):**
- `processChannelMessage(userId, text, channelType)` is the unified entry. Routes through OVH gateway (`features.useWorker=true`) first, falls back to direct Claude API.
- `discord.ts` — Discord bot specifics (intents, gateway).
- `voice.ts` — voice-channel bridge.
- `whisper.ts` — transcription.

**sms/* (delivery Onfleet → Springbig/Blackleaf):**
- Pattern: Onfleet event → `lib/onfleet/rule-engine.ts:executeRules` → notification gate → `lib/sms/templates.ts:processWebhook` → `createProvider(config)` → `SpringbigProvider` or `BlackleafProvider` or `MockProvider`.
- Delivery tracked in `lib/sms/delivery-tracker.ts` with timeline view.

**voice/* (5 providers via VoiceProviderClient interface):**
- `getVoiceProvider(provider, apiKey)` returns `VoiceProviderClient` instance.
- Providers: Vapi (flexibility), Synthflow ($1,400/mo white-label for agencies), Retell (enterprise), Kyra Native (Deepgram + OpenClaw, ~5cr/min), GHL (included in agency's GHL sub).
- `buildVoiceSystemPrompt(ctx)` enforces phone-call conventions ("don't speak in bullet points", "it's a PHONE CALL, not a chat") — distinct from chat prompts.
- Config includes `maxDurationSeconds: 600` (10min max call), `silenceTimeoutSeconds: 30`.

**email/* (GHL-first, Resend fallback, 7-email nurture):**
- `sender.ts:sendEmail(params, ghlOptions)` — tries GHL send if `ghlOptions.clientId + contactId` provided, falls back to `sendEmailViaResend` which is really a wrapper that routes through GHL platform account (`ghl-platform-sender.ts` sends from `hello@conversionsystem.com` via the Conversion System GHL sub).
- Resend (`onboarding@resend.dev`) is the ultimate fallback only when GHL is unavailable — neither `conversionsystem.com` nor `kyra.conversionsystem.com` are verified in Resend (see comment `sender.ts:10-12`).
- **7-email / 21-day nurture sequence** via `nurture-sequence.ts` + `nurture-enrollment.ts` + a queue (`email_nurture_queue` table per `sequences.ts:17-19` comment). Old `sequences.ts` is a deprecated stub.

**onfleet/* (dispatch stack):**
- `client.ts` — Onfleet REST wrapper (tasks, workers, teams).
- `sla-calculator.ts` — SLA math: `calculateCompleteBefore`, `checkSlaBreach`, `calculateSlaStats`.
- `route-optimizer.ts` — `runOptimization` calls Onfleet's optimization API.
- `notification-gate.ts` — `evaluateNotificationGate` decides when the customer should be SMS'd (quiet hours, dedup).
- `rule-engine.ts` + `rules/` — per-client dispatch rules.

## F. Security & Auth

**`lib/supabase/server.ts:31-40` — the critical comment:** "Do NOT use createServerClient from @supabase/ssr here. When cookies are present, @supabase/ssr extracts the user's JWT from cookies and uses it for requests — even with the service_role key. This means RLS still applies, which defeats the purpose." The fix: always use `@supabase/supabase-js` without cookies for service operations. `createServiceClientWithoutCookies()` is the one true factory.

**`lib/auth/cron.ts` — fail-closed:** If `CRON_SECRET` is unset, every cron call returns 500 (`cron.ts:27-29`). Accepts `Authorization: Bearer` or `?secret=`. `extraSecretEnvVars` lets routes accept a second secret during rotation. `requireCron(req)` is the route-handler wrapper.

**`lib/agency/middleware.ts:requireAgencyMember`** — 3-step check: (1) `supabase.auth.getUser()` (401 on failure), (2) lookup `agency_members` row by `user_id` (403 on failure), (3) lookup `agencies` row by `agency_id` (404 on failure). Returns `{data: {user, agency, membership}, error: null}` discriminated union. `requireAgencyAdmin` and `requireAgencyOwner` build on this by additionally checking `membership.role`.

**`lib/secrets/` — AES-256-GCM:**
- `crypto.ts` — AES-256-GCM. 12-byte IV, 16-byte auth tag. Key derived from `SECRETS_ENCRYPTION_KEY` env var via SHA-256 to produce a stable 32-byte key regardless of env var length. Output format: `[IV 12B][AuthTag 16B][ciphertext]` base64.
- `index.ts` — CRUD gated by `assertClientBelongsToAgency(agencyId, clientId)` on every op. Key names normalized to uppercase and validated against `/^[A-Z][A-Z0-9_]*$/`.
- Unique constraint on (agency_id, client_id, key_name) caught via error code 23505.

**`lib/security/prompt-injection.ts` — 3-layer `defend()`:**
1. **Input analysis**: 40+ weighted regex patterns across 6 categories (instruction overrides, role hijacking, system prompt extraction, structural injection, data exfil, boundary manipulation). Risk tiers: low (0-2) / medium (3-5) / high (6+). `AUTO_BLOCK_PATTERNS` for near-certain attacks (DAN, "ignore all previous instructions", jailbreak).
2. **Input isolation**: wraps in `<customer_message>...</customer_message>` XML delimiters.
3. **Output scan**: `scanOutput(reply)` scans for 11 leak patterns — SOUL.md, `sk-*`, `pit-*`, `eyJ*`, `192.99.43.7` (the VPS IP), `bd99e2cf`, `openclaw.json`, internal DB field names — and auto-redacts.

Rate limiting per contact ID: 2 medium/high attempts in 60s → 5-minute cooldown with deflection reply. The `recentAttempts` Map is in-memory so doesn't survive cold starts — a reasonable trade since attackers would just rate-limit themselves.

**`lib/rate-limit.ts` — opt-in, not systemic:** Routes must explicitly call `isRateLimited(key, limit, windowMs)`. Uses Supabase `rate_limit_hits` table + in-memory fallback. Count-first-then-insert to avoid race inflating count (`rate-limit.ts:63-79`). Probabilistic cleanup at 1% per request. Table might not exist in some deployments — DB failure falls back to in-memory only.

## G. Dead / Legacy / Risky Code

**`lib/fly/*` — REMOVED (confirmed):** `ls lib/fly` returns "No such file or directory". `grep -r "from '@/lib/fly"` returns 0 matches. Clean removal.

**`lib/openclaw/*` — LEGACY:** 5 files, 3 route importers (doubled by worktree copies = 6 total). Superseded by `lib/ovh/*` which has 30 importers. Safe to remove once the 3 legacy routes (`app/api/openclaw/health`, `app/api/openclaw/tools`, `app/api/chat/openclaw`) are migrated or deleted.

**`lib/email/sequences.ts` — DEPRECATED STUB:** The entire file is a deprecation notice + stubbed `getSequenceEmail` (returns null) + stubbed `sendSequenceEmail` (returns `{ok: false, skipped: 'Deprecated — use nurture queue'}`). Functionality moved to `nurture-sequence.ts`. Safe to delete once all imports are gone.

**5 `@deprecated` functions in `lib/billing/plans.ts:203-243`:**
- Line 204: `getPlanLimit` (use `getPlanClientLimit`).
- Line 209: `isWithinLimit` (use `canAddClient`).
- Line 226: `getCreditCost` — always returns 1; credits are now per-model, not per-action in this file.
- Line 229: `getUsagePercentage` — always returns 0.
- Line 232: `classifyChatAction` — kept for API compat (note: `lib/billing/classify-usage.ts` is the live version).
- Rationale at line 213-215: "These are kept so existing chat/voice routes compile without changes. Credits are no longer enforced; all calls return permissive values." The active credit engine is `lib/billing/credit-engine.ts`.

**4 `@deprecated` in `lib/security/prompt-injection.ts:289-331`:**
- `scanMessage` (use `analyzeInput` / `defend`).
- `getBlockResponse` (use `defend().deflectReply`).
- `logSecurityEvent` (logging moved inline to `lib/ghl/poller.ts`).
- `buildInjectionDefensePromptSuffix` (use `buildSecurityReminder` + `defend()`).

**1 `@deprecated` in `lib/seo/schema-markup.ts:92-95`:** `generateVetSchema(clinic)` — use `generateBusinessSchema({...clinic, industry: 'veterinary'})`.

**schema-markup.ts hardcoded industries:** The `INDUSTRY_SCHEMA_TYPES` dict (29 industries) is static — adding a new industry requires editing two files (`lib/seo/schema-markup.ts:15-46` AND `lib/sites/schema-generator.ts:31`). Same VeterinaryCare mapping in both places. Consolidation target.

**Dual model routers** — `lib/ai/model-router.ts` and `lib/ghl/model-router.ts` — already drifted despite explicit "keep in sync" comments in both headers.

**Dual `resolveAgencyApiKey`** — one in `lib/billing/byok.ts:35-88` (priority `preferred > openai > anthropic > openrouter > google`), one local to `lib/ghl/poller.ts:57-81` (priority `anthropic > openrouter > openai > google`). Plus a third related function `resolveWinningKey` in `lib/ovh/provisioner.ts:31-48` with the same ordering as `poller.ts`. Three places, two orderings — the platform can end up using different keys in different subsystems for the same agency.

**TODO count across `lib/`:**
- `lib/memory/graph.ts:135` — append source_memory_ids (1).
- `lib/pipeline/crm-sync.ts:127` — Phase 2 (1).
- `lib/pipeline/crm-sync.ts:130` — Phase 2 (1).
- `lib/ghl/poller.ts:729` — fire ESCALATION_WEBHOOK_URL if configured (1).
- `lib/sites/design-quality-checker.ts` — 1 TODO (not inspected, confirmed by grep count).
- `lib/sites/content-engine.ts:222` — regenerate offending pages with more differentiated prompts (1).
- `lib/sites/ai-html-prompts.ts` — 1 TODO (not inspected, confirmed by grep count).
- `lib/sites/templates/sections/heroes/video-hero.ts:3` — accept videoUrl prop (1).

**Total: 8 TODO/FIXME/HACK occurrences across 7 files.** No XXX or HACK markers. Lean codebase on the TODO front.

**Risky observations:**
- `lib/stripe/webhook-health.ts:16` — hardcoded webhook endpoint ID `we_1TCcvQDr3LPJOIaMuaY1zJhG`. Ties the health check to a specific Stripe account. Not env-driven.
- `lib/stripe/config.ts:11` — `@ts-expect-error` for Stripe API version `2025-04-30.basil` because SDK types lag.
- `lib/ghl/poller.ts` — 700+ line file importing from 15+ other lib paths. Classic god-file candidate for the GHL message ingestion pipeline.
- `lib/ovh/provisioner.ts` — 1142 lines. Clear responsibility (container lifecycle) but long; the `buildContainerToolsMd` static markdown string alone is ~90 lines.
- `lib/channels/router.ts` — uses `features.useWorker` gate around a custom OVH call that partially reimplements `chatViaGateway` from `lib/ovh/provisioner.ts` — would benefit from a single source of truth.
- `CLAUDE.md:75` and `TECHNICAL-SPEC.md:435` still document the old `kyra-user-{user_id}` session key format, but code uses `agent:client:{clientId}` / `agent:main:{userId}`. Documentation drift.
