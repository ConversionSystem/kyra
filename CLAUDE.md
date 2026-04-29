# CLAUDE.md — Development Guide for Kyra

## Golden Rules

1. **SIMPLICITY ABOVE ALL.** Less code = fewer bugs. If 5 lines solve it, don't write 50.
2. **PRs always** — never push directly to main.
3. **`npx tsc --noEmit` must pass** before any commit.
4. **Await all DB writes** — fire-and-forget = data loss on Vercel serverless.
5. **CORS on every response path** — including error paths, not just success.
6. **"AI workers" not "AI employees"** — in all user-facing copy.

---

## Project Overview

**Kyra** is a white-label AI workforce platform for agencies, built on OpenClaw. Agencies deploy, manage, and monetize autonomous AI workers for their clients.

- **Dashboard:** Next.js 15 (App Router) on Vercel
- **Database:** Supabase (PostgreSQL)
- **AI Runtime:** Per-client OpenClaw containers on OVH VPS
- **Payments:** Stripe subscriptions + credit system
- **CRM Integration:** GoHighLevel (GHL) Private Integration Tokens

---

## Development Workflow

### 1. Before Writing Code
- Read the relevant files in the codebase first
- Check for existing patterns — don't reinvent
- `git checkout -b feat/your-feature main`

### 2. Writing Code
- TypeScript strict — no `any` unless truly necessary
- Follow existing patterns in `lib/` and `app/api/`
- Every API route needs: auth check, input validation, try/catch, proper status codes

### 3. Before Committing
```bash
npx tsc --noEmit    # Must pass — zero errors
```

### 4. Deploying
```bash
npx vercel --prod --yes    # CLI only. Never GitHub Actions.
```

---

## Critical Rules (NEVER VIOLATE)

### Vercel Deploy Rules
- **ALL deploys via CLI only** (`npx vercel --prod --yes`)
- **NEVER add a deploy job to GitHub Actions** — CI is TypeScript + lint check ONLY
- **MAX 1-2 CLI deploys per work session** — batch all changes, deploy once at the end
- **Delete old deployments** after each session: `npx vercel ls kyra` then `npx vercel rm <url> --yes`
- **Commit often, deploy rarely** — git commit after each fix, but only deploy at the end
- **Delete feature branches** after merging PRs

### Vercel CLI Gotcha
`echo "value" | vercel env add` adds trailing `\n`. Always use `printf "value" | vercel env add`.

### Database Rules
- **Await ALL Supabase calls** — unawaited = silent data loss on Vercel serverless
- **Use `resolveClientGateway()`** — never use raw `gateway_status` from DB (can be stale)
- **CORS on all `/api/widget/*` routes** — `Access-Control-Allow-Origin: *` on EVERY response path (success AND error AND OPTIONS)
- **Rate limit unauthenticated endpoints** — use `isRateLimited()` from `lib/rate-limit.ts`

### Content & Brand Rules
- **NEVER use "$29M" stat** — that's pre-Kyra cannabis client work
- **NEVER claim "500+ agencies", "#1 platform"** or unverified social proof
- **"AI workers"** not "AI employees" everywhere
- **Plans:** Lite $99 / Pro $299 / Scale $499 (internal key still 'starter' for Lite)
- **Sidebar** = always dark `bg-gray-900` (no `primary_color` override)

---

## Architecture Decisions

### Hybrid AI Architecture
1. **Simple chat (80%):** Dashboard → LLM API directly. No gateway. Fast, cheap.
2. **Autonomous tasks (20%):** Per-client isolated OpenClaw containers on VPS.
3. **Agency dashboard:** Pure Kyra (Supabase + Vercel). No gateway dependency.

### API Route Patterns
Every API route should follow this pattern:
```typescript
export async function POST(req: NextRequest) {
  try {
    const session = await requireAgencyMember(req);  // Auth check
    const body = await req.json();                    // Parse input
    // ... validate input ...

    const { data, error } = await supabase            // DB operation
      .from('table')
      .insert(body);

    if (error) throw error;

    return NextResponse.json({ data });               // Success
  } catch (err) {
    console.error('[route-name]', err);
    return NextResponse.json(
      { error: 'Description' },
      { status: 500 }
    );
  }
}
```

