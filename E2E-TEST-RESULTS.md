# Kyra E2E Test Results — Signup → Stripe → Chat Flow

**Date:** 2026-02-11  
**Tester:** AI Code Review (subagent)  
**Site:** https://kyra.conversionsystem.com

## ✅ Site Status

Landing page loads correctly (HTTP 200). Pricing, features, and signup CTAs all render.

## Flow Summary

```
Landing Page → /signup?plan=X → Supabase Auth (email or Google OAuth)
  → Email: confirm email → /api/auth/callback → /chat
  → Google: OAuth → /api/auth/callback?redirect=/chat?plan=X → /chat?plan=X
  → PlanRedirect component detects ?plan= → POST /api/billing/checkout → Stripe Checkout
  → Stripe success → /chat?upgraded=true
  → Stripe webhook → updates user plan in DB
```

## 🐛 Issues Found

### 1. **CRITICAL: Email signup with paid plan — Stripe checkout race condition**

**File:** `app/(auth)/signup/page.tsx` → `redirectAfterAuth()`

When a user signs up via **email** with a paid plan selected:
- `signUp()` returns a user but no session (email confirmation required)
- The `success` screen shows "check your email"
- After clicking the confirmation link, they hit `/api/auth/callback` which redirects to `/chat` (default)
- **The `?plan=` parameter is LOST** — the callback redirect defaults to `/chat`, not `/chat?plan=starter`

**Impact:** Users who sign up via email for a paid plan will land on `/chat` with no Stripe checkout triggered. They end up on the free tier.

**Fix:** Pass the plan through the email confirmation flow. Options:
- Store selected plan in the user's metadata during signup, then check it on `/chat` load
- Append `?plan=X` to the `emailRedirectTo` callback URL

### 2. **MEDIUM: Google OAuth plan parameter URL encoding**

**File:** `app/(auth)/signup/page.tsx` → `handleGoogleSignup()`

```js
const redirectTo = selectedPlan
  ? `${window.location.origin}/api/auth/callback?redirect=/chat?plan=${selectedPlan}`
  : `${window.location.origin}/api/auth/callback`;
```

The redirect URL has nested query params without encoding: `/api/auth/callback?redirect=/chat?plan=starter`. When Supabase processes this, the `?plan=starter` part may be interpreted as a separate param on the callback URL itself rather than part of the `redirect` value.

**Impact:** The `redirect` param parsed in callback may be just `/chat` (truncated at `?`), losing the plan. Depends on how Supabase passes through the redirect URL.

**Fix:** URL-encode the redirect value:
```js
const redirectTo = `${origin}/api/auth/callback?redirect=${encodeURIComponent(`/chat?plan=${selectedPlan}`)}`;
```

### 3. **LOW: Auth callback doesn't preserve query params on redirect**

**File:** `app/api/auth/callback/route.ts`

```js
const redirect = searchParams.get('redirect') || '/chat';
return NextResponse.redirect(`${origin}${redirect}`);
```

This works IF `redirect` includes query params. But per issue #2, the `redirect` value may get truncated. No additional validation or logging.

### 4. **LOW: No credit allocation on signup**

**File:** `app/api/billing/webhook/route.ts`

When `checkout.session.completed` fires, the webhook updates `plan`, `stripe_customer_id`, and `stripe_subscription_id`. But there's no credit allocation — the 500/3000/8000 credits promised on the pricing page aren't being set.

**Impact:** Users pay but may not receive credits unless there's a separate mechanism (trigger, cron, or the app reads credits from the plan field). Needs verification — check if credits are derived from plan at runtime or stored separately.

### 5. **LOW: No user row creation on signup**

The webhook and checkout flow assume a `users` row exists with the user's ID. If the Supabase trigger that creates user rows on `auth.users` insert fails or doesn't exist, the `UPDATE ... WHERE id = userId` in the webhook will silently succeed but update 0 rows.

**Impact:** Plan upgrade silently lost. Add `.select()` after update and check returned rows.

### 6. **INFO: Missing admin route protection**

**File:** `lib/supabase/middleware.ts`

Protected paths: `/chat`, `/memories`, `/settings`. The `/admin` path is NOT in the protected list — it's accessible without auth at the middleware level (though the page component may have its own check).

## ✅ Things That Look Good

- **Stripe webhook signature verification** — properly validates signatures
- **Webhook idempotency** — handles subscription updates and cancellations correctly
- **Middleware session refresh** — correctly refreshes Supabase sessions
- **Auth page redirect** — logged-in users correctly redirected away from `/login` and `/signup`
- **Customer reuse** — existing `stripe_customer_id` is passed to avoid duplicate Stripe customers
- **PlanRedirect component** — clean pattern for triggering checkout after OAuth redirect, with ref guard against double-trigger

## Recommended Priority

1. **Fix email signup plan loss** (critical — paid conversions broken for email users)
2. **Fix Google OAuth URL encoding** (medium — may break paid conversions for Google users)
3. **Verify credit allocation** (low — may already work via plan-based derivation)
4. **Add admin route to middleware** (low — defense in depth)
