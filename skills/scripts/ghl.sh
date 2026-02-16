#!/usr/bin/env bash
# ghl.sh — GoHighLevel API v2 CLI wrapper
# Usage: bash ghl.sh <resource> <action> [args...]
#
# Environment:
#   GHL_API_TOKEN    — Private Integration Token or OAuth access token (required)
#   GHL_LOCATION_ID  — Sub-account / location ID (required for most calls)
#   GHL_API_VERSION  — API version header (default: 2021-07-28)

set -euo pipefail

BASE_URL="https://services.leadconnectorhq.com"
VERSION="${GHL_API_VERSION:-2021-07-28}"
MAX_RETRIES=1

# ── Validation ──────────────────────────────────────────────────────────
if [[ -z "${GHL_API_TOKEN:-}" ]]; then
  echo "ERROR: GHL_API_TOKEN not set. Generate one in GHL → Settings → Integrations → Private Integrations." >&2
  exit 1
fi

# ── HTTP helpers ────────────────────────────────────────────────────────
_headers() {
  echo -H "Authorization: Bearer ${GHL_API_TOKEN}" \
       -H "Content-Type: application/json" \
       -H "Accept: application/json" \
       -H "Version: ${VERSION}"
}

_curl() {
  local method="$1" url="$2"
  shift 2
  local attempt=0 resp code

  while (( attempt <= MAX_RETRIES )); do
    resp=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer ${GHL_API_TOKEN}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -H "Version: ${VERSION}" \
      "$@" 2>&1) || true

    code=$(echo "$resp" | tail -1)
    local body
    body=$(echo "$resp" | sed '$d')

    if [[ "$code" == "429" && $attempt -lt $MAX_RETRIES ]]; then
      echo "Rate limited, retrying in 2s..." >&2
      sleep 2
      ((attempt++))
      continue
    fi

    if [[ "$code" -ge 400 ]]; then
      echo "HTTP $code" >&2
      echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
      exit 1
    fi

    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    return 0
  done
}

_get()    { _curl GET    "$@"; }
_post()   { _curl POST   "$@" ; }
_put()    { _curl PUT    "$@" ; }
_delete() { _curl DELETE "$@" ; }

_require_location() {
  if [[ -z "${GHL_LOCATION_ID:-}" ]]; then
    echo "ERROR: GHL_LOCATION_ID not set. Find it in GHL → Settings → Business Info." >&2
    exit 1
  fi
}

# ── Contacts ────────────────────────────────────────────────────────────
cmd_contacts() {
  _require_location
  local action="${1:-help}"; shift || true

  case "$action" in
    search)
      local query="${1:?Usage: contacts search '<query>'}"
      _get "${BASE_URL}/contacts/?locationId=${GHL_LOCATION_ID}&query=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))")"
      ;;
    get)
      local id="${1:?Usage: contacts get <contactId>}"
      _get "${BASE_URL}/contacts/${id}"
      ;;
    create)
      local json="${1:?Usage: contacts create '<json>'}"
      local payload
      payload=$(echo "$json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
data['locationId'] = '${GHL_LOCATION_ID}'
print(json.dumps(data))
")
      _post "${BASE_URL}/contacts/" -d "$payload"
      ;;
    update)
      local id="${1:?Usage: contacts update <contactId> '<json>'}"
      local json="${2:?Usage: contacts update <contactId> '<json>'}"
      _put "${BASE_URL}/contacts/${id}" -d "$json"
      ;;
    upsert)
      local json="${1:?Usage: contacts upsert '<json>'}"
      local payload
      payload=$(echo "$json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
data['locationId'] = '${GHL_LOCATION_ID}'
print(json.dumps(data))
")
      _post "${BASE_URL}/contacts/upsert" -d "$payload"
      ;;
    add-tags)
      local id="${1:?Usage: contacts add-tags <contactId> '[\"tag1\"]'}"
      local tags="${2:?Usage: contacts add-tags <contactId> '[\"tag1\"]'}"
      _post "${BASE_URL}/contacts/${id}/tags" -d "{\"tags\": ${tags}}"
      ;;
    remove-tags)
      local id="${1:?Usage: contacts remove-tags <contactId> '[\"tag1\"]'}"
      local tags="${2:?Usage: contacts remove-tags <contactId> '[\"tag1\"]'}"
      _delete "${BASE_URL}/contacts/${id}/tags" -d "{\"tags\": ${tags}}"
      ;;
    add-note)
      local id="${1:?Usage: contacts add-note <contactId> '<body>'}"
      local body="${2:?Usage: contacts add-note <contactId> '<body>'}"
      _post "${BASE_URL}/contacts/${id}/notes" -d "{\"body\": $(python3 -c "import json; print(json.dumps('$body'))")}"
      ;;
    list-notes)
      local id="${1:?Usage: contacts list-notes <contactId>}"
      _get "${BASE_URL}/contacts/${id}/notes"
      ;;
    add-task)
      local id="${1:?Usage: contacts add-task <contactId> '<json>'}"
      local json="${2:?Usage: contacts add-task <contactId> '<json>'}"
      _post "${BASE_URL}/contacts/${id}/tasks" -d "$json"
      ;;
    list-tasks)
      local id="${1:?Usage: contacts list-tasks <contactId>}"
      _get "${BASE_URL}/contacts/${id}/tasks"
      ;;
    *)
      echo "contacts: search | get | create | update | upsert | add-tags | remove-tags | add-note | list-notes | add-task | list-tasks"
      ;;
  esac
}

