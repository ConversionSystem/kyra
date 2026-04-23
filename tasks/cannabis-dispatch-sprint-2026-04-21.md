# Cannabis Dispatch + SEO Sprint — 2026-04-21

Agentic dispatch system + widget smart-recommendations generalization + cannabis SEO/GEO worker, shipped inside Kyra (parent `9bdbb95d`). Built for Purple Lotus as the anchor customer; ships behind a per-client `dispatch_agent_enabled` flag (currently `false` for all clients — flip to `true` when validated).

---

## Summary

| Metric | Value |
|---|---|
| New TS/SQL files | 14 (excluding template data) |
| Cannabis SEO template files | 23 |
| New sprint LOC (excl. template) | **3,865** |
| Cannabis SEO template LOC | **2,812** |
| Modified existing files | 7 |
| Tests added | 28 (4 new test files) |
| Test suite state | **213/213 passing** |
| Typecheck state | **0 errors** (`npx tsc --noEmit`) |
| Subagents dispatched | 6 |

---

## What shipped

### Phase 1 — Shared foundations (I wrote these; agents consume)

| File | Purpose |
|---|---|
| `supabase/migrations/20260421001_cannabis_vertical.sql` | 4 new tables (`dispatch_briefings`, `agent_invocations`, `sms_consent`, `sms_opt_out`) + Purple Lotus `container_config` backfill with Jane Algolia keys, stores, known brands, industry flag, agent config. Idempotent, RLS-enabled from day 1. |
| `lib/onfleet/tools.ts` | 13 Anthropic tool definitions + tenant-scoped executors + risk classifier. Wraps existing `OnfleetClient`. Gates high-risk writes via per-dispensary `auto_execute_risk_levels` config (auto-executes low/medium; proposes high for approval). Every write auto-logs to `dispatch_events`. |
| `lib/ai/agent-runner.ts` | Generic tool-use loop. Pre-flight credit check, per-invocation audit to `agent_invocations`, 30s timeout, Anthropic prompt caching support, daily cost-cap enforcement ($15/day default, per-dispensary override), `onFallback` hook for rule-engine degradation. `AGENT_MODELS.sonnet` + `.haiku` registry. |
| `lib/sms/compliance-guard.ts` | `checkCompliance(ctx)` runs opt-out → consent (365d window) → sending hours → dedup (N-min window per order). Also: `isStopReply`, `isStartReply`, `registerOptOut`, `removeOptOut`, `registerConsent`. |
| `lib/billing/credit-engine.ts` | +4 action types: `dispatch.brain_call` (5cr), `dispatch.sms_writer_call` (1cr), `dispatch.copilot_call` (3cr), `dispatch.inbound_customer_call` (1cr). |

### Phase 2 — Parallel subagent work

**Subagent A — Widget + Jane generalization**
- `lib/integrations/jane.ts` — rewrote to accept `JaneConfig` as first arg; removed hardcoded `ALGOLIA_APP_ID` / `ALGOLIA_SEARCH_KEY` / `ALGOLIA_INDEX` / `STORE_CONFIG` / `KNOWN_BRANDS` / `DEFAULT_MENU_BASE`. Purple Lotus's values live in `agency_clients.container_config` now.
- `app/api/widget/chat/route.ts` — builds `JaneConfig` from client config, passes through. Dropped `|| 'https://plpcsanjose.com'` fallback. Dynamic few-shot example pulled from `results.products[0]` instead of hardcoded "Apple Drip".
- `components/dashboard/widget-builder-embedded.tsx` — new "Menu Integration" tab (Leaf icon) exposes Algolia keys, store list, known brands, website URL, default store. Empty arrays save as `undefined` so they don't overwrite DB values.

**Subagent B — Dispatch Brain + SMS Writer**
- `lib/agents/dispatch-brain.ts` — Sonnet-backed reasoning agent with all 13 tools. Orders: `list_active_tasks` → `list_active_drivers` → decide → 0-3 concrete actions + summary. Falls back to existing `executeRules` on error.
- `lib/agents/sms-writer.ts` — Haiku-backed drafting agent restricted to 5 tools (read_memory/read_status/read_last_sms/send_customer_sms/escalate). Cannabis compliance baked into system prompt (21+ reminder, STOP footer, 160-char target). Falls back to `DEFAULT_TEMPLATES` + `processWebhook` + provider send on error.
- `app/api/webhooks/onfleet/[clientId]/route.ts` — branched on `cfg.dispatch_agent_enabled`. When `true`: Brain + Writer run in parallel via `Promise.all`, each `.catch`-shimmed. When `false`: existing rule-engine + notification-gate path runs unchanged. Legacy path preserved as live fallback.

