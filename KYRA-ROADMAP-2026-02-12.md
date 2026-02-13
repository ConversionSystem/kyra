# Kyra Strategic Roadmap — What's Next

**Date:** February 12, 2026  
**Author:** Steve, CEO — Conversion System  
**Status:** Strategic Planning Document

---

## 1. Executive Summary

### What Kyra Is Today
Kyra is a hosted, multi-tenant wrapper around OpenClaw running on Cloudflare Workers + Containers. Users sign up, get an isolated OpenClaw sandbox, and chat via web, Telegram, or WhatsApp. Core pipeline works: messages flow through the worker to per-user OpenClaw gateways, responses stream back via SSE/WebSocket.

### What Was Shipped (Feb 12, 2026 — Phases 1-4)
- ✅ OpenClaw worker pipeline with SSE streaming
- ✅ Per-user workspace bootstrap (SOUL.md, USER.md, MEMORY.md, AGENTS.md in R2)
- ✅ WebSocket streaming endpoint
- ✅ Telegram + WhatsApp channel routing through OpenClaw
- ✅ Landing page with live chat demo widget
- ✅ Stripe billing infrastructure (checkout, portal, webhook)
- ✅ Credit-based usage tracking

### The Gap
OpenClaw has **50+ features**. Kyra exposes roughly **8 of them**. The entire skills ecosystem, browser control, voice, cron jobs, media understanding, multi-model support, and node system are untouched. This is where the revenue lives.

### The Opportunity
Kyra can be **the Vercel of AI assistants** — take something powerful but complex (OpenClaw/Next.js) and make it accessible. The competitive landscape (Lindy $50/mo, Botpress $89/mo, Voiceflow $60/mo) validates $20-200/mo pricing for hosted AI. But none of them offer what OpenClaw can do.

---

## 2. OpenClaw Feature Audit — Full Matrix

### Channels
| Feature | OpenClaw | Kyra Status | Notes |
|---------|----------|-------------|-------|
| WhatsApp (Baileys) | ✅ | ✅ Working | Via webhook → worker pipeline |
| Telegram (grammY) | ✅ | ✅ Working | Via webhook → worker pipeline |
| Discord (discord.js) | ✅ | ❌ Not implemented | High demand — needs bot token per user or shared bot |
| Slack (Bolt) | ✅ | ❌ Not implemented | Enterprise channel — OAuth app needed |
| Signal (signal-cli) | ✅ | ❌ Not implemented | Hard — requires signal-cli in container |
| iMessage (BlueBubbles) | ✅ | ❌ Not feasible | Requires macOS host |
| Google Chat | ✅ | ❌ Not implemented | Google Workspace integration |
| Microsoft Teams | ✅ | ❌ Not implemented | Enterprise play |
| Matrix | ✅ | ❌ Not implemented | Niche |
| WebChat | ✅ | ✅ Working | Native Kyra chat UI |
| Zalo / Zalo Personal | ✅ | ❌ Not implemented | Regional (Vietnam) |
| LINE | ✅ | ❌ Not implemented | Regional (Japan/Thailand) |

### AI & Models
| Feature | OpenClaw | Kyra Status | Notes |
|---------|----------|-------------|-------|
| Multi-model (Claude/GPT/Gemini) | ✅ | 🔧 Partial | Worker uses Anthropic only; no user model selection |
| Model failover/rotation | ✅ | ❌ Not implemented | Users can't configure fallback models |
| OAuth subscriptions (Claude Pro/Max) | ✅ | ❌ Not implemented | Users bring own keys = lower margins but lower cost |
| Thinking modes (low/medium/high) | ✅ | ❌ Not implemented | No UI for reasoning level |
| Session pruning | ✅ | 🔧 Partial | OpenClaw handles internally |
| Streaming/chunking | ✅ | ✅ Working | SSE + WebSocket |

