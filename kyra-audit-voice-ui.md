# Voice UI Audit — `fix/tabs-audit-round3`

Three files. Three voice-UI codepaths. But two of them are **orphaned** — not rendered anywhere. That single finding rewrites the consolidation plan: this isn't a "dedup three components" exercise, it's a "delete two and keep one" exercise. Details below.

---

## Part A — Per-file comparison

### 1. `components/dashboard/client-tabs/voice-sub-tab.tsx` (375 LOC)

- **Purpose.** A legacy, provider-agnostic voice call-log + personality config tab. Predates the Retell migration.
- **Data source.**
  - `GET /api/voice/call-logs?entityId=<clientId>&limit=50` — reads from `voice_call_logs` (Twilio-written table).
  - `POST /api/voice/outbound` with `{ clientId, test: true }` for the "Test Call" button.
  - The "Save Personality" button is a stub — `await new Promise(r => setTimeout(r, 500))` and never persists (line 351).
- **UI surface.** Stats row (total/today/avg/resolution%), pill-bar toggle between "Call History" and "AI Personality", call cards with expandable transcript/recording, personality form (tone select + 3 textareas).
- **Where rendered.** **Nowhere.** `grep -rn "VoiceSubTab\|voice-sub-tab" app/ components/` returns only its own definition and a `lib/format/time-ago.ts` comment. The parent `client-detail-view.tsx` imports `RetellVoiceTab`, not this. Dead code.

### 2. `components/dashboard/client-tabs/retell-voice-tab.tsx` (529 LOC)

- **Purpose.** The canonical, in-production voice tab. Retell-AI-only. Agent creation → phone provisioning → call log viewer → browser-mic test → outbound dialer.
- **Data source.**
  - `GET /api/voice/retell/calls?clientId=` — uses Retell SDK `listCalls({ agent_id })` directly.
  - `POST /api/voice/retell/agents` — creates Retell agent.
  - `POST /api/voice/retell/phone-numbers` — provisions a number.
  - `POST /api/voice/retell/calls` with `{ toNumber }` or `{ webCall: true }`.
  - Loads `client.container_config.voice_config` from props (no fetch for config).
  - Uses `retell-client-js-sdk` (`RetellWebClient`) client-side for browser mic calls.
- **UI surface.** Header with live badge + phone number. Tab nav (Overview / Setup-or-Phone-Number / Call Logs). Overview: stats + outbound dialer + web-call test + agent info card. Setup: 8 voice cards (11labs/OpenAI) + "Create Voice Agent" CTA. Phone: area-code input + "Buy Number". Call Logs: inline-expandable list with transcript/recording/sentiment.
- **Where rendered.** `app/(dashboard)/agency/clients/[id]/client-detail-view.tsx:57, 1534` — behind a `hasVoice` plan-gate.

### 3. `components/dashboard/voice-channel-card.tsx` (529 LOC)

- **Purpose.** A generalized multi-provider voice configurator. Supports `openclaw | vapi | synthflow | retell | ghl` via `VOICE_PROVIDERS` / `getVoiceProvider()` factories in `lib/voice/provider.ts`.
- **Data source.**
  - `GET /api/voice/assistants?clientId=` — reads `voice_config`.
  - `POST /api/voice/assistants` with `{ clientId, provider, apiKey, aiName, areaCode }` — the one-shot "Activate Voice AI & Get Phone Number".
  - `GET /api/conversations?clientId=&channel=voice&limit=10` — call-log source (different table!).
  - `POST /api/voice/outbound` with `{ clientId, toNumber, customerName, context }`.
- **UI surface.** Card with phone pill, copy button, outbound panel, "Call history" accordion, provider-chooser grid (5 providers) + API key input + AI name + area code + Activate button.
- **Where rendered.** **Nowhere.** `grep` returns only its own definition. Orphaned.

---

## Part B — Overlap matrix

