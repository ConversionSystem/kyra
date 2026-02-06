# Kyra — Your AI Assistant That Just Works

A hosted AI assistant platform built on OpenClaw technology. Zero setup, instant intelligence.

## Features

- 🧠 **Persistent Memory** — Remembers your preferences, decisions, and context
- 💬 **Multi-Channel** — Works on web, Slack, and more
- ⚡ **Real-time Streaming** — Watch responses as they're generated
- 🔐 **Secure** — Enterprise-grade security and data isolation
- 📱 **Responsive** — Works great on desktop and mobile

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Supabase
- **Vector DB**: Pinecone (semantic memory search)
- **AI Backend**: OpenClaw Gateway
- **AI Model**: Anthropic Claude
- **Auth**: Supabase Auth
- **Payments**: Stripe
- **Styling**: Tailwind CSS

## Quick Start

### 1. Install Dependencies

```bash
cd kyra
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Required variables:
- Supabase credentials
- OpenClaw Gateway URL + API key
- Pinecone API key
- Stripe keys
- Slack OAuth credentials

### 3. Set Up Database

Run the schema in Supabase SQL Editor:
```bash
cat supabase/schema.sql
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
kyra/
├── app/                    # Next.js app router
│   ├── (auth)/            # Login, signup pages
│   ├── (dashboard)/       # Protected app pages
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Utilities and clients
│   ├── supabase/         # Supabase client
│   ├── openclaw/         # OpenClaw integration
│   ├── pinecone/         # Vector search
│   └── stripe/           # Billing
├── hooks/                 # React hooks
├── types/                 # TypeScript types
└── supabase/             # Database schema
```

## Architecture

Kyra uses **Option C: Session-Based Isolation**:
- Single OpenClaw Gateway handles all users
- User isolation via OpenClaw sessions
- Memory stored in Supabase + Pinecone
- Web app handles auth, UI, billing

See `TECHNICAL-SPEC.md` for full architecture details.

## Development

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Deployment

### Vercel (Frontend)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Railway (OpenClaw Gateway)

1. Deploy OpenClaw Docker image
2. Configure environment variables
3. Set up API key authentication

## Pricing Tiers

| Plan | Interactions/Month | Price |
|------|-------------------|-------|
| Free | 100 | $0 |
| Starter | 1,000 | $19/mo |
| Business | 5,000 | $49/mo |
| Enterprise | 25,000 | $199/mo |

## License

Proprietary — Conversion System

---

Built with ❤️ by Conversion System
