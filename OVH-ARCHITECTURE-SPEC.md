# Kyra OVH Architecture Spec — Per-Client Isolated Gateways

*Created: 2026-02-20 | Status: APPROVED — Moving to implementation*

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    KYRA PLATFORM                             │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐   ┌───────────────┐  │
│  │   Vercel      │    │  Supabase    │   │   Stripe      │  │
│  │   (Frontend   │    │  (Database   │   │   (Billing)   │  │
│  │    + API)     │◄──►│   + Auth)    │   │               │  │
│  └──────┬───────┘    └──────────────┘   └───────────────┘  │
│         │                                                    │
│         │ HTTPS (per-client auth token)                      │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              OVH VPS (Docker Host)                   │    │
│  │                                                      │    │
│  │  ┌─────────┐  Routes by subdomain                   │    │
│  │  │ Traefik │  {client-id}.gw.kyra.conversionsystem.com   │
│  │  │ (Proxy) │                                         │    │
│  │  └────┬────┘                                         │    │
│  │       │                                              │    │
│  │  ┌────┴───────────────────────────────────────┐     │    │
│  │  │                                             │     │    │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐   │     │    │
│  │  │  │Client A  │ │Client B  │ │Client C  │   │     │    │
│  │  │  │OpenClaw  │ │OpenClaw  │ │OpenClaw  │   │     │    │
│  │  │  │Gateway   │ │Gateway   │ │Gateway   │   │     │    │
│  │  │  │          │ │          │ │          │   │     │    │
│  │  │  │Own SOUL  │ │Own SOUL  │ │Own SOUL  │   │     │    │
│  │  │  │Own Memory│ │Own Memory│ │Own Memory│   │     │    │
│  │  │  │Own Config│ │Own Config│ │Own Config│   │     │    │
│  │  │  │Own Volume│ │Own Volume│ │Own Volume│   │     │    │
│  │  │  └──────────┘ └──────────┘ └──────────┘   │     │    │
│  │  │                                             │     │    │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐   │     │    │
│  │  │  │Client D  │ │Client E  │ │Client F  │   │     │    │
│  │  │  │OpenClaw  │ │OpenClaw  │ │OpenClaw  │   │     │    │
│  │  │  │Gateway   │ │Gateway   │ │Gateway   │   │     │    │
│  │  │  └──────────┘ └──────────┘ └──────────┘   │     │    │
│  │  │          ... up to 50-60 per VPS           │     │    │
│  │  └────────────────────────────────────────────┘     │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## OVH Server Recommendation

### Phase 1: Launch (0-50 clients)

**OVH VPS Essential** or equivalent:

| Spec | Requirement | Why |
|------|------------|-----|
| **vCPUs** | 4 cores | Handles 10-15 concurrent active containers |
| **RAM** | 8GB minimum, 16GB preferred | Each container: 128-256MB idle, 512MB active |
| **Storage** | 80-160GB NVMe SSD | Each container workspace: ~1-2GB |
| **Network** | 500Mbps+ | API traffic is lightweight |
| **OS** | Ubuntu 24.04 LTS | Docker native support |
| **Location** | Frankfurt (fra) or Warsaw | Low latency to Vercel EU + Angel's timezone |

**Estimated cost:** €11-22/mo (~$12-24/mo)

**Capacity:**
- 8GB RAM → 30-40 containers (with resource limits)
- 16GB RAM → 50-70 containers
- Each container limited to 256MB RAM, 0.25 CPU

**Cost per client (16GB VPS, 50 clients):** $24/50 = **$0.48/client/mo**

### Phase 2: Growth (50-200 clients)

Add a second VPS. The provisioner picks the server with most available capacity.

| Clients | Servers | Monthly Cost | Per-Client |
|---------|---------|-------------|------------|
| 1-50 | 1x 16GB VPS | $24 | $0.48 |
| 50-100 | 2x 16GB VPS | $48 | $0.48 |
| 100-200 | 3-4x 16GB VPS | $72-96 | $0.48 |

### Phase 3: Scale (200+ clients)

Move to OVH Bare Metal for better economics:
- OVH Advance-1 (~$70/mo): 64GB RAM, 8 cores → 200+ containers
- Cost per client: **$0.35/client/mo**

Or OVH Kubernetes (Managed K8s) if orchestration complexity is justified.

---

## Software Stack

