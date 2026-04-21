## Terminal Tab

**What it does.** A thin launcher tab inside `/agency/clients/[id]`. If the OpenClaw gateway is not running it shows a one-click "Activate Terminal" CTA that re-provisions the container; otherwise it offers a card linking out to the full-screen terminal page at `/terminal/[id]`.

**API endpoints called.**
- `POST /api/agency/clients/[id]/reprovision` — activate / redeploy gateway. Exists at `app/api/agency/clients/[id]/reprovision/route.ts`. Confirmed.
- No other fetches — the actual chat runs on the `/terminal/[id]` page, which the user opens in a new tab via a plain `<a href>`.

**Happy path trace.** User clicks the "AI Setup → Terminal" sidebar entry. `ClientDetailView` renders `TerminalTab` at `client-detail-view.tsx:514-516`. If `client.gateway_status === 'running'` the dark hero card is shown; clicking "Open Terminal" spawns a new tab. If the gateway is down, `handleActivate` POSTs to `/reprovision`, waits 2 s then calls `router.refresh()`, waits 4 s then hard-reloads the page (`client-detail-view.tsx:661-677`).

### Bugs

- **CRITICAL:** Dark-theme hero panel violates BRANDING.md's "Never `bg-gray-900` or `bg-gray-800` on page content" rule. File: `app/(dashboard)/agency/clients/[id]/client-detail-view.tsx:709`. Fix: replace `bg-gradient-to-br from-gray-900 to-gray-800 … text-white` and the nested `bg-white/10`, `text-gray-300` with a light Card: `<Card><CardContent>` + `text-gray-700` helper, and an indigo primary `<Button>` that links to the terminal page (same URL). This is the hero users see whenever the gateway is up.
- **HIGH:** Hard `window.location.reload()` after `router.refresh()` at `client-detail-view.tsx:668`. A 4-second `setTimeout` that blows away React state is a lazy fix — if the status probe inside `router.refresh()` works, the reload is redundant; if it doesn't, the reload is hiding a real bug. Fix: poll `/api/agency/clients/[id]` for `gateway_status==='running'` with a 30 s cap, then `router.refresh()` once.
- **MEDIUM:** The Activate button at `client-detail-view.tsx:688-698` is a raw `<button>` with hand-rolled `bg-indigo-600 … rounded-xl` styling. Should use shadcn `<Button>` for consistency with the rest of the dashboard (BRANDING.md: "Use `<Button>` component — variant='default' is `bg-indigo-600 text-white`"). Fix: replace with `<Button onClick={handleActivate} disabled={activating} size="lg">`.
- **MEDIUM:** Open-Terminal link at `client-detail-view.tsx:721-729` is another raw `<a>` with custom indigo-500 hover — non-shadcn button styling. Same fix: wrap in `<Button asChild>` + `<a>`, or use `buttonVariants()`.
- **LOW:** `text-white` / `text-gray-300` on page content at lines 713, 716 — BRANDING.md explicitly forbids `text-white` outside buttons/badges/tooltips. Resolved by the CRITICAL fix above.
- **LOW:** No `try/catch` wrapping `router.refresh()` but that's fine; however `setActivating(false)` in the `finally` block fires 30 ms after the POST resolves while the two `setTimeout`s are still pending, so the button can re-enable before the reload. Fix: keep `activating` truthy until the reload fires, or drop the deferred reload entirely.

**Overlaps.** No direct agency-level duplicate. The full chat UI lives at `/terminal/[id]` (separate route, linked out of this tab), which is the correct split — one place renders the terminal, the tab is just a gate. No duplicate code to remove.

---

## Inbox Tab (ConversationsTab)

**What it does.** Two-pane Inbox (thread list left, message thread + reply composer right) showing GHL conversations (SMS/Email/WhatsApp/Web Chat) and a toggle to the Voice Calls view. Polls threads every 15 s and per-thread messages every 10 s, with a human-reply composer that writes back through GHL.

