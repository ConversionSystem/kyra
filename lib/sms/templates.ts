// ────────────────────────────────────────────────────────────────────────────
// Delivery SMS Template Engine
// Renders branded messages from Onfleet webhook data
// ────────────────────────────────────────────────────────────────────────────

import type {
  DeliveryTemplate,
  DeliveryVariables,
  OnfleetEventType,
  OnfleetWebhookPayload,
  RenderedMessage,
} from './types';

/** Default delivery templates — Purple Lotus branded */
export const DEFAULT_TEMPLATES: DeliveryTemplate[] = [
  {
    id: 'order-packed',
    event: 'taskAssigned',
    name: 'Order Packed',
    body: 'Your order is packed and staged! {driver_name} has it and will depart shortly. 🌿',
    enabled: true,
    compliance_footer: 'Reply STOP to opt out.',
  },
  {
    id: 'driver-departed',
    event: 'taskStarted',
    name: 'Driver Departed',
    body: '{driver_name} just left with your order! Estimated arrival: {eta_time}. Track here: {tracking_link}',
    enabled: true,
    compliance_footer: 'Reply STOP to opt out.',
  },
  {
    id: 'arriving-soon',
    event: 'taskArrival',
    name: 'Arriving Soon',
    body: '{driver_name} is almost there — arriving in about {eta_minutes} minutes. Please have your ID ready. 🪪',
    enabled: true,
    compliance_footer: 'Reply STOP to opt out.',
  },
  {
    id: 'delivered',
    event: 'taskCompleted',
    name: 'Delivered',
    body: 'Delivered! ✅ Your order arrived in {delivery_duration} minutes. How did we do? Reply 1-5.',
    enabled: true,
    compliance_footer: 'Reply STOP to opt out.',
  },
  {
    id: 'delayed',
    event: 'taskDelayed',
    name: 'Delayed',
    body: 'Heads up — your delivery is running a bit behind. New ETA: {new_eta_time}. We appreciate your patience! 🙏',
    enabled: true,
    compliance_footer: 'Reply STOP to opt out.',
  },
  {
    id: 'failed',
    event: 'taskFailed',
    name: 'Failed Delivery',
    body: "We weren't able to complete your delivery. Our team will reach out shortly to reschedule. Sorry for the inconvenience!",
    enabled: true,
    compliance_footer: 'Reply STOP to opt out.',
  },
];

/**
 * Maps Onfleet triggerName to our event types.
 * Onfleet uses numeric trigger IDs — we also support string names.
 */
const TRIGGER_MAP: Record<string, OnfleetEventType> = {
  // String names (from webhook triggerName field)
  taskAssigned: 'taskAssigned',
  taskStart: 'taskStarted',
  taskStarted: 'taskStarted',
  taskEta: 'taskETA',
  taskETA: 'taskETA',
  taskArrival: 'taskArrival',
  taskCompleted: 'taskCompleted',
  taskDelayed: 'taskDelayed',
  taskFailed: 'taskFailed',
  // Numeric trigger IDs (Onfleet docs)
  '6': 'taskAssigned',
  '1': 'taskStarted',
  '3': 'taskETA',
  '7': 'taskArrival',
  '2': 'taskCompleted',
  '8': 'taskDelayed',
  '4': 'taskFailed',
};

/** Extract the event type from an Onfleet webhook payload */
export function parseOnfleetEvent(payload: OnfleetWebhookPayload): OnfleetEventType | null {
  // Try triggerName first
  if (payload.triggerName && TRIGGER_MAP[payload.triggerName]) {
    return TRIGGER_MAP[payload.triggerName];
  }
  // Try triggerId
  if (payload.triggerId !== undefined && TRIGGER_MAP[String(payload.triggerId)]) {
    return TRIGGER_MAP[String(payload.triggerId)];
  }
  // Try actionContext
  if (payload.actionContext?.type && TRIGGER_MAP[payload.actionContext.type]) {
    return TRIGGER_MAP[payload.actionContext.type];
  }
  return null;
}

/** Extract delivery variables from Onfleet webhook payload */
export function extractVariables(payload: OnfleetWebhookPayload): DeliveryVariables {
  const task = payload.data?.task;
  const recipient = task?.recipients?.[0];
  const worker = task?.worker;
  const now = Date.now();

  // Calculate ETA
  const etaMs = task?.eta ? task.eta * 1000 : 0;
  const etaDate = etaMs ? new Date(etaMs) : null;
  const etaMinutes = etaMs ? Math.max(1, Math.round((etaMs - now) / 60000)) : 0;

  // Calculate delivery duration (from created to completed)
  const created = task?.timeCreated ? task.timeCreated * 1000 : 0;
  const modified = task?.timeLastModified ? task.timeLastModified * 1000 : now;
  const durationMinutes = created ? Math.round((modified - created) / 60000) : 0;

  // Format address
  const addr = task?.destination?.address;
  const address = addr?.unparsed
    || [addr?.number, addr?.street, addr?.city, addr?.state, addr?.postalCode].filter(Boolean).join(', ')
    || 'your address';

  return {
    customer_name: recipient?.name || 'Valued Customer',
    customer_phone: normalizePhone(recipient?.phone || ''),
    driver_name: worker?.name || 'Your driver',
    eta_time: etaDate ? etaDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'shortly',
    eta_minutes: etaMinutes ? String(etaMinutes) : 'a few',
    tracking_link: task?.trackingURL || '',
    delivery_duration: durationMinutes ? String(durationMinutes) : '~30',
    new_eta_time: etaDate ? etaDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'soon',
    order_id: task?.id || payload.taskId || 'unknown',
    address,
  };
}

/** Normalize phone to E.164 format */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.startsWith('+')) return phone;
  return `+${digits}`;
}

/** Find the matching template for an event */
export function findTemplate(
  event: OnfleetEventType,
  templates: DeliveryTemplate[],
): DeliveryTemplate | null {
  return templates.find((t) => t.event === event && t.enabled) || null;
}

/** Render a template with variables */
export function renderTemplate(
  template: DeliveryTemplate,
  variables: DeliveryVariables,
): string {
  let body = template.body;

  // Replace all {variable_name} placeholders
  for (const [key, value] of Object.entries(variables)) {
    body = body.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }

  // Remove tracking link text if empty
  if (!variables.tracking_link) {
    body = body.replace(/\s*Track here:\s*$/i, '');
  }

  // Append compliance footer
  if (template.compliance_footer) {
    body = `${body}\n${template.compliance_footer}`;
  }

  return body.trim();
}

/** Full pipeline: payload → rendered message (or null if no template matches) */
export function processWebhook(
  payload: OnfleetWebhookPayload,
  templates: DeliveryTemplate[],
): RenderedMessage | null {
  const event = parseOnfleetEvent(payload);
  if (!event) return null;

  const variables = extractVariables(payload);
  if (!variables.customer_phone) return null;

  const template = findTemplate(event, templates);
  if (!template) return null;

  const body = renderTemplate(template, variables);

  return {
    to: variables.customer_phone,
    body,
    templateId: template.id,
    event,
    orderId: variables.order_id,
  };
}

/**
 * Check if we're within allowed sending hours.
 * Cannabis SMS: 8am-10pm local time only (TCPA compliance).
 */
export function isWithinSendingHours(
  startHour: number,
  endHour: number,
  timezone: string,
): boolean {
  try {
    const now = new Date();
    const localHour = parseInt(
      now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }),
      10,
    );
    return localHour >= startHour && localHour < endHour;
  } catch {
    // If timezone is invalid, allow sending (fail open for transactional)
    return true;
  }
}