| Concern | voice-sub-tab | retell-voice-tab | voice-channel-card | Similarity |
|---|---|---|---|---|
| Provider selection | — | — | Yes (5-card grid) | Unique to channel-card |
| API key input | — | — | Yes (password field) | Unique to channel-card |
| Phone number display | — | Header badge | Hero block w/ copy | **Different** shapes, same data |
| Phone number provisioning | — | Area-code + "Buy Number" | Bundled into "Activate" | **Different** flows |
| Assistant config (system prompt, voice, model) | Stubbed personality form | Voice-picker (8 prebuilt cards) | AI name + delegated to server | **All different** |
| Call log list | `CallCard` w/ expand, `timeAgo`, caller_number, recording_url | Inline rows w/ expand, transcript, `call_analysis.call_summary`, sentiment chip | Compact card w/ `metadata.callerNumber`, `durationSeconds`, ai_response | **Similar shape, different field names** |
| Outbound dialer | `test: true` only | Number + "Call" button | Number + name + context + "Start Call" | **Different** payloads |
| Call recording / transcript playback | Expandable + "Listen to recording" link | Expandable + `<pre>` transcript + recording link | One-line ai_response + "Recording" link | Similar link idiom, different rendering |
| Test call / browser mic | Stub POST `test: true` | Real `RetellWebClient.startCall()` | — | Only retell-voice-tab does it |
| Save/submit handler pattern | `setSaving → fetch → setSaving(false)` + `setMessage` | Same pattern, three copies (create/buy/call/web-call) | Same pattern, `syncError` + `syncSuccess` string state | **Structurally identical, three copies** |
| `formatDuration()` helper | L65 (seconds → `m:ss`) | L205 (ms pair → `Xm Ys`) | L186 (seconds → `Xm Ys`) | **Three copies, two signatures** |
| Stats strip (grid of 3–4 cards) | `StatCard` subcomponent | Inline `.map` over literal array | Inline `.map`, hardcoded "—" | Visually same, three implementations |
| Pill-bar / tab nav | `setActiveView<'calls'|'config'>` + pill buttons | `setSection<...>` + bottom-border tabs | Chevron accordion | Two out of three reimplement the pattern |

**Call-log data-shape mismatch is load-bearing.** voice-sub-tab reads `voice_call_logs` (Twilio shape: `metadata.caller_number`, `metadata.duration_seconds`, `metadata.recording_url`). voice-channel-card reads `/api/conversations?channel=voice` (shape: `metadata.callerNumber` camelCase, `metadata.durationSeconds`, `metadata.recordingUrl`). retell-voice-tab reads Retell SDK directly (shape: `from_number`, `start_timestamp`/`end_timestamp` in ms, `call_analysis.call_summary`, `transcript`). Any shared call-log component must take a normalized input — you cannot naively pass the raw fetch response.

---

## Part C — Consolidation plan (MVP, one commit)

### The dominant finding

`VoiceSubTab` and `VoiceChannelCard` are dead code. Together that's **904 LOC deleted** with zero behavior change — since zero routes render them. That is the MVP. Everything else is an order of magnitude smaller.

### Ranked candidates

**Candidate 1 — DELETE `voice-sub-tab.tsx` + `voice-channel-card.tsx` (orphans).** ~ 904 LOC removed.
- **Impact.** Huge — nearly 60% of the voice-UI surface gone.
- **Risk.** Near-zero. Grep confirms no imports. `voice-sub-tab` also had a stubbed-out save handler (line 351) and pointed at a write-only API route that's not read anywhere; the "Save Personality" button never persisted anything. `voice-channel-card` imports `Button`/`Card` from shadcn and uses a multi-provider factory that isn't reachable from the UI anymore. The `lib/voice/provider.ts` + `VOICE_PROVIDERS` + multi-provider adapters remain in use server-side (`/api/voice/outbound` calls `getVoiceProvider()`), so the factory must stay — delete only the orphaned React components.
- **Future feature benefit.** Removes the visual clutter that's been leading every recent audit ("three voice components with overlap") to the same dead end. Whatever multi-provider UI comes next, start fresh — don't revive a 529-LOC card that hasn't been wired up.
- **Verification before deletion.** Run `grep -rn "VoiceSubTab\|VoiceChannelCard\|voice-sub-tab\|voice-channel-card" app/ components/ lib/ --include='*.ts' --include='*.tsx'` and confirm only self-references plus the lib/format/time-ago.ts comment remain. That's the commit's test plan.

