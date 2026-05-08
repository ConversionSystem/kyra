# Batch 4 — App Router Page Layer

Scope covered: every `page.tsx` / `layout.tsx` under `app/` (107 `page.tsx`, 5 `layout.tsx`) plus the three `route.ts` files that masquerade as files (`llms.txt`, `llms-full.txt`, `feed.xml`), the two short-URL routers (`invite/[code]`, `ref/[agencyId]`), plus `robots.ts`, `sitemap.ts`, `not-found.tsx`. API routes are out of scope (separate batch).

At the top, everything is wrapped by the single RootLayout in `app/layout.tsx`:10-71 which sets the Inter font, the Kyra metadata base (OG/Twitter cards, RSS alternate), a Meta Pixel snippet, and a gray `bg-gray-50` body. No auth happens here — every sub-tree is independent.

---

## `(auth)` — unauthenticated entry surface

**Layout.** Only `(auth)/login/layout.tsx` exists (`app/(auth)/login/layout.tsx`:1-5 — `export const dynamic = 'force-dynamic'` plus pass-through). The rest of the route group has no group-level layout, so pages render directly inside RootLayout. This group deliberately does NOT gate on auth — pages here are the pre-login funnel plus one post-login redirect.

**Auth model.** Client-side Supabase calls (`createClient()` from `@/lib/supabase/client`). Successful login pushes to `searchParams.get('redirect') || '/agency'` (`app/(auth)/login/page.tsx`:23, 49). There is no dedicated middleware guarding this group — the sibling `(dashboard)` group does its own server-side auth check instead.

**Pages in the group:**

- `login/page.tsx` — email/password + Google OAuth, wrapped in `<Suspense>` for `useSearchParams`. All client, sets redirect via router.
- `login/impersonate/page.tsx` — master-user impersonation landing; reads `?e=&p=&n=` from URL, signs out existing session, then signs in with the supplied creds. Used by `/master/accounts`.
- `signup/page.tsx` — **one-line redirect** to `/signup/agency` (`app/(auth)/signup/page.tsx`:4-6). Personal signup was removed; Kyra is agency-only now.
- `signup/agency/page.tsx` — tiny RSC that renders `AgencySignupWrapper` (`app/(auth)/signup/agency/page.tsx`:5). The wizard/logic lives in the sibling `AgencySignupClient.tsx`.
- `signup/success/page.tsx` — server-rendered post-signup viral screen with referral link, early-bird countdown, and share templates. Takes `?agencyId=&next=`; loads agency info via `createServiceClientWithoutCookies()` (`app/(auth)/signup/success/page.tsx`:24-28).
- `forgot-password/page.tsx`, `reset-password/page.tsx` — Supabase password-recovery pair, both `'use client'`.
- `build/page.tsx` — a ~800-line public-flavored worker-shopping page. User browses `WORKER_TYPES` (18 entries starting at line 35) and clicks through to a done-for-you "have the team build this" request flow. Despite being in `(auth)`, it renders publicly; it's effectively a lead magnet.
- `solo/page.tsx` — the free-tier signup landing. Handles inbound referrals (reads `?ref=` URL param + `kyra_ref` cookie as fallback, `app/(auth)/solo/page.tsx`:59-60) and drops users into the agency onboarding wizard.
- `website-builder/page.tsx` — website-focused public landing that funnels into `/signup/agency?plan=...`. Markets the AI website-builder angle specifically.
- `get-started/page.tsx` — comprehensive multi-step wizard (Building / Industry / Capabilities / Personality / Account). Creates the Supabase user and seeds an initial `agency_clients` row. Works like a compressed onboarding.

The `(auth)` group is overloaded — it holds both genuinely-unauth pages (login, forgot-password) and public marketing funnels (`build`, `solo`, `website-builder`, `get-started`). Grouping criterion seems to be "pre-auth-or-signup flow," not "must-be-logged-out."

## `(dashboard)` — the paying-user app surface

