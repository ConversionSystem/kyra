# Kyra Container Architecture — Per-User Cloudflare Containers

*Date: 2026-02-13 | Status: Design Document*

---

## Executive Summary

Kyra moves from a single shared OpenClaw gateway (Mac mini) to **per-user Cloudflare Containers**, where each user gets an isolated OpenClaw instance with its own workspace, memory, skills, and execution environment. The existing `kyra-worker` codebase is ~80% of the way there — it already handles per-user sandbox routing, R2 persistence, and gateway lifecycle. The primary work is migrating from the deprecated `@cloudflare/sandbox` API to `@cloudflare/containers`, fixing the chat endpoint mismatch, and implementing workspace bootstrapping from Supabase.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          END USERS                                      │
│                   (Web, Telegram, WhatsApp)                             │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     VERCEL (Next.js)                                     │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Auth & Billing│  │ Memory/Vector│  │ Conversation │                  │
│  │  (Supabase)  │  │  (Pinecone)  │  │   Storage    │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                 │                  │                          │
│         └────────┬────────┘──────────────────┘                         │
│                  │                                                      │
│         ┌────────▼────────┐                                            │
│         │  Chat API Route │  POST /api/chat/openclaw                   │
│         │  (builds context│                                            │
│         │   + routes to   │                                            │
│         │   user container│                                            │
│         └────────┬────────┘                                            │
└──────────────────┼─────────────────────────────────────────────────────┘
                   │ HTTPS (POST /v1/chat/completions)
                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              CLOUDFLARE WORKERS + CONTAINERS                            │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                    Kyra Router Worker                           │     │
│  │                                                                │     │
│  │  1. Validate API secret + userId                               │     │
│  │  2. Route to user's Container via Durable Object               │     │
│  │  3. Container auto-starts on first request (cold start ~3s)    │     │
│  │  4. Container sleeps after idle timeout (10-30 min)            │     │
│  │  5. Proxy HTTP/WS to container's OpenClaw gateway              │     │
│  └────────┬───────────────────────────────────────────────────────┘     │
│           │ getByName(`user-${userId}`)                                 │
│           ▼                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────┐   │
│  │  User Container A   │  │  User Container B   │  │ Container N  │   │
│  │                     │  │                     │  │              │   │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │  │     ...      │   │
│  │  │ OpenClaw GW   │  │  │  │ OpenClaw GW   │  │  │              │   │
│  │  │ Port 18789    │  │  │  │ Port 18789    │  │  │              │   │
│  │  │               │  │  │  │               │  │  │              │   │
│  │  │ • AI chat     │  │  │  │ • AI chat     │  │  │              │   │
│  │  │ • Skills      │  │  │  │ • Skills      │  │  │              │   │
│  │  │ • Sub-agents  │  │  │  │ • Sub-agents  │  │  │              │   │
│  │  │ • Cron jobs   │  │  │  │ • Cron jobs   │  │  │              │   │
│  │  │ • Exec/shell  │  │  │  │ • Exec/shell  │  │  │              │   │
│  │  │ • Web search  │  │  │  │ • Web search  │  │  │              │   │
│  │  │ • Browser     │  │  │  │ • Browser     │  │  │              │   │
│  │  └───────────────┘  │  │  └───────────────┘  │  │              │   │
│  │                     │  │                     │  │              │   │
│  │  /workspace/ ←──────│──│── R2 (user bucket)  │  │              │   │
│  │   SOUL.md           │  │                     │  │              │   │
│  │   USER.md           │  │                     │  │              │   │
│  │   MEMORY.md         │  │                     │  │              │   │
│  │   memory/           │  │                     │  │              │   │
│  │   skills/           │  │                     │  │              │   │
│  └─────────────────────┘  └─────────────────────┘  └──────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Cloudflare R2                                 │    │
│  │  kyra-workspaces/                                               │    │
│  │    user-{userId}/                                               │    │
│  │      workspace/SOUL.md                                          │    │
│  │      workspace/USER.md                                          │    │
│  │      workspace/MEMORY.md                                        │    │
│  │      workspace/memory/                                          │    │
│  │      config.json                                                │    │
│  │      skills/                                                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Current State vs Target

| Aspect | Current (kyra-worker) | Target (@cloudflare/containers) |
|--------|----------------------|-------------------------------|
| Package | `@cloudflare/sandbox` (deprecated) | `@cloudflare/containers` |
| Routing | `getSandbox(env.Sandbox, name, opts)` | `getContainer(env.MY_CONTAINER, name)` or `env.MY_CONTAINER.getByName(name)` |
| Container class | `Sandbox` (exported) | `Container` (extends Durable Object) |
| Sleep behavior | `sleepAfter` option | `sleepAfter` class property |
| Disk persistence | Ephemeral + R2 sync via cron | Ephemeral + R2 sync on lifecycle hooks |
| Chat endpoint | Tries `/api/chat` (404!) | `/v1/chat/completions` (OpenAI-compat) |
| Context bridging | Missing | Injected via system message |

---

## Container Design

### Container Class (Worker Side)

```typescript
// src/container.ts
import { Container, getContainer } from "@cloudflare/containers";

export class KyraContainer extends Container {
  // OpenClaw gateway listens on 18789
  defaultPort = 18789;

  // Sleep after 15 minutes of inactivity (tunable per plan)
  sleepAfter = "15m";

  // Pass secrets + user config as env vars
  get envVars() {
    return {
      ANTHROPIC_API_KEY: this.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: this.env.OPENAI_API_KEY || "",
      OPENCLAW_GATEWAY_TOKEN: this.env.KYRA_GATEWAY_TOKEN,
      // User-specific config passed at start time
      KYRA_USER_ID: this.env.__KYRA_USER_ID || "",
      R2_WORKSPACE_PREFIX: this.env.__R2_WORKSPACE_PREFIX || "",
      // AI Gateway routing
      CF_AI_GATEWAY_ACCOUNT_ID: this.env.CF_AI_GATEWAY_ACCOUNT_ID || "",
      CF_AI_GATEWAY_GATEWAY_ID: this.env.CF_AI_GATEWAY_GATEWAY_ID || "",
      CLOUDFLARE_AI_GATEWAY_API_KEY: this.env.CLOUDFLARE_AI_GATEWAY_API_KEY || "",
    };
  }

  override async onStart() {
    console.log(`[Container] Started for user: ${this.env.__KYRA_USER_ID}`);
    // Workspace files are restored from R2 by the entrypoint script
  }

  override async onStop() {
    console.log(`[Container] Stopping for user: ${this.env.__KYRA_USER_ID}`);
    // Sync workspace back to R2 before sleep
    // The container receives SIGTERM — the entrypoint script handles R2 sync
  }

  override onError(error: unknown) {
    console.error(`[Container] Error for user ${this.env.__KYRA_USER_ID}:`, error);
  }
}
```

### Routing Logic (Worker)

```typescript
// src/index.ts
import { getContainer } from "@cloudflare/containers";
import { KyraContainer } from "./container";

export { KyraContainer };

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // Kyra API: authenticated by shared secret + userId
    if (url.pathname.startsWith("/api/kyra/")) {
      const apiSecret = request.headers.get("Authorization")?.replace("Bearer ", "");
      if (apiSecret !== env.KYRA_API_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }

      const userId = request.headers.get("X-Kyra-User-Id");
      if (!userId) {
        return new Response("Missing X-Kyra-User-Id", { status: 400 });
      }

      // Get or create the user's container (auto-starts on first .fetch())
      const container = getContainer(env.KYRA_CONTAINER, `user-${userId}`);

      // Route: POST /api/kyra/chat → proxy to /v1/chat/completions
      if (url.pathname === "/api/kyra/chat" && request.method === "POST") {
        const body = await request.json();

        const openaiRequest = new Request(
          `http://container/v1/chat/completions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${env.KYRA_GATEWAY_TOKEN}`,
            },
            body: JSON.stringify({
              model: "default",
              messages: body.messages, // [{role, content}]
              stream: body.stream ?? true,
            }),
          }
        );

        return container.fetch(openaiRequest);
      }

      // Route: POST /api/kyra/session/reset → stop container
      if (url.pathname === "/api/kyra/session/reset") {
        await container.stop();
        return Response.json({ ok: true });
      }

      // Route: GET /api/kyra/status → container status
      if (url.pathname === "/api/kyra/status") {
        return Response.json({ status: "ok", userId });
      }

      // Default: proxy raw request to container
      return container.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
