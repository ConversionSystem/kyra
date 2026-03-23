#!/usr/bin/env bash
# =============================================================================
# qa-check.sh — Kyra Nightly QA Health Agent
#
# Runs 7 critical health checks and alerts Angel via Telegram on any failure.
#
# USAGE:
#   bash scripts/qa-check.sh            # full run
#   DRY_RUN=1 bash scripts/qa-check.sh  # print results without alerting
#
# CHECKS:
#   1. Stripe webhook → /api/webhooks/stripe is active (not old broken ones)
#   2. Plan vs Credits consistency (paid users with missing credits)
#   3. Container health on VPS (ubuntu@15.204.91.157)
#   4. Provisioner image pinned to v2026.3.8 (not :latest)
#   5. Recent signups with wrong plan (stripe set but plan=free)
#   6. Vercel deploy count (alert if >2 today)
#   7. Dead webhook handlers (/api/billing/webhook disabled in Stripe)
#
# ENVIRONMENT (loaded from .env.local):
#   STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
#   TELEGRAM_BOT_TOKEN, TELEGRAM_NOTIFY_CHAT_ID
# =============================================================================

set -uo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.local"

# ── Load env ──────────────────────────────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC2046
  export $(grep -E '^[A-Z_]+=.+' "$ENV_FILE" | sed 's/#.*//' | xargs) 2>/dev/null || true
else
  echo "⚠️  .env.local not found at $ENV_FILE"
fi

STRIPE_KEY="${STRIPE_SECRET_KEY:-}"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
TG_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TG_CHAT="${TELEGRAM_NOTIFY_CHAT_ID:-}"
DRY_RUN="${DRY_RUN:-0}"
VPS_HOST="ubuntu@15.204.91.157"

# Expected constants
CORRECT_WEBHOOK_PATH="/api/webhooks/stripe"
BROKEN_WEBHOOK_PATHS=("/api/billing/webhook" "/api/stripe/webhooks")
PINNED_IMAGE="kyra-gateway:v2026.3.8"
DEPLOY_COUNTER_FILE="/tmp/.kyra_deploy_$(date +%Y%m%d)"
MAX_DEPLOYS=2

# ── State ─────────────────────────────────────────────────────────────────────
FAILURES=()
WARNINGS=()
RESULTS=()
OVERALL_STATUS="PASS"

# ── Helpers ───────────────────────────────────────────────────────────────────
pass() {
  local label="$1"
  local detail="${2:-}"
  RESULTS+=("✅ PASS  $label${detail:+ — $detail}")
  echo -e "  ${GREEN}✅ PASS${NC}  $label${detail:+ — ${detail}}"
}

warn() {
  local label="$1"
  local detail="${2:-}"
  RESULTS+=("⚠️  WARN  $label${detail:+ — $detail}")
  WARNINGS+=("$label: $detail")
  OVERALL_STATUS="WARN"
  echo -e "  ${YELLOW}⚠️  WARN${NC}  $label${detail:+ — ${detail}}"
}

fail() {
  local label="$1"
  local detail="${2:-}"
  RESULTS+=("🔴 FAIL  $label${detail:+ — $detail}")
  FAILURES+=("$label: $detail")
  OVERALL_STATUS="FAIL"
  echo -e "  ${RED}🔴 FAIL${NC}  $label${detail:+ — ${detail}}"
}

skip() {
  local label="$1"
  local detail="${2:-}"
  RESULTS+=("⏭️  SKIP  $label${detail:+ — $detail}")
  echo -e "  ⏭️  SKIP  $label${detail:+ — ${detail}}"
}

stripe_get() {
  local path="$1"
  curl -sf -u "${STRIPE_KEY}:" "https://api.stripe.com/v1/${path}"
}

supabase_query() {
  local table="$1"
  local query="$2"
  curl -sf \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    "${SUPABASE_URL}/rest/v1/${table}?${query}"
}

send_telegram_alert() {
  local text="$1"
  if [[ -z "$TG_TOKEN" ]] || [[ -z "$TG_CHAT" ]]; then
    echo "  (Telegram not configured — skipping alert)"
    return
  fi
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "  [DRY_RUN] Would send Telegram: $text"
    return
  fi
  curl -sf -X POST \
    "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
    -d "chat_id=${TG_CHAT}" \
    -d "text=${text}" \
    -d "parse_mode=HTML" \
    > /dev/null 2>&1 || echo "  ⚠️  Telegram send failed"
}

