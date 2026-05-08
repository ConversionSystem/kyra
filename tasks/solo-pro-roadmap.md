# Meet Kyra — Solo-Pro Roadmap

**Product:** `meetkyra.com` — "Your first AI employee, hired in 60 seconds. $39/mo."
**Target:** Solo local-service business owners (plumbers, dentists, lawyers, med-spas, auto shops, vets, electricians, HVAC, real estate, beauty).
**Goal:** 500 paying customers / $360k ARR by Month 6.
**Domain decision:** `meetkyra.com` primary. `meetclaw.com` redirects to `/developers`.

---

## North Star

**Day-60 retention rate.** Target: ≥70%. If <60% at any checkpoint, pause acquisition and fix product.

## Core thesis

Solos want to **hire someone**, not **deploy software**. Every decision (copy, onboarding, dashboard, support) reinforces that Kyra is a coworker, not a tool. The 60-second onboarding is the product.

---

## Phase 0 — Stabilize (Weeks 1-3)

### Non-negotiable before taking public money

- [ ] Rotate leaked Supabase service-role JWT (`scripts/backfill-templates.js:15`). Audit git history for exposure window. Deploy new key.
- [ ] Remove hardcoded `PROV_SECRET='kyra-provisioner-2026'` fallback in `scripts/backfill-templates.js:17` and `infra/provisioner/server.js`.
- [ ] Resolve Next.js route conflict: `app/ai-for/[niche]/page.tsx` + `app/ai-for/[slug]/page.tsx`. Pick one, delete or namespace the other.
- [ ] Add auth to `/api/admin/orphaned-users` and `/api/admin/health-check`.
- [ ] Consolidate 4 admin email allowlists into `lib/auth/admin.ts`. Single source of truth.
- [ ] Add signature verification: `/api/webhooks/resend` (`svix-signature`), `/api/voice/retell/webhook`, `/api/voice/twilio/webhook`, `/api/channels/telegram/webhook`, `/api/channels/whatsapp/webhook` (`x-hub-signature-256`).
- [ ] Flip `/api/webhooks/ghl` + `/api/crm/webhook` + `/api/ghl/webhook` to fail-closed when `GHL_WEBHOOK_SECRET` unset. Mirror `lib/auth/cron.ts:27-29` pattern.
- [ ] Fix stored-XSS in `/api/leads/route.ts:47-74`. Escape all user-controlled fields before HTML interpolation.
- [ ] Fix broken RLS policy on `delivery_sms_log` (`agency_id = auth.uid()` — UUID vs user UUID never matches).
- [ ] Enable RLS on `agency_credits`, `credit_transactions`, entire `email_*` family, `pipeline_ab_tests`, `pipeline_message_templates`, `site_deploys`, `client_sites`, `site_pages`.
- [ ] Resolve BYOK priority inconsistency. Pick one canonical order. Consolidate 3 resolvers (`byok.ts`, `ovh/provisioner.ts`, `ghl/poller.ts`) into one.
- [ ] Re-enable billing for `solo_pro` plan. Currently `/api/billing/checkout` and `/api/billing/portal` return 400.
- [ ] Close or move `/api/stripe/env-check`, `/api/stripe/test` behind hard auth.
- [ ] Fix `types/index.ts` stale `Plan` union — align with real `'free' | 'solo_pro' | 'starter' | 'pro' | 'scale'`.

### Testing baseline (ship before customers)

- [ ] Write integration tests for: `/api/chat`, `/api/webhooks/stripe`, `/api/webhooks/ghl`, `/api/cron/scheduled-tasks`, `/api/auth/solo-signup`.
- [ ] Write smoke test for container provisioning happy path end-to-end.
- [ ] Write tests for `lib/billing/credit-engine.ts` concurrent deduct (current billing.test.ts tests static values only).

### Infra hygiene

