# Kyra — Hosted OpenClaw Platform

> **AI Assistant SaaS** — Your personal AI that remembers everything, sets reminders, and integrates with your calendar.

**Live Repo:** https://github.com/ConversionSystem/kyra

## 🚀 What is Kyra?

Kyra is a hosted AI assistant platform built for consumers and small businesses who want a personal AI without the complexity. It's essentially "ChatGPT but better" — with persistent memory, reminders, and calendar integration.

**Target:** 50 paying customers at launch  
**Pricing:** $0-199/month (Free → Enterprise)

## ✨ Features

### Core
- 🧠 **Persistent Memory** — Automatically remembers facts, preferences, people, decisions
- 💬 **Streaming Chat** — Real-time Claude responses with markdown support
- 🔐 **Secure Auth** — Email/password + Google OAuth (Supabase Auth)
- 📊 **Usage Tracking** — Per-user limits enforced by plan tier

### Phase 2A ✅
- ⏰ **Reminders** — "Remind me tomorrow at 9am to call mom"
- 🔔 **Web Notifications** — Popup when reminders are due
- 📅 **Google Calendar** — View today's events, create new events
- 🧠 **Memory UI** — View, search, delete your memories

### Phase 2B (Ready)
- 🔌 **OpenClaw Backend** — Client ready, toggle to enable tools/skills
- 📧 **Email Notifications** — Endpoint ready, add Resend

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL (Supabase) |
| Vector DB | Pinecone |
| AI | Claude 3.5 Sonnet (Anthropic) |
| Embeddings | OpenAI text-embedding-3-small |
| Auth | Supabase Auth |
| Payments | Stripe (ready) |
| Styling | Tailwind CSS |

## 📁 Project Structure

```
kyra/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── chat/page.tsx
│   │   ├── chat/[conversationId]/page.tsx
│   │   ├── memories/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── callback/route.ts
│   │   │   └── google/
│   │   │       ├── route.ts
│   │   │       └── callback/route.ts
│   │   ├── calendar/route.ts
│   │   ├── chat/route.ts
│   │   ├── conversations/route.ts
│   │   ├── memories/route.ts
│   │   └── reminders/
│   │       ├── route.ts
│   │       ├── due/route.ts
│   │       └── check/route.ts
│   ├── page.tsx (landing)
│   └── layout.tsx
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx
│   │   ├── ChatInput.tsx
│   │   ├── ConversationSidebar.tsx
│   │   └── MessageBubble.tsx
│   ├── reminders/
│   │   └── ReminderNotification.tsx
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── ...
├── lib/
│   ├── ai/
│   │   ├── claude.ts
│   │   ├── embeddings.ts
│   │   ├── memory.ts
│   │   └── prompts.ts
│   ├── billing/
│   │   └── plans.ts
│   ├── integrations/
│   │   └── google.ts
│   ├── openclaw/
│   │   ├── client.ts
│   │   └── prompts.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── middleware.ts
│   │   └── server.ts
│   ├── pinecone.ts
│   └── utils.ts
├── supabase/
│   └── schema.sql
├── types/
│   └── index.ts
├── middleware.ts
└── .env.example
```

## 🚦 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/ConversionSystem/kyra.git
cd kyra
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Fill in required keys:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# Pinecone
PINECONE_API_KEY=pcsk_xxx
PINECONE_INDEX=kyra-memories

# Google Calendar (optional)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

### 3. Database Setup

1. Go to Supabase Dashboard → SQL Editor
2. Paste contents of `supabase/schema.sql`
3. Run
4. (Optional) Disable email confirmation: Auth → Settings → toggle off

### 4. Pinecone Setup

Create index named `kyra-memories`:
- Dimension: 1536
- Metric: cosine
- Serverless (us-east-1)

### 5. Run

```bash
npm run dev
```

Local: http://localhost:3001 | Production: https://kyra.conversionsystem.com

## 💰 Pricing Tiers

| Plan | Price | Messages/mo |
|------|-------|-------------|
| Free | $0 | 100 |
| Starter | $19 | 1,000 |
| Business | $49 | 5,000 |
| Enterprise | $199 | 25,000 |

## 🔌 API Endpoints

### Chat
- `POST /api/chat` — Send message, get streaming response

### Conversations
- `GET /api/conversations` — List user's conversations

### Memories
- `GET /api/memories` — List user's memories
- `DELETE /api/memories?id=xxx` — Delete a memory

### Reminders
- `GET /api/reminders` — List pending reminders
- `POST /api/reminders` — Create reminder
- `DELETE /api/reminders?id=xxx` — Delete reminder
- `PATCH /api/reminders` — Mark as delivered
- `GET /api/reminders/due` — Get due reminders (for notifications)
- `GET /api/reminders/check` — Cron endpoint for delivery

### Calendar
- `GET /api/calendar` — Get events (today/week/month)
- `POST /api/calendar` — Create event
- `DELETE /api/calendar` — Disconnect Google

### Auth
- `GET /api/auth/callback` — Supabase auth callback
- `GET /api/auth/google` — Start Google OAuth
- `GET /api/auth/google/callback` — Google OAuth callback

## 📋 Deployment Checklist

- [ ] Deploy to Cloudflare (`npm run deploy`)
- [ ] Set environment variables via `wrangler secret put`
- [ ] Configure custom domain
- [ ] Set up Stripe products/prices
- [ ] Configure Google OAuth redirect URIs for production
- [ ] Set up cron job for reminder delivery (Cloudflare Cron Triggers or external)
- [ ] Add Resend for email notifications

## 🏗 Architecture

**Option C: Session-Based Isolation**

```
User → Kyra Web App → Claude API
              ↓
         Supabase (user data, conversations, memories, reminders)
              ↓
         Pinecone (vector embeddings for semantic memory)
```

Each user's data is isolated via Supabase RLS policies. Vector search filters by user_id.

Future: Add OpenClaw Gateway backend for tools, skills, and multi-model routing.

## 📄 License

Proprietary — Conversion System

---

**Built by Conversion System** | [conversionsystem.com](https://conversionsystem.com)
