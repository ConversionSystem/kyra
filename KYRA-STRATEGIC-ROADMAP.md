# Kyra — Strategic Roadmap & Architecture

**Date:** February 13, 2026  
**Last Updated:** February 16, 2026 (23:10 CET — Phase 6 features + market intel added)  
**Version:** 2.2  
**Status:** Active — Phase 3 IN PROGRESS (~85% built), Phase 6 features queued from video analysis

---

## 1. Vision

**Kyra transforms OpenClaw into a deployable, managed AI workforce for agencies.**

We don't host OpenClaw. We transform it into something agencies can sell.

Every competitor in the OpenClaw hosting space gives users a container and says "good luck." Kyra gives agencies a business — pre-integrated with the tools their clients already use, branded as their own, billable to their clients, managed from a single dashboard.

The endgame: an agency signs up, picks an industry template, connects their client's GHL sub-account, and has a fully operational AI employee deployed in under 5 minutes. The AI reads the CRM, responds to customers via SMS, books appointments, moves pipeline deals — and the agency bills their client for it.

---

## 2. The Problem We Solve

### For Agencies
Agencies sell marketing, CRM, and automation services. Their clients increasingly demand AI. But:

- **GHL's built-in AI is limited** — rule-based chatbots, per-usage billing confusion, no real autonomy, agents only do what you hardcode into workflows
- **Building custom AI is expensive** — hiring developers, managing infrastructure, maintaining integrations
- **OpenClaw is powerful but unapproachable** — requires CLI setup, API keys, server management, ongoing maintenance
- **No platform lets agencies deploy + manage + bill AI employees at scale** — they either DIY everything or settle for GHL's built-in limitations

### For Agency Clients (End Users)
Small and mid-size businesses want AI that works, not AI they configure:

- They don't want to learn OpenClaw, prompt engineering, or API management
- They want an AI that already knows their business, CRM, and customers
- They want it to work in the channels they already use (SMS, WhatsApp, web chat)
- They want their agency to handle it, like they handle everything else

---

## 3. Kyra's Moat (7 Layers)

What makes Kyra defensible — things competitors cannot easily replicate:

### Layer 1: Intelligence Layer, Not Hosting
OpenClaw hosting competitors (Agent37, SpinUpClaw, InstantClaw, etc.) give you a raw container. Kyra gives you a **pre-configured, industry-aware, CRM-connected AI employee.** The difference between handing someone Linux and handing them a MacBook.

### Layer 2: Multi-Tenant Agency Architecture
Every competitor is single-user. One account = one OpenClaw instance. Kyra is built from the ground up for agencies managing dozens or hundreds of client AIs from one dashboard. Adding multi-tenancy to a single-user hosting product is a full rebuild — we start with it.

### Layer 3: Deep GHL Integration
600,000+ GHL users. $497/mo agency plans with unlimited sub-accounts. Agencies live inside GHL. Kyra's AI doesn't just chat — it **reads contacts, sends SMS, moves pipeline stages, books appointments, triggers workflows, manages conversations** through GHL's API. A purpose-built OpenClaw skill that makes the AI a real employee inside the client's CRM. No other OpenClaw host has this.

### Layer 4: White-Label Ownership
Agency brands Kyra as their own platform. Their clients see the agency's logo, domain, colors. The agency IS the AI provider in their client's eyes. This creates lock-in for the agency (they can't easily move their branded platform) and trust for their clients (they're dealing with their agency, not some unknown SaaS).

### Layer 5: Revenue Engine for Agencies
Agencies don't just use Kyra — they **profit from it.** Stripe Connect lets agencies set their own pricing, bill their clients directly, and keep the margin. Kyra isn't a cost center. It's a new revenue line.

### Layer 6: Template Marketplace (Network Effect)
Agencies build and share industry-specific AI configurations. More agencies → more templates → faster deployment → more agencies. This compounds. A new agency signs up, picks the "Dental Practice" template, connects GHL, and has a working AI employee for their client in minutes. No competitor has this flywheel.

### Layer 7: OpenClaw Ecosystem Leverage
Every OpenClaw update — new skills, new channels, new tools, security patches — automatically benefits every Kyra agency and every one of their clients. We ride the open-source ecosystem instead of maintaining a fork. 51 skills, 35 extensions, weekly releases, growing community. Our competitors who build custom tooling have to maintain it all themselves.

---

## 4. Full Architecture

### 4.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      KYRA PLATFORM                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               VERCEL (Frontend + API)                 │   │
│  │                                                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │
│  │  │ Auth     │  │ Billing  │  │ Agency Dashboard  │   │   │
│  │  │(Supabase)│  │(Stripe + │  │ Client Mgmt      │   │   │
│  │  │          │  │ Connect) │  │ Templates         │   │   │
│  │  └──────────┘  └──────────┘  │ White-Label       │   │   │
│  │                               │ Analytics         │   │   │
│  │  ┌──────────┐  ┌──────────┐  └──────────────────┘   │   │
│  │  │ Chat UI  │  │ GHL Poll │ ← Vercel Cron (1/min)   │   │
│  │  │ (Web)    │  │ Endpoint │                          │   │
│  │  └────┬─────┘  └────┬─────┘                          │   │
│  │       │              │                                │   │
│  └───────┼──────────────┼────────────────────────────────┘   │
│          │              │                                     │
│          ▼              ▼                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           FLY.IO (AI Bridge — Frankfurt)              │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────┐     │   │
│  │  │    Direct Anthropic Bridge (chat-bridge.js)  │     │   │
│  │  │                                              │     │   │
│  │  │  • Claude Sonnet 4 (primary model)           │     │   │
│  │  │  • Per-session context (client + contact)    │     │   │
│  │  │  • SSE streaming responses                   │     │   │
│  │  │  • System prompt injection from client config│     │   │
│  │  │  • Auto-stop when idle, wake on request      │     │   │
│  │  └─────────────────────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              EXTERNAL INTEGRATIONS                    │   │
│  │                                                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │
│  │  │ GHL API  │  │ Stripe   │  │ AI Providers      │   │   │
│  │  │ CRM      │  │ Connect  │  │ Anthropic         │   │   │
│  │  │ SMS      │  │ Billing  │  │ OpenAI            │   │   │
│  │  │ Pipeline │  │ Invoices │  │ Google            │   │   │
│  │  │ Calendar │  │ Payouts  │  │ OpenRouter        │   │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Ownership Boundaries

