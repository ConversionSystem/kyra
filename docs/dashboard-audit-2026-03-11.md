# Kyra Dashboard Audit — March 11, 2026

## Executive Summary

**64 dashboard pages. 212 API routes. 2 sidebar variants (Agency / Solo).** The dashboard has grown organically and accumulated significant feature bloat. Many pages duplicate functionality, several are dead/unreachable, and the navigation structure creates confusion about where to find things.

**Core problem:** Too many features trying to be a CRM, a pipeline tool, an analytics platform, AND an AI management dashboard. Kyra's value is **AI worker management** — everything else dilutes that.

---

## Current Sidebar Structure

### Agency Sidebar (12 items)
| # | Item | Route | Section |
|---|------|-------|---------|
| 1 | Mission Control | `/agency` | — |
| 2 | Clients | `/agency/clients` | — |
| 3 | CRM | `/agency/crm/contacts` | — |
| 4 | AI Templates | `/agency/ai-setup` | AI Worker |
| 5 | AI Teams | `/agency/agents` | AI Worker |
| 6 | Channels | `/agency/channels` | AI Worker |
| 7 | Voice AI | `/agency/voice` | AI Worker |
| 8 | Automation | `/agency/autopilot` | — |
| 9 | Insights | `/agency/performance` | — |
| 10 | Billing | `/agency/billing` | Account |
| 11 | Credits | `/agency/credits` | Account |
| 12 | Referrals | `/agency/referrals` | Account |
| 13 | API Keys | `/agency/api-keys` | Account |
| 14 | Settings | `/agency/settings` | Account |

### Solo Sidebar (11 items)
Same as agency minus: AI Teams. Adds: AI Model.

### Section Nav (hidden sub-pages)
Accessible via horizontal pill navigation at the top of certain pages:
- **AI Worker:** AI Templates → AI Teams → Premium
- **Channels:** Channels → Voice AI → Chat Widget
- **Automation:** Autopilot → Pipelines → Proactive AI
- **Insights:** Performance → Token Usage → Revenue

---

## 🔴 CRITICAL ISSUES

### 1. Massive Feature Duplication

| Feature | Appears In | Verdict |
|---------|-----------|---------|
| **Conversations/Messages** | Mission Control (feed), `/agency/conversations` (standalone page), Client Detail → Conversations tab, CRM → Contacts (conversation history) | **4 places** — consolidate to Client Detail + Mission Control feed |
| **AI Personality / Templates** | `/agency/ai-setup` (sidebar), Client Detail → AI Personality tab, Client Detail → AI Capabilities tab | **3 places** — ai-setup applies templates, personality tab edits per-client, capabilities tab also edits AI behavior |
| **Channels configuration** | `/agency/channels` (sidebar), Client Detail → Channels tab | **2 places** — sidebar Channels is per-agency, Client Detail is per-client. OK but confusing |
| **Voice AI** | `/agency/voice` (sidebar), Client Detail → Voice AI tab | **2 places** — same feature |
| **Usage/Analytics** | `/agency/performance`, `/agency/usage`, `/agency/analytics`, `/agency/revenue`, Client Detail → Usage tab | **5 places** — way too fragmented |
| **Quick Answers** | Inside AI Templates page (embedded component), Standalone `/agency/quick-answers` page | **2 places** — standalone page should not exist |
| **Model Selection** | `/agency/ai-model` (solo only), Client Detail → Settings tab (has model selector) | **2 places** — OK for solo since they only have 1 client |
| **Billing/Credits** | `/agency/billing`, `/agency/credits`, `/agency/upgrade`, `/agency/plans` (redirects to billing) | **4 routes** for one concept |

### 2. Dead/Orphaned Pages (0 internal references)

These pages exist but are **unreachable** from anywhere in the UI:

