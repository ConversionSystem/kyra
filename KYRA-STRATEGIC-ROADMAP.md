# Kyra — Strategic Roadmap & Architecture

**Date:** February 13, 2026  
**Version:** 1.0  
**Status:** Active

---

## 1. Vision

**Kyra is the platform that turns OpenClaw into a deployable, managed AI workforce for agencies and their clients.**

We don't host OpenClaw. We transform it into something agencies can sell.

Every competitor in the OpenClaw hosting space gives users a container and says "good luck." Kyra gives agencies a business — pre-integrated with the tools their clients already use, branded as their own, billable to their clients, managed from a single dashboard.

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

## 3. Kyra's Moat

### What makes Kyra defensible — things competitors cannot easily replicate:

**1. Intelligence Layer, Not Hosting**  
OpenClaw hosting competitors (Agent37, SpinUpClaw, InstantClaw, etc.) give you a raw container. Kyra gives you a **pre-configured, industry-aware, CRM-connected AI employee.** The difference between handing someone Linux and handing them a MacBook.

**2. Multi-Tenant Agency Architecture**  
Every competitor is single-user. One account = one OpenClaw instance. Kyra is built from the ground up for agencies managing dozens or hundreds of client AIs from one dashboard. Adding multi-tenancy to a single-user hosting product is a full rebuild — we start with it.

**3. Deep GHL Integration**  
600,000+ GHL users. $497/mo agency plans with unlimited sub-accounts. Agencies live inside GHL. Kyra's AI doesn't just chat — it **reads contacts, sends SMS, moves pipeline stages, books appointments, triggers workflows, manages conversations** through GHL's API. A purpose-built OpenClaw skill that makes the AI a real employee inside the client's CRM. No other OpenClaw host has this.

**4. White-Label Ownership**  
Agency brands Kyra as their own platform. Their clients see the agency's logo, domain, colors. The agency IS the AI provider in their client's eyes. This creates lock-in for the agency (they can't easily move their branded platform) and trust for their clients (they're dealing with their agency, not some unknown SaaS).

**5. Revenue Engine for Agencies**  
Agencies don't just use Kyra — they **profit from it.** Stripe Connect lets agencies set their own pricing, bill their clients directly, and keep the margin. Kyra isn't a cost center. It's a new revenue line.

**6. Template Marketplace (Network Effect)**  
Agencies build and share industry-specific AI configurations. More agencies → more templates → faster deployment → more agencies. This compounds. A new agency signs up, picks the "Dental Practice" template, connects GHL, and has a working AI employee for their client in minutes. No competitor has this flywheel.

**7. OpenClaw Ecosystem Leverage**  
Every OpenClaw update — new skills, new channels, new tools, security patches — automatically benefits every Kyra agency and every one of their clients. We ride the open-source ecosystem instead of maintaining a fork. 51 skills, 35 extensions, weekly releases, growing community. Our competitors who build custom tooling have to maintain it all themselves.

---

## 4. Architecture

