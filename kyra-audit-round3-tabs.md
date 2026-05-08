# Kyra Round-3 Tab Audit — Deep Bug Review

**Branch:** `fix/tabs-audit-round3`
**Scope:** Settings, Integrations, IT Operations, Insights tabs (plus embedded: `secrets-tab`, `tasks-card`, `worker-performance-card`, `knowledge-engine-card`).
**Method:** Line-by-line review of 4 tabs + embedded components + spot-check of every API endpoint they call.

---

## CRITICAL

### C1. IDOR — `/api/agency/clients/[id]/tasks` has no agency-membership check on the client
**File:** `/Users/steve/projects/kyra/app/api/agency/clients/[id]/tasks/route.ts:20-40, 50-127`
**Embedded in:** Insights → Tasks sub-tab (`tasks-card.tsx:127, 286, 349, 362, 376, 531`)

All four handlers (`GET`, `POST`, in sibling `[taskId]/route.ts` `GET`/`PATCH`/`DELETE`/`POST`) do this and ONLY this for auth:

```ts
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// ...no check that user is member of client's agency...
```

The routes then use the standard Supabase client, so RLS on `agency_clients` may partially cover GET, but **POST inserts `agency_id: client.agency_id` taken from the fetched row** (line 107 of the parent route) — effectively allowing any authenticated user who knows a client UUID to:
- List that client's scheduled tasks (leaking business intel).
- **Create tasks that run on OpenAI credits billed to the victim agency.**
- Delete or disable existing tasks.
- **Trigger a manual run** via POST `/tasks/[taskId]` with `{action:'run'}` — burns OpenAI + agency credits immediately (line 138 calls `executeTask` which uses service-role client, line 95-146 of `task-executor.ts`).

**Fix:** Replace all 6 handlers with `requireAgencyMember()` + `assertClientBelongsToAgency(agency.id, clientId)` (the helper already exists in `lib/secrets/index.ts:24-41` — lift it to `lib/agency/middleware.ts` and reuse).

---

### C2. IDOR — `/api/agency/clients/[id]/ai-report` burns OpenAI credits for any client
**File:** `/Users/steve/projects/kyra/app/api/agency/clients/[id]/ai-report/route.ts:17-29`
**Embedded in:** Insights → AI Reports (`insights-tab.tsx:65`)

```ts
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const svc = createServiceClientWithoutCookies();  // bypasses RLS
const { data: client } = await svc.from('agency_clients').select('id, name, agency_id').eq('id', clientId).single();
```

Any authenticated user can POST to this endpoint with any client UUID and trigger an OpenAI report generation. There is no membership check. `generateReport()` is called on line 56 and bills whichever agency owns the client.

**Fix:** Use `requireAgencyMember()` and assert the resulting `agency.id === client.agency_id`.

---

### C3. IDOR — `PATCH /api/agency/clients/[id]/container-config` writes credentials to any client
**File:** `/Users/steve/projects/kyra/app/api/agency/clients/[id]/container-config/route.ts:79-122`
**Embedded in:** Integrations tab (`client-detail-view.tsx:1315`)

`requireAgencyMember()` is used (good for auth), but:

```ts
const result = await requireAgencyMember();  // only proves caller has A agency
// ...merge + update...
const { error: updateError } = await supabase
  .from('agency_clients')
  .update({ container_config: merged })
  .eq('id', id);  // NO .eq('agency_id', result.data.agency.id)
```

This uses `createServiceClientWithoutCookies()` (line 92) which bypasses RLS. Any authenticated agency owner can write to another agency's client's `container_config` — which is where Integrations stores **GitHub tokens, Microsoft client secrets, Google service-account JSON, Fathom API keys, WordPress passwords, HeyGen keys** (see `IntegrationsTab` field map in `client-detail-view.tsx:1136-1290`). Credentials are stored **plaintext** in that JSONB column (no encryption layer unlike `client_secrets` in the Vault).

**Fix:** After loading the target row, `if (client.agency_id !== result.data.agency.id) return 403`. Better: swap the service-role client for the authenticated client and rely on RLS.

---

### C4. Plaintext credentials echoed to the browser in Integrations tab
**File:** `/Users/steve/projects/kyra/app/(dashboard)/agency/clients/[id]/client-detail-view.tsx:1426, 1436`

The Integrations form pre-fills every sensitive field with the plaintext current value:

```tsx
<input
  type={field.sensitive && !showSensitive[field.key] ? 'password' : 'text'}
  value={values[field.key] || (cfg[field.key] as string) || ''}
```