| Page | What It Does | Verdict |
|------|-------------|---------|
| `/agency/budget` | Per-client budget/model controls | **DELETE** — duplicated by AI Model + client settings |
| `/agency/email-templates` | Redirect to `/agency/templates` email tab | **DELETE** — just a redirect |
| `/agency/heartbeat` | Shows heartbeat status of OpenClaw containers | **DELETE** — this is internal tooling, not customer-facing |
| `/agency/packages` | "Business in a box" package gallery | **DELETE** — never shipped, no backend |
| `/agency/pitch-generator` | Generates client pitch decks | **DELETE** — sales tool, not product feature |
| `/agency/quick-answers` | Quick Answers standalone page | **DELETE** — already embedded in AI Templates |
| `/agency/reviews` | Review management | **DELETE** — client-level feature only |

### 3. Internal/Sales Tools Masquerading as Product Features

These should NOT be in the customer dashboard:

| Page | What It Is | Verdict |
|------|-----------|---------|
| `/agency/launch-pitch` | Email pitch to Launch accelerator | **DELETE** — internal sales tool |
| `/agency/ghl-listing` | GHL Marketplace submission helper | **DELETE** — internal only |
| `/agency/biz-in-a-box` | Agency business blueprint | **MOVE** — should be a marketing page, not dashboard |
| `/agency/proposal` | Client proposal generator | **MOVE** — sales tool, could be under Leads |
| `/agency/sales-kit` | Sales materials | **DELETE** — internal only |
| `/agency/roles` | Pre-built AI role catalog | **MERGE** — belongs inside AI Templates |
| `/agency/outreach` | Email drip sequence templates | **KEEP** — useful but move under Leads |
| `/agency/leads` | Lead finder + outreach | **KEEP** — but only if agencies actually use it |

### 4. CRM is a Parallel Universe

The CRM has **14 sub-pages**: Contacts, Companies, Deals, Tasks, Tags, Segments, Intelligence, Analytics, Import, Export, Merge, Web Leads, and a command feed.

**Problem:** This is trying to compete with GHL's CRM, which agencies already use. Kyra is NOT a CRM platform. Every minute spent maintaining the CRM is a minute not spent on the AI worker experience.

**Verdict:** The CRM should be **simplified dramatically** or **removed entirely** in favor of GHL integration. At most, keep a basic Contacts view that syncs from GHL.

### 5. Automation Section is Confusing

Three overlapping concepts:
- **Autopilot** — Scheduled AI actions (cron jobs)
- **Pipelines** — Multi-step workflow builder
- **Proactive AI / Automations** — Trigger rules

These could all be **one page** called "Automation" with tabs, but they currently feel like three different products.

---

## 🟡 BRANDING ISSUES

### Inconsistencies Found
1. **Revenue page** uses old plan names: `starter: $99` should be `Lite: $99`
2. **Some pages still reference "test chat"** — per Angel's instruction, test chat should be removed
3. **Section Nav** inconsistency: some pages show it, others don't, even within the same section
4. **Dark sidebar, light content** — consistent ✅
5. **Indigo accent color** — consistently used ✅
6. **Gray-50 backgrounds** — mostly consistent ✅
7. **Card styling** — white cards with subtle borders, consistent ✅

### Branding ✅ (What's Working)
- Logo + company name in sidebar header
- Plan badge with correct color coding
- Credit badge in sidebar
- Collapsible sections for cleaner nav
- Mobile responsive sidebar with hamburger menu

---

## 🟢 WHAT'S WORKING WELL

1. **Mission Control** — Clean dashboard with real data, checklist, activity feed
2. **Clients list** — Clear card layout with status, model, activity sparkline
3. **Client Detail** — Well-organized tabbed interface (though too many tabs)
4. **AI Templates** — Beautiful gallery with apply-to-client flow
5. **Channels** — Clear setup flow with per-channel instructions
6. **Billing** — Stripe integration, plan display, upgrade flow
7. **Credits** — Clean balance view with purchase packs
8. **Settings** — Company profile, branding, persona config

---

## 📋 RECOMMENDED ACTION PLAN