### Auth Patterns
- `requireAgencyMember(req)` — Dashboard routes (any agency member)
- `requireAgencyAdmin(req)` — Admin-only routes
- `requireClientAccess(req, clientId)` — Client-specific routes (verifies agency owns client)
- `getAgencyForUser(userId)` — Get agency context for authenticated user
- Widget routes — unauthenticated but rate-limited

### Credit System
```typescript
const credits = await getAgencyCredits(agencyId);  // Returns CreditBalance object
await deductCredits(agencyId, 'action_key', { opts });  // NOT (id, amount, action, desc)
```
BYOK agencies (with their own API key) pay zero platform credits.

---

## Key File Locations

| What | Where |
|------|-------|
| Dashboard pages | `app/(dashboard)/agency/` |
| API routes | `app/api/` |
| Auth helpers | `lib/auth/` |
| OpenClaw container mgmt | `lib/openclaw/` |
| GHL integration | `lib/ghl/` |
| CRM logic | `lib/crm/` |
| Pipeline + follow-ups | `lib/pipeline/` |
| Billing / credits | `lib/billing/` |
| Chat widget | `app/api/widget/`, `components/widget/` |
| Voice (Twilio/Retell) | `lib/voice/`, `app/api/voice/` |
| SQL migrations | `supabase/migrations/` |
| Site builder templates | `lib/sites/` |

---

## VPS / Container Rules

- **Container RAM:** 1536MB minimum (OOM at 1024MB with OpenClaw v2026.4.26)
- **Model config:** Always use provider prefix (`openai/gpt-4o-mini` not `gpt-4o-mini`)
- **Config keys that work:** `gateway.auth`, `gateway.trustedProxies`, `gateway.http.endpoints`, `gateway.controlUi`, `agents.defaults.model`, `channels`, `plugins`
- **Config keys that DON'T work:** `dm`, `groupPolicy`, `meta.*`, `gateway.http.trustedProxies`
- **Auth token source:** Always from `meta.json` — NEVER from `docker inspect` env vars
- **After container restart:** ALWAYS reload CSS proxy: `docker exec kyra-css-proxy nginx -s reload`
- **Cold-start time:** 60-90 seconds on v2026.4.26 (model pricing fetch from OpenRouter/LiteLLM)
- **Healthcheck:** 15s timeout, 60s start-period

---

## Testing

```bash
npx tsc --noEmit         # Type check (required)
npm run build            # Full build test
npx vitest run           # Unit tests (when available)
```

Widget endpoints can be tested with curl:
```bash
# CORS check
curl -X OPTIONS -H "Origin: https://example.com" https://kyra.conversionsystem.com/api/widget/chat

# Chat endpoint (should return 400 with empty body, not 500)
curl -X POST -H "Content-Type: application/json" -d '{}' https://kyra.conversionsystem.com/api/widget/chat
```

---

## Common Tasks

### Add a new API route
1. Create `app/api/your-route/route.ts`
2. Add auth check (`requireAgencyMember` or `requireClientAccess`)
3. Validate input
4. Await all DB operations
5. Return proper status codes
6. Add CORS headers if it's a widget/public route

### Add a new dashboard page
1. Create under `app/(dashboard)/agency/your-page/`
2. Create `page.tsx` (server component) + `your-page-client.tsx` (client component)
3. Add to sidebar navigation in `components/dashboard/`
4. Follow existing Tailwind patterns

### Provision a new client container
- Dashboard handles this via the provisioner API
- Provisioner URL: configured via `OVH_PROVISIONER_URL` env var
- Each client gets: openclaw.json, devices/, workspace/, auth-profiles.json

### Run SQL migrations
Migrations are NOT auto-applied. Copy the SQL from `supabase/migrations/` and run in the Supabase SQL Editor manually.
