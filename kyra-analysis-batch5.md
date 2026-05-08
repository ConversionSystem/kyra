## Component Layer — `/components/` (18 subdirs, 100 files)

Enumeration of the `components/` tree at HEAD `9bdbb95d`. Eighteen subdirectories plus two root files: `components/open-control-ui-button.tsx` and `components/seo-geo-command-center.tsx`. Every file below a directory is a React component — no barrel `index.ts` files exist anywhere in `components/`, so consumers must import concrete paths.

**Verified deletions:** `components/command-palette.tsx` and `components/command-palette-wrapper.tsx` are gone from the active tree (only stale copies survive under `/Users/steve/projects/kyra/.claude/worktrees/focused-margulis-8cb5b4/`). `Grep command-palette` against `app/` + `components/` returns zero imports — the ⌘K surface has been cleanly excised.

**Verified new:** `components/admin/` exists with one file — `webhook-health-card.tsx` (212 LOC) — wired into `app/admin/admin-client.tsx:10` and rendered on `/admin` at line 407.

---

## 1. Component Inventory by Domain

### `components/admin/` (NEW)
| File | LOC | Purpose |
|---|---:|---|
| `webhook-health-card.tsx` | 212 | Stripe webhook health monitor — polls `/api/admin/webhook-health` every 5 min, renders endpoint status, 24 h event counts, last-event age, alerts, and registered event list. |

### `components/agency/`
| File | LOC | Purpose |
|---|---:|---|
| `VoiceCommandButton.tsx` | 333 | Floating bottom-right FAB → mic → `MediaRecorder` webm/opus → `POST /api/agency/voice-command`. State machine: `idle`/`recording`/`processing`/`success`/`error`/`text-input`. Has text fallback input. |
| `gateway-status.tsx` | 123 | One-shot fetch of `/api/agency/gateway/status`, summarizes OpenClaw container count into a single green/yellow/blue banner card. |
| `ghl-agency-connection.tsx` | 210 | OAuth card for connecting a GoHighLevel agency account, with connected/expired/disconnect states. |

### `components/ai/`
| File | LOC | Purpose |
|---|---:|---|
| `suggest-button.tsx` | 123 | Reusable "AI suggest" dropdown (loading/list/copy), hits `POST /api/agency/ai-suggest`. |

### `components/analytics/`
| File | LOC | Purpose |
|---|---:|---|
| `MetaPixel.tsx` | 88 | `<MetaPixelBase>` script injector + `pixel.lead()/purchase()/…` helpers. **Hardcoded `PIXEL_ID = '735277348604833'`** at line 5. |
| `PixelEvent.tsx` | 36 | Declarative "fire this pixel event on mount" wrapper. |

### `components/billing/`
| File | LOC | Purpose |
|---|---:|---|
| `PlanRedirect.tsx` | 10 | No-op stub — returns `null`. Kept to avoid breaking imports during beta. |

### `components/brand/`
| File | LOC | Purpose |
|---|---:|---|
| `kyra-logo.tsx` | 60 | Single source of truth for the "K + Kyra" wordmark. Supports `dark`/`light` variants and `sm`/`md`/`lg` sizes. Docstring: *"Stop creating new logos."* |

### `components/chat/`
| File | LOC | Purpose |
|---|---:|---|
| `ChatInterface.tsx` | **358** | Main chat host — SSE streaming loop, conversation sidebar, mobile drawer, 30 s conversation polling via `usePolling`. |
| `ChatInput.tsx` | 214 | Autosizing textarea with file attach + voice button integration. |
| `ConversationSidebar.tsx` | 226 | Conversation list + mobile drawer + credit widget. |
| `MessageBubble.tsx` | 154 | Renders markdown + file chips + streaming skeleton. |
| `SearchResults.tsx` | 104 | Renders citation-style search results in a message. |
| `CreditBadge.tsx` | 85 | Pill linking to `/agency/credits` + `<CreditWarningBanner>`. Uses `usePolling('credits', 15 s)` AND listens to `window` event `kyra:credit-update`. |
| `VoiceButton.tsx` | 71 | In-message mic toggle. |
| `WakingUpIndicator.tsx` | 73 | Rotating "Waking up…/Almost ready…/Just a moment…" stages at 5/15/30 s boundaries. **Orphan** (no importer). |

