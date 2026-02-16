# GoHighLevel API v2 — Reference

Base URL: `https://services.leadconnectorhq.com`

All requests require:
- `Authorization: Bearer <token>`
- `Version: 2021-07-28`
- `Content-Type: application/json`

Rate limit: ~100 requests/minute per location.

---

## Authentication

### Private Integration Token (Recommended for Single Location)
- Generated in GHL → Settings → Integrations → Private Integrations
- Static token, no refresh needed
- Scoped to specific permissions
- Use as Bearer token in Authorization header

### OAuth 2.0 (For Marketplace Apps / Multi-Location)
- Authorization Code Grant flow
- Tokens expire daily, require refresh
- Scopes control feature access
- Required for agency-level operations

### Required Scopes by Feature

| Feature | Read Scope | Write Scope |
|---------|-----------|-------------|
| Contacts | `contacts.readonly` | `contacts.write` |
| Conversations | `conversations.readonly` | `conversations.write` |
| Messages | `conversations/message.readonly` | `conversations/message.write` |
| Opportunities | `opportunities.readonly` | `opportunities.write` |
| Calendars | `calendars.readonly` | `calendars.write` |
| Calendar Events | `calendars/events.readonly` | `calendars/events.write` |
| Locations | `locations.readonly` | `locations.write` |
| Custom Fields | `locations/customFields.readonly` | `locations/customFields.write` |
| Custom Values | `locations/customValues.readonly` | `locations/customValues.write` |
| Tags | `locations/tags.readonly` | `locations/tags.write` |
| Forms | `forms.readonly` | — |
| Workflows | `contacts.write` | `contacts.write` |
| Businesses | `businesses.readonly` | `businesses.write` |

---

## Contacts

### Search Contacts
```
GET /contacts/?locationId={locationId}&query={query}&limit={limit}
```
Query matches: name, email, phone, company. Returns `{contacts: [...], meta: {total, currentPage, nextPage}}`.

Optional params: `limit` (1-100, default 20), `startAfterId`, `startAfter` (cursor pagination).

### Get Contact
```
GET /contacts/{contactId}
```
Returns full contact with all fields, tags, custom fields.

### Create Contact
```
POST /contacts/
Body: {locationId, firstName, lastName, email, phone, tags[], source, companyName, address1, city, state, country, postalCode, timezone, dnd, customFields[{id, field_value}]}
```

### Update Contact
```
PUT /contacts/{contactId}
Body: (same fields as create, only include fields to update)
```

### Upsert Contact
```
POST /contacts/upsert
Body: (same as create — matches by email/phone based on location duplicate settings)
```
Returns `{new: true/false, contact: {...}}`.

### Tags
```
POST /contacts/{contactId}/tags     Body: {tags: ["tag1", "tag2"]}
DELETE /contacts/{contactId}/tags   Body: {tags: ["tag1"]}
```

### Notes
```
GET /contacts/{contactId}/notes
POST /contacts/{contactId}/notes    Body: {body: "note text"}
PUT /contacts/{contactId}/notes/{noteId}  Body: {body: "updated"}
DELETE /contacts/{contactId}/notes/{noteId}
```

### Tasks
```
GET /contacts/{contactId}/tasks
POST /contacts/{contactId}/tasks    Body: {title, body, dueDate, completed, assignedTo}
PUT /contacts/{contactId}/tasks/{taskId}
DELETE /contacts/{contactId}/tasks/{taskId}
PUT /contacts/{contactId}/tasks/{taskId}/completed  Body: {completed: true}
```

### Campaigns & Workflows
```
POST /contacts/{contactId}/campaigns/{campaignId}       — Add to campaign
DELETE /contacts/{contactId}/campaigns/{campaignId}      — Remove from campaign
DELETE /contacts/{contactId}/campaigns/removeAll         — Remove from all campaigns
POST /contacts/{contactId}/workflow/{workflowId}         — Add to workflow
DELETE /contacts/{contactId}/workflow/{workflowId}       — Remove from workflow
```

---

## Conversations

### Search Conversations
```
GET /conversations/search?locationId={locationId}&q={query}
```

### Get Conversation
```
GET /conversations/{conversationId}
```

### Create Conversation
```
POST /conversations/
Body: {locationId, contactId}
```

### Update Conversation
```
PUT /conversations/{conversationId}
Body: {starred, unreadCount, ...}
```

---

## Messages

### Send Message (Outbound)
```
POST /conversations/messages
Body: {
  type: "SMS" | "Email" | "WhatsApp" | "GMB" | "IG" | "FB" | "Custom" | "Live_Chat",
  contactId: "...",
  message: "text body",
  // For email:
  subject: "...",
  html: "<p>HTML body</p>",
  emailFrom: "name <email>",
  // Optional:
  attachments: ["url1", "url2"],
  scheduledTimestamp: 1234567890  // Unix timestamp for scheduled send
}
```
Returns `{conversationId, messageId, message, ...}`.

