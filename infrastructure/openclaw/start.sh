#!/bin/bash
# ============================================================================
# Kyra OpenClaw Container — Startup Script (v2 — with watchdog)
#
# 1. Runs openclaw doctor --repair for config self-healing
# 2. Generates OpenClaw config from environment variables (first boot only)
# 3. Starts the Kyra HTTP Bridge IMMEDIATELY (so Fly health checks pass)
# 4. Starts the OpenClaw Gateway (real AI engine) in background
# 5. Watchdog monitors gateway port binding — restarts if it hangs
#
# v2 changes (Feb 19 2026):
#   - Added gateway watchdog: if port 18789 doesn't open within 120s,
#     kill the gateway and restart it. Repeats up to 3 times.
#   - Added continuous liveness check: every 60s, verify gateway is
#     still listening. If dead, restart it.
#   - Run openclaw doctor --repair before gateway start for config healing.
#   - This fixes the "gateway hangs silently" bug where 4/5 gateways
#     showed as running but never bound to their port.
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
echo "  Kyra OpenClaw Container v2"
echo "  Powered by REAL OpenClaw"
echo "  With gateway watchdog"
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
if [ ! -d /root/.openclaw/workspace ]; then
  echo "First boot: initializing workspace from defaults..."
  cp -r /root/.openclaw-defaults/workspace /root/.openclaw/workspace
  mkdir -p /root/.openclaw/workspace/memory
