## Production Readiness Audit — Cannabis Dispatch Sprint

Reviewer: audit pass over `feat/cannabis-dispatch-sprint`. Scope per the task
brief — 4 agents, runner, tools, compliance guard, migration, 6 routes, widget.

### Build-breaker first
Before anything else ships: **`requireClientAccess` is imported from
`@/lib/agency/middleware` by all three briefing routes but does not exist
there.** Only a private helper of the same name lives inside
`app/api/agency/clients/[id]/permissions/route.ts` (returns a different shape:
`{ error: string, status: number }`, not the `{ data, error: { message, status } }`
the new routes consume). Type-check fails, build fails, nothing in this sprint
deploys. See P0.1.

---

### 🟥 Must fix before deploy (P0)

- **P0.1 — `requireClientAccess` is not exported from middleware.**
  `app/api/agency/clients/[id]/dispatch/briefing/stream/route.ts:18`,
  `.../approve/route.ts:18`, `.../reject/route.ts:13` all
  `import { requireClientAccess } from '@/lib/agency/middleware'`. That module
  (`lib/agency/middleware.ts`, 161 lines) exports only
  `requireAgencyMember / Admin / Owner / AdvancedTabsAgency / DispatchAgency`.
  **Fix:** add a new `requireClientAccess(clientId: string)` that combines
  `requireAgencyMember()` + a `client_id → agency_id` check, returning
  `{ data, error: { message, status } | null }`. All three routes already
  consume `auth.error.message / status`, so align the return shape.

- **P0.2 — Briefing approve/reject return shape mismatch vs. current helper.**
  Even if someone papers over P0.1 by importing the private helper from
  `permissions/route.ts`, that version returns `{ error: string, status }`
  but the new routes do `auth.error.message` / `auth.error.status`, yielding
  `undefined.message`. Must fix together with P0.1.

- **P0.3 — Cross-tenant escalation via approve route's service client.**
  `app/api/agency/clients/[id]/dispatch/briefing/[briefingId]/approve/route.ts`
  executes the tool via `createOnfleetClient(...)` with
  `autoExecuteRiskLevels: ['low','medium','high']`. Auth currently gates only
  on `clientId` in the URL + `briefingId` matching that client. Once P0.1 is
  fixed, also enforce that the briefing's `agency_id` matches the member's
  agency — a malicious agency member who guesses a briefing UUID for an
  unrelated client could execute `trigger_optimize` on the wrong tenant if
  the client lookup ever permitted cross-agency access. Add an explicit
  `eq('agency_id', session.agencyId)` guard.

- **P0.4 — Agent runner silently fails when `ANTHROPIC_API_KEY` is unset.**
  `lib/ai/agent-runner.ts:111` calls `getAnthropic()` which constructs
  `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })`. The `!`
  coerces `undefined` to a runtime client that 401s on every call. The
  catch branch records `outcome: 'fallback'` with `errorDetail: <provider
  err>` — so the dashboard shows a fallback, but no alert fires. **Fix:**
  return `outcome: 'error'` with a distinct `errorDetail: 'anthropic_key_missing'`
  at runner entry, check `env` once, and emit a boot-time warning.