### 4.1 System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    KYRA PLATFORM                         │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              VERCEL (Frontend)                      │  │
│  │                                                     │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │  │
│  │  │ Auth     │  │ Billing  │  │ Agency Dashboard  │ │  │
│  │  │(Supabase)│  │(Stripe + │  │ Client Mgmt      │ │  │
│  │  │          │  │ Connect) │  │ Templates         │ │  │
│  │  └──────────┘  └──────────┘  │ White-Label       │ │  │
│  │                               │ Analytics         │ │  │
│  │  ┌──────────┐  ┌──────────┐  └──────────────────┘ │  │
│  │  │ Chat UI  │  │ Webhook  │                        │  │
│  │  │ (Web)    │  │ Router   │                        │  │
│  │  └────┬─────┘  └────┬─────┘                        │  │
│  │       │              │                              │  │
│  └───────┼──────────────┼──────────────────────────────┘  │
│          │              │                                  │
│          ▼              ▼                                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │         CONTAINER LAYER (Cloudflare / Fly.io)      │  │
│  │                                                     │  │
│  │  ┌─────────────────────────────────────────────┐   │  │
│  │  │    Per-Client OpenClaw Container             │   │  │
│  │  │                                              │   │  │
│  │  │  ┌────────────┐  ┌────────────────────────┐ │   │  │
│  │  │  │ AI Engine  │  │ Skills                  │ │   │  │
│  │  │  │ Claude     │  │ ├─ kyra-ghl (CRM)      │ │   │  │
│  │  │  │ GPT        │  │ ├─ web-search           │ │   │  │
│  │  │  │ Gemini     │  │ ├─ browser              │ │   │  │
│  │  │  │ Ollama     │  │ ├─ email (himalaya)     │ │   │  │
│  │  │  └────────────┘  │ ├─ calendar (gog)       │ │   │  │
│  │  │                   │ ├─ coding-agent         │ │   │  │
│  │  │  ┌────────────┐  │ └─ 45+ more from clawhub│ │   │  │
│  │  │  │ Memory     │  └────────────────────────┘ │   │  │
│  │  │  │ SOUL.md    │                              │   │  │
│  │  │  │ MEMORY.md  │  ┌────────────────────────┐ │   │  │
│  │  │  │ memory/    │  │ Channels                │ │   │  │
│  │  │  └────────────┘  │ ├─ Telegram             │ │   │  │
│  │  │                   │ ├─ WhatsApp             │ │   │  │
│  │  │  ┌────────────┐  │ ├─ Discord              │ │   │  │
│  │  │  │ Automation │  │ ├─ Slack                 │ │   │  │
│  │  │  │ Cron       │  │ ├─ SMS (via GHL)        │ │   │  │
│  │  │  │ Heartbeats │  │ └─ Web Chat             │ │   │  │
│  │  │  │ Sub-agents │  └────────────────────────┘ │   │  │
│  │  │  └────────────┘                              │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                                                     │  │
│  │  Container A ─── Agency 1, Client: "Smile Dental"  │  │
│  │  Container B ─── Agency 1, Client: "HVAC Pro"      │  │
│  │  Container C ─── Agency 2, Client: "Luxe Realty"   │  │
│  │  Container D ─── Agency 2, Client: "FitZone Gym"   │  │
│  │  Container E ─── Individual User (Kyra Free)       │  │
│  │                                                     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              EXTERNAL INTEGRATIONS                  │  │
│  │                                                     │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │  │
│  │  │ GHL API  │  │ Stripe   │  │ AI Providers      │ │  │
│  │  │ CRM      │  │ Connect  │  │ Anthropic         │ │  │
│  │  │ SMS      │  │ Billing  │  │ OpenAI            │ │  │
│  │  │ Pipeline │  │ Invoices │  │ Google            │ │  │
│  │  │ Calendar │  │ Payouts  │  │ OpenRouter        │ │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘ │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Ownership Boundaries

| Layer | Owner | Responsibility |
|-------|-------|---------------|
| **Auth & Identity** | Kyra (Supabase) | User signup, agency accounts, client sub-accounts, OAuth, SSO |
| **Billing & Revenue** | Kyra (Stripe + Connect) | Agency subscriptions, client billing passthrough, usage metering, payouts |
| **Agency Management** | Kyra (Vercel + Supabase) | Dashboard, client CRUD, templates, white-label, analytics |
| **Webhook Routing** | Kyra (Vercel) | Inbound Telegram/WhatsApp/GHL webhooks → correct client container |
| **Chat Proxy** | Kyra Worker (CF/Fly) | Message relay, SSE streaming, WebSocket proxy |
| **Container Lifecycle** | Kyra Worker (CF/Fly) | Spin up, sleep, wake, R2 sync, config patching |
| **ALL Intelligence** | OpenClaw (inside container) | AI responses, tool execution, memory, skills, cron, sub-agents, channels |
| **CRM Integration** | OpenClaw + kyra-ghl skill | GHL API calls: contacts, conversations, pipeline, appointments |

### 4.3 Data Flow: Agency Client Chat

