## Component Inventory by Domain

### `components/ui/` — Design system primitives (6 files)

Hand-rolled shadcn-flavored primitives — **not installed via the shadcn CLI** (no `components.json`, no Radix dependencies in `package.json`). Each is a single-file primitive built around `class-variance-authority` and `tailwind-merge` (via `@/lib/utils` `cn`). Kyra's indigo-heavy palette is baked into the variants.

| File | Purpose |
|---|---|
| `components/ui/button.tsx:5-29` | `cva` button with variants `default` (indigo), `destructive`, `outline`, `secondary`, `ghost`, `link` and sizes `default/sm/lg/icon`. Has `asChild` prop but no Radix `Slot` — the prop is accepted but ignored, rendering a real `<button>` either way. |
| `components/ui/badge.tsx:5-25` | `cva` badge with the usual variants **plus** Kyra-specific memory-type variants: `fact`, `person`, `decision`, `event`, `preference` — each with its own pastel border/bg/text. This tells you memory categories are rendered as badges somewhere in the app. |
| `components/ui/card.tsx` | Standard shadcn Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter set. Plain `div`/`h3`/`p` primitives — no Radix. |
| `components/ui/input.tsx` | Minimal styled `<input>` with `forwardRef`. |
| `components/ui/textarea.tsx` | Minimal styled `<textarea>` with `forwardRef`. |
| `components/ui/switch.tsx:13-40` | Hand-rolled toggle (not Radix Switch) — a `<button role="switch">` with `aria-checked` and `onCheckedChange`. Indigo accent. |

**Missing primitives.** There is no Dialog, Select, Dropdown, Tooltip, Tabs, Popover, Command, Checkbox, Radio, Accordion, Sheet, Toast, or Skeleton primitive in `components/ui/`. Every dialog, tabbed surface, popover, command palette, notification, and confirmation UI in the codebase is a bespoke implementation inside the feature component that owns it. Tabs in particular are reimplemented over and over (`ai-setup-tab.tsx:37-54`, `train-tab.tsx:30-49`, `insights-tab.tsx`, etc.) as pill-bar `<button>`s switching a local `useState<SubTab>`.

Rendering stack: `react-markdown` + `remark-gfm` + `rehype-highlight` for chat, `lucide-react` for icons (used **everywhere** — ~90% of components import it), and Tailwind + `@tailwindcss/typography` for prose.

---

### `components/chat/` — Chat interface (8 files, ~1280 LOC)

| File | Purpose |
|---|---|
| `components/chat/ChatInterface.tsx` (358 LOC) | **Top-level chat page component.** Owns conversations, messages, streaming state, credit balance, mobile sidebar. Imported by `/chat` pages. |
| `components/chat/ChatInput.tsx` (214 LOC) | Textarea + paperclip + submit, with drag-drop file upload, attachment chips, auto-resize. |
| `components/chat/MessageBubble.tsx` (154 LOC) | Renders one message. User bubbles are plain; assistant bubbles run the content through `ReactMarkdown` with `remarkGfm` inside a `prose` container, plus a copy button and `VoiceButton`. Exports `MessageSkeleton` for the three-dot loader. |
| `components/chat/ConversationSidebar.tsx` (226 LOC) | Dark (gray-900) sidebar with grouped conversations (Today/Yesterday/Previous 7 Days/Older), collapse, mobile overlay, bottom nav links, credit counter. |
| `components/chat/CreditBadge.tsx` (85 LOC) | Two exports: `CreditBadge` (floating pill linking to `/agency/credits`) and `CreditWarningBanner` (zero-balance red banner). Both use `usePolling('credits', 15s)`. |
| `components/chat/SearchResults.tsx` (104 LOC) | Parses `[SEARCH_SOURCES]…[/SEARCH_SOURCES]` JSON blocks from assistant messages (functions `parseSearchContext` / `stripSearchContext`) and renders an expandable sources dropdown with Google favicon fallback. |
| `components/chat/VoiceButton.tsx` (71 LOC) | Text-to-speech trigger that POSTs to `/api/voice/tts` and plays the returned audio blob. |
| `components/chat/WakingUpIndicator.tsx` (73 LOC) | Rotating "Waking up your AI…" messages staged on 5/15/30 s boundaries. **Appears orphaned** — no import site outside the file itself (`Grep WakingUpIndicator` matched only the file and a worktree copy). |

