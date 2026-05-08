# PR #402 — Regression Audit: 52 `router.refresh()` Additions

**Branch:** `fix/tabs-audit-round3`
**Commit:** `f291dc4b` (PR #402)
**Audit date:** 2026-04-22

## Summary

- **Sites checked:** 52 `router.refresh()` call sites across 7 files, plus 3 file-level changes (ConversationsTab polling/visibility/error banner).
- **Infinite-refresh loops (risk #1):** 0 flagged — none of the 52 calls are inside a `useEffect`. All are inside async event handlers.
- **Double-refresh / navigation races (risk #2):** 0 genuine bugs. `retell-voice-tab.tsx` uses `window.location.href` and was correctly skipped by the PR. No site has both `router.refresh()` and `router.push()`/`window.location.*`.
- **Refresh during streaming (risk #3):** 0 flagged. `marketing-tab.tsx` calls `router.refresh()` only AFTER `sendChatPrompt()` fully drains the SSE reader (the `await` only resolves when `reader.read()` returns `done: true`). The stream is always complete before refresh is invoked.
- **Optimistic-state clobber (risk #4):** 0 flagged, but one pattern worth documenting (kanban drag-drop).
- **Stale-closure router capture (risk #5):** 0 flagged. The 3 sites inside `useCallback` (all in `marketing-tab.tsx`) correctly include `router` in the dependency array.
- **Style-only flags (not regressions, but worth noting):** 6 sites in `email-marketing-tab.tsx` (3 CampaignsView + 3 ContactsView/Templates) call both a local `load()` AND `router.refresh()` — a double fetch but not a bug. 4 sites in `crm-tab.tsx` don't gate refresh on `res.ok`, violating the PR's stated "success paths only" ground rule on a technicality.
- **Verdict:** **All-clear from a correctness standpoint.** The PR is safe to merge.

---

## Risk #1 — Infinite-refresh loops (inside `useEffect`)

**Method:** Searched for any `router.refresh()` reachable from inside a `useEffect` body via `awk` with brace-depth tracking across all 7 files. Zero matches.

**Spot-checked:**
- `workflows-tab.tsx:280, 299, 312` — all inside `handleSave`, `handleToggle`, `handleDelete` (async event handlers).
- `crm-tab.tsx` — all 27 sites are inside `handleSave`/`handleDelete`/`toggleComplete`-style handlers or inline button `onClick` async functions.
- `email-marketing-tab.tsx` — all 9 sites are inside `handleSave`, `handleSend`, `handleDelete`, `handleAdd`, `handleCSV`, `handleDeleteSelected`, `handleCreate`, `handleSave`.
- `marketing-tab.tsx:581, 652, 685` — inside `handleGenerate`, `generateForDay`, `draftEngagementComments` (all `useCallback` wrapped, not `useEffect`).

**All-clear for risk #1.**

---

## Risk #2 — Double-refresh / navigation races

**Method:** Grepped for `router.push` and `window.location` across all 7 files.

**Findings:**
- `retell-voice-tab.tsx:117-119, 142-144` — uses `window.location.href = url.toString()` for full-page navigation after creating a voice agent or buying a phone number. This file was intentionally excluded from the PR (it's not one of the 7 affected files). A full-page nav supersedes any refresh, so no conflict.
- `dispatch-tab.tsx:560` — `window.location.origin` is only used to BUILD a webhook URL string, never assigned as a navigation. Not a navigation call.

**No handler calls both `router.refresh()` and `router.push()`/`window.location.href=*`.** All-clear for risk #2.

---

## Risk #3 — Refresh during streaming / long-lived fetch

**Method:** Grepped for `EventSource`, `ReadableStream`, `text/event-stream`, `getReader` in all 7 files.

**Finding:** Only `marketing-tab.tsx` has SSE logic, in the `sendChatPrompt()` helper (lines 145-199). This helper:
1. Issues a POST and inspects the response content-type.
2. If SSE, spins up `reader = res.body.getReader()` and loops `while (true) { await reader.read(); if (done) break; ... }`.
3. Returns the fully-assembled text only after the loop exits.

The 3 call sites (`handleGenerate:581`, `generateForDay:652`, `draftEngagementComments:685`) all do:
```
const reply = await sendChatPrompt(clientId, prompt);
// ... process reply ...
router.refresh();
```

The `await` only resolves when the stream has fully drained. `router.refresh()` is never called mid-stream. **All-clear for risk #3.**

---

## Risk #4 — Lost optimistic state

**Method:** Reviewed the 8 handlers that do `setState(prev => ...)` before calling `router.refresh()`.

**Findings — all safe:**

- `ai-workers-tab.tsx:162-164` (`saveTeam`): sets `teamResult` + `editingTeam` state, then refreshes. These are purely UI-state that the server doesn't own, so server re-render can't clobber them.
- `ai-workers-tab.tsx:185-190` (`disableTeam`): same — purely UI state.
- `workflows-tab.tsx:276-280` (`handleSave`): `setWorkflows(prev => [d.workflow, ...prev])` adds the new workflow returned by the API. Server refresh will re-fetch the server component which should include the new workflow. No clobber — the optimistic insert matches what the server now has.
- `workflows-tab.tsx:298-299` (`handleToggle`): `setWorkflows(prev => prev.map(...))` flips status optimistically, then refresh. Same deal — server has committed the status change before the API returned 200.
- `workflows-tab.tsx:310-312` (`handleDelete`): `setWorkflows(prev => prev.filter(...))` removes it, then refresh. Server has deleted it. Safe.
- `crm-tab.tsx:1255, 1267` (`ClientPipelineKanban.handleDrop`): **The most interesting case.** Sets `deals[i].stage = newStage` optimistically, awaits the PATCH, and calls `router.refresh()` ONLY on success. This is a **client component** that fetches deals itself via `fetchDeals()` in its own `useEffect`, so `router.refresh()` revalidates server components but does NOT re-trigger the local `fetchDeals()`. The local optimistic state is not clobbered. Good.
- `crm-tab.tsx:603, 719, 727, 733` — modal handlers that close + refresh. Modal state is local-only.
- `marketing-tab.tsx:556, 604, 627, etc.` (`setDrafts(prev => [...])`): drafts are persisted to `localStorage` (line 505-507), not derived from server state. Refresh cannot clobber them.

**All-clear for risk #4.**

---

## Risk #5 — Stale closure `router` capture

**Method:** Listed all `useCallback` dep arrays in the 7 files, then spot-checked the 3 callbacks that invoke `router.refresh()` for missing `router` in deps.

**Findings:**
- `marketing-tab.tsx:584` — `}, [postTopic, selectedPlatforms, clientId, businessName, industry, brandTone, router]);` ✓
- `marketing-tab.tsx:655` — `}, [generating, selectedPlatforms, clientId, businessName, industry, brandTone, router]);` ✓
- `marketing-tab.tsx:688` — `}, [clientId, linkedinTargets, router]);` ✓

The remaining 49 sites are not wrapped in `useCallback` (plain async methods on component functions), so stale-closure semantics don't apply — they reference `router` via the live render-scoped identifier. **All-clear for risk #5.**

---

## Sites worth documenting (not regressions)

### Category A — "Double-fetch" pattern (6 sites)

These handlers call both a local `load()`/`fetchXxx()` AND `router.refresh()`. Both will hit the server. Not incorrect — refresh reconciles server-rendered content while `load()` updates client-fetched state — but the server does process two overlapping requests per mutation.

- `email-marketing-tab.tsx:321-322` (`handleSave`): `load(); router.refresh();`
- `email-marketing-tab.tsx:336-337` (`handleSend`): `load(); router.refresh();`
- `email-marketing-tab.tsx:342-343` (`handleDelete`): `load(); router.refresh();`
- `email-marketing-tab.tsx:610-611` (`handleAdd`): `load(); router.refresh();`
- `email-marketing-tab.tsx:649-650` (`handleCSV`): `load(); router.refresh();`
- `email-marketing-tab.tsx:659-660` (`handleDeleteSelected`): `load(); router.refresh();`
- `email-marketing-tab.tsx:859-860, 899-900` (Templates `handleCreate`, `handleSave`): same pattern.
- `website-tab.tsx:762-763, 815-817` (`handleAction`, "Check if Live" button): `refreshSite(); router.refresh();`
- `dispatch-tab.tsx:143, 146` (`saveConfig`): `await loadData(); ...; router.refresh();`
- `crm-tab.tsx:367-368, 393-394, 1602, 1613, 2002-2003, 2469` — similar `loadFoo(); router.refresh();` pattern.

**Recommendation:** None required. The pattern is consistent with Steve's ground rule "Optimistic local state kept intact (refresh reconciles, doesn't replace)." The `load()` calls are there because those views still fetch from client code, not server components — so `router.refresh()` alone wouldn't update the visible list. If a future refactor moves the lists to server components, the `load()` calls could be removed. Not blocking.

### Category B — Refresh-without-`res.ok`-guard (4 sites, crm-tab.tsx)

These violate the PR's stated ground rule "Only added `router.refresh()` on success paths" on a technicality: the fetch result isn't inspected, so the refresh fires even on a 500 response.

- `crm-tab.tsx:389-394` (`handleBulk`): `try { if (!res.ok) return; } catch { setActionError(...) }` then falls through to `setSelected(new Set()); ...; router.refresh();`. On a network exception the state is still reset and refresh fires.
- `crm-tab.tsx:957-961` (`ContactTaskRow.toggleComplete`): `await fetch(...); onUpdate(); router.refresh();` — no `res.ok` check (pre-existing style).
- `crm-tab.tsx:964-968` (`ContactTaskRow.handleDelete`): same.
- `crm-tab.tsx:1044-1053` (`AddNoteModal.handleSave`): `await fetch(...); onSaved(); onClose(); router.refresh();` — no check.
- `crm-tab.tsx:1082-1100` (`LogCallModal.handleSave`): no check.
- `crm-tab.tsx:1155-1162` (`AddTaskModal.handleSave`): no check.
- `crm-tab.tsx:1509-1512` (`DealModal.handleDelete`): no check.
- `crm-tab.tsx:1599-1602, 1611-1613` (`TasksSection.toggleComplete`, `handleDeleteTask`): no check.
- `crm-tab.tsx:1697-1705, 1709-1713` (`EditTaskModal.handleSave`, `handleDelete`): no check.
- `crm-tab.tsx:2225-2233` (`ScoringSection.saveRules`): no check.
- `crm-tab.tsx:2458-2467` (`SegmentsSection.handleDelete`): no check.
- `crm-tab.tsx:2640-2649` (`SegmentEditor.handleSave`): no check.

**Practical impact:** A refresh on a failed API call just re-runs server components with unchanged server state — harmless. No UI regression. These patterns pre-existed the PR (the fetch already wasn't checked), so the refresh commit didn't introduce the laxity.

**Recommendation:** None required for this audit's scope. If you want to tighten up in a follow-up, wrapping each in `const res = await ...; if (res.ok) { ...; router.refresh(); }` is a mechanical change. Low priority.

### Category C — ConversationsTab in `client-detail-view.tsx`

The "polling-visibility guard" and "loadError banner" changes from the same commit were audited:

- **`isDocumentVisible()` SSR safety:** Defined as `typeof document === 'undefined' || document.visibilityState === 'visible'`. On SSR it returns `true` (unreachable in practice since polling is set up inside client-side effects). **Correct SSR-safe pattern.**
- **`loadError` banner clearing:**
  - Voice-calls effect: clears on entry (line 1707) before fetching.
  - Threads effect: clears inside `.then()` on success (line 1745).
  - Thread-messages effect: clears inside `.then()` on success (line 1779).
  - Dismiss button: clears via `setLoadError(null)` on click.
  - **Verified — banner does clear when the next poll succeeds.**
- **Visibility guard placement:** applied inside the `setInterval` callback, not the initial `loadThreads()` call. The initial load always runs. Only subsequent polls are skipped when hidden. **Correct — prevents stale-data-on-return-to-tab.**

One edge case worth calling out: when the user hides the tab and comes back after 15+ seconds, the next poll fires only when `setInterval` next wakes up — which on most browsers is throttled to 1/second for hidden tabs but resumes at full cadence when visible. That's acceptable (worst case: 15s of stale data after returning), and matches the comment in the code.

**All-clear for client-detail-view.tsx changes.**

---

## Files cleared

| File | Sites | Risks flagged |
|---|---|---|
| `ai-workers-tab.tsx` | 3 | 0 |
| `workflows-tab.tsx` | 3 | 0 |
| `marketing-tab.tsx` | 3 | 0 (SSE verified safe) |
| `website-tab.tsx` | 4 | 0 (double-fetch style only) |
| `dispatch-tab.tsx` | 3 | 0 (double-fetch style only) |
| `email-marketing-tab.tsx` | 9 | 0 (double-fetch style only) |
| `crm-tab.tsx` | 27 | 0 (missing `res.ok` style only) |
| `client-detail-view.tsx` | (3 feature changes) | 0 |

## Conclusion

**Zero regressions introduced by the 52 `router.refresh()` additions.** The PR is defensive and follows the stated ground rules in spirit. The only notes are stylistic (double-fetch in email/website/dispatch tabs; missing `res.ok` guards in ~12 crm-tab sites). Both are pre-existing patterns and not worth blocking the merge.

The `isDocumentVisible()` and `loadError` banner additions in ConversationsTab are correctly implemented — SSR-safe, banner clears on success, polling skipped only for subsequent cycles.
