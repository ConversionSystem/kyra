# Kyra OpenClaw Infrastructure

Real OpenClaw container that powers Kyra's AI agents.

## Architecture

```
GHL Customer SMS → Kyra Poller (Vercel cron)
                        ↓
                   HTTP POST /chat
                        ↓
              ┌─────────────────────┐
              │  Fly.io Container   │
              │                     │
              │  Kyra Bridge :3100  │ ← HTTP API (exposed externally)
              │       ↓ WS          │
              │  OpenClaw GW :18789 │ ← Real OpenClaw engine (internal)
              │                     │
              │  • 60+ skills       │
              │  • Persistent memory│
              │  • Sub-agents       │
              │  • Tool system      │
              │  • Multi-model      │
              └─────────────────────┘
                        ↓
              AI Response → GHL API → Customer
```

## What This Is

This is **NOT** a dumb API proxy. This runs the actual OpenClaw platform:
- Real `openclaw gateway` from npm
- Full skill system (web search, browser control, file ops, etc.)
- Persistent memory per session
- Sub-agent spawning for complex tasks
- Multi-model support with automatic routing
- Session isolation per client-contact pair

## Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Builds container with Node.js + OpenClaw + Bridge |
| `fly.toml` | Fly.io deployment config (Frankfurt, 1GB RAM) |
| `start.sh` | Entry point: generates config → starts gateway → starts bridge |
| `kyra-bridge.js` | HTTP API that translates to OpenClaw's WS protocol |
| `workspace/` | Base workspace files (SOUL.md, AGENTS.md, etc.) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes* | Anthropic API key for Claude models |
| `OPENAI_API_KEY` | No | OpenAI API key (fallback) |
| `OPENROUTER_API_KEY` | No | OpenRouter API key (fallback) |
| `OPENCLAW_MODEL` | No | Primary model (default: `anthropic/claude-sonnet-4-20250514`) |
| `OPENCLAW_GATEWAY_TOKEN` | No | Internal auth token (auto-generated if not set) |

*At least one LLM API key is required.

## Deploy

```bash
cd infrastructure/openclaw
fly deploy
```

Set secrets:
```bash
fly secrets set ANTHROPIC_API_KEY=sk-ant-... -a kyra-gateway
```

## Health Check

```bash
curl https://kyra-gateway.fly.dev/health
```

Expected response:
```json
{
  "status": "ok",
  "openClaw": true,
  "realOpenClaw": true,
  "bridge": "kyra-openclaw-bridge",
  "gatewayConnected": true,
  "activeSessions": 0
}
```

## How It Works

1. **Kyra Poller** (Vercel cron, every minute) checks GHL for new messages
2. Poller sends `POST /chat` to this container with:
   - `message`: Customer's text
   - `sessionKey`: Unique per client-contact pair
   - `systemContext`: Business identity, customer info, instructions
3. **Kyra Bridge** receives the HTTP request
4. Bridge forwards to **OpenClaw Gateway** via WebSocket RPC (`chat.send`)
5. OpenClaw processes the message with full agent capabilities
6. Response streams back: Bridge → Poller → GHL API → Customer

## Session Context

On first message per session, the bridge injects system context:
```
=== SYSTEM CONTEXT (follow these instructions) ===
You are an AI assistant for "Business Name".
Industry: Dental
Customer: John Smith (john@example.com)
[Recent conversation history]
[Business-specific instructions]
=== END SYSTEM CONTEXT ===

Customer message:
When are you open tomorrow?
```

Subsequent messages in the same session skip the context injection
(OpenClaw maintains conversation history).