**Chat architecture.** The main message-send loop in `ChatInterface.tsx:148-229` opens a fetch against `/api/chat` and consumes SSE-style `data: {json}` lines. Events are typed: `conversation`, `usage`, `content` (incremental text), `message` (final user+assistant pair), `memory_saved`. Memory surfacing is currently just `console.log('Memory saved:', parsed.memory)` at line 218 — there is **no visible memory-save toast in the chat UI**, despite the memory-type `Badge` variants suggesting one existed or is planned. Tool-call / pipeline rendering is **not** done in chat — `PipelineProgress` (`components/pipelines/`) is never imported into `ChatInterface`. Pipelines surface elsewhere.

---

### `components/dashboard/` — Agency / solo mission-control surfaces (31 top-level files + 29 client-tabs)

#### Top-level dashboard widgets

| File | Purpose |
|---|---|
| `solo-overview.tsx` (652 LOC) | Full mission-control page for **solo** accounts — gateway status, credits, conversation feed, setup CTAs. Imported by `app/(dashboard)/agency/page.tsx`. |
| `mission-control-live.tsx` (468 LOC) | Live-polling fleet + conversation feed for **agency** accounts. Shows fleet KPIs, live message stream, per-client strip. |
| `ceo-action-board.tsx` (168 LOC) | Agency-home health-check panel driven by `/api/admin/health-check`. Shows critical/warning/info items with optional SQL-to-paste, refresh button, dismiss state. |
| `agency-analytics-strip.tsx` (91 LOC) | 4-stat hero strip (conversations today/week, resolution rate, escalations, active workers) + busiest-client callout. |
| `agency-checklist.tsx` (175 LOC) | 6-item launch checklist (clients, running client, GHL, personality, conversations, billing). |
| `fleet-status-bar.tsx` (93 LOC) | Horizontal stacked bar showing running/starting/errored/stale workers with % fleet-health. |
| `credit-wall-modal.tsx` (139 LOC) | Buy-credits modal with 3 packs calling `/api/billing/checkout`. |
| `low-credit-banner.tsx` (83 LOC) | Amber/red banner when balance ≤ 10, dismiss persisted to localStorage keyed by threshold. |
| `trial-countdown-banner.tsx` (60 LOC) | Reworded to an upgrade nudge ("trials removed" per comment at line 3). Targets free-plan users with ≥1 client. |
| `whats-new-banner.tsx` (100 LOC) | Versioned "what's new" banner (current `BANNER_VERSION = '2026-04-18-v1'`). Dismiss resurrects on bump. |
| `referral-nudge.tsx` (130 LOC) | Two separate nudges — low-credits nudge + 48h early-bird promo — both keyed to localStorage. |
| `referral-share-widget.tsx` (104 LOC) | Share card with copy link, tweet, LinkedIn share. |
| `revenue-unlock-card.tsx` (114 LOC) | Upsell card calculating next-tier MRR uplift ($997/client × plan-max). Hidden on scale plan. |
| `roi-summary-card.tsx` (159 LOC) | Churn-prevention ROI widget (4 min × $30/hr heuristic) — exists to make cancel-button feel stupid. Comment block makes this explicit (lines 1-16). |
| `router-savings-widget.tsx` (66 LOC) | "% answered for free (no LLM call)" tile driven by `/api/agency/router-stats`. |
| `sales-lead-widget.tsx` (146 LOC) | **Master-only** widget with 10 hardcoded hot-lead personas and ready-to-send openers. Internal CRO tool for Angel. |
| `web-chat-leads.tsx` (416 LOC) | Widget-captured-leads inbox with urgency badges, contact info, conversation previews, status management. |
| `ultron-summary-card.tsx` (196 LOC) | Agency-wide risk summary (clients with no convos 7d, degraded response times, errored gateways). |
| `ai-suggestions-card.tsx` (103 LOC) | Per-client GPT-generated suggestions ("problem / fix" pairs) loaded on demand from `/api/agency/clients/:id/ai-suggestions`. |
| `client-activity-heatmap.tsx` (161 LOC) | Day-of-week × hour-of-day indigo heatmap of message volume. |
| `client-sparkline.tsx` (114 LOC) | Inline SVG sparkline of message counts + up/down/flat trend icon. |
| `client-status-banner.tsx` (187 LOC) | **Pure server-compatible** banner (no hooks) — renders error banners for gateway-crashed, not-deployed, GHL-token-expired, missing-BYOK. |
| `health-score-badge.tsx` (94 LOC) | Red/amber/green badge fetching `/api/agency/clients/:id/health-score`. |
| `onboarding-progress.tsx` (114 LOC) | Progress bar over `OnboardingStepsRecord`, dismissable, auto-hides at 100%. |
| `section-nav.tsx` (87 LOC) | In-page sibling-tab strip (AI Worker / Channels / Automation / Insights). Pure nav, no state. |
| `model-selector.tsx` (110 LOC) | Grouped-by-tier model picker (mini/standard/pro/reasoning/premium/ultra) over `lib/billing/model-credits` `MODELS`. |
| `widget-builder-embedded.tsx` (495 LOC) | **"Purple Lotus–style"** web-chat-widget builder with 4 tabs: Appearance / Quick Replies / Behavior / Embed. Manages all state locally, POSTs to `/api/agency/clients/:id`. |
| `voice-channel-card.tsx` (529 LOC) | Full voice-AI config: provider (VAPI/Synthflow/Retell/GHL-native/Kyra-native), API key, phone provisioning, assistant ID, call history, outbound dialer. |
| `quick-answers-editor.tsx` (167 LOC) | Editor for hours/address/services/pricing + custom Q&A pairs — the "free" template responses that skip LLM calls. |
| `ghl-webhook-config.tsx` (169 LOC) | Step-by-step GHL Workflow → Custom Webhook setup wizard with copy-webhook-URL. |
| `outreach-webhook-setup.tsx` (383 LOC) | Counterpart wizard for the outreach-engine webhook. Stores URL in agency settings (no env var required — see comment lines 3-12). |