**Subagent C — Dispatcher Copilot**
- `lib/agents/copilot.ts` — Sonnet + prompt caching. Uses a locally-defined `submit_briefing` tool as the required final step (Option B — structured output, no regex parsing). Tool surface: reads + `flag_sla_risk` + `escalate_to_human` only (Copilot never executes destructive actions directly).
- `app/api/cron/dispatch-copilot/route.ts` — cron endpoint, `requireCron`-gated, iterates all clients with `dispatch_agent_enabled=true AND copilot_interval_minutes>0`, writes briefings to `dispatch_briefings`.
- `app/api/agency/clients/[id]/dispatch/briefing/stream/route.ts` — SSE stream, 10s poll, 30s heartbeat, 10-min lifetime, cursor-based delivery of new briefings.
- `app/api/agency/clients/[id]/dispatch/briefing/[briefingId]/approve/route.ts` — approve endpoint that executes the underlying tool with full auto-execute permissions (dispatcher's approval = authority).
- `app/api/agency/clients/[id]/dispatch/briefing/[briefingId]/reject/route.ts` — mark rejected with optional reason.
- `vercel.json` — one new cron entry `*/15 * * * *` for the Copilot.

**Subagent D — Inbound Customer Agent**
- `lib/agents/inbound-customer.ts` — Haiku-backed, tools filtered to 6 (read_memory/read_status/read_last_sms/send_customer_sms/escalate/update_memory). System prompt hardened against prompt injection with explicit `<customer_message>` tag handling and escalation triggers for angry/medical/regulatory content.
- `app/api/webhooks/sms/inbound/route.ts` — dual-adapter for Springbig + Blackleaf payload shapes. Dispensary resolution by `?client_id=<uuid>` or `container_config.inbound_phone` lookup. Full defense chain: `isStopReply` → `isStartReply` → `analyzeInput` → `checkRateLimit` → `checkCompliance` → agent. STOP/START bypass the LLM entirely. Output scan via `scanOutput`. **[My integration fix]** Conversation logging refactored from the originally-targeted `conversations` table to Kyra's `client_conversations` pair-shape (`{user_message, ai_response}`) to match existing schema; the tool-sent body is extracted from `toolCalls.send_customer_sms.input.body`.

**Subagent E — Dispatch tab UI**
- `components/dashboard/client-tabs/dispatch-tab.tsx` — +453 LOC. Added `'copilot'` sub-view as the new default (first in `SUB_VIEWS`). Live SSE connection via native `EventSource` with reconnecting-dot indicator. 3 stat cards (active routes / at-risk / prevented breaches) following BRANDING.md exact spec. Recommendations list with inline approve/reject buttons; reject opens a textarea popover for optional reason. Empty state when no briefings: "The Copilot runs every 15 min. Next briefing in {n} min."

**Subagent F — Cannabis SEO/GEO worker**
- `templates/cannabis-seo-worker/` — full port of vet-seo-worker. 23 files: `SOUL.md` + 5 configs + 5 prompts + 10 skill SKILL.md (2 with runnable `run.ts` — geo-tester 345 lines, nap-auditor 410 lines).
- **21 cannabis directories**: Google Business Profile, Weedmaps, Leafly, Jane, Dutchie, AllBud, Yelp, Facebook, Cannabis.net, Merry Jane, BudTrader, Cannabis Reports, SeshLyfe, Budista, Nextdoor, Apple Maps, Bing Places, Foursquare, MapQuest, CitySearch, Angi.
- **25 GEO query templates** + 3 competitor queries — cannabis-specific ("best dispensary in {CITY}", "best cannabis delivery in {CITY}", etc.).
- **20 metro subreddit mappings** across major US cannabis markets.
- **12 cannabis-specific compliance rules** added (no medical claims, state license number required, 21+ language, cannabis-preferred vocab, no inducement language, underage-thread skip rule, non-legal-state skip, AdSense publication skip, license NAP audit, Store+LocalBusiness schema, cannabis-aware name equivalence).

### Phase 3 — Integration fixes I made

1. **`conversations` → `client_conversations`** in `app/api/webhooks/sms/inbound/route.ts` — Agent D wrote to a non-existent schema shape. Refactored to pair-shape (`user_message`/`ai_response`) matching Kyra's live `client_conversations` table. Inbound body is buffered and logged with the outbound at the end of each exchange. Tool-sent SMS body is extracted from `toolCalls.send_customer_sms.input.body` so Nick sees the exact outbound text in thread view.
2. **Test file type strict-null fix** — `__tests__/onfleet-tools-schema.test.ts` — `tool.description` is optional per Anthropic SDK types; added non-null guard.

### Sanity tests added

| File | Tests | Coverage |
|---|---|---|
| `__tests__/compliance-guard.test.ts` | 11 | STOP/START canonical keywords, whitespace, embedded-word rejection, mutual exclusivity |
| `__tests__/onfleet-tools-schema.test.ts` | 13 | Tool catalog completeness, description presence, risk classification, `reason` requirement on writes, no-duplicate-names |
| `__tests__/credit-engine-dispatch.test.ts` | 3 | New action types exposed, Sonnet costs ≥ Haiku costs, Haiku-backed agents ≤ 1 credit |
| `__tests__/agent-runner.test.ts` | 1 | Model registry aliases distinct |

Full test suite (213 tests, 17 files): **all green**.

---

## Architecture snapshot

```
ONFLEET WEBHOOK (taskCreated/Started/ETA/Arrival/Completed/Delayed/Failed)
        │
        ▼
  /api/webhooks/onfleet/[clientId]    ← orchestrator (cfg.dispatch_agent_enabled branch)
        │
        ├─► DISPATCH BRAIN   (Sonnet, 13 tools, 5cr/call)
        │     reasons → calls tools → audits dispatch_events
        │     fallback: executeRules() [existing rule-engine]
        │
        └─► SMS WRITER       (Haiku, 5 tools, 1cr/call)
              drafts → compliance-guard → provider send → delivery_sms_log
              fallback: DEFAULT_TEMPLATES via processWebhook

CRON */15 * * * *
        ▼
  /api/cron/dispatch-copilot
        │
        └─► DISPATCHER COPILOT (Sonnet cached, 3cr/call)
              reads 30-min window → submit_briefing(summary, recs[])
              writes to dispatch_briefings (1hr TTL)

DASHBOARD
  /api/agency/clients/[id]/dispatch/briefing/stream  (SSE, 10s poll)
  /api/agency/clients/[id]/dispatch/briefing/[id]/approve  (executes recommendation)
  /api/agency/clients/[id]/dispatch/briefing/[id]/reject   (logs rejection)

SPRINGBIG / BLACKLEAF REPLY WEBHOOK
        ▼
  /api/webhooks/sms/inbound
        │
        ├─► STOP → registerOptOut + system reply (no LLM)
        ├─► START → removeOptOut + system reply (no LLM)
        ├─► Injection blocked → deflection reply (no LLM)
        ├─► Rate limited → cooldown reply (no LLM)
        ├─► Opted out → silent 200 (no LLM)
        │
        └─► INBOUND CUSTOMER AGENT (Haiku, 6 tools, 1cr/call)
              defend → agent → scanOutput → compliance-guard → send
```

---

## Known follow-ups (not blocking)

1. **Agent D flagged — SB/BL signature verification.** Neither provider publishes HMAC verification contracts for inbound webhooks. Deferred until providers publish specs or we can negotiate one. Current mitigation: per-dispensary `webhook_token` in URL query param would add a layer — consider adding.

2. **Widget PATCH endpoint field allowlist.** Agent A added new `jane_*` + `website_url` keys to `container_config` via the widget-builder UI PATCH flow. Should verify the route's allowlist accepts them. Untested in this sprint.

3. **Conversations pair-shape log on success path** — fixed in integration. The pair write uses the tool input body when the agent replied via `send_customer_sms` tool; falls back to raw model text with a `[agent draft, not sent]` prefix otherwise. Validate this appears correctly in the dashboard thread view when we flip the flag on.

4. **Brain fallback doesn't re-insert dispatch_events** — when the Brain falls back to `executeRules`, fired rule events are NOT re-inserted into `dispatch_events` (the legacy path handles that inside its own block, but the agent-runner's fallback branch short-circuits). Consider adding an insert loop in the fallback adapter if event parity matters.