Here `cfg` is `client.container_config`, which is serialized into the initial HTML payload by the server component (`getAgencyClient()` does `select('*')` in `lib/agency/queries.ts:193-200`). A `password` input still holds the **plaintext value in the DOM**, recoverable by any injected script, browser extension, or a copy via devtools. The Eye-toggle (line 1447) lets any on-screen bystander reveal the secret.

**Fix:** Do not send `container_config` sensitive fields to the browser. Show a masked placeholder ("••••••••••••", "Configured") and require users to re-enter the secret to change it, exactly as `secrets-tab.tsx` does (line 319 always renders `MASKED_VALUE`).

---

### C5. `knowledge-engine-card` deletes without ANY confirmation
**File:** `/Users/steve/projects/kyra/components/dashboard/client-tabs/knowledge-engine-card.tsx:85-101, 205-216`

```tsx
const handleDelete = async (entryId: string) => {
  setDeleting(entryId);
  try { ... DELETE ... } ...
};
// ...
<button onClick={() => handleDelete(entry.id)} ...>
```

Clicking the trash icon next to any extracted knowledge entry fires an immediate `DELETE` against the API. No `window.confirm()`, no modal, no "Undo" toast. Knowledge-engine entries are auto-extracted structured AI learnings about customer patterns/business facts — once deleted they are gone forever, and the AI regresses.

**Fix:** Wrap with `if (!window.confirm('Delete this knowledge entry?')) return;` at minimum. Compare to `secrets-tab.tsx:185` for the pattern already used in the codebase.

---

## HIGH

### H1. Tasks execute silently-swallowed errors — user has no feedback
**File:** `/Users/steve/projects/kyra/components/dashboard/client-tabs/tasks-card.tsx:291, 355, 368, 380, 536`

Five callers use `} catch { /* ignore */ }`:
- Line 291: loading runs for a task (user sees stale list).
- Line 355: "Run now" button — if it fails, the button stops spinning and NO message is shown.
- Line 368: Enable/Disable toggle — silently fails.
- Line 380: Delete task — silently fails (user thinks it worked, task reappears on refresh).
- Line 536: Main list fetch — empty list forever with no error.

**Fix:** Surface errors into a toast or an inline error state, at minimum: `catch (err) { setError(err instanceof Error ? err.message : 'Failed to ...') }` with a banner similar to `secrets-tab.tsx:259-264`.

---

### H2. Optimistic UI divergence — no `router.refresh()` after container-config save in Integrations
**File:** `/Users/steve/projects/kyra/app/(dashboard)/agency/clients/[id]/client-detail-view.tsx:1307-1328`

`handleSave` for integrations returns `setSaved(integration.id)` and a toast, but never calls `onRefresh()` (which does `router.refresh()`). The connected-status pill in the header (line 1151: `connected: !!(cfg.email_imap_host)`) is computed from the server-rendered `client.container_config`, so after saving credentials the pill stays "Not Connected" until a full reload. Every other major tab got this `router.refresh()` wiring in round 2.

**Fix:** `onRefresh()` at the end of the success branch of `handleSave`.

---

### H3. AI-reports chat `catch` swallows errors — user blames the AI
**File:** `/Users/steve/projects/kyra/components/dashboard/client-tabs/insights-tab.tsx:97-102`

```ts
} catch {
  setMessages(prev => [...prev, { role:'assistant', content:'Failed to generate report. Please try again.', ... }]);
}
```

Any fetch error (5xx, network) produces the exact same "Failed" message — distinguishable from a 400-with-reason inside the successful branch (line 93 uses `data.error`). A user whose agency is out of OpenAI credits sees the generic message with no actionable info.

**Fix:** In the catch, include the status/message (`err instanceof Error ? err.message : 'unknown error'`) OR move the `data.error` fallback into the catch so bad responses produce a consistent experience.

---

### H4. Chat XSS? Investigation: safe today, but one line away from breakage
**File:** `/Users/steve/projects/kyra/components/dashboard/client-tabs/insights-tab.tsx:151`

```tsx
<p className="text-sm whitespace-pre-wrap">{msg.content}</p>
```

AI-generated content flows through `setMessages` (line 91-96) and is rendered as plain text — safe because React escapes by default and we use `{msg.content}` not `dangerouslySetInnerHTML`. No bug to fix. Flagged because it's the kind of content that tends to grow a markdown-renderer later — at that point please use a sanitizing renderer. No `dangerouslySetInnerHTML` was found anywhere in the audited files.

---

## MEDIUM