| Layer | Owner | Responsibility |
|-------|-------|---------------|
| **Auth & Identity** | Kyra (Supabase) | User signup, agency accounts, client sub-accounts, OAuth, SSO |
| **Billing & Revenue** | Kyra (Stripe + Connect) | Agency subscriptions, client billing passthrough, usage metering, payouts |
| **Agency Management** | Kyra (Vercel + Supabase) | Dashboard, client CRUD, templates, white-label, analytics |
| **GHL Message Polling** | Kyra (Vercel Cron) | Every-minute poll of GHL Conversations API for new inbound messages |
| **Chat Proxy** | Kyra (Fly.io Bridge) | Message relay, SSE streaming, direct Anthropic API calls |
| **AI Intelligence** | Fly.io Bridge (Claude Sonnet) | AI responses, context management, system prompt injection |
| **CRM Integration** | Kyra (Vercel) + GHL API | OAuth tokens, conversation search, send messages, contact management |

### 4.3 Data Flow: SMS AI Reply (LIVE — Feb 16, 2026)

```
1. Customer sends SMS: "I need an appointment"
          │
          ▼
2. GHL receives SMS → stores in Conversations
   (lastMessageDirection: "inbound", unreadCount: +1)
          │
          ▼
3. Vercel Cron fires every 60 seconds
   → GET /api/ghl/poll (authenticated via CRON_SECRET)
          │
          ▼
4. Poller (lib/ghl/poller.ts):
   ├── Gets all agency_clients with GHL tokens from Supabase
   ├── For each client: GET /conversations/search?locationId=X
   ├── Filters: lastMessageDirection === "inbound" && unreadCount > 0
   ├── For each matching conversation:
   │   ├── GET /conversations/{id}/messages?limit=5
   │   ├── Finds latest inbound message
   │   ├── Checks if outbound reply already exists after it (dedup)
   │   └── If no reply yet → process message
          │
          ▼
5. Fly.io Bridge (kyra-gateway.fly.dev):
   ├── Receives: { message, sessionKey, systemContext }
   ├── sessionKey = "agent:client:{clientId}:contact:{contactId}"
   ├── Calls Anthropic Messages API (Claude Sonnet)
   ├── Streams SSE response back
          │
          ▼
6. Poller sends reply:
   ├── POST /conversations/messages (GHL Send Message API)
   ├── type: "SMS", contactId, message: AI response
   ├── Auto-refreshes OAuth token on 401
          │
          ▼
7. Customer receives SMS reply
   (Total time: <60 seconds from send, typically 5-15s of AI processing)
```

### 4.4 Data Flow: Agency Creates New Client

```
1. Agency logs into Kyra dashboard (kyra.conversionsystem.com)
          │
          ▼
2. Clicks "Add Client" → enters business name, industry, picks template
          │
          ▼
3. Connects GHL sub-account (OAuth flow)
   ├── Clicks "Connect GHL" → redirected to GHL authorization page
   ├── Chooses GHL location (sub-account)
   ├── Grants access → redirected back to /api/crm/callback
   ├── Kyra exchanges code for tokens → stores in agency_clients table
          │
          ▼
4. Client is now active:
   ├── GHL location_id linked to agency_client
   ├── Poller automatically picks up new inbound messages
   ├── AI responds using client-specific system prompt
   ├── No additional configuration required for basic SMS AI
          │
          ▼
5. Agency customizes (optional):
   ├── Edit AI personality (SOUL.md editor in dashboard)
   ├── Configure template-specific behaviors
   ├── Set business hours, response preferences
   ├── Test chat in dashboard before going live
```

### 4.5 White-Label Architecture

```
Agency "GrowthPilot" configures:
  - Domain: ai.growthpilot.com
  - Logo: growthpilot-logo.png
  - Colors: #1a73e8 primary, #fff background
  - Name: "GrowthPilot AI"

Their client sees:
┌──────────────────────────────────────┐
│  🟦 GrowthPilot AI                  │
│  ai.growthpilot.com                  │
│                                      │
│  "Hi! I'm your AI assistant from     │
│   GrowthPilot. How can I help today?"│
│                                      │
│  [Type a message...]                 │
└──────────────────────────────────────┘

Zero mention of Kyra, OpenClaw, or Conversion System.
Agency owns the relationship. Agency owns the brand.
```

---

## 5. The kyra-ghl Skill (Core Differentiator)

This is the custom OpenClaw skill that makes Kyra's AI an actual employee inside GHL.

### 5.1 Capabilities (10 GHL API Groups)

| # | Action | GHL API Endpoint | What the AI Can Do |
|---|--------|-----------------|-------------------|
| 1 | **Read Contacts** | GET /contacts | Search by name, email, phone; see tags, custom fields, notes |
| 2 | **Update Contacts** | PUT /contacts/{id} | Add tags, update fields, add notes after conversations |
| 3 | **Read Conversations** | GET /conversations | See full message history with a customer |
| 4 | **Send Messages** | POST /conversations/messages | Send SMS, email, WhatsApp through GHL |
| 5 | **Read Pipeline** | GET /opportunities | See deal stages, values, assigned users |
| 6 | **Move Pipeline** | PUT /opportunities/{id} | Move deals between stages based on conversation outcome |
| 7 | **Read Calendar** | GET /calendars/events | Check availability, see upcoming appointments |
| 8 | **Book Appointments** | POST /calendars/events | Schedule appointments directly |
| 9 | **Read Custom Fields** | GET /custom-fields | Understand business-specific data |
| 10 | **Trigger Workflows** | POST /contacts/{id}/workflow | Kick off GHL automation sequences |

### 5.2 SKILL.md Format (How It Works Inside OpenClaw)

