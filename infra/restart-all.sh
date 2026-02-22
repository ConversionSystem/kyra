#!/bin/bash
# Safe restart script — reads ALL values from source of truth, never from docker inspect env
# Usage: bash /opt/kyra/restart-all.sh [client-id-prefix]
# ⚠️ NEVER extract tokens or keys from docker inspect env — they can be corrupted

set -e
DATA_DIR="/opt/kyra/data/clients"
MASTER_KEY=$(grep OPENAI_API_KEY /opt/kyra/provisioner/.env | cut -d= -f2-)
FILTER="${1:-}"

echo "Master API key: ${MASTER_KEY:0:20}..."
echo ''

docker ps --filter label=kyra.managed=true --format '{{.Names}}' | while read CONTAINER_NAME; do
  CLIENT_ID=$(echo $CONTAINER_NAME | sed 's/kyra-cl-//')
  if [ -n "$FILTER" ] && [[ "$CLIENT_ID" != ${FILTER}* ]]; then continue; fi

  META="$DATA_DIR/$CLIENT_ID/meta.json"
  CLIENT_DIR="$DATA_DIR/$CLIENT_ID"
  if [ ! -f "$META" ]; then echo "⚠️  SKIP ${CLIENT_ID:0:8} — no meta.json"; continue; fi

  # CRITICAL: Read from meta.json ONLY
  AUTH_TOKEN=$(python3 -c "import json; print(json.load(open('$META'))['authToken'])")
  AGENCY_ID=$(python3 -c "import json; print(json.load(open('$META'))['agencyId'])")

  # Per-client OpenAI key if exists and readable, else master
  API_KEY_FILE="$CLIENT_DIR/.api-key"
  if [ -f "$API_KEY_FILE" ] && [ -r "$API_KEY_FILE" ]; then
    OPENAI_KEY=$(cat "$API_KEY_FILE" | tr -d '[:space:]')
    echo "🔑 ${CLIENT_ID:0:8} — per-client API key"
  else
    OPENAI_KEY="$MASTER_KEY"
  fi

  echo "🔄 Restarting ${CLIENT_ID:0:8} (token: ${AUTH_TOKEN:0:12}... key: ${OPENAI_KEY:0:20}...)"
  docker stop $CONTAINER_NAME > /dev/null 2>&1 && docker rm $CONTAINER_NAME > /dev/null 2>&1

  docker run -d     --name $CONTAINER_NAME --hostname $CONTAINER_NAME     --network kyra-net --memory 1073741824 --cpu-shares 256     --cap-drop NET_RAW --cap-drop SYS_ADMIN --cap-drop MKNOD     --restart unless-stopped     -e "KYRA_CLIENT_ID=$CLIENT_ID"     -e "KYRA_AGENCY_ID=$AGENCY_ID"     -e "OPENCLAW_GATEWAY_TOKEN=$AUTH_TOKEN"     -e "KYRA_AUTH_TOKEN=$AUTH_TOKEN"     -e "NODE_OPTIONS=--max-old-space-size=1024"     -e "OPENAI_API_KEY=$OPENAI_KEY"     -v "$CLIENT_DIR/openclaw:/home/node/.openclaw"     -l "kyra.client.id=$CLIENT_ID"     -l "kyra.agency.id=$AGENCY_ID"     -l "kyra.managed=true"     kyra-gateway:latest     openclaw gateway run --port 18789 --bind lan --allow-unconfigured --token "$AUTH_TOKEN" > /dev/null

  echo "   ✅ ${CLIENT_ID:0:8} up"
  sleep 3
done

echo ''
echo '=== Final status ==='
docker ps --filter label=kyra.managed=true --format '{{.Names}}\t{{.Status}}' | sort
