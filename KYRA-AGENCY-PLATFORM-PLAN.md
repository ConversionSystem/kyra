# Kyra Agency Platform — Execution Plan

**Date:** February 13, 2026
**Vision:** Kyra is the platform that lets agencies deploy autonomous AI employees for their clients.
**Not:** Another hosted OpenClaw provider competing on price.

---

## Phase 0: Foundation (Week 1) — Wire the Container Pipeline

**Goal:** Get real OpenClaw containers serving chat through Kyra's frontend.

### 0.1 Fix Container Pipeline (Days 1-2)
- [ ] Verify `kyra-worker` is deployed and healthy at `gateway.conversionsystem.com`
- [ ] Set Vercel env vars:
  - `KYRA_USE_WORKER=true`
  - `KYRA_WORKER_URL=https://gateway.conversionsystem.com`
  - `KYRA_API_SECRET=<generate-secret>`
- [ ] Reduce container `max_instances` from 100 to 5 in `wrangler.jsonc` (already done)
- [ ] Set aggressive `sleepAfter` (2 minutes idle → sleep)
- [ ] Deploy and test: message → Vercel → worker → container → response

### 0.2 Verify End-to-End (Days 2-3)
- [ ] Test cold start time (target: <15s, add "waking up" UI if needed)
- [ ] Test SSE streaming through the proxy chain
- [ ] Test workspace bootstrap (SOUL.md, USER.md created on first message)
- [ ] Test container sleep/wake cycle
- [ ] Verify credit deduction still works

### 0.3 Per-User Config (Days 3-5)
- [ ] After gateway boots, apply user-specific model preference via container
- [ ] Pass user's SOUL.md/USER.md content from onboarding to R2
- [ ] Verify memory persistence across container sleep/wake

**Deliverable:** Any Kyra user's message goes through a real OpenClaw container with all 51 skills + 35 extensions available. The foundation every other phase builds on.

---

## Phase 1: Agency Data Model (Week 2) — Multi-Tenancy

**Goal:** Agencies can sign up and create client sub-accounts.

