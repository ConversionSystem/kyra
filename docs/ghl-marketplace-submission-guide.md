# GHL Marketplace Submission Guide
*Rewritten March 7, 2026 — reflects current platform, pricing, and brand.*

---

## ⚡ Before You Start — 15 min prep

**You need:**
- [ ] GHL Agency account with Marketplace access
- [ ] Kyra logo PNG (1024×1024) — export from /brand or use Canva
- [ ] 3–5 dashboard screenshots (checklist below)
- [ ] Support email: angel@conversionsystem.com

**Where to submit:**
→ marketplace.gohighlevel.com → Developer → Create App

---

## Step 1 — Create App in GHL Developer Portal

1. Go to: **marketplace.gohighlevel.com**
2. Click **Developer** in the top nav → **My Apps**
3. Click **+ Create App**

---

## Step 2 — App Details (copy-paste ready)

### App Name
```
Kyra — AI Workforce Platform
```

⚠️ NOT "AI Employee" — GHL has a product called "AI Employee". Avoid that phrase entirely.

### Category (Primary)
```
Agency Management
```

### Category (Secondary)
```
Automation & AI
```

### Tagline (150 chars max)
```
Deploy autonomous AI workers inside every GHL sub-account. One dashboard. Your brand. Your pricing. Zero dev work.
```

### Full Description

```
Kyra is the AI Workforce Platform built for GHL agencies.

While GoHighLevel gives you the CRM, pipeline, and messaging infrastructure — Kyra gives you autonomous AI workers that operate INSIDE every client's GHL sub-account. Each worker responds to leads, qualifies prospects, books appointments, updates the pipeline, and escalates to your team when needed — 24/7, without you lifting a finger.

━━━ WHAT KYRA DOES — AUTOMATICALLY, 24/7 ━━━

📱 Responds to every inbound SMS, Telegram, and web chat message under 60 seconds
📞 Answers and makes AI phone calls — qualifies, books, and escalates by voice
📅 Books appointments directly into GHL Calendar — no back-and-forth
🏷️ Tags and updates contacts based on real conversation context
🔥 Identifies hot leads and notifies your team instantly
🚨 Detects frustrated customers and hands off to a human automatically
📊 Logs every conversation — searchable, filterable, exportable

━━━ WHY 50+ AGENCIES CHOOSE KYRA ━━━

✅ One dashboard to manage ALL clients' AI workers — Kyra handles the infra
✅ White-label ready — deploy under your agency's brand, your domain, your colors
✅ Connects to any GHL sub-account in under 10 minutes
✅ 21 industry templates (dental, cannabis, real estate, restaurant, med spa + more)
✅ Full built-in CRM — contacts, deals, pipeline, tasks, analytics
✅ Conversation inbox — every channel in one real-time feed
✅ Review Gates — approve AI responses before they send (human-in-the-loop control)
✅ AI Sales Pipeline — automatically moves deals through stages based on conversation signals
✅ Proactive automations — schedule follow-ups, send check-ins, trigger workflows automatically
✅ Voice AI — inbound answering + outbound campaigns (Vapi & Twilio supported)
✅ Chat Widget — embed on any website, no GHL required

━━━ HOW IT WORKS ━━━

1. Install Kyra from the GHL Marketplace
2. Connect any GHL sub-account (10 minutes, no code)
3. Pick an industry template or build a custom AI personality
4. The AI goes live — handles all inbound and follows your rules

━━━ AGENCY REVENUE MODEL ━━━

Agencies charge clients $500–$2,000/month per AI worker.
At Pro ($249/mo, 10 clients billed at $997/mo): $9,970/mo revenue · $9,721/mo gross margin.
Most agencies recover their Kyra cost with a single client.

━━━ PRICING ━━━

Solo Pro: $49/mo — 1 AI worker for individual business owners
Lite: $99/mo — 3 client AI workers · 7-day free trial
Pro: $249/mo — 10 client AI workers · 7-day free trial
Scale: $499/mo — 30 client AI workers · 7-day free trial

Annual plans available (save 20%).

━━━ SUPPORT ━━━

Email: angel@conversionsystem.com
Website: kyra.conversionsystem.com
Docs: kyra.conversionsystem.com/guides
```

### Website URL
```
https://kyra.conversionsystem.com
```

### Privacy Policy URL
```
https://kyra.conversionsystem.com/privacy
```

### Terms of Service URL
```
https://kyra.conversionsystem.com/terms
```

