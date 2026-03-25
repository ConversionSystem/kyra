# MoltClaw vs Kyra — Competitive Analysis
*March 20, 2026 | For Angel Castro*

---

## Who They Are

**MoltClaw** = OpenClaw fork + 40 native GHL CRM skills. Built by Kollab (gokollab.com), appears to be officially endorsed by HighLevel. HQ: Dallas, TX. Currently in **free beta until end of March 2026**. Post-beta pricing: **$20/mo standard, $14/mo for beta testers**, plus token usage.

They position as "OpenClaw core + HighLevel muscle" — the production-ready bridge between the OpenClaw runtime and real business operations.

---

## What They Have That Kyra Doesn't

### 🔴 CRITICAL GAPS (they have it, we don't)

| Feature | MoltClaw | Kyra |
|---------|----------|------|
| **40 native GHL CRM skills** | ✅ Contacts, Opportunities, Calendars, Conversations, Invoices, Payments, Products, Social Planner, Voice AI, Knowledge Base, Workflows, Tasks, Emails, Forms, Blogs, Funnels + 21 more | ❌ We have GHL poller + webhook + basic Private Integration token. No native skill layer. |
| **350+ API endpoints wired in** | ✅ Full CRUD on every GHL object via natural language | ❌ We hit a handful of GHL endpoints manually |
| **Propose → Confirm → Execute model** | ✅ Reads fly, writes require confirmation, per-user permissions | ❌ Our AI can execute GHL actions without confirmation guardrails |
| **Managed updates with rollback** | ✅ Per-location version tracking, backup-first upgrades, canary deployments, auto-rollback | ❌ We manually restart containers. No version tracking. No rollback. |
| **Backup & restore** | ✅ Manual + scheduled backups, pre-restore safety backups | ❌ Nothing. Container dies = data gone. |
| **Audit trails** | ✅ Every read, confirmation, channel op logged | ❌ We log conversations in Supabase but no action audit trail |
| **Multi-VM worker placement** | ✅ Scale beyond single VPS | ❌ All 65 containers on one VPS |
| **Official GHL endorsement** | ✅ Listed on gohighlevel.com/post/moltclaw-by-highlevel | ❌ We're independent, not endorsed |

### 🟡 GAPS (they have it, we have a weaker version)

| Feature | MoltClaw | Kyra |
|---------|----------|------|
| **Multi-channel** | ✅ Telegram-first, WhatsApp, SMS, email, web chat — all through GHL's messaging layer | 🟡 We have Telegram, web chat. SMS via GHL webhook. No native WhatsApp, no unified channel layer. |
| **Multi-tenant isolation** | ✅ Per-location runtime + data + memory + network isolation. Slug-based routing. | 🟡 We have per-client Docker containers but no network isolation, shared VPS. |
| **White-label** | ✅ Full custom domain + branding | 🟡 We have white-label toggle but it's half-baked (Bug #20 — branding not fully removed) |
| **Operator dashboard** | ✅ Health endpoints, per-location stats, capacity monitoring | 🟡 We have VPS health check script but no real-time operator dashboard |

---

## What Kyra Has That MoltClaw Doesn't

### 🟢 KYRA ADVANTAGES

| Feature | Kyra | MoltClaw |
|---------|------|----------|
| **AI Website Builder** | ✅ 28 section templates, 25 industry recipes, AI content generation, auto-deploy | ❌ No website builder at all |
| **Template gallery + visual editor** | ✅ 8 gallery presets, wizard-based creation, industry-specific designs | ❌ Not a website platform |
| **Agency dashboard** | ✅ Multi-client management, conversation inbox, analytics, credits/billing | ❌ No agency-facing dashboard (operator tools only) |
| **Client portal** | ✅ White-labeled client login with limited access | ❌ No client self-service |
| **Referral system** | ✅ Double-sided Dropbox-style referral engine with credits | ❌ No viral growth mechanism |
| **Solo free tier** | ✅ Free plan for individual businesses, captures long-tail market | ❌ $20/mo minimum, no free tier |
| **CRM built-in** | ✅ Native CRM (contacts, deals, tasks, pipelines, companies) — doesn't require GHL | ❌ 100% dependent on GHL. No GHL = no functionality. |
| **AI Workers marketplace** | ✅ 77 pre-built AI workers across 50+ industries | ❌ Generic agent, no industry-specific templates |
| **Website + AI employee bundle** | ✅ One workflow: build site → train AI → deploy → chat widget live | ❌ Agent only, no website creation |
| **Lead pipeline** | ✅ AI-powered lead discovery, outreach, follow-up engine | ❌ Not a lead gen platform |
| **Email campaigns** | ✅ Email campaign builder with templates | ❌ Uses GHL's email only |
| **Pricing flexibility** | ✅ Lite $99 / Pro $299 / Scale $499 — all-in-one agency plans | ❌ $20/mo per location + token costs (cheap but thin) |

