# Kyra Architecture — Complete Deep Analysis

*Date: 2026-02-12 | Author: Steve (CEO)*

---

## Executive Summary

Your previous analysis was **90% correct** — but now having read every line of code across all three repos, I can refine the picture and give you the exact surgical fixes needed.

**The good news:** You've actually built **three** working integration paths, not just one. The bad news: none of them are turned on in production.

---

## The Three Repos

### 1. `openclaw` — The Engine (upstream, open source)
- **What it is:** Full-featured AI assistant framework with WebSocket JSON-RPC gateway
- **Key insight:** It does NOT have a REST `/api/chat` endpoint. Communication is via:
  - **WebSocket** — Primary protocol. `chat.send` RPC method, receives `chat` events (delta/final/error)
  - **OpenAI-compatible** — `POST /v1/chat/completions` (when `openAiChatCompletions` is enabled)
  - **HTTP** — Hooks, Slack, tools, control UI — but no native REST chat endpoint
- **Port:** 18789 (configurable)
- **Auth:** Token-based via gateway config or WebSocket `connect` handshake

### 2. `kyra-worker` — The Multi-Tenant Layer (Cloudflare Worker + Containers)
- **What it is:** Hono-based Worker that spins up isolated Cloudflare Containers per user
- **Each container runs:** Full OpenClaw Gateway (node.js process via `start-openclaw.sh`)
- **Routes:**
  - `POST /api/kyra/chat` — Kyra API (auth: Bearer token + X-Kyra-User-Id)
  - `POST /api/kyra/session/reset` — Kill user's gateway
  - `GET /api/kyra/user/:userId/status` — Check sandbox status
  - `/*` — Catch-all proxy to default sandbox (legacy single-tenant)
- **Storage:** R2 bucket for persistence, s3fs-mounted into containers
- **Container image:** Debian + Node 22 + OpenClaw 2026.2.3 globally installed
- **Sandbox naming:** `user-{userId}` per Kyra user, `default` for legacy

### 3. `kyra` — The Frontend (Next.js on Cloudflare Pages/Workers)
- **What it is:** Full-featured web app with auth, billing, conversations, memories
- **Hosted at:** kyra.conversionsystem.com (Cloudflare Workers via OpenNext)
- **Current mode:** Direct Claude API calls (`KYRA_USE_WORKER=false`, `KYRA_USE_OPENCLAW=false`)
- **Database:** Supabase (users, conversations, messages, reminders)
- **Memory:** Pinecone (vector search)
- **Billing:** Stripe (free/starter/business/max plans with credit system)
- **Channels:** Telegram, WhatsApp (direct Claude, not through OpenClaw)

---

## The Three Integration Paths (All Built, None Active)

### Path A: Direct Claude (`features.useWorker=false, useOpenClaw=false`) ← **ACTIVE**
```
User → Kyra Frontend → Claude API directly
                     → Pinecone (memories)
                     → Brave (web search)
                     → Google (calendar)
```
**Pros:** Simple, works, low latency
**Cons:** No tools, no skills, no sub-agents, no persistent memory files, no OpenClaw power

### Path B: OpenClaw Gateway (`features.useOpenClaw=true`) ← **BUILT, OFF**
```
User → Kyra Frontend → gateway-ws.ts → OpenClaw Gateway (Mac mini tunnel)
                     → Pinecone (memories injected into message)
                     → Google (calendar injected into message)
```
**How it works:**
- `lib/openclaw/gateway-ws.ts` — Custom raw WebSocket client (no `ws` library, hand-rolled frames!)
- Connects to `OPENCLAW_GATEWAY_URL`, authenticates via `connect` handshake
- Uses `chat.send` RPC, listens for `chat` delta/final events
- `lib/openclaw/sessions.ts` — Per-user session management with context injection
- Falls back to direct Claude if gateway is unreachable

**What's good:** This is actually a well-built WebSocket client that speaks OpenClaw's native protocol correctly.