- [ ] Guard `console.log('[middleware]', ...)` with `NODE_ENV !== 'production'`.
- [ ] Document `vercel.json` auto-deploy state. Restore `git.deploymentEnabled: false` OR remove `ignoreCommand: "exit 1"`. Pick one.
- [ ] Rename `.github/workflows/deploy.yml` → `ci.yml`.
- [ ] Delete `lib/openclaw/*` once the 3 legacy routes (`/api/openclaw/health`, `/api/openclaw/tools`, `/api/chat/openclaw`) are migrated or removed.
- [ ] Delete `lib/email/sequences.ts` (DEPRECATED stub).
- [ ] Delete 5 `@deprecated` functions in `lib/billing/plans.ts:203-243`.
- [ ] Delete aspirational files in `types/` that describe features never shipped (`pipelines.ts`, `memory-graph.ts`, `notifications.ts`, `channels.ts`).

### Exit criteria

- Zero hardcoded secrets in tracked files.
- 5 critical routes have test coverage.
- Billing accepts a real $39 charge in staging.
- RLS audit complete; no tables serving agency-sensitive data without a policy.
- All webhook signatures verified; webhook auth fails closed.

---

## Phase 1 — 60-Second Onboarding (Weeks 3-6)

### Kill the funnel fragmentation

- [ ] Unify `/build`, `/solo`, `/website-builder`, `/get-started` → single `/start` route.
- [ ] 301 redirect the 7 `/agency/*` stub pages (agents, ai-setup, channels, ghl-setup, autopilot, performance, website) via `next.config.mjs` rewrites. Delete the stub page files.
- [ ] Kill 3 of the 4 pitch deck pages (`/pitch/`, `/pitch/ai-agency/`, `/pitch/agencies/`, `/pitch/inbound-growth/`). Keep the best one, redirect others.
- [ ] Kill `/get-demo` page (duplicates `/pitch/*`).
- [ ] Kill archived event pages: `/march-16`, `/india` (past events).
- [ ] Rewrite `app/page.tsx` (homepage) as conversion-focused solo landing — single CTA "Hire Kyra."
- [ ] Rewrite `app/pricing/page.tsx` to lead with Solo ($39) / Solo Pro ($99) / Solo Business ($199). Hide agency tiers behind "Running an agency? →" link.

### Build the 4-step wizard at `/start`

- [ ] Step 1: Industry picker. 10 primary verticals as big cards: Plumber, Electrician, HVAC, Dental, Legal, Med Spa, Auto Repair, Real Estate, Vet, Beauty. "Other" → searchable list of 50 from `INDUSTRY_TEMPLATES`.
- [ ] Step 2: Business details form. Business name, address, phone for customers to call (new Twilio number or bring-your-own), business hours, top 3 services. Optional: website URL (triggers auto-scrape).
- [ ] Step 3: Personality picker. 4 tone presets (Professional / Friendly / Direct / Warm). Optional: upload logo, pick brand color.
- [ ] Step 4: Payment. Credit card required. 7-day trial. $39/mo after. Stripe Checkout embedded.
- [ ] Behind-the-scenes saga: `/api/auth/solo-signup` extended to:
  - Create Supabase auth user
  - Auto-create hidden agency + agency_members row
  - Auto-create agency_client with industry template applied
  - Provision OVH container via `lib/ovh/provisioner.ts`
  - Provision Twilio number via `lib/voice/twilio-phone.ts`
  - If website URL provided: fire `lib/knowledge/extractor.ts` async scrape
  - Generate SOUL.md via `lib/agency/workspace.ts` with `{{variables}}` filled
  - Stripe subscription created with 7-day trial
  - Welcome email with widget embed code + call-forwarding instructions
- [ ] Target: saga completes in <60 seconds. Show progress screen with 4 steps ("Provisioning your AI employee... Setting up your phone number... Reading your website... Done!").

### Simplify the solo dashboard

- [ ] Create `app/(solo)/kyra/page.tsx` — new dashboard route for `solo_pro` plan. Solo users redirect here instead of `/agency`.
- [ ] 4 tabs only: **Inbox** (conversations) / **Calls** (voice logs) / **Settings** (personality, hours, services, phone) / **Billing**.
- [ ] Home screen: today's summary (calls answered, chats replied, appointments booked, leads captured) + upcoming appointments + recent conversations.
- [ ] Hide all agency-layer UI (`AgencySidebar` command palette, clients grid, analytics, Intelligence, Websites, SEO/GEO, Build Requests, API Keys, Referrals, Members, Roles).
- [ ] Hide 13-tab `client-detail-view` entirely for solos.
- [ ] Hide monolith components: `crm-tab`, `marketing-tab`, `dispatch-tab`, `email-marketing-tab`, `workflows-tab`, `website-tab`, `seo-geo-command-center`.
- [ ] `isAgencyPlan` gate in `app/(dashboard)/agency/layout.tsx` — redirect `solo_pro` users to `/kyra`.