### `components/dashboard/` (31 top-level files, see §4)
| Representative | LOC | Role |
|---|---:|---|
| `solo-overview.tsx` | **652** | Solo-tier dashboard — dispatches `kyra:credit-update` events. |
| `voice-channel-card.tsx` | **529** | Voice-channel config + test harness (Retell). |
| `widget-builder-embedded.tsx` | **495** | Chat-widget builder embedded in agency/website editor pages. |
| `mission-control-live.tsx` | **468** | Live activity feed. |
| `web-chat-leads.tsx` | **416** | Table of web-chat leads. |
| `outreach-webhook-setup.tsx` | **383** | Outreach webhook URL + test helper. |
| `ultron-summary-card.tsx` | 196 | "Ultron" AI agent summary card. |

(full 31-file list — `agency-analytics-strip`, `agency-checklist`, `ai-suggestions-card`, `ceo-action-board`, `client-activity-heatmap`, `client-sparkline`, `client-status-banner`, `credit-wall-modal`, `fleet-status-bar`, `ghl-webhook-config`, `health-score-badge`, `low-credit-banner`, `model-selector`, `onboarding-progress`, `quick-answers-editor`, `referral-nudge`, `referral-share-widget`, `revenue-unlock-card`, `roi-summary-card`, `router-savings-widget`, `sales-lead-widget`, `section-nav`, `trial-countdown-banner`, `whats-new-banner` — all <200 LOC each).

### `components/dashboard/client-tabs/` (29 files, see §4)
Rendered by `app/(dashboard)/agency/clients/[id]/client-detail-view.tsx` (2442 LOC itself).

### `components/landing/` (ALL ORPHANS — see §13)
| File | LOC | Purpose |
|---|---:|---|
| `HeroChatWidget.tsx` | 197 | Embedded demo chat calling `/api/chat/demo`. |
| `activity-ticker.tsx` | 52 | Rotating hardcoded social-proof strip (12 fake wins). |
| `live-stats.tsx` | 54 | `/api/stats` fetch with `FALLBACK = { agencies: 9, … }`. |
| `lead-capture.tsx` | 57 | Single-field email form → `POST /api/leads`. |

### `components/layout/`
| File | LOC | Purpose |
|---|---:|---|
| `public-nav.tsx` | 94 | Top bar for public/marketing routes. |
| `public-footer.tsx` | 83 | Footer for public routes. |

### `components/marketing/`
| File | LOC | Purpose |
|---|---:|---|
| `testimonial-placeholder.tsx` | 26 | Placeholder quote card. **Orphan** — `app/ghl-marketplace/page.tsx:6` has a comment *"TestimonialPlaceholder removed — no real testimonials to show yet"*. |

### `components/master/`
| File | LOC | Purpose |
|---|---:|---|
| `growth-chart.tsx` | 207 | SVG cumulative growth line + daily bars for the master-admin agency list. No hardcoded UUID here (it lives in `app/api/admin/sync-leads/route.ts:37` and `app/(dashboard)/agency/clients/[id]/client-detail-view.tsx:335`). |

### `components/notifications/`
| File | LOC | Purpose |
|---|---:|---|
| `NotificationCenter.tsx` | 249 | Bell + dropdown panel, uses `usePolling('notifications', 30 s)`, renders `insight/reminder_followup/calendar_prep/…` with icons + priority rings. |

### `components/onboarding/` (ORPHANS)
| File | LOC | Purpose |
|---|---:|---|
| `guided-tour.tsx` | 268 | 5-step tour overlay. **Orphan** (no importer in `app/`). |
| `launch-progress.tsx` | 170 | Onboarding stage tracker (`signup → configure → connect → launch → grow`). **Orphan**. |

