# Kyra Development Tasks

## Current Phase: Phase 1 — Foundation (Week 1)

### Status: 🟡 In Progress

---

## Phase 1 Tasks

### Project Setup
- [x] Create project directory
- [x] Copy Kyra codebase as foundation
- [x] Update package.json (name, add Stripe, Slack)
- [x] Create TECHNICAL-SPEC.md
- [x] Update README.md
- [x] Update CLAUDE.md
- [x] Install dependencies (`npm install`)
- [x] Create .env.example with all required vars
- [x] Initialize git repository
- [x] Add .gitignore (fixed: was missing, node_modules got committed)

### Database Schema
- [x] Update supabase/schema.sql with new schema
  - [x] Add plan field to users
  - [x] Add stripe_customer_id, stripe_subscription_id
  - [x] Add usage_this_month tracking
  - [x] Add integrations table
  - [x] Add reminders table
  - [x] Update RLS policies
- [ ] Run schema in Supabase (requires new Supabase project)

### OpenClaw Integration
- [x] Create lib/openclaw/client.ts
- [x] Implement sessions API wrapper
- [x] Create lib/openclaw/prompts.ts
- [ ] Test connection to OpenClaw gateway
- **Note:** MVP uses Claude directly; OpenClaw integration planned for Phase 2

### Auth Updates
- [x] Login page with Google OAuth + email
- [x] Signup page with Google OAuth + email
- [x] Middleware for session handling
- [ ] Create user profile on signup (with plan='free') — API does this on first message
- [x] Add usage tracking to chat API

### Usage & Billing Foundation
- [x] Create lib/billing/plans.ts with tier limits
- [x] Add usage limit checking in chat API
- [x] Return 429 when usage exceeded
- [x] Track usage_this_month in user profile
- [x] Reset usage on new month

### UI Rebranding
- [x] Create landing page with pricing
- [x] Update app name to "Kyra"
- [ ] Update meta tags and favicon
- [ ] Add usage indicator to chat UI

---

## Phase 2 Tasks (Week 2)

### Core Chat
- [x] Chat API with streaming (using Claude directly)
- [x] Save messages to conversations table
- [x] Conversation history loading
- [ ] Memory extraction from responses (in progress)
- [ ] Semantic search for relevant memories

### Memory System
- [x] Memory API routes (basic)
- [ ] Connect Pinecone for vector search
- [ ] Memory injection into prompts
- [ ] Memory save with source tracking

---

## Phase 3 Tasks (Week 3)

### Slack Integration
- [ ] Create Slack OAuth routes
- [ ] Store tokens in integrations table
- [ ] Create Slack webhook handler
- [ ] Message routing (Slack → OpenClaw → Slack)

### Features
- [ ] Memory dashboard enhancements
- [ ] Basic reminders (create, list, deliver)
- [ ] Usage tracking per interaction

---

## Phase 4 Tasks (Week 4)

### Billing
- [ ] Create Stripe products/prices
- [ ] Checkout session creation
- [ ] Webhook handler for subscription events
- [ ] Usage limit enforcement
- [ ] Billing portal integration

### Launch Prep
- [ ] Landing page polish
- [ ] Onboarding flow
- [ ] Error handling improvements
- [ ] Performance optimization
- [ ] Beta user testing

---

## Blockers

### High Priority
1. **Supabase project needed** — Need to create new project and run schema.sql
2. **Domain acquisition** — Need to secure kyra.so or askkyra.ai

### Medium Priority
3. **Stripe account setup** — Need for billing integration
4. **Google OAuth config** — Need to configure in Supabase

---

## Tech Debt

- [ ] Add Suspense boundary around useSearchParams in login page
- [ ] Move to OpenClaw sessions in Phase 2 (currently using Claude directly)
- [ ] Add proper error boundaries
- [ ] Add loading states for all async operations

---

## Environment Setup Needed

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
ANTHROPIC_API_KEY=

# Memory (optional for MVP)
OPENAI_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX=

# Billing (Phase 4)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

*Last Updated: February 6, 2026*
