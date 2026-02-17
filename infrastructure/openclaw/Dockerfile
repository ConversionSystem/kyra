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

# Install Node.js 22 LTS + essentials
RUN apt-get update && apt-get install -y \
    curl xz-utils ca-certificates git procps \
    && curl -fsSL https://nodejs.org/dist/v22.13.1/node-v22.13.1-linux-x64.tar.xz \
       | tar -xJ -C /usr/local --strip-components=1 \
    && rm -rf /var/lib/apt/lists/* \
    && node --version && npm --version

# Install OpenClaw globally from npm
RUN npm install -g openclaw@latest \
    && openclaw --version

# Create workspace structure
RUN mkdir -p /root/.openclaw/workspace/memory

# Copy workspace files (base personality + operating instructions)
COPY workspace/ /root/.openclaw/workspace/

# Copy infrastructure scripts
COPY start.sh /usr/local/bin/start.sh
COPY kyra-bridge.js /usr/local/bin/kyra-bridge.js
RUN chmod +x /usr/local/bin/start.sh

# Bridge port (externally exposed via Fly.io)
EXPOSE 3100

WORKDIR /root
CMD ["/usr/local/bin/start.sh"]