```

### Wrangler Configuration

```jsonc
// wrangler.jsonc
{
  "name": "kyra-gateway",
  "main": "src/index.ts",
  "compatibility_date": "2026-02-01",

  "containers": [
    {
      "class_name": "KyraContainer",
      "image": "./Dockerfile",
      "instance_type": "standard-1",  // 1/2 vCPU, 4 GiB RAM, 8 GB disk
      "max_instances": 50
    }
  ],

  "durable_objects": {
    "bindings": [
      {
        "name": "KYRA_CONTAINER",
        "class_name": "KyraContainer"
      }
    ]
  },

  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["KyraContainer"]
    }
  ],

  "r2_buckets": [
    {
      "binding": "WORKSPACE_BUCKET",
      "bucket_name": "kyra-workspaces"
    }
  ],

  "observability": {
    "enabled": true
  }
}
```

Equivalent `wrangler.toml`:

```toml
name = "kyra-gateway"
main = "src/index.ts"
compatibility_date = "2026-02-01"

[[containers]]
class_name = "KyraContainer"
image = "./Dockerfile"
instance_type = "standard-1"
max_instances = 50

[[durable_objects.bindings]]
name = "KYRA_CONTAINER"
class_name = "KyraContainer"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["KyraContainer"]

[[r2_buckets]]
binding = "WORKSPACE_BUCKET"
bucket_name = "kyra-workspaces"