### Memory & Context
| Feature | OpenClaw | Kyra Status | Notes |
|---------|----------|-------------|-------|
| Workspace files (SOUL.md etc) | ✅ | ✅ Working | R2-backed per user |
| MEMORY.md (long-term) | ✅ | ✅ Working | Bootstrapped on init |
| Daily memory files | ✅ | ❌ Not implemented | No memory/YYYY-MM-DD.md auto-creation |
| Heartbeat memory maintenance | ✅ | ❌ Not implemented | No periodic memory review |
| Pinecone/vector memory | Custom | 🔧 Partial | Kyra has Pinecone but not connected to worker pipeline |

### Tools & Automation
| Feature | OpenClaw | Kyra Status | Notes |
|---------|----------|-------------|-------|
| Browser control | ✅ | ❌ Not implemented | Cloudflare Browser Rendering available — skill exists |
| Cron jobs / scheduled tasks | ✅ | ❌ Not implemented | HIGH VALUE — users want recurring tasks |
| Webhooks (inbound triggers) | ✅ | ❌ Not implemented | Gmail, GitHub, etc. triggers |
| Gmail Pub/Sub | ✅ | ❌ Not implemented | Email monitoring |
| Shell/exec (sandbox) | ✅ | 🔧 Partial | Container has exec but not exposed to users |
| Web search | ✅ | 🔧 Partial | Credit system exists but unclear if tool is wired |
| Web fetch | ✅ | ❌ Not implemented | URL reading |
| File operations (read/write/edit) | ✅ | ❌ Not implemented | No user file management |

### Skills Ecosystem
| Feature | OpenClaw | Kyra Status | Notes |
|---------|----------|-------------|-------|
| Skills platform | ✅ (60+ skills) | ❌ Not implemented | MASSIVE gap — this is OpenClaw's moat |
| Bundled skills | ✅ | ❌ | weather, github, discord, slack, etc. |
| Managed skills (auto-update) | ✅ | ❌ | |
| Workspace skills (user-created) | ✅ | ❌ | |
| Skill marketplace | Doesn't exist yet | ❌ | OPPORTUNITY — Kyra could pioneer this |
| Notable skills: | | | |
| — 1Password | ✅ | ❌ | Password management |
| — GitHub | ✅ | ❌ | PR reviews, issues |
| — Notion | ✅ | ❌ | Note-taking integration |
| — Obsidian | ✅ | ❌ | Knowledge base |
| — Spotify | ✅ | ❌ | Music control |
| — Trello | ✅ | ❌ | Project management |
| — Weather | ✅ | ❌ | Basic utility |
| — Coding agent | ✅ | ❌ | Code generation |
| — Apple Reminders/Notes | ✅ | ❌ | macOS only |
| — Food order | ✅ | ❌ | Niche |
| — OpenAI Whisper | ✅ | ❌ | Audio transcription |
| — Image generation | ✅ | ❌ | DALL-E/OpenAI |

### Voice & Media
| Feature | OpenClaw | Kyra Status | Notes |
|---------|----------|-------------|-------|
| TTS (ElevenLabs/sag) | ✅ | ❌ Not implemented | Voice responses |
| Voice Wake (always-on speech) | ✅ | ❌ Not feasible | Requires native app |
| Talk Mode | ✅ | ❌ Not feasible | Requires native app |
| Media pipeline (images/audio/video) | ✅ | ❌ Not implemented | Image understanding etc. |
| Audio transcription | ✅ | ❌ Not implemented | Whisper/Deepgram/Groq |
| Image understanding | ✅ | ❌ Not implemented | Multi-provider |

### Platform & Apps
| Feature | OpenClaw | Kyra Status | Notes |
|---------|----------|-------------|-------|
| Canvas (A2UI) | ✅ | ❌ Not implemented | Visual workspace |
| Node system (iOS/Android/Mac) | ✅ | ❌ Not feasible | Requires device pairing |
| macOS menu bar app | ✅ | ❌ Not feasible | Native app |
| Control UI | ✅ | 🔧 Partial | Kyra has own dashboard, not OpenClaw's |
| Multi-agent routing | ✅ | ❌ Not implemented | Different agents for different contexts |
| Session management | ✅ | 🔧 Partial | Basic — no user control |

