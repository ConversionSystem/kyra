# Per-Client 13-Tab Audit

Scope: `app/(dashboard)/agency/clients/[id]/client-detail-view.tsx` (2,442 LOC) + 29 files under `components/dashboard/client-tabs/` + `components/seo-geo-command-center.tsx` (1,966 LOC). Generated 2026-04-21 against `main @ 0fdb84cb`.

The sub-agent infrastructure killed 4 of 5 audit agents mid-task (only AI Core completed — see `kyra-audit-ai-core.md` for detail). Remaining groups were swept directly via targeted pattern searches. This is the consolidated findings doc — bugs ranked critical → low.

---

## CRITICAL

### 1. Server-side plan-gate bypass — `ADVANCED_TABS_AGENCIES` / `DISPATCH_AGENCIES` enforced UI-only

`client-detail-view.tsx:358-367` gates 5 tabs (Marketing / Voice-SMS / Dispatch / SEO-GEO / IT Operations) behind two hardcoded agency-UUID allowlists. The **tabs are hidden in the sidebar**, but the **server routes they call accept any authenticated agency admin**. Confirmed by spot-check:

| Server route | Gate used | Gate against UUID allowlist? |
|---|---|---|
| `app/api/agency/ai-setup/apply/route.ts:5387` | `requireAgencyAdmin()` | ❌ none |
| `app/api/agency/ai-setup/team/route.ts:21` | `requireAgencyAdmin()` | ❌ none |
| `app/api/agency/clients/[id]/skills/route.ts:16` | `requireAgencyMember()` | ❌ none |
| `app/api/agency/clients/[id]/dispatch/rules/route.ts:17` | `requireAgencyMember()` | ❌ none |
| `app/api/agency/clients/[id]/dispatch/optimize/route.ts:17` | `requireAgencyMember()` | ❌ none |
| `app/api/agency/clients/[id]/dispatch/drivers|alerts|webhooks` | same | ❌ none |

Any agency admin who knows the endpoint URL can bypass the feature gate. Low exploitability (they need to be an admin of *their own* agency already, and the actions still hit their own data) but it defeats the business intent of the allowlist.

**Fix:** add a `requireAdvancedTabsAgency()` helper that checks `ADVANCED_TABS_AGENCIES.has(agencyId)` and apply it to the server routes behind those tabs. Or move the allowlist to a plan column and require the right plan.

### 2. XSS via `dangerouslySetInnerHTML` on AI-generated HTML

Three sites render LLM-generated HTML without sanitization:

- `components/dashboard/client-tabs/campaigns-sub-tab.tsx:82` — `email.body`
- `components/dashboard/client-tabs/campaigns-sub-tab.tsx:292` — `campaign.landingPageCopy.bodyHtml`
- `components/dashboard/client-tabs/funnels-sub-tab.tsx:91` — `step.body`
- `components/dashboard/client-tabs/funnels-sub-tab.tsx:265` — `email.body`

Source: `lib/campaigns/ai-campaign-engine.ts:92-95` — emits `bodyHtml: "Full landing page body in HTML"` from a raw LLM JSON parse. Prompt-injection of the agent's context could produce `<script>`, `<iframe>`, `onerror` payloads that execute inside the agency dashboard.

A sanitizer already exists at `lib/sites/html-sanitizer.ts` (`sanitizeGeneratedHTML`) — it's used by the website builder but not here.

**Fix:** route the 4 `dangerouslySetInnerHTML` sites through `sanitizeGeneratedHTML(..., [])`.

### 3. Hardcoded master-agency UUID in 7 client-side locations

`'1511e077-77ef-4c47-81fd-06a3bc9f1dbb'` appears at:

- `app/(dashboard)/agency/clients/[id]/client-detail-view.tsx:354,359,366`
- `components/dashboard/client-tabs/marketing-tab.tsx:1019` (`KYRA_MAIN_AGENCY_ID`)
- `components/dashboard/client-tabs/ai-setup-tab.tsx:12` (`MASTER_AGENCY_ID`)
- `components/dashboard/client-tabs/ai-workers-tab.tsx:77,83` (`MASTER_AGENCY_IDS`, `KYRA_MAIN_AGENCY_ID`)

Plus two other agency UUIDs hardcoded in `client-detail-view.tsx:360-361,367` (TrustedNetworx + Priv7/Purple Lotus). Onboarding a new agency into "advanced tabs" currently requires a code deploy, and removing one requires the same.

**Fix:** centralize to `lib/agency/constants.ts` — exported readonly arrays, `process.env.MASTER_AGENCY_ID` fallback for the master UUID (pattern already exists in `lib/auth/admin.ts`). Ideally these move to a DB column (`agencies.entitlements` JSONB) so onboarding is a row update instead of a deploy.

---

## HIGH

### 4. Terminal branding violations — dark hero card + hard page reload

`client-detail-view.tsx:709` renders the "Terminal Not Available" hero as:

```tsx
<div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white">
```

Direct violation of BRANDING.md ("Never use `bg-gray-900` / `bg-gray-800` on page content. Sidebar is the only exception").

Also `line 668`: `setTimeout(() => window.location.reload(), 4000)` hard-reloads the page 4 seconds after Terminal activation. Should be `router.refresh()` — avoids unnecessary HTTP 200 on every static asset.

Two more dark-theme blocks at lines 2220 (`bg-gray-900 text-green-400` terminal-style token preview) and 2252/2263 (`bg-gray-900` pre blocks) are intentional "terminal/code snippet" aesthetic — those are OK per the BRANDING.md "Code/Monospace" exemption, but the 709 hero card has no such justification.