### M1. IT Operations — four imports are unused
**File:** `/Users/steve/projects/kyra/components/dashboard/client-tabs/it-operations-tab.tsx:13-16`

```ts
Eye, EyeOff, ChevronDown, ChevronUp,
```

Zero references to any of them in the file (verified by regex). Dead imports bloat the bundle slightly and fail strict lint configs.

**Fix:** Delete them.

---

### M2. Worker-performance card — `TrendIcon` receives unused `delta` prop
**File:** `/Users/steve/projects/kyra/components/dashboard/client-tabs/worker-performance-card.tsx:37-41, 156`

```ts
function TrendIcon({ trend, delta }: { trend: string; delta: number }) {
  // delta never read
```

Minor, but a lint warning. Either remove `delta` from the type and the call-site (line 156: `<TrendIcon trend={worker.trend} delta={worker.trendDelta} />`) or actually use it.

**Fix:** Drop `delta` — the `trendDelta` numeric display is already handled on line 159 outside the icon.

---

### M3. Tasks-card reimplements `timeAgo` inline
**File:** `/Users/steve/projects/kyra/components/dashboard/client-tabs/tasks-card.tsx:63-79`

`TimeAgo` component mirrors the first three rungs of `lib/format/time-ago.ts:6-18` (`just now`, `Xm ago`, `Xh ago`), then falls back to `toLocaleDateString`. `lib/format/time-ago.ts` already exists and handles all cases.

