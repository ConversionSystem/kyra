# Kyra `/lib` Domain Analysis

## agency
- **Purpose** — The agency-tenant backbone: defines `Agency`/`AgencyClient`/`AgencyTemplate` types, per-client routing, workspace bootstrap, permissions, and webhook dispatch.
- **Key exports** — `container.ts` (session-key helpers `getSessionKeyForClient` / `getSessionKeyForUser`, container context builder), `workspace.ts` (generates SOUL.md/USER.md/AGENTS.md/INTEGRATIONS.md from templates), `middleware.ts` (`requireAgencyMember` for API routes), `permissions.ts` (read-only / supervised / autonomous deployment modes with granular GHL capability flags), `webhook-dispatcher.ts` (typed per-event outbound webhooks).
- **External dependencies** — Supabase (schema-wide: `agencies`, `agency_members`, `agency_clients`, `agency_templates`, `agency_invitations`). Indirect: Stripe (via types).
- **Notable patterns** — `{{variable}}` template substitution (`workspace.ts:18-25`); three-tier deployment modes; fire-and-forget webhooks with per-event URLs plus legacy single-URL fallback; voice parser is deterministic regex (no AI) for voice commands (`voice-parser.ts`).

## ai
- **Purpose** — The canonical wrapper around Anthropic (Claude) + OpenAI (embeddings) for the dashboard chat path.
- **Key exports** — `claude.ts` (`getAnthropic`, `streamChat`, `streamChatWithTools` with 5-round tool-use loop), `model-router.ts` (pattern-based routing between `economy`/`standard`/`premium` tiers with structural-complexity guards), `embeddings.ts` (`text-embedding-3-small`), `memory.ts` (saveMemory/searchMemories with Pinecone + Supabase dual-write), `truncate.ts` (80k-token context cap), `prompts.ts` (memory/reminder/calendar system-prompt builder).
- **External dependencies** — `@anthropic-ai/sdk`, `openai`, Pinecone (via `lib/pinecone.ts`), Supabase.
- **Notable patterns** — Singleton clients via module-level caching; streaming generator (`AsyncGenerator<string>`); tool loop rolls back on thrown executor errors and stops at `stop_reason !== 'tool_use'` (`claude.ts:97-143`); model router explicitly comments the cross-router relationship with `lib/ghl/model-router.ts` (`model-router.ts:10-14`).

## ai-workers
- **Purpose** — Role-based AI worker definitions (Sales Qualifier, Collections, Front Desk, etc.) and the capability/scoping layer for tool permissions and performance tracking.
- **Key exports** — `role-workers.ts` (catalog `ROLE_WORKERS` with SOUL.md templates, channels, required ClawHub skills), `capabilities.ts` (`WorkerCapabilities` + risk levels), `tool-scoping.ts`, `performance-tracker.ts` (worker_performance table writes), `team-templates.ts`, `lead-response-checklist.ts`.
- **External dependencies** — Supabase (worker_performance, worker_task_runs).
- **Notable patterns** — Workers declare `requiredClawHubSkills` for auto-installation; allowed/denied capability lists; visibility `public`|`private` with agency-id allowlist.

## analytics
- **Purpose** — Natural-language analytics reports powered by `gpt-4o-mini`.
- **Key exports** — `ai-reporter.ts` (`generateReport` takes `ClientAnalyticsData`, returns human-readable markdown, deducts 1 credit).
- **External dependencies** — OpenAI via OpenRouter, Supabase, credit-engine.
- **Notable patterns** — Minimal wrapper, single-entry.

## auth
- **Purpose** — Server-side cron auth helpers — *not* user auth (user auth lives in `supabase/`).
- **Key exports** — `cron.ts` (`checkCronAuth`, `requireCron`).
- **External dependencies** — Next.js `NextResponse`.
- **Notable patterns** — Fail-closed: if `CRON_SECRET` is missing, every cron request is rejected (`cron.ts:28`). Accepts `Authorization: Bearer` header (Vercel style) or legacy `?secret=` query.