**Layout.** `app/(dashboard)/agency/layout.tsx` is the real workhorse. It:
1. Creates the server Supabase client, fetches the current user, `redirect('/login')` if none.
2. Calls `getAgencyForUser(user.id)`; if no agency → `redirect('/signup/agency')`.
3. Pulls clients for the command palette, flags `isMaster` against two hard-coded emails (`hello@conversionsystem.com`, `angel@conversionsystem.com`) (`app/(dashboard)/agency/layout.tsx`:22).
4. Renders the `<AgencySidebar />`, the main column, and `<CommandPaletteWrapper />`. Solo / free plans are explicitly not blocked (`app/(dashboard)/agency/layout.tsx`:35-37).

**Auth model.** Every child page ALSO re-runs `getUser` / `getAgencyForUser` at the top of its server component (see, e.g. `app/(dashboard)/agency/billing/page.tsx`:14-19, `app/(dashboard)/agency/analytics/page.tsx`:9-14, `app/(dashboard)/agency/settings/page.tsx`:7-13). This is duplicated work relative to the layout but it also means pages are safe in isolation and can use typed `result.agency` directly.

**Sidebar map** (`app/(dashboard)/agency/agency-sidebar.tsx`:77-105): the sidebar is intentionally minimal — sub-pages live as tabs inside section pages rather than in the nav. Top section links: Mission Control (`/agency`), Analytics (master-only), Intelligence (pro/scale gate), Clients, Terminal, Inbox, Websites (master-only), SEO/GEO (master-only), Build Requests. Account section (collapsible): Billing, Referrals, API Keys, Settings, Help mailto.

**Top-level pages a paying user sees:**

| Route | Purpose |
|---|---|
| `/agency` | Mission Control — live overview, onboarding widget, credit warnings, plan-based add-client gate (`app/(dashboard)/agency/page.tsx`:22-55) |
| `/agency/clients` | Client list card grid (`app/(dashboard)/agency/clients/page.tsx`:7-22) |
| `/agency/clients/new` | New client form with plan-limit guard via `getPlanClientLimit` |
| `/agency/clients/[id]` | Client detail hub (tabs live inside `ClientDetailView`) — this is where per-client CRM, website, AI setup, channels, GHL tabs actually are |
| `/agency/clients/[id]/booking` | Per-client bookings calendar |
| `/agency/clients/[id]/seo-guide` | Printable SEO guide scoped to a single client |
| `/agency/clients/[id]/site-portal` | Public-facing site stats dashboard per client |
| `/agency/billing` | Stripe plans + credits, handles `?upgrade=&checkout=&voice=` post-checkout hand-off |
| `/agency/credits` | Credit balance + transaction list |
| `/agency/usage` | Usage dashboard (conversations, hours saved) |
| `/agency/analytics` | Master-only P&L-style per-client rates |
| `/agency/intelligence` | Pro/Scale gated — web-intelligence research workspace (`app/(dashboard)/agency/intelligence/page.tsx`:17-22) |
| `/agency/crm` | `CrmCommandFeed` (one-line page, all logic in client component) |
| `/agency/crm/contacts`, `/contacts/[id]` | CRM contacts list + detail |
| `/agency/calendar` | Agency-wide bookings view |
| `/agency/email` | Email sequences dashboard |
| `/agency/automations` | Proactive automation rules |
| `/agency/review-queue` | Human review for AI outbound messages |
| `/agency/build-requests` | Inbound DFY build requests from the `/build` funnel |
| `/agency/referrals` | Referral machine + streaks + credits-earned summary |
| `/agency/api-keys` | BYOK keys (per-agency OpenAI/Anthropic/Gemini) |
| `/agency/templates` | Premium template gallery |
| `/agency/voice` | Voice/phone config per client (Vapi-style) |
| `/agency/widget` | Web-chat widget builder (client-side fetch to `/api/agency/clients`) |
| `/agency/ai-model` | Agency-wide model preference + BYOK provider detection |
| `/agency/settings` | Agency profile, members, roles |
| `/agency/settings/webhooks` | Per-agency webhook config JSONB editor |
| `/agency/sites` (master-only) | Cross-agency site index |
| `/agency/seo` (master-only) | SEO/GEO command center, auto-picks first site |
| `/agency/website` (+ `/[siteId]/editor`, `/seo`, `/settings`) | Per-site editor; `growth` is a redirect to `/seo?tab=growth` (`app/(dashboard)/agency/website/[siteId]/growth/page.tsx`:6-13) |
| `/agency/website/create`, `/quick-start`, `/bulk` | Site provisioning wizards (single, wizard, bulk-for-all-clients) |