**Fix:** `import { timeAgo } from '@/lib/format/time-ago'` and inline `<span className="text-xs text-gray-500">{timeAgo(iso)}</span>`. Keeps behavior consistent across tabs (CRM, payments, voice already migrated per the file's header comment).

---

### M4. Settings → SettingsTabMerged reads `window.location.search` without SSR guard quality check
**File:** `/Users/steve/projects/kyra/app/(dashboard)/agency/clients/[id]/client-detail-view.tsx:1604`

```ts
const initialSubTab = typeof window !== 'undefined'
  ? (new URLSearchParams(window.location.search).get('settingsTab') as SettingsSubTab) || 'general'
  : 'general';
```

Functionally ok, but the cast `as SettingsSubTab` is unchecked — a hostile user passing `?settingsTab=foo` gets an active tab that matches no render branch (see `SETTINGS_SUB_TABS` on line 1583). All four render-branches on 1626-1637 gate by equality, so the UI just shows pills with nothing below. Low-impact UX bug, not security.

**Fix:** Validate: `const valid: SettingsSubTab[] = ['general','channels','autopilot','sharing']; const initial = valid.includes(raw) ? raw : 'general';`

---

### M5. Settings Export menu — export failures mention one generic message regardless of cause
**File:** `/Users/steve/projects/kyra/app/(dashboard)/agency/clients/[id]/client-detail-view.tsx:869-873, 891-895`

```ts
} catch { showMsg('error', 'Export failed.', 'export'); }
```

Client-side error only shows "Export failed." even when the server returned a specific reason (rate limit, missing permission, empty range). Consistent with an older pattern elsewhere in this file, but worth fixing for UX.

**Fix:** Read `res.statusText` or parse the error body first.

---

### M6. Tasks-card `RunResultsViewer` runs no poll — stale results
**File:** `/Users/steve/projects/kyra/components/dashboard/client-tabs/tasks-card.tsx:283-295`

A user clicks "Run now", sees the button spinner finish, then expands the task row to see results — but the viewer only fetches on mount (`useEffect([taskId, clientId])`). If the run is still pending or the manual trigger is slow, the user sees "No runs yet" indefinitely even when the run completes. Compare against `ConversationsTab` in the same page which polls every 10-15s (line 1758, 1795).

**Fix:** Either re-fetch when `onUpdate` is called in the parent `TaskRow`, or add a 5-10s interval inside the expanded viewer.

---

## LOW

### L1. Settings tab `AgencyNotes` — no dirty-tracking
**File:** `/Users/steve/projects/kyra/app/(dashboard)/agency/clients/[id]/client-detail-view.tsx:998-1009`

The "Save Notes" button is always enabled. If the user clicks Save without any change, the PATCH still fires. Minor — no data loss, just wastes one request. Consider `disabled={notes === (originalNotes)}`.

### L2. Settings general form — duplicate `disabled` state keys
**File:** `/Users/steve/projects/kyra/app/(dashboard)/agency/clients/[id]/client-detail-view.tsx:746-754`

`isSavingModel`, `isSaving`, `isSavingNotes`, `isDeleting`, `isExporting` — five overlapping flags. Consider a single `activeAction` enum or extract into a hook. Non-blocking.

### L3. Secrets tab uses `Textarea` with `WebkitTextSecurity: 'disc'` for masking
**File:** `/Users/steve/projects/kyra/components/dashboard/client-tabs/secrets-tab.tsx:219-221, 410`

`WebkitTextSecurity` is Chrome/Safari only; Firefox users see the raw value in the input. Since secret add/edit is power-user functionality, acceptable, but worth noting for Firefox testing. Alternative: conditionally render `<Textarea>` vs `<Textarea className="font-mono" type="..." />` wrapped differently, or use a 3rd-party masked textarea.

### L4. Integrations tab inlines the pill-nav pattern
**File:** `/Users/steve/projects/kyra/app/(dashboard)/agency/clients/[id]/client-detail-view.tsx:1344-1383`

The disclosure cards mirror a pattern used elsewhere (accordion). Acceptable here because it's JSON-driven, but worth noting: no shared primitive exists; each tab reimplements its own pill bar (see `SettingsTabMerged:1608`, `VoiceSmsTab:1513`, `InsightsTab:215`, `ITOperationsTab:537`).

### L5. Insights AI Reports — hard-coded chat data stub
**File:** `/Users/steve/projects/kyra/components/dashboard/client-tabs/insights-tab.tsx:71-88`

Only `conversationsCount` and `messagesHandled` are populated from real data (`client.usage_this_month`). All other fields are hard-coded zeros. The AI generator cannot actually analyze anything else. This is either an MVP stub (fine) or a real TODO. Confirm with product before prod.

### L6. Settings delete modal confirms but doesn't require typed confirmation
**File:** `/Users/steve/projects/kyra/app/(dashboard)/agency/clients/[id]/client-detail-view.tsx:1041-1067`

The "Danger Zone" modal is owner-gated client-side (role === 'owner') and requires a two-click confirmation flow — good. But unlike many SaaS tools, it doesn't require the user to type the client name. For a permanent deletion, consider adding a `<input value={typed} /> disabled={typed !== client.name}` gate for extra safety. Not a bug; a hardening suggestion.

---

## Spot-check results for items the task asked to verify explicitly

| Item | Finding |
| --- | --- |
| `dangerouslySetInnerHTML` in audited files | **None found** (Grep confirmed across all 4 tabs + embedded components) |
| Master UUID `1511e077` hardcoded | **None found** in these files; `isMasterAgency()` is used consistently (e.g. `marketing-tab.tsx:28`, `ai-setup-tab.tsx:9`) |
| `bg-gray-900` / `bg-gray-800` outside Button/Badge | **None found** in the 4 tabs |
| `text-white` outside Button/Badge | **None found**; every hit in the 4 tabs is on a button or pill (`insights-tab.tsx:148,192,222`, `it-operations-tab.tsx:177`, `secrets-tab.tsx:252,445`) |
| Destructive actions with confirm | `secrets-tab:185` ✅, `tasks-card:373` ✅, `client-detail-view:1048` ✅ (two-click), **`knowledge-engine-card:85` ❌ — see C5** |
| Delete-client route owner-gated server-side | ✅ `requireAgencyOwner()` on `clients/[id]/route.ts:279` and has `agency_id` scope |
| Secrets API leaks plaintext | ✅ `toMetadataResponse` always sets `value: '••••••••••••'` (`secrets/route.ts:14-25`) |
| Integrations credentials leak plaintext | **❌ C4 — container_config sent plaintext to browser** |

---

## Summary

**Critical bugs: 5.** Four are server-side auth holes on endpoints the four tabs call every render, two of which (`C1`, `C2`) let any authenticated user burn other agencies' credits. `C3` lets any agency write to any other agency's credentials store. `C4` leaks plaintext secrets into the browser DOM. `C5` is a destructive-action UX bug (no confirmation on knowledge-engine delete).

**High bugs: 3.** Silent-swallowed errors across tasks-card, missing `router.refresh()` on integrations save, generic error messages.

**Medium: 6.** Dead imports, unused props, reimplemented utilities, validation gaps, stale data in task-run viewer.

**Low: 6.** Polish items.

The biggest fix effort is the API auth review — `C1`/`C2`/`C3` all share the same root cause: handlers treating "authenticated" as "authorized for this client". A shared `requireClientAccess(clientId)` helper that wraps `requireAgencyMember()` + `assertClientBelongsToAgency()` should be added to `lib/agency/middleware.ts` and used at the top of every `/api/agency/clients/[id]/**` route. That one refactor eliminates the three IDOR bugs in one sweep.