# ── Conversations ───────────────────────────────────────────────────────
cmd_conversations() {
  _require_location
  local action="${1:-help}"; shift || true

  case "$action" in
    search)
      local query="${1:?Usage: conversations search '<query>'}"
      _get "${BASE_URL}/conversations/search?locationId=${GHL_LOCATION_ID}&q=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))")"
      ;;
    get)
      local id="${1:?Usage: conversations get <conversationId>}"
      _get "${BASE_URL}/conversations/${id}"
      ;;
    create)
      local json="${1:?Usage: conversations create '<json>'}"
      local payload
      payload=$(echo "$json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
data['locationId'] = '${GHL_LOCATION_ID}'
print(json.dumps(data))
")
      _post "${BASE_URL}/conversations/" -d "$payload"
      ;;
    *)
      echo "conversations: search | get | create"
      ;;
  esac
}

# ── Messages ────────────────────────────────────────────────────────────
cmd_messages() {
  _require_location
  local action="${1:-help}"; shift || true

  case "$action" in
    send)
      local json="${1:?Usage: messages send '<json>'}"
      # Ensure type is set; default to SMS
      local payload
      payload=$(echo "$json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
data.setdefault('type', 'SMS')
print(json.dumps(data))
")
      _post "${BASE_URL}/conversations/messages" -d "$payload"
      ;;
    inbound)
      local json="${1:?Usage: messages inbound '<json>'}"
      _post "${BASE_URL}/conversations/messages/inbound" -d "$json"
      ;;
    *)
      echo "messages: send | inbound"
      ;;
  esac
}

# ── Opportunities ───────────────────────────────────────────────────────
cmd_opportunities() {
  _require_location
  local action="${1:-help}"; shift || true

  case "$action" in
    search)
      local json="${1:-{}}"
      # Build query params from JSON
      local params
      params=$(echo "$json" | python3 -c "
import sys, json, urllib.parse
data = json.load(sys.stdin)
data['location_id'] = '${GHL_LOCATION_ID}'
print(urllib.parse.urlencode(data))
")
      _get "${BASE_URL}/opportunities/search?${params}"
      ;;
    get)
      local id="${1:?Usage: opportunities get <opportunityId>}"
      _get "${BASE_URL}/opportunities/${id}"
      ;;
    create)
      local json="${1:?Usage: opportunities create '<json>'}"
      _post "${BASE_URL}/opportunities" -d "$json"
      ;;
    update)
      local id="${1:?Usage: opportunities update <opportunityId> '<json>'}"
      local json="${2:?Usage: opportunities update <opportunityId> '<json>'}"
      _put "${BASE_URL}/opportunities/${id}" -d "$json"
      ;;
    status)
      local id="${1:?Usage: opportunities status <opportunityId> <status>}"
      local status="${2:?Usage: opportunities status <opportunityId> <open|won|lost|abandoned>}"
      _put "${BASE_URL}/opportunities/${id}/status" -d "{\"status\": \"${status}\"}"
      ;;
    *)
      echo "opportunities: search | get | create | update | status"
      ;;
  esac
}

# ── Pipelines ───────────────────────────────────────────────────────────
cmd_pipelines() {
  _require_location
  local action="${1:-list}"; shift || true

  case "$action" in
    list)
      _get "${BASE_URL}/opportunities/pipelines?locationId=${GHL_LOCATION_ID}"
      ;;
    *)
      echo "pipelines: list"
      ;;
  esac
}