#### `components/dashboard/client-tabs/` — Per-client dashboard tabs (29 files, ~14.8K LOC)

These compose the big client detail view at `app/(dashboard)/agency/clients/[id]/client-detail-view.tsx`. That file declares the top-level tab set at line 198: `'inbox' | 'terminal' | 'crm' | 'voice-sms' | 'dispatch' | 'marketing' | 'website' | 'seo-geo' | 'ai-setup' | 'integrations' | 'it-operations' | 'settings' | 'insights'`, gated by plan/role (master-only: marketing, seo-geo, voice-sms, dispatch).

| Tab | File (LOC) | What it does |
|---|---|---|
| **AI Setup** (parent) | `ai-setup-tab.tsx` (61) | Container with sub-nav: Train AI / AI Workers / Booking (master only). |
| Train (sub-parent) | `train-tab.tsx` (62) | Sub-nav: Identity / Training / Behavior. |
| — Identity | `identity-sub-tab.tsx` (171) | Persona, role worker selection, language (20+), greeting. |
| — Training | `training-sub-tab.tsx` (607) | Business info, services, URLs to scrape, file uploads; embeds `KnowledgeEngineCard`. |
| — Behavior | `behavior-sub-tab.tsx` (198) | Proactive greeting toggle, wake-words (pause/escalate/custom), escalation rules; embeds `AISuggestionsCard`. |
| AI Workers | `ai-workers-tab.tsx` (996) | Worker marketplace (categories: customer-facing/internal/sales/marketing/ops/industry), team builder (primary + members with triggers), handoff style. Pulls `ROLE_WORKERS` + `TEAM_TEMPLATES` from `lib/ai-workers/`. |
| Booking | `booking-config-tab.tsx` (377) | Calendar/GHL booking config — availability hours, duration, confirmation template. |
| **Channels Live** | `channels-live-tab.tsx` (36) | Thin wrapper: imports `ChannelsClient` from `app/(dashboard)/agency/channels/channels-client` + embedded `WidgetBuilderEmbedded`. |
| **CRM** | `crm-tab.tsx` (**2920** — by far the largest) | Contacts, companies, deals kanban, email/SMS campaigns, tasks, enrichment, scoring, AI next-action, CSV import. This is a small CRM app inside one file. |
| **Dispatch** | `dispatch-tab.tsx` (1275) | SLA zones, rules, notification gates, auto-optimize, API key setup (Onfleet/other). |
| **Email Marketing** | `email-marketing-tab.tsx` (1382) | Campaign builder, templates, contact segmentation, send stats (delivered/opened/clicked/bounced/complained/unsubscribed). |
| **Voice/SMS** (parent) | — | Container tab. Sub-tabs: |
| — Voice | `voice-sub-tab.tsx` (375) + `retell-voice-tab.tsx` (529) | Retell AI call logs, browser mic tester, assistant settings. |
| — Delivery SMS | `delivery-sms-tab.tsx` (523) | SMS provider config, templates per event, sending hours, compliance footer, log browser. |
| — SMS Campaigns | `sms-campaigns-sub-tab.tsx` (488) | Bulk SMS campaigns. |
| **Marketing** (parent) | `marketing-tab.tsx` (1077) | 8 sub-tabs: dashboard, social, email, sequences, campaigns, sms, reviews, workflows. Imports `EmailMarketingTab`, `CampaignsSubTab`, `SMSCampaignsSubTab`, `ReviewsSubTab`, `WorkflowsTab`, and `EmailSequencesDashboard` from the app dir. |
| — Campaigns | `campaigns-sub-tab.tsx` (330) | Multi-channel campaign plan generator (email/SMS/social). |
| — Funnels | `funnels-sub-tab.tsx` (288) | AI-generated funnel plans (landing / form / thank-you / email sequence). |
| — Reviews | `reviews-sub-tab.tsx` (490) | Review-request blasts, response tracking, sentiment stats. |
| — Workflows | `workflows-tab.tsx` (706) | Trigger-based workflows (templates, runs, step editor). |
| **Website** | `website-tab.tsx` (902) | Site overview, live URL, publish actions, SEO summary, build-request queue. |
| **SEO/GEO** | `seo-geo-tab.tsx` (82) | Thin wrapper over the massive `components/seo-geo-command-center.tsx` (1966 LOC — command center for SEO audits, rankings, fixes). |
| **IT Operations** | `it-operations-tab.tsx` (564) | Master-only. Email / files / teams / meetings / code / research connections tab over the client's `container_config`. |
| **Secrets** | `secrets-tab.tsx` (455) | Encrypted secrets vault for the client's AI (key/value/description, masked until reveal). |
| **Skills** | `skills-tab.tsx` (519) | Built-in skill registry browser (categories: Research/Communication/Knowledge/Monitoring/Utilities/Integration/AI). Rendered inside AI Workers. |
| **Insights** | `insights-tab.tsx` (281) | Usage analytics / Tasks / Memory / AI reports sub-nav; composes `HealthScoreBadge` + `ClientActivityHeatmap` + `RoiSummaryCard` + `WorkerPerformanceCard` + `TasksCard`. |
| — Tasks | `tasks-card.tsx` (631) | Scheduled worker tasks (cron-style, task types, run history). |
| — Worker Perf | `worker-performance-card.tsx` (202) | Per-worker scorecard (reply rate, escalation rate, bookings, sentiment, credits). |
| — Knowledge | `knowledge-engine-card.tsx` (229) | Browser of the client's auto-learned knowledge entries (business_fact / customer_pattern / conversation_outcome / contact_preference / product_knowledge / correction). |
| **Payments** | `payments-sub-tab.tsx` (391) | Payment-request workflow (sent / paid / overdue stats, collection rate). |

