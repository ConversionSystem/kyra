// ============================================================================
// GHL (GoHighLevel) Webhook Payload Types
//
// Comprehensive TypeScript types for all GHL webhook events.
// Reference: https://highlevel.stoplight.io/docs/integrations
// ============================================================================

// ---------- Common types ----------

export type GHLWebhookEventType =
  | 'InboundMessage'
  | 'OutboundMessage'
  | 'ContactCreate'
  | 'ContactUpdate'
  | 'ContactDelete'
  | 'ContactDndUpdate'
  | 'ContactTagUpdate'
  | 'OpportunityCreate'
  | 'OpportunityUpdate'
  | 'OpportunityStageUpdate'
  | 'OpportunityDelete'
  | 'OpportunityMonetaryValueUpdate'
  | 'OpportunityAssignedToUpdate'
  | 'AppointmentCreate'
  | 'AppointmentUpdate'
  | 'AppointmentDelete'
  | 'TaskCreate'
  | 'TaskUpdate'
  | 'TaskDelete'
  | 'NoteCreate'
  | 'NoteUpdate'
  | 'NoteDelete'
  | 'ConversationUnreadUpdate'
  | 'ConversationProviderUpdate'
  | 'CallCompleted'
  | 'FormSubmission'
  | 'SurveySubmission'
  | 'InvoiceCreate'
  | 'InvoiceUpdate'
  | 'InvoicePaid'
  | 'InvoiceVoided'
  | 'OrderCreate'
  | 'OrderUpdate'
  | 'PriceCreate'
  | 'PriceUpdate'
  | 'PriceDelete';

export type GHLMessageChannel =
  | 'SMS'
  | 'Email'
  | 'WhatsApp'
  | 'GMB'         // Google My Business
  | 'FB'          // Facebook Messenger
  | 'IG'          // Instagram DM
  | 'Live_Chat'
  | 'Custom'
  | string;       // GHL may add new channels

export type GHLMessageDirection = 'inbound' | 'outbound';

export type GHLMessageContentType = 'text' | 'image' | 'video' | 'audio' | 'file';

// ---------- Base webhook envelope ----------

export interface GHLWebhookPayload {
  type: GHLWebhookEventType;
  locationId: string;
  [key: string]: unknown;
}

// ---------- Message payloads ----------

export interface GHLMessagePayload extends GHLWebhookPayload {
  type: 'InboundMessage' | 'OutboundMessage';
  locationId: string;
  contactId: string;
  conversationId: string;
  messageId: string;
  body: string;
  contentType: GHLMessageContentType;
  messageType: GHLMessageChannel;
  direction: GHLMessageDirection;
  dateAdded: string;      // ISO date
  attachments?: GHLAttachment[];
  userId?: string;        // GHL user who sent (outbound)

  // Contact snapshot
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface GHLAttachment {
  url: string;
  contentType: string;
  fileName?: string;
}

// ---------- Contact payloads ----------

export interface GHLContactPayload extends GHLWebhookPayload {
  type: 'ContactCreate' | 'ContactUpdate' | 'ContactDelete';
  locationId: string;
  id: string;             // contact id
  contactId?: string;     // sometimes duplicated
  firstName?: string;
  lastName?: string;
  name?: string;          // full name
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  companyName?: string;
  website?: string;
  source?: string;
  tags?: string[];
  customFields?: GHLCustomField[];
  dateAdded?: string;
  dateUpdated?: string;
  dnd?: boolean;
  dndSettings?: GHLDndSettings;
  assignedTo?: string;    // GHL user id
}

export interface GHLContactDndPayload extends GHLWebhookPayload {
  type: 'ContactDndUpdate';
  locationId: string;
  contactId: string;
  dnd: boolean;
  dndSettings?: GHLDndSettings;
}

export interface GHLContactTagPayload extends GHLWebhookPayload {
  type: 'ContactTagUpdate';
  locationId: string;
  contactId: string;
  tags: string[];
}

export interface GHLCustomField {
  id: string;
  key?: string;
  field_key?: string;
  value: string | string[] | number | boolean;
}

export interface GHLDndSettings {
  status: 'active' | 'inactive';
  message?: string;
  code?: string;
  Call?: { status: string };
  Email?: { status: string };
  SMS?: { status: string };
  WhatsApp?: { status: string };
  GMB?: { status: string };
  FB?: { status: string };
}

// ---------- Opportunity / Pipeline payloads ----------

export interface GHLOpportunityPayload extends GHLWebhookPayload {
  type:
    | 'OpportunityCreate'
    | 'OpportunityUpdate'
    | 'OpportunityStageUpdate'
    | 'OpportunityDelete'
    | 'OpportunityMonetaryValueUpdate'
    | 'OpportunityAssignedToUpdate';
  locationId: string;
  id: string;              // opportunity id
  name: string;
  pipelineId: string;
  pipelineStageId: string;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  contactId: string;
  monetaryValue?: number;
  assignedTo?: string;
  source?: string;
  dateAdded?: string;
  dateUpdated?: string;

