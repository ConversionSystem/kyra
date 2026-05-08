## Page layer — route groups & top-level routes

The `app/` tree is divided across five Next.js route groups — `(auth)`, `(dashboard)`, `(onboarding)`, `(portal)`, `(public)` — and a long tail of top-level segments mostly dedicated to the programmatic-SEO and deal-pitching surface. The root layout (`app/layout.tsx:10-50`) owns all global metadata (`metadataBase`, OpenGraph, Twitter cards, `alternates: {types: {'application/rss+xml': '/feed.xml'}}`) and injects `MetaPixelBase`. There is no global nav — each public page imports `PublicNav` / `PublicFooter` from `components/layout/`, which is the reason the "public" surface is scattered across top-level segments rather than contained inside `(public)`.

### (auth)

No `(auth)/layout.tsx` — only a `(auth)/login/layout.tsx:1-4` that does nothing except force dynamic rendering. The group holds an irregular mix: the canonical login/signup funnel plus four unrelated "activation" landing pages (`solo`, `build`, `website-builder`, `get-started`) that happen to share `force-dynamic` but have no layout or auth guard in common.

Auth funnel (all client components, `'use client'` with `Suspense` fallbacks so they can read `useSearchParams`):
- `(auth)/login/page.tsx:12-30` — password + Google; honours `?redirect` defaulting to `/agency`.
- `(auth)/login/impersonate/page.tsx:8-40` — reads `?e`/`?p`/`?n`, signs out, then `signInWithPassword`. This is a master-tools route, but lives here and has no server-side gate — entirely a client component. Anyone who guesses the URL is harmless (they still need the password in the query), but it's odd that it's not inside `(dashboard)/master`.
- `(auth)/forgot-password/page.tsx:11-17`, `(auth)/reset-password/page.tsx:12-20` — Supabase password flows.
- `(auth)/signup/page.tsx:1-6` — **stub** that `redirect('/signup/agency')`; personal signup is gone.
- `(auth)/signup/agency/page.tsx:1-7` — thin server wrapper around `AgencySignupWrapper` (the multi-step agency onboarding).
- `(auth)/signup/success/page.tsx:14-26` — post-signup viral screen reading `?agencyId`, showing invite link + `EarlyBirdCountdown`. Redirects to `next` if `agencyId` missing.

Activation funnel (four variants of the same landing pattern — all client-side wizards; differ only in copy + step sequence):
- `(auth)/solo/page.tsx` — free "solo" onboarding, 6-step wizard, branded dark.
- `(auth)/build/page.tsx` — "website-first" entry (step 01–03 description of how the builder works).
- `(auth)/website-builder/page.tsx` — worker-type picker (feeds `plan` + worker choice into the signup wizard).
- `(auth)/get-started/page.tsx` — generic wizard that starts with business details and ends at the AI personality.

All four ultimately POST to the same auth API routes and land in `/agency` — but each is a separate client component with its own hand-authored copy, so keeping them in sync when plans/features change is manual.

### (dashboard)

The authenticated app surface — all routes under `/agency/*`. Single layout at `(dashboard)/agency/layout.tsx:7-38`: it (a) reads the Supabase user, redirects `→ /login` if missing, (b) calls `getAgencyForUser(user.id)` and redirects `→ /signup/agency` if missing, (c) derives `isMaster` from a hard-coded two-email list (`layout.tsx:21`), (d) renders `<AgencySidebar />` + children inside a flex shell. **There is no `CommandPaletteWrapper` import**, confirming removal.