### `components/pipelines/`
| File | LOC | Purpose |
|---|---:|---|
| `PipelineProgress.tsx` | 158 | Step-by-step pipeline UI with approval gates. **Orphan** (zero importers). |

### `components/reminders/`
| File | LOC | Purpose |
|---|---:|---|
| `ReminderNotification.tsx` | 95 | Bottom-right toast stack of due reminders. Bespoke 60 s `setInterval` (does NOT use `usePolling`). |

### `components/ui/` (see §2)

### `components/widget/`
| File | LOC | Purpose |
|---|---:|---|
| `powered-by-badge.tsx` | 21 | "Powered by Kyra" affordance for the chat widget footer. |

### Root-level (see §9)
| File | LOC | Purpose |
|---|---:|---|
| `seo-geo-command-center.tsx` | **1966** | Monolithic SEO/GEO command center. Imported by `app/(dashboard)/agency/seo/seo-page-client.tsx`, `app/(dashboard)/agency/website/[siteId]/seo/page.tsx`, and `components/dashboard/client-tabs/seo-geo-tab.tsx`. |
| `open-control-ui-button.tsx` | 36 | Button → `/api/openclaw/dashboard-url` → `window.open`. **Orphan** (no importer). |

---

## 2. Design System — `components/ui/` (six primitives, zero compound)

Hand-rolled, shadcn-flavored but **NOT** CLI-installed: there is no `components.json` in the repo root and no `@radix-ui/*` dependency. Ripgrep for `@radix-ui` in `package.json` returns zero matches. `cn()` from `@/lib/utils` and `class-variance-authority` are the only helper deps.

| Primitive | LOC | Notable |
|---|---:|---|
| `button.tsx` | 50 | CVA: 6 `variant` × 4 `size`. Indigo palette. No `asChild` (prop declared but unused). |
| `badge.tsx` | 35 | CVA: 4 standard variants + 5 **memory-type** variants — `fact` (blue), `person` (indigo), `decision` (amber), `event` (green), `preference` (indigo). These map to Kyra's memory graph taxonomy and are the only hook tying UI colors to Supabase memory rows. |
| `card.tsx` | 48 | Card + CardHeader + CardTitle + CardDescription + CardContent + CardFooter. |
| `input.tsx` | 24 | Plain forwardRef `<input>` with default Tailwind classes. |
| `textarea.tsx` | 23 | Same pattern as Input. |
| `switch.tsx` | 42 | Button-based toggle (no Radix) — `role="switch"` + `aria-checked`, controlled only. |

### Missing compound primitives

Zero files for: **Dialog, Select, Dropdown / DropdownMenu, Tooltip, Tabs, Popover, Command, Checkbox, Radio, Accordion, Sheet, Toast, Skeleton, Alert, AlertDialog, Combobox, Form, Table, Avatar**. Every feature that needs one rolls its own inline.

### Tab-pill-bar reimplementations (the most expensive absence)

Concrete `activeTab === X ? 'bg-indigo-600 text-white' : 'text-gray-600'` pill-bar patterns live in at least **10** separate files — each re-declares a local `useState<TabId>` plus a `<div className="flex gap-2 ...">` button row:

1. `components/dashboard/client-tabs/crm-tab.tsx` (most pill instances — the 5 here trigger on the activeTab grep)
2. `components/dashboard/client-tabs/marketing-tab.tsx`
3. `components/dashboard/client-tabs/delivery-sms-tab.tsx`
4. `components/dashboard/client-tabs/worker-performance-card.tsx`
5. `components/dashboard/client-tabs/email-marketing-tab.tsx`
6. `components/dashboard/client-tabs/skills-tab.tsx`
7. `components/dashboard/client-tabs/secrets-tab.tsx`
8. `components/dashboard/client-tabs/dispatch-tab.tsx`
9. `components/dashboard/client-tabs/insights-tab.tsx` (plus `active[X]Tab` variant)
10. `components/dashboard/client-tabs/train-tab.tsx`
11. `components/seo-geo-command-center.tsx`

