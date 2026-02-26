# Pipeline Redesign: Human-in-the-Loop + Webhook Sync

## Overview
Redesign the AI Sales Pipeline from fully autonomous to stage-gated with human approval at each step. Only the AI Closer remains autonomous — and ONLY for leads that passed all 4 human-reviewed stages.

## Current State (BROKEN)
- `/api/agency/pipeline/run` — One streaming endpoint does EVERYTHING: create → find → research → personalize → launch → AI closer
- No human review gates between stages
- No webhook notifications to external tools
- The pipeline-client.tsx UI shows one "Launch" button that runs everything

## New Architecture

### Stage Flow (Human-in-the-Loop)
```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  1. CREATE    │ ──▸ │ 2. FIND LEADS│ ──▸ │ 3. RESEARCH &        │ ──▸ │ 4. LAUNCH        │ ──▸ │ 5. AI CLOSER │
│  (Human)      │     │  (AI + Human)│     │    PERSONALIZE       │     │    OUTREACH       │     │  (Autonomous)│
│               │     │              │     │    (AI + Human)      │     │    (Human)        │     │              │
│ Configure     │     │ AI finds     │     │ AI researches &      │     │ Human reviews     │     │ Monitors     │
│ campaign      │     │ leads ──▸    │     │ writes emails ──▸    │     │ final messages ──▸│     │ replies 24/7 │
│ details       │     │ Human reviews│     │ Human edits/approves │     │ Clicks "Send"     │     │ Qualifies    │
│               │     │ & approves   │     │ each message         │     │ for each lead     │     │ Books demos  │
└──────────────┘     └──────────────┘     └──────────────────────┘     └──────────────────┘     └──────────────┘
     STOP ◀──             STOP ◀──              STOP ◀──                   STOP ◀──              AUTONOMOUS ✅
  (wait for            (wait for             (wait for                  (wait for
   human input)         approval)             approval)                  approval)
```

### Lead Stages (Updated)
- `found` — AI discovered this lead (pending human review)
- `approved` — Human approved this lead for research
- `researched` — AI researched & wrote personalized outreach (pending human review)
- `outreach_approved` — Human approved the outreach messages
- `messaged` — Outreach sent (human clicked "Send")
- `replied` — Lead replied (AI Closer takes over)
- `interested` — AI qualified as interested
- `booked` — Demo booked
- `closed` — Deal closed
- `skipped` — Human rejected this lead

### DB Migration Required
The `stage` check constraint needs updating to include `outreach_approved`:
```sql
ALTER TABLE pipeline_leads DROP CONSTRAINT IF EXISTS pipeline_leads_stage_check;
ALTER TABLE pipeline_leads ADD CONSTRAINT pipeline_leads_stage_check 
  CHECK (stage IN ('found','approved','researched','outreach_approved','messaged','replied','interested','booked','closed','skipped'));
```

Also create a new `pipeline_webhooks` table:
```sql
CREATE TABLE pipeline_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  headers JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE pipeline_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can manage pipeline_webhooks"
  ON pipeline_webhooks FOR ALL
  USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));
```

And a `pipeline_activity_log` table for audit trail:
```sql
CREATE TABLE pipeline_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES pipeline_campaigns(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES pipeline_leads(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT,
  actor TEXT NOT NULL DEFAULT 'system',
  details JSONB NOT NULL DEFAULT '{}',
  webhook_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pipeline_activity_log_agency_idx ON pipeline_activity_log(agency_id);
CREATE INDEX pipeline_activity_log_campaign_idx ON pipeline_activity_log(campaign_id);
CREATE INDEX pipeline_activity_log_created_idx ON pipeline_activity_log(created_at DESC);
```

## Files to Create/Modify

### NEW FILES:

1. **`supabase/migrations/20260226001_pipeline_hitl.sql`** — Migration with all 3 changes above

2. **`lib/pipeline/webhooks.ts`** — Webhook dispatcher
   - `fireWebhook(agencyId, event, payload)` — fires all matching webhooks
   - Events: `lead.found`, `lead.approved`, `lead.researched`, `lead.outreach_approved`, `lead.messaged`, `lead.replied`, `lead.interested`, `lead.booked`, `lead.closed`, `lead.skipped`, `campaign.created`
   - Payload format:
     ```json
     {
       "event": "lead.messaged",
       "timestamp": "2026-02-26T10:00:00Z",
       "campaign": { "id": "...", "name": "..." },
       "lead": {
         "id": "...", "full_name": "...", "company": "...", "email": "...", "phone": "...",
         "stage": "messaged", "previous_stage": "outreach_approved",
         "personalized_subject": "...", "personalized_email": "...", "personalized_opener": "..."
       }
     }
     ```
   - HMAC-SHA256 signature in `X-Kyra-Signature` header if `secret` is set
   - Fire-and-forget with 5s timeout, log failures but don't block
   - Also logs to `pipeline_activity_log`

3. **`app/api/agency/pipeline/webhooks/route.ts`** — CRUD for webhook configs
   - GET: list webhooks for agency
   - POST: create webhook (name, url, events[], headers?, secret?)
   - PATCH: update webhook
   - DELETE: delete webhook

4. **`app/api/agency/pipeline/approve/route.ts`** — Batch approve/reject leads
   - POST: `{ lead_ids: string[], action: 'approve' | 'reject' | 'approve_outreach' }`
   - `approve`: moves `found` → `approved` (ready for research)
   - `reject`: moves to `skipped`
   - `approve_outreach`: moves `researched` → `outreach_approved` (ready to send)
   - Fires webhooks for each transition

### MODIFIED FILES:

5. **`app/api/agency/pipeline/run/route.ts`** — COMPLETELY REWRITE
   - Remove the streaming all-in-one approach
   - New behavior: Creates campaign + finds leads → STOPS
   - Returns `{ campaignId, leadsFound }` — that's it
   - The human then reviews leads in the UI
   - NO auto_launch, NO automatic research, NO automatic outreach

6. **`app/api/agency/pipeline/enrich/route.ts`** — Add webhook firing
   - After enriching each lead, fire `lead.researched` webhook
   - Only enrich `approved` leads (not `found` — human must approve first)

7. **`app/api/agency/pipeline/launch/route.ts`** — Add webhook firing + stage check
   - Only launch `outreach_approved` leads (not `researched`)
   - Fire `lead.messaged` webhook after each send

8. **`app/api/agency/pipeline/leads/[id]/route.ts`** — Add webhook firing on stage changes
   - When stage changes, fire the appropriate webhook
   - Log to activity_log

9. **`app/(dashboard)/agency/pipeline/pipeline-client.tsx`** — COMPLETE UI REWRITE
   
   The new UI has a STAGE-BASED KANBAN VIEW with 5 columns:

   **Layout:** Horizontal tabs for each stage, NOT a kanban board (mobile-friendly)
   
   **Tab 1: Create Campaign** (left panel)
   - Campaign form (same fields as current modal)
   - "Find Leads" button — calls `/api/agency/pipeline/run` (just creates + finds)
   - Shows progress while finding leads
   
   **Tab 2: Review Leads** (shows leads in `found` stage)
   - Card per lead: company, website, location, industry, why_qualified
   - Checkboxes for batch selection
   - "Approve Selected" button → moves to `approved`
   - "Reject" button per card → moves to `skipped`
   - "Approve All" button for quick approval
   - Counter: "X of Y leads approved"
   
   **Tab 3: Review Outreach** (shows leads in `researched` stage)
   - Card per lead with EDITABLE fields:
     - Subject line (text input)
     - Email body (textarea)
     - SMS opener (text input)
   - "Approve" per lead → moves to `outreach_approved`
   - "Approve All" for batch
   - "Edit & Approve" — inline editing then approve
   - "Research" button to trigger enrichment on `approved` leads
   
   **Tab 4: Launch** (shows leads in `outreach_approved` stage)
   - Final review cards showing the approved messages
   - Channel selector per lead (email, SMS, both)
   - "Send to Selected" button → calls `/api/agency/pipeline/launch`
   - "Send All" button
   - Clear warning: "This will send real messages to real people"
   
   **Tab 5: AI Closer** (shows leads in `messaged`, `replied`, `interested`, `booked`, `closed`)
   - This is the AUTONOMOUS section
   - Shows conversation threads
   - Real-time status indicators
   - Human can jump in at any time (manual message)
   - "Book Demo" / "Closed Won" buttons for manual override
   
   **Stage Progress Bar** at the top:
   - Shows: Create → Find (X) → Research (X) → Launch (X) → Closing (X)
   - Numbers show leads in each stage
   - Active stage is highlighted
   - Click any stage to jump to that tab

10. **NEW: `app/(dashboard)/agency/pipeline/webhook-settings.tsx`** — Webhook config UI
    - List configured webhooks
    - Add new webhook: name, URL, events (checkboxes), secret (optional)
    - Test button: sends a test payload
    - Delete button
    - Shows last delivery status per webhook
    - Pre-built templates:
      - "Zapier Webhook" — just needs URL
      - "Make (Integromat)" — just needs URL
      - "n8n Webhook" — just needs URL
      - "GHL Workflow" — pre-fills GHL webhook URL format
      - "Custom" — full control

## Integration Payload Format (for Zapier/Make/n8n)

Every webhook fires an HTTP POST with:
```
POST {webhook_url}
Content-Type: application/json
X-Kyra-Event: lead.messaged
X-Kyra-Signature: sha256=... (if secret configured)
X-Kyra-Timestamp: 1708948800

{
  "event": "lead.messaged",
  "timestamp": "2026-02-26T10:00:00.000Z",
  "agency_id": "uuid",
  "campaign": {
    "id": "uuid",
    "name": "Cannabis Dispensaries — LA"
  },
  "lead": {
    "id": "uuid",
    "full_name": "John Smith",
    "company": "Green Leaf Dispensary",
    "email": "john@greenleaf.com",
    "phone": "+13105551234",
    "website": "greenleaf.com",
    "industry": "Cannabis Dispensary",
    "location": "Los Angeles, CA",
    "stage": "messaged",
    "previous_stage": "outreach_approved",
    "personalized_subject": "Quick question about Green Leaf",
    "personalized_email": "...",
    "personalized_opener": "...",
    "ghl_contact_id": "abc123"
  }
}
```

This format works natively with:
- **Zapier** — "Catch Hook" trigger → map fields directly
- **Make** — "Custom Webhook" module → parse JSON body
- **n8n** — "Webhook" node → access `$json.lead.email` etc.
- **GHL** — "Inbound Webhook" workflow trigger → map to contact fields
- **Any HTTP endpoint** — Standard POST with JSON body

## CRITICAL RULES
1. The `run` endpoint MUST stop after finding leads. Never auto-research or auto-launch.
2. Every stage transition MUST fire webhooks (if configured).
3. Every stage transition MUST log to `pipeline_activity_log`.
4. The AI Closer ONLY activates for leads that went through all 4 human gates (stage must be `messaged` or later).
5. Keep ALL existing API routes working — don't break the search, enrich, launch endpoints.
6. The stage progression MUST be enforced: found → approved → researched → outreach_approved → messaged → replied/interested/booked/closed
7. Use the existing Supabase client patterns (createClient, createServiceClientWithoutCookies).
8. Use the existing UI component library (@/components/ui/button etc.).
9. File paths are relative to the project root: /Users/steve/.openclaw/workspace/projects/kyra/
