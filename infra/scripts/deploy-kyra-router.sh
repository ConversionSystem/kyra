#!/bin/bash
# Deploy kyra-router to the VPS
# Run this once to build the image and start the shared container.
# After that, the provisioner auto-manages it on restart.
#
# Usage: bash deploy-kyra-router.sh
# Run from: /opt/kyra on the VPS (or update KYRA_DIR below)

set -e

KYRA_DIR="/opt/kyra"
REPO_DIR="/opt/kyra/repo"   # adjust if repo is elsewhere
ROUTER_DIR="$REPO_DIR/kyra-router"
IMAGE_NAME="kyra-router:latest"
CONTAINER_NAME="kyra-router"
NETWORK="kyra-net"

echo "🔧 Building kyra-router Docker image..."
docker build -t $IMAGE_NAME $ROUTER_DIR

echo "🛑 Stopping existing container (if any)..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo "🚀 Starting kyra-router..."
# Load env vars from provisioner .env
source /opt/kyra/provisioner/.env

docker run -d \
  --name $CONTAINER_NAME \
  --network $NETWORK \
  --restart unless-stopped \
  --memory 256m \
  -e OPENAI_API_KEY="${OPENAI_API_KEY}" \
  -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}" \
  -e OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-}" \
  -e KYRA_MAX_TIER=2 \
  -e KYRA_DAILY_CAP=50.00 \
  -e KYRA_MONTHLY_BUDGET=500.00 \
  $IMAGE_NAME

echo ""
echo "✅ kyra-router running on $NETWORK:8104"
echo "   All new OpenClaw containers will route through it automatically."
echo ""
echo "   Health check:"
echo "   docker exec $CONTAINER_NAME curl -s http://localhost:8104/health | python3 -m json.tool"
echo ""