That's at least 10 copies of the same pill UI. The `active\w+Tab` grep separately matches `insights-tab.tsx`, `train-tab.tsx`, and `seo-geo-command-center.tsx`; the pill-count grep matches the 10 above (plus 5 more files where the style tokens appear once). A single `<Tabs>` primitive would delete the duplication outright.

---

## 3. Chat Interface — `components/chat/`

`ChatInterface.tsx` is 358 LOC and lives at the center:

- `app/chat/page.tsx` feeds it `initialConversation` + `initialMessages` as server props.
- Auto-redirect to most recent conversation at `ChatInterface.tsx:54-57`.
- Credit state fetched once at `:40-49` via `/api/usage`; during streaming the `usage` SSE event at `:202-207` overwrites it.
- **SSE parsing loop** at `:176-224` handles four typed events + `[DONE]`:
  - `conversation` — appends new conversation to sidebar
  - `usage` — updates credit badge
  - `content` — accumulates streamed chunks into `streamingContent`
  - `message` — replaces the optimistic `temp-*` user bubble with the persisted pair
  - `memory_saved` — **`console.log('Memory saved:', parsed.memory)` at line 218.** Confirmed still just a log. No UI surfaces it — the user gets no indication that a memory was persisted.
- Conversation list auto-refreshed every 30 s via `usePolling({ key: 'conversations' })` at `:65-77`.
- `ConversationSidebar`, `MessageBubble`, `ChatInput`, `CreditBadge`, `VoiceButton`, `SearchResults` are wired in; `WakingUpIndicator` is never imported (checked — only self-reference).

`CreditBadge.tsx:29-30` is the consumer of the custom `kyra:credit-update` window event (dispatched from `components/dashboard/solo-overview.tsx:130`, `app/(dashboard)/agency/billing/billing-page-client.tsx:81`, and `app/(dashboard)/agency/credits/credits-client.tsx:517`).

---

## 4. Dashboard Surfaces

### Top-level widgets (31 files)
Largest cluster of the codebase. Mix of banners (`low-credit-banner`, `trial-countdown-banner`, `whats-new-banner`), cards (`ai-suggestions-card`, `roi-summary-card`, `revenue-unlock-card`), and embedded feature surfaces (`mission-control-live`, `widget-builder-embedded`, `voice-channel-card`, `outreach-webhook-setup`, `solo-overview`). Three files breach 400 LOC: `solo-overview` 652, `voice-channel-card` 529, `widget-builder-embedded` 495, `mission-control-live` 468, `web-chat-leads` 416.

### `client-tabs/` (29 files)
Consumed by `app/(dashboard)/agency/clients/[id]/client-detail-view.tsx`, which declares the top-level tab union at line 198:

```ts
type Tab = 'inbox' | 'terminal' | 'crm' | 'voice-sms' | 'dispatch' | 'marketing'
         | 'website' | 'seo-geo' | 'ai-setup' | 'integrations' | 'it-operations'
         | 'settings' | 'insights';
```

13 tabs. Array literal at `client-detail-view.tsx:232-260` groups them with icon + plan/role gating (`ai-setup`, `integrations`, `it-operations`, `settings` are pushed into an "Admin" slot; `insights` into an "Analytics" slot).

Hardcoded master-agency UUID at **`client-detail-view.tsx:335`** (`const MASTER_AGENCY_ID = '1511e077-77ef-4c47-81fd-06a3bc9f1dbb'`) plus two more literals at 340 and 347 — same UUID. Also duplicated in:
- `components/dashboard/client-tabs/marketing-tab.tsx:1019` (`KYRA_MAIN_AGENCY_ID`)
- `components/dashboard/client-tabs/ai-setup-tab.tsx:12` (`MASTER_AGENCY_ID`)
- `components/dashboard/client-tabs/ai-workers-tab.tsx:77` (`MASTER_AGENCY_IDS`) + `:83` (`KYRA_MAIN_AGENCY_ID`)
- Plus two API routes + `lib/crm/lead-sync.ts:42`. The UUID travels with an env-var fallback in server code (`process.env.MASTER_AGENCY_ID || '1511e077-…'`) but is pure literal in these client files.