[observability]
enabled = true
```

### Container Dockerfile

```dockerfile
FROM debian:bookworm-slim

# Install Node.js 22 + essential tools
ENV NODE_VERSION=22.13.1
RUN apt-get update && apt-get install -y \
    curl xz-utils ca-certificates rsync git \
    && ARCH="$(dpkg --print-architecture)" \
    && case "${ARCH}" in \
         amd64) NODE_ARCH="x64" ;; \
         arm64) NODE_ARCH="arm64" ;; \
       esac \
    && curl -fsSL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz \
       | tar -xJ -C /usr/local --strip-components=1 \
    && rm -rf /var/lib/apt/lists/*

# Install OpenClaw globally
RUN npm install -g pnpm openclaw@2026.2.3

# Create workspace structure
RUN mkdir -p /root/.openclaw/workspace \
    && mkdir -p /root/.openclaw/skills

# Copy startup/shutdown scripts
COPY scripts/entrypoint.sh /entrypoint.sh
COPY scripts/sync-r2.sh /usr/local/bin/sync-r2.sh
RUN chmod +x /entrypoint.sh /usr/local/bin/sync-r2.sh

# Copy default workspace template (for new users)
COPY workspace-template/ /opt/kyra/workspace-template/

# Copy shared skills
COPY skills/ /root/.openclaw/skills/

# OpenClaw gateway config overlay
COPY config/gateway-config.js /opt/kyra/gateway-config.js

WORKDIR /root/.openclaw

EXPOSE 18789

ENTRYPOINT ["/entrypoint.sh"]
```

### Container Entrypoint Script

```bash
#!/bin/bash
# /entrypoint.sh — Bootstrap workspace from R2, start OpenClaw, sync on shutdown

set -e

WORKSPACE="/root/.openclaw/workspace"
USER_ID="${KYRA_USER_ID:-unknown}"

echo "[entrypoint] Starting for user: $USER_ID"

# ── 1. Restore workspace from R2 ──
# The Worker pre-populates /tmp/r2-workspace/ before start via FUSE mount
# OR the entrypoint downloads from R2 via a sidecar HTTP endpoint
if [ -d "/tmp/r2-workspace" ] && [ "$(ls -A /tmp/r2-workspace 2>/dev/null)" ]; then
  echo "[entrypoint] Restoring workspace from R2 mount..."
  rsync -a /tmp/r2-workspace/ "$WORKSPACE/"
elif [ -n "$R2_RESTORE_URL" ]; then
  echo "[entrypoint] Downloading workspace from R2 via API..."
  curl -sf "$R2_RESTORE_URL" | tar -xz -C "$WORKSPACE/" 2>/dev/null || true
fi

# ── 2. Bootstrap new user workspace if empty ──
if [ ! -f "$WORKSPACE/SOUL.md" ]; then
  echo "[entrypoint] New user — bootstrapping workspace from template..."
  cp -r /opt/kyra/workspace-template/* "$WORKSPACE/"

  # Inject user-specific values
  if [ -n "$KYRA_USER_NAME" ]; then
    sed -i "s/{{USER_NAME}}/$KYRA_USER_NAME/g" "$WORKSPACE/SOUL.md" "$WORKSPACE/USER.md" 2>/dev/null || true
  fi
  if [ -n "$KYRA_USER_TIMEZONE" ]; then
    sed -i "s/{{USER_TIMEZONE}}/$KYRA_USER_TIMEZONE/g" "$WORKSPACE/USER.md" 2>/dev/null || true
  fi
fi

# ── 3. Apply gateway config ──
# Ensure OpenAI-compatible endpoint is enabled
export OPENCLAW_CONFIG_OVERLAY="/opt/kyra/gateway-config.js"

# ── 4. Start OpenClaw Gateway ──
echo "[entrypoint] Starting OpenClaw gateway on port 18789..."

# Trap SIGTERM for graceful shutdown + R2 sync
trap 'echo "[entrypoint] SIGTERM received, syncing to R2..."; /usr/local/bin/sync-r2.sh; exit 0' SIGTERM

# Start gateway in background so we can trap signals
openclaw gateway start --foreground &
GW_PID=$!

# Wait for gateway to be ready
for i in $(seq 1 30); do
  if curl -sf http://localhost:18789/health > /dev/null 2>&1; then
    echo "[entrypoint] Gateway ready after ${i}s"
    break
  fi
  sleep 1
done

# Wait for gateway process (blocks until SIGTERM)
wait $GW_PID
```

### Gateway Config Overlay

```javascript
// /opt/kyra/gateway-config.js
// Applied by OpenClaw at startup to enable required features
module.exports = {
  gateway: {
    port: 18789,
    openAiChatCompletions: { enabled: true },
    // Disable features not needed in container mode
    webUi: { enabled: false },
    // Enable skills
    skills: { enabled: true },
  },
};
```

---

## API Contracts

### Vercel → Kyra Router Worker

#### `POST /api/kyra/chat`

Send a chat message to the user's container.

**Request:**
```
POST /api/kyra/chat
Authorization: Bearer {KYRA_API_SECRET}
X-Kyra-User-Id: {userId}
Content-Type: application/json

{
  "messages": [
    { "role": "system", "content": "[USER CONTEXT]\nUser: Steve (timezone: Europe/Bratislava)\n..." },
    { "role": "user", "content": "What's on my calendar today?" }
  ],
  "stream": true
}
```

**Response (streaming):**
```
HTTP/1.1 200 OK
Content-Type: text/event-stream

data: {"choices":[{"delta":{"content":"Let me check"}}]}

data: {"choices":[{"delta":{"content":" your calendar..."}}]}

data: [DONE]
```

**Response (non-streaming):**
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Here's what's on your calendar today..."
    }
  }]
}
```

#### `POST /api/kyra/session/reset`

Force-stop a user's container (e.g., on logout or error recovery).

```
POST /api/kyra/session/reset
Authorization: Bearer {KYRA_API_SECRET}
X-Kyra-User-Id: {userId}

→ 200 { "ok": true }
```

#### `GET /api/kyra/status`

Check if user's container is running.

```
GET /api/kyra/status
Authorization: Bearer {KYRA_API_SECRET}
X-Kyra-User-Id: {userId}

→ 200 { "status": "running" | "sleeping" | "starting", "userId": "..." }
```

#### `POST /api/kyra/workspace/init`

Bootstrap workspace for a new user (called once on first chat).

```
POST /api/kyra/workspace/init
Authorization: Bearer {KYRA_API_SECRET}
Content-Type: application/json

{
  "userId": "abc123",
  "userName": "Steve",
  "timezone": "Europe/Bratislava",
  "plan": "starter",
  "memories": [
    { "type": "preference", "content": "Prefers dark mode" }
  ]
}

→ 200 { "ok": true, "workspaceCreated": true }
```

### Kyra Router Worker → Container (Internal)

The Worker proxies to the container's OpenClaw gateway using the OpenAI-compatible endpoint:

```
POST http://container:18789/v1/chat/completions
Authorization: Bearer {KYRA_GATEWAY_TOKEN}
Content-Type: application/json

{
  "model": "default",
  "messages": [...],
  "stream": true
}
```

This is entirely internal — the container port is only accessible from the Worker/Durable Object, not from the public internet.

---

## Container Lifecycle

```
                    First message
User sends message ──────────────► Worker receives request
                                         │
                                         ▼
                                  getContainer(env, userId)
                                         │
                              ┌──────────┼──────────┐
                              │                     │
                        Container          Container NOT
                        RUNNING            running (cold)
                              │                     │
                              │               Cold start
                              │              (~2-3 seconds)
                              │                     │
                              │              Entrypoint runs:
                              │              1. Restore R2
                              │              2. Bootstrap if new
                              │              3. Start OpenClaw GW
                              │              4. Health check loop
                              │                     │
                              └──────────┬──────────┘
                                         │
                                         ▼
                                  container.fetch(req)
                                  → /v1/chat/completions
                                         │
                                         ▼
                                  OpenClaw processes
                                  (AI + tools + skills)
                                         │
                                         ▼
                                  Response streamed back
                                  to Worker → to Vercel → to user
                                         │
                                         ▼
                              Timer starts: sleepAfter = 15m
                                         │
                            ┌─────────────┼─────────────┐
                            │                           │
                     New request              15 min idle
                     (timer resets)                      │
                                                  SIGTERM sent
                                                        │
                                                  Entrypoint traps:
                                                  → sync workspace to R2
                                                  → graceful shutdown
                                                        │
                                                  Container sleeps
                                                  (disk wiped)
```

### Sleep/Wake Strategy

| Plan | `sleepAfter` | Rationale |
|------|-------------|-----------|
| Free | 5m | Minimize cost, acceptable cold start penalty |
| Starter | 15m | Balance cost vs responsiveness |
| Business | 30m | More responsive, fewer cold starts |
| Max | 60m | Near-always-on for power users |

---

## Workspace Persistence (R2)

Since Cloudflare Container disk is **ephemeral** (wiped on sleep), all user data must be persisted to R2.

### R2 Bucket Structure

```
kyra-workspaces/
  user-{userId}/
    workspace.tar.gz          # Compressed workspace snapshot
    meta.json                 # Last sync timestamp, container version
```

### Sync Strategy

1. **On container start**: Entrypoint downloads `workspace.tar.gz` from R2, extracts to `/root/.openclaw/workspace/`
2. **Periodic (every 5 min)**: Cron inside container syncs changed files to R2 via Worker API
3. **On SIGTERM (sleep/shutdown)**: Full sync to R2 before exit (15-min grace period)
4. **On workspace init**: Worker writes initial template files directly to R2

### R2 Sync Implementation

The container can't access R2 directly (no S3 API credentials inside container). Two approaches:

**Option A: Worker-mediated sync (Recommended)**
- Container calls `http://worker-internal/r2/sync` endpoint
- Worker has R2 binding, handles upload/download
- Pro: No credentials in container, simple
- Con: Adds latency to sync

**Option B: R2 FUSE mount (If available)**
- Cloudflare's R2 FUSE mount example mounts R2 as filesystem
- Pro: Transparent file access
- Con: May not be production-ready, adds complexity

**We recommend Option A** for initial launch, with Option B as a future optimization.

### Sync Endpoint (Worker Side)

```typescript
// Worker internal endpoint for container ↔ R2 sync
// POST /internal/r2/upload — container sends tar.gz
// GET  /internal/r2/download — container fetches workspace
// These are only accessible from the container (not public)

app.post("/internal/r2/upload", async (c) => {
  const userId = c.req.header("X-Kyra-User-Id");
  const body = await c.req.arrayBuffer();
  await c.env.WORKSPACE_BUCKET.put(`user-${userId}/workspace.tar.gz`, body);
  return c.json({ ok: true });
});

app.get("/internal/r2/download", async (c) => {
  const userId = c.req.header("X-Kyra-User-Id");
  const obj = await c.env.WORKSPACE_BUCKET.get(`user-${userId}/workspace.tar.gz`);
  if (!obj) return new Response(null, { status: 404 });
  return new Response(obj.body);
});
```

---

## Changes to Kyra Frontend (Vercel)

### Updated Chat Route

The existing `app/api/chat/openclaw/route.ts` needs minimal changes:

```typescript
// Key change: Send to Kyra Worker instead of direct WebSocket gateway
// Replace sessionsSend() with HTTP call to Worker

async function sendToWorker(userId: string, messages: any[], stream: boolean) {
  const workerUrl = process.env.KYRA_WORKER_URL; // e.g., https://kyra-gateway.account.workers.dev
  const apiSecret = process.env.KYRA_API_SECRET;

  const response = await fetch(`${workerUrl}/api/kyra/chat`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiSecret}`,
      "X-Kyra-User-Id": userId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages, stream }),
  });

  return response; // SSE stream or JSON
}
```

### Context Building (Unchanged)

The existing context building in `route.ts` stays exactly the same — memories from Pinecone, reminders from Supabase, calendar from Google. The only change is packaging it as an OpenAI-format `system` message instead of prepending to the user message:

```typescript
const messages = [
  {
    role: "system",
    content: getOpenClawSystemPrompt({
      userName, timezone, memories, reminders, calendarEvents, enabledSkills
    })
  },
  { role: "user", content: message }
];

// Add conversation history from Supabase
const history = await getConversationHistory(conversationId);
messages.splice(1, 0, ...history); // Insert between system and latest user msg

const response = await sendToWorker(userId, messages, true);
```

### Feature Flag Update

```typescript
export const features = {
  /** Route through per-user Cloudflare Containers (production) */
  useWorker: process.env.KYRA_USE_WORKER === "true",

  /** Legacy: Route through single OpenClaw gateway on Mac mini */
  useOpenClaw: process.env.KYRA_USE_OPENCLAW === "true",

  /** Fallback: Direct Claude API (no tools/skills) */
  // Default when neither flag is set
};
```

---

## Skills, Cron Jobs, and Browser Rendering

### Skills

Skills are OpenClaw plugins that provide tools (web search, file ops, etc.). In the container model:

- **Shared skills** are baked into the Docker image (`COPY skills/ /root/.openclaw/skills/`)
- **User-installed skills** are stored in R2 and restored on container start
- **Skill marketplace**: User enables skills in Kyra web UI → stored in Supabase `user_skills` → skill files synced to R2 workspace → available in container on next start

### Cron Jobs

OpenClaw supports cron jobs (scheduled tasks). In containers:

- **Container must be running** for cron to fire. Sleeping containers miss cron triggers.
- **Solution**: Use Cloudflare Workers Cron Triggers to wake containers:

```typescript
// Worker scheduled handler
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    // Query Supabase for users with active cron jobs
    const usersWithCron = await fetchUsersWithCronJobs();

    for (const userId of usersWithCron) {
      // Wake their container (auto-starts if sleeping)
      const container = getContainer(env.KYRA_CONTAINER, `user-${userId}`);
      await container.fetch(new Request("http://container/api/cron/trigger"));
    }
  }
};
```

### Browser Rendering

OpenClaw uses a headless browser for web scraping, screenshots, etc.

**Inside Cloudflare Containers:** Full Linux environment → can run headless Chromium natively.

```dockerfile
# Add to Dockerfile for browser support
RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

