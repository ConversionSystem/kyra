# Kyra Worker Deployment Guide

Step-by-step guide for deploying the kyra-worker (Cloudflare Worker + Sandbox) that powers Kyra's AI backend.

**Local repo:** `/Users/steve/.openclaw/workspace/Business/projects/kyra-worker/`
**GitHub:** `ConversionSystem/kyra-worker` (private)

---

## 1. Prerequisites

- **Cloudflare account** with [Workers Paid plan](https://www.cloudflare.com/plans/developer-platform/) ($5/mo) — required for Sandbox containers
- **Wrangler CLI** (bundled as devDependency, use via `npx wrangler`)
- **Node.js** v18+
- **Anthropic API key** from [console.anthropic.com](https://console.anthropic.com/)

```bash
cd /Users/steve/.openclaw/workspace/Business/projects/kyra-worker
npm install
npx wrangler login   # authenticate with Cloudflare
```

Verify login:
```bash
npx wrangler whoami
```

---

## 2. R2 Bucket Creation

The worker uses an R2 bucket (`kyra-user-data`) for persistent user data storage.

```bash
npx wrangler r2 bucket create kyra-user-data
```

This matches the binding in `wrangler.jsonc`:
```jsonc
"r2_buckets": [{
  "binding": "KYRA_BUCKET",
  "bucket_name": "kyra-user-data"
}]
```

### Optional: R2 API Tokens (for backup/restore)

If you want R2 persistence across container restarts:

1. Go to **R2 → Overview → Manage R2 API Tokens** in Cloudflare Dashboard
2. Create token with **Object Read & Write** on `kyra-user-data`
3. Set the secrets:

```bash
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put CF_ACCOUNT_ID
```

---

## 3. Secrets Configuration

### Required Secrets

```bash
# Shared secret between Kyra (Vercel) and this worker
npx wrangler secret put KYRA_API_SECRET

# AI provider key
npx wrangler secret put ANTHROPIC_API_KEY

# Gateway access token (generate one)
export TOKEN=$(openssl rand -hex 32)
echo "Save this token: $TOKEN"
echo "$TOKEN" | npx wrangler secret put MOLTBOT_GATEWAY_TOKEN
```

### Optional Secrets

```bash
# Cloudflare AI Gateway (alternative to direct Anthropic key)
npx wrangler secret put CLOUDFLARE_AI_GATEWAY_API_KEY
npx wrangler secret put CF_AI_GATEWAY_ACCOUNT_ID
npx wrangler secret put CF_AI_GATEWAY_GATEWAY_ID

# Cloudflare Access (for admin UI)
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
npx wrangler secret put CF_ACCESS_AUD

# Container sleep (default: never)
npx wrangler secret put SANDBOX_SLEEP_AFTER   # e.g. 10m, 1h

# Chat channels
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put DISCORD_BOT_TOKEN

# Browser automation
npx wrangler secret put CDP_SECRET
npx wrangler secret put WORKER_URL
```

### Verify secrets are set:
```bash
npx wrangler secret list
```

---

## 4. Verify wrangler.jsonc

Key settings to confirm in `wrangler.jsonc`:

| Setting | Expected Value |
|---------|---------------|
| `name` | `kyra-gateway` |
| `main` | `src/index.ts` |
| `compatibility_flags` | `["nodejs_compat"]` |
| `r2_buckets[0].bucket_name` | `kyra-user-data` |
| `containers[0].class_name` | `Sandbox` |
| `containers[0].instance_type` | `standard-1` |

Ensure Cloudflare Containers are enabled: [Containers Dashboard](https://dash.cloudflare.com/?to=/:account/workers/containers)

---

## 5. Deploy

```bash
npm run deploy
```

This runs `vite build` then `wrangler deploy`. First deploy may take a few minutes (container image upload).

Expected output:
```
Published kyra-gateway (x.xx sec)
  https://kyra-gateway.<your-subdomain>.workers.dev
```

Save this URL — it's your worker endpoint.

---

## 6. Test the /health Endpoint

The Kyra health endpoint requires authentication (KYRA_API_SECRET as Bearer token + X-Kyra-User-Id header):

```bash
# Replace with your actual values
WORKER_URL="https://kyra-gateway.<your-subdomain>.workers.dev"
KYRA_SECRET="your-kyra-api-secret"

curl -s "$WORKER_URL/api/kyra/health" \
  -H "Authorization: Bearer $KYRA_SECRET" \
  -H "X-Kyra-User-Id: test-user" | jq .
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-11T07:16:00.000Z"
}
```

Also test the public sandbox health check (no auth):
```bash
curl -s "$WORKER_URL/sandbox-health" | jq .
```

> **Note:** First request may take 1–2 minutes (cold start).

---

## 7. Connect Kyra (Vercel) to the Worker

In the Kyra Vercel project, set these environment variables:

| Variable | Value |
|----------|-------|
| `KYRA_WORKER_URL` | `https://kyra-gateway.<your-subdomain>.workers.dev` |
| `KYRA_API_SECRET` | Same value you set in step 3 |

The Kyra frontend/backend calls the worker at:
- `POST /api/kyra/chat` — send messages
- `POST /api/kyra/send` — alias for chat
- `GET /api/kyra/health` — health checks
- `POST /api/kyra/ping` — connectivity test

All requests must include:
- `Authorization: Bearer <KYRA_API_SECRET>`
- `X-Kyra-User-Id: <user-id>` header

After setting env vars, redeploy Kyra on Vercel.

---

## Quick Reference

```bash
# Deploy
npm run deploy

# Check secrets
npx wrangler secret list

# View logs
npx wrangler tail

# Local dev
npm run start    # wrangler dev (WebSocket may not work locally)
```

## Cost Estimate

Running 24/7 with `standard-1` container: ~$34.50/mo
With sleep after 10m idle + ~4h/day active use: ~$10-11/mo

---

*Last updated: 2026-02-11*
