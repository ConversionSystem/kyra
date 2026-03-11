# Springbig + Kyra: Full Technical Overview
*Saved: March 11, 2026 — Purple Lotus Delivery SMS System*

---

## The Client's Problem (In Their Words)

> "Our Onfleet notification messages have been limited — we haven't been able to personalize them or add key steps in the delivery flow. Onfleet locks message templates for cannabis operators due to carrier compliance rules. They won't budge on this."

The CEO wants delivery SMS to feel like part of the **Purple Lotus brand experience** — not generic Onfleet alerts. They want to control:
- Driver name, customer name, ETA in every message
- The exact tone and wording
- A full notification journey (packed → departed → arriving → delivered → follow-up)
- Post-delivery satisfaction scoring ("Reply 1-5")
- Future: retention and marketing messages

---

## What They Planned (and Why It Fails)

**Their proposed architecture:**
```
Onfleet event → Webhook → Zapier → Twilio → Customer SMS
```

**Why this fails:** Twilio explicitly bans cannabis in their Acceptable Use Policy. Even if it works initially, Twilio will flag and block the messages once they detect cannabis-related content. Same with every other major SMS provider:

| Provider | Cannabis SMS | Status |
|---|---|---|
| Twilio | ❌ Banned | Explicit AUP prohibition |
| Telnyx | ❌ Banned | 10DLC auto-rejected |
| GHL / Lead Connector | ❌ Banned | "Forbidden message category" |
| Plivo, Vonage, Sinch | ❌ Likely blocked | Carrier-level SHAFT filtering |
| **Springbig** | ✅ **Works** | **Built for cannabis. Handles SHAFT, 10DLC, carrier compliance natively.** |

The issue isn't the providers — it's the **carriers** (AT&T, T-Mobile, Verizon). They classify cannabis as restricted content under CTIA SHAFT rules. Springbig has carrier-direct infrastructure specifically designed to deliver cannabis transactional SMS.

---

## What Is Springbig

Springbig is the **leading cannabis CRM, loyalty, and marketing platform** — used by 1,300+ dispensaries across 28 states. Unlike Blackleaf (a raw SMS API), Springbig is a full platform with a dashboard, automations, loyalty programs, and compliance built in.

**Crucially for this project:**
- Springbig has an **API** (webhooks, sandbox, OpenAPI specs — partner access)
- Springbig has a **native Onfleet integration** (partnership since May 2020)
- Springbig handles **all carrier compliance** (10DLC, TCPA, SHAFT) automatically
- Purple Lotus may **already have a Springbig account** (very common for cannabis dispensaries)

**Website:** https://springbig.com
**Partners:** https://springbig.com/partners-integrations/

---

## Our Solution: The Architecture

We replace **Twilio** with **Springbig** and replace **Zapier** with **Kyra (OpenClaw)**. This solves both problems:
1. Cannabis compliance (Springbig handles carrier rules)
2. Full template control (Kyra renders the messages, Springbig delivers them)

### The Flow

