# Kyra Router — Integration Guide

## What It Does

Kyra Router sits in front of every AI API call made by an OpenClaw container.
Instead of every query going straight to GPT-4o-mini, the router classifies it first:

| Query type | Example | Tier | Cost |
|---|---|---|---|
| Greeting / business FAQ | "What are your hours?" | 0 — Template | $0 |
| Short factual question | "What is Python?" | 1 — Local/Free | $0 |
| Standard query | "Write a follow-up email" | 2 — Haiku/GPT-4o-mini | ~$0.0003 |
| Complex reasoning | "Design a lead scoring strategy" | 3 — Sonnet/GPT-4o | ~$0.003 |

**Result: 60-90% of queries never reach a paid API.**

---

## How to Add to a Kyra Container

The router runs as a **sidecar** — a second process inside the same container.
It listens on port 8104. OpenClaw sends all AI calls to `localhost:8104/v1`
instead of `api.openai.com`.

### 1. Update the Provisioner (OVH VPS)

In `provisioner/server.js`, add kyra-router to the container start command:

```javascript
// BEFORE
const containerCmd = `docker run -d \
  --name ${containerId} \
  -e OPENAI_API_KEY=${openaiKey} \
  ...`

// AFTER — add kyra-router as sidecar
const containerCmd = `docker run -d \
  --name ${containerId} \
  -e OPENAI_API_KEY=${openaiKey} \
  -e OPENROUTER_API_KEY=${openrouterKey} \
  -e KYRA_MAX_TIER=2 \
  -e KYRA_DAILY_CAP=2.00 \
  ...`
```

### 2. Update the OpenClaw Config Template

In `lib/provisioner/template.ts`, change the model endpoint:

```typescript
// BEFORE
const config = {
  agents: {
    defaults: {
      model: 'openai/gpt-4o-mini',
      // uses api.openai.com by default
    }
  }
}

// AFTER — point at local router
const config = {
  agents: {
    defaults: {
      model: 'openai/gpt-4o-mini',
      baseUrl: 'http://localhost:8104/v1',  // ← kyra-router
      apiKey: 'kyra-internal',              // ← any non-empty string
    }
  }
}
```

### 3. Deploy kyra-router inside the container

Add to the container startup script:

```bash
# Install and start kyra-router in background
pip install /app/kyra-router -q
uvicorn klaw.api:app --host 0.0.0.0 --port 8104 &
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `KYRA_MAX_TIER` | `2` | Max model tier (0=template only, 2=cheap, 3=mid, 4=premium) |
| `KYRA_DAILY_CAP` | `2.00` | Max spend per day per container ($) |
| `KYRA_MONTHLY_BUDGET` | `30.00` | Max spend per month per container ($) |
| `OPENAI_API_KEY` | — | For GPT-4o-mini (tier 2) |
| `ANTHROPIC_API_KEY` | — | For Claude Haiku (tier 2) |
| `OPENROUTER_API_KEY` | — | For free fallback models (tier 1) |

---

## Cost Impact

At current usage (44 free accounts + 1 scale):

| Scenario | Without Router | With Router | Savings |
|---|---|---|---|
| 44 free (50 cr each) | ~$6.60/mo | ~$0.26/mo | ~$6.34 |
| 1 Scale (2,500 cr) | ~$7.50/mo | ~$0.30/mo | ~$7.20 |

At 1,000 users (Daryl automotive vertical):

| Plan | Without Router | With Router | Monthly savings |
|---|---|---|---|
| 1,000 × free | ~$150/mo | ~$6/mo | **$144/mo** |
| 100 × Lite | ~$150/mo | ~$6/mo | **$144/mo** |
| 50 × Pro | ~$225/mo | ~$9/mo | **$216/mo** |

---

## Health Check

```bash
curl http://localhost:8104/health
# {
#   "status": "ok",
#   "daily_cost": 0.0012,
#   "daily_queries": 47,
#   "total_savings": 0.84,
#   "tier_distribution": {"template": 72.3, "cheap": 24.1, "mid": 3.6}
# }
```

---

## Attribution

Based on k-routing by Kit Malthaner (MIT License).
Forked, renamed, and extended for Kyra platform by Conversion System.
