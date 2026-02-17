# New Built-in Templates — February 17, 2026

## Migration: `20260217001_personal_crm_competitive_intel_templates.sql`

This migration adds **two new built-in templates** to the `agency_templates` table (with `agency_id = NULL` so they're available to all agencies).

---

### 1. 🤝 Personal CRM Assistant

**Industry:** Sales & Consulting

AI-powered relationship manager for sales professionals and consultants. Inspired by the "30-minute Personal CRM" demo — LinkedIn + Gmail import, AI scoring, prioritized outreach.

**What it configures:**
- **Personality:** Organized, proactive sales assistant that knows every contact's history
- **Contact tracking** with relationship scoring (1-10 scale)
- **Smart outreach priority** — ranked by recency, deal value, engagement
- **Follow-up drafting** — personalized messages based on conversation history
- **Meeting prep briefs** — full interaction summary before any call
- **Pipeline reporting** — weekly reports with stage distribution and forecasts

**GHL Pipeline:** Lead → Contacted → Meeting Scheduled → Proposal Sent → Negotiating → Won → Lost

**Custom Fields:** relationship_score, last_touchpoint, deal_value, source, next_action, contact_frequency, decision_maker, competitor_mentioned

**Cron Jobs:**
- Daily outreach priorities (Mon-Fri 8 AM)
- Weekly relationship report (Monday 9 AM)
- Meeting prep briefs (Mon-Fri 7 AM)
- Friday pipeline snapshot (Friday 5 PM)

**4 sample conversations** included for the preview modal.

---

### 2. 🔍 Competitive Intelligence Analyst

**Industry:** Market Intelligence

AI-powered competitive monitoring and market analysis. Tracks competitor websites, pricing, features, and positioning.

**What it configures:**
- **Personality:** Sharp market analyst, always monitoring
- **Competitor tracking** — websites, pricing, features, announcements
- **Market analysis** — trends, emerging competitors, positioning maps
- **Pricing intelligence** — comparison tables with recommendations
- **Strategic alerts** — funding rounds, acquisitions, major launches
- **Weekly intel briefs** — what changed, what it means, what to do

**GHL Pipeline:** Identified → Profiled → Active Monitoring → Threat Assessment → Response Planned → Response Executed → Archived

**Custom Fields:** competitor_name, competitor_url, threat_level, last_change_detected, pricing_tier, feature_overlap_pct, market_segment, funding_stage

**Cron Jobs:**
- Weekly competitive brief (Monday 7 AM)
- Daily competitor scan (Mon-Fri 8 AM)
- Monthly market landscape (1st of month 9 AM)
- Midweek pricing check (Wednesday 10 AM)

**4 sample conversations** included for the preview modal.

---

## UI Changes

The following files were also updated to support the new industry categories:

- `app/(dashboard)/agency/templates/page.tsx` — Added industry colors for "Sales & Consulting" (violet) and "Market Intelligence" (rose)
- `app/(dashboard)/agency/clients/new/new-client-form.tsx` — Added both industries to the industry selector dropdown and color mappings

## How to Apply

Run the migration against your Supabase instance:
```bash
supabase db push
# or
supabase migration up
```

The templates will appear automatically in the Templates page and the "New Client" template picker.