### Security & Ops
| Feature | OpenClaw | Kyra Status | Notes |
|---------|----------|-------------|-------|
| DM pairing policy | ✅ | ❌ N/A | Kyra manages auth differently |
| Doctor diagnostics | ✅ | ❌ Not implemented | Health checks |
| Logging/debug | ✅ | 🔧 Partial | Admin stats page exists |
| Usage tracking | ✅ | ✅ Working | Credits system |

---

## 3. Gap Analysis — Prioritized

### 🔴 Critical Gaps (Revenue Blockers)

**1. Skills Ecosystem — Not Exposed**
- OpenClaw has 60+ skills (GitHub, Notion, weather, Spotify, etc.)
- Users get a "dumb chatbot" instead of an "assistant that does things"
- **Complexity:** Medium — skills exist in OpenClaw, need UI to enable/configure per user
- **Revenue Impact:** HIGH — this is the #1 reason to upgrade from Free to Starter/Business

**2. Cron Jobs / Scheduled Tasks**
- OpenClaw supports cron for recurring tasks (daily summaries, email checks, reminders)
- This is the "proactive AI" that makes OpenClaw special
- **Complexity:** Medium — need to expose cron config per user
- **Revenue Impact:** HIGH — proactive = sticky = retention

**3. Browser Control**
- OpenClaw can control a browser (navigate, scrape, fill forms)
- Cloudflare Browser Rendering is available; skill already exists in worker
- **Complexity:** Medium — infrastructure exists, need to wire it
- **Revenue Impact:** HIGH — "AI that can browse for you" is a killer feature

**4. More Channels (Discord, Slack)**
- Discord is where OpenClaw's community lives; Slack is enterprise
- **Complexity:** Medium (Discord), Hard (Slack — OAuth app review)
- **Revenue Impact:** HIGH — more channels = more use = more stickiness

### 🟡 Important Gaps (Growth Enablers)

**5. Multi-Model Support + User Model Selection**
- Let users choose Claude/GPT-4/Gemini or bring their own API key
- **Complexity:** Easy — OpenClaw already supports this
- **Revenue Impact:** MEDIUM — BYOK reduces margins but attracts power users

**6. Media Understanding (Images/Audio/Video)**
- Process voice messages, analyze images, transcribe audio
- **Complexity:** Medium — needs provider keys and pipeline wiring
- **Revenue Impact:** MEDIUM — differentiator vs basic chatbots

**7. Web Search + Web Fetch (verified working)**
- Searching the web and reading URLs
- **Complexity:** Easy — may already be partially wired via OpenClaw tools
- **Revenue Impact:** MEDIUM — table stakes for assistant platforms

**8. TTS Voice Responses**
- Send voice messages back on Telegram/WhatsApp
- **Complexity:** Easy — ElevenLabs API + TTS skill exists
- **Revenue Impact:** MEDIUM — wow factor, engagement

### 🟢 Nice-to-Have Gaps

**9. Webhook Triggers (Gmail, GitHub, etc.)**
- Inbound events that trigger the AI
- **Complexity:** Hard — needs per-user webhook routing
- **Revenue Impact:** MEDIUM — enterprise feature

**10. Canvas / A2UI**
- Visual workspace the AI can render to
- **Complexity:** Hard — needs frontend component
- **Revenue Impact:** LOW for now — power user feature

**11. Multi-Agent Routing**
- Different AI personas for different contexts
- **Complexity:** Hard — needs session/agent management UI
- **Revenue Impact:** MEDIUM — team/business feature