**What's broken:**
- Requires a running OpenClaw Gateway somewhere (Mac mini, VPS)
- Single-tenant — all users share the same gateway instance
- Context injection is one-way (Supabase → OpenClaw, but not back)

### Path C: Kyra Worker (`features.useWorker=true`) ← **BUILT, OFF**
```
User → Kyra Frontend → worker/route.ts → kyra-worker → user's Container → OpenClaw Gateway
                     ↑ still does Supabase auth, billing, message saving
```
**How it works:**
- `worker/route.ts` sends `POST /api/kyra/chat` to kyra-worker
- kyra-worker creates/reuses per-user Cloudflare Container sandbox
- Container runs full OpenClaw Gateway
- Response streamed back (SSE or JSON, both handled)

**What's broken (the real list):**

1. **kyra-worker proxies to wrong endpoint**
   - `kyra-api.ts` line 72: sends to `http://localhost:${GATEWAY_PORT}/api/chat`
   - OpenClaw has NO `/api/chat` endpoint. The gateway is WebSocket + `/v1/chat/completions`
   - This means the worker route would get a 404 from the container

2. **No context bridging** (confirmed)
   - worker/route.ts sends raw `{ message }` — no memories, calendar, user profile
   - The OpenClaw container has its own MEMORY.md but it's empty for new users

3. **No workspace initialization**
   - New user = empty container with generic OpenClaw setup
   - No SOUL.md, no user name, no personality customization