  // Stage change specifics
  previousStageId?: string;
  newStageId?: string;
  previousMonetaryValue?: number;
  newMonetaryValue?: number;
  previousAssignedTo?: string;
  newAssignedTo?: string;
}

// ---------- Appointment payloads ----------

export interface GHLAppointmentPayload extends GHLWebhookPayload {
  type: 'AppointmentCreate' | 'AppointmentUpdate' | 'AppointmentDelete';
  locationId: string;
  id: string;              // appointment id
  calendarId: string;
  contactId: string;
  title?: string;
  appointmentStatus: 'confirmed' | 'cancelled' | 'showed' | 'noshow' | 'invalid';
  startTime: string;       // ISO date
  endTime: string;         // ISO date
  dateAdded?: string;
  dateUpdated?: string;
  assignedUserId?: string;
  address?: string;
  notes?: string;
}

// ---------- Task payloads ----------

export interface GHLTaskPayload extends GHLWebhookPayload {
  type: 'TaskCreate' | 'TaskUpdate' | 'TaskDelete';
  locationId: string;
  id: string;
  contactId: string;
  title: string;
  body?: string;
  dueDate?: string;
  completed: boolean;
  assignedTo?: string;
  dateAdded?: string;
}

// ---------- Note payloads ----------

export interface GHLNotePayload extends GHLWebhookPayload {
  type: 'NoteCreate' | 'NoteUpdate' | 'NoteDelete';
  locationId: string;
  id: string;
  contactId: string;
  body: string;
  dateAdded?: string;
}

// ---------- Call payloads ----------

export interface GHLCallPayload extends GHLWebhookPayload {
  type: 'CallCompleted';
  locationId: string;
  contactId: string;
  callSid?: string;
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'busy' | 'no-answer' | 'failed' | 'canceled';
  duration?: number;       // seconds
  from: string;
  to: string;
  recordingUrl?: string;
  transcription?: string;
  dateAdded?: string;
}

// ---------- Conversation payloads ----------

export interface GHLConversationPayload extends GHLWebhookPayload {
  type: 'ConversationUnreadUpdate' | 'ConversationProviderUpdate';
  locationId: string;
  id: string;              // conversation id
  contactId: string;
  unreadCount?: number;
  provider?: string;
  dateUpdated?: string;
}

// ---------- Form/Survey payloads ----------

export interface GHLFormSubmissionPayload extends GHLWebhookPayload {
  type: 'FormSubmission';
  locationId: string;
  contactId: string;
  formId: string;
  formName?: string;
  data: Record<string, string>;
  dateAdded?: string;
}

export interface GHLSurveySubmissionPayload extends GHLWebhookPayload {
  type: 'SurveySubmission';
  locationId: string;
  contactId: string;
  surveyId: string;
  surveyName?: string;
  data: Record<string, string>;
  dateAdded?: string;
}

// ---------- Invoice payloads ----------

export interface GHLInvoicePayload extends GHLWebhookPayload {
  type: 'InvoiceCreate' | 'InvoiceUpdate' | 'InvoicePaid' | 'InvoiceVoided';
  locationId: string;
  id: string;
  contactId?: string;
  name: string;
  title?: string;
  status: 'draft' | 'sent' | 'paid' | 'void' | 'partially_paid';
  amountDue: number;
  currency: string;
  dueDate?: string;
  dateAdded?: string;
}

// ---------- Union type for discriminated routing ----------

export type GHLWebhookEvent =
  | GHLMessagePayload
  | GHLContactPayload
  | GHLContactDndPayload
  | GHLContactTagPayload
  | GHLOpportunityPayload
  | GHLAppointmentPayload
  | GHLTaskPayload
  | GHLNotePayload
  | GHLCallPayload
  | GHLConversationPayload
  | GHLFormSubmissionPayload
  | GHLSurveySubmissionPayload
  | GHLInvoicePayload;

// ---------- GHL Location data (for workspace bootstrap) ----------

export interface GHLLocationInfo {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  timezone?: string;
  logoUrl?: string;
  businessType?: string;
}

// ---------- GHL Webhook registration ----------

export interface GHLWebhookConfig {
  url: string;
  events: GHLWebhookEventType[];
}

export interface GHLWebhookRegistration {
  id: string;
  url: string;
  events: GHLWebhookEventType[];
  active: boolean;
  locationId: string;
  createdAt: string;
}
