// ============================================================================
// GoHighLevel API Types
// Typed responses for the kyra-ghl integration
// ============================================================================

// ── Contacts ──────────────────────────────────────────────────────────────────

export interface GHLContact {
  id: string;
  locationId: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  tags: string[];
  source: string | null;
  dateAdded: string;
  dateUpdated: string;
  customFields: GHLCustomField[];
  notes?: GHLContactNote[];
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  website?: string | null;
  timezone?: string | null;
  dnd: boolean;
  dndSettings?: Record<string, { status: string; message: string }>;
}

export interface GHLCustomField {
  id: string;
  fieldKey: string;
  fieldValue: string | null;
}

export interface GHLContactNote {
  id: string;
  body: string;
  userId?: string;
  dateAdded: string;
}

export interface GHLContactSearchResult {
  contacts: GHLContact[];
  total: number;
  count: number;
}

export interface GHLContactUpdateData {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  tags?: string[];
  customFields?: { id: string; field_value: string }[];
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  dnd?: boolean;
}

// ── Conversations ─────────────────────────────────────────────────────────────

export interface GHLConversation {
  id: string;
  contactId: string;
  locationId: string;
  lastMessageBody: string;
  lastMessageDate: string;
  type: string;
  unreadCount: number;
  starred: boolean;
  dateAdded: string;
  dateUpdated: string;
}

export interface GHLMessage {
  id: string;
  conversationId: string;
  contactId: string;
  locationId: string;
  body: string;
  dateAdded: string;
  direction: 'inbound' | 'outbound';
  status: string;
  type: number;
  messageType: GHLMessageChannel;
  userId?: string;
  attachments?: string[];
}

export type GHLMessageChannel =
  | 'TYPE_SMS'
  | 'TYPE_EMAIL'
  | 'TYPE_WHATSAPP'
  | 'TYPE_FB_MESSENGER'
  | 'TYPE_INSTAGRAM'
  | 'TYPE_LIVE_CHAT'
  | 'TYPE_CALL';

export interface GHLConversationListResult {
  conversations: GHLConversation[];
  total: number;
}

export interface GHLMessageListResult {
  messages: {
    messages: GHLMessage[];
    lastMessageId?: string;
    nextPage?: boolean;
  };
}

export interface GHLSendMessagePayload {
  type: GHLMessageChannel;
  contactId: string;
  message?: string;
  subject?: string;
  html?: string;
  emailFrom?: string;
  attachments?: string[];
}

export interface GHLSendMessageResult {
  conversationId: string;
  messageId: string;
  message: GHLMessage;
}

// ── Opportunities (Pipeline) ─────────────────────────────────────────────────

export interface GHLOpportunity {
  id: string;
  name: string;
  monetaryValue: number;
  pipelineId: string;
  pipelineStageId: string;
  assignedTo: string | null;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  source: string | null;
  contactId: string;
  locationId: string;
  dateAdded: string;
  dateUpdated: string;
  lastStatusChangeAt?: string;
  contact?: GHLContact;
  notes?: string[];
  customFields?: GHLCustomField[];
}

export interface GHLPipeline {
  id: string;
  name: string;
  locationId: string;
  stages: GHLPipelineStage[];
}

export interface GHLPipelineStage {
  id: string;
  name: string;
  position: number;
}

export interface GHLOpportunityListResult {
  opportunities: GHLOpportunity[];
  meta: {
    total: number;
    currentPage: number;
    nextPage: number | null;
    previousPage: number | null;
  };
}

export interface GHLOpportunityUpdateData {
  name?: string;
  pipelineStageId?: string;
  status?: 'open' | 'won' | 'lost' | 'abandoned';
  monetaryValue?: number;
  assignedTo?: string;
  notes?: string[];
}

// ── Calendar ──────────────────────────────────────────────────────────────────

export interface GHLCalendar {
  id: string;
  locationId: string;
  name: string;
  description?: string;
  slug?: string;
  widgetSlug?: string;
  widgetType?: string;
  eventType?: string;
  slotDuration?: number;
  slotBuffer?: number;
  isActive: boolean;
}

export interface GHLCalendarSlot {
  slots: string[];
}

export interface GHLCalendarAvailability {
  [date: string]: GHLCalendarSlot;
}

export interface GHLAppointment {
  id: string;
  calendarId: string;
  locationId: string;
  contactId: string;
  title: string;
  status: 'confirmed' | 'cancelled' | 'showed' | 'noshow' | 'invalid';
  startTime: string;
  endTime: string;
  assignedUserId?: string;
  address?: string;
  notes?: string;
  dateAdded: string;
  dateUpdated: string;
}

export interface GHLBookAppointmentPayload {
  calendarId: string;
  contactId: string;
  startTime: string;
  endTime?: string;
  title?: string;
  address?: string;
  notes?: string;
  assignedUserId?: string;
  status?: 'confirmed';
}

// ── Workflows ─────────────────────────────────────────────────────────────────

export interface GHLWorkflow {
  id: string;
  name: string;
  status: string;
  locationId: string;
}

export interface GHLTriggerWorkflowResult {
  success: boolean;
}

// ── OAuth ─────────────────────────────────────────────────────────────────────

export interface GHLTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  locationId: string;
  userId?: string;
  companyId?: string;
  userType?: string;
}

// ── Errors ────────────────────────────────────────────────────────────────────

export interface GHLErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
}

// ── Webhook Events ────────────────────────────────────────────────────────────

export type GHLWebhookEventType =
  | 'InboundMessage'
  | 'OutboundMessage'
  | 'ContactCreate'
  | 'ContactUpdate'
  | 'ContactDelete'
  | 'ContactDndUpdate'
  | 'ContactTagUpdate'
  | 'NoteCreate'
  | 'NoteUpdate'
  | 'NoteDelete'
  | 'TaskCreate'
  | 'TaskComplete'
  | 'OpportunityCreate'
  | 'OpportunityUpdate'
  | 'OpportunityDelete'
  | 'OpportunityStageUpdate'
  | 'OpportunityStatusUpdate'
  | 'AppointmentCreate'
  | 'AppointmentUpdate'
  | 'AppointmentDelete';

export interface GHLWebhookPayload {
  type: GHLWebhookEventType;
  locationId: string;
  id?: string;
  contactId?: string;
  body?: string;
  direction?: 'inbound' | 'outbound';
  dateAdded?: string;
  messageType?: GHLMessageChannel;
  phone?: string;
  email?: string;
  conversationId?: string;
  // Generic data payload — varies by event type
  [key: string]: unknown;
}