**Alternative: Cloudflare Browser Rendering API**
- Available from Workers, callable from inside containers via HTTP
- Pro: No need to install Chromium in container (smaller image, less RAM)
- Con: Additional API call latency, separate billing

**Recommendation**: Use Cloudflare Browser Rendering API for light use (screenshots, simple scraping). Install Chromium in container only if heavy browser automation is needed (increases image size by ~400MB and requires `standard-2` instance type for RAM).

### Exec/Sandbox

OpenClaw's exec tool runs shell commands. **This works natively in containers** — full Linux environment with shell, filesystem, network access. No changes needed.

---

## What CAN'T Run in Cloudflare Containers

| Limitation | Impact | Workaround |
|-----------|--------|------------|
| **Ephemeral disk** — wiped on sleep | Workspace data lost | R2 sync (implemented above) |
| **No inbound TCP/UDP** — only HTTP through Worker | Can't expose raw WebSocket to public | Worker proxies WebSocket (already handled) |
| **No GPU** | Can't run local AI models | Use API-based models (Anthropic, OpenAI, CF AI) |
| **Max 4 vCPU, 12 GiB RAM** | Can't run very large workloads | Sufficient for OpenClaw + Node.js |
| **Cold start 2-3s** | Delay on first message after sleep | Acceptable; mitigated by longer `sleepAfter` on paid plans |
| **No persistent volumes** (no EBS equivalent) | Can't mount a "disk" across restarts | R2 sync pattern |
| **Image must be linux/amd64** | No ARM containers | Not an issue (Node.js runs fine on amd64) |
| **Beta limitations** | Max 100 vCPU across all instances | ~200 concurrent `standard-1` containers |
| **No cron inside sleeping containers** | Scheduled tasks miss | Worker Cron Triggers wake containers |
| **15-min SIGTERM grace period** | Must sync within 15 min | Periodic sync reduces data loss window |