**Candidate 2 — Extract `<VoiceCallRow>` from `retell-voice-tab.tsx`.** ~ 60 LOC moved to a shared component.
- Referenced as a follow-up in `kyra-audit-ai-core.md` line 48, which cites the same duplication. After candidate 1 lands, the only remaining consumer is `retell-voice-tab` itself plus the agency inbox's Voice Calls sub-view.
- **Defer.** Pointless in one commit — candidate 1 collapses the problem, and row extraction has a real risk of breaking the already-working retell UI. Do this next PR.

**Candidate 3 — Extract `lib/format/formatDuration.ts`.** ~ 20 LOC, trivial.
- Two signatures (`seconds` vs `startMs/endMs`) across three files means two functions. Not worth one commit on its own. Fold into candidate 2's PR.

**Candidate 4 — Extract `useCallLogs(clientId, source)` hook.** Not recommended.
- The three sources return genuinely different shapes and one is a client-side SDK call that needs `agent_id`, not `clientId`. Normalizing them is a 1-day refactor, exactly what the prompt says is out-of-scope.

### The one-commit plan

```
rm components/dashboard/client-tabs/voice-sub-tab.tsx
rm components/dashboard/voice-channel-card.tsx
# Update lib/format/time-ago.ts doc comment that references voice-sub-tab.
```

Then verify:
- `grep` for import references (should return nothing)
- `npm run build` or `tsc --noEmit`
- Load `/agency/clients/[id]` with `?settingsTab=voice` — confirm `RetellVoiceTab` still renders identically

That's it. No new abstractions, no shared components, no risk of behavior drift. ~900 LOC removed.

### What to leave alone this commit

- `lib/voice/provider.ts` — still used server-side by `/api/voice/outbound`.
- `lib/voice/types.ts` — still used by all provider adapters and `/api/voice/assistants`.
- `/api/voice/assistants` route — unused by UI but may be referenced by GHL sync or webhooks; grep before deciding. The goal here is UI dedup, not server cleanup.

---

## Part D — Bugs found while reading

### Critical

**D1. `/api/voice/outbound` missing tenant-ownership check.** `app/api/voice/outbound/route.ts:10–46` authenticates the user via `supabase.auth.getUser()` but never verifies that `user` has access to the supplied `clientId`. Any logged-in Kyra user can POST `{ clientId: <someone-else's-client>, toNumber: <any number> }` and initiate a voice call on that tenant's dime, consuming their credits, and the call would be logged under their client. The retell equivalents (`/api/voice/retell/calls`) use `requireAgencyMember()` — this one does not. Fix: add `requireAgencyMember()` and cross-check the client belongs to that agency, same as the retell routes do.

**D2. `VoiceSubTab` "Save Personality" is a stub.** `components/dashboard/client-tabs/voice-sub-tab.tsx:348–352` — the submit handler is `await new Promise(r => setTimeout(r, 500))` with a `// future: persist to agency_clients.voice_config` comment. Users filling in tone/greeting/objection/script see a loading spinner, a success state, and **zero data is persisted**. Because this component is orphaned, no users actually hit this bug right now, but if anyone re-enables the tab it immediately ships a silent data-loss UX. Deleting the file (candidate 1) removes the bug.

### High

**D3. `retell-voice-tab` page-reload after create-agent / buy-number.** Lines 115–120 and 141–146 do `window.location.href = url.toString()` after success. This is a full reload on a client-heavy dashboard to essentially refresh the `client.container_config` prop. Cheap to fix with a router refresh + local state update; current implementation drops any unrelated in-memory UI state (other tabs, scroll positions, unsaved inputs elsewhere).

**D4. `retell-voice-tab` swallows errors silently with only `console.error`.** `loadCalls` catch (line 86), Retell WebClient error handler (line 99). User sees an empty list or a stuck "Call error" status with no way to retry meaningfully. Add a visible error state and retry button.

