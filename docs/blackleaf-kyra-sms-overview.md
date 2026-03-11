# Blackleaf + Kyra: Full Technical Overview
*Saved: March 10, 2026 — Purple Lotus Delivery SMS System*

---

## What Is Blackleaf (in Plain Terms)

Blackleaf is a **REST API for sending SMS** — exactly like Twilio's API, but built on carrier-direct infrastructure that doesn't block cannabis. You call their API endpoint with a phone number and message, it sends the text. You get a webhook callback with delivery status.

It's NOT a dashboard you log into. It's NOT a marketing platform. It's plumbing — an API that your code talks to.

**Website:** https://blackleaf.io
**API Docs:** https://api.blackleaf.io
**Phone:** 877-243-6658

---

## Why Not Twilio / Telnyx / GHL / Others?

Every major SMS provider blocks cannabis:

| Provider | Cannabis SMS | Status |
|---|---|---|
| Twilio | ❌ Banned | Explicit AUP prohibition |
| Telnyx | ❌ Banned | 10DLC auto-rejected for cannabis |
| GHL / Lead Connector | ❌ Banned | "Forbidden message category" |
| Sakari | ❌ Banned | "Prohibited content" |
| Plivo, Vonage, Sinch | ❌ Likely blocked | Carrier-level filtering |

**The reason:** It's not the providers — it's the **carriers** (AT&T, T-Mobile, Verizon). They classify cannabis as restricted content under CTIA SHAFT rules. Any message mentioning a cannabis brand or linking to a cannabis website gets filtered, regardless of which SMS provider sends it.

**Blackleaf is the only developer-first SMS API** (i.e., not a cannabis marketing platform) that has carrier-direct infrastructure proven to deliver cannabis transactional SMS.

---

## How It Lives Inside Kyra

This is a **Kyra Skill** — a self-contained module that runs inside each client's OpenClaw container.

### The Architecture

```
┌─────────────────────────────────────────────────────┐
│                    ONFLEET                           │
│  (Delivery management — drivers, routes, tasks)     │
│                                                     │
│  Events: taskAssigned, taskStarted, taskETA,        │
│          taskArrival, taskCompleted                  │
└────────────────┬────────────────────────────────────┘
                 │ Webhook POST (JSON payload)
                 │ Contains: driver name, customer name,
                 │ phone, ETA, tracking link, status
                 ▼
┌─────────────────────────────────────────────────────┐
│              KYRA (OpenClaw Container)               │
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
│  │  2. Extract variables (driver, ETA, etc) │        │
│  │  3. Select message template              │        │
│  │  4. Render personalized message          │        │
│  │  5. Call Blackleaf REST API              │        │
│  │  6. Log to delivery timeline             │        │
│  └──────────────┬──────────────────────────┘        │
│                 │                                    │
│  ┌──────────────▼──────────────────────────┐        │
│  │     AI BRAIN (optional)                  │        │
│  │  - Handle customer replies               │        │
│  │  - Escalate issues to staff              │        │
│  │  - Post-delivery follow-up               │        │
│  └─────────────────────────────────────────┘        │
└────────────────┬────────────────────────────────────┘
                 │ REST API call
                 │ POST https://api.blackleaf.io/v1/messages
                 │ { to: "+1...", body: "Peter just left..." }
                 ▼
┌─────────────────────────────────────────────────────┐
│              BLACKLEAF API                           │
│                                                     │
│  - Carrier-direct delivery (bypasses SHAFT filters) │
│  - 10DLC compliant                                  │
│  - Delivery receipt webhook back to Kyra             │
└────────────────┬────────────────────────────────────┘
                 │ SMS
                 ▼
            📱 Customer
```

---

## What Gets Built (Piece by Piece)

### 1. Webhook Listener (Already exists in OpenClaw)

OpenClaw has a **native webhook endpoint** at `POST /hooks/agent`. This is how external systems (like Onfleet) send events into Kyra. It's already built — we just enable it in `openclaw.json`:

```json
{
  "hooks": {
    "enabled": true,
    "token": "onfleet-webhook-secret-here",
    "path": "/hooks"
  }
}
```

Onfleet sends webhooks to: `https://{client}.gw.kyra.conversionsystem.com/hooks/agent`

**No custom code needed for this part.** OpenClaw handles it natively.

### 2. Delivery SMS Skill (We build this)

This is a **Kyra Skill** — a folder with `SKILL.md` + scripts that the AI agent uses. It contains:

- **Template engine**: 6 message templates with variable slots
- **Blackleaf API client**: Simple HTTP calls to send SMS
- **Event router**: Maps Onfleet events → correct template
- **Delivery log**: Records every SMS sent per order (Supabase table)