```
1. Client's customer sends SMS "I need an appointment"
          │
          ▼
2. GHL receives SMS → triggers webhook
          │
          ▼
3. Kyra webhook router (Vercel)
   ├── Identifies: GHL location_id → agency_client_id → container
   ├── Checks: agency billing status (active?)
   ├── Checks: client usage within budget
          │
          ▼
4. Kyra Worker (CF/Fly)
   ├── Wakes container if sleeping
   ├── Ensures OpenClaw gateway running
   ├── Forwards message to container
          │
          ▼
5. OpenClaw Container (per-client)
   ├── Receives message with GHL context
   ├── memory_search: checks for past interactions with this customer
   ├── kyra-ghl skill: reads contact record, pipeline stage, calendar
   ├── AI generates response: "Hi! I can help with that. Dr. Smith has
   │   openings Thursday at 2pm or Friday at 10am. Which works?"
   ├── kyra-ghl skill: books appointment in GHL calendar
   ├── Sends response back through GHL conversation API
          │
          ▼
6. Customer receives SMS reply
   (Total time: 3-8 seconds)
```

### 4.4 Data Flow: Agency Creates New Client

```
1. Agency logs into Kyra dashboard
          │
          ▼
2. Clicks "Add Client" → enters business name, industry
          │
          ▼
3. Connects GHL sub-account (OAuth flow)
   ├── Agency authorizes Kyra to access sub-account
   ├── Kyra stores encrypted access + refresh tokens
   ├── Kyra reads: business info, contacts, pipelines, calendars
          │
          ▼
4. Kyra auto-generates configuration
   ├── SOUL.md: personality, business context, capabilities
   ├── USER.md: business details pulled from GHL
   ├── Skills: kyra-ghl pre-installed + agency's template skills
   ├── Channels: GHL conversations (SMS/email) + optional Telegram/WhatsApp
   ├── Cron: morning brief, end-of-day summary (from template)
          │
          ▼
5. Writes config to R2 storage under client's namespace
          │
          ▼
6. First message to client's container triggers:
   ├── Container boots (~10-15s cold start)
   ├── OpenClaw reads workspace files from R2
   ├── Gateway starts with client-specific config
   ├── kyra-ghl skill authenticates to client's GHL
   ├── AI is live and ready
          │
          ▼
7. Agency tests chat in dashboard → confirms AI is working
          │
          ▼
8. Agency activates client → billing starts
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

### 5.1 Capabilities

| Action | GHL API Endpoint | What the AI Can Do |
|--------|-----------------|-------------------|
| **Read Contacts** | GET /contacts | Search by name, email, phone; see tags, custom fields, notes |
| **Update Contacts** | PUT /contacts/{id} | Add tags, update fields, add notes after conversations |
| **Read Conversations** | GET /conversations | See full message history with a customer |
| **Send Messages** | POST /conversations/messages | Send SMS, email, WhatsApp through GHL |
| **Read Pipeline** | GET /opportunities | See deal stages, values, assigned users |
| **Move Pipeline** | PUT /opportunities/{id} | Move deals between stages based on conversation outcome |
| **Read Calendar** | GET /calendars/events | Check availability, see upcoming appointments |
| **Book Appointments** | POST /calendars/events | Schedule appointments directly |
| **Read Custom Fields** | GET /custom-fields | Understand business-specific data |
| **Trigger Workflows** | POST /contacts/{id}/workflow | Kick off GHL automation sequences |

### 5.2 How It Works Inside OpenClaw

The skill is a standard OpenClaw skill with a `SKILL.md` that tells the AI:

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

## 7. Execution Phases

### Phase 0: Foundation (Week 1)
**Goal:** Real OpenClaw containers serving real responses.

| Task | Priority | Effort |
|------|----------|--------|
| Wire container pipeline (Vercel env vars → worker → container) | P0 | 4-6h |
| Verify SSE streaming end-to-end | P0 | 2h |
| Test container cold start, sleep/wake cycle | P0 | 2h |
| Per-user config: model preference + SOUL.md from onboarding | P1 | 4h |
| "Waking up your AI" loading state for cold starts | P1 | 2h |

**Exit criteria:** A message sent in Kyra's web chat is processed by a real OpenClaw container with full tool access.

---

### Phase 1: Agency Core (Week 2)
**Goal:** Agencies can sign up and manage client AIs.

| Task | Priority | Effort |
|------|----------|--------|
| Supabase schema: `agencies`, `agency_clients`, `agency_templates`, `agency_billing` | P0 | 3h |
| Agency signup flow (separate from individual) | P0 | 4h |
| Agency dashboard: overview, client list, create client | P0 | 8h |
| Client detail page: test chat, settings, usage stats | P0 | 6h |
| Per-client container routing (agency_client_id → container namespace) | P0 | 4h |
| Client SOUL.md / USER.md editor in dashboard | P1 | 3h |
| Client status monitoring (running/sleeping/error) | P1 | 3h |

**Exit criteria:** Agency creates account → adds 3 clients → each client has an isolated OpenClaw AI → agency monitors all three from one dashboard.

---

### Phase 2: GHL Integration (Week 3)
**Goal:** AI reads and writes the client's GHL CRM.

| Task | Priority | Effort |
|------|----------|--------|
| Register Kyra on GHL developer marketplace | P0 | 2h |
| Build GHL OAuth flow: connect sub-account → store tokens | P0 | 6h |
| Build `kyra-ghl` OpenClaw skill (CLI wrapper for GHL API) | P0 | 12h |
| Auto-generate SOUL.md from GHL business data | P1 | 4h |
| GHL webhook receiver: inbound conversations → route to container | P0 | 6h |
| Test full loop: customer SMS → AI reads CRM → AI responds via GHL | P0 | 4h |
| Token refresh handling (GHL tokens expire) | P1 | 2h |

**Exit criteria:** Customer sends SMS to a GHL number → Kyra's AI reads their contact record, checks calendar, and replies with appointment options — all through GHL.

---

### Phase 3: Billing & White-Label (Week 4)
**Goal:** Agencies can charge their clients and brand the platform.

| Task | Priority | Effort |
|------|----------|--------|
| Stripe Connect Express onboarding for agencies | P0 | 6h |
| Agency sets per-client pricing in dashboard | P0 | 4h |
| Automated client invoicing via Stripe Connect | P0 | 6h |
| Application fee (Kyra's cut per transaction) | P0 | 2h |
| Revenue dashboard: MRR, client payments, payout schedule | P1 | 6h |
| White-label: custom subdomain (CNAME + Vercel domains API) | P1 | 4h |
| White-label: logo, colors, name applied to chat UI + login | P1 | 6h |
| White-label: email templates with agency branding | P2 | 3h |

**Exit criteria:** Agency charges client $297/mo through Kyra → Kyra takes 10% → agency receives payout. Agency Pro users have branded domain + chat UI.

---

### Phase 4: Templates & Marketplace (Week 5-6)
**Goal:** One-click industry deployments + network effects.

| Task | Priority | Effort |
|------|----------|--------|
| Template data model: SOUL.md + skills + cron + GHL workflows | P0 | 4h |
| 5 built-in industry templates (see below) | P0 | 10h |
| Template picker in "Add Client" flow | P0 | 4h |
| Agency creates template from working client config | P1 | 6h |
| Template marketplace: browse, preview, install | P1 | 8h |
| Paid templates: pricing, revenue split (70/30) | P2 | 6h |

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

### Phase 5: Distribution & Scale (Week 7+)
**Goal:** Growth engine + platform maturity.

| Task | Priority | Effort |
|------|----------|--------|
| Submit Kyra to GHL Marketplace for listing approval | P0 | 1 week |
| GHL Marketplace landing page + onboarding flow | P0 | 4h |
| Container economics: evaluate CF Containers vs Fly.io at scale | P1 | 1 week |
| BYOK: agencies provide their own AI API keys | P1 | 6h |
| Usage metering: actual token consumption → credits | P1 | 8h |
| Voice AI: OpenClaw + Twilio/Telnyx plugin for phone calls | P2 | 2 weeks |
| Multi-agent per client (receptionist + sales + support roles) | P2 | 1 week |
| Analytics dashboard: conversations, resolutions, appointments booked | P2 | 1 week |
| API for agencies to programmatically manage clients | P2 | 1 week |

**Exit criteria:** Kyra is discoverable inside GHL Marketplace. Agencies find it → install → deploy AI for clients.

---

## 8. Revenue Model

### 8.1 Revenue Streams

| Stream | Source | Margin |
|--------|--------|--------|
| **Agency Subscriptions** | $99-499/mo base plans | High (covers platform costs) |
| **Per-Client Fees** | $19-29/mo per client above included | High (container costs ~$2-5/client) |
| **Stripe Connect Application Fees** | 10% of agency→client billing | Pure margin |
| **AI Credit Top-Ups** | Agencies buy additional credits | ~40% margin (after AI API costs) |
| **Template Marketplace** | 30% cut of paid template sales | Pure margin |
| **BYOK Markup** | Agencies on BYOK still pay platform fee | High (no AI costs for us) |

### 8.2 Unit Economics Per Agency

| Component | Cost | Revenue |
|-----------|------|---------|
| Agency Starter (5 clients) | | $99/mo |
| 5 containers (sleeping most of time) | ~$10-25/mo | |
| AI API usage (shared pool) | ~$20-40/mo | |
| **Net per Starter agency** | **~$35-65/mo** | **$99/mo → $34-64 margin** |
| | | |
| Agency Pro (15 clients + 10 extra) | | $249 + (10 × $25) = $499/mo |
| 25 containers | ~$50-125/mo | |
| AI API usage | ~$60-120/mo | |
| Stripe Connect 10% on $7,500 client billing | | ~$750/mo |
| **Net per Pro agency** | **~$110-245/mo** | **$1,249/mo → $1,000+ margin** |

### 8.3 Path to $50K MRR

| Milestone | Agencies | Avg Clients | Container Count | MRR |
|-----------|----------|-------------|-----------------|-----|
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
| **GHL Integration** | None | Deep (read/write CRM, pipeline, conversations) |
| **Multi-tenancy** | Single user | Agency → clients hierarchy |
| **White-label** | No (their branding) | Agency's brand, domain, colors |
| **Billing** | User pays host | Agency bills clients, keeps margin |
| **Templates** | None | Industry-specific, marketplace |
| **Price per user** | $3.99-49/mo | $19-29/client (but agency pays, not end user) |
| **Revenue per customer** | $3.99-49/mo | $99-499/mo + per-client fees |

### 9.2 vs GHL Built-in AI

| | GHL AI Employee | **Kyra** |
|--|----------------|----------|
| **Intelligence** | Rule-based workflows, limited autonomy | Full OpenClaw: autonomous, multi-step, tool-using |
| **Customization** | Prompt engineering in GHL UI | Full workspace: SOUL.md, MEMORY.md, custom skills |
| **Memory** | None (stateless per conversation) | Persistent: remembers across all interactions |
| **Skills** | Ask AI + Agent Studio (limited) | 51+ skills: web search, browser, files, code, email... |
| **Proactivity** | Manual workflow triggers | Heartbeats, cron, sub-agents — AI initiates actions |
| **Channels** | GHL native (SMS, email, web chat) | All of the above + Telegram, WhatsApp, Discord, Slack, Signal |
| **Sub-agents** | Not available | sessions_spawn — parallel workers for complex tasks |
| **Pricing** | Per-usage (confusing) | Predictable per-client fee |

### 9.3 vs White-Label AI Platforms (Stammer.ai, Callin.io, etc.)

| | Stammer.ai / Callin.io / AgentiveAIQ | **Kyra** |
|--|--------------------------------------|----------|
| **Engine** | Proprietary chatbot builder | OpenClaw (open-source, 51+ skills, community-driven) |
| **Capabilities** | Chat + basic API integrations | Full AI employee: files, browser, code, memory, cron, sub-agents |
| **GHL Integration** | Basic or none | Deep native integration (custom skill) |
| **Autonomy** | Responds to messages | Proactively checks CRM, follows up, manages pipeline |
| **Open-source** | No (vendor lock-in) | Yes (agencies can self-host if they outgrow Kyra) |
| **Skill ecosystem** | Closed | 51+ skills + clawhub.com marketplace |
| **Memory** | Session-based | Persistent across days/weeks/months |

---

## 10. Go-To-Market

### 10.1 Launch Sequence

**Week 1-2:** Build MVP (Phase 0 + 1)
- Container pipeline live
- Agency dashboard functional
- 3 test agencies (find in GHL communities)

**Week 3:** GHL integration live (Phase 2)
- Demo video: "Deploy an AI employee for your GHL client in 60 seconds"
- Post in GHL Facebook groups, Reddit r/gohighlevel, GHL community
- Direct outreach to 20 GHL agencies

**Week 4:** Billing + white-label (Phase 3)
- First paying agencies
- Case study from beta users

**Week 5-6:** Templates + marketplace submission (Phase 4 + 5)
- Submit to GHL Marketplace
- Launch 5 industry templates
- Content: "Why GHL's Built-in AI Isn't Enough" blog series

**Week 7+:** Scale
- GHL Marketplace goes live → inbound begins
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

## 11. Technical Decisions & Open Questions

### Decided
- **Frontend:** Vercel (Next.js) — keeps working
- **Database:** Supabase (PostgreSQL) — extends with agency tables
- **Billing:** Stripe + Stripe Connect — already integrated
- **AI Engine:** OpenClaw inside containers — full capability set
- **GHL Integration:** Custom OpenClaw skill (`kyra-ghl`)

### To Evaluate
- **Container hosting:** Cloudflare Containers vs Fly.io
  - CF: Already built, Durable Objects for state, but per-10ms billing + 5 instance limit
  - Fly: Official OpenClaw support, persistent volumes, auto-stop machines, potentially cheaper at scale
  - **Decision needed by end of Phase 0 after real cost data**

- **AI API keys:** Shared pool vs BYOK
  - Phase 0-2: Shared (Kyra's keys, simpler)
  - Phase 3+: Add BYOK option for Pro/Scale agencies
  
- **WebSocket vs HTTP proxy**
  - HTTP SSE works for basic chat
  - WebSocket needed for full OpenClaw experience (heartbeats, real-time events)
  - **Phase 0: HTTP. Phase 2+: WebSocket upgrade**

---

## 12. Success Metrics

| Metric | Month 1 | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|---------|----------|
| Agencies signed up | 5 | 15 | 40 | 100 |
| Active client containers | 15 | 90 | 400 | 1,500 |
| MRR | $1,000 | $5,000 | $18,000 | $55,000 |
| GHL connections | 10 | 60 | 300 | 1,200 |
| Container uptime | 95% | 99% | 99.5% | 99.9% |
| Avg response time | <10s | <5s | <3s | <3s |
| Agency churn (monthly) | — | <15% | <10% | <5% |
| Templates in marketplace | 5 | 10 | 25 | 50+ |

---

## 13. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CF Container costs higher than projected | Medium | High | Evaluate Fly.io early; implement aggressive sleep timers |
| GHL Marketplace approval delayed | Medium | High | Build direct sales channel simultaneously; don't depend solely on marketplace |
| Cold start time too slow (>20s) | Medium | Medium | Container warm pools; "waking up" UX; pre-warm on dashboard visit |
| AI hallucination damages client's CRM | Low | High | Read-only mode by default; write actions require confirmation; audit log |
| GHL API rate limits or changes | Low | Medium | Caching layer; webhook-driven instead of polling; version-lock API calls |
| Competitor copies the model | Medium | Low | Network effects from templates; agency switching cost (white-label + billing + data); speed of execution |
| OpenClaw breaking changes | Low | Medium | Pin container to specific version; test updates before rollout |

---

*This document is the source of truth for Kyra's strategic direction. Update it as decisions are made and phases are completed.*