---

## 5. Marketing / Landing / Brand

Only three files ever get imported:
- `components/brand/kyra-logo.tsx` → used by `app/(auth)/get-started`, `app/(auth)/solo`, `app/(auth)/build`, `app/(auth)/signup/agency/AgencySignupClient` (four importers).
- `components/analytics/MetaPixel.tsx` → `app/layout.tsx:3` (base), plus `pixel.*` helpers in `app/pricing`, `app/try/[industry]`, `app/(auth)/build`, `app/(auth)/signup/agency/AgencySignupClient`, `app/(dashboard)/agency/credits/credits-client`.
- `components/analytics/PixelEvent.tsx` → `app/ghl-marketplace`, `app/india`, `app/(auth)/build`.

Meanwhile `HeroChatWidget.tsx`, `activity-ticker.tsx`, `live-stats.tsx`, `lead-capture.tsx`, `testimonial-placeholder.tsx` are **all orphans** — `ripgrep -l` for each returns only the component file itself (or an analysis doc). `app/ghl-marketplace/page.tsx:6` even has an explicit comment: *"TestimonialPlaceholder removed — no real testimonials to show yet (brand rule: no fake social proof)."* The landing-page grew a whole component subdir that is no longer wired in.

---

## 6. Agency-Specific UI

`components/agency/` has three files, **all orphans at the app level**:

- `VoiceCommandButton.tsx` — 333 LOC. `app/(dashboard)/agency/layout.tsx:5` says `// VoiceCommandButton removed — not functional, just UI noise`. The component still lives in `components/agency/` but is never imported. Wires `MediaRecorder` → FormData → `POST /api/agency/voice-command` with webm/opus codec preference; also has a text-only fallback that POSTs `{ transcript }` as JSON.
- `gateway-status.tsx` — 123 LOC. Not imported by any `app/` page.
- `ghl-agency-connection.tsx` — 210 LOC. OAuth connect/disconnect card for `/api/agency/ghl/connect` and `/api/agency/ghl/disconnect`. Not imported by any `app/` page.

All three will live or die with their absent consumers — they may be ready for a settings surface that hasn't landed, but right now they are pure dead weight.

---

## 7. Admin (NEW) — `components/admin/webhook-health-card.tsx`

**212 LOC, single default export `WebhookHealthCard`.**

- **Endpoint:** polls `GET /api/admin/webhook-health` every **5 minutes** (`setInterval(fetchHealth, 5 * 60 * 1000)` at line 61). Hand-rolled polling — does NOT use `usePolling`.
- **Shape:** expects `{ healthy, endpoint: { id, url, status, enabledEvents[] }, recentEvents: { total, succeeded, failed, pending, oldestChecked, newestChecked }, alerts[], checkedAt }`.
- **Rendering:** header with `ShieldCheck`/`ShieldAlert` icon + "Healthy" / "Issues Detected" pill. Alerts list with `AlertTriangle` rows. 3-column grid: **Endpoint status** (CheckCircle2 / XCircle + uppercase `endpoint.status`), **Events 24 h** (total + `succeeded delivered · pending pending`), **Last Event** (age via local `timeAgo`). Footer lists registered events as tiny `bg-gray-100 font-mono` chips. A subtle "Checked {timeAgo}" stamp.
- **Refresh UX:** `<RefreshCw>` icon button in the header, spins while loading.
- **Surfaces in UI:** `app/admin/admin-client.tsx:10` imports it, renders at line 407 of that file. Shown only to master-admin users on `/admin` — not visible to regular agencies.
- **Note:** duplicates the `timeAgo` helper already present in 6 other components (see §13).

---

## 8. Specialized Feature UIs

