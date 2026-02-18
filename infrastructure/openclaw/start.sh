#!/bin/bash
# ============================================================================
# Kyra OpenClaw Container — Startup Script
#
# 1. Generates OpenClaw config from environment variables
# 2. Starts the Kyra HTTP Bridge IMMEDIATELY (so Fly health checks pass)
# 3. Starts the OpenClaw Gateway (real AI engine) in background
#
# The bridge handles gateway reconnection internally — it doesn't need
# the gateway to be ready before accepting HTTP traffic. Health checks
# return 503 until the gateway connects, but the port is open.
#
# Environment variables:
#   ANTHROPIC_API_KEY    — Anthropic API key (primary)
#   OPENAI_API_KEY       — OpenAI API key (fallback)
#   OPENROUTER_API_KEY   — OpenRouter API key (fallback)
#   OPENCLAW_MODEL       — Primary model (default: anthropic/claude-sonnet-4-20250514)
#   OPENCLAW_GATEWAY_TOKEN — Internal auth token (auto-generated if not set)
#   BRIDGE_PORT          — HTTP bridge port (default: 3100)
#   GATEWAY_PORT         — OpenClaw gateway port (default: 18789)
# ============================================================================

set -e

echo "============================================"
echo "  Kyra OpenClaw Container"
echo "  Powered by REAL OpenClaw"
echo "============================================"
echo ""

# Versions
OPENCLAW_VER=$(openclaw --version 2>/dev/null || echo 'unknown')
NODE_VER=$(node --version)
echo "OpenClaw: $OPENCLAW_VER"
echo "Node.js:  $NODE_VER"
echo ""

# Config
export GATEWAY_PORT="${GATEWAY_PORT:-18789}"
export BRIDGE_PORT="${BRIDGE_PORT:-3100}"
export GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-kyra-gw-$(node -e "process.stdout.write(require('crypto').randomBytes(16).toString('hex'))")}"
MODEL="${OPENCLAW_MODEL:-anthropic/claude-sonnet-4-20250514}"

echo "Gateway port: $GATEWAY_PORT"
echo "Bridge port:  $BRIDGE_PORT"
echo "Model:        $MODEL"
echo "ANTHROPIC_API_KEY:  $([ -n "$ANTHROPIC_API_KEY" ] && echo 'set' || echo 'NOT SET')"
echo "OPENAI_API_KEY:     $([ -n "$OPENAI_API_KEY" ] && echo 'set' || echo 'not set')"
echo "OPENROUTER_API_KEY: $([ -n "$OPENROUTER_API_KEY" ] && echo 'set' || echo 'not set')"
echo ""

# ── Initialize persistent volume ─────────────────────────────────────────────
# If workspace doesn't exist in the volume, copy defaults
if [ ! -d /root/.openclaw/workspace ]; then
  echo "First boot: initializing workspace from defaults..."
  cp -r /root/.openclaw-defaults/workspace /root/.openclaw/workspace
  mkdir -p /root/.openclaw/workspace/memory
