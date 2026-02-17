#!/bin/bash
# ============================================================================
# Kyra OpenClaw Container — Startup Script
#
# 1. Generates OpenClaw config from environment variables
# 2. Starts the OpenClaw Gateway (real AI engine)
# 3. Starts the Kyra HTTP Bridge (HTTP API → Gateway WS)
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

# ── Generate OpenClaw config ──────────────────────────────────────────────────

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
        provider: 'perplexity'
      }
    }
  }
};

fs.writeFileSync('/root/.openclaw/openclaw.json', JSON.stringify(config, null, 2));
console.log('OpenClaw config written to /root/.openclaw/openclaw.json');
" || { echo "FATAL: Failed to generate config"; exit 1; }

# ── Start OpenClaw Gateway ────────────────────────────────────────────────────

echo ""
echo "=== Starting OpenClaw Gateway on port $GATEWAY_PORT ==="

# Export token for the gateway CLI to pick up
export OPENCLAW_GATEWAY_TOKEN="$GATEWAY_TOKEN"

openclaw gateway \
  --allow-unconfigured \
  --bind loopback \
  --port "$GATEWAY_PORT" \
  --token "$GATEWAY_TOKEN" \
  2>&1 | sed 's/^/[openclaw] /' &

GATEWAY_PID=$!
echo "Gateway PID: $GATEWAY_PID"

# Wait for gateway to accept TCP connections
echo "Waiting for gateway to be ready..."
READY=0
for i in $(seq 1 90); do
  if ! kill -0 $GATEWAY_PID 2>/dev/null; then
    echo "FATAL: Gateway process exited!"
    wait $GATEWAY_PID 2>/dev/null
    exit 1
  fi

  if node -e "
    const net = require('net');
    const s = net.createConnection(${GATEWAY_PORT}, '127.0.0.1');
    s.setTimeout(1000);
    s.on('connect', () => { s.destroy(); process.exit(0); });
    s.on('error', () => process.exit(1));
    s.on('timeout', () => { s.destroy(); process.exit(1); });
  " 2>/dev/null; then
    echo "Gateway ready! (took ${i}s)"
    READY=1
    break
  fi

  sleep 1
done

if [ $READY -ne 1 ]; then
  echo "FATAL: Gateway did not become ready in 90 seconds"
  kill $GATEWAY_PID 2>/dev/null
  exit 1
fi

# ── Start Kyra Bridge ────────────────────────────────────────────────────────

echo ""
echo "=== Starting Kyra Bridge on port $BRIDGE_PORT ==="
echo "=== REAL OpenClaw is online. Skills, memory, tools — all live. ==="
echo ""

# Run bridge in foreground (container's main process)
exec node /usr/local/bin/kyra-bridge.js