**12. Skill Marketplace**
- Users install community skills; creators monetize
- **Complexity:** Hard — needs marketplace infrastructure
- **Revenue Impact:** HIGH long-term — platform play

---

## 4. Phased Roadmap

### Phase 5: Quick Wins (1-2 days each) — Ship This Week

| # | Feature | Why | Effort | Revenue Impact |
|---|---------|-----|--------|----------------|
| 5.1 | **Skills Toggle UI** — Let users enable/disable top 10 skills (weather, GitHub, web search, etc.) from Settings | Instantly makes Kyra 10x more useful | 1-2 days | 🔴 HIGH |
| 5.2 | **Model Selection** — Dropdown in settings: Claude Sonnet, Claude Opus, GPT-4o | Power users want control | 1 day | 🟡 MEDIUM |
| 5.3 | **Onboarding Upgrade** — After signup, ask: What should I call you? What do you do? Timezone? → writes better SOUL.md/USER.md | Personalization drives retention | 1 day | 🟡 MEDIUM |
| 5.4 | **Voice Messages on Telegram** — Receive audio → transcribe → respond (with optional TTS reply) | Huge engagement boost on mobile | 1-2 days | 🟡 MEDIUM |
| 5.5 | **Web Search Tool** — Verify web_search and web_fetch tools are wired and working | Table stakes | 0.5 days | 🟡 MEDIUM |

**Phase 5 outcome:** Kyra goes from "basic chatbot" to "AI assistant with skills and personalization"

### Phase 6: Core Platform (1 week) — Essential for Paying Users

| # | Feature | Why | Effort | Revenue Impact |
|---|---------|-----|--------|----------------|
| 6.1 | **Cron Jobs UI** — "Check my email every morning at 8am" / "Send me a daily summary" | Proactive AI = sticky users | 3-4 days | 🔴 HIGH |
| 6.2 | **Discord Channel** — Connect your Discord bot | Community channel, high demand | 2-3 days | 🔴 HIGH |
| 6.3 | **Browser Tool** — "Go to this URL and summarize it" / "Fill out this form" | Killer demo feature | 2-3 days | 🔴 HIGH |
| 6.4 | **Image Understanding** — Send photos, get analysis | Expected feature for 2026 | 1-2 days | 🟡 MEDIUM |
| 6.5 | **File Upload/Download** — Upload docs, PDFs; AI reads them | Business users need this | 2 days | 🟡 MEDIUM |
| 6.6 | **Custom Instructions** — "Always respond in Spanish" / "You're my fitness coach" | Personalization at scale | 1 day | 🟡 MEDIUM |

**Phase 6 outcome:** Kyra is a legitimate product worth paying $20-100/mo for

### Phase 7: Growth Features (2-4 weeks) — Differentiation

| # | Feature | Why | Effort | Revenue Impact |
|---|---------|-----|--------|----------------|
| 7.1 | **Slack Integration** — Slack OAuth app, workspace install | Enterprise pipeline | 1 week | 🔴 HIGH |
| 7.2 | **Gmail Integration** — Monitor inbox, draft replies, summarize | #1 requested integration | 1 week | 🔴 HIGH |
| 7.3 | **Webhook System** — Inbound webhooks trigger AI (GitHub events, form submissions, etc.) | Automation platform play | 1 week | 🟡 MEDIUM |
| 7.4 | **Skill Marketplace v1** — Browse & install community skills | Platform moat | 2 weeks | 🔴 HIGH |
| 7.5 | **Team/Shared Assistants** — Multiple users share one assistant | Business tier feature | 2 weeks | 🟡 MEDIUM |
| 7.6 | **API Access** — REST API for developers to integrate Kyra | Developer ecosystem | 1 week | 🟡 MEDIUM |
| 7.7 | **Multi-Agent** — "Work agent" vs "Personal agent" with different personas | Power user feature | 1 week | 🟡 MEDIUM |

**Phase 7 outcome:** Kyra is a platform, not just a chatbot