else
  echo "Existing workspace found in volume — preserving."
  # Sync any NEW default files that don't exist yet (but don't overwrite)
  cp -rn /root/.openclaw-defaults/workspace/* /root/.openclaw/workspace/ 2>/dev/null || true
fi

# ── Generate or preserve OpenClaw config ─────────────────────────────────────
# If config already exists (from previous config.patch / channel connect), keep it.
# Only generate fresh config on first boot.

if [ -f /root/.openclaw/openclaw.json ]; then
  echo "Existing config found — preserving (channels, patches, etc. survive deploys)"
  echo "Config: $(cat /root/.openclaw/openclaw.json | head -5)..."
else
  echo "No config found — generating default config..."
  node -e "
const fs = require('fs');

const config = {
  meta: { lastTouchedVersion: 'kyra-container' },
  agents: {
    defaults: {
      model: {
        primary: process.env.OPENCLAW_MODEL || 'anthropic/claude-sonnet-4-20250514',
        fallbacks: [
          'openrouter/anthropic/claude-sonnet-4',
          'openai/gpt-4o'
        ]
      },
      workspace: '/root/.openclaw/workspace',
      memorySearch: {
        sources: ['memory', 'sessions'],
        experimental: { sessionMemory: true }
      },
      compaction: {
        mode: 'safeguard',
        memoryFlush: { enabled: true }
      },
      // Image analysis model (uses OpenAI vision by default)
      ...(process.env.OPENAI_API_KEY ? {
        imageModel: {
          primary: 'openai/gpt-4o',
          fallbacks: ['anthropic/claude-sonnet-4-20250514']
        }
      } : {}),
      thinkingDefault: 'off',
      maxConcurrent: 8,
      subagents: {
        maxConcurrent: 8,
        model: {
          primary: 'anthropic/claude-3-5-haiku-20241022',
          fallbacks: ['openai/gpt-4o-mini']
        }
      }
    }
  },
  gateway: {
    port: parseInt(process.env.GATEWAY_PORT || '18789'),
    mode: 'local',
    bind: 'loopback',
    auth: {
      mode: 'token',
      token: process.env.GATEWAY_TOKEN || 'kyra-internal'
    },
    // Allow the Gateway Dashboard UI to connect from these origins
    controlUi: {
      allowedOrigins: [
        'https://gateway.conversionsystem.com',
        'https://kyra-gateway.fly.dev',
        'https://kyra.conversionsystem.com',
        'http://localhost:3000',
        'http://localhost:3100',
      ],
    },
    // Unblock tools for HTTP /tools/invoke API so Kyra dashboard can use them
    // Default deny: sessions_spawn, sessions_send, gateway, whatsapp_login
    // We allow file ops, exec, sessions — Kyra IS the trusted interface
    tools: {
      allow: ['read', 'write', 'edit', 'exec', 'process', 'sessions_send', 'sessions_spawn', 'image'],
      deny: ['gateway', 'whatsapp_login'], // Keep gateway control locked
    }
  },
  channels: {},
  plugins: { entries: {} },
  hooks: {
    internal: {
      enabled: true,
      entries: {
        'boot-md': { enabled: true },
        'session-memory': { enabled: true }
      }
    }
  },
  commands: { native: 'auto', nativeSkills: 'auto' },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: process.env.PERPLEXITY_API_KEY ? 'perplexity' : 'brave',
        ...(process.env.PERPLEXITY_API_KEY ? {
          perplexity: { apiKey: process.env.PERPLEXITY_API_KEY }
        } : {}),
      },
      fetch: { enabled: true },
    },
  }
};

fs.writeFileSync('/root/.openclaw/openclaw.json', JSON.stringify(config, null, 2));
console.log('OpenClaw config written to /root/.openclaw/openclaw.json');
" || { echo "FATAL: Failed to generate config"; exit 1; }
fi

# ── Start Kyra Bridge FIRST (for health checks) ─────────────────────────────
#
# The bridge starts its HTTP server on port 3100 immediately. Fly's health
# check will see the port open. The bridge returns 503 on /health until
# the gateway connects, but Fly only needs the TCP connection to pass
# the initial grace period. Once the gateway is up, /health returns 200.

echo ""
echo "=== Starting Kyra Bridge on port $BRIDGE_PORT ==="

node /usr/local/bin/kyra-bridge.js 2>&1 | stdbuf -oL sed 's/^/[bridge] /' &
BRIDGE_PID=$!
echo "Bridge PID: $BRIDGE_PID"

# Give bridge 2 seconds to bind the port
sleep 2

# ── Start OpenClaw Gateway ────────────────────────────────────────────────────

echo ""
echo "=== Starting OpenClaw Gateway on port $GATEWAY_PORT ==="

export OPENCLAW_GATEWAY_TOKEN="$GATEWAY_TOKEN"

openclaw gateway \
  --allow-unconfigured \
  --bind loopback \
  --port "$GATEWAY_PORT" \
  --token "$GATEWAY_TOKEN" \
  2>&1 | stdbuf -oL sed 's/^/[openclaw] /' &

GATEWAY_PID=$!
echo "Gateway PID: $GATEWAY_PID"
echo ""
echo "=== REAL OpenClaw starting. Bridge ready for health checks. ==="
echo "=== Gateway will connect to bridge automatically when ready. ==="
echo ""

# ── Wait for either process to exit ──────────────────────────────────────────

# If either process dies, the container should restart
wait -n $BRIDGE_PID $GATEWAY_PID
EXIT_CODE=$?

echo "A process exited with code $EXIT_CODE — shutting down container"

# Clean up the other process
kill $BRIDGE_PID 2>/dev/null || true
kill $GATEWAY_PID 2>/dev/null || true

exit $EXIT_CODE