- `components/pipelines/PipelineProgress.tsx` — 158 LOC. Step-by-step run UI with `pending/running/completed/failed/skipped` states and approval gates. **No importers** — full orphan.
- `components/notifications/NotificationCenter.tsx` — 249 LOC. Bell dropdown, uses `usePolling('notifications', 30 s)`. Only importer: `components/chat/ChatInterface.tsx:11`.
- `components/reminders/ReminderNotification.tsx` — 95 LOC. Bottom-right toast stack. Uses hand-rolled `setInterval(fetchDueReminders, 60000)` at `:35`. Only importer: `components/chat/ChatInterface.tsx:10`.
- `components/billing/PlanRedirect.tsx` — **10 LOC, no-op `return null`** with a docstring *"disabled during beta."*
- `components/widget/powered-by-badge.tsx` — 21 LOC. `<Link>` to `https://kyra.conversionsystem.com?ref=widget`.
- `components/ai/suggest-button.tsx` — 123 LOC. Reusable "AI suggest" dropdown.
- `components/analytics/MetaPixel.tsx:5` — **hardcoded `PIXEL_ID = '735277348604833'`** (literal, no env var). `components/analytics/PixelEvent.tsx` — 36 LOC declarative wrapper.
- `components/master/growth-chart.tsx` — 207 LOC SVG growth chart. **Does not** hardcode the master UUID (that lives in API routes + client-detail-view). Imported only by `app/master/master-dashboard.tsx:10`.
- `components/onboarding/guided-tour.tsx` — 268 LOC, 5-step tour overlay with highlight selectors. **Orphan.**
- `components/onboarding/launch-progress.tsx` — 170 LOC stage tracker with localStorage hydration. **Orphan.**

---

## 9. Root-Level

- **`components/seo-geo-command-center.tsx` — 1966 LOC.** The single largest client-side file in `components/`. Imported three places: `app/(dashboard)/agency/seo/seo-page-client.tsx:4`, `app/(dashboard)/agency/website/[siteId]/seo/page.tsx:4`, and `components/dashboard/client-tabs/seo-geo-tab.tsx:5` — all via `SeoGeoCommandCenterInner` default export. Contains its own `active[X]Tab` pill-bar reimplementation.
- **`components/open-control-ui-button.tsx` — 36 LOC.** Fetches `/api/openclaw/dashboard-url` and opens in a new tab. **Orphan** — no importer anywhere in `app/`.
- **`command-palette.tsx` + `command-palette-wrapper.tsx` — confirmed deleted.** Grep for `command-palette` returns only `.claude/worktrees/…` stale copies and the three analysis `.md` docs. No source file or import references it.

---

## 10. Hooks Layer — `hooks/use-polling.ts` only

Only one file in `hooks/`: `use-polling.ts` (173 LOC).

- Module-level `const cache = new Map<string, CacheEntry>()` at line 28 — singleton across all consumers sharing a `key`.
- Ref-counted: first subscriber starts `setInterval` at `:121-138`; last subscriber clears it and deletes the cache entry at `:146-150`. Re-entrancy guarded by `entry.fetching`.
- API: `{ key, fetcher, intervalMs, enabled }` → `{ data, loading, error, refetch }`.
- **Used by only 4 files** (grepped): `components/chat/ChatInterface.tsx`, `components/chat/CreditBadge.tsx`, `components/notifications/NotificationCenter.tsx`, plus the hook itself (also referenced by 2 analysis `.md` docs).
- **At least 11 other components hand-roll their own `useEffect + setInterval`** polling instead: `components/admin/webhook-health-card.tsx:61` (5 min), `components/chat/WakingUpIndicator.tsx:19` (500 ms), `components/agency/VoiceCommandButton.tsx:55` (1 s recording timer), `components/landing/activity-ticker.tsx:28` (4.5 s), `components/dashboard/client-tabs/dispatch-tab.tsx`, `components/dashboard/client-tabs/website-tab.tsx`, `components/dashboard/client-tabs/crm-tab.tsx`, `components/dashboard/solo-overview.tsx`, `components/dashboard/mission-control-live.tsx`, `components/dashboard/referral-nudge.tsx`, `components/reminders/ReminderNotification.tsx:35` (60 s).

No other hooks exist in `hooks/`.

---

## 11. State Management — Nothing Global