---

### `components/landing/` + `components/marketing/` + `components/brand/` — Marketing surfaces (6 files)

| File | Purpose |
|---|---|
| `components/landing/HeroChatWidget.tsx` (197 LOC) | **The hero demo**. A fake-Chrome-window chat interface wired to `/api/chat/demo` with streaming, rate-limit→signup CTA, and 4 suggestion chips. Used by `app/api/widget/chat/route.ts` (and presumably the marketing home page that isn't in the normal search results — Grep missed it but the import shape is clear). |
| `components/landing/activity-ticker.tsx` (52 LOC) | 12 hand-written fake social-proof wins ("Dental AI in Dallas booked 3 appointments…"), rotating every 4.5s with fade. |
| `components/landing/live-stats.tsx` (54 LOC) | 4-stat grid (response time / active agencies / industry templates / conversations) from `/api/stats` with hardcoded fallback. |
| `components/landing/lead-capture.tsx` (57 LOC) | Email form → `/api/leads` with loading/done/error states. |
| `components/marketing/testimonial-placeholder.tsx` (26 LOC) | Placeholder quote card with default copy. Single export, used where testimonials are stubbed. |
| `components/brand/kyra-logo.tsx` (60 LOC) | **Single source of truth for the Kyra wordmark** — variant (`dark`/`light`), size (`sm`/`md`/`lg`), optional `href`. Comment line 7 explicitly says "Stop creating new logos." |

The marketing home page itself is composed not inside `components/landing/` but in `app/page.tsx` / `app/(public)/…`. These components are the reusable pieces: hero demo, ticker, stats, email capture, testimonials, logo.

### `components/layout/` (2 files)

| File | Purpose |
|---|---|
| `public-nav.tsx` (94 LOC) | Sticky top nav for public pages. 7 links (Website Builder / Use Cases / Setup Guides / Blog / GHL Marketplace / OpenClaw → / Help), Sign In + Get Started Free CTAs, mobile hamburger. |
| `public-footer.tsx` (83 LOC) | 4-column footer: Product / Live Demos / Resources / Company. 6 `/try/:vertical` live-demo links (dental, realestate, auto, cannabis, restaurant, medspa). |

---

### `components/agency/` — Agency owner tools (3 files)

These are specifically for the agency **owner** (not a client inside an agency):

| File | Purpose |
|---|---|
| `VoiceCommandButton.tsx` (333 LOC) | Floating mic button that records via `MediaRecorder` → POSTs webm to `/api/agency/voice-command` → executes dashboard actions. State machine: idle/recording/processing/success/error/text-input. Mounted globally in `app/(dashboard)/agency/layout.tsx`. |
| `gateway-status.tsx` (123 LOC) | Summary banner for the agency dashboard — all-green / yellow-has-errors / mixed-starting, reading `/api/agency/gateway/status`. |
| `ghl-agency-connection.tsx` (210 LOC) | Agency-level (not per-client) OAuth status card for GoHighLevel Marketplace app. Connected/expired state + disconnect confirmation. |

What an agency owner sees that a solo doesn't: primarily the `mission-control-live` fleet view (vs solo's single-worker `solo-overview`), the `ceo-action-board` + `agency-analytics-strip` + `agency-checklist` triad, `ultron-summary-card`, the voice command button, agency-level GHL marketplace connection, and the full client-tabs navigation at `/agency/clients/:id`.