---

## Cost Projections

### Per-Container Costs (standard-1: 1/2 vCPU, 4 GiB RAM, 8 GB disk)

**Pricing (from CF docs):**
- Memory: $0.0000025 / GiB-second (after 25 GiB-hours free)
- CPU: $0.000020 / vCPU-second (after 375 vCPU-minutes free)
- Disk: $0.00000007 / GB-second (after 200 GB-hours free)
- Egress: $0.025/GB (NA/EU), first 1 TB free

**Per-container per hour (while running):**
- Memory: 4 GiB × 3600s × $0.0000025 = **$0.036/hr**
- CPU: 0.5 vCPU × 3600s × $0.000020 = **$0.036/hr**
- Disk: 8 GB × 3600s × $0.00000007 = **$0.002/hr**
- **Total: ~$0.074/hr per running container**

### Usage Modeling

Assumptions:
- Average user sends 20 messages/day, spread across 3 sessions
- Each session lasts ~10 min of active use + `sleepAfter` idle time
- Free users: 5 min sleep timeout → ~45 min/day running
- Paid users: 15 min sleep timeout → ~75 min/day running
- Peak concurrent: ~10% of active users

| Scale | Monthly Active Users | Avg Daily Active | Peak Concurrent Containers | Monthly Container Hours | Monthly Cost (Containers) | + Workers/DO/R2 | Total Infra |
|-------|---------------------|-----------------|---------------------------|------------------------|--------------------------|-----------------|-------------|
| **Seed** | 100 | 30 | 5 | 450 hrs | ~$33 | ~$12 | **~$50/mo** |
| **Growth** | 500 | 150 | 20 | 2,250 hrs | ~$167 | ~$40 | **~$210/mo** |
| **Scale** | 1,000 | 400 | 50 | 6,000 hrs | ~$444 | ~$80 | **~$530/mo** |
| **Large** | 5,000 | 1,500 | 150 | 22,500 hrs | ~$1,665 | ~$200 | **~$1,900/mo** |