### Phase 1: Remove Dead Weight (Immediate)

**DELETE these pages entirely** (no user-facing references):
- `/agency/budget`
- `/agency/email-templates`
- `/agency/heartbeat`
- `/agency/packages`
- `/agency/pitch-generator`
- `/agency/quick-answers` (standalone — keep the component embedded in AI Templates)
- `/agency/reviews` (standalone — keep client-level review features)
- `/agency/launch-pitch`
- `/agency/ghl-listing`
- `/agency/biz-in-a-box`
- `/agency/proposal`
- `/agency/sales-kit`

**That's 12 pages deleted.** 64 → 52 pages.

### Phase 2: Consolidate Duplicates (This Week)

1. **Merge Usage + Analytics + Revenue into one "Insights" page** with tabs:
   - Overview (current Performance)
   - Usage (current Token Usage)
   - Revenue (current Revenue calculator)
   - Delete `/agency/analytics` as standalone

2. **Merge Billing + Credits + Upgrade into one "Billing" page**:
   - Plan & Subscription tab
   - Credits tab
   - Upgrade section within plan tab
   - Remove `/agency/upgrade`, `/agency/plans`

3. **Merge Roles into AI Templates**:
   - Roles are just pre-built template suggestions
   - Add as a category filter in the template gallery

4. **Remove Test Chat from Client Detail**:
   - Per Angel's instruction — remove the `chat` tab entirely
   - First tab becomes "AI Personality"

5. **Simplify Automation**:
   - One page, three tabs (Autopilot | Pipelines | Triggers)
   - Not three separate pages

### Phase 3: Simplify CRM (Next Sprint)

**Option A (Recommended): Strip to essentials**
- Keep: Contacts (synced from GHL), basic activity log
- Remove: Companies, Deals Kanban, Tasks, Tags, Segments, Intelligence, Import/Export, Merge, Web Leads
- **That's 10 CRM sub-pages deleted.** These duplicate GHL.

**Option B: Remove CRM entirely**
- Replace with "Contacts" view that shows conversation participants
- All CRM work happens in GHL

### Phase 4: Clean Client Detail Tabs (Next Sprint)

Remove from Client Detail:
- **Test Chat** tab → REMOVE (per instruction)
- **SEO** tab → REMOVE (niche feature, not core to AI worker)
- **AI Capabilities** tab → MERGE into AI Personality
- **Permissions** tab → MERGE into Settings

Keep:
- AI Personality
- Settings (with model selector)
- GHL
- Usage
- Conversations
- Channels
- Client Portal
- AI Memory
- Voice AI

That's 13 → 9 tabs.

---

## Proposed Sidebar (After Cleanup)

### Agency Sidebar
```
Mission Control
Clients

▼ AI Worker
  AI Templates
  AI Teams
  Channels
  Voice AI

Automation

Insights

▼ Account
  Billing & Credits   ← merged
  API Keys
  Referrals
  Settings
```

### Solo Sidebar
```
Mission Control

▼ AI Worker
  AI Model
  AI Templates
  Channels
  Voice AI

Automation

▼ Account
  Billing & Credits   ← merged
  Referrals
  Settings
```

**Net reduction: 14 sidebar items → 11 (agency) / 10 (solo)**
**Net page reduction: 64 → ~38 pages**
**CRM: 14 sub-pages → 2-3 (if keeping) or 0 (if removing)**

---

## Summary of Changes

| Action | Count | Impact |
|--------|-------|--------|
| Delete dead pages | 12 | Less confusion, faster build times |
| Consolidate duplicates | 8 → 3 | Cleaner navigation, less maintenance |
| Simplify CRM | 14 → 3 | Focus on AI worker, not competing with GHL |
| Remove client detail tabs | 13 → 9 | Cleaner per-client experience |
| Fix branding issues | 2 | Consistent naming |
| **Total pages after cleanup** | **~38** | **41% reduction** |