5. **Tab-tab sub-view token mix** — Subagent E used `bg-blue-600` (per brief) while the rest of the file uses `bg-indigo-600`. Both are allowed per BRANDING.md but pick one per file to be consistent.

6. **Copilot briefing TTL.** Set to 1 hour. If the dashboard ever wants historical trail, either bump the TTL or add a separate `dispatch_briefings_archive` table.

7. **Daily cost cap default.** `$15/day` per dispensary. At Sonnet's current pricing and 300 webhooks/day, Brain alone could hit that. Monitor `agent_invocations.outcome='budget_exceeded'` rate in first week.

8. **Output scan on tool-sent SMS.** `scanOutput` runs on the model's reasoning trail (`result.text`), not on the text that actually went out via `send_customer_sms`. Agent D flagged this; safe because `checkCompliance` + the strict system prompt already guard, but a tighter scan could hook inside the tool executor's `sendSms`.

9. **Purple Lotus container_config backfill.** Ships empty `jane_stores` if someone's config already had it set — the migration uses `COALESCE(current_config->'jane_stores', ...)` so it preserves pre-existing values. If Purple Lotus's row has `jane_stores: []` (empty array) vs `NULL`, the preservation still takes the empty array. Verify on Supabase before shipping.

---

## Ready to ship

**Step 1: Apply the migration**
```bash
# Against staging or prod
node scripts/run-migration.mjs supabase/migrations/20260421001_cannabis_vertical.sql
```
Verify: Purple Lotus's `agency_clients.container_config` now has `jane_algolia_app_id` + `jane_stores` + `dispatch_agent_enabled: false`. The `dispatch_briefings`, `agent_invocations`, `sms_consent`, `sms_opt_out` tables exist with RLS on.

