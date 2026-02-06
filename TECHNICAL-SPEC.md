# Kyra — Technical Specification

**Version:** 1.0  
**Date:** February 6, 2026  
**Author:** Steve (AI CEO)  
**Status:** Approved for Development

---

## 1. Overview

### 1.1 Product Summary

Kyra is a hosted AI assistant platform built on OpenClaw technology. It provides non-technical users with a zero-setup AI assistant that works across communication channels.

### 1.2 Architecture Decision

**Chosen Approach:** Option C — Session-Based Isolation

- Single OpenClaw Gateway handles all users
- User isolation via `sessions_spawn` (existing OpenClaw feature)
- Memory stored in Supabase + Pinecone (not file-based)
- Web app handles auth, billing, UI

### 1.3 Key Constraints

- No modifications to OpenClaw core
- MVP in 4 weeks
- Infrastructure cost < $500/month at 50 users
- Reuse Kyra codebase where possible

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS                                    │
│              Web Browser / Slack / Email                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Next.js 14 App                         │    │
│  │  • Landing Page        • Chat Interface                  │    │
│  │  • Auth (Login/Signup) • Memory Dashboard                │    │
│  │  • Settings            • Billing Portal                  │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API LAYER (Next.js API Routes)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ /api/    │ │ /api/    │ │ /api/    │ │ /api/    │           │
│  │ auth/*   │ │ chat/*   │ │ memory/* │ │ billing/*│           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌───────────────────────────────────────────────────────────────┐
│                    BACKEND SERVICES                            │
│                                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Supabase   │  │  OpenClaw   │  │  Pinecone   │            │
│  │  Auth + DB  │  │  Gateway    │  │  Vectors    │            │
│  │  (Railway)  │  │  (Railway)  │  │  (Cloud)    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                │
│  ┌─────────────┐  ┌─────────────┐                             │
│  │   Stripe    │  │   Slack     │                             │
│  │   Billing   │  │   OAuth     │                             │
│  └─────────────┘  └─────────────┘                             │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow: User Sends Message

```
1. User types message in web chat
2. Frontend POST /api/chat/message
   └── Payload: { conversation_id, content, user_id }
3. API Route:
   a. Verify auth (Supabase JWT)
   b. Fetch user's relevant memories (Pinecone)
   c. Build context prompt with memories
   d. Call OpenClaw sessions_send or sessions_spawn
   e. Stream response back to client
4. OpenClaw processes with Claude
5. Response streams to user
6. Memory extraction runs async
   └── New memories saved to Supabase + Pinecone
```

### 2.3 Component Responsibilities

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| Web App | UI, routing, auth flows | Next.js 14 |
| API Routes | Business logic, orchestration | Next.js API |
| Supabase | Users, conversations, memories metadata | PostgreSQL |
| Pinecone | Semantic memory search | Vector DB |
| OpenClaw | AI processing, Claude API | Node.js gateway |
| Stripe | Subscriptions, payments | Stripe SDK |
| Vercel | Web hosting, edge functions | Vercel Platform |
| Railway | OpenClaw hosting | Docker container |

---

## 3. Database Schema

### 3.1 Supabase Tables

```sql
-- Users (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'business', 'enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  usage_this_month INTEGER DEFAULT 0,
  usage_reset_at TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  channel TEXT DEFAULT 'web' CHECK (channel IN ('web', 'slack', 'email')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memories
CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('fact', 'person', 'decision', 'event', 'preference')),
  content TEXT NOT NULL,
  source TEXT, -- 'web', 'slack', 'manual'
  source_message_id UUID REFERENCES public.messages(id),
  pinecone_id TEXT, -- Vector ID for deletion
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integrations
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('slack', 'google', 'notion')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}', -- workspace_id, team_name, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Reminders
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  delivered BOOLEAN DEFAULT FALSE,
  channel TEXT DEFAULT 'web',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_memories_user_id ON public.memories(user_id);
CREATE INDEX idx_reminders_user_due ON public.reminders(user_id, due_at) WHERE NOT delivered;

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Policies (users can only access their own data)
CREATE POLICY "Users can view own data" ON public.users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON public.messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own memories" ON public.memories
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own integrations" ON public.integrations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own reminders" ON public.reminders
  FOR ALL USING (auth.uid() = user_id);
```

### 3.2 Pinecone Index

```
Index Name: kyra-memories
Dimensions: 1536 (OpenAI text-embedding-ada-002)
Metric: cosine
Pod Type: p1.x1 (starter)

Metadata Fields:
- user_id: string (required, for filtering)
- type: string (fact|person|decision|event|preference)
- source: string (web|slack|email)
- created_at: number (unix timestamp)
```

---

## 4. API Specification

### 4.1 Authentication

All API routes require Supabase JWT in Authorization header:
```
Authorization: Bearer <supabase_access_token>
```

### 4.2 Endpoints

#### Chat

```typescript
// Send message and get streaming response
POST /api/chat/message
Request:
{
  conversation_id?: string,  // Optional, creates new if missing
  content: string
}
Response: Server-Sent Events (SSE)
  event: delta
  data: { "content": "partial response..." }
  
  event: complete
  data: { "message_id": "...", "conversation_id": "..." }
  
  event: memory
  data: { "id": "...", "type": "fact", "content": "..." }
```

#### Conversations

```typescript
// List conversations
GET /api/conversations
Response:
{
  conversations: [
    { id, title, channel, updated_at, message_count }
  ]
}

// Get conversation with messages
GET /api/conversations/:id
Response:
{
  conversation: { id, title, channel, created_at },
  messages: [
    { id, role, content, created_at }
  ]
}

// Delete conversation
DELETE /api/conversations/:id
Response: { success: true }
```

#### Memory

```typescript
// List memories
GET /api/memories?type=fact&limit=50
Response:
{
  memories: [
    { id, type, content, source, created_at }
  ]
}

// Search memories (semantic)
GET /api/memories/search?q=client+meeting
Response:
{
  memories: [
    { id, type, content, score, created_at }
  ]
}

// Create memory manually
POST /api/memories
Request:
{
  type: "fact" | "person" | "decision" | "event" | "preference",
  content: string
}
Response: { memory: { id, type, content, created_at } }

// Update memory
PATCH /api/memories/:id
Request: { content?: string, type?: string }
Response: { memory: { ... } }

// Delete memory
DELETE /api/memories/:id
Response: { success: true }
```

#### Integrations

```typescript
// List integrations
GET /api/integrations
Response:
{
  integrations: [
    { provider, connected: true, metadata: { workspace_name } }
  ]
}

// Start OAuth flow
GET /api/integrations/:provider/connect
Response: Redirect to OAuth provider

// OAuth callback
GET /api/integrations/:provider/callback
Response: Redirect to /settings?connected=provider

// Disconnect
DELETE /api/integrations/:provider
Response: { success: true }
```

#### Billing

```typescript
// Get subscription status
GET /api/billing/subscription
Response:
{
  plan: "starter",
  status: "active",
  usage: { interactions: 450, limit: 1000 },
  current_period_end: "2026-03-06T00:00:00Z"
}

// Create checkout session
POST /api/billing/checkout
Request: { plan: "starter" | "business" | "enterprise" }
Response: { checkout_url: "https://checkout.stripe.com/..." }

// Get billing portal URL
POST /api/billing/portal
Response: { portal_url: "https://billing.stripe.com/..." }
```

---

## 5. OpenClaw Integration

### 5.1 Communication Method

The web app communicates with OpenClaw via HTTP API:

```typescript
// OpenClaw API endpoint (Railway)
const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL;
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY;

// Send message to user's session
async function sendToOpenClaw(userId: string, message: string, context: string) {
  const response = await fetch(`${OPENCLAW_URL}/api/sessions/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': OPENCLAW_API_KEY,
    },
    body: JSON.stringify({
      sessionKey: `kyra-user-${userId}`,
      message: buildPrompt(message, context),
      timeoutSeconds: 120,
    }),
  });
  return response;
}
```

### 5.2 Session Management

Each Kyra user maps to an OpenClaw session:

```
Session Key Pattern: kyra-user-{user_id}

Session Types:
- Main session: Long-running, stateless (no MEMORY.md)
- Spawned sessions: For isolated tasks (reminders, etc.)
```

### 5.3 Context Injection

Before each message, we inject user context:

```typescript
function buildPrompt(userMessage: string, memories: Memory[]) {
  return `
## User Context
${memories.map(m => `- [${m.type}] ${m.content}`).join('\n')}

## Current Request
${userMessage}

## Instructions
You are Kyra, a helpful AI assistant. Use the context above to personalize your response.
When the user shares important information, save it using [SAVE_MEMORY: type=<type>] content [/SAVE_MEMORY].
Memory types: fact, person, decision, event, preference
`;
}
```

### 5.4 Memory Extraction

Parse Claude's response for memory tags:

```typescript
const MEMORY_REGEX = /\[SAVE_MEMORY:\s*type=(\w+)\]\s*(.*?)\s*\[\/SAVE_MEMORY\]/gs;

function extractMemories(response: string): Memory[] {
  const memories: Memory[] = [];
  let match;
  while ((match = MEMORY_REGEX.exec(response)) !== null) {
    memories.push({
      type: match[1] as MemoryType,
      content: match[2].trim(),
    });
  }
  return memories;
}
```

---

## 6. Integrations

### 6.1 Slack Integration

**OAuth Scopes:**
- `chat:write` - Send messages
- `channels:history` - Read channel messages (when mentioned)
- `im:history` - Read DMs
- `users:read` - Get user info

**Event Subscriptions:**
- `message.im` - DM received
- `app_mention` - Mentioned in channel

**Flow:**
1. User clicks "Connect Slack"
2. Redirect to Slack OAuth
3. User authorizes
4. Callback saves tokens to `integrations` table
5. Slack events webhook → `/api/webhooks/slack`
6. Process message → OpenClaw → Reply in Slack

### 6.2 Google Calendar (Future)

**OAuth Scopes:**
- `calendar.readonly` - Read calendar events
- `calendar.events` - Create/modify events

**Features:**
- "What's on my calendar tomorrow?"
- "Schedule a meeting with John"
- "Remind me before my 3pm call"

---

## 7. Billing & Usage

### 7.1 Plan Limits

| Plan | Interactions/Month | Price |
|------|-------------------|-------|
| Free | 100 | $0 |
| Starter | 1,000 | $19 |
| Business | 5,000 | $49 |
| Enterprise | 25,000 | $199 |

### 7.2 Usage Tracking

```typescript
// Increment usage after each AI interaction
async function trackUsage(userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('usage_this_month, plan')
    .eq('id', userId)
    .single();
  
  const limit = PLAN_LIMITS[user.plan];
  
  if (user.usage_this_month >= limit) {
    throw new UsageLimitError('Monthly limit reached');
  }
  
  await supabase
    .from('users')
    .update({ usage_this_month: user.usage_this_month + 1 })
    .eq('id', userId);
}

// Reset usage monthly (cron job)
async function resetUsage() {
  await supabase
    .from('users')
    .update({ usage_this_month: 0, usage_reset_at: new Date() })
    .lt('usage_reset_at', startOfMonth());
}
```

### 7.3 Stripe Integration

```typescript
// Products (create in Stripe Dashboard)
const STRIPE_PRODUCTS = {
  starter: 'price_xxx',
  business: 'price_yyy',
  enterprise: 'price_zzz',
};

// Webhook events to handle
// - checkout.session.completed → Activate subscription
// - customer.subscription.updated → Plan change
// - customer.subscription.deleted → Downgrade to free
// - invoice.payment_failed → Notify user
```

---

## 8. Security

### 8.1 Authentication Flow

```
1. User signs up/logs in via Supabase Auth
2. Supabase returns JWT (access_token + refresh_token)
3. Frontend stores in httpOnly cookies
4. API routes verify JWT via Supabase client
5. Row Level Security enforces data isolation
```

### 8.2 API Security

- All routes require authentication (except /api/webhooks/*)
- Webhook routes verify signatures (Stripe, Slack)
- Rate limiting: 100 requests/minute per user
- Input validation via Zod schemas

### 8.3 Data Encryption

- Supabase: Encrypted at rest (AES-256)
- Pinecone: Encrypted at rest
- Integration tokens: Encrypted in database (pgcrypto)
- All traffic: TLS 1.3

---

## 9. Project Structure

```
kyra/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── chat/
│   │   │   ├── page.tsx
│   │   │   └── [conversationId]/page.tsx
│   │   ├── memories/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── billing/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/callback/route.ts
│   │   ├── chat/
│   │   │   └── message/route.ts
│   │   ├── conversations/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── memories/
│   │   │   ├── route.ts
│   │   │   ├── search/route.ts
│   │   │   └── [id]/route.ts
│   │   ├── integrations/
│   │   │   ├── route.ts
│   │   │   └── [provider]/
│   │   │       ├── connect/route.ts
│   │   │       └── callback/route.ts
│   │   ├── billing/
│   │   │   ├── subscription/route.ts
│   │   │   ├── checkout/route.ts
│   │   │   └── portal/route.ts
│   │   └── webhooks/
│   │       ├── stripe/route.ts
│   │       └── slack/route.ts
│   ├── page.tsx (landing)
│   └── layout.tsx
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   └── ConversationList.tsx
│   ├── memory/
│   │   ├── MemoryCard.tsx
│   │   ├── MemoryList.tsx
│   │   └── MemorySearch.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── UserMenu.tsx
│   └── ui/ (shadcn components)
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── openclaw/
│   │   ├── client.ts
│   │   └── prompts.ts
│   ├── pinecone/
│   │   └── client.ts
│   ├── stripe/
│   │   └── client.ts
│   ├── integrations/
│   │   ├── slack.ts
│   │   └── google.ts
│   └── utils.ts
├── hooks/
│   ├── useChat.ts
│   ├── useMemories.ts
│   └── useSubscription.ts
├── types/
│   └── index.ts
├── supabase/
│   └── schema.sql
├── public/
├── .env.example
├── .env.local
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## 10. Development Phases

### Phase 1: Foundation (Week 1)

- [ ] Project setup (Next.js, Tailwind, Supabase)
- [ ] Copy/adapt Kyra UI components
- [ ] Database schema setup
- [ ] Basic auth (signup, login, logout)
- [ ] Protected routes middleware

### Phase 2: Core Chat (Week 2)

- [ ] OpenClaw integration (sessions API)
- [ ] Chat interface with streaming
- [ ] Conversation CRUD
- [ ] Memory extraction from responses
- [ ] Pinecone integration for semantic search

### Phase 3: Features (Week 3)

- [ ] Memory dashboard (view, edit, delete)
- [ ] Slack OAuth integration
- [ ] Slack message handling
- [ ] Basic reminders
- [ ] Usage tracking

### Phase 4: Monetization (Week 4)

- [ ] Stripe checkout integration
- [ ] Subscription management
- [ ] Usage limits enforcement
- [ ] Billing portal
- [ ] Landing page polish
- [ ] Beta launch

---

## 11. Environment Variables

```bash
# App
NEXT_PUBLIC_APP_URL=https://kyra.ai

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# OpenClaw
OPENCLAW_GATEWAY_URL=https://kyra-openclaw.railway.app
OPENCLAW_API_KEY=xxx...

# AI Models (passed to OpenClaw)
ANTHROPIC_API_KEY=sk-ant-xxx...
OPENAI_API_KEY=sk-xxx...

# Pinecone
PINECONE_API_KEY=xxx...
PINECONE_INDEX=kyra-memories

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx...
STRIPE_WEBHOOK_SECRET=whsec_xxx...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx...

# Slack
SLACK_CLIENT_ID=xxx...
SLACK_CLIENT_SECRET=xxx...
SLACK_SIGNING_SECRET=xxx...

# Google (future)
GOOGLE_CLIENT_ID=xxx...
GOOGLE_CLIENT_SECRET=xxx...
```

---

## 12. Success Criteria

### MVP Launch (Week 4)

| Metric | Target |
|--------|--------|
| Signups | 100 |
| Activated (completed onboarding) | 60 |
| Paying customers | 10 |
| Chat interactions per user | 5+ |
| Uptime | 99% |

### Month 1 Post-Launch

| Metric | Target |
|--------|--------|
| Paying customers | 50 |
| MRR | $1,000 |
| Weekly retention | 50% |
| NPS | > 30 |

---

*Technical Spec v1.0 — Ready for implementation.*
