# Kyra Tech Stack

## Frontend
| Layer | Tech | Details |
|---|---|---|
| **Framework** | Next.js 15.5.12 | App Router, React Server Components |
| **React** | React 19.2.4 | Latest with RSC support |
| **Language** | TypeScript 5 | Strict mode |
| **Styling** | Tailwind CSS 3.4 | + tailwind-merge, class-variance-authority |
| **UI Components** | Custom + shadcn/ui pattern | Cards, Badges, Buttons, Inputs |
| **Icons** | Lucide React | 563+ icons |
| **Markdown** | react-markdown + remark-gfm + rehype-highlight | For AI chat rendering |

## Backend
| Layer | Tech | Details |
|---|---|---|
| **Hosting** | Vercel Pro ($20/mo) | 30-core turbo builds, every-minute cron |
| **Database** | Supabase (PostgreSQL) | Auth, RLS, real-time, storage |
| **Auth** | Supabase Auth | Email/password + Google OAuth |
| **Payments** | Stripe | Checkout, Connect (agency payouts), webhooks |
| **Cron** | Vercel Cron | `* * * * *` → `/api/ghl/poll` (every minute) |
| **Validation** | Zod 4 | Schema validation |

## AI / OpenClaw Infrastructure
| Layer | Tech | Details |
|---|---|---|
| **AI Engine** | OpenClaw Gateway | Real instance on Fly.io, NOT a proxy |
| **Container** | Fly.io (fra region) | 2GB RAM, shared CPU, 1GB persistent volume |
| **Base Image** | Debian Bookworm-slim | Node.js 22.13.1 + Chromium 145 + OpenClaw |
| **Bridge** | kyra-bridge.js (~1,100 lines) | HTTP server on port 3100, Ed25519 device auth |
| **AI Models** | Anthropic Claude (primary) | + OpenAI, OpenRouter, Perplexity fallbacks |
| **Skills** | 51 OpenClaw skills | Web search, browser, email, calendar, GitHub, TTS, etc. |
| **Tools** | 24 built-in tools | exec, read, write, browser, cron, message, web_search... |
| **Browser** | Chromium 145 | In-container for browser automation |

## CRM / Integration
| Layer | Tech | Details |
|---|---|---|
| **CRM** | GoHighLevel (GHL) | Private Integration tokens, V2 API |
| **SMS Pipeline** | GHL → Vercel Cron → Bridge → OpenClaw → Response | Every-minute polling |
| **Channels** | Telegram, Discord, WhatsApp | Via OpenClaw channel system + bridge proxy |
| **Web Scraping** | @mozilla/readability + jsdom | For URL content extraction |

## Infrastructure
| Layer | Tech | Details |
|---|---|---|
| **DNS / CDN** | Cloudflare | `kyra.conversionsystem.com` (Vercel), `gateway.conversionsystem.com` (Fly.io) |
| **Gateway SSL** | Let's Encrypt via Fly.io | Auto-provisioned |
| **Secrets** | Fly.io Secrets + Vercel Env Vars | API keys, gateway tokens |
| **Persistent Storage** | Fly.io Volume (1GB) | `openclaw_data` at `/root/.openclaw` — survives deploys |
| **Version Control** | GitHub | `ConversionSystem/kyra` |
| **CI/CD** | Vercel auto-deploy from git | + `npx vercel --prod` for force deploys |

## Database Schema (Active Tables)
```
agencies, agency_members, agency_clients, agency_templates
conversations, messages, memories
users, user_channels, user_files, user_skills
integrations, ghl_message_log
automations, reminders
```

## Key Architecture Decisions
- **BYOK (Bring Your Own Keys)** — Agencies provide their own API keys, stored encrypted in `agencies.api_keys` JSONB
- **Single shared gateway** — One OpenClaw instance handles all clients via session isolation (per-agency VMs deferred to post-beta)
- **Bridge-first startup** — Bridge starts before gateway to pass Fly.io health checks within 120s grace period
- **Ed25519 device auth** — Bridge generates keypair at startup, gateway auto-approves local connections
