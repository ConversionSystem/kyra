# Kyra — AI Workforce Platform for Agencies

> Deploy, manage, and monetize autonomous AI workers for your clients — without writing code, without managing infrastructure.

**Live:** [kyra.conversionsystem.com](https://kyra.conversionsystem.com)  
**Repo:** [github.com/ConversionSystem/kyra](https://github.com/ConversionSystem/kyra)

---

## What is Kyra?

Kyra is a **white-label AI workforce platform** built on [OpenClaw](https://github.com/openclaw/openclaw) for agencies. Each client gets an isolated AI worker powered by a dedicated OpenClaw container — with its own personality, memory, tools, and channel integrations.

**For agencies:** One dashboard to manage 20+ client AI workers. Set personalities, connect channels (SMS, Telegram, WhatsApp), monitor conversations, track billing.

**For their clients:** A branded AI employee that handles customer conversations, books appointments, qualifies leads, and integrates with GoHighLevel.

## Architecture

```
┌─────────────────────────────┐
│   Kyra Dashboard (Vercel)   │  Next.js 15 + Supabase + Stripe
│   kyra.conversionsystem.com │
└──────────┬──────────────────┘
           │ manages
           ▼
┌─────────────────────────────┐
│   OVH VPS (Portland, OR)   │  24 vCPU · 92GB RAM · Ubuntu 24.04
│                             │
│  ┌─────────┐  ┌──────────┐ │
│  │ Traefik │→ │CSS Proxy │ │  TLS termination + branding injection
│  └────┬────┘  └────┬─────┘ │
│       │             │       │
│  ┌────▼─────────────▼────┐  │
│  │ kyra-cl-{uuid}:18789  │  │  Per-client OpenClaw containers
│  │ kyra-cl-{uuid}:18789  │  │  1536MB RAM each
│  │ kyra-cl-{uuid}:18789  │  │  GPT-4o-mini primary
│  │        ...             │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────┐ ┌─────────┐ │
│  │ Provisioner│ │ Ollama  │ │  Container lifecycle + local models
│  └───────────┘ └─────────┘ │
└─────────────────────────────┘
```

### Key Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Dashboard | Next.js 15 (App Router) | Agency management, billing, analytics |
| Database | Supabase (PostgreSQL) | Users, agencies, clients, CRM, billing |
| Auth | Supabase Auth | Email/password, Google OAuth |
| Payments | Stripe | Subscriptions, usage-based billing |
| AI Runtime | OpenClaw v2026.4.26 | Per-client isolated AI containers |
| Reverse Proxy | Traefik v3.4 | TLS, routing, Let's Encrypt |
| CSS Proxy | nginx | Kyra branding injection, header stripping |
| Hosting | OVH VPS | 24 vCPU, 92GB RAM, Docker |
| Deployment | Vercel CLI | `npx vercel --prod --yes` (manual only) |

## Features

### Agency Dashboard
- **Multi-client management** — Add/configure/monitor AI workers per client
- **Conversation feed** — Real-time view of all AI conversations (10s auto-refresh)
- **CRM** — Contacts, companies, deals (kanban), AI-powered enrichment
- **AI Sales Pipeline** — Lead discovery, research, outreach, AI closer
- **Follow-up sequences** — Automated multi-touch with AI-generated messages
- **Billing** — Stripe integration, credit system, BYOK API key support
- **White-label** — Custom branding, client portals, invite system
- **Templates** — 21 pre-built AI worker templates (dental, auto, legal, etc.)
- **Analytics** — Conversation stats, credit usage, revenue tracking

### AI Worker Capabilities (per client)
- **OpenClaw Gateway** — Full autonomous AI agent runtime
- **Channel support** — SMS (via GHL), Telegram, web chat, voice (Twilio/Retell)
- **GHL Integration** — Private Integration Token, webhook inbound/outbound
- **Personality system** — SOUL.md-based persona injection
- **Conversation memory** — Persistent across sessions
- **Tool use** — Browse web, search, calendar, email via OpenClaw skills

### Public Pages
- `/pricing` — Lite $99 / Pro $299 / Scale $499
- `/solo` — Solo free tier signup (individual business owners)
- `/blog` — SEO content (auto-generated weekly)
- `/changelog`, `/help`, `/privacy`, `/terms`
- `/for/agencies`, `/ai-for/[industry]` — Landing pages
- Chat widget — Embeddable on client websites

## Tech Stack

```
Frontend:    Next.js 15, React 19, Tailwind CSS, TypeScript
Backend:     Next.js API Routes (Vercel serverless)
Database:    Supabase (PostgreSQL + Auth + Realtime)
AI:          OpenClaw (OpenAI GPT-4o-mini, Claude, OpenRouter)
Search:      Algolia (widget product search for dispensary clients)
Payments:    Stripe (subscriptions + credits)
CRM:         GoHighLevel (GHL) Private Integration
Voice:       Twilio + Retell AI
Infra:       Docker, Traefik, OVH VPS, Vercel
CI:          GitHub Actions (TypeScript check only — NO deploy)
```

## Project Structure

```
app/
├── (auth)/          # Login, signup, solo, forgot-password
├── (dashboard)/     # Agency dashboard (all /agency/* routes)
├── (onboarding)/    # First-time agency setup wizard
├── (portal)/        # Client staff portals
├── (public)/        # Public tools, playground, workers
├── admin/           # Platform admin panel
├── api/             # API routes (~40 route groups)
│   ├── agency/      # Agency CRUD, clients, settings
│   ├── auth/        # Signup, login, OAuth
│   ├── crm/         # CRM contacts, deals, activities
│   ├── cron/        # Scheduled tasks (follow-ups, briefings)
│   ├── ghl/         # GHL webhook handlers
│   ├── portal/      # Client portal chat proxy
│   ├── widget/      # Embeddable chat widget API
│   └── ...
├── blog/            # MDX blog with SEO
└── ...

lib/
├── agency/          # Agency management logic
├── ai-workers/      # AI worker provisioning
├── billing/         # Credits, BYOK, Stripe
├── crm/             # CRM (contacts, deals, activities, AI enrichment)
├── ghl/             # GoHighLevel API integration
├── openclaw/        # OpenClaw container management
├── pipeline/        # AI sales pipeline + follow-up engine
├── sites/           # Client website builder
├── voice/           # Twilio/Retell voice integration
└── ...

components/
├── chat/            # Chat interface components
├── dashboard/       # Dashboard UI (sidebar, nav, cards)
├── crm/             # CRM components (kanban, contacts)
├── pipeline/        # Pipeline UI
└── widget/          # Embeddable chat widget

supabase/
└── migrations/      # SQL migrations (run in Supabase SQL Editor)

infra/
└── nginx/           # CSS proxy config for container branding
```

## Development

### Prerequisites
- Node.js 22+
- npm
- Supabase project (with migrations applied)
- Stripe account (test mode for dev)

### Setup
```bash
git clone https://github.com/ConversionSystem/kyra.git
cd kyra
npm install
cp .env.example .env.local  # Fill in required values
npm run dev                  # Runs on http://localhost:3001
```

### Key Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
GHL_CLIENT_ID=
GHL_CLIENT_SECRET=
OVH_PROVISIONER_URL=
OVH_PROVISIONER_SECRET=
```

### Build & Deploy
```bash
npx tsc --noEmit          # Type check (must pass)
npm run build              # Local build test
npx vercel --prod --yes    # Deploy to production
```

> ⚠️ **Deploy via CLI only.** Never add deploy jobs to GitHub Actions. Max 1-2 deploys per session. See CLAUDE.md for full rules.

## Plans & Pricing

| Plan  | Price   | Clients | Target |
|-------|---------|---------|--------|
| Lite  | $99/mo  | 3       | Small agencies |
| Pro   | $299/mo | 10      | Growing agencies |
| Scale | $499/mo | 20      | Large agencies |

7-day free trial. Solo free tier available for individual business owners.

## Infrastructure (VPS)

- **IP:** 15.204.91.157 (OVH Portland, OR)
- **OS:** Ubuntu 24.04
- **Specs:** 24 vCPU, 92GB RAM, 387GB SSD
- **Stack:** Docker + Traefik v3.4 + OpenClaw containers
- **OpenClaw Version:** v2026.4.26
- **Container RAM:** 1536MB minimum (OOM below 1024MB)
- **Gateway domain:** `{client-id}.gw.kyra.conversionsystem.com`

## Brand Guidelines

- **Category:** AI Workforce Platform (NOT chatbot, NOT hosting)
- **Copy:** Use "AI workers" not "AI employees"
- **Never claim** unverified stats or social proof
- **Logo:** Red gradient claw icon
- **Plans:** Always reference Lite/Pro/Scale with current prices

## License

Proprietary — © Conversion System. All rights reserved.
