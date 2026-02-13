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

---

## Onboarding Upgrade (February 12, 2026)

### Plan
Redesign onboarding wizard from 4 steps to 5 meaningful steps that collect user info and write it to workspace files.

### Tasks
- [ ] Redesign `app/(dashboard)/onboarding/page.tsx` — 5-step wizard:
  - Step 1: Welcome + "What should I call you?" (name input)
  - Step 2: "What do you do?" (role/occupation free text)
  - Step 3: Timezone (auto-detect + manual override)
  - Step 4: Tone selection (casual/professional/balanced visual cards)
  - Step 5: "Try it!" — sample prompts that start first message
- [ ] Update `app/api/onboarding/route.ts` — save name, role, timezone, tone to user profile
- [ ] Create `app/api/kyra/init/route.ts` — write personalized SOUL.md and USER.md to R2 workspace
- [ ] Update `types/index.ts` — add role and tone to UserSettings
- [ ] Enable R2 user-data bucket in `wrangler.toml`
- [ ] Commit and push

### Files to modify
1. `app/(dashboard)/onboarding/page.tsx` — full rewrite
2. `app/api/onboarding/route.ts` — save all fields
3. `app/api/kyra/init/route.ts` — new file, writes workspace files
4. `types/index.ts` — extend UserSettings
5. `wrangler.toml` — uncomment R2 bucket

*Last Updated: February 12, 2026*

---

## Feature 6.4: Image Understanding (February 13, 2026)

### Plan
Add image understanding via Claude Vision across web chat and Telegram.

### Tasks
- [x] `lib/tools/image-analysis.ts` — `analyzeImage(imageUrl, prompt?)` using Claude Vision
- [x] `app/api/files/upload/route.ts` — POST multipart upload to Supabase Storage "chat-images" bucket
- [x] `lib/billing/plans.ts` — add `image_analysis` credit action (3 credits)
- [x] `lib/skills/registry.ts` — add `image_understanding` skill (starter+ plans)
- [x] `lib/tools/definitions.ts` — add `analyze_image` tool schema + executor
- [x] `app/api/chat/route.ts` — accept `image_url`, build vision content array for Claude
- [x] `components/chat/ChatInput.tsx` — paperclip image upload button, preview, upload to /api/files/upload
- [x] `components/chat/ChatInterface.tsx` — pass imageUrl through to API
- [x] `components/chat/MessageBubble.tsx` — show image thumbnails on user messages via metadata.image_url
- [x] `app/api/channels/telegram/webhook/route.ts` — handle photo messages, download via getFile, analyze with Vision

### Review
**Files created:**
1. `lib/tools/image-analysis.ts` — Claude Vision wrapper
2. `app/api/files/upload/route.ts` — image upload endpoint

**Files modified:**
1. `lib/billing/plans.ts` — added `image_analysis` CreditAction (3 credits) + `hasImageAnalysis` classifier
2. `lib/skills/registry.ts` — added `image_understanding` skill definition
3. `lib/tools/definitions.ts` — added `analyze_image` tool schema, OPENCLAW mapping, and executor case
4. `app/api/chat/route.ts` — accepts `image_url` param, builds vision content array, stores image_url in message metadata
5. `components/chat/ChatInput.tsx` — added paperclip upload button, file input, image preview with remove, upload flow
6. `components/chat/ChatInterface.tsx` — `handleSendMessage` now accepts optional `imageUrl`, passes to API
7. `components/chat/MessageBubble.tsx` — renders image thumbnail above user message text when metadata has image_url
8. `app/api/channels/telegram/webhook/route.ts` — added `handlePhotoMessage` for Telegram photo messages with caption support

*Last Updated: February 13, 2026*