### Phase 8: Enterprise (1-3 months) — Big Revenue

| # | Feature | Why | Effort | Revenue Impact |
|---|---------|-----|--------|----------------|
| 8.1 | **SSO/SAML** — Enterprise login | Required for enterprise sales | 2 weeks | 🔴 HIGH |
| 8.2 | **Admin Dashboard** — Manage team members, usage, policies | Enterprise management | 3 weeks | 🔴 HIGH |
| 8.3 | **Custom Deployment** — Dedicated containers, custom domains | White-label play | 1 month | 🔴 HIGH |
| 8.4 | **Compliance (SOC2, HIPAA)** — Audit logs, data residency | Enterprise requirement | 2-3 months | 🔴 HIGH |
| 8.5 | **On-Premise Option** — Deploy Kyra in customer's cloud | Huge enterprise deals | 2-3 months | 🔴 HIGH |
| 8.6 | **AI Workflow Builder** — Visual automation builder (like Zapier but AI-native) | Platform differentiation | 2 months | 🔴 HIGH |

---

## 5. Revenue Strategy

### Current Pricing Assessment

| Plan | Price | Credits | Per-Credit Cost | Competitive? |
|------|-------|---------|-----------------|-------------|
| Free | $0 | 50 | — | ✅ Good hook |
| Starter | $20 | 500 | $0.04 | ✅ Underpriced vs Lindy ($50) |
| Business | $100 | 3,000 | $0.033 | ✅ Good value |
| Max | $200 | 8,000 | $0.025 | 🟡 Needs more differentiation |

### What Justifies Each Tier Today vs After Roadmap

| Tier | Today | After Phase 6 | After Phase 7 |
|------|-------|---------------|---------------|
| Free | Basic chat, web UI | + skills, model choice | + API access |
| Starter ($20) | + WhatsApp/Telegram | + cron, browser, Discord, images | + Gmail, webhooks |
| Business ($100) | + sub-agents, priority | + Slack, custom instructions, files | + team sharing, multi-agent |
| Max ($200) | + "unlimited" memory | + dedicated support, SLA | + custom deployment, SSO |

### What's Missing That Would Drive Upgrades

1. **Free → Starter:** Skills (weather, GitHub), channels (Telegram/WhatsApp), cron jobs
2. **Starter → Business:** Slack, Gmail integration, browser tool, sub-agents, file upload
3. **Business → Max:** Team features, API access, custom deployment, priority support

### Path to $50k/month

| Scenario | Users Needed | Feasibility |
|----------|-------------|-------------|
| 250 × Business ($100) + 500 × Starter ($20) | 750 users | After Phase 7 |
| 100 × Max ($200) + 150 × Business ($100) | 250 users | After Phase 7 |
| 10 × Enterprise ($2,000) + 100 × Business | 110 users | After Phase 8 |
| **Most Likely:** Mix of all tiers | ~400-500 paying users | 6-9 months |

**Key insight:** Enterprise tier at $2,000/mo (SSO, dedicated, compliance) is the fastest path. 25 enterprise customers = $50k/mo.

### Recommended Pricing Adjustments

- **Add Enterprise tier:** $500-2,000/mo (SSO, dedicated container, SLA, admin dashboard)
- **Raise Starter to $29:** Still well below Lindy ($50), includes cron + skills
- **Add annual discount:** 20% off = lock-in + cash flow
- **Add credit packs:** $10 for 200 extra credits (overage protection)

---

## 6. Competitive Intelligence

### Direct Competitors (Hosted AI Assistant Platforms)