### Medium

**D5. `voice-channel-card` hardcoded `areaCode = '415'`.** Line 82 initial state and line 131 fallback. Any non-Bay-Area user who forgets to override gets a SF number. Use the client's own address/phone area code as default if available, else leave blank.

**D6. `voice-channel-card` `handleSync` writes local state from `data.assistantId`/`data.phoneNumber` but never re-fetches from the server.** Lines 135–143. If the server returns partial data (e.g. `phoneNumber` not yet assigned because provisioning is async), the UI thinks it's configured and `isConfigured` flips to `true`. Fix: refetch `/api/voice/assistants` after sync, don't trust the POST response's happy-path shape.

**D7. `voice-channel-card` provider `openclaw` check uses magic string.** `selectedProvider === 'openclaw'` in 3 places (117, 453). The user-facing name is "Kyra Native" — the code still uses the old "openclaw" identifier from pre-rebrand. Bug risk: if anyone grep-replaces "openclaw", these branches silently break. Use a `KYRA_NATIVE = 'openclaw' as const` constant in `lib/voice/types.ts`.

**D8. `retell-voice-tab` voice list is hardcoded.** Lines 42–51. Only 8 voices, no way to add more without a code change. Retell exposes a `list-voices` API — fetch dynamically with a fallback to this list for offline/rate-limited cases.

### Low

**D9. `voice-sub-tab` `timeAgo` + `formatDuration` duplicates.** Already flagged in `kyra-audit-13-tabs.md` and `kyra-audit-ai-core.md`. Deleting the file resolves it.

**D10. `voice-channel-card` uses emoji literals as provider logos.** `🦞 ⚡ 🎙️ 🔄 ⚡`. Both `openclaw` and `ghl` use `⚡` — visually indistinguishable. Pick distinct glyphs or use icon imports.

**D11. `voice-sub-tab` `stats` is an IIFE inside render.** Lines 172–187, recomputed on every render. Tiny perf hit; move to `useMemo(..., [calls])`. (Also moot if the file is deleted.)

**D12. `retell-voice-tab` `RetellWebClient` instantiated in `useState(() => new RetellWebClient())` without cleanup.** Line 74. If the component unmounts mid-call, there's no `.stopCall()` in a cleanup effect. Add one in the event-listener `useEffect`'s return.

---

## Summary

- **3 files audited, 1,433 total LOC.**
- **2 files are orphaned dead code** (`voice-sub-tab.tsx` 375 LOC, `voice-channel-card.tsx` 529 LOC). Grep-verified: zero imports in `app/` or `components/`.
- **The MVP single-commit consolidation is deletion**, not extraction. Candidate 1 removes ~904 LOC with no behavior change.
- **The production voice UI (`retell-voice-tab.tsx`) has 1 critical adjacent server-side bug (D1: missing tenant check on `/api/voice/outbound`) and several medium issues** — these are independent of the consolidation work and should be separate PRs.
- **Candidate 2 (`<VoiceCallRow>`) and 3 (`formatDuration` util) are good follow-ups** to pair with fixing the existing inbox duplication already flagged in `kyra-audit-ai-core.md`, but **defer them out of this commit** — they only make sense once the orphans are gone.

File paths:
- `/Users/steve/projects/kyra/components/dashboard/client-tabs/voice-sub-tab.tsx` (delete)
- `/Users/steve/projects/kyra/components/dashboard/voice-channel-card.tsx` (delete)
- `/Users/steve/projects/kyra/components/dashboard/client-tabs/retell-voice-tab.tsx` (keep; production)
- `/Users/steve/projects/kyra/app/(dashboard)/agency/clients/[id]/client-detail-view.tsx:57,1534` (sole consumer)
- `/Users/steve/projects/kyra/app/api/voice/outbound/route.ts:10-46` (D1 critical fix site)
- `/Users/steve/projects/kyra/lib/voice/provider.ts` (keep — server-side factory still in use)
- `/Users/steve/projects/kyra/lib/format/time-ago.ts:4` (stale comment references voice-sub-tab)