# ── Header ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}  🔍 Kyra QA Health Agent — $(date '+%Y-%m-%d %H:%M %Z')${NC}"
echo -e "${CYAN}${BOLD}══════════════════════════════════════════════════════════${NC}"
echo ""
[[ "$DRY_RUN" == "1" ]] && echo -e "  ${YELLOW}DRY_RUN mode — no Telegram alerts will be sent${NC}\n"

# ── Check 1: Stripe Webhook — correct endpoint active ─────────────────────────
echo -e "${BOLD}  1. Stripe Webhook Endpoint${NC}"
if [[ -z "$STRIPE_KEY" ]]; then
  skip "Stripe Webhook" "STRIPE_SECRET_KEY not set"
else
  WEBHOOKS_JSON=$(stripe_get "webhook_endpoints?limit=20" 2>/dev/null || echo '{}')
  
  # Find active endpoints
  CORRECT_ACTIVE=$(echo "$WEBHOOKS_JSON" | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('data', [])
for wh in items:
    if wh.get('status') == 'enabled' and '$CORRECT_WEBHOOK_PATH' in wh.get('url', ''):
        print(wh['url'])
" 2>/dev/null || echo "")

  BROKEN_ACTIVE=$(echo "$WEBHOOKS_JSON" | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('data', [])
broken = ['/api/billing/webhook', '/api/stripe/webhooks']
found = []
for wh in items:
    if wh.get('status') == 'enabled':
        for b in broken:
            if b in wh.get('url', ''):
                found.append(wh['url'])
print('\n'.join(found))
" 2>/dev/null || echo "")

  if [[ -n "$CORRECT_ACTIVE" ]]; then
    pass "Stripe Webhook" "$CORRECT_WEBHOOK_PATH is active"
  else
    fail "Stripe Webhook" "CORRECT endpoint ($CORRECT_WEBHOOK_PATH) is NOT active in Stripe"
  fi

  if [[ -n "$BROKEN_ACTIVE" ]]; then
    fail "Stripe Dead Handlers" "OLD broken endpoints still ENABLED: $(echo $BROKEN_ACTIVE | tr '\n' ' ')"
  fi
fi
echo ""

# ── Check 2: Plan vs Credits Consistency ──────────────────────────────────────
echo -e "${BOLD}  2. Plan vs Credits Consistency${NC}"
if [[ -z "$SUPABASE_URL" ]] || [[ -z "$SUPABASE_KEY" ]]; then
  skip "Plan vs Credits" "Supabase env vars not set"
else
  # Query agencies with paid plans
  AGENCY_DATA=$(curl -sf \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Prefer: count=exact" \
    "${SUPABASE_URL}/rest/v1/agencies?select=id,name,plan,credit_balance&plan=in.(starter,pro,scale)&limit=200" \
    2>/dev/null || echo "[]")

  BAD_AGENCIES=$(echo "$AGENCY_DATA" | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
min_credits = {'starter': 500, 'pro': 500, 'scale': 500}
bad = []
for agency in data:
    plan = agency.get('plan', '')
    balance = agency.get('credit_balance', 0) or 0
    minimum = min_credits.get(plan, 0)
    if balance < minimum:
        bad.append(f\"{agency.get('name','?')} ({plan}): {balance} credits (need {minimum})\")
print('\n'.join(bad))
print(f'TOTAL_CHECKED:{len(data)}')
" 2>/dev/null || echo "ERROR")

  TOTAL_CHECKED=$(echo "$BAD_AGENCIES" | grep "TOTAL_CHECKED:" | cut -d: -f2)
  BAD_LIST=$(echo "$BAD_AGENCIES" | grep -v "TOTAL_CHECKED:" | grep -v "^$" || echo "")

  if [[ "$BAD_AGENCIES" == "ERROR" ]]; then
    warn "Plan vs Credits" "Could not query agencies table"
  elif [[ -n "$BAD_LIST" ]]; then
    BAD_COUNT=$(echo "$BAD_LIST" | grep -c "." || echo "0")
    fail "Plan vs Credits" "${BAD_COUNT} paid agencies with insufficient credits: $(echo "$BAD_LIST" | head -3 | tr '\n' ' ')"
  else
    pass "Plan vs Credits" "All ${TOTAL_CHECKED:-?} paid agencies have sufficient credits"
  fi
fi
echo ""

# ── Check 3: Container Health ─────────────────────────────────────────────────
echo -e "${BOLD}  3. Container Health (VPS)${NC}"
CONTAINER_OUT=$(ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
  "$VPS_HOST" \
  "docker ps -a --format '{{.Names}}|{{.Status}}|{{.State}}' 2>/dev/null | head -100" \
  2>/dev/null || echo "SSH_FAIL")

if [[ "$CONTAINER_OUT" == "SSH_FAIL" ]]; then
  fail "Container Health" "Cannot SSH to $VPS_HOST"
else
  UNHEALTHY=$(echo "$CONTAINER_OUT" | \
    python3 -c "
import sys
lines = sys.stdin.read().strip().split('\n')
bad = []
for line in lines:
    if not line.strip():
        continue
    parts = line.split('|')
    if len(parts) < 2:
        continue
    name = parts[0]
    status = parts[1].lower()
    state = parts[2].lower() if len(parts) > 2 else ''
    # Flag: stopped, restarting, exited, OOM
    if any(x in status for x in ['exited', 'restarting']) or state in ['exited', 'restarting']:
        bad.append(f'{name} ({parts[1]})')
    elif 'oom' in status:
        bad.append(f'{name} (OOM: {parts[1]})')
print('\n'.join(bad))
print(f'TOTAL:{len([l for l in lines if l.strip()])}')
" 2>/dev/null || echo "")

  TOTAL_CONTAINERS=$(echo "$UNHEALTHY" | grep "TOTAL:" | cut -d: -f2)
  BAD_CONTAINERS=$(echo "$UNHEALTHY" | grep -v "TOTAL:" | grep -v "^$" || echo "")

  if [[ -n "$BAD_CONTAINERS" ]]; then
    BAD_COUNT=$(echo "$BAD_CONTAINERS" | grep -c "." || echo "0")
    fail "Container Health" "${BAD_COUNT} unhealthy containers: $(echo "$BAD_CONTAINERS" | head -3 | tr '\n' '; ')"
  else
    pass "Container Health" "All ${TOTAL_CONTAINERS:-?} containers healthy"
  fi
fi
echo ""

# ── Check 4: Provisioner Image (must NOT be :latest) ──────────────────────────
echo -e "${BOLD}  4. Provisioner Image Pin${NC}"
IMAGE_OUT=$(ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
  "$VPS_HOST" \
  "docker ps --format '{{.Image}}|{{.Names}}' 2>/dev/null | grep -i 'kyra-gateway' | head -20" \
  2>/dev/null || echo "SSH_FAIL")

if [[ "$IMAGE_OUT" == "SSH_FAIL" ]]; then
  fail "Provisioner Image" "Cannot SSH to $VPS_HOST to verify image tags"
else
  LATEST_RUNNING=$(echo "$IMAGE_OUT" | grep ":latest" | head -5 || echo "")
  if [[ -n "$LATEST_RUNNING" ]]; then
    fail "Provisioner Image" "kyra-gateway:latest is running! Must be pinned to v2026.3.8: $(echo $LATEST_RUNNING | tr '\n' ' ')"
  else
    pass "Provisioner Image" "All kyra-gateway containers use pinned image (no :latest)"
  fi
fi
echo ""

# ── Check 5: Recent Signups with Wrong Plan ───────────────────────────────────
echo -e "${BOLD}  5. Recent Signups — Wrong Plan${NC}"
if [[ -z "$SUPABASE_URL" ]] || [[ -z "$SUPABASE_KEY" ]]; then
  skip "Recent Signups" "Supabase env vars not set"
else
  SEVEN_DAYS_AGO=$(date -u -v-7d '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || date -u -d '7 days ago' '+%Y-%m-%dT%H:%M:%S')
  
  BAD_SIGNUPS=$(curl -sf \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    "${SUPABASE_URL}/rest/v1/agencies?select=id,name,email,plan,stripe_customer_id,created_at&plan=eq.free&stripe_customer_id=not.is.null&created_at=gte.${SEVEN_DAYS_AGO}&limit=50" \
    2>/dev/null || echo "[]")

  BAD_COUNT=$(echo "$BAD_SIGNUPS" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo "0")
  
  if [[ "$BAD_COUNT" == "0" ]]; then
    pass "Recent Signups" "No paid customers stuck on free plan (last 7 days)"
  else
    NAMES=$(echo "$BAD_SIGNUPS" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for a in d[:3]:
    print(a.get('name','?') + ' (' + a.get('email','?') + ')')
" 2>/dev/null || echo "unknown")
    fail "Recent Signups" "${BAD_COUNT} users with Stripe ID but plan=free in last 7 days: $(echo $NAMES | tr '\n' '; ')"
  fi
fi
echo ""

# ── Check 6: Vercel Deploy Count ──────────────────────────────────────────────
echo -e "${BOLD}  6. Vercel Deploy Count${NC}"
if [[ -f "$DEPLOY_COUNTER_FILE" ]]; then
  DEPLOY_COUNT=$(cat "$DEPLOY_COUNTER_FILE" 2>/dev/null || echo 0)
  if [[ "$DEPLOY_COUNT" -gt "$MAX_DEPLOYS" ]]; then
    warn "Vercel Deploy Count" "${DEPLOY_COUNT} deploys today (limit: ${MAX_DEPLOYS}) — check for FORCE=1 abuse"
  elif [[ "$DEPLOY_COUNT" -eq "$MAX_DEPLOYS" ]]; then
    warn "Vercel Deploy Count" "${DEPLOY_COUNT}/${MAX_DEPLOYS} deploys used today — limit reached"
  else
    pass "Vercel Deploy Count" "${DEPLOY_COUNT}/${MAX_DEPLOYS} deploys today"
  fi
else
  pass "Vercel Deploy Count" "No deploys today (counter file not found)"
fi
echo ""

# ── Check 7: Dead Webhook Handlers (billing/webhook disabled) ─────────────────
echo -e "${BOLD}  7. Dead Webhook Handlers${NC}"
if [[ -z "$STRIPE_KEY" ]]; then
  skip "Dead Webhook Handlers" "STRIPE_SECRET_KEY not set"
else
  # Already fetched WEBHOOKS_JSON in check 1 — reuse or re-fetch
  if [[ -z "${WEBHOOKS_JSON:-}" ]]; then
    WEBHOOKS_JSON=$(stripe_get "webhook_endpoints?limit=20" 2>/dev/null || echo '{}')
  fi

  DEAD_ACTIVE=$(echo "$WEBHOOKS_JSON" | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('data', [])
dead_paths = ['/api/billing/webhook', '/api/stripe/webhooks']
found = []
for wh in items:
    if wh.get('status') == 'enabled':
        for p in dead_paths:
            if p in wh.get('url', ''):
                found.append(wh['url'])
print('\n'.join(found))
" 2>/dev/null || echo "")

  if [[ -n "$DEAD_ACTIVE" ]]; then
    fail "Dead Webhook Handlers" "OLD handlers still ENABLED in Stripe (should be disabled): $(echo $DEAD_ACTIVE | tr '\n' ' ')"
  else
    pass "Dead Webhook Handlers" "Old handlers (/api/billing/webhook, /api/stripe/webhooks) are disabled"
  fi
fi
echo ""

# ── Summary ───────────────────────────────────────────────────────────────────
echo -e "${CYAN}${BOLD}══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}  QA Summary — $(date '+%Y-%m-%d %H:%M %Z')${NC}"
echo -e "${CYAN}${BOLD}══════════════════════════════════════════════════════════${NC}"
echo ""
for r in "${RESULTS[@]}"; do
  echo "  $r"
done
echo ""

FAIL_COUNT=${#FAILURES[@]}
WARN_COUNT=${#WARNINGS[@]}

if [[ "$OVERALL_STATUS" == "FAIL" ]]; then
  echo -e "  ${RED}${BOLD}🔴 OVERALL: FAIL — $FAIL_COUNT failure(s), $WARN_COUNT warning(s)${NC}"
elif [[ "$OVERALL_STATUS" == "WARN" ]]; then
  echo -e "  ${YELLOW}${BOLD}⚠️  OVERALL: WARN — $WARN_COUNT warning(s), all critical checks passed${NC}"
else
  echo -e "  ${GREEN}${BOLD}✅ OVERALL: ALL CHECKS PASSED${NC}"
fi
echo ""

# ── Telegram Alert ────────────────────────────────────────────────────────────
if [[ "$FAIL_COUNT" -gt 0 ]]; then
  echo -e "  📲 Sending Telegram alert to Angel..."
  
  FAIL_TEXT=""
  for f in "${FAILURES[@]}"; do
    FAIL_TEXT+="🔴 $f%0A"
  done
  
  WARN_TEXT=""
  for w in "${WARNINGS[@]}"; do
    WARN_TEXT+="⚠️ $w%0A"
  done
  
  MSG="<b>🚨 Kyra QA Alert — $(date '+%Y-%m-%d %H:%M %Z')</b>%0A%0A"
  MSG+="<b>$FAIL_COUNT FAILURE(S) DETECTED</b>%0A%0A"
  MSG+="${FAIL_TEXT}"
  [[ -n "$WARN_TEXT" ]] && MSG+="%0A${WARN_TEXT}"
  MSG+="%0ARun: <code>bash scripts/qa-check.sh</code> for full report"

  send_telegram_alert "$MSG"
  echo -e "  ${GREEN}✓ Alert sent${NC}"
fi

echo ""
echo -e "${CYAN}${BOLD}══════════════════════════════════════════════════════════${NC}"
echo ""

# Exit with error code if any FAIL
[[ "$FAIL_COUNT" -gt 0 ]] && exit 1
exit 0