### 1.1 Database Schema Changes
```sql
-- Agencies table
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,          -- for white-label subdomain
  logo_url TEXT,
  brand_color TEXT DEFAULT '#000000',
  plan TEXT DEFAULT 'agency_starter',  -- agency_starter, agency_pro, agency_scale
  stripe_account_id TEXT,              -- Stripe Connect account
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agency clients (sub-accounts)
CREATE TABLE agency_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  ghl_location_id TEXT,               -- GHL sub-account ID
  ghl_access_token TEXT,              -- encrypted
  container_status TEXT DEFAULT 'inactive', -- inactive, starting, running, sleeping
  settings JSONB DEFAULT '{}',         -- model prefs, skills, personality
  soul_md TEXT,                        -- client-specific SOUL.md
  user_md TEXT,                        -- client-specific USER.md
  monthly_budget_credits INT,          -- agency sets per-client limits
  usage_this_month INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agency billing (what agency charges their clients)
CREATE TABLE agency_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id),
  client_id UUID REFERENCES agency_clients(id),
  amount_cents INT NOT NULL,
  currency TEXT DEFAULT 'usd',
  stripe_invoice_id TEXT,
  status TEXT DEFAULT 'pending',
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agency templates (reusable AI configurations)
CREATE TABLE agency_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id),
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,                       -- real_estate, dental, cannabis, hvac, etc.
  soul_md TEXT,
  user_md TEXT,
  skills JSONB DEFAULT '[]',           -- which skills to enable
  ghl_workflows JSONB DEFAULT '[]',    -- GHL workflow templates
  is_public BOOLEAN DEFAULT false,     -- visible in marketplace
  price_cents INT DEFAULT 0,           -- 0 = free
  installs INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 Agency Signup Flow
- [ ] New route: `/agency/signup` — separate from individual signup
- [ ] Agency onboarding wizard:
  1. Business name + logo upload
  2. Choose agency plan
  3. Connect Stripe (Stripe Connect Express onboarding)
  4. Invite first team member (optional)
  5. Create first client

### 1.3 Agency Dashboard
- [ ] `/agency` — Overview: total clients, total usage, revenue, alerts
- [ ] `/agency/clients` — List all client AIs with status (running/sleeping/inactive)
- [ ] `/agency/clients/new` — Create new client AI (name, industry, personality)
- [ ] `/agency/clients/[id]` — Manage specific client: chat test, settings, usage, logs
- [ ] `/agency/billing` — Revenue dashboard, invoice history
- [ ] `/agency/settings` — Branding, team members, API keys

**Deliverable:** An agency can sign up, create 3 client AIs, and see them in a dashboard.

---

## Phase 2: GHL Integration (Week 3) — The Killer Feature

**Goal:** Connect GHL sub-account → AI automatically knows the CRM.

### 2.1 GHL Marketplace App
- [ ] Register app at `marketplace.gohighlevel.com`
- [ ] Configure OAuth flow (redirect URI, scopes)
- [ ] Required scopes: contacts, conversations, calendars, opportunities, custom fields
- [ ] Build OAuth callback handler: `/api/integrations/ghl/callback`
- [ ] Store encrypted tokens per agency_client

### 2.2 GHL OpenClaw Skill
- [ ] Build custom OpenClaw skill: `kyra-ghl`
- [ ] Skill capabilities:
  - Read contacts, search by name/email/phone
  - Read/write conversations (SMS, email, WhatsApp)
  - Read/update opportunities (pipeline stages)
  - Read calendar, book appointments
  - Read/write custom fields
  - Trigger GHL workflows
- [ ] Skill auto-installed in every agency client's container
- [ ] Token refresh handling (GHL tokens expire)

### 2.3 Auto-Configure on Connect
- [ ] Agency connects GHL sub-account for a client
- [ ] Kyra reads: business name, contacts count, pipeline stages, active conversations
- [ ] Auto-generates SOUL.md:
  ```
  You are [Business Name]'s AI assistant. You manage their GHL CRM.
  You can see their contacts, conversations, and pipeline.
  Current pipeline stages: [Lead, Qualified, Proposal, Won, Lost]
  Current contact count: [1,247 contacts]
  Your job: Follow up with leads, book appointments, manage conversations.
  ```
- [ ] Container boots with GHL skill + business context pre-loaded

**Deliverable:** Agency connects GHL sub-account → client's AI can read contacts, send SMS, manage pipeline within 60 seconds.

---

## Phase 3: Billing & White-Label (Week 4) — Revenue Engine

### 3.1 Agency Pricing
| Plan | Monthly | Included Clients | Per Extra Client | Features |
|------|---------|-----------------|-----------------|----------|
| Agency Starter | $99 | 5 | $29/each | Dashboard, GHL integration, templates |
| Agency Pro | $249 | 15 | $25/each | + White-label, custom domain, priority support |
| Agency Scale | $499 | 50 | $19/each | + API access, custom skills, dedicated support |

### 3.2 Stripe Connect
- [ ] Agency onboards to Stripe Connect (Express)
- [ ] Agency sets pricing per client (e.g., $297/mo for "AI Employee")
- [ ] Kyra creates Stripe subscription on agency's connected account
- [ ] Application fee: Kyra takes % on each payment (e.g., 10%)
- [ ] Agency sees revenue dashboard in Kyra

### 3.3 White-Label (Agency Pro+)
- [ ] Custom subdomain: `ai.agencyname.com` → Kyra with agency branding
- [ ] Agency logo + colors applied to:
  - Login page
  - Chat interface
  - Client dashboard
- [ ] Remove all "Kyra" / "Conversion System" branding
- [ ] Client sees agency's brand, not ours

**Deliverable:** Agency charges their clients through Kyra, sees revenue dashboard. Pro agencies get branded experience.

---

## Phase 4: Templates & Marketplace (Week 5-6) — Flywheel

### 4.1 Industry Templates
- [ ] Build 5 starter templates:
  1. **Real Estate** — Lead follow-up, showing scheduler, market updates
  2. **Dental/Medical** — Appointment booking, reminders, review requests
  3. **Cannabis** — Compliance-aware, menu updates, loyalty (OUR expertise)
  4. **Home Services (HVAC/Plumbing)** — Estimate requests, scheduling, follow-ups
  5. **General Agency** — Lead qualification, appointment setting, FAQ responses

### 4.2 Template Marketplace
- [ ] Agency creates template from working client config
- [ ] Publishes to marketplace (free or paid)
- [ ] Other agencies browse by industry, install in one click
- [ ] Revenue split: 70% creator / 30% Kyra
- [ ] Rating/review system

**Deliverable:** Agencies can start with proven templates instead of configuring from scratch.

---

## Phase 5: Scale & Optimize (Week 7+) — Growth

### 5.1 GHL Marketplace Listing
- [ ] Submit Kyra to GHL Marketplace for approval
- [ ] Agencies discover Kyra inside GHL → install → onboard
- [ ] This is the primary growth channel (600K+ GHL users see it)

### 5.2 Container Economics
- [ ] Evaluate CF Containers vs Fly.io at scale
- [ ] Implement usage-based metering (tokens consumed → credits)
- [ ] BYOK support (agencies bring their own API keys for lower costs)
- [ ] Container auto-scaling based on agency plan

### 5.3 Advanced Features
- [ ] Voice AI (OpenClaw + Twilio/Telnyx voice plugin)
- [ ] Multi-agent per client (receptionist + sales + support)
- [ ] Webhook triggers (GHL workflow fires → OpenClaw acts)
- [ ] Analytics dashboard (conversations, resolutions, leads converted)

---

## Revenue Projections

### Conservative (90 days)
| Metric | Month 1 | Month 2 | Month 3 |
|--------|---------|---------|---------|
| Agencies | 3 | 8 | 15 |
| Avg clients/agency | 3 | 5 | 8 |
| Total client containers | 9 | 40 | 120 |
| Agency MRR | $297 | $792 | $1,485 |
| Per-client MRR | $261 | $1,000 | $3,000 |
| Stripe Connect rev share | $0 | $200 | $600 |
| **Total MRR** | **$558** | **$1,992** | **$5,085** |

### Aggressive (90 days, with GHL marketplace listing)
| Metric | Month 1 | Month 2 | Month 3 |
|--------|---------|---------|---------|
| Agencies | 5 | 20 | 50 |
| Avg clients/agency | 3 | 7 | 10 |
| Total client containers | 15 | 140 | 500 |
| **Total MRR** | **$930** | **$5,740** | **$16,900** |

---

## What to Build First (This Weekend)

1. **Phase 0.1** — Wire the container pipeline (flip env vars, test)
2. **Phase 1.1** — Create agency tables in Supabase
3. **Phase 1.3** — Minimal agency dashboard (list clients, create client)

Get a working demo where: Agency signs up → creates "Dental Office AI" → client gets working AI assistant that chats on Telegram → agency sees it in their dashboard.

That demo closes deals.