The skill is installed into the OpenClaw container's workspace. When a webhook arrives, the AI agent reads the event, executes the skill, and sends the SMS.

### 3. Blackleaf Account (Client sets up)

Purple Lotus signs up at blackleaf.io. They need:
- EIN number
- Business name + address
- Contact person
- Payment method

Blackleaf handles: 10DLC registration, carrier approval, compliance. Takes 2-5 business days.

They get an **API key** — that's it. We store it as an env var in the container.

---

## Message Templates (Day 1)

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
| `taskETA` | (update ETA only) | new ETA |
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

## Pricing Breakdown

### Blackleaf Cost (Purple Lotus pays directly)

| Plan | Monthly | SMS Rate | MMS Rate | 10DLC Fee |
|---|---|---|---|---|
| Basic | $29/mo | $0.05/SMS | $0.07/MMS | $99 one-time |
| **Gold** ⭐ | **$99/mo** | **$0.03/SMS** | **$0.05/MMS** | **$49 one-time** |
| Platinum | $199/mo | $0.02/SMS | $0.04/MMS | Free |

+ 10% compliance fee on all messages. Carrier fees included. No contracts.

**Cost estimates at scale:**
- 100 deliveries/day × 4 texts × 30 days = 12,000 SMS/mo → Gold: ~$396/mo
- 300 deliveries/day × 4 texts × 30 days = 36,000 SMS/mo → Gold: ~$1,188/mo
- 500 deliveries/day × 4 texts × 30 days = 60,000 SMS/mo → Platinum: ~$1,320/mo

### Kyra / Conversion System Charges

- **Setup fee**: $2,500–5,000 (one-time, covers skill build + Onfleet integration + testing)
- **Monthly management**: $200–500/month (monitoring, template updates, support)
- **Or**: Bundle into Kyra plan as premium feature

---

## Comparison: Their Plan vs Our Solution

| | Their Plan (Zapier + Twilio) | Our Solution (Kyra + Blackleaf) |
|---|---|---|
| SMS Provider | Twilio ❌ **will be blocked** | Blackleaf ✅ carrier-direct |
| Automation | Zapier ($50+/mo, 5-step limit) | Kyra skill (unlimited, faster) |
| Latency | Zapier polling (15-60s delay) | Webhook → instant (~2-3s) |
| Templates | Manual Zapier config | AI-powered, version controlled |
| Customer replies | ❌ One-way only | ✅ Two-way via Blackleaf webhooks |
| Post-delivery follow-up | ❌ Not possible | ✅ AI-driven satisfaction + retention |
| Scalability | Zapier task limits | Unlimited (runs on VPS) |
| Monthly cost | ~$50 Zapier + ??? Twilio (won't work) | $0 extra Kyra + Blackleaf usage |

---

## Timeline

| Phase | What | Time |
|---|---|---|
| **Week 1** | Purple Lotus signs up for Blackleaf, gets API key approved | 2-5 business days (Blackleaf handles) |
| **Week 1** | We build the Delivery SMS Skill (templates + Blackleaf API client) | 2-3 days |
| **Week 2** | Connect Onfleet webhooks → Kyra container | 1 day |
| **Week 2** | Test all 4+ message templates with real deliveries | 2 days |
| **Week 3** | Go live, monitor, tune | Ongoing |

---

## What It Is NOT

- ❌ NOT a separate platform they log into
- ❌ NOT a cannabis marketing tool
- ❌ NOT replacing their Onfleet
- ❌ NOT a Zapier workflow

**It IS:** A Kyra skill (code module) inside their existing OpenClaw container that listens for delivery events and sends SMS through a compliant API. The AI brain optionally handles replies and follow-ups.

---

## Future Expansion (Phase 2+)

Once the core delivery notifications are working:

1. **Post-delivery satisfaction scoring** — "Reply 1-5" → track NPS per driver
2. **Retention messaging** — "It's been 2 weeks since your last order. 15% off today?" (requires separate marketing consent)
3. **Two-way customer support** — Customer replies → AI handles FAQ, escalates to staff
4. **Multi-location** — Same skill, different templates per store location
5. **Analytics dashboard** — Delivery times, response rates, satisfaction scores in Kyra dashboard

---

## Compliance Notes

- Blackleaf handles 10DLC registration and carrier approval
- Every message MUST include "Reply STOP to opt out"
- Purple Lotus needs documented opt-in consent from customers (collected at checkout or signup)
- Transactional messages (delivery updates) require opt-in only, not double opt-in
- No marketing messages without separate marketing consent
- Age verification (21+) required in consent flow
- Messages should be sent during appropriate hours (8am-10pm local)

---

*Document prepared by Steve (AI CEO) for Conversion System / Kyra platform*
*Client: Purple Lotus — Paul Rivera (priv7 agency)*