`AgencySidebar` (`agency-sidebar.tsx:76-105`) now drives the nav via two sections: a primary block (Mission Control, Analytics [master-only], Intelligence [pro/scale], Clients, Terminal, Inbox, Websites [master-only], SEO/GEO [master-only], Build Requests) and a collapsible "Account" block (Billing, Referrals, API Keys, Settings, Help & Support, What's New). CRM is no longer a sidebar entry ("CRM now lives inside each client's dashboard"); the same applies to Agents, Channels, AI Setup, Autopilot, Performance, Website — all of which still exist as routes but are stub redirects.

Stub redirect pages (pure one-liners, `redirect(...)`, no auth check of their own because they bounce before the layout matters):
- `(dashboard)/agency/agents/page.tsx:5` → `/agency/clients`
- `(dashboard)/agency/ai-setup/page.tsx:5` → `/agency/clients`
- `(dashboard)/agency/channels/page.tsx:5` → `/agency/clients`
- `(dashboard)/agency/ghl-setup/page.tsx:5` → `/agency/clients`
- `(dashboard)/agency/autopilot/page.tsx:5` → `/agency/automations`
- `(dashboard)/agency/performance/page.tsx:5` → `/agency/clients`
- `(dashboard)/agency/website/page.tsx:7` → `/agency/clients`

The Mission Control page (`(dashboard)/agency/page.tsx:22-200`) is the primary dashboard. It re-runs the same user→agency guard (`page.tsx:23-29`) already done by the layout, then hydrates `MissionControlLive` with plan-limit logic inlined: `planLimits: Record<string, number> = { free: 1, solo_pro: 1, starter: 4, pro: 11, scale: 21 }` (`page.tsx:49`). That same table lives in `lib/billing/plans.ts` — it's duplicated here so the "Add Client" button visibility can be rendered server-side.

Fully-fledged subroutes: `analytics`, `api-keys`, `audit`, `automations`, `billing`, `build-requests`, `calendar`, `clients` (+ `[id]`, `[id]/booking`, `[id]/seo-guide`, `[id]/site-portal`, `new`), `credits`, `crm` (+ `contacts`, `contacts/[id]`), `email`, `intelligence`, `referrals`, `review-queue`, `seo`, `settings` (+ `webhooks`), `sites`, `templates`, `usage`, `voice`, `widget`, `website/bulk`, `website/create`, `website/quick-start`, `website/[siteId]/editor|growth|seo|settings`. The ones that are `'use client'` at the top level (`widget`, `calendar`, `sites`, `build-requests`, `audit`, `website/*`, etc.) load the user via `fetch('/api/...')` and skip the layout's RSC auth entirely.

`(dashboard)/agency/crm/page.tsx:1-5` and `email/page.tsx:1-5` are one-line wrappers that simply render a named client component — a shallow-RSC pattern used a lot to avoid re-doing the auth preamble.

### (onboarding)

One layout, one page. `(onboarding)/layout.tsx:1-16` is a minimal "skip setup" header with a gradient background — no auth guard. `(onboarding)/onboarding/page.tsx:9-30` is the gate: reads user, redirects to `/login`, loads `getAgencyForUser`, redirects to `/signup/agency` if missing, and `redirect('/agency')` if `settings.onboarding_complete` is already true. Otherwise it hands off to the `OnboardingWizard` client.

### (portal)

White-label client-facing. `(portal)/layout.tsx:1-4` is literally `return <>{children}</>` — the comment explicitly says "Sub-account portal — no agency sidebar". Two pages:
- `(portal)/client-portal/[clientId]/page.tsx:10-60` — server component. Looks up `agency_clients` via service client, resolves agency (for branding), then checks membership in *either* `agency_members` or `sub_account_members`; master emails bypass. Unauthorised users get redirected to `/client-portal/[clientId]/request-access` (the directory exists but the page does not — dead redirect target).
- `(portal)/client-portal/invite/[token]/page.tsx:10-40` — accept-invite flow. If not logged in, redirects with `?next=/client-portal/invite/${token}`.

### (public)

`(public)` has **no layout** — routes just inherit the root. Four pages:
- `(public)/launch/page.tsx` — "Kyra Launch" marketing/announcements.
- `(public)/playground/page.tsx:1-30` — a sandbox template picker (inlines 20+ template metadata to avoid importing a server module in a client file — duplicates data already in `INDUSTRY_TEMPLATES`).
- `(public)/tools/ai-readiness/page.tsx:1-30` — quiz/lead-magnet.
- `(public)/workers/page.tsx:1-30` and `(public)/workers/[id]/page.tsx:10-30` — browseable directory backed by `agency_clients` with `status != 'deleted'`. Acts as a public "here are real workers in our network" page. No agency gate — serves whatever clients exist.

### Top-level public / marketing surface

The group segments only cover ~12 public pages — the rest are scattered across ~25 top-level dirs. This is where most of the SEO weight lives.

**Hand-authored marketing:**
- `app/page.tsx:55` — homepage. Server component, imports `DemoChat` from `demo/[industry]/demo-chat`.
- `app/pricing/page.tsx` (`'use client'` so it can pixel-track billing clicks), `vs/page.tsx`, `compare/mission-control/page.tsx`, `use-cases/page.tsx`, `roi/page.tsx` (`'use client'` — ROI calculator), `cannabis/page.tsx`, `ecommerce/page.tsx`, `india/page.tsx` (HighLevel LIVE India 2026 — still timely), `march-16/page.tsx` (March 16 demo — past SF event, stale).
- `app/openclaw/page.tsx`, `web-intelligence/page.tsx`, `ghl/page.tsx`, `ghl-marketplace/page.tsx`, `ghl-snapshot/page.tsx`, `zapier/page.tsx` — partner/integration pages.
- `app/partners/page.tsx`, `help/page.tsx`, `changelog/page.tsx`, `privacy/page.tsx`, `terms/page.tsx`, `unsubscribe/page.tsx` (`'use client'`), `get-demo/page.tsx` (`'use client'`).

**Programmatic SEO (dynamic segments under static routes):**
- `app/ai-for/page.tsx` (index of 50 industry templates, grouped by category at `ai-for/page.tsx:19-28`).
- `app/ai-for/[slug]/page.tsx:10-12` — generates 50 static pages via `generateStaticParams` from `INDUSTRY_TEMPLATES`.
- `app/ai-for/[niche]/page.tsx` — hand-curated richer pages (pain/result/FAQ/stats). No `generateStaticParams`; catches unknown niches with `notFound()`.
- `app/demo/[industry]/page.tsx`, `app/try/[industry]/page.tsx`, `app/for/[industry]/page.tsx`, `app/for/page.tsx` (cold-outreach landing, reads `?name=&agency=&niche=`).
- `app/blog/page.tsx` + `blog/[slug]/page.tsx:7` (posts from `lib/blog/posts`).
- `app/guides/page.tsx` + `guides/[id]/page.tsx:6-8` (`SETUP_GUIDES` with `generateStaticParams`).

### Top-level portal / agency-facing routes

- `app/portal/[clientId]/page.tsx:7-60` — **public** chat portal (no auth; service client fetches `agency_clients` then renders `PortalChat`). Supports `?terminal=1` to redirect to raw OpenClaw. This is the sibling of `(portal)/client-portal/[clientId]` but unauthenticated — the consolidation is incomplete.
- `app/report/[clientId]/page.tsx:1-60` — `'use client'` public report view (fetches `/api/portal/reports/...`).
- `app/terminal/[clientId]/page.tsx:20-40` — server-side redirect to `${gateway.url}/__openclaw__/#token=...`. Gates: requires user + agency match.
- `app/a/[agencyId]/page.tsx:57-110` — public agency profile backed by `agencies` + active client industries.
- `app/results/[agencySlug]/page.tsx:24-50` — public results page, but respects `settings.public_results === false` → returns null → `notFound()`.
- `app/pitch/page.tsx`, `pitch/ai-agency/page.tsx`, `pitch/agencies/page.tsx`, `pitch/inbound-growth/page.tsx` — four separate slide decks, all `'use client'`, each with its own SLIDES array (no shared structure).
- `app/pitch/[agencyId]/[industry]/page.tsx` — personalized sales deck; pulls an agency record and renders `PitchContent` (server component).

### Special route handlers

- `app/llms.txt/route.ts:6-61` — `force-static` GET that emits a Markdown `# Kyra` file per the `llmstxt.org` spec. 1-day cache. Hard-codes plan pricing ($99/$299/$499) in prose — also drift risk vs `lib/billing/plans.ts`.
- `app/llms-full.txt/route.ts:29-103` — `force-static` GET that stringifies every post in `lib/blog/posts` (after `stripHtml`) plus the full `INDUSTRY_TEMPLATES` list. Same drift: hard-codes prices (`llms-full.txt/route.ts:64`).
- `app/feed.xml/route.ts:21-62` — `force-static` RSS 2.0 rendered from `POSTS`, `lastBuildDate` from the newest post. 1-hour `max-age` / 1-day `s-maxage`.
- `app/invite/[code]/route.ts:13-80` — looks up agency via `settings->>invite_code`, increments click counter, sets `kyra_ref` cookie `httpOnly: false` (line 65) with comment "readable by client JS as a fallback", redirects to `/solo?ref=...&from=...`.
- `app/ref/[agencyId]/route.ts:7-26` — sets the same cookie name but `httpOnly: true` (line 21). **These two cookie-setters disagree.**
- `app/sitemap.ts:7-59` — core + blog + 50 industry + demo + try pages. Note: no `/guides/*` entries (blog is included; guides are absent from sitemap).
- `app/robots.ts:3-22` — allows `/`, disallows `/api/`, `/agency/`, `/admin/`, `/portal/`, `/(auth)/`, `/signup/`, `/login`. **The `/(auth)/` entry is dead** — Next.js route groups don't exist in URLs, so nothing is at `/(auth)/` and the rule only wastes a line. Note also that `/master/` is not disallowed.
- `app/not-found.tsx:1-27` — 404 page with links to `/` and `/try/dental`.

### Dynamic segments catalogue

| Segment | File | Source |
| --- | --- | --- |
| `[slug]` | `ai-for/[slug]/page.tsx:10` | `INDUSTRY_TEMPLATES` (50 items, `generateStaticParams`) |
| `[niche]` | `ai-for/[niche]/page.tsx` | in-file `NICHES` record |
| `[industry]` | `demo/[industry]/page.tsx`, `try/[industry]/page.tsx`, `for/[industry]/page.tsx` | in-file `DEMOS`/`INDUSTRIES`/`PAGES` records |
| `[slug]` | `blog/[slug]/page.tsx:9` | `POSTS` via `lib/blog/posts` |
| `[id]` | `guides/[id]/page.tsx:6-8` | `SETUP_GUIDES` |
| `[clientId]` | `portal/[clientId]`, `report/[clientId]`, `terminal/[clientId]`, `(portal)/client-portal/[clientId]` | `agency_clients` row |
| `[agencyId]` | `a/[agencyId]`, `ref/[agencyId]`, `pitch/[agencyId]/[industry]` | `agencies` row |
| `[agencySlug]` | `results/[agencySlug]` | `agencies.slug` |
| `[agencyId]/[industry]` | `pitch/[agencyId]/[industry]` | agency + in-file `INDUSTRIES` |
| `[code]` | `invite/[code]` | `agencies.settings->>invite_code` |
| `[token]` | `(portal)/client-portal/invite/[token]` | `sub_account_invitations.token` |
| `[id]` | `(dashboard)/agency/clients/[id]/*` | `agency_clients` row |
| `[siteId]` | `(dashboard)/agency/website/[siteId]/*` | `sites` row |
| `[id]` | `(dashboard)/agency/crm/contacts/[id]` | CRM contact |

### Server-vs-client breakdown

Across `app/**/page.tsx` there are **35 `'use client'` files** out of ~100 pages. The client-heavy cluster lives on the interactive surfaces: all four auth activation pages (`solo`, `build`, `website-builder`, `get-started`), the four pitch decks, anything with a wizard / calculator / live chat UI (pricing, roi, get-demo, unsubscribe, try/[industry], tools/ai-readiness, playground, workers directory, `report/[clientId]`), and the dashboard's interactive builders (`widget`, `calendar`, `build-requests`, `audit`, `sites`, `website/bulk`, `website/create`, `website/quick-start`, `website/[siteId]/editor|growth|seo|settings`, `clients/[id]/booking`, `clients/[id]/site-portal`). Auth-critical code (agency layout, Mission Control page, clients list / detail, billing, credits, referrals, settings, voice, analytics, automations, review-queue, api-keys, usage, admin, master) stays RSC — appropriate.

Notable exception: `(auth)/login/impersonate/page.tsx` is `'use client'` with zero server-side gate. That's fine as long as the Supabase session check on `/agency` catches misuse, but it's worth flagging.

## Cross-cutting findings

### The `ai-for` route conflict (critical)

**Both `app/ai-for/[slug]/page.tsx` and `app/ai-for/[niche]/page.tsx` exist at the same directory level.** Next.js disallows two dynamic segments at the same position — `next build` will throw "You cannot use different slug names for the same dynamic path" or silently deadlock the route resolver. In dev it may surface as a `parallel routes` error. The two files collide; one of them has to either be namespaced under a sub-segment (e.g. `ai-for/niche/[slug]`) or merged.

They're also conceptually overlapping: `[slug]` is the 50-template SEO grid, `[niche]` holds three hand-curated rich pages (dental/cannabis/...). Merge: pick one param name, add a `type` discriminator in the data source, or move the curated niches into the same `INDUSTRY_TEMPLATES` loop with an optional `rich` field.

### Auth preamble sprawl

Twenty-two pages redirect to `/signup/agency`, and most of them reproduce the identical six-line stanza (verbatim in: `analytics/page.tsx:8-14`, `seo/page.tsx:8-14`, `voice/page.tsx:7-14`, `intelligence/page.tsx`, `ai-model/page.tsx`, `automations/page.tsx:6-13`, `usage/page.tsx`, `templates/page.tsx:8-14` — which bizarrely redirects to `/signup` not `/signup/agency`, a micro-drift — `settings/page.tsx:7-13`, `review-queue/page.tsx`, `credits/page.tsx`, `api-keys/page.tsx`, `referrals/page.tsx`, `billing/page.tsx:9-19`, `clients/new/page.tsx:15-20`, `clients/page.tsx:8-13`, `clients/[id]/page.tsx:11-18`, plus `onboarding/page.tsx`, `terminal/[clientId]/page.tsx:23-28`):

```
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');
const result = await getAgencyForUser(user.id);
if (!result) redirect('/signup/agency');
```

The same stanza already runs in `(dashboard)/agency/layout.tsx:13-18`, so every child is double-fetching the user and agency. This isn't a correctness bug (Supabase caches the user on the request), but `getAgencyForUser` hits Postgres on every page render. The `requireAgencyMember()` helper at `lib/agency/middleware.ts` was built to replace this pattern — it's used in 20+ API routes but **only one page** (`clients/[id]/seo-guide/page.tsx:13`). Rolling it out to the pages would cut ~100 lines and let the layout pass `agency` down via context / layout.

`templates/page.tsx:14` redirects to `/signup` not `/signup/agency` — an inconsistency that lands the user on the stub that immediately bounces them to `/signup/agency`, so it works by accident.

### Master-email drift

Four distinct hard-coded email lists:

1. `['hello@conversionsystem.com', 'angel@conversionsystem.com']` — `admin/page.tsx:5`, `admin/orphaned-users/page.tsx:5`, `master/page.tsx:7`, `master/accounts/page.tsx:9`, `master/stripe-setup/page.tsx:7`, `(dashboard)/agency/layout.tsx:21`, `(portal)/client-portal/[clientId]/page.tsx:52`, `(dashboard)/agency/credits/credits-client.tsx:502`, and most `app/api/admin/*` routes.
2. `['hello@conversionsystem.com', 'angel@conversionsystem.com', 'steve@conversionsystem.com', 'webblex10@gmail.com']` — `admin/content/page.tsx:5-10` (and `api/admin/content-calendar/route.ts:5-10`).
3. `['hello@conversionsystem.com', 'angel@conversionsystem.com', 'steve@conversionsystem.com']` — `app/api/admin/stats/route.ts:4`.
4. `process.env.MASTER_EMAILS` split on commas, default `'angel@conversionsystem.com'` — `app/api/admin/router-migrate/route.ts:14` (only env-driven one).

So depending on which admin page you land on, a different set of emails is "master". Notably, `webblex10@gmail.com` gets content-calendar access and nothing else. Worth centralising to `lib/auth/master-emails.ts`.

### Portal consolidation incomplete

Two parallel portals:
- `app/portal/[clientId]/page.tsx` — public, no auth, service client fetch, `?terminal=1` escape hatch.
- `app/(portal)/client-portal/[clientId]/page.tsx` — authenticated, membership gate, redirects to `/client-portal/[clientId]/request-access` (which doesn't exist).

They appear to be a migration that was started but not finished — the new `client-portal` surface was meant to replace the old `portal` but the shim never flipped. Confirmed by `(portal)/layout.tsx`'s comment ("no agency sidebar"), which only makes sense if the intent was a standalone client-facing portal.

### Pitch-deck proliferation

`/pitch/`, `/pitch/ai-agency/`, `/pitch/agencies/`, `/pitch/inbound-growth/` are all unique client components with their own slide arrays. `/pitch/[agencyId]/[industry]/` is the dynamic "personalized for X" variant. There's no shared `Deck` component — five copies of slide-nav + SlideCounter + pagination. Extracting a `<PitchDeck slides={...}>` would save ~500 lines.

### Referral cookie inconsistency

- `/invite/[code]` (`invite/[code]/route.ts:65`): `httpOnly: false`, plus a second `kyra_ref_name` cookie also `httpOnly: false`. Comment explains the intent ("readable by client JS as a fallback").
- `/ref/[agencyId]` (`ref/[agencyId]/route.ts:21`): `httpOnly: true`. No `kyra_ref_name` cookie set.

Two deliberate-looking cookie shapes for the same cookie name. If client JS expects to read `kyra_ref` (as the `/invite/` comment implies), anyone who lands via `/ref/...` gets a cookie that's invisible to that code. One of these is wrong.

### Plan-limit table inlined

`(dashboard)/agency/page.tsx:49` contains `planLimits: Record<string, number> = { free: 1, solo_pro: 1, starter: 4, pro: 11, scale: 21 }` with a comment pointing to `lib/billing/plans.ts → maxClients`. Two other pages use the canonical helper (`clients/page.tsx:5` and `clients/new/page.tsx:4` both `import { getPlanClientLimit }`). The inline copy was kept for speed but is a drift risk — if a plan is renamed or a slot count changes, Mission Control silently disagrees with the rest of the app.

### robots.ts dead entry

`robots.ts:13` disallows `/(auth)/` — a route-group URL that doesn't exist at runtime. The public URLs are `/login`, `/signup`, `/signup/agency`, `/signup/success`, `/build`, `/solo`, `/website-builder`, `/get-started`, `/forgot-password`, `/reset-password`, `/login/impersonate`. Only `/login` and `/signup/` are listed in the disallow block. This means the four activation landings (`/solo`, `/build`, `/website-builder`, `/get-started`) — which are lead-capture flows — are currently indexable; if that was intentional it's fine, but `(auth)/` being in the list suggests whoever wrote it thought the group would scope them all.

Also: `/master/` is not disallowed; unauthenticated visitors are bounced by the page, but crawlers will still hit it and get redirected to `/agency` → `/login`.

### Stale / mystery pages

- `app/march-16/page.tsx` — "Kyra @ Launch — OpenClaw Agency Platform | March 16 Demo". Past SF event. Still in the codebase, not in the sitemap, no inbound links I can see. Dead content.
- `app/india/page.tsx` — HighLevel LIVE India 2026 landing. Current (event is 2026), but hard-coded.
- `app/cannabis/page.tsx`, `app/ecommerce/page.tsx` — rich vertical landing pages. Not mystery; they predate the `/ai-for/[slug]` generator and represent the two highest-investment verticals. Duplicated copy with the programmatic versions, but the `cannabis` content is richer than the templated equivalent.
- `app/get-demo/page.tsx` — lead-capture form, client-side, `'use client'`. Posts to an API route (not included in this batch).
- `app/unsubscribe/page.tsx` — client-side base64-decodes `?token` into `agencyId:email`, POSTs to `/api/webhooks/unsubscribe`. Surprisingly minimal — no server-side validation that the token is signed, so anyone can unsubscribe any (agencyId, email) pair they can guess. Worth flagging.
- `app/(portal)/client-portal/[clientId]/page.tsx:55` — redirects to `/client-portal/[clientId]/request-access`, which has no `page.tsx`. Dead redirect target.
- `(dashboard)/agency/sites/page.tsx` (master-only) and `(dashboard)/agency/seo/page.tsx` (master-only per sidebar but page itself doesn't enforce) — the master-only gating happens in the sidebar (`agency-sidebar.tsx:86-87`) but the routes themselves don't check — non-masters who guess the URL get in.

### Stub / redirect-only pages inventory

All simply bounce to another route, contributing to the impression of "unfinished consolidation":

- `(auth)/signup/page.tsx` → `/signup/agency`
- `(dashboard)/agency/agents` → `/agency/clients`
- `(dashboard)/agency/ai-setup` → `/agency/clients`
- `(dashboard)/agency/channels` → `/agency/clients`
- `(dashboard)/agency/ghl-setup` → `/agency/clients`
- `(dashboard)/agency/autopilot` → `/agency/automations`
- `(dashboard)/agency/performance` → `/agency/clients`
- `(dashboard)/agency/website` → `/agency/clients`

All file-level comments explain *why* (moved into per-client dashboard), which is good — but keeping these as live redirects means any stale inbound link / bookmark is now a 2-hop navigation. They could be converted to Next.js route rewrites in `next.config.js` so the stale URLs 301 instead of rendering an RSC just to `redirect()`.

### Signup → activation funnel map

Unified in practice, but wired via a tangle of entry URLs:

1. `/invite/[code]` → cookie + `/solo?ref=...&from=...`.
2. `/ref/[agencyId]` → cookie + `/solo?ref=...`.
3. `/solo`, `/build`, `/website-builder`, `/get-started` — four branded top-of-funnel landings, all client-side wizards.
4. Any of them → `/signup/agency` (the actual signup wrapper).
5. After Supabase signup → `/signup/success?agencyId=...` (viral screen).
6. Next click → `/onboarding` (guarded by `settings.onboarding_complete`).
7. Completion → `/agency` (Mission Control).

The funnel works but it's long and branching — four top-of-funnel variants, a success page that's basically just a referral link, and a separate onboarding wizard that runs *after* signup success. Depending on which activation page the user hits, they see four different "what's Kyra for" framings, which also makes the plan-gate copy drift between pages.

### Summary

Scope: 100 page.tsx, 5 layout.tsx, 5 non-API route.ts. The authenticated surface is consolidating (seven stub redirects replacing formerly standalone pages) but the public surface is fragmenting (five pitch variants, two parallel portal trees, two `ai-for/[param]` handlers colliding in a way Next won't build). The auth preamble is duplicated in 20+ pages despite `requireAgencyMember()` existing, and the master-email list is drifting across four separately-maintained hard-coded arrays. Concrete build-blocker: `app/ai-for/[niche]/page.tsx` and `app/ai-for/[slug]/page.tsx` cannot coexist in Next's router.
