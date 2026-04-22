## Redundancy Audit — Cannabis Dispatch Sprint

Audited branch: `feat/cannabis-dispatch-sprint`. Target: verify Copilot sub-view, new crons, new API routes, and widget-builder Menu tab don't duplicate existing Kyra surfaces.

### Blocking redundancies (must fix before merge)

- **[high] Duplicate `sla_breach` writes — no dedup key.**
  Both paths insert rows into `dispatch_events` with `event_type = 'sla_breach'`:
  - Rule engine: `lib/onfleet/rules/breach-alerting.ts:136` (fired by `dispatch-optimize` cron at `app/api/cron/dispatch-optimize/route.ts:73-79`, runs every 15 min regardless of `dispatch_agent_enabled`).
  - Copilot tool: `lib/onfleet/tools.ts:446-454` writes the same event_type on every `flag_sla_risk` call.
  - Same-task overlap is guaranteed: `dispatch-optimize` and `dispatch-copilot` run at the identical `*/15 * * * *` schedule. Both read the same pending-task list and the cron runner has no per-task dedup. `app/api/agency/clients/[id]/dispatch/alerts/route.ts:40-58` naively concatenates all alerts arrays from the last 24h, so the Overview sub-view "SLA Breach Alerts" card at `components/dashboard/client-tabs/dispatch-tab.tsx:914-963` will double-count. **Fix:** either (a) gate `executeRules` in the optimize cron on `container_config.dispatch_agent_enabled !== true`, or (b) add a `(client_id, task_id, event_type)` uniqueness key on `dispatch_events` with ON CONFLICT DO NOTHING.

- **[high] Cron collision: two 15-min jobs hit the same OnFleet API key.**
  `vercel.json:55-59` declares both `/api/cron/dispatch-optimize` and `/api/cron/dispatch-copilot` at `*/15 * * * *`. Vercel fires them at roughly the same instant. Both call `onfleet.listTasks()` per client (copilot via the `list_active_tasks` tool, optimize directly at `dispatch-optimize/route.ts:61`). OnFleet rate limits per API key — simultaneous bursts risk 429s mid-optimization. **Fix:** offset copilot to `7,22,37,52 * * * *` (or any non-aligned 15-min phase).

- **[high] Menu Integration "Website URL" duplicates AI-setup Training tab field.**
  `components/dashboard/widget-builder-embedded.tsx:62` reads/writes `cfg.website_url` — the same column already edited at `components/dashboard/client-tabs/training-sub-tab.tsx:61,214`. Two UIs writing the same `agency_clients.container_config.website_url` = last-write-wins confusion. **Fix:** make the Menu tab read-only for that field (link out to AI Setup) or delete the duplicated input — Jane-specific fields (`jane_algolia_*`) are fine to keep.

### Non-blocking redundancies (ship now, clean up later)

- **[medium] Copilot stats partially duplicate Overview stats.** Copilot's `active_route_count` and `at_risk_count` (dispatch-tab.tsx:420-428) are a glanceable summary; Overview shows a richer 6-card grid (dispatch-tab.tsx:806-813) with `SLA Breaches`, `Active Drivers`, `Optimizations`, etc. They're computed from different sources (LLM-submitted count vs. live OnFleet fetch) so numbers may diverge slightly — acceptable but the user may notice. Consider dropping the stat row from Copilot and linking "View detail →" to Overview.

- **[medium] Copilot "Prevented breaches" is always null.** `lib/agents/copilot.ts:293` hard-codes `prevented_breaches: null` on insert. The stat card renders 0 permanently (dispatch-tab.tsx:429-434). Either wire it up or remove the card before shipping.

- **[low] `/dispatch/route.ts` GET vs `/dispatch/briefing/stream`.** The base dispatch endpoint already returns `recentEvents` (50 rows) which includes `sla_breach` events. The new SSE stream only delivers `dispatch_briefings` rows — no overlap on the data source. Documented as intentional.

### Intentional overlaps (not redundant)

- **Legacy notification-gate vs SMS Writer agent are mutually exclusive.** `app/api/webhooks/onfleet/[clientId]/route.ts:89-162` returns early when `agentGate.enabled === true`, so `evaluateNotificationGate` (line 190) only runs when agents are off. Correctly gated.
- **Rules sub-view vs Copilot recommendations.** Rules (dispatch-tab.tsx:1579+) are static user-authored triggers; Copilot recommendations are per-briefing LLM suggestions. Different purposes.
- **`insights` tab and `inbox` tab.** No dispatch/briefing references found in either (insights-tab.tsx sub-tabs are usage/tasks/memory/ai-reports). No overlap with Copilot.
- **Agency-level surfaces** (`mission-control-live.tsx`, `solo-overview.tsx`, `ultron-summary-card.tsx`). Grepped — none reference dispatch/copilot/briefing. No overlap.

### Dashboard sub-view matrix

| Data point | Where it exists | In Copilot? | Overlap? |
|---|---|---|---|
| Active route count | Overview "Deliveries (24h)" + Copilot stat | yes | Partial — different granularity, different source |
| At-risk tasks | Overview "SLA Breach Alerts" card + Copilot stat | yes | Partial — same data, different shape |
| Prevented breaches | Copilot stat only (always null) | yes | Dead field, remove or wire up |
| Recommendations list | Copilot only | yes | NO (rules sub-view shows static rules, different concept) |
| Driver status | Drivers sub-view only | no | NO |
| SLA breach events | Overview + alerts API | no | NO |

### Cron schedule table

| Path | Schedule | Conflict |
|---|---|---|
| /api/cron/dispatch-optimize | `*/15 * * * *` | Collides with dispatch-copilot (same minute). OnFleet rate-limit risk + duplicate `sla_breach` writes. |
| /api/cron/dispatch-copilot | `*/15 * * * *` | See above. Offset to `7,22,37,52`. |
| /api/cron/container-health | `*/5 * * * *` | No collision with dispatch crons. |
| /api/cron/alerts | `*/30 * * * *` | No collision. |

### Items I could not verify from code alone

- Whether `agent_invocations` rows written by Copilot are also surfaced in the agency usage dashboard — I grepped mission-control/solo-overview/ultron-summary-card and found no references, but usage accounting may read from that table elsewhere. Defer to runtime check.
- Whether the `submit_briefing` LLM tool reports `atRiskCount` consistently with `evaluateBreachAlert`'s prediction math. They use different thresholds (rule engine uses `thresholdMinutes`, Copilot uses free-form LLM judgment). Verify during first live briefing.