### `components/master/` — Super-admin surfaces (1 file)

| File | Purpose |
|---|---|
| `growth-chart.tsx` (207 LOC) | Platform-wide growth chart — daily new signups + cumulative totals split solo vs agency. Used by Angel (master agency `1511e077-77ef-4c47-81fd-06a3bc9f1dbb`, referenced in `ai-setup-tab.tsx:12` and `ai-workers-tab.tsx:77`). |

The "master" concept is a hardcoded agency ID that grants extra tabs (booking, SEO/GEO, marketing, voice-sms, dispatch) and extra dashboard widgets (`sales-lead-widget.tsx`). It's access control by UUID, not a role column.

---

### Specialized feature UIs (other subdirs)

| Subdir | Files | What it does |
|---|---|---|
| `components/pipelines/` | `PipelineProgress.tsx` (158) | Multi-step pipeline tracker with SVG progress ring, per-step statuses (pending/running/completed/failed/skipped), approval gate calling `/api/pipelines/:id/approve`. **Not imported from anywhere in `app/` or `components/`** — orphaned. |
| `components/notifications/` | `NotificationCenter.tsx` (249) | Bell icon + dropdown panel. Types: insight / reminder_followup / calendar_prep / weekly_summary / nudge / morning_brief / pattern_alert. Priority rings (urgent/high). Polls `/api/notifications?limit=15` every 30 s. |
| `components/reminders/` | `ReminderNotification.tsx` (95) | Bottom-right floating toast stack polling `/api/reminders/due` every 60 s. Rendered inside `ChatInterface`. |
| `components/billing/` | `PlanRedirect.tsx` (10) | **No-op stub** — "disabled during beta" (comment line 4-5). Kept only to avoid breaking imports. |
| `components/widget/` | `powered-by-badge.tsx` (21) | "Powered by Kyra ⚡" link for the embeddable chat widget footer. Free/Lite plan forced-on per docstring. |
| `components/ai/` | `suggest-button.tsx` (123) | Generic "AI Suggest" button — opens a 400px popover with `/api/agency/ai-suggest` results. Used in autopilot-client, agents-client, email-templates-client. |
| `components/analytics/` | `MetaPixel.tsx` (88) + `PixelEvent.tsx` (36) | Meta pixel loader (ID `735277348604833`) with a typed `pixel.lead/completeRegistration/purchase/initiateCheckout/viewContent/addPaymentInfo/search/promoRedeemed` helper + server-renderable `<PixelEvent event="…">` drop-in. |
| `components/onboarding/` | `guided-tour.tsx` (268) + `launch-progress.tsx` (170) | Product tour (welcome → website-builder → ai-worker → crm → …) with highlight selectors; 5-stage launch tracker (signup / configure / connect / automate / growth). |