---

## The Real Threat Level

### MoltClaw is NOT a direct competitor to Kyra. Here's why:

**MoltClaw = infrastructure layer.** It's plumbing. It connects OpenClaw to GHL's API and adds operational controls (backups, rollback, audits). It does NOT build websites, does NOT have an agency dashboard, does NOT have client management, does NOT have a CRM, and does NOT have industry-specific AI workers.

**Kyra = business platform.** It's the full product agencies sell to their clients. Website + AI employee + CRM + inbox + analytics + billing + white-label portal.

They're at different layers of the stack:

```
┌─────────────────────────────────────────┐
│         AGENCY SELLS TO CLIENT          │ ← Kyra lives here
│  Website, AI Worker, CRM, Billing       │
├─────────────────────────────────────────┤
│       AGENT RUNTIME + CRM SKILLS        │ ← MoltClaw lives here
│  OpenClaw + 40 GHL skills + channels    │
├─────────────────────────────────────────┤
│            GHL PLATFORM                 │
│  Contacts, Calendars, Payments, etc.    │
└─────────────────────────────────────────┘
```

### BUT — here's the danger:

1. **MoltClaw could add a dashboard.** They're HighLevel-endorsed. If GHL builds an agency dashboard on top of MoltClaw, they replicate Kyra's layer.

2. **MoltClaw's GHL skills are better than ours.** 40 native skills vs our handful of webhooks. Any agency that needs deep GHL CRM automation will prefer MoltClaw's agent over Kyra's.

3. **MoltClaw's operational tooling is superior.** Backups, rollback, audits, canary deployments — we have none of this. For production deployments, they're more trustworthy.

4. **Price undercut.** $20/mo vs our $99/mo Lite plan. Agencies doing the math will question why Kyra costs 5x more.

---

## What We Should Do

### Immediate (this sprint)
1. **Build a GHL skill layer** — Start with the top 10 most-used GHL actions (create contact, create opportunity, book appointment, send SMS, add tag, move pipeline stage, create invoice, get conversations, create task, update contact). Wire them as OpenClaw skills so the AI agent can perform them via natural language.
2. **Add write confirmation** — Implement propose → confirm → execute for any GHL write action. This is a trust/safety feature agencies need.

### Next Sprint
3. **Build audit logging** — Log every AI action (reads + writes) to a Supabase table with timestamps, user, action, parameters, result. Surface in the dashboard as an "Activity Feed."
4. **Add backup/restore** — Before any config change, snapshot the container's `.openclaw/` directory. Allow one-click restore from the dashboard.

### Strategic
5. **Integrate MoltClaw's skill layer (or build our own)** — Long-term, we should have 40+ GHL skills too. We can build them incrementally or evaluate whether to adopt MoltClaw's open-source skill definitions.
6. **Maintain our moat** — Website builder + agency dashboard + client portal + CRM + 77 AI workers. MoltClaw doesn't compete here. Double down on what they CAN'T do.
7. **Price positioning** — We're not the cheap option. We're the "full business in a box" option. MoltClaw gives you an agent for $20/mo. Kyra gives you an entire AI business for $99/mo. The value prop is different.

---

## Summary

| Dimension | MoltClaw | Kyra | Winner |
|-----------|----------|------|--------|
| GHL CRM depth | 40 skills, 350+ endpoints | Basic webhook/poller | MoltClaw |
| Safety/guardrails | Propose-confirm-execute | None | MoltClaw |
| Operational tooling | Backups, rollback, audits, canary | Manual | MoltClaw |
| Website builder | ❌ | 28 templates, AI generation | Kyra |
| Agency dashboard | ❌ | Full multi-client management | Kyra |
| Client portal | ❌ | White-labeled self-service | Kyra |
| CRM (standalone) | ❌ (requires GHL) | Built-in | Kyra |
| Industry AI workers | ❌ | 77 pre-built | Kyra |
| Pricing | $20/mo + tokens | $99-$499/mo all-in | Depends on need |
| Distribution | GHL marketplace, 1M+ businesses | Independent, early stage | MoltClaw |
| Free tier | ❌ ($20/mo min) | Solo free tier | Kyra |

---

## DEEPER DIG — What My First Analysis Missed

### They CAN build websites
MoltClaw can create website/landing pages via natural language prompts inside GHL. It's not a template-based builder like Kyra — it's **generative**. You describe what you want, the AI builds it using GHL's funnel/page builder. This is different from our approach (template sections assembled server-side) but the end result is similar: an AI creates a website for you.