**Stub / redirect-only pages** (these are historical cruft from feature consolidations):
- `/agency/agents` → `/agency/clients` (`app/(dashboard)/agency/agents/page.tsx`:5-7 — "no agency-level OpenClaw exists")
- `/agency/ai-setup` → `/agency/clients`
- `/agency/channels` → `/agency/clients`
- `/agency/ghl-setup` → `/agency/clients`
- `/agency/autopilot` → `/agency/automations`
- `/agency/performance` → `/agency/clients`
- `/agency/website` (root) → `/agency/clients`

All six are ≤10 line files that exist purely for backward-compatible URLs.

**`/agency/audit`** stands alone as a full audit log page (`app/(dashboard)/agency/audit/page.tsx`:1-30 — client component, fetches live entries with filtering).

## `(onboarding)` — post-signup activation

Single page. `app/(onboarding)/layout.tsx`:1-16 is a dedicated minimal header ("kyra" wordmark + "Skip setup →" link to `/agency`) on a gradient background — distinct from the sidebar-wrapped dashboard layout.

`app/(onboarding)/onboarding/page.tsx`:9-30 does auth (redirect to `/login`), fetches the agency, short-circuits to `/agency` if `settings.onboarding_complete` is already true, otherwise renders `<OnboardingWizard agencyId agencyName plan />`. The wizard itself (sibling component) handles its own steps and is where a fresh agency first lands.

Pair this with the related `(auth)/get-started` wizard and `(auth)/solo` page and the signup → activation funnel is:

```
/signup/agency  →  Supabase signup + agency row
      ↓
/signup/success?agencyId=X   (referral viral screen, optional)
      ↓
/onboarding  (OnboardingWizard — business type, first client, template)
      ↓
/agency  (Mission Control with 30-day onboarding widget banner)
```

Alternate entry points that bypass this (or compress it): `/build` (DFY request), `/solo?ref=...` (free tier), `/website-builder?plan=starter` (plan pre-selected), `/get-started` (single-page 5-step wizard that does signup + first client in one go).

## `(portal)` — agency-client sub-account portal

**Layout.** `app/(portal)/layout.tsx` is a pass-through `<>children</>` with a comment "Sub-account portal — no agency sidebar." The deliberate decision here is that sub-account users (an agency's client's staff) should NOT see the Kyra agency chrome — they get a clean white-labeled experience instead.