### Root-level `components/*.tsx` (4 files)

| File | Purpose |
|---|---|
| `command-palette.tsx` (323) | Cmd-K palette — 15 static nav items + dynamic client entries, fuzzy filter over labels/description/keywords, keyboard nav, sectioned results. Global Cmd/Ctrl-K listener + second export `CommandPaletteTrigger` for sidebar. |
| `command-palette-wrapper.tsx` (11) | Tiny passthrough wrapper that adapts the server-side client list into the palette. Exists so server components can render it. |
| `open-control-ui-button.tsx` (36) | Button that opens the OpenClaw Control UI in a new tab (fetches the URL from `/api/openclaw/dashboard-url`). |
| `seo-geo-command-center.tsx` (**1966 LOC** — second-largest file after `crm-tab.tsx`) | The SEO/GEO hub — GSC integration, keyword/ranking tables, content gaps, technical audits, fix suggestions. Wrapped by `components/dashboard/client-tabs/seo-geo-tab.tsx` with a `siteId` + `embedded` prop. |

---

## Hooks layer

Just **one** hook at `hooks/use-polling.ts` (173 LOC):

- `usePolling<T>({ key, fetcher, intervalMs, enabled? })` — module-level `Map<string, CacheEntry>` cache keyed by `key`. First subscriber starts the interval, subsequent subscribers share the cache and get instant data. `fetcher` is passed via a ref so consumers can close over fresh props. `refetch()` triggers an immediate update. Cleanup tears down the interval when the last listener unmounts.

Used by: `ChatInterface` (conversations, 30s), `CreditBadge` + `CreditWarningBanner` (credits, 15s), `NotificationCenter` (notifications, 30s). Everything else that polls — and there's a lot of it — does so with hand-rolled `useEffect(setInterval(...), [])` patterns (`mission-control-live.tsx`, `ReminderNotification.tsx`, `low-credit-banner.tsx` via localStorage, `agency-checklist.tsx`, `gateway-status.tsx`, etc.). The `usePolling` abstraction is a recent addition that hasn't propagated.

No other hooks. No `useAuth`, no `useUser`, no `useSupabase`, no `useDebounce`, no `useLocalStorage`.

---

## State management

**None.** Confirmed by:
- No `zustand` / `redux` / `jotai` / `@reduxjs/toolkit` / `@tanstack/react-query` in `package.json` (`package.json:17-43`).
- Zero `createContext(` calls in `components/`, `hooks/`, `lib/`, or `app/`.
- Zero `Provider` wrappers beyond Next's built-ins. The word "Provider" in the tree matches Supabase auth provider strings and unrelated identifiers, not React context providers.

**All state is local to the component that owns it or server-fetched via Server Components / route handlers.** Cross-cutting shared state is achieved through:

1. **Server rendering** — props baked in at RSC level (e.g., `ChatInterface` receives `initialConversation`, `initialMessages`, `conversations`, `userId` from the server page).
2. **Polling via `usePolling`** — module-level cache in `hooks/use-polling.ts` acts as a micro-SWR. Shared by key across mounted consumers.
3. **Custom window events** — `components/chat/CreditBadge.tsx:29` listens for `kyra:credit-update` events dispatched by chat after a message sends. This is the lightest-weight inter-component bus in the codebase.
4. **`localStorage`** — dismissal state for banners (`whats-new-banner.tsx`, `trial-countdown-banner.tsx`, `low-credit-banner.tsx`, `referral-nudge.tsx`, `onboarding-progress.tsx`).

For a codebase with ~100 components, zero contexts is notable and consistent with the "SIMPLICITY ABOVE ALL" directive in `CLAUDE.md`. The cost is duplicated polling setup and the same `fetch('/api/...')` boilerplate repeated ~40 times across components.