```markdown
# kyra-ghl — GoHighLevel CRM Integration

## What This Skill Does
You have full access to the client's GoHighLevel CRM. You can read contacts,
send messages, manage the pipeline, and book appointments.

## Available Tools
- `ghl contacts search <query>` — Find contacts
- `ghl contacts get <id>` — Get full contact details
- `ghl conversations list <contact_id>` — Message history
- `ghl conversations send <contact_id> <channel> <message>` — Send SMS/email
- `ghl pipeline list` — See all deals
- `ghl pipeline move <opp_id> <stage>` — Move a deal
- `ghl calendar available <date>` — Check availability
- `ghl calendar book <contact_id> <datetime>` — Book appointment
- `ghl workflow trigger <contact_id> <workflow_id>` — Trigger automation

## Rules
- Always check conversation history before responding to a customer
- When you book an appointment, confirm the time with the customer first
- After meaningful interactions, update the contact's notes in GHL
- Move pipeline stages based on conversation outcomes (e.g., qualified → proposal)
- Never send messages without being triggered by a conversation or task
```

The skill includes a CLI binary (`ghl`) that wraps the GHL REST API, using the per-client OAuth token stored in the container's env.

### 5.3 Current Implementation Status

**Phase 1 (LIVE):** Direct API integration via `lib/ghl/api.ts` on Vercel
- ✅ OAuth token management (store, refresh on 401)
- ✅ Conversation search (polling for inbound messages)
- ✅ Send messages (SMS, with type normalization)
- ✅ Contact lookup by conversation

**Phase 2 (NEXT):** Full `kyra-ghl` OpenClaw skill
- Standalone CLI tool installable in containers
- Full 10-capability coverage
- SKILL.md for AI auto-discovery
- Per-client OAuth token injection

---

## 6. Product Tiers

### 6.1 For Agencies

| | Starter | Pro | Scale |
|--|---------|-----|-------|
| **Price** | $99/mo | $249/mo | $499/mo |
| **Included Clients** | 5 | 15 | 50 |
| **Per Extra Client** | $29/mo | $25/mo | $19/mo |
| **GHL Integration** | ✅ | ✅ | ✅ |
| **Agency Dashboard** | ✅ | ✅ | ✅ |
| **Templates** | Community | Community + Create | Create + Sell |
| **White-Label** | — | ✅ Custom domain + branding | ✅ |
| **Stripe Connect** | — | ✅ Bill your clients | ✅ |
| **Team Members** | 1 | 5 | Unlimited |
| **API Access** | — | — | ✅ |
| **Support** | Email | Priority | Dedicated |
| **AI Credits Included** | $50/mo pool | $150/mo pool | $400/mo pool |
| **BYOK (Bring Your Own Keys)** | — | ✅ | ✅ |

### 6.2 For Individuals (Funnel to Agency)

| | Free | Pro |
|--|------|-----|
| **Price** | $0 | $20/mo |
| **Credits** | 100/mo | 500/mo |
| **Channels** | Web chat | Web + Telegram + Discord |
| **Skills** | 5 basic | All 51+ |
| **GHL** | — | — |
| **Purpose** | Try Kyra | Personal assistant |

Individuals who outgrow Pro and want to offer AI to clients → natural upgrade path to Agency Starter.

---

## 7. Execution Phases (5 Phases)

### Phase 0: Foundation ✅ COMPLETE
**Goal:** Real AI containers serving real responses.

| Task | Status | Notes |
|------|--------|-------|
| Wire container pipeline (Vercel → Fly.io bridge → Claude) | ✅ Done | Direct Anthropic bridge, not OpenClaw gateway |
| Verify SSE streaming end-to-end | ✅ Done | chat-bridge.js on Fly.io, port 18789 |
| Test container cold start, sleep/wake cycle | ✅ Done | Fly auto-stop, ~2s wake time |
| Per-user config: model preference + SOUL.md from onboarding | ✅ Done | System prompt builder in container.ts |
| "Waking up your AI" loading state for cold starts | ✅ Done | Dashboard chat works |

**Exit criteria met:** ✅ Messages in Kyra's web chat processed by Fly.io bridge with Claude Sonnet.

**Key decision:** Replaced OpenClaw gateway with direct Anthropic bridge. Gateway never bound to port inside Fly.io container. Bridge is 69MB vs 926MB, instant startup.

---

### Phase 1: Agency Core ✅ COMPLETE
**Goal:** Agencies can sign up and manage client AIs.

| Task | Status | Notes |
|------|--------|-------|
| Supabase schema: `agencies`, `agency_clients`, `agency_templates` | ✅ Done | Full schema with RLS |
| Agency signup flow | ✅ Done | Separate from individual |
| Agency dashboard: overview, client list, create client | ✅ Done | `/agency`, `/agency/clients` |
| Client detail page: test chat, settings, usage stats | ✅ Done | 4-tab detail view |
| Per-client container routing | ✅ Done | `agent:client:{id}:contact:{contactId}` session keys |
| Client SOUL.md editor in dashboard | ✅ Done | AI Personality tab |
| Template picker (5 built-in templates) | ✅ Done | Seeded in Supabase |

**Exit criteria met:** ✅ Agency creates account → adds clients → each has isolated AI → managed from one dashboard.

---

### Phase 2: GHL Integration ✅ COMPLETE (Feb 16, 2026)
**Goal:** AI reads and writes the client's GHL CRM.

| Task | Status | Notes |
|------|--------|-------|
| Register Kyra on GHL developer marketplace | ✅ Done | Draft mode, free pricing |
| Build GHL OAuth flow: connect sub-account → store tokens | ✅ Done | `/api/crm/callback`, full token exchange |
| GHL inbound message → AI response → GHL reply | ✅ Done | **Polling approach** (not webhooks) |
| Token refresh handling | ✅ Done | Auto-refresh on 401 in `lib/ghl/api.ts` |
| Test full loop: customer SMS → AI → SMS reply | ✅ Done | Working as of Feb 16, 19:00 CET |

**⚠️ Critical pivot:** GHL marketplace webhooks DO NOT fire for draft apps. Replaced webhook approach with **polling** — Vercel Cron hits `/api/ghl/poll` every 60 seconds, searches GHL Conversations API for unread inbound messages, generates AI response via Fly.io bridge, sends reply via GHL Send Message API. Self-deduplicating.

**Exit criteria met:** ✅ Customer sends SMS to GHL number → Kyra AI replies via SMS within 60 seconds.

**Remaining for Phase 2 hardening:**
- [ ] Build full `kyra-ghl` OpenClaw skill (CLI with 10 capability groups)
- [ ] AI reads contact record before responding (context enrichment)
- [ ] Pipeline stage updates based on conversation outcomes
- [ ] Appointment booking through GHL Calendar API
- [ ] Auto-generate SOUL.md from GHL business data

---