| Platform | Price Range | Strengths | Weaknesses vs Kyra |
|----------|-------------|-----------|-------------------|
| **Lindy AI** | $0-$300/mo | 4,000+ integrations, no-code, voice | No open-source core, no self-host escape hatch |
| **Botpress** | $0-$2,000/mo | Visual builder, developer tools | Complex, expensive at scale, chatbot-focused |
| **Voiceflow** | $0-$150/mo | Agent builder, voice support | CX-focused, not personal assistant |
| **Synthflow** | $29-$1,400/mo | Voice AI, quick deploy | Voice-only focus |
| **ChatGPT Plus** | $20/mo | Brand, ecosystem, GPTs | No multi-channel, no cron, no true memory |
| **Claude Pro** | $20/mo | Best model quality | No channels, no automation, no memory |

### Kyra's Unfair Advantages
1. **OpenClaw Core** — Open-source, community-driven, 60+ skills, constantly improving
2. **True Multi-Channel** — Same AI across WhatsApp, Telegram, Discord, Slack, web
3. **Proactive AI** — Cron jobs, heartbeats, webhooks (once implemented)
4. **Real Memory** — SOUL.md/MEMORY.md system > vector-only approaches
5. **Skills Ecosystem** — Community-built capabilities, not just integrations
6. **Escape Hatch** — Users can always self-host OpenClaw (reduces vendor lock-in anxiety)

### Kyra's Weaknesses vs Competitors
1. **Fewer integrations** than Lindy (4,000+) — need skill marketplace
2. **No visual builder** like Botpress/Voiceflow — less approachable for non-technical
3. **No voice call support** like Synthflow — phone channel missing
4. **Early stage** — less polish, fewer features than mature platforms
5. **Single-person team** — slower iteration vs funded competitors

---

## 7. Recommended Next 3 Actions — THIS WEEK

### Action 1: Ship Skills Toggle (1-2 days)
**What:** Add a "Skills" section in Settings where users can toggle on: Weather, Web Search, Web Fetch, GitHub (with token), and any other skills that work without native dependencies.

**Why:** This single change transforms Kyra from a chatbot into an assistant. Every skill enabled is a reason to keep using Kyra and upgrade.

**How:** 
- Add skills config to user workspace (via R2 `TOOLS.md` or config file)
- Create Settings > Skills page with toggles
- Skills that need API keys show a key input field
- On next chat, OpenClaw picks up the skills automatically

### Action 2: Ship Cron Jobs / Daily Summary (2-3 days)
**What:** Let users set up recurring tasks: "Every morning at 8am, check my calendar and give me a summary" or "Every Friday, remind me to submit my timesheet."

**Why:** This is what makes users say "I can't live without Kyra." Proactive AI = habit formation = retention = upgrades. No competitor in this price range offers this.

**How:**
- Expose OpenClaw's cron system via Kyra API
- Add "Automations" page in dashboard
- Simple form: trigger (schedule), action (message/prompt), channel (where to deliver)
- Cron runs inside the user's container

### Action 3: Ship Discord Channel (2 days)
**What:** Let users connect their own Discord bot (or use a shared Kyra bot) to get AI in their Discord server.

**Why:** OpenClaw's community is on Discord. Discord users are technical, engaged, and willing to pay. Easy to implement since OpenClaw has native Discord support.

**How:**
- Add Discord to channel settings (bot token input)
- Worker routes Discord webhook/gateway events to user's container
- Container's OpenClaw Discord plugin handles the rest

---

## Appendix: OpenClaw Skills Available for Kyra Integration

**Immediately usable (no native deps):**
weather, github, notion, trello, obsidian, web search, web fetch, blogwatcher, gifgrep, healthcheck, model-usage, nano-pdf, openai-image-gen, openai-whisper-api, summarize, spotify-player

**Needs API keys (user provides):**
1password, gemini, himalaya (email), slack, discord

**Needs native/macOS (not feasible for Kyra):**
apple-notes, apple-reminders, bear-notes, bluebubbles, camsnap, imsg, peekaboo, things-mac, sonoscli, blucli

**Could work with Cloudflare Browser Rendering:**
browser control, canvas, coding-agent

---

*This document should be reviewed weekly as phases ship. Update status markers as features move from ❌ → 🔧 → ✅.*