### Post-signup onboarding checklist

- [ ] In-app checklist: "Install chat widget on your website" → copy code button → "I installed it" button → "Test it" (opens their site in new tab with widget + highlights Kyra).
- [ ] "Forward your business phone to Kyra" → 5 instructions (Verizon / AT&T / T-Mobile / Google Voice / Other) with per-carrier codes.
- [ ] "Connect Google Calendar" → OAuth flow (already built).
- [ ] "Test Kyra's voice" → button dials their new number with a test greeting.

### Exit criteria

- A stranger can sign up and have a working AI receptionist in <5 minutes, measured via real timing.
- At least 10 test signups complete the full flow without support intervention.
- Day-1 retention (user logs in again within 24h) >80%.

---

## Phase 2 — Voice-First MVP (Weeks 5-9)

### Ship Retell integration

- [ ] Implement `docs/RETELL-AI-INTEGRATION-PLAN.md` Phase 1 (lib + webhook).
- [ ] Replace Kyra Native with Retell as default voice provider for `solo_pro`.
- [ ] Add signature verification to `/api/voice/retell/webhook` (currently unsigned).
- [ ] Build `lib/voice/retell/provisioner.ts` — auto-provisions Retell agent + phone number on signup.
- [ ] Pass SOUL.md → Retell agent system prompt.
- [ ] Per-turn memory: Retell webhook → `customer_memory` table → next call has context.

### Inbound call flow

- [ ] User's business phone forwards to Kyra-provisioned Twilio number.
- [ ] Retell answers with custom greeting (tone-adjusted).
- [ ] Caller states reason → Kyra uses tools: `look_up_contact`, `check_calendar_availability`, `book_appointment`, `quote_price`, `escalate_to_human`.
- [ ] Booking → creates Google Calendar event → sends SMS confirmation to caller.
- [ ] Transcript written to `voice_call_history` + `crm_activities`.
- [ ] If escalation: SMS sent to owner's cell ("John from 555-1234 needs you on Tuesday's leak, call him back").

### SMS conversation flow

- [ ] Inbound SMS to Kyra number → AI replies with short answer + booking link if relevant.
- [ ] "Missed call → text follow-up" autopilot rule (if Kyra busy on another call): "Hi, Kyra here. You called a moment ago — can I help by text?"
- [ ] Per-contact SMS history threaded with voice call history (unified conversation view).

### Web chat widget

- [ ] Simplify widget code for solos: one-line embed snippet + copy button.
- [ ] Widget remembers visitor across page views (localStorage session).
- [ ] Lead capture: if visitor asks about service → Kyra asks for name + phone + email → writes to CRM.
- [ ] "Continue on SMS" button: if visitor leaves, Kyra texts them.

### Knowledge ingestion

- [ ] Single field at signup: "Your website URL."
- [ ] Async Firecrawl scrape → extract services, hours, FAQs, pricing.
- [ ] Write extracted data to `client_knowledge` + `knowledge_documents`.
- [ ] Sync to container via `lib/knowledge/sync.ts` so Kyra's system prompt has the full context.

### Daily briefing email

- [ ] Use existing `lib/briefing/daily-briefing.ts`.
- [ ] Send 7am local time.
- [ ] Format: "Good morning! Kyra handled 14 interactions overnight: 3 booked appointments, 2 follow-ups sent, 1 customer escalated to you (see below), 8 general inquiries."
- [ ] Include clickable appointment list + escalation details.
- [ ] Build as habit-forming retention lever.

### Simple analytics

- [ ] Dashboard home shows: conversations today / this week / this month, appointments booked, revenue attributed (from payment links), top questions asked.
- [ ] No charts, no drilldowns. Numbers that make the customer go "Kyra is working."

### Exit criteria

- 10 beta customers running real volume: inbound calls → booked appointments, SMS replies, web chat leads.
- Escalation rate <15% (AI handles 85%+ without human).
- Zero billing bugs, zero provisioning failures, zero webhook signature failures.
- At least 3 beta customers on Day-30 with consistent daily usage.