**Note**: Free tier includes 25 GiB-hours memory + 375 vCPU-minutes + 200 GB-hours disk per month. At seed stage, free tier covers a significant portion.

### Cost Per User Per Month

| Plan | Avg Running Time/Day | Monthly Cost/User | Revenue/User | Margin |
|------|---------------------|-------------------|--------------|--------|
| Free | 30 min | ~$0.55 | $0 | -$0.55 |
| Starter ($9/mo) | 60 min | ~$1.10 | $9 | +$7.90 |
| Business ($29/mo) | 90 min | ~$1.65 | $29 | +$27.35 |
| Max ($79/mo) | 120 min | ~$2.20 | $79 | +$76.80 |

**The math works extremely well.** Even free users cost less than $1/month in infrastructure. The dominant cost will be AI API calls (Anthropic/OpenAI), not container infrastructure.

### Comparison: Containers vs Alternatives

| Platform | Per-User Cost (1hr/day) | Auto-sleep | Cold Start | Ops Burden |
|----------|------------------------|-----------|-----------|------------|
| **CF Containers** | ~$2.20/mo | ✅ Native | 2-3s | Minimal |
| AWS ECS Fargate | ~$4.50/mo | ❌ DIY | 10-30s | Medium |
| Fly.io Machines | ~$3.00/mo | ✅ Native | 1-3s | Low |
| Railway | ~$5.00/mo | ❌ No | N/A | Low |
| Self-hosted K8s | ~$2.00/mo | ❌ DIY | Varies | **High** |