**API endpoints called.**
- `GET /api/voice/call-logs?entityId=…&limit=50` — voice calls. Exists at `app/api/voice/call-logs/route.ts`. Confirmed.
- `GET /api/agency/clients/[id]/threads?limit=30&q=…` — threads list. Exists at `app/api/agency/clients/[id]/threads/route.ts`. Confirmed.
- `GET /api/agency/clients/[id]/messages?source=webchat&contactId=…` or `?limit=100` — messages for one thread. Exists at `app/api/agency/clients/[id]/messages/route.ts`.
- `POST /api/agency/clients/[id]/reply` — send human reply via GHL. Exists at `app/api/agency/clients/[id]/reply/route.ts`. Confirmed.

**Happy path trace.** Tab mounts → `loadThreads()` fires immediately and every 15 s. User clicks a thread → `setSelectedContact(thread)` → `loadThreadMessages` fetches and starts 10 s polling. User types and presses Enter → `handleSendReply()` POSTs to `/reply`, clears the composer, re-fetches messages + threads.

### Bugs

- **HIGH:** Silent `.catch(err => console.error(...))` on all three GETs (`client-detail-view.tsx:1720, 1734, 1760`). `console.error` is not surfaced to the user — on a network failure the user sees a spinner-stuck empty pane with zero feedback. Fix: set an inline error state and render a small "Couldn't load — retry" banner.
- **HIGH:** Reimplemented `formatTime()` helper at `client-detail-view.tsx:1817-1827`. The codebase already has three other time-ago implementations (`payments-sub-tab.tsx:43`, `crm-tab.tsx:184`, `voice-sub-tab.tsx:71`). Fix: extract one `lib/format/timeAgo.ts` and replace all four call sites in a single pass.
- **HIGH:** Reimplemented `ChannelFilterBar` pill-bar (`client-detail-view.tsx:2157-2181`) with the same `bg-indigo-600 text-white` / `bg-gray-100 text-gray-600` pattern used by the AI Setup sub-tabs (`ai-setup-tab.tsx:44-49`), the Train sub-tabs (`train-tab.tsx:30-48`), the AI Workers/Skills toggle (`ai-workers-tab.tsx:300-315`), and the Skills built-in/marketplace toggle (`skills-tab.tsx:227-250`). Five copies of the same component. Fix: create `components/ui/tab-pill-bar.tsx` and collapse all five.
- **MEDIUM:** Two polling intervals (15 s threads + 10 s messages per open thread) run forever while the user sits on the tab — no pause when the window is hidden, no back-off on failure. Fix: gate both on `document.visibilityState === 'visible'` and skip the next tick on consecutive failures.
- **MEDIUM:** Reply mutation at line 1779 does a `.json()` without checking `res.ok` first (`const data = await res.json(); if (!res.ok) throw ...`) — a 5xx with a non-JSON body (nginx HTML, Cloudflare) will throw "Unexpected token" before the "Failed to send" branch runs. Fix: `res.json().catch(() => ({}))` before the ok check, matching the pattern used elsewhere in this same file (line 670).
- **MEDIUM:** `getInitials()` helper at line 1829 duplicates the initials logic in `ai-suggestions-card` and `crm-tab`. Fix: extract to `lib/format/initials.ts`.
- **LOW:** Textarea `onKeyDown` sends on bare Enter — breaks IME composition for CJK users (Enter fires during composition). Fix: check `e.nativeEvent.isComposing` before sending.
- **LOW:** `channelBadge` map is re-created every render (line 1807). Move outside the component.
- **LOW:** `any`-typed `err: any` at line 1800 — project uses TS strict elsewhere. Fix: `err instanceof Error ? err.message : 'Failed to send reply'`, matching the pattern at line 805.

**Overlaps.** No agency-level inbox exists — there is no `/agency/inbox` route; this is the sole inbox surface, so the functionality is legitimate. However, the Voice Calls sub-view duplicates rendering logic that already lives in `components/dashboard/client-tabs/voice-sub-tab.tsx` (transcript expand/collapse, recording link, caller-number badge). Fix: extract a shared `<VoiceCallRow>` component and reuse it in both places.

---

## AI Setup Tab

**What it does.** A sub-tab container that routes between "Train AI" (Identity/Training/Behavior sub-tabs), "AI Workers" (the worker + team builder + skills marketplace), and a master-agency-only "Booking" config. Everything modifies `agency_clients.container_config` through one PATCH endpoint and pushes a rebuilt SOUL.md to the OpenClaw container.

