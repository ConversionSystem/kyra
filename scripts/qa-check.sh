#!/usr/bin/env bash
# =============================================================================
# qa-check.sh — Nightly QA Health Check for Kyra
#
# Checks:
#   1. VPS container count (alert if < 55)
#   2. Bad provisioner image (2026.3.13 — OOM killer)
#   3. Provisioner API health
#   4. Vercel deploy count today (alert if > 2)
#
# Sends a Telegram summary to Angel. Exits 0 always (cron-safe).
#
# USAGE:
#   ./scripts/qa-check.sh
#   bash scripts/qa-check.sh
# =============================================================================

set -uo pipefail

# ── Load env ─────────────────────────────────────────────────────────────────
ENV_FILE="$(dirname "$0")/../.env.production.local"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
fi

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_NOTIFY_CHAT_ID="${TELEGRAM_NOTIFY_CHAT_ID:-}"

VPS_HOST="ubuntu@15.204.91.157"
MIN_CONTAINERS=55
BAD_IMAGE="2026.3.13"
COUNTER_FILE="${TMPDIR:-/tmp}/.kyra_deploy_$(date +%Y%m%d)"

# ── Helpers ───────────────────────────────────────────────────────────────────
FAILURES=()
SUMMARY_LINES=()

fail() {
  FAILURES+=("$1")
  SUMMARY_LINES+=("🚨 $1")
}

ok() {
  SUMMARY_LINES+=("✅ $1")
}

send_telegram() {
  local text="$1"
  if [[ -z "$TELEGRAM_BOT_TOKEN" || -z "$TELEGRAM_NOTIFY_CHAT_ID" ]]; then
    echo "[qa-check] No Telegram config — skipping notification"
    return
  fi
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\":\"${TELEGRAM_NOTIFY_CHAT_ID}\",\"text\":$(echo "$text" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),\"parse_mode\":\"HTML\"}" \
    > /dev/null
}

# ── Check 1: Container count ──────────────────────────────────────────────────
echo "[qa-check] Checking container count..."
CONTAINER_COUNT=$(ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$VPS_HOST" \
  "docker ps --filter 'status=running' | tail -n +2 | wc -l" 2>&1) || {
  fail "SSH to VPS failed — cannot check containers"
  CONTAINER_COUNT=0
}

if [[ "$CONTAINER_COUNT" =~ ^[0-9]+$ ]]; then
  if [[ "$CONTAINER_COUNT" -lt "$MIN_CONTAINERS" ]]; then
    fail "Only ${CONTAINER_COUNT} containers running (expected ≥${MIN_CONTAINERS})"
  else
    ok "${CONTAINER_COUNT} containers running"
  fi
fi

# ── Check 2: Bad image ────────────────────────────────────────────────────────
echo "[qa-check] Checking for bad provisioner image..."
BAD_COUNT=$(ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$VPS_HOST" \
  "docker ps --format '{{.Image}}' | grep '${BAD_IMAGE}' | wc -l" 2>/dev/null) || BAD_COUNT=0

if [[ "$BAD_COUNT" =~ ^[0-9]+$ && "$BAD_COUNT" -gt 0 ]]; then
  fail "${BAD_COUNT} container(s) running BAD image v${BAD_IMAGE} (OOM killer!) — run restart-all.sh"
else
  ok "Provisioner image clean (no v${BAD_IMAGE})"
fi

# ── Check 3: Provisioner health ───────────────────────────────────────────────
echo "[qa-check] Checking provisioner API..."
PROV_OK=$(ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$VPS_HOST" \
  "curl -sf http://localhost:9090/health 2>/dev/null && echo OK || echo FAIL" 2>/dev/null) || PROV_OK="SSH_FAIL"

if [[ "$PROV_OK" == "OK" ]]; then
  ok "Provisioner API healthy"
else
  fail "Provisioner API unreachable (status: ${PROV_OK})"
fi

# ── Check 4: Deploy count ─────────────────────────────────────────────────────
echo "[qa-check] Checking deploy count..."
if [[ -f "$COUNTER_FILE" ]]; then
  DEPLOY_COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
  if [[ "$DEPLOY_COUNT" -gt 2 ]]; then
    fail "Deploy limit exceeded: ${DEPLOY_COUNT} deploys today (max 2) — Vercel bill risk"
  else
    ok "${DEPLOY_COUNT}/2 deploys used today"
  fi
else
  ok "0/2 deploys used today"
fi

# ── Build report ──────────────────────────────────────────────────────────────
TIMESTAMP=$(date '+%Y-%m-%d %H:%M CET')
REPORT_LINES=("🔍 <b>Kyra Nightly QA — ${TIMESTAMP}</b>")
REPORT_LINES+=("")
for line in "${SUMMARY_LINES[@]}"; do
  REPORT_LINES+=("$line")
done

if [[ ${#FAILURES[@]} -eq 0 ]]; then
  REPORT_LINES+=("")
  REPORT_LINES+=("All systems nominal. Sleep well. 🌙")
else
  REPORT_LINES+=("")
  REPORT_LINES+=("<b>${#FAILURES[@]} issue(s) need attention.</b>")
fi

REPORT=$(printf '%s\n' "${REPORT_LINES[@]}")

# ── Output & notify ───────────────────────────────────────────────────────────
echo ""
echo "========================================="
echo "$REPORT"
echo "========================================="
echo ""

send_telegram "$REPORT"

echo "[qa-check] Done. ${#FAILURES[@]} failure(s)."
exit 0