### On the OVH VPS

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Container runtime** | Docker Engine 27.x | Run isolated OpenClaw containers |
| **Reverse proxy** | Traefik v3 | Route requests to containers, auto-SSL |
| **SSL** | Let's Encrypt (via Traefik + Cloudflare DNS) | Wildcard cert: `*.gw.kyra.conversionsystem.com` |
| **Provisioner API** | Node.js service (port 9090) | Create/start/stop/delete containers via Docker API |
| **Monitoring** | Docker healthchecks + custom watchdog | Auto-restart crashed containers |
| **Firewall** | UFW + fail2ban | Only ports 443 (HTTPS) + 9090 (provisioner, IP-locked) |
| **Backups** | Daily volume snapshots to OVH Object Storage | Disaster recovery |

### Container Image

Same OpenClaw Docker image we already have, with modifications:

```dockerfile
FROM node:22-slim

# OpenClaw gateway
RUN npm install -g openclaw@latest

# Minimal skill set for customer-facing AI (not all 50+)
# Full skills only for "autonomous" tier clients

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s \
  CMD curl -f http://localhost:18789/health || exit 1

# Resource-efficient defaults
ENV NODE_OPTIONS="--max-old-space-size=256"
ENV OPENCLAW_LIGHT_MODE="true"

EXPOSE 18789
CMD ["openclaw", "gateway", "start"]
```

**Image size target:** <100MB (stripped, no Chromium by default)
**Chromium add-on:** Optional per-client flag for browser skill (~+200MB)

---

## Provisioning Flow

### When Agency Creates a New Client

```
1. Agency clicks "Add Client" in Kyra dashboard
2. POST /api/agency/clients → creates client in Supabase
3. Supabase returns client_id (e.g., "cl_a1b2c3d4")
4. API calls OVH Provisioner API:
   POST https://{ovh-ip}:9090/containers/create
   Headers: Authorization: Bearer {PROVISIONER_SECRET}
   Body: {
     clientId: "cl_a1b2c3d4",
     agencyId: "ag_xyz",
     soulMd: "You are Sarah, receptionist for Joe's Plumbing...",
     template: "receptionist",
     resourceTier: "standard",    // standard=256MB, heavy=512MB, autonomous=1GB
     tools: ["ghl", "knowledge-base", "web-search"],  // allowlisted tools only
     chromium: false
   }

5. Provisioner creates Docker container:
   - Name: kyra-cl-a1b2c3d4
   - Image: registry.kyra.io/gateway:latest
   - Volume: /data/clients/cl_a1b2c3d4 → /workspace (persistent)
   - Memory limit: 256MB
   - CPU limit: 0.25 cores
   - Network: kyra-net (internal Docker network)
   - Labels: traefik routing labels (see below)
   - Env: AUTH_TOKEN={generated}, CLIENT_ID=cl_a1b2c3d4

6. Traefik auto-discovers container via Docker labels:
   - Route: cl-a1b2c3d4.gw.kyra.conversionsystem.com → container:18789
   - SSL: wildcard cert (*.gw.kyra.conversionsystem.com)

7. Provisioner writes SOUL.md, USER.md, TOOLS.md to volume
8. Container starts, OpenClaw gateway boots (~5-10 seconds)
9. Health check passes
10. Provisioner returns to Kyra:
    {
      gatewayUrl: "https://cl-a1b2c3d4.gw.kyra.conversionsystem.com",
      authToken: "{generated-token}",
      status: "running"
    }

11. Kyra stores gatewayUrl + authToken in Supabase agencies_clients table
12. Client is LIVE — ready to receive messages
```

**Total provisioning time: ~15-30 seconds** (vs 2-3 minutes on Fly.io)

### Container Docker Labels (Traefik Auto-Discovery)

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.cl-a1b2c3d4.rule=Host(`cl-a1b2c3d4.gw.kyra.conversionsystem.com`)"
  - "traefik.http.routers.cl-a1b2c3d4.tls=true"
  - "traefik.http.routers.cl-a1b2c3d4.tls.certresolver=letsencrypt"
  - "traefik.http.services.cl-a1b2c3d4.loadbalancer.server.port=18789"
