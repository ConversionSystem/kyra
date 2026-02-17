#!/bin/bash
# ============================================================================
# Deploy Kyra OpenClaw Container to Fly.io
#
# Usage:
#   ./deploy.sh                    # Deploy latest
#   ./deploy.sh --set-secrets      # Set API key secrets first
# ============================================================================

set -e
cd "$(dirname "$0")"

echo "=== Deploying Kyra OpenClaw Container ==="
echo "App: kyra-gateway"
echo "Region: fra (Frankfurt)"
echo ""

# Check if flyctl is installed
if ! command -v flyctl &>/dev/null; then
  echo "ERROR: flyctl not installed. Run: brew install flyctl"
  exit 1
fi

# Set secrets if requested
if [ "$1" = "--set-secrets" ]; then
  echo "Setting Fly.io secrets..."
  echo "You'll be prompted for API keys."
  echo ""

  read -p "ANTHROPIC_API_KEY: " ANTHROPIC_KEY
  if [ -n "$ANTHROPIC_KEY" ]; then
    flyctl secrets set ANTHROPIC_API_KEY="$ANTHROPIC_KEY" -a kyra-gateway
  fi

  read -p "OPENAI_API_KEY (optional, press Enter to skip): " OPENAI_KEY
  if [ -n "$OPENAI_KEY" ]; then
    flyctl secrets set OPENAI_API_KEY="$OPENAI_KEY" -a kyra-gateway
  fi

  read -p "OPENROUTER_API_KEY (optional, press Enter to skip): " OPENROUTER_KEY
  if [ -n "$OPENROUTER_KEY" ]; then
    flyctl secrets set OPENROUTER_API_KEY="$OPENROUTER_KEY" -a kyra-gateway
  fi

  echo ""
  echo "Secrets set. Deploying..."
  echo ""
fi

# Deploy
flyctl deploy -a kyra-gateway --wait-timeout 120

echo ""
echo "=== Deploy complete! ==="
echo ""
echo "Health check:"
curl -s https://kyra-gateway.fly.dev/health | python3 -m json.tool 2>/dev/null || curl -s https://kyra-gateway.fly.dev/health
echo ""