Grep for `createContext`, `useContext`, `zustand`, `@tanstack/react-query`, `redux` across `/components` and `/app` returns **zero matches** in source (only in analysis `.md` files). No Provider tree. No client-side cache.

All client state flows through four mechanisms:

1. **Server-rendered props** (e.g. `ChatInterface` gets `initialConversation` / `initialMessages` as a prop tree from the page).
2. **Local `useState`** inside the client component (90/100 components declare `'use client'`).
3. **`usePolling` module-level cache** keyed by string — shared by `chat`, `credits`, `conversations`, `notifications` keys.
4. **Custom `window` events** — `kyra:credit-update` is the only one. Dispatched from `components/dashboard/solo-overview.tsx:130`, `app/(dashboard)/agency/billing/billing-page-client.tsx:81`, `app/(dashboard)/agency/credits/credits-client.tsx:517`. Listened to by `components/chat/CreditBadge.tsx:29`. One emitter-listener pair outside that tree — no bus abstraction.
5. **`localStorage`** for dismissable banners: `components/dashboard/whats-new-banner.tsx`, `components/dashboard/trial-countdown-banner.tsx`, `components/dashboard/low-credit-banner.tsx`, `components/dashboard/referral-nudge.tsx`, `components/dashboard/onboarding-progress.tsx`, `components/dashboard/client-tabs/marketing-tab.tsx`, `components/onboarding/guided-tour.tsx`.

---

## 12. "use client" Density

