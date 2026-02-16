---
name: ghl-crm
description: GoHighLevel CRM integration — manage contacts, conversations, opportunities, calendars, and pipelines via the GHL API v2. Use when the user asks to look up a contact, send an SMS/email, check pipeline deals, book appointments, manage tasks/notes, or interact with their GoHighLevel/HighLevel CRM in any way.
---

# GoHighLevel CRM Skill

Interact with GoHighLevel (GHL) CRM through API v2. Read/write contacts, send messages, manage deals, book appointments, and work pipelines — all from natural language.

## Setup

Two environment variables required:

| Variable | Description |
|----------|-------------|
| `GHL_API_TOKEN` | Private Integration Token (or OAuth access token) |
| `GHL_LOCATION_ID` | Sub-account/location ID (find in GHL Settings → Business Info) |

Generate a Private Integration Token: GHL Settings → Integrations → Private Integrations → Create. Select scopes for the features you need.

## Quick Reference

All calls use the helper script. Run with:

```bash
bash scripts/ghl.sh <command> [args...]
```

### Contacts

| Command | Description |
|---------|-------------|
| `contacts search "<query>"` | Search contacts by name, email, or phone |
| `contacts get <contactId>` | Get full contact details |
| `contacts create '<json>'` | Create a new contact |
| `contacts update <contactId> '<json>'` | Update contact fields |
| `contacts upsert '<json>'` | Create or update (matches by email/phone) |
| `contacts add-tags <contactId> '["tag1","tag2"]'` | Add tags to contact |
| `contacts remove-tags <contactId> '["tag1"]'` | Remove tags from contact |
| `contacts add-note <contactId> "<body>"` | Add a note |
| `contacts add-task <contactId> '<json>'` | Add a task |
| `contacts list-tasks <contactId>` | List contact's tasks |
| `contacts list-notes <contactId>` | List contact's notes |

**Create/upsert JSON fields:** `firstName`, `lastName`, `email`, `phone`, `tags[]`, `source`, `companyName`, `address1`, `city`, `state`, `country`, `postalCode`, `customFields[]` (each: `{id, field_value}`).

### Conversations & Messages

| Command | Description |
|---------|-------------|
| `conversations search "<query>"` | Search conversations |
| `conversations get <conversationId>` | Get conversation details |
| `conversations create '<json>'` | Create a new conversation |
| `messages send '<json>'` | Send SMS, email, or other message |
| `messages inbound '<json>'` | Register an inbound message |

**Send message JSON:** `{contactId, type, message}` where type is `SMS`, `Email`, `WhatsApp`, etc.
For email: include `subject`, `html` or `message`, `emailFrom`.

### Opportunities (Deals)

| Command | Description |
|---------|-------------|
| `opportunities search '<json>'` | Search opportunities (filter by pipeline, stage, status) |
| `opportunities get <opportunityId>` | Get opportunity details |
| `opportunities create '<json>'` | Create new opportunity |
| `opportunities update <opportunityId> '<json>'` | Update opportunity |
| `opportunities status <opportunityId> <status>` | Update status (open/won/lost/abandoned) |

**Create JSON fields:** `pipelineId`, `pipelineStageId`, `name`, `status`, `contactId`, `monetaryValue`, `assignedTo`, `customFields[]`.

### Pipelines

| Command | Description |
|---------|-------------|
| `pipelines list` | List all pipelines and their stages |

### Calendars & Appointments

| Command | Description |
|---------|-------------|
| `calendars list` | List all calendars |
| `calendars get <calendarId>` | Get calendar details |
| `calendars free-slots <calendarId> '<startDate>' '<endDate>'` | Get available slots |
| `calendars book '<json>'` | Book an appointment |
| `calendars events '<json>'` | List events (with filters) |

**Book JSON:** `{calendarId, contactId, startTime, endTime, title, appointmentStatus}`.
Times in ISO-8601 format.

### Location / Settings

| Command | Description |
|---------|-------------|
| `location get` | Get current location/sub-account details |
| `location custom-fields` | List all custom fields |
| `location custom-values` | List all custom values |
| `location tags` | List all tags |

## Common Workflows

### Lead Intake
1. `contacts upsert` with lead info → creates or finds contact
2. `contacts add-tags` to categorize ("new-lead", "website")
3. `opportunities create` to add to sales pipeline
4. `messages send` SMS welcome message

### Follow-up
1. `contacts search` to find the contact
2. `contacts list-notes` to review history
3. `messages send` personalized follow-up
4. `contacts add-note` to log the interaction

### Pipeline Management
1. `pipelines list` to see stages
2. `opportunities search` filtered by stage
3. `opportunities update` to move stage or update value
4. `opportunities status` to mark won/lost

### Appointment Booking
1. `calendars list` to find the right calendar
2. `calendars free-slots` for available times
3. `calendars book` to create the appointment
4. `messages send` confirmation SMS to contact

## Error Handling

- **401 Unauthorized**: Token expired or missing scopes. Check GHL_API_TOKEN and required scopes.
- **422 Unprocessable**: Invalid data format. Check required fields.
- **429 Rate Limited**: GHL limits to ~100 requests/min. The script auto-retries once after 2s.

## API Reference

For detailed endpoint specs, field definitions, and webhook events, see [references/api-reference.md](references/api-reference.md).