## automations
- **Purpose** — Natural-language → workflow generation and execution engine for per-client "Zapier-like" AI workflows.
- **Key exports** — `ai-workflow-engine.ts` (NL-to-spec via gpt-4o-mini), `workflow-executor.ts` (runs triggers/steps), `workflow-templates.ts`, `sync.ts` (pushes workflow state into the client's OpenClaw container), `workflow-types.ts`.
- **External dependencies** — OpenRouter/OpenAI, Supabase, OVH provisioner (sync).
- **Notable patterns** — Workflow state is mirrored into the container via `lib/ovh/sync.ts` so the AI knows what automations exist.

## autopilot
- **Purpose** — Proactive AI action scheduling — weekly templates for follow-ups, reminders, review requests, invoice collection, weekly reports.
- **Key exports** — `autopilot-engine.ts` (`DEFAULT_AUTOPILOT_SCHEDULE`, `getSchedule`, `getActionsForDay`, `weeklyOverview`).
- **External dependencies** — None (pure data/config with merge logic).
- **Notable patterns** — Shipping defaults + user overrides merged by id (`autopilot-engine.ts:117-133`); 7 defaults from Monday-Saturday, Sunday rest.

## billing
- **Purpose** — Plans, credits, credit cost table, BYOK logic, and premium-template entitlements.
- **Key exports** — `credit-engine.ts` (the canonical `requireCredits`/`deductCredits`/`addCredits` API — **single source of truth**), `plans.ts` (`PLANS` catalog: free, solo_pro, starter/Lite, pro, scale), `model-credits.ts` (per-model credit cost), `classify-usage.ts`, `byok.ts` (BYOK provider priority: anthropic > openrouter > openai > google; `skipCredits=true` only on paid plans), `referral-activation.ts` (early-bird 150, else 100 credits, fires immediately on signup), `premium-templates.ts`, `template-builder.ts`, `stripe.ts` (thin wrapper on lib/stripe).
- **External dependencies** — Supabase (`agency_credits`, `credit_transactions`), Stripe via `lib/stripe`, escalation webhook.
- **Notable patterns** — `LOW_BALANCE_THRESHOLD = 50` (`credit-engine.ts:49`) triggers a one-time notification on threshold crossing; `CREDIT_COSTS` is a const record of every billable action (`credit-engine.ts:54-101`); plans.ts still carries `@deprecated` credit stubs for backward compatibility.

## blog
- **Purpose** — Static content — blog post definitions for the marketing site.
- **Key exports** — `posts.ts` (`POSTS: BlogPost[]`, embedded HTML content).
- **External dependencies** — None.
- **Notable patterns** — Inline HTML strings; zero runtime deps.

## booking
- **Purpose** — Conversational booking engine that detects booking intent and books via GHL calendar or Kyra's own `client_bookings` table.
- **Key exports** — `ai-booker.ts` (keyword-based intent detection, slot extraction, confirmation flow), `availability.ts` (`getAvailableSlots`, `isSlotAvailable`, `formatSlotsForAI`), `types.ts`.
- **External dependencies** — Supabase, GHL calendar (`lib/ghl/skills/calendar`).
- **Notable patterns** — Keyword lists for booking/cancel/confirm intent (`ai-booker.ts:20-30`); falls back to Kyra-native tables when GHL is absent.

## briefing
- **Purpose** — "Daily Briefing" morning summary for business owners (conversations yesterday, appointments, hot leads, overdue follow-ups).
- **Key exports** — `daily-briefing.ts` (`BriefingData` + generator; delivered via client's primary channel).
- **External dependencies** — Supabase.
- **Notable patterns** — Single-file feature; aggregates across CRM + worker performance.

## business-box
- **Purpose** — "Business-in-a-Box" one-click setup that provisions a fully configured AI worker (template + autopilot + agents + review gen + payments + web chat) from a short industry form.
- **Key exports** — `business-in-a-box.ts` (`BusinessBoxConfig`, orchestrator).
- **External dependencies** — Spans most modules (templates, autopilot, multi-agent, reviews, payments, business-box).
- **Notable patterns** — This is the primary onboarding happy-path orchestrator — fan-out to every feature module.

## campaigns
- **Purpose** — Multi-channel marketing campaign generator (email sequences, SMS, social posts) from a single NL description.
- **Key exports** — `ai-campaign-engine.ts` (gpt-4o-mini, 3 credits per generation).
- **External dependencies** — OpenAI/OpenRouter, credit-engine.
- **Notable patterns** — Single-call generation of full campaign tree (teaser → launch → follow-up).

## channels
- **Purpose** — Shared multi-channel message ingestion processor + voice/Whisper/Discord adapters.
- **Key exports** — `router.ts` (`processChannelMessage` — the Telegram/WhatsApp/Discord shared dispatcher that resolves user, memory, tools, model, and gateway), `voice.ts` (OpenAI TTS — `nova` default), `whisper.ts` (OpenAI Whisper STT), `discord.ts` (Discord REST send).
- **External dependencies** — OpenAI (TTS + Whisper), Discord REST, Supabase, OVH gateway resolver, credit-engine (implicitly via channels).
- **Notable patterns** — Single conversation record per user across channels (telegram/whatsapp/discord/web) (`router.ts:43-50`); Discord capped at 2000 chars.

## chat
- **Purpose** — Shared chat core used by both dashboard and widget chat routes, plus web-chat lead extraction.
- **Key exports** — `core.ts` (`resolveModel`, `getDirectLLMClient`, `checkAndDeductCredits`, `saveConversation`, OpenRouter slug map), `lead-capture.ts` (regex extraction of name/email/phone from conversation, auto-CRM upsert, duplicate dedup).
- **External dependencies** — OpenAI SDK (OpenRouter compatible), Supabase, credit-engine, model-credits.
- **Notable patterns** — `OPENROUTER_SLUGS` canonical model → OpenRouter slug map verified against `/v1/models` dated 2026-04-03 (`core.ts:30-43`); web-chat lead capture has a 24h email-based dedup window (`lead-capture.ts:196-208`) and graceful degrade when `web_chat_leads` table is absent.

## commerce
- **Purpose** — WhatsApp-commerce tool definitions for the LLM (product browsing, order placement, payment links).
- **Key exports** — `whatsapp-commerce.ts` (`Product`, `Order`, tool definitions).
- **External dependencies** — None at the file level; tool executors live elsewhere.
- **Notable patterns** — Pure tool-definition module — LLM calls these like GHL tools.

## config
- **Purpose** — Feature flags for architecture routing.
- **Key exports** — `features.ts` (`useWorker`, `useOpenClaw`, `openclawSkills`).
- **External dependencies** — env vars.
- **Notable patterns** — Only 3 flags; drives the critical `/api/chat` fork between Cloudflare Worker (default) and OpenClaw Gateway path.

## content
- **Purpose** — Marketing content pillars and angle rotation logic for the site's own blog/social publishing.
- **Key exports** — `pillars.ts` (`PILLARS: Pillar[]`, Platform rotation).
- **External dependencies** — None.
- **Notable patterns** — Data-only module; 30-day dedup per platform hinted in comments.

## crm
- **Purpose** — Full-featured CRM layer (contacts, companies, deals, activities, pipelines) with AI enrichment, scoring, auto-deal creation, and GHL sync.
- **Key exports** — `contacts.ts`, `deals.ts` (`DEAL_STAGES: prospect→qualified→proposal→negotiation→won/lost`), `companies.ts`, `activities.ts`, `pipeline-sync.ts`, `ai-lead-scorer.ts` (gpt-4o-mini), `enrichment.ts` (AI auto-enrichment, 2 credits), `deal-autopilot.ts` (stale deal nudges), `relationship-memory.ts`, `rules.ts`, `scoring.ts`, `segments.ts`, `stale-deals.ts`, `merge.ts` (contact dedup), `import.ts`/`export.ts` (CSV).
- **External dependencies** — Supabase (heavy — 20+ tables), credit-engine, OpenAI/OpenRouter.
- **Notable patterns** — Largest single domain (23 files); uses service-role client throughout, agency scoping via `agency_id`, client-level filtering optional via `client_id`. Rich filter/sort/pagination.

## data
- **Purpose** — Static role/agent reference data.
- **Key exports** — `roles-data.ts` (`AgentRole[]`, `PRODUCT_ROLE_IDS: agency-ultron | knowledge-brain | growth-worker | qa-compliance`).
- **External dependencies** — None.
- **Notable patterns** — Pure data; imported by dashboards to populate selects.

## email
- **Purpose** — Outbound email infrastructure, with GHL-first routing and the 7-email nurture sequence.
- **Key exports** — `sender.ts` (priority GHL client → GHL platform (`hello@conversionsystem.com`) → Resend fallback), `ghl-platform-sender.ts`, `ai-writer.ts` (gpt-4o-mini, subject + HTML body), `nurture-sequence.ts` (7 emails over 21 days via `email_nurture_queue`), `marketing.ts`, `nurture-enrollment.ts`, `weekly-report.ts` (branded HTML), `sequences.ts` (**DEPRECATED** stub — see Dead code section).
- **External dependencies** — Resend, GHL API, OpenAI/OpenRouter.
- **Notable patterns** — `conversionsystem.com` is NOT verified in Resend — all platform emails route through GHL; `FROM = "Angel from Kyra <hello@updates.conversionsystem.com>"` (`nurture-sequence.ts:17`).

## fly
- **Purpose** — **Legacy** per-agency gateway provisioner on Fly.io — superseded by `ovh/`.
- **Key exports** — `client.ts` (Fly Machines API wrapper — `https://api.machines.dev/v1`), `provisioner.ts` (`TEMPLATE_APP = 'kyra-gateway'`, `DEFAULT_REGION = 'fra'`).
- **External dependencies** — `FLY_API_TOKEN`, `FLY_ORG_SLUG`, Supabase.
- **Notable patterns** — Original architecture was per-agency on Fly; current architecture (see `lib/ovh/`) is per-client on OVH VPS + Traefik. See Dead code section.

## funnels
- **Purpose** — Multi-step sales funnel generator (landing → form → thank-you → upsell).
- **Key exports** — `ai-funnel-builder.ts` (gpt-4o-mini, 3 credits).
- **External dependencies** — OpenAI, credit-engine.
- **Notable patterns** — Single-call complete funnel generation with design hints + email follow-up.

## ghl
- **Purpose** — **The biggest integration surface.** Full GoHighLevel CRM integration: OAuth, API client with token refresh, 50+ skill tools, poller-based message ingestion, review gate, action engine with audit trail, Conversation AI / Voice AI syncing.
- **Key exports** — `client.ts` (`GHLClient` — retries, 401 token refresh, 429 rate limit), `api.ts` (Supabase-persisting token refresh + message send), `poller.ts` (**replaces webhooks entirely** — polls `/conversations/search` for new inbound messages), `oauth.ts` (signed HMAC state param, scope list), `skills/` (50 tool definitions in 7 files: contacts/conversations/opportunities/calendar/invoices/marketing/tasks), `ghl-tools.ts` (back-compat + `escalate_to_human`), `action-engine.ts` (propose/approve/reject with audit), `model-router.ts` (widget-side provider-aware routing), `direct-llm.ts` (OpenAI/OpenRouter function-calling bypass since OpenClaw proxy strips tools), `conversation-memory.ts` (loads last N turns from `client_conversations`), `conversation-ai.ts` (syncs Kyra knowledge into GHL *Voice AI* agents — not Conversation AI), `review-gate.ts` (holds AI responses for human approval), `smart-handler.ts`, `webhook-handler.ts`, `webhooks.ts`, `agency-api.ts`/`agency-oauth.ts` (agency-level GHL), `resolve-ghl-config.ts`, `risk-config.ts`.
- **External dependencies** — GHL (`services.leadconnectorhq.com`, `marketplace.gohighlevel.com`), Supabase, OpenAI/OpenRouter, OVH provisioner.
- **Notable patterns** — Token refresh is wired at `createGHLClientForAgencyClient` via `onTokenRefresh` callback (`index.ts:41-50`); poller explicitly avoids webhooks for draft marketplace apps (`poller.ts:1-14`); `GHL_API_VERSION = '2021-04-15'` for most endpoints but `'2021-07-28'` for Voice AI (`conversation-ai.ts:11`). `SKILL.md` is a 170+ line natural-language tool catalog fed to the AI. Comment at `direct-llm.ts:5` flags that OpenClaw's proxy drops the `tools` parameter — force direct LLM calls for tool use.

## guides
- **Purpose** — Setup guide content for public share-able walkthrough pages.
- **Key exports** — `setup-guides.ts` (`SetupGuide[]`).
- **External dependencies** — None.
- **Notable patterns** — Pure data.

## instructions
- **Purpose** — Preset instruction snippets for customizing AI tone.
- **Key exports** — `presets.ts` (`INSTRUCTION_PRESETS: professional | casual | brief | …`).
- **External dependencies** — None.

## integrations
- **Purpose** — Non-GHL third-party adapters: Google Calendar, Google Search Console, WordPress, HeyGen (AI video), Jane (cannabis inventory).
- **Key exports** — `google.ts` (OAuth + Calendar events), `gsc.ts` / `google-search-console.ts` (GSC metrics fetch), `wordpress.ts` (WP REST + App Passwords for auto-publishing), `heygen.ts` (avatar video creation), `jane.ts` (Algolia direct query to Jane's search index for Purple Lotus — 4ms responses, Firecrawl fallback), `sync.ts` (writes INTEGRATIONS.md to the client container so AI knows which tools are live).
- **External dependencies** — Google APIs, WordPress REST, HeyGen API, Algolia (Jane), Supabase.
- **Notable patterns** — `integrations/sync.ts` is the general "tell the AI what integrations it has" mechanism (`sync.ts:1-26`); Jane module has hardcoded public Algolia keys for Purple Lotus (`jane.ts:9-17`) — these are client-side public keys, not secrets.

## intelligence
- **Purpose** — Cross-client agency analytics aggregator — pure SQL/rule-based, no LLM calls.
- **Key exports** — `agency-analytics.ts` (`AgencyOverview` aggregator).
- **External dependencies** — Supabase.
- **Notable patterns** — Explicit rule against LLM use — everything derived from existing tables.

## knowledge
- **Purpose** — Per-client "knowledge extraction" that pulls structured facts out of conversations and injects them into subsequent prompts.
- **Key exports** — `extractor.ts` (`extractKnowledge`, `getClientKnowledge` — categorized: business_fact, customer_pattern, conversation_outcome, contact_preference, product_knowledge, correction), `rag.ts` (retrieval).
- **External dependencies** — OpenAI gpt-4o-mini, Supabase (`client_knowledge`).
- **Notable patterns** — SHA-256 hashing for dedup, `times_confirmed` counter for confidence decay.

## memory
- **Purpose** — Customer-level knowledge graph (facts, appointments, lifetime value) plus entity/relationship graph extraction.
- **Key exports** — `customer-memory.ts` (`CustomerFact`, appointment history, tags, sentiment), `graph.ts` (Anthropic-powered entity/relationship extraction for deeper "inference" memory).
- **External dependencies** — Anthropic SDK (graph extraction), Supabase.
- **Notable patterns** — Two-layer memory: structured customer records + open-ended graph; graph uses real LLM calls for extraction while customer memory is form-based.

## multi-agent
- **Purpose** — Department-style AI agent routing (Front Desk, Sales, Support, Collections, Review, Content Creator) — each with keyword triggers, priority, default personality.
- **Key exports** — `agent-manager.ts` (`AGENT_ROLES`, `routeToAgent`, `buildAgentPrompt`).
- **External dependencies** — None (pure routing).
- **Notable patterns** — Keyword-count × priority scoring (`agent-manager.ts:92-109`); Front Desk is the fallback when nothing matches; only Front Desk is enabled by default.

## onboarding
- **Purpose** — Step-by-step onboarding progress tracking (profile, first client, container, Stripe, GHL, first message).
- **Key exports** — `tracker.ts` (`markOnboardingStep`, `ONBOARDING_STEPS[]`).
- **External dependencies** — Supabase.

## onfleet
- **Purpose** — Delivery dispatch orchestration: SLA calc, route optimization, notification gates, rule engine — built on Onfleet's dispatch platform.
- **Key exports** — `client.ts` (Onfleet REST), `sla-calculator.ts`, `route-optimizer.ts`, `notification-gate.ts`, `rule-engine.ts`, `rules/`, `index.ts` barrel, `types.ts`.
- **External dependencies** — Onfleet API, Supabase.
- **Notable patterns** — Self-contained dispatch stack; companion of `sms/` for delivery-text flows.

## openclaw
- **Purpose** — **Original** OpenClaw Gateway client (HTTP + WS RPC) with session management and context injection. Now largely bypassed in favor of `ovh/`, but still present for the legacy direct-OpenClaw chat path.
- **Key exports** — `client.ts` (HTTP `/v1/chat/completions` proxy, `invokeTool` via `/tools/invoke`, catalog of `OPENCLAW_TOOLS`), `sessions.ts` (`getSessionKey(userId) => kyra-user-${userId}`, 30-min in-memory TTL, `buildUserContext` for first-message context injection), `gateway-resolver.ts` (agency-level resolver — **NO fallback to shared gateway** — `GatewayNotProvisionedError`), `gateway-ws.ts` (hand-rolled Node `net`/`http` WebSocket RPC client with frame encode/decode to avoid webpack bundling the `ws` package), `prompts.ts`.
- **External dependencies** — Agency gateway URL (per-agency provisioned), Supabase (for lookups).
- **Notable patterns** — `openclaw/client.ts:16-17` shouts "NO FALLBACK — every function requires an explicit gatewayUrl"; `gateway-ws.ts:1-13` documents the hand-rolled WS to avoid webpack issues. Only 6 route files still import `@/lib/openclaw/*` (all under `app/api/openclaw/*` and `app/api/chat/openclaw/route.ts`) vs 30+ importing `@/lib/ovh/*`. This module is legacy but not dead — see Dead code section.

## ovh
- **Purpose** — **Current** per-client gateway architecture. Each *client* (not agency) runs a Docker container behind Traefik on an OVH VPS. Provisioner API manages lifecycle.
- **Key exports** — `provisioner.ts` (`provisionClient`, `destroyClient`, `getClientStatus`; BYOK key priority `anthropic > openrouter > openai > google`), `gateway-resolver.ts` (`resolveClientGateway`, `chatWithClient`, `getGatewayByClientId`, `getGatewayByGhlLocation` — all keyed on **client** not agency), `gateway-client.ts` (HTTP chat via `/v1/chat/completions` with `X-Session-Key` header and optional streaming), `sync.ts` (`writeWorkspaceFile`, `wakeContainerAI`).
- **External dependencies** — OVH provisioner HTTPS service (`provisioner.gw.kyra.conversionsystem.com`), Supabase (`agency_clients.gateway_url` / `gateway_token` / `gateway_container_id` / `gateway_status`).
- **Notable patterns** — Each client gets its own container with isolated filesystem/memory/config (`provisioner.ts:1-14`); Traefik wildcard: `{client-id}.gw.kyra.conversionsystem.com`; gateway URL/token stored per-client row. `resolveWinningKey` is the BYOK priority resolver (`provisioner.ts:30-48`).

## packages
- **Purpose** — Pre-built "service package" bundles for home-services (plumbing, HVAC, etc.) — template + autopilot + agent config + channels + checklist.
- **Key exports** — `home-services.ts` (`ServicePackage[]`).
- **External dependencies** — None.

## payments
- **Purpose** — Stripe Payment Link collection loop with reminders and escalation.
- **Key exports** — `payment-collection.ts` (`PaymentRequest` lifecycle: pending → sent → paid/overdue/reminded/escalated).
- **External dependencies** — Stripe (via `lib/stripe`), Supabase.
- **Notable patterns** — Can use Payment Links (no Connect onboarding) or Stripe Connect pass-through.

## pipeline
- **Purpose** — Outbound AI sales pipeline (find leads → enrich → outreach → AI Closer replies → CRM sync → webhooks).
- **Key exports** — `ai-closer.ts` (OpenClaw-powered stateful closer that routes to the correct GHL-location's container), `soul-injector.ts` (writes SOUL.md + CAMPAIGN.md to the container workspace pre-launch), `crm-sync.ts` (pipeline → GHL), `follow-up-engine.ts`, `ab-testing.ts`, `webhooks.ts` (pipeline event dispatcher for `campaign.created`, `lead.found`, …, `lead.closed`), `lead-sources/index.ts`.
- **External dependencies** — GHL, OVH gateway, Supabase, OpenAI/OpenRouter, credit-engine.
- **Notable patterns** — `ai-closer.ts:1-22` is the clearest statement of "why OpenClaw": persistent memory per-lead, 24/7 container, SOUL.md + CAMPAIGN.md injected workspace context. Falls back to direct LLM when no container exists.

## reviews
- **Purpose** — Review-response generation and review request engine.
- **Key exports** — `ai-review-responder.ts` (gpt-4o-mini, 1 credit, tone: professional/friendly/empathetic/enthusiastic), `review-engine.ts`.
- **External dependencies** — OpenAI, credit-engine, Supabase.

## secrets
- **Purpose** — Per-client encrypted secrets vault (GitHub tokens, Stripe keys, arbitrary API keys the AI can use).
- **Key exports** — `index.ts` (`listSecrets`, `getSecret`, `createSecret`, `updateSecret`, `deleteSecret` — all with agency×client scoping), `crypto.ts` (AES-256-GCM with 96-bit IV, 16-byte tag; key derived from `SECRETS_ENCRYPTION_KEY` via SHA-256), `sync.ts`.
- **External dependencies** — Node `crypto`, Supabase (`client_secrets`).
- **Notable patterns** — Strict key-name regex `^[A-Z][A-Z0-9_]*$` normalized uppercase; base64 payload format is `[12-byte iv][16-byte authTag][ciphertext]` (`crypto.ts:24-40`); throws rather than falling open when `SECRETS_ENCRYPTION_KEY` unset.

## security
- **Purpose** — Prompt-injection defense for any inbound untrusted text (SMS, email replies, webhooks).
- **Key exports** — `prompt-injection.ts` (`defend()` — three layers: pattern scoring, XML input isolation, output scanning; risk tiers low/medium/high; `high` blocks entirely).
- **External dependencies** — None (pure pattern matching).
- **Notable patterns** — 80+ weighted regex patterns covering instruction overrides, persona hijacks, system-prompt extraction, DAN jailbreak, developer-mode unlock (`prompt-injection.ts:32-60`); deprecated helpers `buildSecurityReminder` and older API methods kept for compat.

## seo
- **Purpose** — SEO automation stack: keyword research (DataForSEO), Google Search Console sync, growth-suggestion engine, schema markup, internal linker, off-site content publisher.
- **Key exports** — `dataforseo.ts`, `gsc-sync.ts`, `growth-engine-v2.ts` (**data-driven, not LLM-hallucinated** — uses real GSC + NAP data; LLM only frames suggestions), `internal-linker.ts`/`internal-linker-writer.ts`, `schema-markup.ts` (has `@deprecated generateBusinessSchema`), `publish-scheduler.ts` (queues to 7 platforms: Telegraph/WordPress/GitHub Pages/Notion/Blogger/Google Docs/Sites), `platform-provisioner.ts`, `worker-dispatcher.ts`, `city-data.ts`, `industry-packs.ts`.
- **External dependencies** — DataForSEO, Google Search Console, WordPress, Google service account, Supabase.
- **Notable patterns** — v2 engine explicitly rejects LLM hallucination for suggestions (`growth-engine-v2.ts:1-13`); publish scheduler is queue-based, processed hourly.

## sites
- **Purpose** — AI website builder — generates full HTML pages with Tailwind CDN from structured site config.
- **Key exports** — `ai-html-engine.ts` (primary generator, Sonnet 4-6 via OpenRouter or GPT-4o), `ai-html-prompts.ts`, `content-engine.ts`, `content-checker.ts`, `design-quality-checker.ts`, `design-system.ts`, `html-quality-checker.ts`, `html-sanitizer.ts`, `industry-defaults.ts`, `knowledge-sync.ts`, `prompts.ts`, `schema-generator.ts`, `section-variants.ts`, `seo-helpers.ts`, `templates/`, `unsplash.ts`.
- **External dependencies** — OpenRouter/OpenAI, Unsplash, credit-engine (5 credits per page).
- **Notable patterns** — 8000 max tokens for full HTML output; 3 retries with 2s base delay; explicit cost estimate `0.015/1k` (`ai-html-engine.ts:15-32`); sanitizer runs after generation.

## skills
- **Purpose** — Built-in Kyra skill registry (web-search, web-scraper, file-processor, image-analysis, etc.) — the "which capabilities does this AI have" list.
- **Key exports** — `registry.ts` (`BUILTIN_SKILLS`, `SkillDefinition` with plan gating + API-key requirement + credit multipliers; 16 skills total), `sync.ts` (writes SKILLS.md into the container workspace).
- **External dependencies** — Supabase, OVH sync.
- **Notable patterns** — kebab-case IDs match `settings.enabled_skills` Supabase column; distinguishes `BuiltInSkill` (data) from `SkillDefinition` (billing metadata).

## sms
- **Purpose** — **Delivery-focused** SMS — Onfleet webhook → template render → Springbig/Blackleaf provider → log. Separate from generic SMS.
- **Key exports** — `index.ts` (barrel), `templates.ts` (`DEFAULT_TEMPLATES`, `processWebhook`, `parseOnfleetEvent`, `extractVariables`, `renderTemplate`), `providers.ts` (`SpringbigProvider`, `BlackleafProvider`, `MockProvider`), `delivery-tracker.ts`, `campaign-engine.ts` (GHL-backed SMS campaigns with AI copy, gpt-4o-mini), `types.ts`.
- **External dependencies** — Onfleet webhooks, Springbig, GHL (campaigns), Supabase, credit-engine.
- **Notable patterns** — Springbig endpoint still TBD — code supports configurable URL (`providers.ts:10-32`); dual-provider with Mock for testing.

## stripe
- **Purpose** — Platform Stripe integration (subscriptions, Connect for agency pass-through billing, webhook handlers).
- **Key exports** — `index.ts` barrel, `config.ts` (`stripe` singleton optional during beta, `STRIPE_PRICES` map, `planFromPriceId` reverse lookup including annual → base collapse), `subscriptions.ts` (`createAgencySubscription`, `updateAgencyPlan`, `cancelSubscription`), `connect.ts` (Express accounts, 10% platform fee, client sub-billing + invoices), `webhooks.ts` (`verifyStripeWebhook`, `handleInvoicePaid`, `handleSubscriptionUpdated/Deleted`, `handleConnectAccountUpdated`).
- **External dependencies** — Stripe SDK, Supabase.
- **Notable patterns** — `config.ts:8-14` makes Stripe optional during beta — callers must guard; `APPLICATION_FEE_PERCENT = 10` (`connect.ts:10`); Stripe API version `'2025-04-30.basil'` with `@ts-expect-error` workaround for SDK type lag.

## supabase
- **Purpose** — Supabase client factories — the bedrock of all server-side DB access.
- **Key exports** — `client.ts` (`createClient` — browser), `server.ts` (`createClient` — SSR with cookie handling, `createServiceClient`, `createServiceClientWithoutCookies`), `middleware.ts` (`updateSession` — refreshes auth + enforces `/agency` and `/admin` protected paths, redirects login).
- **External dependencies** — `@supabase/ssr`, `@supabase/supabase-js`.
- **Notable patterns** — `server.ts:31-40` is a critical correctness comment: `createServerClient` from `@supabase/ssr` still applies RLS even with service-role because it pulls the JWT from cookies — so `createServiceClientWithoutCookies` intentionally uses the plain `supabase-js` client to bypass cookies. This is the foundation the entire app sits on.

## tasks
- **Purpose** — Autonomous task engine (Phase 3) — cron-scheduled worker tasks (SEO audits, lead follow-ups, content calendars, review responses).
- **Key exports** — `index.ts` barrel, `task-executor.ts` (gpt-4o-mini, structured JSON output per task type), `task-scheduler.ts`, `task-types.ts`, `cron-utils.ts`.
- **External dependencies** — OpenAI, Supabase.
- **Notable patterns** — Task prompts defined inline (`task-executor.ts:22-30`) for `seo_audit`, `lead_followup`, `content_calendar`, `review_response`, `custom`. Results land in `worker_task_runs`.

## templates
- **Purpose** — Pre-built industry-specific SOUL.md templates with tool/automation recommendations.
- **Key exports** — `industry-templates.ts` (`IndustryTemplate[]`).
- **External dependencies** — None.
- **Notable patterns** — Pure data; `{{variable}}` placeholders rendered by `agency/workspace.ts`.

## tools
- **Purpose** — Claude tool definitions + executors for skill invocation in the dashboard chat path.
- **Key exports** — `definitions.ts` (`TOOL_SCHEMAS` mapped by kebab-case skill id, `executeToolCall` dispatcher), `web-search.ts` (Brave Search API), `url-fetch.ts`, `browser-tool.ts` (optional Cloudflare Browser Rendering screenshots), `image-analysis.ts`, `file-processor.ts`.
- **External dependencies** — Brave Search, OpenAI (image-analysis vision), Cloudflare Browser Rendering.
- **Notable patterns** — Brave API used directly (`web-search.ts:1-40`); schemas written in Anthropic `input_schema` shape.

## voice
- **Purpose** — AI voice provider abstraction — unifies VAPI, Synthflow, Retell, GHL Voice AI, and "Kyra Native" (Twilio-based) behind a single `VoiceProviderClient` interface.
- **Key exports** — `provider.ts` (factory + `buildVoiceSystemPrompt`), `vapi.ts`, `synthflow.ts`, `retell.ts`, `kyra-native.ts`, `ghl.ts`, `twilio-phone.ts` (Twilio REST — account SID/auth token), `types.ts`.
- **External dependencies** — VAPI, Synthflow, Retell, GHL Voice AI, Twilio, OpenAI (for Kyra Native).
- **Notable patterns** — `VoiceProviderClient` interface: `syncAssistant`, `provisionPhoneNumber`, `listPhoneNumbers`, `startOutboundCall`, `parseWebhook` (`types.ts:74-87`). Voice add-on is $79/mo for 300 minutes (`billing/plans.ts:258-276`).

## worker
- **Purpose** — Gateway health check utility — can check any gateway URL.
- **Key exports** — `health.ts` (`checkGatewayHealth`, legacy `checkWorkerHealth` using `KYRA_WORKER_URL`).
- **External dependencies** — None (fetch-only).

## Top-level files

**`lib/utils.ts`** — shadcn/ui `cn()` + date/truncate helpers. Pure utility, zero deps beyond `clsx`/`tailwind-merge`.

**`lib/pinecone.ts`** — Pinecone singleton + `upsertVector`/`queryVectors`/`deleteVector` with user-scoped filter. Used by `lib/ai/memory.ts` and the memory graph.

**`lib/rate-limit.ts`** — Serverless-safe two-layer rate limiter: in-memory map first (intra-instance speed), then Supabase `rate_limit_hits` table (cross-instance persistence). Falls back to in-memory if DB unavailable. 1% probabilistic GC of old hits. Key insight: Vercel cold starts defeat pure in-memory limiters.

**`lib/ai-health-score.ts`** — Computes a 0-100 AI health grade per client (GHL connected 30pts, personality 20pts, activity 20pts, low escalation 15pts, calendar link 10pts, opt-out 2.5pts, hours 2.5pts). Container not running → auto-zero "Offline".

---

## A. Dependency graph sketch

**Foundation layer (imported by ~everything):**
- `lib/supabase/*` — every domain with persistence imports `createServiceClientWithoutCookies`.
- `lib/billing/credit-engine` — every AI action deducts credits; imported by `crm/*`, `pipeline/*`, `chat/*`, `ghl/*`, `channels/*`, `sites/*`, `sms/*`, `seo/*`, `analytics/*`, `campaigns/*`, `funnels/*`, `reviews/*`, `automations/*`.
- `lib/utils.ts` + `lib/pinecone.ts` — trivial leaves.
- `lib/supabase/middleware.ts` feeds Next.js `middleware.ts` at the app root.

**Core services layer:**
- `lib/ai/*` — wraps Anthropic/OpenAI. Imported by `chat/`, `channels/router`, `memory/graph`, `tools/definitions` (`lib/ai/claude`), `agency/ai-models`.
- `lib/agency/*` — `types`, `container`, `middleware`, `permissions`. Imported by `ghl/poller`, `pipeline/*`, `integrations/sync`, `secrets`, `crm/*`, etc.
- `lib/stripe/*` + `lib/billing/*` bidirectional — `billing/stripe.ts` is a thin wrapper around `lib/stripe`.
- `lib/openclaw/*` and `lib/ovh/*` — both describe the AI substrate, but `ovh/` is the one imported by 30+ files while `openclaw/` is imported only by 6 legacy route files.

**Integration layer:**
- `lib/ghl/*` — ingests from `agency/`, `billing/`, `ovh/`, `ai-workers/`, `memory/`, `knowledge/`, `security/`.
- `lib/integrations/*`, `lib/voice/*`, `lib/sms/*`, `lib/channels/*`, `lib/email/*`, `lib/onfleet/*`.

**Feature/domain layer (top of stack, rarely imported by others):**
- `lib/autopilot/`, `lib/multi-agent/`, `lib/chat/`, `lib/business-box/`, `lib/campaigns/`, `lib/funnels/`, `lib/reviews/`, `lib/seo/`, `lib/sites/`, `lib/briefing/`, `lib/analytics/`, `lib/intelligence/`, `lib/pipeline/ai-closer.ts`, `lib/tasks/`.

Counts from a targeted grep (`from '@/lib/(supabase|ai|auth|billing|stripe|openclaw|ovh|ghl|agency|chat)/'` across `/lib`): 60 files with 82 imports to the listed foundation domains — confirming the gravitational pull.

## B. OpenClaw integration

OpenClaw is the AI runtime — a per-client daemon that hosts memory, workspace files (SOUL.md, CAMPAIGN.md, SKILLS.md, INTEGRATIONS.md), and 60+ skills. Kyra talks to it over HTTP (OpenAI-compatible `/v1/chat/completions`) with a raw-Node WebSocket RPC path for sub-agent spawning.

**Two eras of integration:**

1. **Original (`lib/openclaw/*`):** Per-agency gateway. Session key `kyra-user-{userId}` or `agent:client:{clientId}` / `agent:main:{userId}` (`openclaw/sessions.ts:36-38`, `agency/container.ts:14-23`). Hand-rolled WebSocket client (`gateway-ws.ts`) to bypass webpack issues with the `ws` library. 30-minute in-memory TTL for sessions. Only 6 route files still import it: `app/api/openclaw/health`, `app/api/openclaw/tools`, `app/api/chat/openclaw`, plus their worktree duplicates.

2. **Current (`lib/ovh/*`):** Per-**client** containers behind Traefik on an OVH VPS. Each `agency_clients` row carries `gateway_url`/`gateway_token`/`gateway_container_id`/`gateway_status`. Resolver functions: `getGatewayByClientId`, `getGatewayByGhlLocation`, `getGatewayByUserId`. Traefik handles wildcard routing `{client-id}.gw.kyra.conversionsystem.com`. The OVH provisioner HTTPS API (`provisioner.gw.kyra.conversionsystem.com`) manages container lifecycle.

**Session-key pattern:**
- Old: `kyra-user-${userId}` (`openclaw/sessions.ts:36-38`).
- New per-client: `agent:client:${clientId}` (`agency/container.ts:14-16`).
- User-level: `agent:main:${userId}` (`agency/container.ts:21-23`).

**Feature flag control:** `lib/config/features.ts:9-14` — `useWorker` (Cloudflare multi-tenant sandboxes), `useOpenClaw` (legacy Mac-mini tunnel path), `openclawSkills` (enable OpenClaw skill ecosystem). `/api/chat/route.ts` branches on these flags.

**Status:** `lib/openclaw/*` is legacy but not dead. `lib/ovh/*` is the forward path. The WS RPC client in `gateway-ws.ts` is sophisticated and still references `OPENCLAW_GATEWAY_URL`/`OPENCLAW_API_KEY` env vars for a single shared gateway (not per-client) — the code explicitly says *no* fallback to shared gateway elsewhere, so this WS path may only be for the `kyra-backend` operator/dashboard connection, not tenant chat.

## C. AI/agent orchestration

Kyra has **four overlapping AI call paths**, each with its own router:

1. **Dashboard chat (`lib/ai/claude.ts` + `lib/ai/model-router.ts`)** — uses Anthropic directly. Tiers: `economy` (Haiku), `standard` (Sonnet), `premium` (Opus). Pattern-based router with structural-complexity guards (length, code fences, URLs, newlines). Model default `claude-sonnet-4-20250514` (`claude.ts:32`). Tool loop caps at 5 rounds (`claude.ts:95`).

2. **Widget/GHL chat (`lib/chat/core.ts` + `lib/ghl/model-router.ts`)** — uses OpenRouter (or OpenAI) with `OPENROUTER_SLUGS` canonical map verified 2026-04-03. Provider-aware tiers `simple`/`medium`/`complex`. A comment at `lib/ai/model-router.ts:10-14` flags the two routers explicitly and asks for them to stay in sync.

3. **Containerized OpenClaw (`lib/ovh/gateway-client.ts`)** — message is posted to `{client-gateway}/v1/chat/completions`, session continuity via `X-Session-Key` header. Used for any per-client AI where persistent memory matters.

4. **GHL direct-LLM (`lib/ghl/direct-llm.ts`)** — OpenClaw's proxy doesn't forward `tools`, so tool-use flows (function calling for GHL 50-skill tools) go direct to OpenAI/OpenRouter, bypassing OpenClaw entirely (`direct-llm.ts:1-12`).

**Multi-agent (`lib/multi-agent/agent-manager.ts`)** — department routing. Keyword-score × priority selects Front Desk / Sales / Support / Collections / Review / Content Creator. Returns an `AgentRole`; `buildAgentPrompt` wraps the base prompt with role info.

**AI Workers (`lib/ai-workers/*`)** — different concept from multi-agent. These are role templates with `soulMd`, channels, required skills, and capability constraints. They're persisted per-client and seeded into the container's SOUL.md.

**Autopilot (`lib/autopilot/autopilot-engine.ts`)** — 7-day action schedule with message templates and target-audience descriptors. Consumed by a cron.

**Pipeline AI Closer (`lib/pipeline/ai-closer.ts`)** — the flagship OpenClaw-backed autonomous sales agent. `lib/pipeline/soul-injector.ts` writes SOUL.md + CAMPAIGN.md into the container *before* launching outreach, so the agent has full campaign context and persistent memory across conversations. Falls back to direct LLM when no container is available.

**Model selection summary:**
- Anthropic `claude-haiku-4-5` / `claude-sonnet-4-5` / `claude-opus-4-6` — primary for chat.
- `gpt-4o-mini` — cost-efficient utility: campaigns, funnels, reviews, lead scoring, task executor, email writer, automations, analytics reporter.
- `claude-sonnet-4-6` (via OpenRouter) or `gpt-4o` — HTML page generation (`lib/sites/ai-html-engine.ts`).
- `text-embedding-3-small` — embeddings.
- `whisper-1` — STT (`lib/channels/whisper.ts`).
- OpenAI TTS `nova` — voice output (`lib/channels/voice.ts`).

## D. Billing architecture

**Plans:** 5-tier catalog in `lib/billing/plans.ts` (`free`, `solo_pro` (hidden legacy, $39), `starter`/Lite $99, `pro` $299, `scale` $499). Each plan has `maxClients`, `monthlyCredits`, `monthlyWebScrapes`, `maxTeamMembers`. Plans are **client-count based**, not credit-based — the credit cost structure was layered on top later. `plans.ts:203-243` has a block of `@deprecated` credit-related functions kept for compile compatibility.

**Credits:** `lib/billing/credit-engine.ts` is the **single source of truth**. Every billable action is in `CREDIT_COSTS` (`credit-engine.ts:54-101`): pipeline actions (`find_leads=5`, `enrich=2`), chat (`message=1`, `deep_research=5`), channels (`ghl_sms=1`, `voice_call=2`), CRM (`crm_enrichment=2`), website (`page_generation=5`), SEO (`geo_test=5`), campaign (`generate=3`), funnel (`generate=3`). Free actions (`system.calendar`, `system.reminder`, `system.memory`) log but don't deduct.

**Flow:** `requireCredits(agencyId, action, multiplier, overrideCost)` → preflight check → if allowed, run the operation → `deductCredits(agencyId, action, { multiplier?, override?, clientId?, description? })`. Logs to `credit_transactions`. Crossing `LOW_BALANCE_THRESHOLD = 50` fires a one-time notification via `ESCALATION_WEBHOOK_URL` (`credit-engine.ts:241-245, 361-388`).

**Credit source is model-aware.** `lib/billing/model-credits.ts` defines per-model credit costs so Sonnet requests drain more than Haiku — callers pass `overrideCost` from `getCreditsForModel(model)` to prevent cheap-request credits from unlocking expensive models (`credit-engine.ts:138-175` is the core of this concern).

**BYOK:** `lib/billing/byok.ts` — agency-supplied API key priority `anthropic > openrouter > openai > google`. `isByok=true` always set if keys present; `skipCredits=true` only on paid plans (`starter`, `pro`, `scale`, `solo_pro`, `beta`). Free-plan BYOK still consumes platform credits — they pay for routing, CRM, infra.

**Stripe subscription state:**
- `agencies.stripe_customer_id` — customer ID.
- `agencies.plan` — the agency's current plan (synced from subscription items).
- `agencies.stripe_connect_account_id` — Express account for client-billing pass-through.
- `agency_credits.{balance, lifetime_purchased, lifetime_used}` — credit wallet per agency.
- `agency_billing` — invoice history (type: `subscription` / `client_fee` / `credit_topup`).
- `credit_transactions` — usage log.

**Webhook flow (`lib/stripe/webhooks.ts`):**
1. `verifyStripeWebhook(body, signature)` checks `STRIPE_WEBHOOK_SECRET`.
2. `invoice.paid` → inserts `agency_billing` row, classifies as `subscription` / `client_fee` (if `metadata.client_id` present) / `credit_topup`.
3. `customer.subscription.updated` → `planFromPriceId` reverse-lookup (maps annual → base plan), updates `agencies.plan`, grants credits (per the recent `8f69ab60` commit).
4. `customer.subscription.deleted` → downgrade.
5. `account.updated` (Connect) → syncs `stripe_connect_account_id` status.

**Stripe Connect:** `lib/stripe/connect.ts` — Express accounts per agency, `APPLICATION_FEE_PERCENT = 10` platform take, agency-to-client invoicing through `createClientInvoice`.

## E. Integrations layer

**GHL (`lib/ghl/`)** — GoHighLevel CRM + messaging + calendar + pipeline. **Bidirectional.** Inbound: OAuth-connected clients; poller-based message ingestion via `/conversations/search` (no webhooks needed — works with draft marketplace apps — `poller.ts:1-14`). Outbound: 50 tools across contacts/conversations/opportunities/calendar/invoices/marketing/tasks (`lib/ghl/skills/`). Protocol: REST over `https://services.leadconnectorhq.com`, OAuth2 with HMAC-signed state param (`oauth.ts:29-50`). Uses `GHL_API_VERSION = '2021-04-15'` for most endpoints, `'2021-07-28'` for Voice AI. Token refresh persists back to Supabase via `onTokenRefresh` callback wired at `createGHLClientForAgencyClient`.

**Integrations (`lib/integrations/`)** — smaller one-off adapters:
- **Google Calendar** — OAuth, event read/write (`google.ts`).
- **Google Search Console** — metrics fetch (`gsc.ts`, `google-search-console.ts`). Inbound.
- **WordPress** — REST + App Password auto-publishing (`wordpress.ts`). Outbound.
- **HeyGen** — AI avatar video creation (`heygen.ts`). Outbound.
- **Jane (iHeartJane)** — cannabis inventory for Purple Lotus; Algolia direct-query (~4ms) with Firecrawl fallback (`jane.ts`). Inbound.
- `integrations/sync.ts` — writes `INTEGRATIONS.md` to the client container so the AI knows what tools are available (never includes secrets).

**Channels (`lib/channels/`)** — the unified inbound-message pipeline. `router.ts` dispatches Telegram/WhatsApp/Discord to the same conversation processor, resolves user, fetches memory, selects model, sends via OVH gateway. TTS (`voice.ts` — OpenAI) and STT (`whisper.ts` — Whisper-1) for voice messages.

**SMS (`lib/sms/`)** — delivery-focused: Onfleet webhook → template → Springbig/Blackleaf provider → log. **Inbound** webhook, **outbound** SMS. Springbig endpoint still TBD. Separate AI SMS campaign engine via GHL (`campaign-engine.ts`).

**Voice (`lib/voice/`)** — outbound/inbound phone via VAPI, Synthflow, Retell, GHL Voice AI, or Kyra Native (Twilio + OpenAI). Protocol varies per provider — REST + webhook callbacks for call events. Unified `VoiceProviderClient` interface (`types.ts:74-87`).

**Email (`lib/email/`)** — outbound only. Priority: GHL client → GHL platform → Resend fallback. `conversionsystem.com` is not verified in Resend so all platform mail routes via GHL (`sender.ts:1-12`). 7-email nurture sequence lives in `nurture-sequence.ts` — queued via `email_nurture_queue` table, processed by `/api/cron/email-sequence`.

**Onfleet (`lib/onfleet/`)** — self-contained delivery dispatch: SLA calc, route optimization, notification gating, rule engine, route optimizer. Pairs with `lib/sms/` for delivery notifications.

## F. Security & auth

**User auth** — Supabase Auth with cookie-based JWT. `lib/supabase/server.ts::createClient()` creates a request-scoped SSR client that reads/writes auth cookies. `lib/supabase/middleware.ts::updateSession()` is wired into Next.js middleware and (a) refreshes sessions, (b) gates `/agency` and `/admin` paths — unauthenticated users get 302 to `/login?redirect=...`.

**Service-role access** — `createServiceClientWithoutCookies()` intentionally uses plain `supabase-js` rather than `@supabase/ssr`, because the SSR factory pulls JWT from cookies and still applies RLS even when called with the service-role key. This distinction is critical and documented at `server.ts:31-40`. Every cron/webhook/background job uses this.

**Agency membership enforcement** — `lib/agency/middleware.ts::requireAgencyMember()` is the standard pattern in API routes: resolves user → finds their `agency_members` row → fetches agency → returns `{ user, agency, membership }` tuple or a 401/403 error object.

**Cron auth** — `lib/auth/cron.ts::requireCron()` rejects all requests if `CRON_SECRET` is unset (fail-closed). Accepts either `Authorization: Bearer` (Vercel's default) or a legacy `?secret=` query param.

**Secrets** — `lib/secrets/` — AES-256-GCM vault per-client. Key derived from `SECRETS_ENCRYPTION_KEY` via SHA-256, 12-byte IV, 16-byte tag, base64 payload `[iv][tag][ct]` (`crypto.ts:24-40`). Throws rather than failing open when key missing. Strict key-name regex `^[A-Z][A-Z0-9_]*$` normalized uppercase. Every operation first calls `assertClientBelongsToAgency` (`index.ts:24-41`).

**Prompt-injection defense** — `lib/security/prompt-injection.ts::defend()`. Three-layer system: (1) 80+ weighted regex patterns scored, (2) XML input isolation with role anchor, (3) output scanning. Risk tiers: low (0-2, wrap+log), medium (3-5, wrap+log+security reminder), high (6+, block entirely with deflection). Patterns cover instruction overrides, persona hijacks, system-prompt extraction, DAN jailbreak, developer-mode unlock, role prefix injection. Applied to untrusted channels: GHL SMS, email replies, webhook payloads.

**Rate limiting** — `lib/rate-limit.ts::isRateLimited(key, limit=30, windowMs=60000)`. Two-tier: in-memory first (intra-instance), Supabase `rate_limit_hits` for cross-instance persistence. Falls back to in-memory if table missing. 1% probabilistic GC of rows > 1 hour old. This fixes the real problem that Vercel cold starts defeat any pure in-memory limiter. **Note:** I couldn't see evidence of heavy adoption — only `lib/rate-limit.ts` itself exists, so rate-limiting appears to be opt-in per route rather than systemically applied.

**GHL action risk gating** — `lib/ghl/action-engine.ts` classifies every tool invocation via `lib/ghl/risk-config.ts` into risk tiers and supports a propose→approve workflow with audit trail (`action_proposals` + `action_log` tables). `lib/ghl/review-gate.ts` can hold any AI response for human approval per-client.

## G. Dead/legacy/risky code

**Legacy Fly.io provisioner (`lib/fly/*`)** — per-agency gateway on Fly was the original architecture. `lib/ovh/*` has superseded it entirely (per-client on OVH VPS). No imports of `@/lib/fly/*` appear in the poller/handler/route paths I searched — this module is effectively archived but hasn't been deleted. Candidate for removal if migration is complete. Note that the branching feature flag `KYRA_USE_WORKER` in `config/features.ts:9-10` suggests there's also a Cloudflare Worker path in progress — a third architecture co-existing with OpenClaw + OVH.

**Legacy OpenClaw path (`lib/openclaw/*`)** — only 6 route files still import it, all scoped under `/api/openclaw/*` and `/api/chat/openclaw`. Everything else has moved to `@/lib/ovh/*`. Hand-rolled WebSocket client in `gateway-ws.ts` is sophisticated but imports a single `OPENCLAW_GATEWAY_URL` / `OPENCLAW_API_KEY` env pair — which contradicts the explicit "NO FALLBACK — per-agency required" comment in `openclaw/client.ts:16-17`. Looks like `gateway-ws.ts` is intended only for the backend-operator dashboard connection, not tenant chat. Worth auditing.

**`lib/email/sequences.ts`** — explicitly marked `DEPRECATED — use nurture-sequence.ts` (`sequences.ts:1-8`). Stub file kept to prevent stale imports. Safe to delete once a search confirms no lingering imports.

**`lib/billing/plans.ts:203-243`** — a block of 5 `@deprecated` functions (`getPlanLimit`, `isWithinLimit`, `getCreditCost`, `getUsagePercentage`, `classifyChatAction`) and a legacy `CREDIT_COSTS` record plus `CreditAction` type. These are kept "so existing chat/voice routes compile without changes" (`plans.ts:213-223`). Candidate for cleanup — the real credit engine is `lib/billing/credit-engine.ts`. The existence of two `CREDIT_COSTS` exports (one here, one in `credit-engine.ts`) is a confusing footgun.

**`lib/security/prompt-injection.ts:289-319`** — four `@deprecated` helpers (`analyzeInput`, `deflect`, `logAttempt`, `buildOldStyleReminder`). `defend()` is the single correct entrypoint now.

**`lib/seo/schema-markup.ts:92`** — `@deprecated generateBusinessSchema` (kept for compat).

**Cross-router classification drift risk** — both `lib/ai/model-router.ts` and `lib/ghl/model-router.ts` carry reminder comments (`ai/model-router.ts:10-14`, `ghl/model-router.ts:3-7`) to keep classification heuristics in sync. This is a smell — two routers doing similar work are bound to drift. Worth consolidating or adding a unit test that asserts parity on a fixture.

**`lib/channels/router.ts:1-17`** imports `resolveGatewayForUser` which I couldn't verify exists — worth checking the current `lib/ovh/gateway-resolver.ts` for that exact export vs `resolveGatewayUrl` / `resolveClientGateway`. Possible stale reference.

**`lib/ghl/gateway-ws.ts` env vars vs `NO FALLBACK` policy** — the shared `OPENCLAW_GATEWAY_URL` / `OPENCLAW_API_KEY` is a legitimate security concern: if used in any per-tenant path, it would defeat isolation. Confirmed above; recommend an explicit comment or guard that this client only ever connects on behalf of the kyra-backend operator role (the `sendConnect` payload does declare `role: 'operator'`, `scopes: ['operator.admin']` at `gateway-ws.ts:170-176`, which is consistent — but worth a documentation/guard pass).

**Three co-existing gateway architectures** — `fly/` (Fly.io, legacy, archived), `openclaw/` (Mac-mini tunnel, semi-legacy), `ovh/` (per-client Docker, current). Plus a `KYRA_USE_WORKER` flag for Cloudflare Worker sandboxes (fourth path). This is the biggest structural risk surface: it's very likely that the "simplicity" rule in `CLAUDE.md` is strained here. Consolidation should be the #1 cleanup target.

**`lib/voice/kyra-native.ts` and `twilio-phone.ts`** — not reviewed in detail but the Kyra Native voice provider uses Twilio directly for call handling. Twilio auth token is read from env — no encryption-at-rest for shared-platform Twilio keys (per-client Twilio would need to live in `secrets/`).

**TODO/FIXME scan** — only 9 occurrences across 8 files; of those, the only substantive "TODO with teeth" is `lib/sites/templates/sections/heroes/video-hero.ts:3` ("Accept a `videoUrl` prop and swap the CSS animation background"). The codebase is unusually free of TODO rot, which is a good signal. Comments like `// NOTE:`, `// ⚠️`, and docblock warnings do most of the flagging work.
