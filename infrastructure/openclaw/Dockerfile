# ============================================================================
# Kyra OpenClaw Container
#
# Real OpenClaw Gateway + HTTP Bridge for agency AI.
# This is NOT a dumb API proxy. This runs the actual OpenClaw platform:
#   - 60+ skills
#   - Persistent memory per session
#   - Sub-agent spawning
#   - Tool system (web search, browser, file ops)
#   - Multi-model support
#   - Session isolation per client
#
# Architecture:
#   [Kyra Poller] → HTTP POST → [Kyra Bridge :3100] → WS → [OpenClaw Gateway :18789]
#                                                              ↓
#                                                    Real AI agent response
#                                                    (skills, memory, tools)
# ============================================================================

FROM debian:bookworm-slim

# Install Node.js 22 LTS + essentials + Chromium for browser automation
RUN apt-get update && apt-get install -y \
    curl xz-utils ca-certificates git procps coreutils \
    chromium \
    fonts-liberation fonts-noto-color-emoji \
    && curl -fsSL https://nodejs.org/dist/v22.13.1/node-v22.13.1-linux-x64.tar.xz \
       | tar -xJ -C /usr/local --strip-components=1 \
    && rm -rf /var/lib/apt/lists/* \
    && node --version && npm --version && chromium --version

# Install OpenClaw globally from npm
RUN npm install -g openclaw@latest \
    && openclaw --version

# Install himalaya (email CLI) — v1.x binary from GitHub releases
RUN curl -fsSL https://github.com/pimalaya/himalaya/releases/download/v1.0.0/himalaya-x86_64-unknown-linux-musl.tar.gz \
    | tar -xz -C /usr/local/bin \
    && chmod +x /usr/local/bin/himalaya \
    && himalaya --version

# Install mcporter (MCP client — for google-workspace-mcp skill)
RUN npm install -g @mcporter/cli 2>/dev/null || \
    npm install -g mcporter 2>/dev/null || \
    echo "[INFO] mcporter not available on npm — skipping (google-workspace-mcp will use curl fallback)"

# Copy workspace defaults to staging area (volume may override at runtime)
RUN mkdir -p /root/.openclaw-defaults/workspace/memory
COPY workspace/ /root/.openclaw-defaults/workspace/

# Copy infrastructure scripts
COPY start.sh /usr/local/bin/start.sh
COPY kyra-bridge.js /usr/local/bin/kyra-bridge.js
RUN chmod +x /usr/local/bin/start.sh

# Bridge port (externally exposed via Fly.io)
EXPOSE 3100

WORKDIR /root
CMD ["/usr/local/bin/start.sh"]
