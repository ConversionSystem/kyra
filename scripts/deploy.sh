#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Safe Vercel Deploy Gate
#
# RULES:
#   1. Max 2 deploys per calendar day (resets at midnight)
#   2. Auto-deletes all old deployments after every successful deploy
#   3. Prints a cost summary after each deploy
#
# USAGE:
#   npm run deploy:prod          # standard deploy
#   FORCE=1 npm run deploy:prod  # bypass daily gate (emergencies only)
#
# COST CONTEXT:
#   Each build ≈ 3–4 min @ ~$0.108/min = ~$0.40 per deploy
#   Target: ≤10 deploys/month = ~$4 in build minutes + $20 base = $24/mo
# =============================================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
LIMIT=${DAILY_DEPLOY_LIMIT:-2}
COUNTER_FILE="${KYRA_COUNTER_FILE:-${TMPDIR:-/tmp}/.kyra_deploy_$(date +%Y%m%d)}"
PROJECT="kyra"
TEAM="conversionsystem"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}  Kyra Deploy Gate — $(date '+%Y-%m-%d %H:%M %Z')${NC}"
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════${NC}"
echo ""

# ── Read deploy counter ───────────────────────────────────────────────────────
count=0
if [[ -f "$COUNTER_FILE" ]]; then
  count=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
fi

echo -e "  📊 Deploys today: ${BOLD}${count}/${LIMIT}${NC}"

# ── Gate check ────────────────────────────────────────────────────────────────
if [[ "${FORCE:-0}" != "1" ]] && [[ "$count" -ge "$LIMIT" ]]; then
  echo ""
  echo -e "${RED}${BOLD}  ✋ DEPLOY BLOCKED — Daily limit reached (${count}/${LIMIT})${NC}"
  echo ""
  echo -e "${YELLOW}  You've already deployed ${count} time(s) today.${NC}"
  echo -e "${YELLOW}  Batch your remaining changes and deploy tomorrow,${NC}"
  echo -e "${YELLOW}  or use: FORCE=1 npm run deploy:prod (emergencies only)${NC}"
  echo ""
  echo -e "${YELLOW}  📌 RULE: Commit everything. Deploy once at end of session.${NC}"
  echo ""
  exit 1
fi

# ── Confirm if this is deploy #2 ─────────────────────────────────────────────
if [[ "${FORCE:-0}" != "1" ]] && [[ "$count" -eq 1 ]]; then
  echo ""
  echo -e "${YELLOW}  ⚠️  This is your LAST deploy for today (${BOLD}$((count+1))/${LIMIT}${NC}${YELLOW}).${NC}"
  echo -e "${YELLOW}  Make sure ALL your changes for this session are committed.${NC}"
  echo ""
  if [[ -t 0 ]]; then
    read -r -p "  Continue? [y/N] " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
      echo ""
      echo "  Cancelled. Commit more changes first, then re-run."
      echo ""
      exit 0
    fi
  fi
fi

# ── Pre-deploy: warn on uncommitted changes ───────────────────────────────────
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  echo ""
  echo -e "${YELLOW}  ⚠️  You have uncommitted changes. They won't be in this deploy.${NC}"
  echo -e "${YELLOW}  Run: git add -A && git commit -m 'your message' first.${NC}"
  echo ""
  if [[ -t 0 ]]; then
    read -r -p "  Deploy anyway? [y/N] " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
      echo "  Cancelled."
      exit 0
    fi
  fi
fi

# ── Deploy ────────────────────────────────────────────────────────────────────
echo ""
echo -e "  🚀 Deploying to production..."
echo ""

START_TIME=$(date +%s)

if npx vercel --prod --yes 2>&1; then
  DEPLOY_STATUS=0
else
  DEPLOY_STATUS=$?
fi

END_TIME=$(date +%s)
ELAPSED=$(( END_TIME - START_TIME ))
ELAPSED_MIN=$(echo "scale=1; $ELAPSED / 60" | bc)

# ── Post-deploy: update counter ───────────────────────────────────────────────
if [[ $DEPLOY_STATUS -eq 0 ]]; then
  new_count=$((count + 1))
  echo "$new_count" > "$COUNTER_FILE"

  echo ""
  echo -e "${GREEN}${BOLD}  ✅ Deploy successful!${NC}"
  echo ""
  echo -e "  ⏱  Build time: ${BOLD}${ELAPSED_MIN} min${NC} (~\$$(echo "scale=2; $ELAPSED / 60 * 0.108" | bc))"
  echo -e "  📊 Deploys today: ${BOLD}${new_count}/${LIMIT}${NC}"

  # Estimate monthly cost
  remaining=$((LIMIT - new_count))
  echo ""
  if [[ $remaining -eq 0 ]]; then
    echo -e "${YELLOW}  🚫 Daily limit reached. Next deploy available tomorrow.${NC}"
  else
    echo -e "  🔁 Remaining deploys today: ${BOLD}${remaining}${NC}"
  fi

  # ── Auto-cleanup: delete all but the latest deployment ───────────────────
  echo ""
  echo -e "  🧹 Cleaning up old deployments..."

  OLD_URLS=$(npx vercel ls "$PROJECT" --scope "$TEAM" 2>/dev/null \
    | grep -oE "https://${PROJECT}-[a-z0-9]+-${TEAM}\.vercel\.app" \
    | tail -n +2)

  OLD_COUNT=$(echo "$OLD_URLS" | grep -c "." || true)

  if [[ -n "$OLD_URLS" ]] && [[ "$OLD_COUNT" -gt 0 ]]; then
    echo "$OLD_URLS" | while read -r url; do
      [[ -z "$url" ]] && continue
      npx vercel rm "$url" --yes --scope "$TEAM" 2>/dev/null && echo "    Removed: $url" || true
    done
    echo -e "  ${GREEN}✓ Cleaned ${OLD_COUNT} old deployment(s)${NC}"
  else
    echo -e "  ${GREEN}✓ Nothing to clean${NC}"
  fi

  echo ""
  echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}${BOLD}  Done. kyra.conversionsystem.com is live.${NC}"
  echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════${NC}"
  echo ""

else
  echo ""
  echo -e "${RED}${BOLD}  ❌ Deploy failed (exit code: $DEPLOY_STATUS)${NC}"
  echo -e "${YELLOW}  Counter NOT incremented — this attempt won't count.${NC}"
  echo ""
  exit $DEPLOY_STATUS
fi