**API endpoints called.**
- `PATCH /api/agency/clients/[id]` — identity/training/behavior saves. Confirmed at `app/api/agency/clients/[id]/route.ts:156`.
- `PATCH /api/agency/clients/[id]/knowledge` — knowledge sources persistence. Exists.
- `PATCH /api/agency/clients/[id]/skills` — toggle built-in skills. Exists at `app/api/agency/clients/[id]/skills/route.ts`. Confirmed.
- `POST /api/agency/knowledge/auto-train` — scrape-and-train from URL.
- `POST /api/agency/ai-setup/apply` — apply a role worker.
- `GET` / `POST /api/agency/ai-setup/team` — fetch/save team config.
- `GET /api/templates` — industry templates.
- `GET /api/clawhub?q=…&limit=30`, `POST /api/clawhub/install`, `DELETE /api/clawhub/install?…` — ClawHub marketplace.
- `GET` / `PATCH /api/agency/clients/[id]/booking-config` — master-only booking.

**Happy path trace.** User lands on "AI Setup" → sub-tab "Train AI" → sub-sub-tab "Identity" (default). Types a persona → clicks Save Identity → PATCH fires to `/api/agency/clients/[id]` with `{container_config: {...cfg, persona, greeting, response_language}}`. Server merges into existing container_config (never replaces — line 197), fire-and-forgets a SOUL.md rebuild + `updateClientConfig` push to the VPS (line 253), and returns the updated row. No `router.refresh()` client-side — page state is stale after save.

### Bugs