4. **Streaming format mismatch**
   - kyra-worker returns whatever OpenClaw returns (which would be... nothing, since the endpoint doesn't exist)
   - worker/route.ts tries to parse both SSE and JSON responses — good defensive coding, but untested

5. **kyra-worker may not be deployed**
   - No `KYRA_WORKER_URL` or `KYRA_API_SECRET` in Kyra's wrangler.toml
   - Cloudflare Containers require specific account setup

---

## The Fix — Precise Surgical Plan

### Phase 1: Make the Worker Route Actually Work (2-3 days)

**Fix 1: kyra-worker chat endpoint → use OpenAI-compatible API**

The cleanest fix: Instead of inventing a REST endpoint, use OpenClaw's built-in `/v1/chat/completions` endpoint.

```typescript
// kyra-api.ts — FIXED chat handler
const gatewayUrl = `http://localhost:${GATEWAY_PORT}/v1/chat/completions`;
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${c.env.KYRA_GATEWAY_TOKEN}`,
};

const gatewayRequest = new Request(gatewayUrl, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    model: 'default',  // uses whatever model the container is configured with
    messages: [
      { role: 'system', content: systemContext },  // injected context
      { role: 'user', content: body.message },
    ],
    stream: true,
  }),
});
```

**Why this works:**
- OpenClaw already has `openAiChatCompletions` support
- SSE streaming works out of the box
- Standard format that worker/route.ts can parse
- No need to implement WebSocket in the worker

**Prerequisite:** Ensure `openAiChatCompletions` is enabled in container config. Add to `start-openclaw.sh` config patch:
```javascript
config.gateway.openAiChatCompletions = { enabled: true };
```

**Fix 2: Context bridging in worker route**

Modify `worker/route.ts` to gather context BEFORE sending to worker:
```typescript
// Gather context (same as direct route)
const [memories, reminders, calendarEvents] = await Promise.all([...]);

// Build system context
const systemContext = buildContextForWorker({ user, memories, reminders, calendarEvents });

// Send to worker WITH context
const workerResponse = await fetch(`${WORKER_URL}/api/kyra/chat`, {
  body: JSON.stringify({ 
    message, 
    systemContext,  // NEW: pass context along
  }),
});
```

And in `kyra-api.ts`, include the system context in the OpenAI messages array.

**Fix 3: Enable OpenAI chat completions in container startup**

Add to `start-openclaw.sh` config patch:
```javascript
config.gateway = config.gateway || {};
config.gateway.openAiChatCompletions = { enabled: true };
```

**Fix 4: Deploy kyra-worker + set secrets**

```bash
cd kyra-worker
wrangler deploy
wrangler secret put KYRA_API_SECRET
wrangler secret put KYRA_GATEWAY_TOKEN
wrangler secret put ANTHROPIC_API_KEY  # or CF AI Gateway keys

# On kyra frontend:
cd ../kyra
wrangler secret put KYRA_WORKER_URL     # https://kyra-gateway.<account>.workers.dev
wrangler secret put KYRA_API_SECRET
```

Then flip: `KYRA_USE_WORKER=true` in kyra's wrangler.toml.

### Phase 2: User Workspace Bootstrap (1-2 days)

Add a new kyra-api endpoint: `POST /api/kyra/init`

When a new user first chats:
1. Create their R2 workspace files:
   - `workspace/SOUL.md` — "You are Kyra, a personal AI assistant for {userName}"
   - `workspace/USER.md` — User's name, timezone, preferences
   - `workspace/MEMORY.md` — Empty, ready to grow
   - `workspace/AGENTS.md` — Kyra-specific instructions
2. Mount into container before first gateway start
3. OpenClaw picks these up automatically

### Phase 3: Real-Time Streaming via WebSocket (3-5 days)

Currently: worker/route.ts → HTTP → kyra-worker → HTTP → container → response
This adds latency. For real-time:

1. Frontend connects directly to kyra-worker via WebSocket
2. kyra-worker proxies WebSocket to container's OpenClaw Gateway
3. **This already works!** The catch-all handler in `kyra-worker/src/index.ts` handles WebSocket upgrades and proxies them to the container
4. Just need a frontend WebSocket client (similar to `gateway-ws.ts` but connecting through the worker)

### Phase 4: Unify Channels (3-5 days)

Route Telegram/WhatsApp webhooks through kyra-worker:
1. Kyra receives webhook → looks up user by Telegram ID → gets their sandbox ID
2. Forwards webhook to user's container (which already has OpenClaw Telegram support)
3. Delete duplicate channel implementations from Kyra frontend

---

## Critical Path Dependencies

```
Phase 1 Step 1 (Fix kyra-api chat endpoint) ─┐
Phase 1 Step 3 (Enable OpenAI compat)        ├─→ Phase 1 Step 4 (Deploy) → Phase 1 Step 5 (Flip flag)
Phase 1 Step 2 (Context bridging)            ─┘
                                                        │
                                                        ▼
                                               Phase 2 (Workspace init)
                                                        │
                                                        ▼
                                          Phase 3 (WebSocket streaming)
                                                        │
                                                        ▼
                                            Phase 4 (Unify channels)
```

---

## What You Got Right

1. ✅ Ferrari engine / lawn mower analogy — exactly right
2. ✅ kyra-worker is 90% done — per-user sandboxes, R2 persistence, gateway lifecycle
3. ✅ Context bridging is missing — confirmed
4. ✅ No workspace initialization — confirmed
5. ✅ Channel routing is split — confirmed
6. ✅ Worker isn't deployed (likely) — no secrets configured

## What the Previous Analysis Missed

1. **The REST endpoint doesn't exist** — OpenClaw uses WebSocket, not `/api/chat`. This is THE #1 blocker. The kyra-worker chat handler would return 404.
2. **OpenAI-compatible endpoint IS available** — `/v1/chat/completions` is the clean bridge. Just needs enabling.
3. **Path B (gateway-ws.ts) is actually well-built** — The hand-rolled WebSocket client correctly implements OpenClaw's protocol. This could be repurposed.
4. **WebSocket proxy already works** — The catch-all in kyra-worker handles WS upgrades. Real-time streaming is closer than you think.
5. **The container uses OpenClaw 2026.2.3** — Pinned version. Needs to be kept in sync with upstream.

---

## Recommendation

**Start with Phase 1.** It's the highest-leverage work — connecting what's already built. The OpenAI-compatible endpoint approach is the cleanest because:
- Standard format
- SSE streaming works natively  
- No WebSocket complexity in the HTTP chain
- The worker already handles SSE passthrough

Want me to start coding Phase 1?