# ── Calendars ───────────────────────────────────────────────────────────
cmd_calendars() {
  _require_location
  local action="${1:-help}"; shift || true

  case "$action" in
    list)
      _get "${BASE_URL}/calendars/?locationId=${GHL_LOCATION_ID}"
      ;;
    get)
      local id="${1:?Usage: calendars get <calendarId>}"
      _get "${BASE_URL}/calendars/${id}"
      ;;
    free-slots)
      local id="${1:?Usage: calendars free-slots <calendarId> <startDate> <endDate>}"
      local start="${2:?Provide startDate (YYYY-MM-DD or ISO-8601)}"
      local end="${3:?Provide endDate (YYYY-MM-DD or ISO-8601)}"
      _get "${BASE_URL}/calendars/${id}/free-slots?startDate=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$start'))")&endDate=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$end'))")"
      ;;
    book)
      local json="${1:?Usage: calendars book '<json>'}"
      _post "${BASE_URL}/calendars/events/appointments" -d "$json"
      ;;
    events)
      local json="${1:-{}}"
      local params
      params=$(echo "$json" | python3 -c "
import sys, json, urllib.parse
data = json.load(sys.stdin)
data['locationId'] = '${GHL_LOCATION_ID}'
print(urllib.parse.urlencode(data))
")
      _get "${BASE_URL}/calendars/events?${params}"
      ;;
    *)
      echo "calendars: list | get | free-slots | book | events"
      ;;
  esac
}

# ── Location ────────────────────────────────────────────────────────────
cmd_location() {
  _require_location
  local action="${1:-get}"; shift || true

  case "$action" in
    get)
      _get "${BASE_URL}/locations/${GHL_LOCATION_ID}"
      ;;
    custom-fields)
      _get "${BASE_URL}/locations/${GHL_LOCATION_ID}/customFields"
      ;;
    custom-values)
      _get "${BASE_URL}/locations/${GHL_LOCATION_ID}/customValues"
      ;;
    tags)
      _get "${BASE_URL}/locations/${GHL_LOCATION_ID}/tags"
      ;;
    *)
      echo "location: get | custom-fields | custom-values | tags"
      ;;
  esac
}

# ── Workflows (trigger) ────────────────────────────────────────────────
cmd_workflows() {
  _require_location
  local action="${1:-help}"; shift || true

  case "$action" in
    add-contact)
      local contactId="${1:?Usage: workflows add-contact <contactId> <workflowId>}"
      local workflowId="${2:?Usage: workflows add-contact <contactId> <workflowId>}"
      _post "${BASE_URL}/contacts/${contactId}/workflow/${workflowId}"
      ;;
    remove-contact)
      local contactId="${1:?Usage: workflows remove-contact <contactId> <workflowId>}"
      local workflowId="${2:?Usage: workflows remove-contact <contactId> <workflowId>}"
      _delete "${BASE_URL}/contacts/${contactId}/workflow/${workflowId}"
      ;;
    *)
      echo "workflows: add-contact | remove-contact"
      ;;
  esac
}

# ── Router ──────────────────────────────────────────────────────────────
resource="${1:-help}"
shift || true

case "$resource" in
  contacts)       cmd_contacts "$@" ;;
  conversations)  cmd_conversations "$@" ;;
  messages)       cmd_messages "$@" ;;
  opportunities)  cmd_opportunities "$@" ;;
  pipelines)      cmd_pipelines "$@" ;;
  calendars)      cmd_calendars "$@" ;;
  location)       cmd_location "$@" ;;
  workflows)      cmd_workflows "$@" ;;
  help|--help|-h)
    cat <<'EOF'
GoHighLevel CRM CLI — API v2

Usage: bash ghl.sh <resource> <action> [args...]

Resources:
  contacts        Search, create, update contacts; manage tags, notes, tasks
  conversations   Search, get, create conversations
  messages        Send SMS/email/WhatsApp messages
  opportunities   Search, create, update deals in pipelines
  pipelines       List pipelines and stages
  calendars       List calendars, check availability, book appointments
  location        Get location details, custom fields/values, tags
  workflows       Add/remove contacts from workflows

Environment:
  GHL_API_TOKEN     Private Integration Token (required)
  GHL_LOCATION_ID   Sub-account ID (required)
  GHL_API_VERSION   API version header (default: 2021-07-28)

Run any resource without an action for sub-command help.
EOF
    ;;
  *)
    echo "Unknown resource: $resource" >&2
    echo "Run 'bash ghl.sh help' for usage." >&2
    exit 1
    ;;
esac