---

## Migration Plan

### Phase 0: Preparation (1 day)
- [ ] Ensure Docker is installed and running
- [ ] Set up Cloudflare Workers Paid plan (if not already)
- [ ] Create R2 bucket `kyra-workspaces`
- [ ] Create workspace template files (SOUL.md, USER.md, AGENTS.md)

### Phase 1: Migrate kyra-worker to @cloudflare/containers (2-3 days)
- [ ] Replace `@cloudflare/sandbox` imports with `@cloudflare/containers`
- [ ] Replace `getSandbox()` calls with `getContainer()` / `env.KYRA_CONTAINER.getByName()`
- [ ] Create `KyraContainer` class extending `Container`
- [ ] Update `wrangler.toml` with `containers` config
- [ ] Update Dockerfile (base from `debian:bookworm-slim` instead of `cloudflare/sandbox`)
- [ ] Implement R2 sync in entrypoint script
- [ ] Fix chat endpoint: route to `/v1/chat/completions` instead of `/api/chat`
- [ ] Enable `openAiChatCompletions` in gateway config overlay
- [ ] Deploy and test with a single user

### Phase 2: Connect Kyra Frontend (1-2 days)
- [ ] Add `KYRA_WORKER_URL` and `KYRA_API_SECRET` to Vercel env vars
- [ ] Update `worker/route.ts` to build OpenAI-format messages with context
- [ ] Add streaming SSE passthrough from Worker response
- [ ] Set `KYRA_USE_WORKER=true`
- [ ] Test end-to-end: Web UI → Vercel → Worker → Container → OpenClaw → Response