**Implication:** Our website builder advantage is weaker than I initially said. They don't have a gallery or industry recipes, but they can instruct the AI to build GHL funnel pages.

### They're VERY early
- Beta community on GoKollab has **~5 members** as of March 2026
- Free beta ends **end of March 2026** (THIS MONTH)
- From the 34-minute demo video (HighLevel Techie, March 2):
  - Course creation works but **can't edit existing courses** (import only)
  - **Funnel page creation doesn't work yet**
  - Blog posts require pre-configured blog site
  - Pricing bugs ($3700 vs $37 — currency/cents confusion)
  - Custom objects capped at 10 per location
  - Proposals have no available endpoint
  - The system can self-debug errors but users need to understand GHL platform limits
- Post-beta: **$20/mo + token costs** (with $5 OpenAI credit/mo)

### The "official endorsement" reality
- Published on gohighlevel.com/blog by Hamraj Kumar (not GHL founding team)
- HQ listed as same Dallas address as HighLevel (1801 N. Lamar St / 400 N. Saint Paul St)
- gokollab.com is HighLevel's own community platform (like their Skool alternative)
- MoltClaw is under HighLevel Inc.'s legal entity per Terms of Service
- **This appears to be an official HighLevel product**, not a third-party. Significant.

### The operational tooling may be mostly marketing
My search for technical details on their backup/restore, audit trails, rollback, and multi-VM architecture returned **zero documentation**. The gomoltclaw.ai website lists these features but:
- No screenshots of operator dashboard
- No documentation of backup/restore flows
- No technical architecture docs
- Beta has ~5 members
- The demo video shows basic CRM actions, not operational controls

**My assessment: They're selling a roadmap, not a shipped product.** The 40 CRM skills are real (demonstrated in video). The operator tooling (backups, canary deployments, multi-VM) is likely planned but not proven.

### What we should ACTUALLY worry about
1. **HighLevel making MoltClaw a first-party feature** — If GHL rolls this into their $297/mo or $497/mo plans as a native AI agent for every sub-account, every GHL agency gets it for free. That's 60K+ agencies getting AI agents without paying Kyra.
2. **The 40 CRM skills are real and working** — This is the biggest functional gap. An agency can tell the MoltClaw agent "create a contact for John Smith, add him to the Sales pipeline, and send him a welcome SMS" — and it does it. Our agent can't do that.
3. **They're inside the GHL ecosystem** — gokollab.com, gohighlevel.com blog, same legal entity. They have distribution we can't match.

### What we should NOT worry about
1. **Their website builder** — It's AI-generated GHL funnel pages, not a purpose-built website builder with templates, SEO optimization, schema markup, city pages, and growth engine. Ours is better.
2. **Their agency tooling** — They don't have a multi-client dashboard. No client portal. No conversation inbox. No analytics.
3. **Their market traction** — 5 beta members. We have 65 containers running, real paying agencies, real deployed sites.
4. **Their pricing** — $20/mo per location is cheap but thin. At 10 clients that's $200/mo with no dashboard, no website, no CRM beyond GHL. Our $99/mo includes everything.

---

## Updated Strategy

### Priority 1: Build GHL native skills (2 weeks)
Top 10 GHL actions as OpenClaw skills:
1. Create/update contact
2. Create opportunity + move pipeline stage
3. Book calendar appointment
4. Send SMS
5. Add/remove tags
6. Create invoice
7. Get conversation history
8. Create task
9. Update custom fields
10. Search contacts

Each skill needs: read (auto-execute), write (propose → confirm → execute), SKILL.md for the AI.

### Priority 2: Write confirmation flow (1 week)
Before any GHL write: AI proposes the action → user sees preview → confirms → executes.
This is the trust feature that separates demos from production.

### Priority 3: Action audit log (1 week)
Every AI action logged to `ai_action_log` table in Supabase. Visible in dashboard.
Columns: timestamp, client_id, action_type, target, parameters, result, confirmed_by.

### Priority 4: Keep shipping what they can't copy
- Website builder improvements (better templates, more designs)
- AI Workers marketplace expansion
- Lead pipeline + outreach
- Client portal enhancements
- CRM features beyond GHL

**Bottom line:** MoltClaw is HighLevel's official play into the AI agent space. It has real GHL skill depth we lack. But it's early (5 beta members, March 2026 launch), it's infrastructure-only (no business platform), and it can't match our full product stack. The threat is medium-term: if GHL makes this a first-party feature, the 60K agencies get AI agents without Kyra. We need to move fast on GHL skill depth while doubling down on everything they can't build.

---

*Analysis by Steve (AI CEO) | March 20, 2026 | Updated with deep research*