```
┌─────────────────────────────────────────────────────┐
│                    ONFLEET                           │
│  (Delivery management — drivers, routes, tasks)     │
│                                                     │
│  Events: taskAssigned, taskStarted, taskETA,        │
│          taskArrival, taskCompleted, taskFailed      │
└────────────────┬────────────────────────────────────┘
                 │ Webhook POST (JSON payload)
                 │ Contains: driver name, customer name,
                 │ phone, ETA, tracking link, status
                 ▼
┌─────────────────────────────────────────────────────┐
│              KYRA (OpenClaw Container)               │
│       THE MESSAGING BRAIN — FULL CONTROL             │
│                                                     │
│  ┌─────────────────────────────────────────┐        │
│  │     WEBHOOK LISTENER                     │        │
│  │     POST /hooks/agent                    │        │
│  │     (OpenClaw native webhook endpoint)   │        │
│  └──────────────┬──────────────────────────┘        │
│                 │                                    │
│  ┌──────────────▼──────────────────────────┐        │
│  │     DELIVERY SMS SKILL                   │        │
│  │                                          │        │
│  │  1. Parse Onfleet event type             │        │
│  │  2. Extract variables:                   │        │
│  │     - driver name, customer name         │        │
│  │     - phone, ETA, tracking link          │        │
│  │     - delivery duration, order status    │        │
│  │  3. Select message template by event     │        │
│  │  4. Render personalized message          │        │
│  │     (Purple Lotus brand voice)           │        │
│  │  5. Call Springbig API to send SMS       │        │
│  │  6. Log to delivery timeline             │        │
│  └──────────────┬──────────────────────────┘        │
│                 │                                    │
│  ┌──────────────▼──────────────────────────┐        │
│  │     AI BRAIN (Phase 2)                   │        │
│  │  - Handle customer replies               │        │
│  │  - Escalate issues to staff              │        │
│  │  - Post-delivery follow-up               │        │
│  │  - Satisfaction scoring (Reply 1-5)      │        │
│  └─────────────────────────────────────────┘        │
└────────────────┬────────────────────────────────────┘
                 │ API call
                 │ POST Springbig API → send SMS
                 ▼
┌─────────────────────────────────────────────────────┐
│              SPRINGBIG                               │
│                                                     │
│  - Cannabis-compliant SMS delivery                  │
│  - Carrier-direct infrastructure                    │
│  - 10DLC registered                                 │
│  - SHAFT compliance handled                         │
│  - Delivery receipts back to Kyra                   │
│  - Opt-in/out management (Reply STOP)               │
│  - Bonus: loyalty, CRM, analytics                   │
└────────────────┬────────────────────────────────────┘
                 │ SMS
                 ▼
            📱 Customer receives branded Purple Lotus message
```

### How This Maps to What the Client Asked For

| Client's Proposed Architecture | Our Solution |
|---|---|
| Onfleet event occurs | ✅ Same — Onfleet handles delivery logistics |
| Onfleet webhook sends event data | ✅ Same — webhook to Kyra (not Zapier) |
| Webhook feeds into **Zapier** | ➡️ Replaced with **Kyra** (faster, unlimited, smarter) |
| Zapier triggers SMS from **Twilio** | ➡️ Replaced with **Springbig** (actually works for cannabis) |
| Custom branded message reaches customer | ✅ Same — full control over templates and brand voice |

---

## What Gets Built (Piece by Piece)

### 1. Onfleet Webhook Configuration (Already exists)

Onfleet sends webhooks on delivery events. We point them at Kyra:

**Onfleet webhook URL:** `https://{client}.gw.kyra.conversionsystem.com/hooks/agent`

OpenClaw has a **native webhook endpoint** at `POST /hooks/agent`. We enable it in `openclaw.json`:

```json
{
  "hooks": {
    "enabled": true,
    "token": "onfleet-webhook-secret-here",
    "path": "/hooks"
  }
}
```

**No custom code needed for this part.** OpenClaw handles it natively.

### 2. Delivery SMS Skill (We Build This — The Core)

This is a **Kyra Skill** — a folder with `SKILL.md` + scripts that the AI agent uses. This is where Purple Lotus gets **full control** over their messaging.

The skill contains:

- **Template engine**: 6 message templates with `{variable}` slots — fully editable by Purple Lotus
- **Event router**: Maps Onfleet events → correct template
- **Springbig API client**: Sends the rendered message via Springbig
- **Delivery log**: Records every SMS sent per order (for analytics + audit trail)

**This is what replaces Zapier.** It's faster (instant vs 15-60s Zapier polling), unlimited (no task limits), and smarter (AI can enhance messages).

### 3. Springbig Account + API Access (Client Arranges This)

Purple Lotus needs a Springbig account with API access. They need to:
1. **Sign up or confirm existing Springbig account**
2. **Request API access** from their Springbig account rep
3. **Get API key/credentials** for programmatic SMS sending
4. **Confirm transactional SMS capability** (not just marketing campaigns)

⚠️ **CRITICAL UNKNOWN — Must Confirm With Springbig:**
> Does Springbig's API support sending a specific SMS to a specific phone number on demand (transactional)? Or does it only work through their Autoconnect™ campaign system?

If Springbig's API supports direct transactional sends:
```
POST https://api.springbig.com/v1/messages
{
  "to": "+14155551234",
  "body": "Peter just left with your order! ETA: 2:42 PM.",
  "from": "PurpleLotus"
}
```
→ This is the ideal path. Kyra renders the message, Springbig delivers it.