### Register Inbound Message
```
POST /conversations/messages/inbound
Body: {type, contactId, message, conversationId, conversationProviderId}
```

### Upload Attachment
```
POST /conversations/messages/upload
Body: FormData with file
```

---

## Opportunities (Deals)

### Search Opportunities
```
GET /opportunities/search?location_id={locationId}&pipeline_id={pipelineId}&stage_id={stageId}&status={status}&q={query}&limit={limit}
```
Status values: `open`, `won`, `lost`, `abandoned`, `all`.

### Get Opportunity
```
GET /opportunities/{opportunityId}
```

### Create Opportunity
```
POST /opportunities
Body: {
  pipelineId, pipelineStageId, name, status,
  contactId, monetaryValue, assignedTo,
  customFields: [{id, field_value}]
}
```

### Update Opportunity
```
PUT /opportunities/{opportunityId}
Body: (same fields, only include what changed)
```

### Update Status
```
PUT /opportunities/{opportunityId}/status
Body: {status: "open" | "won" | "lost" | "abandoned"}
```

---

## Pipelines

### List Pipelines
```
GET /opportunities/pipelines?locationId={locationId}
```
Returns `{pipelines: [{id, name, stages: [{id, name, position}]}]}`.

---

## Calendars

### List Calendars
```
GET /calendars/?locationId={locationId}
```

### Get Calendar
```
GET /calendars/{calendarId}
```

### Get Free Slots
```
GET /calendars/{calendarId}/free-slots?startDate={ISO}&endDate={ISO}
```
Returns `{slots: {YYYY-MM-DD: [{start, end}]}}`. Times in UTC.

### Book Appointment
```
POST /calendars/events/appointments
Body: {
  calendarId, locationId, contactId,
  startTime: "ISO-8601",
  endTime: "ISO-8601",
  title: "...",
  appointmentStatus: "confirmed" | "new" | "showed" | "noshow" | "cancelled" | "invalid",
  address: "...",
  ignoreDateRange: false,
  toNotify: true
}
```

### List Events
```
GET /calendars/events?locationId={locationId}&startTime={ISO}&endTime={ISO}&calendarId={calendarId}
```

### Block Slot
```
POST /calendars/events/block-slots
Body: {locationId, calendarId, startTime, endTime, title, assignedUserId}
```

---

## Location

### Get Location
```
GET /locations/{locationId}
```
Returns business info, address, timezone, settings.

### Custom Fields
```
GET /locations/{locationId}/customFields
```
Returns `{customFields: [{id, name, fieldKey, dataType, position, ...}]}`.

### Custom Values
```
GET /locations/{locationId}/customValues
```

### Tags
```
GET /locations/{locationId}/tags
```
Returns `{tags: [{id, name, locationId}]}`.

---

## Webhook Events

Key events to listen for:

| Event | Trigger |
|-------|---------|
| `ContactCreate` | New contact created |
| `ContactDelete` | Contact deleted |
| `ContactDndUpdate` | DND status changed |
| `ContactTagUpdate` | Tags added/removed |
| `NoteCreate` | Note added to contact |
| `NoteDelete` | Note removed |
| `TaskCreate` | Task created |
| `TaskDelete` | Task deleted |
| `OpportunityCreate` | New deal created |
| `OpportunityDelete` | Deal deleted |
| `OpportunityStageUpdate` | Deal moved to new stage |
| `OpportunityStatusUpdate` | Deal status changed |
| `OpportunityMonetaryValueUpdate` | Deal value changed |
| `InboundMessage` | Message received |
| `OutboundMessage` | Message sent |
| `ConversationUnreadWebhook` | Unread conversation |
| `LocationUpdate` | Location settings changed |
| `CampaignStatusUpdate` | Campaign status changed |

---

## Common Patterns

### Pagination
Most list endpoints support cursor-based pagination:
- `startAfterId` — ID to start after
- `startAfter` — cursor value from previous response
- `limit` — items per page (typically 1-100)

### Custom Fields
Custom fields are set via array: `customFields: [{id: "field_id", field_value: "value"}]`.
Get field IDs from `GET /locations/{locationId}/customFields`.

### Date Formats
- Dates: `YYYY-MM-DD`
- Timestamps: ISO-8601 (`2026-02-13T10:00:00Z`)
- Some endpoints accept Unix timestamps (seconds)

### Error Responses
```json
{
  "statusCode": 422,
  "message": "Unprocessable Entity",
  "errors": [{"field": "email", "message": "Invalid email format"}]
}
```