- **100 `.tsx` files** in `components/`.
- **90 start with `'use client'`** (one blank-line grep match lands on the directive).
- The other ten are pure presentational components with no hooks / event handlers: `components/ui/card.tsx`, `components/ui/input.tsx`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/textarea.tsx` (5 primitives — `switch.tsx` is the only client primitive), plus `components/brand/kyra-logo.tsx`, `components/widget/powered-by-badge.tsx`, `components/marketing/testimonial-placeholder.tsx`, `components/layout/public-nav.tsx` (wait — this one also ends up client; see below), `components/layout/public-footer.tsx`.
- **Zero `'use server'` directives** in `components/` (grep returns nothing).

The ratio is overwhelmingly client-side. This is the logical consequence of having no global state: each component fetches/polls/reacts on its own.

---

## 13. Component Health

### Orphans (no importer outside the file)

Confirmed via `rg` of `from '@/components/…'` across `/app` and `/components`:

- `components/chat/WakingUpIndicator.tsx` (73 LOC) — never imported.
- `components/pipelines/PipelineProgress.tsx` (158 LOC) — never imported.
- `components/landing/*` (360 LOC total) — none imported by `/app`. The only import of a `lead-capture` symbol comes from `lib/chat/lead-capture.ts`, which is a different module.
- `components/marketing/testimonial-placeholder.tsx` (26 LOC) — explicitly excised by a comment at `app/ghl-marketplace/page.tsx:6`.
- `components/onboarding/guided-tour.tsx` (268 LOC) and `launch-progress.tsx` (170 LOC) — neither imported.
- `components/agency/*` (666 LOC total across 3 files) — `VoiceCommandButton` explicitly removed from `agency/layout.tsx:5`; the other two have no importer either.
- `components/open-control-ui-button.tsx` (36 LOC) — no importer.
- `components/billing/PlanRedirect.tsx` (10 LOC) — a stub kept to avoid breaking imports, but no imports exist.

Ballpark **~1900 LOC** of orphaned UI that still ships through the bundler if tree-shaking misses anything.

### Duplication

- **`timeAgo(dateStr)`** — 7 near-identical copies: `components/admin/webhook-health-card.tsx:29`, `components/notifications/NotificationCenter.tsx:47`, `components/dashboard/mission-control-live.tsx:63`, `components/dashboard/solo-overview.tsx:63`, `components/dashboard/web-chat-leads.tsx:124`, `components/dashboard/client-tabs/crm-tab.tsx:184`, `components/dashboard/client-tabs/payments-sub-tab.tsx:43`. The new `webhook-health-card` added yet another copy.
- **`CopyButton`** — 5 near-identical copies (sms-campaigns-sub-tab, marketing-tab, campaigns-sub-tab, funnels-sub-tab, reviews-sub-tab). One drop-in to `components/ui/` would erase them.
- **Channel color maps** — `components/dashboard/client-tabs/ai-workers-tab.tsx:30` has `CHANNEL_STYLES`; similar maps exist elsewhere in dashboard (grep shows only the `ai-workers-tab` one as a named export, but dispatch-tab / marketing-tab / crm-tab all inline the same color→channel mapping). Living as inline `const STYLES = { … }` literals makes this harder to count by grep but the pattern repeats.
- **Tab-pill-bars** — at least 10 reimplementations (§2).

### Monoliths (>600 LOC)

| File | LOC |
|---|---:|
| `components/dashboard/client-tabs/crm-tab.tsx` | **2920** |
| `components/seo-geo-command-center.tsx` | **1966** |
| `components/dashboard/client-tabs/email-marketing-tab.tsx` | **1382** |
| `components/dashboard/client-tabs/dispatch-tab.tsx` | **1275** |
| `components/dashboard/client-tabs/marketing-tab.tsx` | **1077** |
| `components/dashboard/client-tabs/ai-workers-tab.tsx` | **996** |
| `components/dashboard/client-tabs/website-tab.tsx` | **902** |
| `components/dashboard/client-tabs/workflows-tab.tsx` | **706** |
| `components/dashboard/solo-overview.tsx` | **652** |
| `components/dashboard/client-tabs/tasks-card.tsx` | **631** |
| `components/dashboard/client-tabs/training-sub-tab.tsx` | **607** |

Additional big ones: `it-operations-tab` 564, `voice-channel-card` 529, `retell-voice-tab` 529, `skills-tab` 519, `delivery-sms-tab` 523, `widget-builder-embedded` 495, `reviews-sub-tab` 490, `sms-campaigns-sub-tab` 488, `mission-control-live` 468, `secrets-tab` 455, `web-chat-leads` 416.

### Voice UI sprawl

Three large voice-related surfaces each reimplement similar status/connect/test rows:
- `components/dashboard/voice-channel-card.tsx` — 529 LOC.
- `components/dashboard/client-tabs/retell-voice-tab.tsx` — 529 LOC.
- `components/dashboard/client-tabs/voice-sub-tab.tsx` — 375 LOC.
- Plus chat-level `components/chat/VoiceButton.tsx` (71 LOC) and `components/agency/VoiceCommandButton.tsx` (333 LOC, orphan).

~1800 LOC of voice UI across 5 files with no shared subcomponents.

### Hardcoded identifiers

- Master-agency UUID `1511e077-77ef-4c47-81fd-06a3bc9f1dbb` — lives as a string literal in 4 `components/` files + 1 `app/` page + 2 API routes + 1 lib file. Only server-side code falls back to `process.env.MASTER_AGENCY_ID`; client components hardcode it.
- Meta Pixel ID `735277348604833` — `components/analytics/MetaPixel.tsx:5`, single literal (no env var).

### Compound takeaways

The UI layer is structurally healthy at the primitive level (CVA + Tailwind + forwardRef) but has three cracks that each compound at scale:

1. **No compound primitives** → 10+ tab-pill-bars, 5+ `CopyButton`s, 7 `timeAgo`s, inline dialog/select/sheet every time.
2. **No state library** → 11 hand-rolled `setInterval` pollings despite `usePolling` existing; `kyra:credit-update` as the only cross-component signal.
3. **Aggressive monoliths in `client-tabs/`** → four files over 1000 LOC, one (crm-tab) over 2900. These are where the duplicated helpers and pill-bars live, and why extracting primitives would pay back disproportionately.

Deleting or consolidating `components/landing/`, `components/agency/`, `components/onboarding/`, `components/pipelines/`, `components/chat/WakingUpIndicator.tsx`, and `components/open-control-ui-button.tsx` would remove ~1900 LOC of code with zero runtime consumers in `app/`.