- **P0.5 — Onfleet webhook returns 500 on a successful agent run is not
  possible, but a `writerResult.outcome === 'error'` still returns 200**
  (line 156-161 of `app/api/webhooks/onfleet/[clientId]/route.ts`) — that is
  intentional and correct (don't let Onfleet retry and re-fire agents).
  **However** the legacy path at line 362-367 still returns **502** on
  provider send failure. If a flakey Springbig causes one 502, Onfleet retries,
  the webhook fires again, and if it's now past the 2-min dedup window
  (P1 below), the customer gets a duplicate SMS. **Fix:** degrade line 364
  to `status: 200` with `{ status: 'provider_failed', error: ... }` — audit row
  already written.

- **P0.6 — `customer_memory` upsert can clobber columns.**
  `lib/onfleet/tools.ts:503-510` upserts on `client_id,contact_id` with just
  `{ facts, last_contact }`. If any other column (tags, sentiment, lifetime
  value, name, totalInteractions) is set by another writer, this upsert —
  if the row doesn't exist — inserts with only those two columns, nullifying
  everything else. **Fix:** either (a) SELECT current row first and merge,
  or (b) change to UPDATE-only and guard with a `single()` existence check.

- **P0.7 — `update_customer_memory` fact is unvalidated user-influenced
  input.** `fact` arrives from the LLM (which can be manipulated by the
  inbound customer's text) and is stored verbatim in `customer_memory.facts`.
  A customer saying "my address is: SSN 123-45-6789" could land PII into
  memory that shows up in future prompts. **Fix:** run `scanOutput` on the
  fact string before write; reject if leaks found. Also cap fact length
  (< 200 chars) and strip newlines.

- **P0.8 — `agent_invocations` NOT-NULL `model` column rejects the inbound
  fast paths.** `app/api/webhooks/sms/inbound/route.ts:606` inserts rows
  without a `model` field (STOP path, blocked injection path, rate-limit
  path). Migration at line 88 declares `model TEXT NOT NULL`. These inserts
  will all fail silently (wrapped in try/catch → `console.warn`), but
  you'll lose every audit row for the three most compliance-sensitive
  paths. **Fix:** pass `model: 'none'` (or `'haiku'` as best-guess) in
  `recordAgentInvocation`. Also add `trigger_type` — it's missing from the
  approve/reject STOP path inserts. Same issue for rate-limited and
  compliance-blocked paths: no `model` → insert rejected → TCPA
  audit trail loses the STOP event for the DB.

### 🟨 Should fix before flag-flip (P1)

- **P1.1 — 2-min dedup is too short for concurrent webhook fan-out.**
  `lib/sms/compliance-guard.ts:96` defaults `dedupeWindowMinutes = 2`. The
  `onfleet/[clientId]` route runs `brainPromise` + `writerPromise` in
  parallel (`Promise.all`). Both may call `send_customer_sms` within ~200ms.
  Neither has yet landed in `delivery_sms_log`, so the second one passes
  the dedup check. **Fix:** introduce a per-order in-flight lock (Supabase
  `dispatch_sms_locks(client_id, order_id, expires_at)` or simpler, an
  advisory PG lock) OR drop the Brain's ability to call `send_customer_sms`
  entirely — the sprint doc already says the Writer owns customer comms.
  Restrict Brain's tool list to exclude `send_customer_sms`.

- **P1.2 — `agent_invocations.cost_cents` NULL handling OK, but daily-cap
  race.** `lib/ai/agent-runner.ts:279-307` — the cap check sums
  `cost_cents` with `|| 0`, so NULL is fine. But two agents fired
  concurrently (per P1.1 concurrency) both read the pre-call sum, both
  pass the cap, both add ~$0.05. Real-world blast radius is small ($15/day
  cap is forgiving), but mark as P1 — track in cap dashboard.

- **P1.3 — `checkDailyCostCap` cap=0 is treated as blocked (allowed = used
  < 0 = false) — probably wrong.** An operator setting
  `daily_cost_cap_cents = 0` intending "unlimited" will instead disable the
  agent entirely. **Fix:** interpret 0 (or negative) as "unlimited" —
  `if (capCents <= 0) return { allowed: true, ... }`.

- **P1.4 — Copilot cron is sequential; one hang blocks the fleet.**
  `app/api/cron/dispatch-copilot/route.ts:51` — `for (const row of clients)`
  with `await runCopilot(...)`. `runAgent` has a 45s Copilot timeout
  (`copilot.ts:256`), so worst case = 45s * N tenants. At 10 tenants that
  blows the 300s `maxDuration`. **Fix:** `Promise.allSettled` with a bounded
  concurrency (e.g., 5) or increase fan-out via separate cron invocations
  per tenant.

- **P1.5 — SSE stream: the poll's cursor lookup is an extra query per tick
  that makes the poll non-atomic.**
  `app/api/agency/clients/[id]/dispatch/briefing/stream/route.ts:86-96`
  re-fetches `dispatch_briefings` to read the cursor's `created_at` every
  10s. If the `lastSeenId` row expires between ticks (`expires_at` = NOW +
  1h, but nothing stops the cleanup job deleting it), cursor goes
  undefined and you replay the last 10 rows. **Fix:** cache
  `lastSeenCreatedAt` locally alongside `lastSeenId`.

- **P1.6 — `agent_invocations.latency_ms` set to 0 for fast paths is
  misleading** (STOP/START/blocked/rate-limited in the inbound route).
  Per-agent latency SLOs will pick up a bimodal distribution. Fix by
  recording real `started → now` delta.

- **P1.7 — `scanOutput` for `update_customer_memory` at tool-use time.**
  See P0.7. If keeping at P1, at minimum log a metric when facts contain
  phone/email/SSN regex so we can see if it's happening.

- **P1.8 — Springbig adapter accepts any `messageId` truthiness.** Inbound
  dedup via provider `messageId` isn't implemented — retries from Springbig
  will re-invoke the agent. Add: check if a row with this `trigger_ref`
  already exists in `agent_invocations` for this client in the last 10 min;
  if yes, 200 no-op.

- **P1.9 — Purple Lotus hardcoded UUID.** `migration:217` is fine (guarded,
  idempotent). No new occurrences spotted in code outside the migration.
  Good.

- **P1.10 — Output scanner update-in-place is racy.** `inbound/route.ts:323`
  updates the **newest row with this `trigger_ref`** with output-scan
  results. `runAgent` records its row at the end of `runAgent`, but the
  update here may hit BEFORE that insert lands (especially on a timeout
  path). **Fix:** write a follow-on event row rather than mutating.

- **P1.11 — `agent_gate` webhook: when
  `container_config.dispatch_agent_enabled` is the string `"true"` rather
  than bool, `=== true` is false; legacy path runs.** Defensive match:
  `cfg.dispatch_agent_enabled === true || cfg.dispatch_agent_enabled === 'true'`.

- **P1.12 — `onfleet/[clientId]/route.ts:131` passes
  `onfleetApiKey: dispatchConfigForAgents?.onfleetApiKey || ''` to
  `runSmsWriter` even when the key is missing**, then Writer instantiates
  `new OnfleetClient('')`. All Onfleet tool calls 401. Route the Writer
  with a defensive early return identical to the Brain's
  `brainCtxReady` gate.

### 🟦 Nice to have / monitor (P2)

- **P2.1 — `read_last_sms` returns `'No prior SMS for this order.'` — good,
  no crash.** Verified.

- **P2.2 — Migration `COALESCE(current_config->'jane_stores', '[...]')`.**
  For a client with `jane_stores: []` (empty array), COALESCE keeps the
  empty array (non-NULL). Purple Lotus gets no backfill. Low risk since
  Purple Lotus's existing config has no `jane_stores` key at all; merge
  picks up the default 3-store list. **Monitor** for future cannabis clients
  who initialize with `[]` and expect backfill.

- **P2.3 — Migration idempotency verified.** `CREATE TABLE IF NOT EXISTS`
  + `IF NOT EXISTS` on indexes + the guard `current_config ?
  'jane_algolia_app_id'` at line 230. Re-run safe.

- **P2.4 — Hardcoded Algolia search key `8bd39f3c1d26dd060940b682f024757c`
  in the migration.** This is a SEARCH-ONLY Algolia public key (safe per
  `jane.ts:8-10` comment). Still, prefer env-var sourced. Not blocking.

- **P2.5 — `trigger_optimize` risk=high auto-execute on approve bypasses
  container_config.** Approve route at `approve/route.ts:106` hardcodes
  `autoExecuteRiskLevels: ['low','medium','high']`. Dispatcher's explicit
  approve is the intended authority — consistent with the sprint design.
  Monitor audit log for unexpected optimizations.

- **P2.6 — Widget embedded Jane tab — empty Algolia app id saves empty
  string, not removing the key.** `container_config.jane_algolia_app_id =
  ''` then `buildJaneConfigFromContainerConfig` returns null (good — falsy
  check). No bug, just worth noting.

- **P2.7 — `sms_consent` 365-day lookback window** is a reasonable TCPA
  default, but confirm with legal. Some states require re-consent at
  180 days.

- **P2.8 — `dispatch_briefings` never auto-expire.** `expires_at` is used
  by SSE filter but nothing deletes stale rows. Add a daily cron or
  `DELETE FROM dispatch_briefings WHERE expires_at < NOW() - INTERVAL '7 days'`.

### Sanity-test matrix

| Scenario                                       | Expected                         | Risk |
|------------------------------------------------|----------------------------------|------|
| Briefing stream load (any agency)              | **build fails** until P0.1 fixed | **BLOCKING** |
| Brain + Writer run in parallel, both SMS       | Writer wins dedup, Brain loses   | HIGH — P1.1 |
| Agent timeout at 30s                           | Falls back to rule-engine        | low (covered) |
| Purple Lotus `container_config` NULL           | Migration RAISE NOTICE + skip    | low (verified) |
| Purple Lotus already has `jane_algolia_app_id` | Migration skip                   | low (verified) |
| `ANTHROPIC_API_KEY` unset in env               | Fallback with no alert (silent)  | HIGH — P0.4 |
| Onfleet 502 from provider mid-legacy-path      | Provider retries → dup SMS       | MED — P0.5 |
| Daily cap = 0 cents                            | Blocks all agent calls (wrong)   | LOW — P1.3 |
| Copilot cron with 10+ tenants                  | Sequential, blows maxDuration    | MED — P1.4 |
| STOP reply with missing `model` col            | DB insert fails silently         | HIGH — P0.8 |
| Customer "fact: my SSN is ..." via inbound     | Stored in `customer_memory`      | HIGH — P0.7 |
| Approve route, briefingId from other agency    | Currently only guards clientId   | HIGH — P0.3 |
| `dispatch_agent_enabled: "true"` (string)      | Legacy path fires (agents skipped) | LOW — P1.11 |

### Summary

**P0: 8 / P1: 12 / P2: 8**

**Do not merge** this branch until P0.1 (build-breaker) is resolved. P0.2–P0.8
should land in the same PR — they are cheap fixes and the failure modes
range from silent data corruption (P0.6, P0.7) to lost TCPA audit rows
(P0.8) to cross-tenant writes (P0.3). The architecture is solid; the
integration seams are where the bugs cluster.

After P0s land, flag the feature off by default and burn down P1s before
enabling Purple Lotus. Copilot cron in particular (P1.4) will misbehave
within a month as cannabis tenants ramp.

Key files to revisit:
- `/Users/steve/projects/kyra/lib/agency/middleware.ts` — add `requireClientAccess`
- `/Users/steve/projects/kyra/app/api/agency/clients/[id]/dispatch/briefing/*/route.ts` — 3 files
- `/Users/steve/projects/kyra/lib/ai/agent-runner.ts:111,290,306` — key missing, cap=0
- `/Users/steve/projects/kyra/lib/onfleet/tools.ts:503-513` — memory upsert + fact sanitize
- `/Users/steve/projects/kyra/app/api/webhooks/sms/inbound/route.ts:606` — add `model` field
- `/Users/steve/projects/kyra/app/api/webhooks/onfleet/[clientId]/route.ts:131,364` — writer gate + 502→200
- `/Users/steve/projects/kyra/app/api/cron/dispatch-copilot/route.ts:51` — concurrency