else
  echo "Existing workspace found in volume — preserving user customizations."
  cp -rn /root/.openclaw-defaults/workspace/* /root/.openclaw/workspace/ 2>/dev/null || true
  mkdir -p /root/.openclaw/workspace/memory
fi

if [ "$RESET_WORKSPACE" = "1" ]; then
  echo "RESET_WORKSPACE=1 — overwriting workspace with defaults..."
  cp -r /root/.openclaw-defaults/workspace/* /root/.openclaw/workspace/
fi

# ── Generate or preserve OpenClaw config ─────────────────────────────────────
if [ -f /root/.openclaw/openclaw.json ]; then
  echo "Existing config found — preserving (channels, patches, etc. survive deploys)"
  node -e "
    const fs = require('fs');
    const cfg = JSON.parse(fs.readFileSync('/root/.openclaw/openclaw.json', 'utf-8'));
    const m = cfg.agents?.defaults?.model;
    if (m && m.primary && m.primary.includes('sonnet')) {
      console.log('Updating model from ' + m.primary + ' to haiku (beta cost control)');
      m.primary = 'openrouter/anthropic/claude-haiku-4.5';
      m.fallbacks = ['openrouter/anthropic/claude-sonnet-4', 'openai/gpt-4o-mini'];
      fs.writeFileSync('/root/.openclaw/openclaw.json', JSON.stringify(cfg, null, 2));
    } else {
      console.log('Model already set to: ' + (m?.primary || 'unknown'));
    }
  " || true
else
  echo "No config found — generating default config..."
  node -e "
const fs = require('fs');

const config = {
  meta: { lastTouchedVersion: 'kyra-container' },
  agents: {
    defaults: {
      model: {
        primary: process.env.OPENCLAW_MODEL || 'openrouter/anthropic/claude-haiku-4.5',
        fallbacks: [
          'openrouter/anthropic/claude-sonnet-4',
          'openai/gpt-4o-mini'
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
    controlUi: {
      allowedOrigins: [
        'https://gateway.conversionsystem.com',
        'https://kyra-gateway.fly.dev',
        'https://kyra.conversionsystem.com',
        'http://localhost:3000',
        'http://localhost:3100',
      ],
    },
    tools: {
      allow: ['read', 'write', 'edit', 'exec', 'process', 'sessions_send', 'sessions_spawn', 'image'],
      deny: ['gateway', 'whatsapp_login'],
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

# ── Run openclaw doctor (config self-healing) ────────────────────────────────
# This detects and fixes broken configs, normalizes settings, and ensures
# a clean state before starting the gateway. Critical for volume-persisted
# configs that may have been corrupted or left in a bad state.
echo ""
echo "=== Running openclaw doctor --repair ==="
openclaw doctor --repair --yes 2>&1 || echo "[WARN] openclaw doctor failed (non-fatal, continuing)"
echo ""

# ── Port check helper ────────────────────────────────────────────────────────
check_port() {
  # Returns 0 if port is listening, 1 if not
  # Uses /proc/net/tcp to avoid needing ss/netstat
  local port_hex=$(printf '%X' "$1")
  grep -qi ":${port_hex} " /proc/net/tcp 2>/dev/null
}

# ── Start Kyra Bridge FIRST (for health checks) ─────────────────────────────
echo "=== Starting Kyra Bridge on port $BRIDGE_PORT ==="

node /usr/local/bin/kyra-bridge.js 2>&1 | stdbuf -oL sed 's/^/[bridge] /' &
BRIDGE_PID=$!
echo "Bridge PID: $BRIDGE_PID"

# Give bridge 2 seconds to bind the port
sleep 2

# ── Gateway start function ───────────────────────────────────────────────────
GATEWAY_PID=""
start_gateway() {
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
}

# ── Gateway watchdog ─────────────────────────────────────────────────────────
# Monitors if the gateway actually binds to its port within STARTUP_TIMEOUT.
# If it hangs (process alive but port not open), kills and restarts.
# After successful start, checks liveness every LIVENESS_INTERVAL seconds.

STARTUP_TIMEOUT=120    # seconds to wait for gateway to bind port
LIVENESS_INTERVAL=60   # seconds between liveness checks
MAX_RESTARTS=3         # max consecutive restart attempts
RESTART_COUNT=0

gateway_watchdog() {
  while true; do
    # ── Phase 1: Wait for gateway to start ──────────────────────────────
    echo "[watchdog] Waiting up to ${STARTUP_TIMEOUT}s for gateway on port $GATEWAY_PORT..."
    WAITED=0
    while [ $WAITED -lt $STARTUP_TIMEOUT ]; do
      if check_port "$GATEWAY_PORT"; then
        echo "[watchdog] ✅ Gateway is listening on port $GATEWAY_PORT (took ${WAITED}s)"
        RESTART_COUNT=0  # Reset on successful start
        break
      fi

      # Check if gateway process is still alive
      if ! kill -0 "$GATEWAY_PID" 2>/dev/null; then
        echo "[watchdog] ⚠️  Gateway process $GATEWAY_PID died during startup!"
        break
      fi

      sleep 5
      WAITED=$((WAITED + 5))
    done

    # If port still not open, gateway is hung or crashed
    if ! check_port "$GATEWAY_PORT"; then
      RESTART_COUNT=$((RESTART_COUNT + 1))
      echo "[watchdog] ❌ Gateway failed to bind to port $GATEWAY_PORT within ${STARTUP_TIMEOUT}s (attempt $RESTART_COUNT/$MAX_RESTARTS)"

      if [ $RESTART_COUNT -ge $MAX_RESTARTS ]; then
        echo "[watchdog] 💀 Max restarts ($MAX_RESTARTS) exceeded. Giving up — container will exit."
        kill $BRIDGE_PID 2>/dev/null || true
        kill $GATEWAY_PID 2>/dev/null || true
        exit 1
      fi

      # Kill the hung gateway
      echo "[watchdog] Killing hung gateway process $GATEWAY_PID..."
      kill -9 "$GATEWAY_PID" 2>/dev/null || true
      # Kill any orphaned openclaw processes
      pkill -9 -f "openclaw gateway" 2>/dev/null || true
      pkill -9 -f "openclaw-gateway" 2>/dev/null || true
      sleep 3

      # Run doctor again before retry
      echo "[watchdog] Running openclaw doctor --repair before retry..."
      openclaw doctor --repair --yes 2>&1 || true

      # Restart gateway
      start_gateway
      continue
    fi

    # ── Phase 2: Continuous liveness checks ─────────────────────────────
    echo "[watchdog] Entering liveness monitoring (every ${LIVENESS_INTERVAL}s)..."
    while true; do
      sleep $LIVENESS_INTERVAL

      # Check bridge is still alive
      if ! kill -0 "$BRIDGE_PID" 2>/dev/null; then
        echo "[watchdog] 💀 Bridge process died! Container exiting."
        kill $GATEWAY_PID 2>/dev/null || true
        exit 1
      fi

      # Check gateway process is still alive
      if ! kill -0 "$GATEWAY_PID" 2>/dev/null; then
        echo "[watchdog] ⚠️  Gateway process died! Restarting..."
        RESTART_COUNT=$((RESTART_COUNT + 1))
        if [ $RESTART_COUNT -ge $MAX_RESTARTS ]; then
          echo "[watchdog] 💀 Max restarts exceeded. Container exiting."
          kill $BRIDGE_PID 2>/dev/null || true
          exit 1
        fi
        start_gateway
        break  # Go back to startup monitoring
      fi

      # Check gateway port is still open
      if ! check_port "$GATEWAY_PORT"; then
        echo "[watchdog] ⚠️  Gateway port $GATEWAY_PORT no longer listening! Restarting..."
        RESTART_COUNT=$((RESTART_COUNT + 1))
        if [ $RESTART_COUNT -ge $MAX_RESTARTS ]; then
          echo "[watchdog] 💀 Max restarts exceeded. Container exiting."
          kill $BRIDGE_PID 2>/dev/null || true
          exit 1
        fi
        kill -9 "$GATEWAY_PID" 2>/dev/null || true
        pkill -9 -f "openclaw-gateway" 2>/dev/null || true
        sleep 3
        start_gateway
        break  # Go back to startup monitoring
      fi

      # Reset restart count on successful liveness check
      if [ $RESTART_COUNT -gt 0 ]; then
        RESTART_COUNT=0
        echo "[watchdog] Restart count reset (gateway healthy)"
      fi
    done
  done
}

# ── Launch gateway + watchdog ─────────────────────────────────────────────────
start_gateway

echo ""
echo "=== REAL OpenClaw starting. Bridge ready for health checks. ==="
echo "=== Watchdog monitoring gateway port binding. ==="
echo ""

# Run watchdog in foreground (replaces the old wait -n)
# Watchdog will exit with code 1 if max restarts exceeded or bridge dies
gateway_watchdog
