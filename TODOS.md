# TODOS

Deferred work, grouped by component, then priority (P0 highest → P4). Completed
items move to the bottom. Seeded 2026-05-19 from the billing/widget-chat
reliability review (autoplan + /ship adversarial).

## Billing / Credit Engine

### Fully-atomic `addCredits` via Postgres RPC (close the crash-window)
**Priority:** P2 (was P1 — the dangerous part is now fixed)
**Context:** DONE in branch `fix/addcredits-atomic`: `addCredits()` now
inserts the `credit_transactions` ledger row FIRST and only applies the
balance delta on success; a 23505 unique violation is an idempotent no-op
(no balance mutation), and non-23505 insert errors no longer silently
credit. This removes the guaranteed double-grant. **Remaining residual:** a
process crash between the ledger insert and the balance update under-counts
by exactly one grant (recoverable by reconciling balance vs ledger; safe
direction). Closing that fully needs a single-statement Postgres RPC
(`SECURITY DEFINER` fn doing insert+balance in one transaction) — its own
migration. Lower priority now: the over-credit footgun is gone; this only
hardens a rare crash window.
**invoice.paid alias readiness:** now gated only on (a) migration
20260519001 applied to prod, and (b) `fix/addcredits-atomic` shipped — both
in flight. The RPC-atomic version above is a nice-to-have, not a blocker
for the alias (insert-first + the unique index already make the alias
safe against the concurrent-double-grant).

### E2 — `getAgencyCredits` must distinguish DB error from true zero
**Priority:** P2
**Context:** `credit-engine.ts:138-141` returns `{balance:0}` on a read error,
so a healthy paying tenant gets the canned "credits depleted" message and F4
telemetry fires a false depletion that misleads operators. F4's event needs a
"balance read failed" discriminator. (Eng-review finding E2, scoped out of the
P1 PR.)

### Repo-wide `.single()` misuse audit
**Priority:** P2
**Context:** Supabase `.single()` returns `{data:null}` WITHOUT throwing on
zero rows / some transient errors. `isAdminAgency` / `byok` were hardened, but
the assumption likely recurs across the 374 API routes wherever a catch-only
guard wraps a `.single()` that drives an auth or billing decision. Root cause
class behind the original outage.

### Approach C — take billing off the widget hot path
**Priority:** P3 (design)
**Context:** Replace per-message isAdmin/BYOK/credit DB lookups with one
short-TTL out-of-band cached resolver keyed by agencyId. Structurally removes
the whole "billing lookup on the realtime chat path" failure class. Correct
12-month direction; explicitly deferred from the incident fix. See the design
doc in `~/.gstack/projects/ConversionSystem-kyra/`.

## Widget Chat

### Distinct credits_depleted telemetry + absolute-floor alert
**Priority:** P2
**Context:** `app/api/widget/chat/route.ts:277` returns the canned message
with HTTP 200 and only a `console.warn`. Need a distinct telemetry event in
the Insights tab and an absolute-floor alert (balance < one Sonnet turn, not
allowance-relative, not month-suppressed) on an operational channel. The
operator found the original outage by using their own widget. (F4/F5.)

### Rate limiter must fail CLOSED for the unauthenticated widget
**Priority:** P2
**Context:** `lib/rate-limit.ts` fails OPEN on a DB error. Combined with the
free-AI bypass path that is now correctly skipped for admin/paid-BYOK, a
rate-limiter blip = unthrottled Sonnet calls (DoS-of-wallet). The widget
should enforce a conservative in-memory ceiling when the rate-limit DB check
errors. (Eng finding S1.)

### Await the takeover saveConversation; surface low-balance notify failure
**Priority:** P2
**Context:** `route.ts:301` `void saveConversation(...)` is fire-and-forget
(CLAUDE.md rule #4 — lost on Vercel serverless if the fn returns first).
`credit-engine.ts:279` swallows `fireLowBalanceNotification` failure entirely.

### Collapse duplicate `agencies` reads on the credit path
**Priority:** P2
**Context:** `resolveAgencyApiKey` and `isAdminAgency` each independently
SELECT the same `agencies` row per widget message. Collapse into one shared
fetch; memoize `resolveAgencyApiKey`. (Perf finding F2.)

### Feature-flag the bypass as an env/build constant
**Priority:** P2
**Context:** A regression in the credit-gate behavior should be a config flip,
not a redeploy — but the flag must be an env/build constant (no per-request DB
read on the hot path) and must fail TOWARD the safe behavior. (Eng H1.)

### F7 — reverse the manual +30k credit top-up
**Priority:** P3
**Context:** Only after the positive-only-cache fix is proven live on cold
instances. Single transaction against the live `agency_credits` row; leave
balance ≥ one Sonnet turn as a floor. (Eng H2.)

## Repo Hygiene

### CHANGELOG is ~3 months stale
**Priority:** P3
**Context:** Top entry was `[0.3.0] - 2026-02-09` while 30+ feature PRs
(#485–#515: website-editor sprints, insights v4–v6, widget) shipped since with
no CHANGELOG entries. `package.json` was `0.1.0` (drift) until this PR aligned
it to `0.3.1`. Either backfill the gap or accept CHANGELOG is per-release-only
and document that convention.

## Completed

### T12 — lib/stripe/webhooks consumer preflight
**Completed:** v0.3.1 (2026-05-19) — verified zero importers (only the deleted
route + an unused barrel re-export) and zero `agency_billing` consumers before
deleting the dead route and orphaned lib.