---

## Phase 3 — Polish + Soft Launch (Weeks 8-12)

### UX friction eradication

- [ ] Instrument every click + state transition with PostHog or similar.
- [ ] Log every support email with a tag: "confusion_point_X."
- [ ] Fix top-20 confusion points from beta.
- [ ] Add in-dashboard help tooltips (not documentation pages — tooltips at point of need).

### Self-serve billing

- [ ] Upgrade / downgrade / pause / cancel all work without emailing support.
- [ ] Annual plan toggle ($29/mo = $348/yr, 25% off).
- [ ] Visible credit usage on dashboard with "upgrade" CTA at 80% consumed.
- [ ] Auto-pause worker if subscription fails (avoid bill-shocking overrun on voice minutes).

### Notifications

- [ ] Email: missed call summary, new lead, appointment booked, low credits, billing issue, Kyra escalation.
- [ ] Optional SMS notifications for escalations (customer owner's cell).
- [ ] Optional Slack integration ($99 Solo Pro feature).
- [ ] Unsubscribe each notification type independently.

### Mobile

- [ ] Solo dashboard must be mobile-first. Solos check phone, not desktop.
- [ ] Responsive for every screen.
- [ ] Test on iOS Safari, Android Chrome, both in portrait.

### Content

- [ ] Record 5 video walkthroughs (one per top vertical).
- [ ] Write help docs: "How to forward your phone to Kyra," "How to train Kyra on your FAQs," "How to use payment links."
- [ ] Build in-product changelog at `/kyra/whats-new`.

### Support infrastructure

- [ ] Customer support email → Linear / Zendesk / help-scout.
- [ ] Response SLA: 24h for Solo, 4h for Pro, 1h for Business.
- [ ] Public status page (Cloudflare / Statuspage).

### Launch assets

- [ ] Product Hunt listing with demo video, 5 customer quotes, price anchor vs GHL.
- [ ] Vertical Facebook group outreach list (10 groups: r/plumbing, dental biz owners, etc.).
- [ ] Pre-launch waitlist on meetkyra.com (already built — dust it off).
- [ ] 10 GHL agency partners to resell Kyra Solo (rev share).
- [ ] Launch-day email to Kyra's existing agency users ("Bring your solo clients to Kyra").

### Exit criteria

- 100 paying customers.
- Monthly churn <5%.
- NPS >40.
- CAC < $120 (3 months of Solo subscription).

---

## Phase 4 — Growth (Months 4-6)

### SEO / content

- [ ] 10 industry landing pages at `meetkyra.com/for/{industry}` with real case study per vertical.
- [ ] 50 long-tail content pieces: "AI receptionist for plumbers," "Missed call auto-reply for dentists," "How a solo lawyer gets 3 new clients a month with AI."
- [ ] Each piece ends in CTA to `/start`.
- [ ] Programmatic pages for top 50 verticals × top 20 US cities = 1,000 pages. Use existing `app/ai-for/[slug]` + `app/try/[industry]` infrastructure.

### Paid acquisition test

- [ ] $5k/mo initial budget on Google Ads.
- [ ] Target high-intent keywords: "answering service for plumbers," "AI receptionist small business," "[competitor] alternative."
- [ ] Landing pages per keyword (don't send to homepage).
- [ ] Target CAC <$120. If blown, pause and iterate copy.

### Affiliate program

- [ ] 50% rev share for 12 months per referred customer.
- [ ] Targets: GHL agencies (who can bring their solo clients here), home service influencers, SMB YouTube channels.
- [ ] Self-serve portal at `meetkyra.com/partners`.
- [ ] Leverage existing `lib/billing/referral-activation.ts` — solo-to-solo referral is already built.

### Integrations

- [ ] QuickBooks OAuth — auto-create invoices from Kyra-booked appointments.
- [ ] Jobber + HousecallPro webhook sync — if customer uses one, Kyra books into it.
- [ ] Cal.com integration — for solos who don't use Google Calendar.
- [ ] Zapier (already built via `/api/inbound/webhook` + per-client token) — ship the app.
- [ ] ServiceTitan for mid-market services (later).

### Solo Pro + Business upsell

- [ ] Launch $99 Solo Pro + $199 Solo Business tiers.
- [ ] In-app upgrade prompts when hitting limits.
- [ ] "Running out of voice minutes? Upgrade to Pro for 3x more."

### Multi-language

- [ ] Target Hispanic-owned businesses (21M in US, chronically underserved).
- [ ] Spanish + Portuguese first. Add 13 more languages existing in `lib/` infrastructure.
- [ ] Dedicated `meetkyra.com/es` landing + Spanish onboarding.
- [ ] Voice: Retell supports multilingual natively.

### Exit criteria

- $50k MRR (850 paying customers).
- CAC < $120.
- 1 repeatable paid channel (Google Ads or affiliate) producing 30%+ of new signups.
- 40% of revenue from Solo Pro + Business tiers (proof of upsell path).

---

## Kill list (pause, delete, or gate behind agency plan only)

For the solo flow, these features get cut or hidden. Not deleted from code immediately — gated behind `isAgencyPlan` check so agency customers still see them, solos don't.

**Hide from solo dashboard entirely:**
- `components/dashboard/client-tabs/crm-tab.tsx` (2920 LOC — replace with simple contacts list)
- `components/dashboard/client-tabs/marketing-tab.tsx` (1077 LOC)
- `components/dashboard/client-tabs/dispatch-tab.tsx` (1275 LOC)
- `components/dashboard/client-tabs/email-marketing-tab.tsx` (1382 LOC)
- `components/dashboard/client-tabs/workflows-tab.tsx` (706 LOC)
- `components/dashboard/client-tabs/website-tab.tsx` (902 LOC)
- `components/seo-geo-command-center.tsx` (1966 LOC)
- `components/dashboard/client-tabs/it-operations-tab.tsx` (master-only already)
- `components/dashboard/client-tabs/ai-workers-tab.tsx` (996 LOC — team templates irrelevant to solos)
- `components/dashboard/client-tabs/secrets-tab.tsx` (solos don't need BYOK secrets management)
- All referral widgets except the main referral share (`referral-nudge`, `revenue-unlock-card`)
- `components/dashboard/sales-lead-widget.tsx` (master-only internal tool)
- `components/dashboard/ultron-summary-card.tsx` (multi-client concept)

**Delete outright:**
- `components/command-palette.tsx` — already deleted, verify no stragglers
- `components/agency/VoiceCommandButton.tsx` — 333 LOC of orphan
- `components/pipelines/PipelineProgress.tsx` — 158 LOC orphan
- `components/chat/WakingUpIndicator.tsx` — 73 LOC orphan
- `components/landing/activity-ticker.tsx`, `live-stats.tsx`, `lead-capture.tsx` — orphans
- `components/onboarding/guided-tour.tsx` + `launch-progress.tsx` — replace with simpler solo tour
- `components/marketing/testimonial-placeholder.tsx` — explicit "removed" comment exists
- `components/open-control-ui-button.tsx` — orphan
- `components/billing/PlanRedirect.tsx` — no-op stub
- `lib/fly/*` — already deleted, verify references
- `lib/openclaw/*` once 3 legacy routes migrated
- `lib/email/sequences.ts` — deprecated stub
- `types/*` files with aspirational shapes

**Hide from public marketing:**
- `/march-16` — past event
- `/india` — past event
- 3 of 4 pitch decks
- `/get-demo` — redundant
- `/build` — merge into `/start`
- `/website-builder` — merge into `/start`
- `/get-started` — merge into `/start`
- `/solo` — merge into `/start` (keep slug alive for SEO)

**Gate behind agency plan:**
- All of `/agency/*` dashboard surface
- Stripe Connect flows
- Multi-client provisioning
- Sub-account invitations
- Team member management
- White-label portal customization
- A/B testing
- Pipeline outbound / AI Closer
- Campaigns, funnels generators

---

## Pricing

```
SOLO ............ $39/mo    $29/mo annual ($348/yr, 25% off)
  1 AI employee
  500 chat/SMS conversations/mo
  100 voice minutes/mo (Twilio via Retell)
  Web chat widget
  Google Calendar integration
  Basic CRM (contacts + notes)
  Daily briefing email
  7-day free trial

SOLO PRO ........ $99/mo    $79/mo annual
  Everything in Solo, plus:
  2,000 conversations
  300 voice minutes
  AI review response
  Stripe payment links
  5 automation workflows
  GHL connect (for existing GHL users)
  Priority email support (4h SLA)

SOLO BUSINESS ... $199/mo   $159/mo annual
  Everything in Pro, plus:
  5,000 conversations
  1,000 voice minutes
  Multi-language (15 languages)
  Custom voice clone
  Advanced analytics
  QuickBooks + Jobber + ServiceTitan integrations
  Same-day priority support
```

Agency tiers (`starter`, `pro`, `scale`) stay around for the 5% who need multi-location — hidden from main funnel, available via "Running an agency? →" link.

---

## Metrics dashboard (build in Phase 2)

**Acquisition**
- Site visitors → signup conversion
- Signup → paying customer conversion (post-trial)
- CAC per channel (organic / paid / referral / partner)

**Activation**
- Time from signup → first AI-handled conversation (target <5min)
- % who install widget on website
- % who provision phone number
- % who connect calendar
- % who have a real customer interaction within 48h

**Engagement**
- Daily active workers (workers handling ≥1 conversation per day)
- Avg conversations per day per customer
- % escalation rate (AI handed to human)
- Inline CSAT (thumbs up/down after conversation)

**Retention**
- Day-7 retention
- Day-30 retention
- Day-60 retention (NORTH STAR)
- Monthly churn %
- Upgrade rate (Solo → Solo Pro)

**Financial**
- MRR
- ARR
- ARPU
- CAC
- LTV (target LTV:CAC >3:1)
- Gross margin %
- NRR (upgrades + upsells)

---

## Risks & mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Leaked JWT is exploited before rotation | High | Critical | Rotate on Day 1; audit access logs |
| Twilio phone provisioning fails at scale | Medium | High | Pre-provision pool of 500 numbers; fallback to Vonage |
| Retell costs explode with volume | High | High | Hard per-client voice-minute caps; auto-cutoff; monitor daily |
| LLM API costs explode | High | High | Use `kyra-router` Tier-0 template answers for ~40% of traffic; existing `KYRA_MONTHLY_BUDGET=$500` cap |
| GHL launches solo tier | Medium | High | Ship first; solo UX is different DNA (GHL will botch the simplicity); protect via speed |
| OpenAI/Anthropic launches direct-SMB tool | Low | High | Moat is integration depth (voice + calendar + CRM + SMS as one product); model cos don't do infra |
| Churn >10% (product doesn't stick) | Medium | Critical | 7-day trial filters tire-kickers; voice-forwarding creates real switching cost; daily briefing builds habit |
| Technical debt collapse (tests, RLS, architecture) | High | Critical | Phase 0 non-negotiable; no acquisition until stabilized |
| Regulatory (TCPA, recording consent, HIPAA) | Medium | High | Existing `sending_hours` gating; add recording disclaimer; explicit HIPAA-out for health verticals |
| Customer support overload at scale | Medium | Medium | Video walkthroughs + in-app tooltips; SLA tiered by plan |

---

## Go/No-Go gates

**Gate 1 (end of Phase 0):** Security audit passed, 5 routes tested, billing works. If not: extend Phase 0. Do not advance.

**Gate 2 (end of Phase 1):** 10 real signups in <5 min each. If median signup time >10 min: onboarding is broken, iterate.

**Gate 3 (end of Phase 2):** 10 beta customers actually using Kyra daily, <15% escalation rate. If not: product is broken, iterate.

**Gate 4 (end of Phase 3):** 100 paying customers, <5% monthly churn, NPS >40. If not: don't scale paid acquisition, fix retention first.

**Gate 5 (end of Phase 4):** $50k MRR, CAC <$120, 1 repeatable paid channel. If not: don't raise capital, keep iterating on fundamentals.

---

## What success looks like, Month 12

- 2,500 paying customers
- $150k MRR / $1.8M ARR
- 60%+ gross margin
- 5% monthly churn
- 2-3 full-time engineers on payroll
- Top-5 Google result for "AI receptionist small business"
- Featured on Product Hunt front page, YC's Startup School, local service industry media
- `meetkyra.com` is synonymous with "AI receptionist for solo businesses"

Kyra becomes the thing a plumber's accountant recommends when they see the line item "$39 Kyra" on the bank statement and asks what it is.