### Support Email
```
angel@conversionsystem.com
```

---

## Step 3 — OAuth Configuration

### Install / Redirect URI
```
https://kyra.conversionsystem.com/ghl-install
```

### OAuth Callback URI
```
https://kyra.conversionsystem.com/api/ghl/callback
```

### OAuth Scopes (select ALL)
```
contacts.readonly
contacts.write
conversations.readonly
conversations.write
conversations/message.readonly
conversations/message.write
opportunities.readonly
opportunities.write
calendars.readonly
calendars.write
workflows.readonly
locations.readonly
```

---

## Step 4 — Webhook Configuration

### Webhook Endpoint
```
https://kyra.conversionsystem.com/api/webhooks/ghl
```

### Uninstall Webhook
```
https://kyra.conversionsystem.com/api/webhooks/ghl-uninstall
```

### Events to Subscribe
- [x] InboundMessage
- [x] OutboundMessage
- [x] ContactCreate
- [x] ContactUpdate
- [x] ContactDelete
- [x] ContactTagUpdate
- [x] OpportunityCreate
- [x] OpportunityUpdate
- [x] OpportunityStageUpdate
- [x] AppointmentCreate
- [x] AppointmentUpdate
- [x] ConversationUnreadUpdate
- [x] CallCompleted
- [x] FormSubmission

---

## Step 5 — Screenshots (take these from dashboard)

| # | Screen | What to show |
|---|--------|-------------|
| 1 | Mission Control | Fleet view with multiple AI workers, health scores, today's activity |
| 2 | Client Detail | AI Personality tab + test chat with real conversation |
| 3 | Conversations | Unified inbox — SMS, web chat, Telegram all in one feed |
| 4 | Voice AI | Call log with transcripts and booking confirmation |
| 5 | Billing / Revenue | Revenue potential calculator showing agency margin |

**Screenshot specs:** 1280×720 or 1920×1080 · PNG or JPG · Max 10MB each
**Tip:** Use browser at 90% zoom for more density. Hide personal emails first (Cmd+Shift+4 to crop).

---

## Step 6 — Logo

**Specs:** 1024×1024 PNG, transparent or white background.

**Quick option:**
1. Canva → Create a Logo → "K" with indigo (#4F46E5) background
2. Download as PNG 1024×1024
3. Upload to GHL

---

## Step 7 — After GHL Approval

Once GHL provides:
- `GHL_CLIENT_ID` → Vercel → kyra → Environment Variables
- `GHL_CLIENT_SECRET` → Vercel → kyra → Environment Variables

Verify these are already set:
- `GHL_REDIRECT_URI=https://kyra.conversionsystem.com/api/ghl/callback`
- Webhook URL in GHL settings: `https://kyra.conversionsystem.com/api/webhooks/ghl`

---

## Submission Checklist

**App Details**
- [ ] App Name: "Kyra — AI Workforce Platform" ✅
- [ ] Category: Agency Management + Automation & AI ✅
- [ ] Tagline (150 chars) — pasted ✅
- [ ] Full description — pasted ✅
- [ ] Website: kyra.conversionsystem.com ✅
- [ ] Privacy Policy: /privacy ✅
- [ ] Terms: /terms ✅
- [ ] Support email: angel@conversionsystem.com ✅

**OAuth**
- [ ] Install URL: /ghl-install ✅
- [ ] OAuth Callback: /api/ghl/callback ✅
- [ ] All 12 scopes selected ✅

**Webhooks**
- [ ] Webhook URL: /api/webhooks/ghl ✅
- [ ] Uninstall webhook: /api/webhooks/ghl-uninstall ✅
- [ ] All 14 events checked ✅

**Media**
- [ ] Logo 1024×1024 PNG — TODO (5 min on Canva)
- [ ] 5 screenshots — TODO (10 min in dashboard)

**Estimated time: 20–25 minutes**
**GHL review time: 3–14 business days**

---

## What Happens After Approval

1. Kyra appears in GHL Marketplace → "Agency Management" + "Automation & AI"
2. 60,000+ agencies can find and install it
3. Install → `/ghl-install` → Kyra welcome page → signup/login
4. Agencies start 7-day free trial → Stripe checkout → recurring revenue

**This is the single highest-leverage action available. Every day it's not live is free traffic we're not getting.**

---

*Updated: March 7, 2026 — Steve (AI CEO), Conversion System*