### Phase 3: Billing & White-Label (Week 4) — ~85% COMPLETE
**Goal:** Agencies can charge their clients and brand the platform.

| Task | Priority | Effort | Status | Notes |
|------|----------|--------|--------|-------|
| Stripe Connect Express onboarding for agencies | P0 | 6h | ✅ Done | `lib/stripe/connect.ts`: createConnectAccount, onboardingLink, dashboardLink, statusCheck |
| Agency sets per-client pricing in dashboard | P0 | 4h | ✅ Done | `/agency/billing` page: default pricing editor + per-client billing table |
| Automated client invoicing via Stripe Connect | P0 | 6h | ✅ Done | `createClientSubscription()` with per-client recurring billing on connected accounts |
| Application fee (Kyra's cut per transaction) | P0 | 2h | ✅ Done | 10% `application_fee_percent` on all subscriptions |
| Revenue dashboard: MRR, client payments, payout schedule | P1 | 6h | ✅ Done | Billing dashboard: gross MRR, platform fee, net revenue, billing history table |
| Stripe webhook handlers (invoice.paid, sub updates, account.updated) | P0 | 4h | ✅ Done | `lib/stripe/webhooks.ts`: 4 event handlers + signature verification |
| Agency subscription management (create, upgrade, cancel, status) | P0 | 4h | ✅ Done | `lib/stripe/subscriptions.ts`: full plan lifecycle |
| Subscription cancellation + billing amount changes | P1 | 3h | ✅ Done | `cancelClientSubscription()`, `updateClientBillingAmount()` with prorations |
| One-time invoices for manual billing | P2 | 2h | ✅ Done | `createClientInvoice()` with application fee |
| Database migration: Stripe Connect billing fields | P0 | 1h | ✅ Done | `20260216001_stripe_connect_billing.sql` applied |
| API routes for Connect (onboard, status, dashboard) | P0 | 3h | ✅ Done | `/api/stripe/connect/{onboard,status,dashboard}` |
| White-label: settings stored (logo, colors, domain, company name) | P1 | 2h | ✅ Done | `AgencySettings` type + settings form in `/agency/settings` |
| **Create Stripe products/prices in Stripe Dashboard** | P0 | 30min | ⬜ TODO | Need price IDs for starter/pro/scale + per_client |
| **Set Stripe env vars on Vercel** | P0 | 15min | ⬜ TODO | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, 4 price IDs |
| **Configure Stripe webhook endpoint** | P0 | 15min | ⬜ TODO | Point to `kyra.conversionsystem.com/api/stripe/webhooks` |
| **End-to-end billing test** | P0 | 2h | ⬜ TODO | Full flow: agency signup → Connect → activate client billing |
| White-label: apply settings to chat UI + login page | P1 | 4h | ⬜ TODO | Settings are stored but not rendered into UI yet |
| White-label: custom subdomain (CNAME + Vercel domains API) | P1 | 4h | ⬜ TODO | |
| White-label: email templates with agency branding | P2 | 3h | ⬜ TODO | |

**What's built (backend):** Complete Stripe Connect Express flow — account creation, onboarding, dashboard access, per-client subscriptions with 10% application fee, cancellation, price updates, one-time invoices, webhook handlers for all billing events. Full agency subscription lifecycle (create/upgrade/downgrade/cancel). Billing dashboard with revenue metrics, client billing table, and transaction history.

**What's remaining:** Stripe configuration (products, prices, env vars — ~1 hour of setup), end-to-end testing (~2 hours), and white-label rendering (~8 hours total for UI + custom domains + email).

**Exit criteria:** Agency charges client $297/mo through Kyra → Kyra takes 10% → agency receives payout. Agency Pro users have branded domain + chat UI.

---

### Phase 4: Templates & Marketplace (Week 5-6) — PARTIALLY COMPLETE
**Goal:** One-click industry deployments + network effects.

| Task | Priority | Effort | Status | Notes |
|------|----------|--------|--------|-------|
| Template data model: SOUL.md + skills + cron + system prompts | P0 | 4h | ✅ Done | `agency_templates` table with soul_template, skills[], cron_config, ghl_config |
| 5 built-in industry templates (see below) | P0 | 10h | ✅ Done | Seeded in migration: LeadPilot, DentalAssist, PropertyPro, ServicePro, RetailAssist |
| Enhanced template schema (suggested_skills, sample_responses, ghl_config) | P1 | 3h | ✅ Done | `20260216001_enhanced_templates.sql` migration |
| Template picker in "Add Client" flow (enhanced) | P0 | 4h | ⬜ | Basic picker exists; needs richer preview |
| Agency creates template from working client config | P1 | 6h | ⬜ | |
| Template marketplace: browse, preview, install | P1 | 8h | ⬜ | |
| Paid templates: pricing, revenue split (70/30) | P2 | 6h | ⬜ | |

**Built-in templates:**

| Template | Industry | AI Capabilities |
|----------|----------|----------------|
| **LeadPilot** | General | Lead qualification, appointment booking, follow-up sequences |
| **DentalAssist** | Dental/Medical | Patient scheduling, reminders, review requests, insurance FAQ |
| **PropertyPro** | Real Estate | Showing scheduler, listing updates, buyer/seller follow-up |
| **ServicePro** | Home Services | Estimate requests, job scheduling, warranty tracking |
| **RetailAssist** | Retail/E-comm | Product inquiries, order status, loyalty programs |

**Exit criteria:** New agency picks "DentalAssist" template → connects GHL → client has a working dental AI in under 5 minutes.

---

### Phase 5: Distribution & Scale (Week 7+) — PREP WORK COMPLETE
**Goal:** Growth engine + platform maturity.

| Task | Priority | Effort | Status | Notes |
|------|----------|--------|--------|-------|
| GHL Marketplace listing copy | P0 | 4h | ✅ Done | `marketplace/ghl-app-listing.md` — full listing with features, use cases, FAQ, pricing |
| Demo video script + storyboard | P0 | 3h | ✅ Done | `marketplace/demo-video-script.md` — 2:30 script + 60s social cut |
| Launch posts (GHL FB, Reddit, LinkedIn, X) | P0 | 3h | ✅ Done | `marketplace/launch-posts.md` — platform-specific copy ready to post |
| Cold outreach email sequence (3 emails) | P0 | 2h | ✅ Done | `marketplace/outreach-email.md` — first touch + 2 follow-ups |
| **Record demo video** | P0 | 2h | ⬜ TODO | Script ready — needs screen recording + voiceover |
| **Take 8 marketplace screenshots** | P0 | 30min | ⬜ TODO | Listed in ghl-app-listing.md |
| **Submit Kyra to GHL Marketplace** | P0 | 30min | ⬜ TODO | Listing copy ready to paste; needs video + screenshots first |
| GHL Marketplace landing page + onboarding flow | P0 | 4h | ⬜ | |
| Disable GHL Conversation AI on connected sub-accounts | P1 | 2h | ⬜ | |
| BYOK: agencies provide their own AI API keys | P1 | 6h | ⬜ | |
| Usage metering: actual token consumption → credits | P1 | 8h | ⬜ | |
| Voice AI: phone call handling via Twilio/Telnyx | P2 | 2 weeks | ⬜ | |
| Multi-agent per client (receptionist + sales + support) | P2 | 1 week | ⬜ | |
| Analytics dashboard: conversations, resolutions, bookings | P2 | 1 week | ⬜ | |
| API for agencies to programmatically manage clients | P2 | 1 week | ⬜ | |
| **First outreach to 10-20 GHL agencies** | P0 | 2h | ⬜ TODO | Email templates ready; needs target list |

**Exit criteria:** Kyra is discoverable inside GHL Marketplace. Agencies find it → install → deploy AI for clients.

---

## 8. Revenue Model

### 8.1 Revenue Streams (6 Streams)

| # | Stream | Source | Margin |
|---|--------|--------|--------|
| 1 | **Agency Subscriptions** | $99-499/mo base plans | High (covers platform costs) |
| 2 | **Per-Client Fees** | $19-29/mo per client above included | High (AI costs ~$2-5/client) |
| 3 | **Stripe Connect Application Fees** | 10% of agency→client billing | Pure margin |
| 4 | **AI Credit Top-Ups** | Agencies buy additional credits | ~40% margin (after AI API costs) |
| 5 | **Template Marketplace** | 30% cut of paid template sales | Pure margin |
| 6 | **BYOK Markup** | Agencies on BYOK still pay platform fee | High (no AI costs for us) |

### 8.2 Unit Economics Per Agency Tier

| Component | Cost | Revenue |
|-----------|------|---------|
| **Agency Starter (5 clients)** | | **$99/mo** |
| Fly.io bridge usage (shared, auto-stop) | ~$5-15/mo | |
| AI API usage (Claude Sonnet, shared pool) | ~$20-40/mo | |
| Vercel/Supabase (amortized) | ~$5/mo | |
| **Net per Starter agency** | **~$30-60/mo** | **$99/mo → $39-69 margin** |
| | | |
| **Agency Pro (15 clients + 10 extra)** | | **$249 + (10 × $25) = $499/mo** |
| AI API usage (higher volume) | ~$60-120/mo | |
| Infrastructure (amortized) | ~$20/mo | |
| Stripe Connect 10% on ~$7,500 client billing | | **~$750/mo** |
| **Net per Pro agency** | **~$80-140/mo** | **$1,249/mo → $1,100+ margin** |

### 8.3 Path to $50K MRR

| Milestone | Agencies | Avg Clients/Agency | Total Clients | MRR |
|-----------|----------|-------------------|---------------|-----|
| Month 1 | 5 | 3 | 15 | ~$1,000 |
| Month 3 | 15 | 6 | 90 | ~$5,000 |
| Month 6 | 40 | 10 | 400 | ~$18,000 |
| Month 9 | 70 | 12 | 840 | ~$35,000 |
| Month 12 | 100 | 15 | 1,500 | ~$55,000 |

Primary growth lever: **GHL Marketplace listing** (600K+ users see it).

---

## 9. Competitive Positioning

### 9.1 vs OpenClaw Hosting Providers

| | Agent37, SpinUpClaw, InstantClaw, etc. | **Kyra** |
|--|----------------------------------------|----------|
| **Customer** | Individual user | Agency (managing 5-100+ clients) |
| **Product** | Raw OpenClaw container | Pre-configured AI employee platform |
| **GHL Integration** | None | Deep (read/write CRM, conversations, pipeline) |
| **Multi-tenancy** | Single user | Agency → clients hierarchy |
| **White-label** | No (their branding) | Agency's brand, domain, colors |
| **Billing** | User pays host | Agency bills clients, keeps margin |
| **Templates** | None | Industry-specific, marketplace |
| **Price per user** | $3.99-49/mo | $19-29/client (agency pays, not end user) |
| **Revenue per customer** | $3.99-49/mo | $99-499/mo + per-client fees + Stripe Connect |

### 9.2 vs GHL Built-in AI (Conversation AI)

| | GHL Conversation AI | **Kyra** |
|--|---------------------|----------|
| **Intelligence** | Rule-based, workflow-dependent | Full Claude Sonnet: autonomous, multi-step reasoning |
| **Customization** | Prompt templates in GHL UI | Full workspace: SOUL.md, MEMORY.md, custom prompts |
| **Memory** | None (stateless per conversation) | Persistent: per-contact session keys, remembers context |
| **Skills** | Limited to GHL native tools | 51+ OpenClaw skills: web search, browser, files, code, email |
| **Proactivity** | Only responds when triggered | Can initiate follow-ups, check CRM, run background tasks |
| **Channels** | GHL native (SMS, email, web chat) | All GHL channels + Telegram, WhatsApp, Discord, Slack |
| **Sub-agents** | Not available | Parallel workers for complex multi-step tasks |
| **Pricing** | Per-usage (confusing for agencies) | Predictable per-client fee (agencies can markup) |

### 9.3 vs White-Label AI Platforms (Stammer.ai, Callin.io, etc.)

| | Stammer.ai / Callin.io / AgentiveAIQ | **Kyra** |
|--|--------------------------------------|----------|
| **Engine** | Proprietary chatbot builder | OpenClaw (open-source, community-driven) |
| **Capabilities** | Chat + basic API integrations | Full AI employee: multi-step, tool-using, memory |
| **GHL Integration** | Basic or none | Deep native (OAuth, conversations, pipeline, calendar) |
| **Autonomy** | Responds to messages only | Proactively manages CRM, follows up, books appointments |
| **Open-source** | No (vendor lock-in) | Yes (agencies can self-host if they outgrow Kyra) |
| **Skill ecosystem** | Closed, limited | 51+ skills + clawhub.com marketplace |
| **Memory** | Session-based, resets | Persistent across days/weeks/months |
| **Cost structure** | Often per-message or per-minute | Predictable monthly per-client |

---

## 10. Go-To-Market

### 10.1 Launch Sequence

**Week 1-2:** ✅ DONE — MVP built
- Container pipeline live (Fly.io bridge)
- Agency dashboard functional
- GHL OAuth + SMS AI loop working

**Week 2-3:** ✅ MOSTLY DONE — Billing backend + GTM materials built
- Stripe Connect Express integration complete (backend + dashboard UI)
- Per-client subscription billing with 10% application fee
- Webhook handlers for all billing events
- Marketplace listing copy, demo video script, launch posts, outreach emails — all written
- 5 industry templates seeded (LeadPilot, DentalAssist, PropertyPro, ServicePro, RetailAssist)

**Week 3 (NOW):** Activate Billing + Submit Marketplace
- Create Stripe products/prices + set env vars (~1 hour)
- End-to-end billing test
- Record demo video (script at `marketplace/demo-video-script.md`)
- Take 8 marketplace screenshots
- Submit to GHL Marketplace
- First outreach emails to 10-20 GHL agencies

**Week 4:** White-Label + First Agencies
- Apply white-label settings to chat UI + login
- Custom domain support (CNAME + Vercel Domains API)
- First paying agencies
- Case study from beta users

**Week 5-6:** Marketplace Approval + Scale
- GHL Marketplace review completes → listing goes live
- Content: "Why GHL's Built-in AI Isn't Enough" blog series
- Template marketplace enhancements

**Week 7+:** Scale
- GHL Marketplace inbound begins
- Webinar: "How to Add $5K/mo Revenue Selling AI Employees to Your Clients"
- Partner with GHL agencies for co-marketing

### 10.2 Channels

| Channel | Strategy | Expected Impact |
|---------|----------|----------------|
| **GHL Marketplace** | App listing — agencies find us inside GHL | Primary growth (60%+ of signups) |
| **GHL Communities** | Facebook groups, Slack, forums — demo videos + value posts | Early adopter pipeline |
| **YouTube** | "GHL + AI Employee" tutorials, live demos | SEO + trust building |
| **Direct Outreach** | Email/DM GHL agencies with 10+ sub-accounts | First 20 agencies |
| **Webinars** | "Add $5K/mo selling AI to your clients" | Lead gen + conversion |
| **Template Marketplace** | Agencies share templates → new agencies discover Kyra | Organic flywheel |

---

## 11. Technical Decisions

### Decided ✅

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Frontend** | Vercel (Next.js 15) | Already built, great DX, serverless functions |
| **Database** | Supabase (PostgreSQL) | RLS, real-time, storage, auth — all in one |
| **Billing** | Stripe + Stripe Connect | Already integrated, proven for marketplaces |
| **AI Bridge** | Fly.io (Frankfurt) | Direct Anthropic bridge, auto-stop, 2s wake |
| **AI Model** | Claude Sonnet 4 | Best quality/cost ratio for business conversations |
| **GHL Auth** | OAuth 2.0 (location-level) | Standard, secure, per-sub-account tokens |
| **Message Delivery** | Polling (not webhooks) | GHL marketplace webhooks don't fire for draft apps |
| **Session Management** | Per client+contact keys | `agent:client:{id}:contact:{contactId}` |
| **Cron** | Vercel Cron (1/min) | Simple, integrated, no external dependencies |
| **Message Type Mapping** | normalizeMessageType() | GHL uses `TYPE_SMS` internally but `SMS` in send API |
| **Agency Billing** | Stripe Connect Express | Per-client subscriptions on connected accounts, 10% application fee |
| **Billing Architecture** | Subscriptions on connected accounts | Agency owns the Stripe relationship with their client |
| **Platform Fee** | 10% application_fee_percent | Applied to all client subscriptions automatically |
| **Industry Templates** | DB-seeded, 5 built-in | LeadPilot, DentalAssist, PropertyPro, ServicePro, RetailAssist |

### Open Questions

| Question | Options | Decision Timeline |
|----------|---------|-------------------|
| **Container hosting at scale** | Fly.io (current) vs Cloudflare Containers | By 50+ clients |
| **BYOK implementation** | Env var injection vs API key proxy | Phase 3 |
| **WebSocket vs HTTP** | HTTP SSE (current) vs full WebSocket | Phase 4 |
| **Per-client containers vs shared bridge** | Current: shared bridge. Future: per-client OpenClaw? | Phase 5 |
| **Polling frequency** | 1 min (current) vs 30s vs 15s | After marketplace approval |
| **Multi-model support** | Claude only (current) vs GPT-4 / Gemini options | Phase 3 (BYOK) |

---

## 12. Success Metrics

| Metric | Month 1 | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|---------|----------|
| Agencies signed up | 5 | 15 | 40 | 100 |
| Active client connections | 15 | 90 | 400 | 1,500 |
| MRR | $1,000 | $5,000 | $18,000 | $55,000 |
| GHL connections | 10 | 60 | 300 | 1,200 |
| Avg SMS response time | <60s | <30s | <15s | <10s |
| Agency churn (monthly) | — | <15% | <10% | <5% |
| AI accuracy (no hallucination) | 90% | 95% | 97% | 99% |
| Templates in marketplace | 5 | 10 | 25 | 50+ |
| Messages processed/day | 50 | 500 | 5,000 | 50,000 |

---

## 13. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | **GHL Marketplace approval delayed** | Medium | High | Build direct sales channel; demo video ready; don't depend solely on marketplace |
| 2 | **Polling costs at scale** (API calls every minute per client) | Medium | Medium | Batch polling (one call per client, not per contact); increase interval for inactive clients; move to webhooks after marketplace approval |
| 3 | **AI hallucination damages client's CRM** | Low | High | Read-only by default for Phase 2; write actions require explicit confirmation; audit log everything |
| 4 | **GHL API rate limits or breaking changes** | Low | Medium | Cache frequently-read data; rate-limit polling per client; version-lock API calls |
| 5 | **Competitor copies the model** | Medium | Low | Network effects from templates; agency switching cost (white-label + billing + data + training); speed of execution |
| 6 | **Fly.io costs scale poorly** | Low | Medium | Direct Anthropic bridge is minimal (69MB image); auto-stop saves costs; evaluate Cloudflare at 50+ clients |
| 7 | **GHL OAuth token expiry/revocation** | Low | Medium | Auto-refresh on 401; alert agency dashboard on persistent auth failures; graceful degradation |

---

## Appendix A: Current Deployment Details (Feb 16, 2026)

### Infrastructure
- **Frontend:** Vercel Pro (`kyra.conversionsystem.com`)
- **AI Bridge:** Fly.io (`kyra-gateway.fly.dev`, Frankfurt, 2048MB, auto-stop)
- **Database:** Supabase (`yaijdtsunxicuphrakcc.supabase.co`)
- **Repo:** `github.com/ConversionSystem/kyra` (main branch)

### Key Files
| File | Purpose |
|------|---------|
| **GHL Integration** | |
| `lib/ghl/poller.ts` | Core polling logic — searches conversations, generates AI, sends replies |
| `lib/ghl/api.ts` | GHL API client — token refresh, send message, get conversation |
| `app/api/ghl/poll/route.ts` | Vercel cron endpoint (every minute) |
| `app/api/crm/callback/route.ts` | GHL OAuth callback |
| `lib/ghl/webhook-handler.ts` | Legacy webhook processing (kept for future marketplace webhooks) |
| **Stripe Billing** | |
| `lib/stripe/connect.ts` | Stripe Connect Express — account creation, onboarding, client subscriptions, invoices |
| `lib/stripe/subscriptions.ts` | Agency subscription management — create, upgrade, cancel, status |
| `lib/stripe/webhooks.ts` | Webhook handlers — invoice.paid, sub updates, account.updated |
| `lib/stripe/config.ts` | Stripe client + price IDs config |
| `app/api/stripe/connect/{onboard,status,dashboard}` | Connect API routes |
| `app/api/stripe/webhooks/route.ts` | Stripe webhook endpoint |
| `app/api/agency/billing/settings/route.ts` | Agency default pricing API |
| `app/api/agency/clients/[id]/billing/route.ts` | Per-client billing activation/cancellation |
| **Agency Platform** | |
| `lib/agency/container.ts` | System prompt builder, session key generator |
| `lib/agency/types.ts` | Agency, AgencyClient, AgencySettings, AgencyTemplate types |
| `app/(dashboard)/agency/billing/billing-client.tsx` | Full billing dashboard UI |
| `app/(dashboard)/agency/settings/settings-form.tsx` | Agency settings + white-label inputs |
| **Marketplace Materials** | |
| `marketplace/ghl-app-listing.md` | Complete GHL Marketplace listing copy |
| `marketplace/demo-video-script.md` | 2:30 demo video script + 60s social cut |
| `marketplace/launch-posts.md` | Launch posts for GHL FB, Reddit, LinkedIn, X |
| `marketplace/outreach-email.md` | 3-email cold outreach sequence |
| **Config** | |
| `vercel.json` | Cron config: `* * * * *` → `/api/ghl/poll` |

### Environment Variables (Vercel Production)
| Variable | Purpose | Status |
|----------|---------|--------|
| `KYRA_WORKER_URL` | Fly.io bridge URL (`https://kyra-gateway.fly.dev`) | ✅ Set |
| `KYRA_API_SECRET` | API authentication for manual poll triggers | ✅ Set |
| `CRON_SECRET` | Vercel Cron authentication | ✅ Set |
| `GHL_CLIENT_ID` | GHL OAuth app client ID | ✅ Set |
| `GHL_CLIENT_SECRET` | GHL OAuth app client secret | ✅ Set |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin access for server-side queries | ✅ Set |
| `ANTHROPIC_API_KEY` | Anthropic API key (used by Fly.io bridge) | ✅ Set |
| `STRIPE_SECRET_KEY` | Stripe API secret key | ⬜ **TODO** |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | ⬜ **TODO** |
| `STRIPE_STARTER_PRICE_ID` | Stripe price ID for Starter plan ($99/mo) | ⬜ **TODO** |
| `STRIPE_PRO_PRICE_ID` | Stripe price ID for Pro plan ($249/mo) | ⬜ **TODO** |
| `STRIPE_SCALE_PRICE_ID` | Stripe price ID for Scale plan ($499/mo) | ⬜ **TODO** |
| `STRIPE_PER_CLIENT_PRICE_ID` | Stripe price ID for per-client metered fee | ⬜ **TODO** |

### GHL App Details
- **App Status:** Draft (free pricing for testing)
- **Location ID:** `y1BFVhXMDNUPlbPxEpSA` (Test Sub-Account)
- **Agency Client ID:** `09baa76b-32b7-4c20-b7bb-461b83b14ece`
- **OAuth Redirect:** `https://kyra.conversionsystem.com/api/crm/callback`
- **Scopes:** conversations.readonly, conversations.write, conversations/message.readonly, conversations/message.write, contacts.readonly, contacts.write

---

## Appendix B: Critical Path to First Revenue (Added Feb 16, 2026)

Everything below must happen before Kyra generates its first dollar. Ordered by dependency.

| # | Task | Blocked By | Effort | Owner |
|---|------|-----------|--------|-------|
| 1 | Create Stripe products + prices in Stripe Dashboard | — | 30 min | Angel |
| 2 | Set 6 Stripe env vars on Vercel | #1 | 15 min | Angel |
| 3 | Configure Stripe webhook endpoint → `/api/stripe/webhooks` | #1 | 15 min | Angel |
| 4 | End-to-end billing test (signup → Connect → activate client) | #1, #2, #3 | 2 hours | Steve + Angel |
| 5 | Record demo video (script ready at `marketplace/demo-video-script.md`) | — | 1-2 hours | Angel |
| 6 | Take 8 marketplace screenshots (listed in `marketplace/ghl-app-listing.md`) | — | 30 min | Angel |
| 7 | Submit to GHL Marketplace (listing copy ready to paste) | #5, #6 | 30 min | Angel |
| 8 | First outreach to 10-20 GHL agencies (templates at `marketplace/outreach-email.md`) | #4 | 2 hours | Angel |
| 9 | GHL Marketplace approval | #7 | 1-2 weeks | GHL (external) |

**Tasks 1-4 unlock billing. Tasks 5-8 can run in parallel. Task 9 is external.**

**Estimated time to first revenue: 1-2 days of focused work (tasks 1-4 + 8), then organic pipeline from outreach.**

---

## Phase 6: Growth & Intelligence Features (Video Analysis — Feb 16, 2026)

**Source:** Deep analysis of TWIST (Jason Calacanis) + Alex Finn live streams on OpenAI/OpenClaw acquisition.
**Full analysis:** `projects/kyra/video-analysis-complete.md` + `projects/kyra/video-analysis-2.md`

### Context
OpenAI acqui-hired Peter Steinberger (OpenClaw creator) on Feb 16, 2026. Community is rattled. Jason Calacanis going all-in on OpenClaw startups — funding hosting, skills, security, ease of use. **Kyra is exactly what he described wanting to fund.**

### 6.1 Immediate (This Week)

| # | Feature | Why | Effort | Status |
|---|---------|-----|--------|--------|
| F1 | **Apply to Launch Accelerator** | Jason funding OpenClaw hosting+skills startups. $125K check. Email: openclaw@launch.co | 1 hour | ⬜ TODO |
| F2 | **"Independence" messaging on landing page** | Post-acquisition fear = our opportunity. "Your data stays with YOUR agency." | 2 hours | ⬜ TODO |
| F3 | **Usage dashboard per client** | Token costs = everyone's #1 pain. Show agencies per-client costs. | 4 hours | ⬜ TODO |

### 6.2 Short-Term (Next 2-4 Weeks)

| # | Feature | Why | Effort | Status |
|---|---------|-----|--------|--------|
| F4 | **Smart model routing** | Auto-route simple→cheap models, complex→expensive. Per-client config. | 8 hours | ⬜ TODO |
| F5 | **Read-only deployment mode** | Security concern is universal. Deploy read-only first, unlock write after approval. | 4 hours | ⬜ TODO |
| F6 | **Granular permission controls** | Per-GHL-capability toggles: "AI can read contacts but NOT book appointments" | 6 hours | ⬜ TODO |
| F7 | **Obsidian/markdown export** | Everyone uses Obsidian. Export conversation logs, learnings as .md files. | 3 hours | ⬜ |
| F8 | **Voice note to action** | Jesse codes on phone via voice. Agency owners manage client AIs via voice notes. | 8 hours | ⬜ |

### 6.3 Medium-Term (1-3 Months)

| # | Feature | Why | Effort | Status |
|---|---------|-----|--------|--------|
| F9 | **Multi-agent per client** | Receptionist + sales + support agents per client. Hiten runs 10-15 bots. | 2 weeks | ⬜ |
| F10 | **Skill builder** | Upload client FAQ/docs → auto-generate custom skill. Hiten's recursive builder. | 2 weeks | ⬜ |
| F11 | **Agent-built dashboards** | Client AIs generate their own reporting dashboards. | 1 week | ⬜ |
| F12 | **Shared workspace between agents** | Multi-agent setups share knowledge (Hiten's shared GitHub pattern). | 1 week | ⬜ |
| F13 | **Content curation engine** | AI curates/filters content for specific audiences. Jesse's YouTube app. | 1 week | ⬜ |
| F14 | **Local model support (BYOK+)** | Route to local inference (Ollama, vLLM). Cut API costs to near-zero. | 2 weeks | ⬜ |
| F15 | **"Personal CRM" template** | LinkedIn+Gmail import, AI scoring, outreach. Hiten built in 30 min. | 4 hours | ⬜ |

### 6.4 Strategic (3+ Months)

| # | Feature | Why | Effort | Status |
|---|---------|-----|--------|--------|
| F16 | **Education vertical template** | "Homeschool AI Assistant" — lesson planning, curriculum tracking. Jesse proves demand. | 2 weeks | ⬜ |
| F17 | **AI personality clone platform** | Brand personalities for clients. Restaurant AI = the chef, gym AI = the trainer. | 4 weeks | ⬜ |
| F18 | **Agent marketplace** | Agencies sell agent configs to other agencies. Kyra takes a cut. Network effects. | 4 weeks | ⬜ |
| F19 | **Competitive intelligence template** | Automated competitive research, weekly reports. Hiten is literally building this. | 1 week | ⬜ |
| F20 | **Pair prompting workspace** | Shared space where agency + AI + client collaborate in real-time. | 2 weeks | ⬜ |

### Priority Matrix

| Impact | Quick Win (< 1 day) | Medium (1-2 weeks) | Big Bet (1+ month) |
|--------|---------------------|--------------------|--------------------|
| **Revenue** | F1 Apply to Launch, F2 Independence msg | F4 Model routing, F10 Skill builder | F18 Agent marketplace |
| **Retention** | F3 Usage dashboard, F5 Read-only mode | F6 Permissions, F9 Multi-agent | F14 Local models |
| **Differentiation** | F15 CRM template | F11 Agent dashboards, F20 Pair prompting | F17 AI personalities |

---

## Appendix C: Market Intelligence — OpenAI/OpenClaw Acquisition (Feb 16, 2026)

### The Deal
- OpenAI acqui-hired Peter Steinberger (OpenClaw creator)
- OpenClaw goes to foundation under Dave Morren
- Estimated: $250M-$500M+ (Jason Calacanis)
- OpenClaw remains open-source

### Strategic Implications for Kyra
1. **Community trust vacuum** — agencies want independence assurance
2. **Anthropic backlash** — banning Claude Max/OpenClaw users, "Betamax vs VHS" comparison
3. **GPT-5.3 Codex rising** — community shifting toward OpenAI models
4. **Jason Calacanis funding** — Launch Accelerator ($125K), Founder University ($25K), openclaw@launch.co
5. **"Apps are dead"** — validates our SMS-first, agent-IS-the-product approach
6. **Token costs universal pain** — model routing + usage dashboards = competitive advantage

### Competitor Updates
- **Agent Zero** — competing AI agent platform
- **Manus** — Meta potentially integrating
- **Kimi K2.5** — budget alternative ($39/mo)
- **GPT-5.3 Codex** — strong new competitor to Claude for OpenClaw

---

*This document is the source of truth for Kyra's strategic direction. Update it as decisions are made and phases are completed.*