**Fix:** replace line 709 gradient with `rounded-2xl border border-gray-200 bg-white` and use indigo accents. Replace line 668 reload with `router.refresh()`.

### 5. Silent error swallowing in critical polling + mutation paths

Fire-and-forget catches drop errors users needed to see:

- `components/dashboard/client-tabs/email-marketing-tab.tsx:1171` — `.catch(() => {})`
- `components/dashboard/client-tabs/website-tab.tsx:502` — `.catch(() => {})`
- `components/dashboard/client-tabs/ai-workers-tab.tsx:135` — `.catch(() => {})`
- `components/seo-geo-command-center.tsx:937,1484` — `.catch(() => {})`

Plus 3 `.catch(err => console.error(...))` in `client-detail-view.tsx:1720,1734,1760` (Inbox — voice-calls / threads / thread-messages load failures). User sees an empty list and no indication why.

**Fix:** surface errors via toast/banner component, not console. Have a shared `useErrorToast()` hook or reuse `StatusMessage` pattern from `/agency/settings`.

### 6. 7 large tab files missing `router.refresh()` after mutations

State becomes stale after save — server data refreshes on next navigation, not immediately. Affected:

- `crm-tab.tsx` (2,920 LOC)
- `marketing-tab.tsx` (1,077)
- `dispatch-tab.tsx` (1,275)
- `workflows-tab.tsx` (706)
- `email-marketing-tab.tsx` (1,382)
- `website-tab.tsx` (902)
- `ai-workers-tab.tsx` (996)

These do optimistic local-state updates but never sync back. Small UX papercut individually, systemic problem at scale.

**Fix:** add `const router = useRouter()` and call `router.refresh()` after every non-idempotent mutation.

---

## MEDIUM

### 7. Widespread helper duplication — extract to `components/ui/` and `lib/format/`

Confirmed copies, each independently drifted:

| Helper | Copies | Locations |
|---|---|---|
| `CopyButton` | **5** | marketing-tab:113, reviews-sub-tab:63, campaigns-sub-tab:14, funnels-sub-tab:14, sms-campaigns-sub-tab:60 |
| `timeAgo` | **2+** | payments-sub-tab:43, crm-tab:184 (+ `formatTimeAgo` in voice-sub-tab:71, `formatTime` in client-detail-view:1817 — same semantics, different names) |
| `getInitials` | **2** | crm-tab:174, client-detail-view:1829 |
| Tab-pill-bar pattern | **6+ files** | insights / voice-sub / train / reviews-sub / dispatch / delivery-sms (inline `activeTab === X ? pill-styles` everywhere) |

Prior Settings audit already documented this pattern across the Settings surface. System-wide there are 10+ reimplementations of the tab-pill bar alone.

**Fix:** single `components/ui/copy-button.tsx`, `components/ui/tabs.tsx`, `lib/format/time-ago.ts`. Swap in progressively — don't block audit commits on this.

### 8. Unthrottled polling loops in Inbox (`ConversationsTab`)

`client-detail-view.tsx` — 3 polling loops run unthrottled (voice-calls, threads, thread-messages). Hand-rolled `setInterval` rather than `usePolling` hook from `hooks/use-polling.ts`. Runs even when the tab isn't visible. Wasted API calls.

**Fix:** either adopt `usePolling` (module-level cache, tab-visibility-aware) or add `document.visibilityState === 'visible'` guards.

### 9. Plan-limit / role guards duplicated between pages

The `isMasterOrKyra`, `isPaidPlan`, `hasAdvancedTabs` logic at `client-detail-view.tsx:370-382` is also redeclared (with slight variations) in other pages — `/agency/page.tsx`, `/agency/intelligence/page.tsx`, tab components themselves. Already flagged in prior page-layer audit (22 pages duplicate a 6-line auth preamble).

**Fix:** `lib/agency/entitlements.ts` — single source for "can this agency see X tab" checks. Used by both layout and server routes.

---

## LOW

### 10. `ai-setup/apply/route.ts` is 5,981 lines

One route handler file. Almost certainly a refactor target, but not actively broken.

### 11. Inconsistent button styling — direct Tailwind `bg-indigo-600 text-white` vs `<Button>` primitive

Dozens of places use inline `className="... bg-indigo-600 text-white rounded-lg ..."` instead of `<Button variant="default">`. Consistency cost, not a bug. BRANDING.md says "Use `<Button>` component".

### 12. Voice UI sprawl (confirmed from prior audit)

`voice-sub-tab.tsx` (375) + `retell-voice-tab.tsx` (529) + `voice-channel-card.tsx` (529) have overlapping responsibilities — 3 separate voice config surfaces. ~1,800 LOC with no shared subcomponents.

### 13. Terminal activation: on-success banner + 4s hard reload race

After "Activate Terminal" succeeds, a success banner renders (line 664 area), then `window.location.reload()` fires 4 seconds later. User may click a nav link in those 4 seconds and get interrupted. See bug #4.

---

## Fixes being applied in the next commit (top of the list)

1. **Centralize master-agency UUID** — new `lib/agency/constants.ts`, env-backed, 7 call-sites migrated.
2. **Server-side gate enforcement** — `requireAdvancedTabsAgency()` helper applied to tab-gated routes (ai-setup/apply, dispatch/*, ai-setup/team).
3. **XSS sanitization** — `sanitizeGeneratedHTML` applied to the 4 `dangerouslySetInnerHTML` sites.
4. **Terminal branding + hard-reload** — dark hero replaced with brand card, reload → `router.refresh()`.

The rest (`router.refresh()` on 7 tabs, shared helpers, polling, UI duplication) are tracked separately — they're systemic refactors that should ship as their own focused PRs, not bundled into a bugfix.