**Auth model.** Logged-in via Supabase, but the authorization check is different. `app/(portal)/client-portal/[clientId]/page.tsx`:36-50 checks for *either* agency_members (the owning agency's staff) OR `sub_account_members` (client-side invited users) membership. This is the only part of the app that uses the `sub_account_members` + `sub_account_invitations` tables.

**Pages:**
- `client-portal/[clientId]/page.tsx` — the sub-account dashboard (`PortalDashboard` component). White-labeled with agency branding.
- `client-portal/invite/[token]/page.tsx` — invite acceptance flow: looks up the pending `sub_account_invitations` row, pulls agency branding, hands off to `<AcceptInviteClient />`.

## `(public)` — logged-out marketing / tool surface

No group layout — each page renders `<PublicNav />` + `<PublicFooter />` inline.

- `launch/page.tsx` — long-form marketing landing (capabilities, how-it-works).
- `playground/page.tsx` — interactive try-before-signup chat with 25 templates defined inline (`app/(public)/playground/page.tsx`:9-35).
- `tools/ai-readiness/page.tsx` — scored quiz lead magnet.
- `workers/page.tsx` — public directory of deployed AI workers, fetches from `/api/public/workers` with search+industry filter.
- `workers/[id]/page.tsx` — individual worker profile; server-side fetch via `createServiceClientWithoutCookies()` against `agency_clients` joined to `agencies(name)` (`app/(public)/workers/[id]/page.tsx`:10-40).

## Authenticated portal-adjacent routes (not in `(portal)` group)

Kyra also has several white-label / share-URL pages at the top level of `app/`. These intentionally live outside the `(portal)` group so they can have distinctly different shells:

| Route | Audience | Auth? | Notes |
|---|---|---|---|
| `app/portal/[clientId]/page.tsx` | End customer of an agency's client | No (public read on `agency_clients`) | `PortalChat`. `?terminal=1` escape hatch redirects to raw OpenClaw UI (`app/portal/[clientId]/page.tsx`:42-49) |
| `app/report/[clientId]/page.tsx` | Same as portal — shared via link | No | Monthly stats + sparkline, client component fetching JSON |
| `app/terminal/[clientId]/page.tsx` | Agency staff power user | Yes | Server-side redirect → `{gateway.url}/__openclaw__/#token=...` (`app/terminal/[clientId]/page.tsx`:20-39) |
| `app/a/[agencyId]/page.tsx` | Public agency profile | No | SEO public card for each agency — lists their industries |
| `app/pitch/[agencyId]/[industry]/page.tsx` | Cold-pitch page | No | Server-rendered, white-labelable pitch deck scoped to an agency + industry |
| `app/results/[agencySlug]/page.tsx` | Agency's prospects | No | Public results / social proof page gated by `settings.public_results !== false` (`app/results/[agencySlug]/page.tsx`:36-39) |
| `app/invite/[code]/route.ts` | Referred prospect | No | Short URL → looks up agency by `settings.invite_code`, sets `kyra_ref` cookie (30d), redirects to `/solo?ref=…&from=…` |
| `app/ref/[agencyId]/route.ts` | Same | No | Simpler variant — skips the lookup, just cookies + redirect |

So the sharing surface is: agencies send `/ref/<id>` or `/invite/<code>` to get leads; agencies link prospects to `/results/<slug>`, `/a/<id>`, or `/pitch/<id>/<industry>`; end customers get `/portal/<clientId>` or `/report/<clientId>`; agency staff use `/terminal/<clientId>` for raw OpenClaw dashboard access.

## Public marketing / programmatic-SEO surface

This is an enormous landing-page layer — the majority of `page.tsx` files by count. It's clearly a SEO-driven content strategy with two shapes of template:

1. **Hand-authored, one-off pages** targeting specific audiences or keywords:
   - `app/page.tsx` — homepage (512 lines; hero + industries + features + demo chat embed).
   - `app/pricing/page.tsx` — plans (Lite $99 / Pro $299 / Scale $499 with annual), client component so plan toggles work.
   - `app/vs/page.tsx` — feature comparison vs chatbots and GHL automations.
   - `app/compare/mission-control/page.tsx` — comparison vs another OpenClaw-based tool "Mission Control" (see rows 10-30 of that file).
   - `app/use-cases/page.tsx` — per-industry monthly-charge case studies (HVAC, law, dental…).
   - `app/roi/page.tsx` — interactive ROI calculator (14 industries with avgDeal/missedRate/responseBoost).
   - `app/openclaw/page.tsx`, `app/zapier/page.tsx`, `app/web-intelligence/page.tsx`, `app/get-demo/page.tsx`, `app/help/page.tsx`, `app/changelog/page.tsx`, `app/partners/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`.
   - GHL-specific: `app/ghl/page.tsx`, `app/ghl-marketplace/page.tsx`, `app/ghl-snapshot/page.tsx`.
   - Industry-as-a-whole-page: `app/cannabis/page.tsx` (311 lines), `app/ecommerce/page.tsx`.
   - Event / campaign pages: `app/india/page.tsx` (HighLevel LIVE India 2026), `app/march-16/page.tsx` ("Kyra × Launch · March 16-17, San Francisco" — see line 74 of that file).

2. **Template-driven dynamic pages** that generate dozens of SEO variants from a single source:
   - `app/demo/[industry]/page.tsx` — animated AI chat demo; keyed off an inline `DEMOS` map (dental, realestate, auto, cannabis, restaurant, medspa, etc.).
   - `app/try/[industry]/page.tsx` — interactive (not pre-recorded) chat demo.
   - `app/for/[industry]/page.tsx` — hand-coded agency-targeting niche pages.
   - `app/for/page.tsx` — personalized outreach landing (`?name=&agency=&niche=`) used for cold email.
   - `app/pitch/[agencyId]/[industry]/page.tsx` — per-agency × per-industry pitch deck, uses the same scripts as `/demo`.
   - **`app/ai-for/[slug]/page.tsx`** — programmatic: `generateStaticParams()` maps over `INDUSTRY_TEMPLATES` (50 rows from `@/lib/templates/industry-templates`, referenced by `app/ai-for/[slug]/page.tsx`:10-12) to pre-render all 50 industry pages at build time.
   - **`app/ai-for/[niche]/page.tsx`** — a second dynamic segment at the SAME level (!), with its own hand-authored `NICHES` map of ~6-10 deeper niches.
   - `app/ai-for/page.tsx` — the index that links into them via 8 categories (Healthcare, Home Services, etc.).
   - `app/blog/page.tsx` + `app/blog/[slug]/page.tsx` — blog index + post pages, content from `@/lib/blog/posts`.
   - `app/guides/page.tsx` + `app/guides/[id]/page.tsx` — setup guides from `@/lib/guides/setup-guides` with `generateStaticParams()`.

`app/sitemap.ts`:10-60 ties it together: core pages + one entry per blog post + one per `INDUSTRY_TEMPLATES` entry + demo/try slugs for 6 canonical industries. `app/robots.ts` disallows `/api/`, `/agency/`, `/admin/`, `/portal/`, `/(auth)/`, `/signup/`, `/login` — the authenticated surface is walled off from crawlers.

## Admin & master consoles

Two parallel consoles; both gate on the same two hard-coded emails.

**`app/admin/`** — content/ops tools:
- `app/admin/page.tsx`:5,13 — admin emails are `['hello@conversionsystem.com', 'angel@conversionsystem.com']`. Main dashboard.
- `app/admin/content/page.tsx` — content calendar (expanded admin email list also includes `steve@` and `webblex10@gmail.com`, `app/admin/content/page.tsx`:5-10).
- `app/admin/orphaned-users/page.tsx` — cleanup for users without agencies.

**`app/master/`** — billing/company control:
- `app/master/page.tsx`:7,12 — same two-email `MASTER_EMAILS` gate; renders a `<MasterDashboard />`.
- `app/master/accounts/page.tsx` — `AccountsAdminClient` (cross-agency user admin).
- `app/master/stripe-setup/page.tsx` — Stripe product/price configuration.

All five pages share an identical auth guard pattern:

```ts
if (!user || !EMAILS.includes(user.email ?? '')) redirect('/agency');
```

The `isMaster` flag in the agency layout (`app/(dashboard)/agency/layout.tsx`:22) also unlocks a handful of sidebar items (Analytics, Websites, SEO/GEO) and special rendering flags inside pages like `Intelligence` (`app/(dashboard)/agency/intelligence/page.tsx`:17-22).

## Special content routes (`route.ts` files that emit non-HTML)

`app/` has three file-shaped directories containing only a `route.ts` that emits a text/XML body:

- **`app/llms.txt/route.ts`** — a ~50-line human+LLM summary of Kyra (what-it-does / plans / pages / RSS links) following the llmstxt.org spec. `dynamic = 'force-static'`, 24h cache (`app/llms.txt/route.ts`:9-60).
- **`app/llms-full.txt/route.ts`** — extended variant that concatenates the full text of every blog post (`POSTS` from `@/lib/blog/posts` stripped of HTML) + the full `INDUSTRY_TEMPLATES` list. Designed for RAG ingestion (`app/llms-full.txt/route.ts`:29-95).
- **`app/feed.xml/route.ts`** — RSS 2.0 feed of blog posts, sorted by date, with escaped XML, 1h public / 24h s-maxage caching (`app/feed.xml/route.ts`:21-62).

Plus `app/sitemap.ts` (regenerated on each request, no cache directive), `app/robots.ts`, and `app/not-found.tsx` (the site-wide 404 — Kyra-branded).

## Dynamic segments — catalogue

| Segment | Keyed off | Source of values |
|---|---|---|
| `app/a/[agencyId]` | agency UUID | `agencies.id` |
| `app/pitch/[agencyId]/[industry]` | agency UUID + industry slug | `agencies.id` × inline INDUSTRIES map |
| `app/ref/[agencyId]` | agency UUID | — (no DB lookup, just cookie + redirect) |
| `app/invite/[code]` | random invite string | `agencies.settings->>invite_code` |
| `app/ai-for/[niche]` | niche slug | inline `NICHES` map (~6-10 rich entries) |
| `app/ai-for/[slug]` | industry slug | `INDUSTRY_TEMPLATES` (50 entries) |
| `app/blog/[slug]` | post slug | `POSTS` in `@/lib/blog/posts` (static params) |
| `app/guides/[id]` | guide id | `SETUP_GUIDES` (static params) |
| `app/demo/[industry]` | industry slug | inline `DEMOS` map |
| `app/try/[industry]` | industry slug | inline `INDUSTRIES` config |
| `app/for/[industry]` | industry slug | inline `PAGES` map |
| `app/portal/[clientId]`, `app/report/[clientId]`, `app/terminal/[clientId]` | `agency_clients.id` | runtime DB lookup |
| `app/results/[agencySlug]` | `agencies.slug` | DB; returns `notFound()` if slug missing or `public_results === false` |
| `app/(portal)/client-portal/[clientId]`, `/invite/[token]` | client UUID, invite token | `agency_clients` + `sub_account_invitations` |
| `app/(public)/workers/[id]` | client UUID | `agency_clients` (filtered `status != 'deleted'`) |
| `app/(dashboard)/agency/clients/[id]` (+ booking/seo-guide/site-portal) | client UUID | `agency_clients`, gated by `agency_id === result.agency.id` |
| `app/(dashboard)/agency/crm/contacts/[id]` | contact id | client-side fetched |
| `app/(dashboard)/agency/website/[siteId]/...` | site id | client-side via `useParams` |

## Server vs client components

Out of 107 `page.tsx`, 35 are `'use client'` (listed exhaustively by the Grep). Pattern:

- **Auth-critical pages are always RSC** (login is an exception because the flow is client-side Supabase auth). The dashboard group is almost entirely RSC at the page level — pages fetch the agency server-side, then pass typed props into a client subview (`*-view.tsx` / `*-client.tsx` naming convention).
- **Interactive / stateful pages are client** — signup wizards, build-request page (poll + filter UI), calendar, site editor, chat playground, ROI calculator, pricing page (plan toggle).
- **Content-dense SEO pages are RSC with `metadata`/`generateMetadata`** — blog, ai-for, demo, pitch, pricing, cannabis, india, march-16, vs, compare, launch.
- **A handful of "thin" pages**: `crm/page.tsx` (5 lines, just renders `<CrmCommandFeed/>`), `crm/contacts/page.tsx` (3 lines), `email/page.tsx` (3 lines) — the page is a server-component shell and all logic is in a dedicated client component.

Data-fetching pattern: the server-component pages fetch directly via `createClient` / `createServiceClientWithoutCookies` / typed query helpers from `@/lib/agency/queries` and `@/lib/billing/credit-engine`. Client pages fetch via `fetch('/api/...')`. There's no tRPC or React Query at the page-layer level.

A recurring server-page skeleton:

```ts
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');
const result = await getAgencyForUser(user.id);
if (!result) redirect('/signup/agency');
// ...typed usage of result.agency, result.role
```

That stanza shows up in 15+ dashboard pages — prime candidate for a `requireAgencyMember()` helper, which exists at `@/lib/agency/middleware` and is used in exactly one place (`app/(dashboard)/agency/clients/[id]/seo-guide/page.tsx`:13).

## Stale / incomplete / mystery pages

- **`app/march-16/page.tsx`** (271 lines, `app/march-16/page.tsx`:1-74) — a Launch event ("Kyra × Launch · March 16-17, San Francisco") pitch page. It's a real, polished landing page, but is event-scoped. Given today's date (2026-04-20), the event is month-old. Candidate for archive/removal.
- **`app/india/page.tsx`** (228 lines, `app/india/page.tsx`:6-16) — HighLevel LIVE India 2026 campaign landing. Also event-scoped.
- **`app/cannabis/page.tsx`** (311 lines) — NOT event-ish. This is a proper vertical-specific marketing page, identical in shape to `app/ecommerce/page.tsx`. Both are hand-authored companions to the generated `ai-for/[slug]/page.tsx` pages. They're richer and more opinionated than the template-driven ones.
- **`app/ecommerce/page.tsx`** — same category as `cannabis`: rich vertical landing page.
- **`app/ai-for/[niche]/` and `app/ai-for/[slug]/` coexisting at the same level** (`app/ai-for/[niche]/page.tsx` + `app/ai-for/[slug]/page.tsx`, both with their own `generateStaticParams`) — this is a **Next.js route conflict**. Two dynamic segments can't share a parent directory without error; in practice Next will pick one at build time and shadow the other. Worth investigating — almost certainly a bug from a rename/refactor that left the old `[niche]` file behind. Most-likely intent: `[niche]` was the original rich-content version, `[slug]` is the newer 50-industry generator, and one should be deleted or the two should be merged.
- **Redirect-only dashboard pages** (agents, ai-setup, channels, ghl-setup, autopilot, performance, website root) — these are intentional historical redirects documented with comments; not "stale" in the broken sense, but dead-weight URLs.
- **`app/get-demo/page.tsx`** duplicates several `app/pitch/*` pages conceptually; likewise `app/pitch/page.tsx`, `app/pitch/ai-agency/page.tsx`, `app/pitch/agencies/page.tsx`, `app/pitch/inbound-growth/page.tsx` are four parallel pitch decks — the marketing team is clearly A/B-ing decks here.
- **`app/openclaw/page.tsx`** — marketing specifically for the underlying OpenClaw framework; coexists with `app/vs/page.tsx` and `app/compare/mission-control/page.tsx`. These are all product-positioning pages.

## Cross-cutting observations

1. **Auth guard sprawl.** The identical six-line `user/agency/redirect` block is duplicated in ~15 dashboard pages. The `requireAgencyMember()` helper is used once. Opportunity to DRY.
2. **Two account-type paths in same dashboard.** "Solo" accounts (`settings.account_type === 'solo'`) and agency accounts share every route; pages branch on `isSolo` rather than the group being split. Notes in `app/(dashboard)/agency/clients/page.tsx`:15 and `app/(dashboard)/agency/clients/new/page.tsx`:22 explicitly say "solo users now use the same dashboard."
3. **Two "master" email lists drift apart.** `admin/page.tsx`:5 and `master/page.tsx`:7 use a 2-email list. `admin/content/page.tsx`:5-10 uses a 4-email list. The agency layout (`app/(dashboard)/agency/layout.tsx`:22) also inlines the 2-email list. If a third master is onboarded, multiple files need editing. Should live in `@/lib/agency/constants` or similar.
4. **Portal consolidation incomplete.** `(portal)/client-portal/[clientId]` and `/portal/[clientId]` and `/report/[clientId]` all serve similar end-customer audiences but live in different shells. The `(portal)` group was presumably the new architecture but `/portal/[clientId]` wasn't migrated.
5. **Programmatic-SEO layer is substantial** — `/ai-for/[slug]` generates 50 pages × 3 demo types (`/ai-for/`, `/demo/`, `/try/`, `/for/`), plus blog + guides + industry verticals = very large crawlable surface. `sitemap.ts` and `llms-full.txt` are both aware of it.
6. **Three hard-coded short URL sinks** (`/invite/[code]`, `/ref/[agencyId]`, `/solo`) all funnel referrals to the same signup. The cookie strategy (`kyra_ref`, `kyra_ref_name`, 30 days, `httpOnly: false` in `invite` but `true` in `ref`) is subtly inconsistent — worth reconciling (`app/invite/[code]/route.ts`:63-77 vs `app/ref/[agencyId]/route.ts`:18-23).
7. **`robots.ts` uses literal group name** `'/(auth)/'` as a disallow path (`app/robots.ts`:14). Group paths don't appear in real URLs — they're build-time only — so this line is dead config. Actual auth pages are `/login`, `/signup/*`, etc., which are also listed, so nothing breaks, but the `(auth)` entry is inert.
8. **`/agency/page.tsx` plan-limit table** (`app/(dashboard)/agency/page.tsx`:49) is inlined: `{ free: 1, solo_pro: 1, starter: 4, pro: 11, scale: 21 }`. The comment notes this must mirror `plans.ts → maxClients`. Dual source of truth — drift risk.