**"use client" density.** 91 of the ~107 `.tsx` files under `components/` (and its root) are `'use client'` — essentially every file with hooks, events, or browser APIs. The only server-compatible components are `ui/badge.tsx`, `ui/button.tsx`, `ui/card.tsx`, `ui/input.tsx`, `ui/textarea.tsx`, `brand/kyra-logo.tsx`, `layout/public-footer.tsx`, `marketing/testimonial-placeholder.tsx`, `widget/powered-by-badge.tsx`, and `dashboard/client-status-banner.tsx` (explicitly marked pure-presentational at lines 1-12).

---

## Component health

### Orphaned / dead code

- **`components/chat/WakingUpIndicator.tsx`** (73 LOC) — no import sites outside its own file in the main tree. The chat interface uses `MessageSkeleton` (three-dot loader) instead. Candidate for deletion.
- **`components/pipelines/PipelineProgress.tsx`** (158 LOC) — not imported anywhere in `app/` or `components/`. The pipeline-approval UI flow this renders has no entry point in the current app. Either feature was never wired up or the import was removed and the component forgotten.
- **`components/billing/PlanRedirect.tsx`** (10 LOC) — explicit no-op stub. Kept to avoid import breakage during the beta "no Stripe" window (see `CLAUDE.md` + billing commits). Fine to leave but should be deleted when billing is fully re-enabled.
- **`components/landing/HeroChatWidget.tsx`** — no `import HeroChatWidget` match in `app/` besides `app/api/widget/chat/route.ts` (an API route — that's a string-match false positive for widget-related code, not a real import). The component is likely imported by a `page.tsx` in a path Grep didn't surface, but worth verifying.
- **`components/landing/activity-ticker.tsx` / `live-stats.tsx` / `lead-capture.tsx`** — zero matches for `ActivityTicker | LeadCapture | LiveStats | activity-ticker | lead-capture | live-stats` under `app/`. Either imported under a different name (unlikely — defaults export the PascalCase) or orphaned from a previous marketing-page iteration.

### Duplicated logic

- **Tab / sub-tab pill-bars.** The same flex-of-pill-buttons-bound-to-`useState<SubTab>` pattern is reimplemented in at least 10 places: `ai-setup-tab.tsx`, `train-tab.tsx`, `marketing-tab.tsx`, `insights-tab.tsx`, `voice-sub-tab.tsx`, `it-operations-tab.tsx`, `skills-tab.tsx`, and more. A single `ui/tabs.tsx` would collapse hundreds of LOC.
- **`CopyButton` helper** — redefined inline in at least `funnels-sub-tab.tsx:14-24` and `campaigns-sub-tab.tsx:14-23` with nearly identical code (and again ad-hoc in many other files).
- **`timeAgo()` helper** — implemented from scratch in `ChatInterface` (no, by import — clean), but also in `mission-control-live.tsx:63-72`, `solo-overview.tsx:63-73`, `NotificationCenter.tsx:47-56`. Three separate implementations of the same function.
- **Polling setup** — `usePolling` exists in `hooks/use-polling.ts` but is used by only 4 components; ~15+ others reimplement `useEffect + setInterval` themselves.
- **GHL webhook guidance** — `ghl-webhook-config.tsx` and `outreach-webhook-setup.tsx` are structurally similar step-by-step wizards. Probably shareable.
- **Channel-color maps** — `mission-control-live.tsx:74-80`, `solo-overview.tsx:75-83`, and `ai-workers-tab.tsx:30-43` all define their own `CHANNEL_STYLES` / `getChannelBadgeColor` dicts with overlapping keys.

### Unusually large files (500+ LOC)

In order:

1. `components/dashboard/client-tabs/crm-tab.tsx` — **2920 LOC**. A full CRM (contacts, companies, deals kanban, tasks, campaigns) in one file. 138 hook usages. Badly needs decomposition into `crm/contacts/`, `crm/deals/`, `crm/campaigns/` folders.
2. `components/seo-geo-command-center.tsx` — **1966 LOC**. Cross-imported by both solo/agency SEO pages and the client SEO tab.
3. `components/dashboard/client-tabs/email-marketing-tab.tsx` — **1382 LOC**. Campaign/template/contact-list UI monolith.
4. `components/dashboard/client-tabs/dispatch-tab.tsx` — **1275 LOC**.
5. `components/dashboard/client-tabs/marketing-tab.tsx` — **1077 LOC**. Acts as both a container *and* implements dashboard/social sub-tabs inline.
6. `components/dashboard/client-tabs/ai-workers-tab.tsx` — **996 LOC**.
7. `components/dashboard/client-tabs/website-tab.tsx` — **902 LOC**.
8. `components/dashboard/client-tabs/workflows-tab.tsx` — **706 LOC**.
9. `components/dashboard/solo-overview.tsx` — **652 LOC**.
10. `components/dashboard/client-tabs/tasks-card.tsx` — **631 LOC**.
11. `components/dashboard/client-tabs/training-sub-tab.tsx` — **607 LOC**.
12. `components/dashboard/client-tabs/it-operations-tab.tsx` — **564 LOC**.
13. `components/dashboard/voice-channel-card.tsx` — **529 LOC**.
14. `components/dashboard/client-tabs/retell-voice-tab.tsx` — **529 LOC** (duplication concern: there is also `voice-sub-tab.tsx` 375 LOC and `voice-channel-card.tsx` 529 LOC — three separate voice UIs).
15. `components/dashboard/client-tabs/delivery-sms-tab.tsx` — **523 LOC**.
16. `components/dashboard/client-tabs/skills-tab.tsx` — **519 LOC**.
17. `components/dashboard/widget-builder-embedded.tsx` — **495 LOC**.
18. `components/dashboard/client-tabs/reviews-sub-tab.tsx` — **490 LOC**.
19. `components/dashboard/client-tabs/sms-campaigns-sub-tab.tsx` — **488 LOC**.
20. `components/dashboard/mission-control-live.tsx` — **468 LOC**.
21. `components/dashboard/client-tabs/secrets-tab.tsx` — **455 LOC**.
22. `components/dashboard/web-chat-leads.tsx` — **416 LOC**.
23. `components/dashboard/client-tabs/payments-sub-tab.tsx` — **391 LOC**.
24. `components/dashboard/outreach-webhook-setup.tsx` — **383 LOC**.
25. `components/dashboard/client-tabs/booking-config-tab.tsx` — **377 LOC**.
26. `components/dashboard/client-tabs/voice-sub-tab.tsx` — **375 LOC**.
27. `components/agency/VoiceCommandButton.tsx` — **333 LOC**.
28. `components/dashboard/client-tabs/campaigns-sub-tab.tsx` — **330 LOC**.
29. `components/command-palette.tsx` — **323 LOC**.
30. `components/dashboard/client-tabs/funnels-sub-tab.tsx` — **288 LOC**.

The top ~15 files together are >15 KLOC — well over half the component tree's total size. Each is a candidate for splitting as the product matures: e.g., `crm-tab.tsx` should become a folder with one file per entity (contacts, deals, companies, tasks). The "one giant file per feature tab" pattern is fast to iterate on in a solo-dev shop but will become the single biggest velocity tax once multiple people touch the code.

### Voice UI sprawl

There are **three** voice-related components with overlapping responsibilities: `components/dashboard/voice-channel-card.tsx` (529), `components/dashboard/client-tabs/retell-voice-tab.tsx` (529), and `components/dashboard/client-tabs/voice-sub-tab.tsx` (375). `voice-channel-card` lists VAPI/Synthflow/Retell/GHL/Kyra-native in one card, while `retell-voice-tab` is a Retell-only full-tab experience. These need consolidation or a clear rule for which is canonical.

### Other observations

- **Hardcoded IDs in components.** Master agency UUID `1511e077-77ef-4c47-81fd-06a3bc9f1dbb` appears inline in `ai-setup-tab.tsx:12`, `ai-workers-tab.tsx:77`, and likely elsewhere. Should live in `lib/constants.ts`.
- **Meta Pixel ID hardcoded** at `components/analytics/MetaPixel.tsx:5` — should be env var.
- **Hardcoded demo data** — `activity-ticker.tsx:8-22` is 12 hardcoded fake wins, `sales-lead-widget.tsx` has 10 hand-written leads (master-only so less offensive). Acceptable for a beta marketing page; flag for removal when real data is piped.
- **`'use client'` everywhere** is mostly unavoidable given the event-driven nature of the dashboard, but the handful of server-renderable primitives (`card`, `button`, etc.) and `client-status-banner` show the author knows the difference — the density is intentional, not sloppy.