### Phase 3: Workspace Bootstrap (1-2 days)
- [ ] Implement `POST /api/kyra/workspace/init` in Worker
- [ ] Create workspace template with SOUL.md, USER.md, AGENTS.md
- [ ] Add first-chat detection in Vercel route (check R2 for existing workspace)
- [ ] Sync user preferences from Supabase to workspace template
- [ ] Test new user onboarding flow

### Phase 4: Channel Unification (2-3 days)
- [ ] Route Telegram webhooks through Worker → user container
- [ ] Route WhatsApp webhooks through Worker → user container
- [ ] Remove duplicate channel implementations from Kyra frontend
- [ ] Each channel maps to a user → routes to their container

### Phase 5: Production Hardening (2-3 days)
- [ ] Implement health checks and container restart logic
- [ ] Add error handling for container cold start failures
- [ ] Implement graceful degradation (fall back to direct Claude if container fails)
- [ ] Set up monitoring/alerting via Cloudflare dashboard
- [ ] Load test with simulated concurrent users
- [ ] Configure per-plan `sleepAfter` values

### Phase 6: Advanced Features (ongoing)
- [ ] WebSocket passthrough for real-time streaming
- [ ] Skill marketplace → R2 skill deployment
- [ ] Container-level cron trigger via Worker scheduled events
- [ ] Browser rendering integration (CF Browser API or in-container Chromium)
- [ ] User workspace file browser in Kyra UI

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CF Containers beta instability | Medium | High | Keep direct Claude fallback, monitor closely |
| Cold start latency (2-3s) frustrates users | Low | Medium | Longer `sleepAfter` for paid users, loading indicator in UI |
| R2 sync data loss on crash (no SIGTERM) | Low | Medium | Periodic sync every 5 min, not just on shutdown |
| Hitting 100 vCPU beta limit | Low (at scale) | High | Request limit increase early, use `standard-1` (0.5 vCPU) |
| OpenClaw version drift | Medium | Low | Pin version in Dockerfile, test before updating |
| Container image too large (slow deploy) | Low | Low | Multi-stage build, minimize layers |

---

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Container instance type | `standard-1` (1/2 vCPU, 4 GiB) | OpenClaw + Node.js needs ~1-2 GiB RAM; 4 GiB gives headroom for skills/sub-agents |
| Chat protocol | OpenAI-compatible `/v1/chat/completions` | Already supported by OpenClaw, standard format, SSE streaming built-in |
| Persistence | R2 with tar.gz snapshots | Simpler than FUSE mount, reliable, no credentials in container |
| Browser rendering | CF Browser Rendering API (initially) | Avoids bloating container image; can add Chromium later if needed |
| Sleep timeout | Plan-based (5m-60m) | Balances cost vs UX per pricing tier |
| Base image | `debian:bookworm-slim` (not `cloudflare/sandbox`) | Containers API doesn't require sandbox base image; smaller, more control |

---

## Appendix: Key Cloudflare Containers Facts

- **Backed by Durable Objects** — each container instance has a corresponding DO for routing and state
- **linux/amd64 only** — images must target this architecture
- **Ephemeral disk** — wiped on sleep, no persistent volumes (yet)
- **Cold start: 2-3s** typical, depends on image size and entrypoint
- **Max instances**: Configurable per deployment, beta limit 100 vCPU total
- **Networking**: HTTP only through Worker proxy, no direct TCP/UDP from outside
- **Internet access**: Enabled by default, can be disabled per container
- **SIGTERM grace**: 15 minutes before SIGKILL
- **No swap memory** — OOM = restart
- **Location**: Auto-selected near requesting user, pinned for lifetime of instance