- **CRITICAL:** Hardcoded master-agency UUID `1511e077-77ef-4c47-81fd-06a3bc9f1dbb` in **three** tab files: `ai-setup-tab.tsx:12`, `ai-workers-tab.tsx:77` and `ai-workers-tab.tsx:83`. This same UUID is also duplicated in `client-detail-view.tsx:354, 359, 366` (five copies total in this audit scope). Fix: single `lib/constants/agencies.ts` export `MASTER_AGENCY_ID` and import everywhere; deleting the raw-UUID copies also neuters the copy-paste pattern.
- **CRITICAL:** Server-side bypass of the Marketing-worker plan gate. Client-side at `ai-workers-tab.tsx:82-84, 670` the Marketing worker is locked unless `agencyId === KYRA_MAIN_AGENCY_ID`. The server's `/api/agency/ai-setup/apply` endpoint does **not** enforce this — a non-master agency admin can POST any `templateId` including a marketing worker and it will be applied. Fix: in `app/api/agency/ai-setup/apply/route.ts`, after resolving the worker, check `ROLE_WORKERS.find(w => w.id === templateId).tags` against the marketing-tag set and reject if the caller's `agency.id !== MASTER_AGENCY_ID`.
- **HIGH:** Three `void (async () => ...)` / `void updateContainerTier(...).then(...)` fire-and-forgets in the PATCH handler (`app/api/agency/clients/[id]/route.ts:233, 253`). If either fails (container tier update or SOUL.md push) the user sees "Identity saved" but the AI worker still runs the old prompt. Fix: await both, catch errors, and either (a) block the response and surface the failure, or (b) enqueue a durable job rather than a dangling promise.
- **HIGH:** No `router.refresh()` after any of the four save calls in Identity/Training/Behavior/Workers sub-tabs. After save, `client` prop is stale until the user navigates away and back — the banners "editing identity may override the worker template" in `identity-sub-tab.tsx:87-92` and the active-worker badge in `ai-workers-tab.tsx:330` won't update. Fix: each `handleSave` should call `router.refresh()` on success (pattern already in `client-detail-view.tsx:545, 551`).
- **HIGH:** Fire-and-forget load in `ai-workers-tab.tsx:131-136`: `fetch(…/team).then(...).catch(() => {});` silently swallows all errors including 403 plan-limit denials. If the plan query fails, `planLimit` stays `null` and the team-mode toggle is always shown — defeating the plan gate at lines 442-453. Fix: set an error state and hide the Team-Mode toggle if planLimit is unknown.
- **HIGH:** Four endpoints in `skills-tab.tsx` use silent catches: `fetchClawHub` catch at line 102 drops the error (user sees empty marketplace with no hint), `installSkill` catch at 176 reads nothing useful, `uninstallSkill` catch at 193 also does. Fix: single `setError` per branch.
- **MEDIUM:** `industryTemplates` returned by `GET /api/templates` at `ai-workers-tab.tsx:284-294` has no `try/catch`+error-state pairing — a silent `catch { /* ignore */ }` means the user sees an empty "No industry workers available yet" message whether the server is down or there genuinely are none. Fix: distinguish "load failed" from "empty result".
- **MEDIUM:** Non-shadcn button styling throughout `ai-workers-tab.tsx` — hand-rolled `className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors ..."` on the sub-nav (lines 301-314), team-mode toggle (352-368), handoff-style tiles (595-609), Cancel/Deploy buttons (615-623), and every Add/Remove affordance. Violates BRANDING.md "Use `<Button>` component." Fix: replace with `<Button variant="outline" size="sm">` and `<Button variant="default">`.
- **MEDIUM:** Reimplemented sub-tab pill bar in four files under `client-tabs/` — same `bg-white text-gray-900 shadcn shadow-sm` / `text-gray-500` pattern in `train-tab.tsx:30-48`, `ai-workers-tab.tsx:300-315` (Workers/Skills), `skills-tab.tsx:227-250` (Built-in/Marketplace), `ai-setup-tab.tsx:39-54`. Same fix as Inbox: extract `<TabPillBar items={...} value={...} onChange={...} />`.
- **MEDIUM:** `identity-sub-tab.tsx:97` uses `bg-green-50 border border-green-200 text-green-700` for success messages, but `behavior-sub-tab.tsx:74` and `training-sub-tab.tsx:246` use the exact same five-class string. BRANDING.md defines this as the Success alert pattern — fine — but it's copy-pasted three times. Fix: `<AlertBanner type="success" />` helper.
- **MEDIUM:** `training-sub-tab.tsx:148` uses `void persistSources(...)` in the file-upload handler — a fire-and-forget mutation. If the PATCH fails the optimistic UI still shows the file, then the user refreshes and it's gone with no notification. Fix: `await` and gate UI update on success (which is what `deleteSource` does correctly at line 172).
- **MEDIUM:** `booking-config-tab.tsx:74-94` — `handleSave` discards errors into `console.error` and sets `saved=true` only inside the `if (res.ok)` branch without surfacing failures (no error state rendered). User sees no feedback when the save fails. Fix: add an error banner identical to the Identity/Behavior pattern.
- **LOW:** `identity-sub-tab.tsx:88-92`, `ai-workers-tab.tsx:319-348` — repeated "active worker / team" banner patterns. Minor deduplication opportunity.
- **LOW:** `ai-setup-tab.tsx:33` filters the "Booking" sub-tab to `isMaster` only, but the `/api/agency/clients/[id]/booking-config` endpoint needs independent verification that non-master agencies can't call it. (Not read; flag for follow-up.)
- **LOW:** Several components do `client.container_config as Record<string, unknown>` casts on every render (identity line 36, training line 57, behavior line 19, workers line 112). Cast once in a `useMemo` or type the prop properly.

**Overlaps.** The tab is correctly scoped — `app/(dashboard)/agency/ai-setup/page.tsx` is a `redirect('/agency/clients')` stub, so there is no duplicate agency-level AI-setup surface. `AgentsClient` at `app/(dashboard)/agency/agents/agents-client.tsx` models a related but distinct concept (per-agency routing agents) and accepts a `clientId` prop for embedding — not a duplicate. The one real duplication is inside the tab itself: `SkillsTab` is both a standalone tab element AND swapped into `AIWorkersTab` via the `view === 'skills'` branch (`ai-workers-tab.tsx:297-306`) — two different entry points, same component. Legitimate reuse, no change needed. The bigger win is extracting the shared `TabPillBar`, `MASTER_AGENCY_ID` constant, and `timeAgo`/`CopyButton`/initials utilities that repeat across this directory.