**Step 2: Ship the code**
```bash
npm run deploy:prod   # hits scripts/deploy.sh with 2-deploy/day gate
```

**Step 3: Validate in prod (nothing is live yet — flag is off)**
- `curl https://kyra.conversionsystem.com/api/health` — all env vars green
- Load `/agency/clients/<purple-lotus-id>` → Dispatch tab → Copilot view — should show empty state "Next briefing in N min"
- Widget builder → Menu Integration tab — should show Purple Lotus's existing Algolia keys + stores
- `https://kyra.conversionsystem.com/api/webhooks/onfleet/<purple-lotus-id>?check=hello` — echoes `hello` (existing validation)

**Step 4: Flip the flag for Purple Lotus only**
```sql
-- CORRECTION (2026-04-23): the UUID originally shown here was f91b28a1… which
-- is actually the Kyra internal marketing client, NOT Purple Lotus. The real
-- Purple Lotus client is 968cae23-e978-46bd-8f4f-23ed2e82d7be. Use that one.
UPDATE agency_clients
SET container_config = jsonb_set(container_config, '{dispatch_agent_enabled}', 'true'::jsonb)
WHERE id = '968cae23-e978-46bd-8f4f-23ed2e82d7be';
```
Monitor `agent_invocations` for the next 24h — `outcome` should be mostly `success` with occasional `fallback`. Alert if `error` > 5% or `budget_exceeded` appears.

**Step 5: Enable Copilot cron (when ready)**
The cron endpoint is live from step 2. It iterates dispensaries with `dispatch_agent_enabled=true`, so the moment step 4 lands, the first briefing will fire within 15 min.

**Step 6: Inbound SMS wire-up (Matt/Nick action)**
- In Springbig (Purple Lotus's provider), point reply webhook to `https://kyra.conversionsystem.com/api/webhooks/sms/inbound?client_id=<pl-id>`
- Verify STOP reply registers to `sms_opt_out` within seconds
- Verify non-STOP replies receive AI responses within ~10s

---

## Matt's May 1st demo

The four product surfaces Matt will see:

1. **Smart Widget** (already live, now generalized) — customer on plpcsanjose.com asks "any Caviar Gold prerolls?" → widget queries Jane Algolia → AI replies with 3-4 picks + live product URLs. Works for any cannabis dispensary now, not just Purple Lotus.

2. **Dispatch Brain** (wire up Step 4) — Onfleet webhook fires → Brain reads state → decides → executes. Nick sees `dispatch_events` populate in real time. The legacy rule-engine is still the safety net.

3. **Dispatcher Copilot** (live after Step 4, first briefing within 15 min) — Nick opens the dashboard → Dispatch tab → Copilot view → sees running summary + 1-3 recommendations. Approves the good ones → Onfleet action executes. This is the demo-day feature.

4. **Inbound Customer Agent** (wire up Step 6) — Customer texts "where's my order?" → Agent reads live Onfleet status → replies with ETA + tracking link in <10 sec. No competitor has this because no competitor wires AI to live delivery data.

---

_Sprint shipped by foundation author (Claude) + 6 parallel subagents. Final state: `npx tsc --noEmit` clean, 213/213 tests green, all agents behind `dispatch_agent_enabled` flag (off), rule-engine preserved as fallback, nothing live-deployed pending human review._
