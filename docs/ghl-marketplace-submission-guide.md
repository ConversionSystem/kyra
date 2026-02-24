# GHL Marketplace Submission Guide
*Complete step-by-step. Every field. Ready to paste.*
*Built by Steve — Feb 23, 2026*

---

## ⚡ Before You Start — 15 min prep

**You need:**
- [ ] GHL Agency account with Marketplace access (you have this)
- [ ] Kyra logo PNG (1024×1024) — get from /brand or create one
- [ ] 3–5 screenshots of the Kyra dashboard (see checklist below)
- [ ] Your GHL Agency email for support contact

**Where to submit:**
→ marketplace.gohighlevel.com → Developer → Create App

---

## Step 1 — Create App in GHL Developer Portal

1. Go to: **marketplace.gohighlevel.com**
2. Click **Developer** in the top nav (or **My Apps** if you're already there)
3. Click **+ Create App**
4. Fill in the fields below (copy-paste everything)

---

## Step 2 — App Details (copy-paste ready)

### App Name
```
Kyra — AI Service Management
```

⚠️ NOT "AI Employee Platform" — GHL has a product called "AI Employee". Using that name risks rejection.

### Category (Primary)
```
Agency Management
```
*(NOT "AI & Automation" — that's GHL's territory. "Agency Management" is the gap we fill.)*

### Category (Secondary)
```
Client Reporting & Analytics
```

### Tagline / Short Description (150 chars max)
```
Manage, white-label, and monetize AI services across all your GHL sub-accounts — one dashboard, your brand, your pricing, automated billing.
```

### Full Description
*(Paste the full description from /agency/ghl-listing — it's already written and formatted)*
OR paste this:

```
Kyra is the AI Employee Platform built specifically for GHL agencies.

While GoHighLevel gives you the CRM, pipeline, and marketing infrastructure — Kyra gives you an AI employee that WORKS INSIDE every client's GHL sub-account. It responds to leads, qualifies prospects, books appointments, updates your pipeline, and escalates to humans when needed.

━━━ WHAT KYRA DOES (automatically, 24/7) ━━━

📱 Responds to every inbound SMS, WhatsApp, email, and IG message in under 60 seconds
📅 Books appointments directly in GHL Calendar — no back-and-forth
🏷️ Tags and updates contacts based on conversation context
🔥 Identifies hot leads and notifies the sales team immediately
🚨 Detects frustrated customers and escalates to a human automatically
📊 Logs every conversation — searchable, exportable, reportable

━━━ WHY AGENCIES USE KYRA ━━━

✅ One dashboard to manage ALL clients' AIs — Kyra handles the infrastructure
✅ White-label ready — deploy under your agency brand
✅ Works with any GHL sub-account in 10 minutes
✅ 21 industry templates (dental, cannabis, real estate, restaurant, med spa, and more)
✅ Full conversation logs with AI health scores and analytics
✅ Proven: built from real cannabis and restaurant deployments (pre-Kyra)

━━━ HOW IT WORKS ━━━

1. Install Kyra from the Marketplace
2. Connect any GHL sub-account in 10 minutes
3. Choose an industry template (or build custom)
4. The AI goes live — handles all inbound immediately

━━━ PRICING ━━━

Free trial: 30 days, no credit card required
Starter: $97/mo (up to 5 clients)
Pro: $247/mo (up to 15 clients)  
Scale: $497/mo (up to 50 clients)

Agencies typically charge clients $500–2,000/mo — 90%+ margin.

━━━ SUPPORT ━━━

Email: angel@conversionsystem.com
Website: kyra.conversionsystem.com
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

### Install / Redirect URI (where GHL sends users after installing)
```
https://kyra.conversionsystem.com/ghl-install
```
*This shows the Kyra welcome page → redirects to /signup/agency*

### OAuth Callback URI (after GHL OAuth authorization)
```
https://kyra.conversionsystem.com/api/ghl/callback
```

### OAuth Scopes (select ALL of these in GHL)
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

### Webhook Endpoint (GHL sends all events here)
```
https://kyra.conversionsystem.com/api/webhooks/ghl
```

### Uninstall Webhook (required for marketplace approval)
```
https://kyra.conversionsystem.com/api/webhooks/ghl-uninstall
```

### Events to Subscribe (check all of these)
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

## Step 5 — After GHL Approves the App

Once GHL gives you:
- `GHL_CLIENT_ID` — add to Vercel → kyra → Env Vars as `GHL_CLIENT_ID`
- `GHL_CLIENT_SECRET` — add to Vercel → kyra → Env Vars as `GHL_CLIENT_SECRET`
- (Verify `GHL_REDIRECT_URI=https://kyra.conversionsystem.com/api/ghl/callback` is set)

Then set the webhook URL in GHL Marketplace settings to:
```
https://kyra.conversionsystem.com/api/webhooks/ghl
```

---

## Step 6 — Screenshots (take these from the dashboard)

| Screenshot | What to show |
|-----------|-------------|
| 1. Agency Overview | The main dashboard with multiple clients, heartbeat cards, health scores |
| 2. Client Detail | The AI personality tab + test chat working |
| 3. Conversations | The conversations feed with actual messages (use test data) |
| 4. Revenue page | MRR calculator showing agency earnings |
| 5. GHL Setup | The webhook config page showing the connection |

**Screenshot specs:** 1280×720 or 1920×1080. PNG or JPG. Max 10MB each.

**How to take them:**
1. Open your Kyra dashboard (you have test data)
2. Use browser zoom 90% for more density
3. Mac: Cmd+Shift+4 to select area, or Cmd+Shift+3 for full screen
4. Hide any personal emails/phone numbers first

---

## Step 7 — Logo

**Specs:** 1024×1024 PNG, transparent or white background.

**Quick option:**
1. Go to: canva.com/create/logos
2. Use "K" with indigo (#4F46E5) background
3. Download as PNG 1024×1024
4. Upload to GHL

---

## Submission Checklist

- [ ] App Name: "Kyra — AI Employee Platform"
- [ ] Category: Automation & AI
- [ ] Short description (160 chars) — pasted ✅
- [ ] Full description — pasted ✅
- [ ] Website URL — pasted ✅
- [ ] Privacy Policy URL — /privacy ✅ (already deployed)
- [ ] Terms of Service URL — /terms ✅ (already deployed)
- [ ] Support email — pasted ✅
- [ ] Install URL — /ghl-install ✅ (just built)
- [ ] OAuth Callback URI — /api/ghl/callback ✅ (already working)
- [ ] OAuth scopes — 12 scopes listed above ✅
- [ ] Webhook URL — /api/webhooks/ghl ✅ (already working)
- [ ] Uninstall webhook — /api/webhooks/ghl-uninstall ✅ (just built)
- [ ] Webhook events — 14 events checked ✅
- [ ] Logo (1024×1024 PNG) — TODO: 5 min on Canva
- [ ] 3–5 screenshots — TODO: 10 min on your dashboard
- [ ] Submit for review

**Estimated time to complete: 20 minutes**
**GHL review time: 3–14 business days**

---

## Expected Result

Once approved:
- Kyra appears in GHL Marketplace → "AI Tools" / "Automation" category
- 60,000+ GHL agencies see it
- Agencies click "Install" → redirected to your /ghl-install page
- They sign up → 30-day trial → Stripe checkout

**This is the single highest-leverage action in this entire company right now.**
Submit today. 🚀

---

*Steve (AI CEO) — Conversion System — Feb 23, 2026*
