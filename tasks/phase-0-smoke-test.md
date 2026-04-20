# Phase 0 Smoke Test — 15 minutes

**Purpose:** validate the 18 Phase 0 commits + secret rotations + RLS migration in production. Run this exactly ONCE after deploying Phase 0 to `kyra.conversionsystem.com`. If everything passes, Phase 0 is officially signed off and meet-kyra Phase 1 unblocks.

**Run by:** Steve + Angel together (one on laptop, one on phone — mobile-responsive check matters too).

**Before you start, have open:**
- [ ] `kyra.conversionsystem.com` in an **incognito / private window** (for unauthenticated checks)
- [ ] `kyra.conversionsystem.com/login` in a **normal window** (you'll sign in here)
- [ ] Vercel dashboard → Deployments → Logs (filter by "error" or "warn")
- [ ] Supabase dashboard → SQL Editor (one tab ready)
- [ ] Terminal with `curl` available

**Timer:** start it. You're aiming for 15 minutes end-to-end.

---

## Block 1 — External surface (2 min)

These confirm the fail-closed webhook + unauth admin fixes are live. No login required.

### ✅ 1.1 Admin endpoints now require auth (P0.3)

Run from terminal:

```bash
# Orphaned users — was an unauth email dump, now gated
curl -s -o /dev/null -w "%{http_code}\n" https://kyra.conversionsystem.com/api/admin/orphaned-users

# Health check — was an unauth env+DDL leak, now gated
curl -s -o /dev/null -w "%{http_code}\n" https://kyra.conversionsystem.com/api/admin/health-check
```

**PASS if:** both return `401`.
**FAIL if:** either returns `200` with JSON body (means the auth guard didn't deploy).

### ✅ 1.2 GHL webhook rejects unsigned requests (P0.8)

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://kyra.conversionsystem.com/api/webhooks/ghl \
  -H "Content-Type: application/json" \
  -d '{"type":"InboundMessage","locationId":"fake"}'
```

**PASS if:** returns `401` or `403`.
**FAIL if:** returns `200` (means fail-open pattern leaked back in, or GHL_WEBHOOK_SECRET is missing from Vercel).

### ✅ 1.3 Resend + Retell webhooks reject unsigned requests (P0.4, P0.5)

```bash
# Resend without svix-signature headers:
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://kyra.conversionsystem.com/api/webhooks/resend \
  -H "Content-Type: application/json" \
  -d '{"type":"email.opened"}'

# Retell without x-retell-signature:
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://kyra.conversionsystem.com/api/voice/retell/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"call_ended"}'
```

**PASS if:** both return `401`.

### ✅ 1.4 Next.js route conflict is resolved — `/ai-for/*` pages render (P0.10)

Open in incognito window:

- [ ] `https://kyra.conversionsystem.com/ai-for/dental` — should render the rich dental niche page (🦷 emoji, "AI Worker for Dental Practices" H1)
- [ ] `https://kyra.conversionsystem.com/ai-for/plumbing` — should render the template-generated plumbing page (🔧 emoji, generic "AI worker for plumbing" hero)
- [ ] `https://kyra.conversionsystem.com/ai-for/veterinary` — should render (was hidden by the route conflict before)

**PASS if:** all 3 pages load cleanly. No 404, no blank page, no React hydration error.

---

## Block 2 — Sign in + dashboard (5 min)

Now in the normal browser window, sign in as yourself (Steve or Angel — your agency account, not a master account).

### ✅ 2.1 Sign in works

- [ ] Navigate to `/login`
- [ ] Enter credentials, submit
- [ ] Land on `/agency` mission control

**PASS if:** signed in, no redirect loop, no 500 on the mission control page.

### ✅ 2.2 Mission control renders data (P0.11 — RLS on agency_credits hasn't broken reads)

- [ ] Credit balance pill is visible (top-right or sidebar)
- [ ] Number displays a real balance, not "—" or "Error"

**PASS if:** credit balance loads from `agency_credits` table — means RLS `agency_members_read` policy + service-role read both work.

### ✅ 2.3 Client list renders

- [ ] Navigate to `/agency/clients`
- [ ] See at least one client row (your agency's)

**PASS if:** the list shows. **FAIL if:** empty when it shouldn't be, or 500 error.

### ✅ 2.4 Credits page (P0.11 + P0.14)

- [ ] Navigate to `/agency/credits`
- [ ] Balance shows, transaction history lists (may be empty if new)
- [ ] Click "Buy Credits" or similar
- [ ] Modal opens with 3 packs

**PASS if:** modal opens. No 400 error. Clicking a pack should redirect to Stripe Checkout (don't actually complete the purchase unless you want to test live billing).

### ✅ 2.5 Billing page (P0.14)

- [ ] Navigate to `/agency/billing`
- [ ] See your current plan
- [ ] See "Manage subscription" or "Upgrade" button

**PASS if:** page loads + shows plan. Clicking "Manage" should open Stripe Customer Portal.

### ✅ 2.6 Email marketing tab renders (P0.11)

- [ ] Navigate to `/agency/clients/[your-first-client-id]`
- [ ] Click the **Marketing** tab (master-only — if you're not master-tier, skip this check)
- [ ] Sub-tab **Email**

**PASS if:** templates + contacts + campaigns lists load without a 500 error (they may be empty — that's fine, just confirms the RLS-hardened tables are readable).

### ✅ 2.7 CRM + contacts render

- [ ] Navigate to `/agency/crm/contacts`
- [ ] Contact list shows (may be empty)

**PASS if:** no error page.

---

## Block 3 — Real webhook flow (3 min)

Verify that signed webhooks actually land correctly now. This needs you to trigger a real event.

### ✅ 3.1 Resend webhook delivery (P0.4)

- [ ] In Resend dashboard → Webhooks → your endpoint
- [ ] Click **"Send test event"** (Resend has this button)
- [ ] Wait 5 seconds

**PASS if:** Resend shows 200 / "Delivered" for the test event.
**FAIL if:** 401 Unauthorized — means `RESEND_WEBHOOK_SECRET` in Vercel doesn't match the signing secret Resend uses.

### ✅ 3.2 GHL webhook delivery (P0.8)

- [ ] In any GHL sub-account connected to Kyra → Automation → Workflows
- [ ] Pick a workflow with a "Custom Webhook" action pointing at Kyra
- [ ] **Manually trigger** the workflow (add a test contact → trigger fires)
- [ ] Check Vercel logs within 10 seconds

**PASS if:** Vercel logs show `[ghl-webhook]` processing + no 401 lines.
**FAIL if:** 401 lines in Vercel logs — the GHL workflow doesn't have the secret appended (`?secret=<value>` or `x-webhook-secret` header). Go back and update that workflow's webhook config.

### ✅ 3.3 Stripe webhook (spot check — no real action needed)

- [ ] Stripe dashboard → Developers → Webhooks → `we_1TCcvQDr3LPJOIaMuaY1zJhG`
- [ ] Check "Events" tab — should show recent events with "Delivered" status

**PASS if:** the primary webhook is green + receiving events.
**FAIL if:** "Disabled" or "Last event failed" — check that `STRIPE_WEBHOOK_SECRET` is still set correctly in Vercel.

---

## Block 4 — Cross-tenant RLS verification (2 min)

Confirm the new RLS policies work end-to-end. Two paths:

### ✅ 4.1 SQL-Editor query as service role (should see all agencies)

In Supabase SQL Editor:

```sql
-- As service_role (SQL Editor uses service_role by default), should
-- return the total count across ALL agencies:
SELECT count(*) AS total_email_campaigns FROM email_campaigns;
SELECT count(*) AS total_agency_credits FROM agency_credits;
```

**PASS if:** both return non-zero integers (assuming you have any data). Service role bypasses RLS by design.

### ✅ 4.2 Dashboard queries properly scoped

Already covered in Block 2.6 — if the Email tab showed templates/contacts/campaigns, RLS agency_members_read policy is working.

---

## Block 5 — Vercel log sanity check (2 min)

Open **Vercel → Deployments → [latest production] → Logs** (or "Runtime Logs").

### ✅ 5.1 No 500s in the last 15 minutes

- [ ] Filter: `status >= 500`
- [ ] Review any lines from the last 15 minutes

**PASS if:** zero 500 errors, OR every 500 is from an expected source (e.g. a scheduled cron that had a transient error — fine as long as it's not related to your smoke-test URLs above).

### ✅ 5.2 No `[middleware]` request-log spam (P0.16)

- [ ] Filter: `middleware`
- [ ] Expected: ZERO lines in production (guarded behind `NODE_ENV !== 'production'`)

**PASS if:** zero middleware log lines in prod.
**FAIL if:** every page load shows a `[middleware] GET /some-path` — means the NODE_ENV guard didn't take effect. Check Vercel env var `NODE_ENV=production` is still set (Vercel auto-sets this, so it should be).

### ✅ 5.3 No unsigned-webhook errors from legitimate callers

- [ ] Filter: `401`
- [ ] Scan last 30 minutes

**PASS if:** 401s are either (a) your own curl tests from Block 1, or (b) early-morning scraper/bot traffic. Expected volume: <20/hour.
**FAIL if:** Resend sends 10+ 401s per minute → signing secret mismatch. Retell sends 401s → API key not configured for signing. GHL sends 401s → a customer workflow is missing the secret parameter.

---

## Block 6 — Mobile spot check (1 min)

Angel pulls out phone.

- [ ] Open `kyra.conversionsystem.com/login` on phone
- [ ] Sign in
- [ ] Land on `/agency`
- [ ] Tap "Clients" in sidebar (or hamburger on mobile)

**PASS if:** everything is tappable, no horizontal scroll, no broken layout.

---

## If ANY check fails

**Critical failures (rollback required):**
- Block 1.1 failing (admin leak back) → revert commit `a266204a`
- Block 1.2 failing (GHL webhook open) → revert commit `4f6b415a` OR set `GHL_WEBHOOK_SECRET` immediately
- Block 2.1 failing (sign-in broken) → check Supabase key rotation; revert if keys mismatch
- Block 2.2–2.7 failing with 500s → check Vercel logs; most likely RLS policy too tight. Use the rollback SQL from `tasks/solo-pro-roadmap.md` Block B.

**Degraded failures (non-blocking):**
- Block 3.1 or 3.2 failing → fix the relevant webhook secret, no deploy needed (just env var + reconfigure vendor side)
- Block 5.2 failing → cosmetic; fix in next deploy
- Block 6 failing → fix mobile responsive issues after launch

**Rollback full Phase 0 (nuclear option):**

```bash
# Find the commit just before Phase 0 started:
git log --oneline origin/main | head -25
# Should show 9bdbb95d (Merge PR #390) as the last pre-Phase-0 commit.

# From a clean state, revert Phase 0 commits:
git revert --no-commit 720e0ca8..c499f6a1
git revert --no-commit 2f4a3f53 e8dd95b3 7ad84d1a f0ac3772 7fbde99c af08a871 38f46d26 7a1b9f54 d5007198 4f6b415a 23333d9d ee1956db dca92b18 a266204a
git commit -m "rollback: Phase 0 security hardening (smoke test failed)"
npm run deploy:prod

# Then in Supabase SQL Editor, disable the new RLS policies (see
# tasks/solo-pro-roadmap.md Block B for the SQL).
```

You should NEVER need this. But it's documented.

---

## Sign-off

When all green:

- [ ] Angel: confirms Phase 0 smoke test passed
- [ ] Steve: commits this file with a note in the commit message:
  ```
  test: Phase 0 smoke test passed YYYY-MM-DD HH:MM
  Signed off by: Steve + Angel
  ```
- [ ] Slack / Telegram: "Phase 0 signed off. Starting meet-kyra Phase 1."

**Phase 0 is done. meet-kyra Phase 1 scaffolding begins whenever you say go.**