If Springbig only supports campaign-style sends:
→ We'd need to trigger a Springbig Autoconnect™ with the event data and let Springbig render the template. This gives less control but still works.

**Purple Lotus must clarify this with Springbig before we start building.**

### 4. Springbig Onfleet Native Integration (Bonus — Optional)

Springbig and Onfleet have a native integration since 2020. This could be used for:
- **Syncing customer data** from Onfleet into Springbig's CRM
- **Loyalty point tracking** per delivery
- **Backup notifications** if Kyra is ever down

But for **template control**, we route through Kyra (that's the whole point).

---

## Message Templates (Exactly What the Client Requested)

These live in Kyra's Delivery SMS Skill — **fully editable by Purple Lotus** at any time.

### Order Packed (taskAssigned)
```
Your order is packed and staged! {driver_name} has it and will depart shortly.
Reply STOP to opt out.
```

### Driver Departed (taskStarted)
```
{driver_name} just left with your order! Estimated arrival {eta_time}.
Reply STOP to opt out.
```

### Arriving Soon (taskArrival)
```
{driver_name} is almost there — arriving in about {eta_minutes} minutes. Please have your ID ready.
Reply STOP to opt out.
```

### Delivered (taskCompleted)
```
Delivered! Your Lotus Now order arrived in {delivery_duration} minutes. How did we do? Reply 1-5.
Reply STOP to opt out.
```

### Delayed (taskDelayed — optional)
```
Heads up — your delivery is running a bit behind. New ETA: {new_eta_time}. We appreciate your patience!
Reply STOP to opt out.
```

### Failed Delivery (taskFailed — optional)
```
We weren't able to complete your delivery. Our team will reach out shortly to reschedule. Sorry for the inconvenience!
Reply STOP to opt out.
```

---

## Onfleet Webhook Events → Template Mapping

| Onfleet Event | Template | Variables Available |
|---|---|---|
| `taskAssigned` | Order Packed | driver name, customer name, phone |
| `taskStarted` | Driver Departed | driver name, ETA time, tracking link |
| `taskETA` | (update ETA internally) | new ETA |
| `taskArrival` | Arriving Soon | driver name, ETA minutes |
| `taskCompleted` | Delivered | driver name, delivery duration, customer name |
| `taskDelayed` | Delayed | new ETA time |
| `taskFailed` | Failed Delivery | — |

### Onfleet Webhook Payload (example — taskCompleted)
```json
{
  "event": "taskCompleted",
  "time": 1640995200,
  "task": {
    "id": "task_abc123",
    "status": "completed",
    "recipient": {
      "name": "John Smith",
      "phone": "+14155551234",
      "address": "752 Commercial St, San Jose, CA 95112"
    },
    "worker": {
      "id": "worker_xyz",
      "name": "Peter",
      "phone": "+14155559876"
    },
    "eta": 1640995200,
    "completionDetails": {
      "name": "Peter",
      "success": true,
      "timestamp": 1640995200
    }
  }
}
```

---

## Comparison: Their Plan vs Our Solution

| | Their Plan (Zapier + Twilio) | Our Solution (Kyra + Springbig) |
|---|---|---|
| SMS Provider | Twilio ❌ **will be blocked** | Springbig ✅ cannabis-native |
| Automation | Zapier ($50+/mo, 5-step limit, 15-60s delay) | Kyra skill (unlimited, instant, AI-powered) |
| Template Control | Manual Zapier config (fragile) | **Full control** — editable templates in Kyra |
| Personalization | Basic Zapier variable mapping | Full: driver name, ETA, duration, tracking link |
| Latency | Zapier polling: **15-60 second delay** | Webhook → instant: **~2-3 seconds** |
| Customer replies | ❌ One-way only | ✅ Two-way via Springbig + Kyra AI |
| Post-delivery follow-up | ❌ Not possible | ✅ AI-driven satisfaction + retention |
| Satisfaction scoring | ❌ Not possible | ✅ "Reply 1-5" → NPS per driver |
| Scalability | Zapier task limits (750/mo on Pro) | Unlimited (runs on dedicated VPS) |
| Cannabis compliance | ❌ Twilio will block | ✅ Springbig handles SHAFT/10DLC/TCPA |
| Analytics | ❌ None | ✅ Springbig dashboard + Kyra logs |
| Loyalty integration | ❌ None | ✅ Springbig native loyalty program |
| Cost | ~$50 Zapier + Twilio (won't work) | Springbig plan + Kyra management |
| Brand voice | Limited by Zapier | **Full control** — Purple Lotus owns every word |

---

## Springbig vs Blackleaf — As the SMS Delivery Engine

Both can replace Twilio. Here's how they compare **as the delivery layer under Kyra:**

| Factor | Blackleaf | Springbig |
|---|---|---|
| **What it is** | Raw SMS API (like cannabis Twilio) | Full CRM + loyalty + marketing platform |
| **API simplicity** | Dead simple: `POST /messages {to, body}` | API exists but is partner-restricted; must confirm transactional send capability |
| **Dashboard** | ❌ None (API only) | ✅ Full web dashboard |
| **Loyalty program** | ❌ Not included | ✅ Built-in (points, rewards, referrals) |
| **Customer segmentation** | ❌ | ✅ AI-powered smart segments |
| **Analytics** | Basic delivery receipts | Full campaign analytics + ROI |
| **Compliance** | Handles 10DLC + carrier delivery | Handles 10DLC + TCPA + SHAFT + opt-in/out management |
| **Onfleet integration** | ❌ None (must build) | ✅ Native (since 2020) |
| **Pricing transparency** | ✅ Published ($29-199/mo + per-message) | ⚠️ Custom pricing (must request quote) |
| **Developer control** | ✅ Full control, simple API | ⚠️ API access may require partnership/approval |
| **Risk** | Low — straightforward API | Medium — need to confirm transactional API capability |
| **Bonus value to client** | SMS delivery only | SMS + loyalty + CRM + analytics + push notifications |

---

## Pricing

### Springbig Cost (Purple Lotus pays directly)

Springbig pricing is **custom / quote-based**:

| Component | Estimated Range |
|---|---|
| Platform subscription | $300-$800/mo (depends on features, locations, volume) |
| SMS messages | Included in plan or per-message overage |
| 10DLC registration | Typically included |
| Loyalty program | Included in platform |
| Onfleet integration | Included |
| Setup / onboarding | May be included or $500-$1,000 one-time |

**Purple Lotus must contact Springbig for exact pricing.** If they already have a Springbig account, adding transactional SMS may just be an add-on to their existing plan.

### Kyra / Conversion System Charges

| Service | Price |
|---|---|
| **Delivery SMS Skill build** | $2,500-$4,000 (webhook listener, template engine, Springbig API integration, testing) |
| **Monthly management** | $200-$400/month (monitoring, template updates, AI tuning, support) |
| **Phase 2: AI conversation engine** | $1,500-$2,500 (two-way replies, satisfaction scoring, escalation) |
| **Or**: Bundle as Kyra premium feature | Custom |

---

## Timeline

| Phase | What | Who | Time |
|---|---|---|---|
| **Week 0** | Purple Lotus confirms Springbig account + API access | Purple Lotus + Springbig | 1-5 days |
| **Week 0** | ⚠️ Confirm: does Springbig API support transactional sends? | Purple Lotus asks Springbig | **BLOCKER** |
| **Week 1** | Build Delivery SMS Skill (template engine + Springbig API client) | Us (Conversion System) | 2-3 days |
| **Week 1** | Configure Onfleet webhooks → Kyra container | Us | 1 day |
| **Week 2** | Test all 4-6 message templates with real deliveries | Purple Lotus + us | 2 days |
| **Week 2** | Go live with delivery notifications | All | Day 10-12 |
| **— PHASE 1 LIVE: DELIVERY NOTIFICATIONS —** | | | **~2 weeks** |
| **Week 3** | Build AI reply handling (Phase 2) | Us | 3-5 days |
| **Week 3** | Build satisfaction scoring ("Reply 1-5" → NPS per driver) | Us | 2 days |
| **Week 4** | Test two-way AI conversations | Purple Lotus + us | 2 days |
| **— PHASE 2 LIVE: AI CONVERSATIONS —** | | | **~4 weeks** |

---

## ⚠️ Critical Questions for Springbig (Must Answer Before Building)

These are blockers. Purple Lotus or their Springbig rep needs to answer:

1. **Does Springbig's API support transactional SMS sends?**
   - Can we programmatically send a specific message to a specific phone number?
   - Or do all messages need to go through Autoconnect™ campaigns?

2. **What does the API look like?**
   - REST? GraphQL? Authentication method?
   - Can we get sandbox/staging API access for development?

3. **Does Springbig support inbound SMS webhooks?**
   - When a customer replies to an SMS, can Springbig forward that reply to our webhook?
   - This is required for the "Reply 1-5" satisfaction scoring and two-way AI conversations.

4. **What's the per-message cost at Purple Lotus's volume?**
   - 100-500 deliveries/day × 4 messages each = 12,000-60,000 SMS/month

5. **Can Springbig's number be branded?**
   - Can it show "Lotus Now" or "Purple Lotus" as the sender?
   - Or is it a standard 10DLC number?

6. **Does Purple Lotus already have a Springbig account?**
   - If yes, what plan are they on? Do they have API access?

**If Springbig's API does NOT support direct transactional sends**, we have two fallback options:
- **Fallback A:** Use Springbig's Autoconnect™ system — Kyra triggers automations with customer data, Springbig renders and sends. Less control over templates but still works.
- **Fallback B:** Use Blackleaf ($29-199/mo, published API, simple `POST /messages`) as the SMS delivery engine instead. Springbig can still be used for loyalty/CRM alongside.

---

## What It Is NOT

- ❌ NOT replacing Onfleet — Onfleet still handles delivery logistics (drivers, routes, tasks)
- ❌ NOT a Zapier workflow — Kyra is faster, smarter, and unlimited
- ❌ NOT a separate platform to manage — the SMS skill lives inside the existing OpenClaw container
- ❌ NOT using Twilio — Twilio will block cannabis messages

**It IS:**
- Onfleet handles deliveries (unchanged)
- Kyra (OpenClaw) is the **messaging brain** — receives events, renders branded templates, full control
- Springbig is the **SMS delivery engine** — handles carrier compliance, opt-in/out, delivery
- Purple Lotus **owns every word** of every message

---

## Future Expansion (Phase 2+)

Once core delivery notifications are working:

1. **AI-powered customer replies** — customer texts back, Kyra AI handles it conversationally
2. **Post-delivery satisfaction scoring** — "Reply 1-5" → NPS tracking per driver, per location
3. **Retention messaging** — "It's been 2 weeks since your last order. Your favorites are in stock!" (requires separate marketing consent)
4. **Two-way customer support** — customer replies → AI handles FAQ, escalates to staff
5. **Driver performance dashboard** — track satisfaction scores, delivery times, customer feedback
6. **Multi-location** — same skill, different templates per store location
7. **Springbig loyalty integration** — earn loyalty points per delivery, referral bonuses
8. **Push notifications** — Springbig offers a branded app with push (bypass carrier SMS filtering entirely)

---

## Compliance Notes

- Springbig handles 10DLC registration and carrier approval natively
- Every message MUST include "Reply STOP to opt out" (Springbig automates this)
- Springbig manages TCPA, FCC, and SHAFT compliance
- Purple Lotus needs documented opt-in consent from customers (collected at checkout or signup)
- Transactional messages (delivery updates) require opt-in only, not double opt-in
- Marketing messages (promotions, retention) require separate express consent
- Age verification (21+) required in consent flow
- Messages should be sent during appropriate hours (8am-10pm local)

---

## What Purple Lotus Needs to Do (Action Items)

1. **Confirm or set up Springbig account** — https://springbig.com
2. **Ask Springbig the 6 critical questions above** (especially: transactional API capability)
3. **Share with us:**
   - Springbig API credentials (once approved)
   - Onfleet API key (for webhook setup)
   - Approved message templates (we'll draft, they approve tone/branding)
   - Customer opt-in consent flow confirmation
4. **Review and approve message templates** — we write them in their brand voice, they sign off
5. **Test with real deliveries** — 1-2 days of live testing before full rollout
6. **Designate escalation contact** — who does the AI route issues to?

---

*Document prepared by Steve (AI CEO) for Conversion System / Kyra platform*
*Client: Purple Lotus — Paul Rivera (priv7 agency)*
*Replaces: blackleaf-kyra-sms-overview.md (Blackleaf approach — same architecture, different SMS engine)*
