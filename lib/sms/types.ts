// ────────────────────────────────────────────────────────────────────────────
// Delivery SMS System — Type Definitions
// Used by: webhook listener, template engine, SMS providers, delivery tracker
// ────────────────────────────────────────────────────────────────────────────

/** Onfleet webhook event types we handle */
export type OnfleetEventType =
  | 'taskAssigned'
  | 'taskStarted'
  | 'taskETA'
  | 'taskArrival'
  | 'taskCompleted'
  | 'taskDelayed'
  | 'taskFailed';

/** Parsed variables extracted from an Onfleet webhook payload */
export interface DeliveryVariables {
  customer_name: string;
  customer_phone: string;
  driver_name: string;
  eta_time: string;
  eta_minutes: string;
  tracking_link: string;
  delivery_duration: string;
  new_eta_time: string;
  order_id: string;
  address: string;
}

/** A message template with variable placeholders */
export interface DeliveryTemplate {
  id: string;
  event: OnfleetEventType;
  name: string;
  body: string;             // Contains {variable_name} placeholders
  enabled: boolean;
  compliance_footer: string; // e.g. "Reply STOP to opt out."
}

/** Result of rendering a template with variables */
export interface RenderedMessage {
  to: string;               // Phone number (E.164)
  body: string;              // Fully rendered message
  templateId: string;
  event: OnfleetEventType;
  orderId: string;
}

/** SMS provider send result */
export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  provider: 'springbig' | 'blackleaf' | 'mock';
  error?: string;
  timestamp: string;
}

/** Delivery log entry (stored per SMS sent) */
export interface DeliveryLogEntry {
  id: string;
  clientId: string;
  orderId: string;
  event: OnfleetEventType;
  templateId: string;
  customerPhone: string;
  customerName: string;
  driverName: string;
  messageBody: string;
  provider: string;
  providerMessageId?: string;
  status: 'sent' | 'failed' | 'queued';
  error?: string;
  sentAt: string;
  webhookReceivedAt: string;
}

/** SMS provider interface — implementations: Springbig, Blackleaf, Mock */
export interface SmsProvider {
  name: string;
  sendMessage(msg: RenderedMessage): Promise<SmsSendResult>;
  checkHealth(): Promise<boolean>;
}

/** Client SMS configuration (stored in Supabase client settings) */
export interface ClientSmsConfig {
  enabled: boolean;
  provider: 'springbig' | 'blackleaf' | 'mock';
  providerApiKey?: string;
  providerApiUrl?: string;
  webhookSecret?: string;
  templates: DeliveryTemplate[];
  brandName: string;
  sendingHoursStart: number; // 8 (8am local)
  sendingHoursEnd: number;   // 22 (10pm local)
  timezone: string;          // e.g. "America/Los_Angeles"
}

/** Onfleet webhook payload (simplified — we extract what we need) */
export interface OnfleetWebhookPayload {
  actionContext?: {
    type?: string;
  };
  taskId?: string;
  data?: {
    task?: {
      id?: string;
      status?: number;
      recipients?: Array<{
        name?: string;
        phone?: string;
      }>;
      worker?: {
        name?: string;
        id?: string;
      };
      eta?: number;
      trackingURL?: string;
      completionDetails?: {
        success?: boolean;
        notes?: string;
      };
      destination?: {
        address?: {
          unparsed?: string;
          number?: string;
          street?: string;
          city?: string;
          state?: string;
          postalCode?: string;
        };
      };
      timeLastModified?: number;
      timeCreated?: number;
    };
  };
  time?: number;
  triggerId?: number;
  triggerName?: string;
}