```

---

## Communication Security

### Kyra ↔ OVH VPS

| Layer | Protection |
|-------|-----------|
| **Transport** | TLS 1.3 (HTTPS via Traefik + Let's Encrypt) |
| **Authentication** | Per-client Bearer token (generated at provisioning, stored in Supabase) |
| **Authorization** | Kyra sends client_id + token → container validates before processing |
| **Provisioner API** | IP-locked to Vercel's IP ranges + secret key auth |
| **SSH** | Key-only (no password), non-standard port, fail2ban |
| **Firewall** | UFW: only 443 (HTTPS) + provisioner port (IP-locked) |

### Container Isolation

| Mechanism | What It Prevents |
|-----------|-----------------|
| **Separate Docker containers** | Process isolation — container A can't see container B's processes |
| **Separate volumes** | Filesystem isolation — each client's data on its own volume mount |
| **Docker network policies** | Containers can't talk to each other directly |
| **Memory limits (cgroups)** | One container can't OOM the host |
| **CPU limits** | One container can't starve others |
| **Read-only root filesystem** | Container can't modify its own image |
| **No privileged mode** | Container can't access host kernel |
| **Dropped capabilities** | No NET_RAW, SYS_ADMIN, etc. |

### Tool Restrictions Per Client

Enforced at the OpenClaw config level (config.json per container):

```json
{
  "tools": {
    "exec": { "enabled": false },
    "browser": { "enabled": false },
    "file": { "enabled": true, "allowedPaths": ["/workspace/knowledge/*"] },
    "web_fetch": { "enabled": true, "allowedDomains": ["*.ghl.com", "*.google.com"] },
    "web_search": { "enabled": true },
    "cron": { "enabled": false }
  }
}
```

**Default: deny all dangerous tools.** Agency explicitly enables per client based on deployment mode:
- **Read-only:** Knowledge base + web search only
- **Supervised:** + GHL read + calendar booking (all actions logged)
- **Autonomous:** Full access (exec still blocked for customer-facing)

---

## Message Flow (Hybrid Model)

### Path A: Simple Customer Chat (80% of traffic) — NO GATEWAY

```
Customer SMS → GHL → Kyra Poller (Vercel Cron) 
  → Fetch client config from Supabase (SOUL.md, knowledge base, history)
  → Build prompt with system instructions + knowledge + conversation history
  → Call LLM API directly (OpenAI/Anthropic using agency's BYOK key, server-side)
  → Scan response for safety (no leaked prompts, no hallucinated links)
  → Send reply via GHL API
```

**Why:** Simple Q&A doesn't need file access, browser, cron, or any OpenClaw tools. Calling the LLM directly is:
- ⚡ Faster (no gateway cold start)
- 💰 Cheaper (no container compute)
- 🔒 Safer (no tool surface to exploit)

**Knowledge base integration:** Kyra fetches relevant knowledge chunks from Supabase (vector search or keyword match) and injects into the prompt context. No gateway needed.

### Path B: Autonomous Agent Tasks (20% of traffic) — GATEWAY

```
Scheduled task fires (Kyra cron or OpenClaw cron inside container)
  → Gateway processes with full tool access
  → Reads contacts from GHL
  → Sends follow-up messages
  → Updates pipeline stages
  → Writes activity to log
  → Reports results back to Kyra dashboard
```

**When to use the gateway:**
- Scheduled lead follow-ups
- Pipeline automation
- Daily/weekly summary reports
- Multi-step workflows (research → compose → send)
- Any task requiring tools (browser, file ops, web scraping)

### Decision Matrix

| Trigger | Path | Uses Gateway? |
|---------|------|---------------|
| Customer sends SMS/chat | A (Bridge) | ❌ No |
| Customer asks FAQ | A (Bridge) | ❌ No |
| Customer books appointment | A (Bridge + GHL API) | ❌ No |
| Scheduled lead follow-up | B (Gateway) | ✅ Yes |
| Pipeline stage automation | B (Gateway) | ✅ Yes |
| Daily summary report | B (Gateway) | ✅ Yes |
| Web research task | B (Gateway) | ✅ Yes |
| Agency tests AI in dashboard | A or B (configurable) | Optional |

---

## Auto-Stop / Auto-Start (Cost Optimization)

Since 80% of traffic doesn't touch gateways, most containers will be idle most of the time.

### Phase 1 (Launch): Keep Running
- All containers run continuously
- Simple, no wake latency
- Works fine up to ~40-50 containers on 16GB VPS

### Phase 2 (Scale): Smart Lifecycle
- Stop containers after 30 minutes of inactivity
- Wake on demand when Kyra needs to send a gateway task
- Provisioner API: `POST /containers/{id}/wake` → starts container, waits for health check (~5-10s)
- Scheduled tasks: provisioner pre-wakes container 1 minute before cron fires

**Stopped container resource usage:** ~0 CPU, ~5MB RAM (Docker overhead only)
**This means a 16GB VPS could host 200+ client containers with only 20-30 active at any time.**

---

## Scaling Plan

| Clients | Infrastructure | Monthly Cost | Per-Client |
|---------|---------------|-------------|------------|
| 0-50 | 1x OVH VPS 16GB | ~$24 | $0.48 |
| 50-100 | 2x OVH VPS 16GB | ~$48 | $0.48 |
| 100-200 | 1x OVH Bare Metal 64GB | ~$70 | $0.35 |
| 200-500 | 2x Bare Metal | ~$140 | $0.28 |
| 500+ | OVH Managed Kubernetes | ~$200+ | $0.20-0.40 |

**When to add a server:**
- RAM usage >70% sustained
- CPU usage >60% sustained  
- Container count >80% of capacity

**Provisioner handles multi-server:**
- Tracks available capacity per server in Supabase
- Routes new containers to server with most headroom
- Health monitoring per server

---

## Migration Plan (Fly.io → OVH)

### Phase 1: Set Up OVH (Day 1-2)
1. Order OVH VPS (Angel)
2. Initial server setup: Docker, Traefik, firewall, SSH keys (Steve)
3. DNS: `*.gw.kyra.conversionsystem.com` → OVH VPS IP (Cloudflare)
4. Build and deploy provisioner API
5. Test: manually create one container, verify routing

### Phase 2: Build Provisioner (Day 2-4)
1. Node.js provisioner service on VPS (port 9090)
2. Endpoints: create, start, stop, delete, status, logs, wake
3. Docker API integration (unix socket)
4. Auth token generation + storage
5. Traefik label management
6. Volume lifecycle management

### Phase 3: Update Kyra Backend (Day 3-5)
1. Replace `lib/fly/provisioner.ts` with `lib/ovh/provisioner.ts`
2. Update `lib/openclaw/gateway-resolver.ts` to use new URL scheme
3. Update client creation flow to call OVH provisioner
4. Update all API routes that reference gateways
5. Implement bridge-first chat path (LLM direct for simple messages)

### Phase 4: Migrate Existing Gateways (Day 5-6)
1. Export workspace data from Fly.io containers
2. Create equivalent containers on OVH
3. Verify each gateway works
4. Switch DNS / update Supabase records
5. Decommission Fly.io apps

### Phase 5: Testing (Day 6-7)
1. End-to-end SMS test (customer → GHL → Kyra → AI → reply)
2. Multi-client isolation test (verify no cross-client leakage)
3. Load test (10 concurrent conversations)
4. Failover test (kill container, verify auto-restart)
5. Provisioning test (create 10 clients rapidly)

**Total timeline: ~7 days**

---

## Provisioner API Spec

Base URL: `https://{ovh-ip}:9090` (IP-locked + Bearer auth)

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/containers` | Create new client container |
| `GET` | `/containers` | List all containers with status |
| `GET` | `/containers/:id` | Get container details + health |
| `POST` | `/containers/:id/start` | Start stopped container |
| `POST` | `/containers/:id/stop` | Stop running container |
| `POST` | `/containers/:id/wake` | Start + wait for healthy |
| `DELETE` | `/containers/:id` | Remove container + volume |
| `GET` | `/containers/:id/logs` | Tail container logs |
| `PUT` | `/containers/:id/config` | Update SOUL.md, tools, etc. |
| `GET` | `/health` | VPS health (CPU, RAM, disk, container count) |
| `POST` | `/containers/:id/exec` | Run command inside container |

### Create Container Request

```json
POST /containers
Authorization: Bearer {PROVISIONER_SECRET}

{
  "clientId": "cl_a1b2c3d4",
  "agencyId": "ag_xyz",
  "config": {
    "soulMd": "You are Sarah, receptionist for Joe's Plumbing...",
    "userMd": "Business: Joe's Plumbing, Location: Austin TX...",
    "toolsMd": "GHL sub-account token: {token}",
    "knowledgeBase": ["content chunk 1", "content chunk 2"]
  },
  "resources": {
    "memoryMb": 256,
    "cpuShares": 256,
    "storageMb": 2048
  },
  "tools": {
    "ghl": true,
    "webSearch": true,
    "knowledgeBase": true,
    "browser": false,
    "exec": false,
    "fileWrite": false,
    "cron": false
  },
  "autoStop": {
    "enabled": true,
    "idleMinutes": 30
  }
}
```

### Create Container Response

```json
{
  "containerId": "kyra-cl-a1b2c3d4",
  "gatewayUrl": "https://cl-a1b2c3d4.gw.kyra.conversionsystem.com",
  "authToken": "eyJ...",
  "status": "running",
  "createdAt": "2026-02-20T11:00:00Z"
}
```

---

## Files to Build

| File | Purpose | Priority |
|------|---------|----------|
| `infrastructure/ovh/setup.sh` | VPS bootstrap (Docker, Traefik, firewall, provisioner) | 🔴 Day 1 |
| `infrastructure/ovh/docker-compose.yml` | Traefik + provisioner service | 🔴 Day 1 |
| `infrastructure/ovh/traefik/traefik.yml` | Traefik config (entrypoints, certs, Docker provider) | 🔴 Day 1 |
| `infrastructure/ovh/provisioner/` | Node.js provisioner API (Docker socket management) | 🔴 Day 2-3 |
| `infrastructure/ovh/provisioner/server.ts` | Express/Fastify API server | 🔴 Day 2 |
| `infrastructure/ovh/provisioner/docker.ts` | Docker container lifecycle (create/start/stop/delete) | 🔴 Day 2 |
| `infrastructure/ovh/provisioner/auth.ts` | Token generation + validation | 🔴 Day 2 |
| `infrastructure/ovh/provisioner/health.ts` | VPS health monitoring | 🟡 Day 3 |
| `infrastructure/ovh/gateway-image/Dockerfile` | Optimized OpenClaw container image | 🔴 Day 2 |
| `lib/ovh/provisioner.ts` | Kyra ↔ OVH provisioner client (replaces Fly.io) | 🔴 Day 3-4 |
| `lib/ovh/bridge.ts` | Direct LLM calls for simple chat (no gateway) | 🟡 Day 4-5 |
| `lib/openclaw/gateway-resolver.ts` | Updated to resolve OVH URLs | 🔴 Day 3 |

---

## Security Checklist (Pre-Launch)

- [ ] UFW firewall: only 443 + provisioner port (IP-locked)
- [ ] SSH: key-only, non-standard port, fail2ban
- [ ] Docker: no privileged containers, dropped capabilities
- [ ] Docker: read-only root filesystem per container
- [ ] Docker: no inter-container networking
- [ ] Docker: memory + CPU limits enforced
- [ ] Traefik: TLS 1.3 only, strong cipher suites
- [ ] Provisioner API: Bearer auth + IP allowlist
- [ ] Per-client auth tokens: unique, stored encrypted in Supabase
- [ ] BYOK keys: never passed to containers, bridge handles LLM calls
- [ ] Tool allowlisting: enforced in OpenClaw config per container
- [ ] Output scanning: check AI responses before sending to customers
- [ ] Rate limiting: per-client message + token limits
- [ ] Log retention: 30 days, encrypted, per-client deletable
- [ ] Automated security updates: unattended-upgrades enabled on VPS

---

## Angel's Action Items

1. **Order OVH VPS** — 16GB RAM, 4 vCPU, 160GB SSD, Frankfurt or nearest EU datacenter
2. **Share VPS IP + root credentials** (or create a `kyra` user with sudo, share SSH key)
3. **Cloudflare DNS** — Add wildcard A record: `*.gw.kyra.conversionsystem.com` → VPS IP
4. **Confirm domain** — Do we use `gw.kyra.conversionsystem.com` or a new domain?

## Steve's Build Plan

| Day | Deliverable |
|-----|------------|
| Day 1 | VPS setup (Docker, Traefik, firewall, SSH hardening) |
| Day 2 | Gateway Docker image (optimized, <100MB) + Provisioner API core |
| Day 3 | Provisioner API complete (all endpoints) + Traefik auto-discovery |
| Day 4 | Kyra backend updated (OVH provisioner client, gateway resolver) |
| Day 5 | Bridge-first chat path (direct LLM for simple messages) |
| Day 6 | Migration of existing 4 Fly.io gateways to OVH |
| Day 7 | Full testing (E2E, isolation, load, failover) |

**PR ready for review each day. Nothing goes live without your test.**
