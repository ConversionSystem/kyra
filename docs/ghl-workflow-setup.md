# GHL Workflow Setup — Kyra Email Notifications

Two workflows. About 10 minutes total.

---

## Workflow 1: New Agency Signup → Welcome Email

**Trigger:** Kyra fires a POST webhook when a new agency signs up.

### Step 1 — Create the workflow in GHL
1. Go to **Automation → Workflows → + New Workflow**
2. Name it: `Kyra — New Agency Signup`
3. Click **Add Trigger**
4. Select **Inbound Webhook**
5. Copy the **webhook URL** GHL gives you — you'll need it in a moment

### Step 2 — Build the email action
1. Click **+** → **Send Email**
2. **From:** your agency email (e.g. hello@conversionsystem.com)
3. **To:** `{{contact.email}}` or use the webhook field `{{inbound_webhook.email}}`
4. **Subject:** `Welcome to Kyra — your AI employee is almost ready 🎉`
5. **Body:** (paste below)

```
Hi {{inbound_webhook.agency_name}},

Welcome to Kyra! You're now set up as an agency owner.

Here's what to do next:
1. Add your first client → https://kyra.conversionsystem.com/agency/clients/new
2. Choose a template (we have 21 ready to go)
3. Connect their GHL account
4. Go live in under 10 minutes

Your AI employee will be handling conversations 24/7 within the hour.

Questions? Just reply to this email.

— Steve, CEO @ Kyra
```

### Step 3 — Add Kyra env var
1. Go to **Vercel → kyra project → Settings → Environment Variables**
2. Add: `SIGNUP_WEBHOOK_URL` = the GHL webhook URL from Step 1
3. Click Save → Redeploy (or wait for next deploy)

**Done.** Every new agency signup now triggers a welcome email automatically.

---

## Workflow 2: Escalation Alert → Notify Agency Owner

**Trigger:** Kyra fires a POST when a client conversation needs a human (detected by AI).

Payload includes:
```json
{
  "agency_id": "...",
  "client_id": "...",
  "client_name": "Purple Lotus",
  "contact_name": "John Smith",
  "contact_phone": "+1-555-...",
  "last_message": "I need to speak to a real person",
  "conversation_url": "https://kyra.conversionsystem.com/agency/conversations/..."
}
```

### Step 1 — Create the workflow
1. **Automation → Workflows → + New Workflow**
2. Name: `Kyra — Escalation Alert`
3. Trigger: **Inbound Webhook**
4. Copy the webhook URL

### Step 2 — Add SMS + Email notification
**Option A — SMS to agency owner (fastest)**
1. Add action: **Send SMS**
2. To: your phone number (hardcode for now, or use a contact field)
3. Body:
```
🚨 Kyra Escalation — {{inbound_webhook.client_name}}
Contact: {{inbound_webhook.contact_name}} ({{inbound_webhook.contact_phone}})
Message: "{{inbound_webhook.last_message}}"
View: {{inbound_webhook.conversation_url}}
```

**Option B — Email to agency owner**
1. Add action: **Send Email**
2. To: angel@conversionsystem.com
3. Subject: `🚨 Escalation: {{inbound_webhook.client_name}} — {{inbound_webhook.contact_name}} needs a human`
4. Body: paste the payload fields in a clean format

### Step 3 — Add Kyra env var
1. Vercel → kyra → Environment Variables
2. Add: `ESCALATION_WEBHOOK_URL` = GHL webhook URL from Step 1
3. Save → Redeploy

---

## Workflow 3 (Optional): 7-Day Onboarding Drip

Once you have the signup webhook working, you can extend Workflow 1:

1. After the welcome email, add a **Wait — 1 day** step
2. Send email: "Did you add your first client yet? Here's how..."
3. Wait 3 days
4. Send email: "Here's how your first week should look..."
5. Wait 3 days
6. Send email: "Agencies charging $1,500/mo — here's their setup"

All copy is already written in the platform at `/agency/outreach` — just paste it in.

---

## Summary

| Env Var | What it does | Where to get the URL |
|---------|-------------|----------------------|
| `SIGNUP_WEBHOOK_URL` | Welcome email on agency signup | GHL Workflow 1 → Inbound Webhook |
| `ESCALATION_WEBHOOK_URL` | Alert when client needs human | GHL Workflow 2 → Inbound Webhook |
| `SIGNUP_SLACK_URL` | (Optional) Slack ping on signup | Slack → Incoming Webhooks |

Total setup time: ~10 minutes. No Resend. No extra cost.
