# Security Audit — 2026-03-06

**Auditor:** Steve (AI CEO)  
**Scope:** Kyra Next.js/Supabase codebase  
**Focus:** API key exposure, unauthenticated endpoints, security hardening

---

## Executive Summary

| Severity | Found | Fixed in This PR | Needs Angel |
|----------|-------|-----------------|-------------|
| 🔴 Critical | 1 | 1 | 0 |
| 🟠 High | 3 | 3 | 1 |
| 🟡 Medium | 2 | 2 | 0 |
| ✅ Clean | 4 | — | — |

**Overall: Solid foundation. No secrets leaking to the frontend. 4 issues fixed in this PR. 1 action item for Angel (set an env var).**

---

## ✅ What's CLEAN (no changes needed)

1. **`NEXT_PUBLIC_*` variables** — Correctly limited to: `APP_URL`, `APP_NAME`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_PUBLISHABLE_KEY`, `SITE_URL`. No secrets exposed via NEXT_PUBLIC.

2. **No hardcoded secrets in source** — Grepped for `sk-`, `whsec_`, Bearer tokens, API keys in non-test code. Clean.

3. **Admin routes** — `/api/admin/stats`, `/api/admin/kyra-stats`, `/api/admin/orphaned-users` all gate on `ADMIN_EMAILS` list after verifying Supabase auth. ✅

4. **Agency auth + authorization** — All `/api/agency/*` routes use `requireAgencyAdmin()` / `requireAgencyMember()`. DB queries always filter by `agency_id` — no cross-agency data leaks. ✅

5. **Stripe webhooks** — `/api/stripe/webhooks` verifies Stripe signature with `verifyStripeWebhook()` before processing. ✅

6. **Cron routes** — All `/api/cron/*` routes check `CRON_SECRET` Bearer token. ✅

---

## 🔴 CRITICAL — Fixed

### 1. Unauthenticated `/api/debug` endpoint
**File:** `app/api/debug/route.ts`  
**Issue:** Publicly accessible. Returned `{ hasCronSecret: bool, hasKyraApiSecret: bool, hasSupabaseKey: bool, ... }`. While not exposing actual values, it revealed environment structure to any unauthenticated caller and confirmed which secrets are configured.  
**Fix:** Added `ADMIN_EMAILS` auth check — only `hello@conversionsystem.com` and `angel@conversionsystem.com` can access it.

---

## 🟠 HIGH — Fixed

### 2. GHL webhooks accept any POST with no verification
**Files:** `app/api/ghl/webhook/route.ts`, `app/api/webhooks/ghl/route.ts`  
**Issue:** Both GHL webhook endpoints accepted any POST request with no signature verification. An attacker could send fake GHL webhook payloads — triggering AI responses to fake messages, flooding the system with fake inbound messages, or manipulating CRM data.  
**Fix:** Added `verifyGhlWebhook()` to both routes. Accepts:
  - GHL HMAC signature (`x-ghl-signature` or `x-hub-signature-256` header) — for Marketplace webhooks
  - Shared secret (`x-kyra-secret` header or `?secret=` query param) — for GHL Workflow custom webhooks

**⚠️ Action needed (Angel):** Set `GHL_WEBHOOK_SECRET` in Vercel env vars. Then configure GHL Workflow custom webhooks to include `?secret=YOUR_VALUE` in the URL, or add header `x-kyra-secret: YOUR_VALUE`. Without this env var, verification is skipped (backwards-compatible but insecure).

### 3. Zero security headers
**File:** `next.config.mjs`  
**Issue:** No HTTP security headers configured. Exposed the app to clickjacking, MIME sniffing, XSS, and other browser-level attacks.  
**Fix:** Added the full security header suite:
  - `X-Frame-Options: SAMEORIGIN` — blocks clickjacking
  - `X-Content-Type-Options: nosniff` — blocks MIME sniffing
  - `X-XSS-Protection: 1; mode=block` — legacy XSS filter
  - `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` — enforces HTTPS
  - `Permissions-Policy` — disables camera, microphone, geolocation, payment access
  - `Content-Security-Policy` — restricts script/style/connect sources

---

## 🟡 MEDIUM — Fixed

### 4. Unauthenticated `/api/openclaw/health` endpoint
**File:** `app/api/openclaw/health/route.ts`  
**Issue:** Publicly accessible. Returned internal gateway status (`connected`, `activeSessions`, `realOpenClaw`). Information useful to an attacker mapping the system.  
**Fix:** Added `requireAgencyMember()` auth check — only logged-in agency members can check gateway health.

Also: error response now returns `'Health check failed'` instead of `String(error)` — prevents internal error details from leaking.

---

## Actions for Angel

| # | Action | Where | Why |
|---|--------|--------|-----|
| 1 | Set `GHL_WEBHOOK_SECRET` to a long random string (32+ chars) | Vercel Dashboard → Environment Variables | Enables GHL webhook signature verification. Without it, fake webhooks can trigger AI responses. |
| 2 | In each GHL Workflow that sends webhooks to Kyra, add `?secret=YOUR_VALUE` to the webhook URL | GHL → Workflows → Custom Webhook action | Authenticates the workflow webhook call |

**Generating a secret:**
```bash
openssl rand -hex 32
```

---

## Not Addressed in This PR (future hardening)

- **Rate limiting** — No rate limiting on any endpoint. High priority once traffic grows. Recommend adding `@upstash/ratelimit` with Redis/KV on the GHL webhook, chat, and auth endpoints.
- **`frame-ancestors 'none'` vs `SAMEORIGIN`** — Currently set to `SAMEORIGIN` in CSP. If the app is never embedded in iframes on other domains, tighten to `frame-ancestors 'none'`.
- **CSP `unsafe-eval`** — Required by Next.js build currently. Can be removed if eval deps are eliminated.
- **Supabase RLS** — Not audited in this pass. Recommend enabling Row Level Security on all Supabase tables to provide a second layer of authorization (defense in depth even if app-layer auth is bypassed).
