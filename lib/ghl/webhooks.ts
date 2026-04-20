// ============================================================================
// GHL Webhook Registration Helpers
//
// Registers/unregisters Kyra's webhook URL with a GHL location so we receive
// inbound messages, contact changes, pipeline updates, and appointments.
// Called after a successful GHL OAuth connection.
// ============================================================================

import type { GHLWebhookEventType, GHLWebhookRegistration } from './webhook-types';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

/**
 * All webhook event types Kyra wants to receive.
 * Keep this list in sync with the route handler's switch cases.
 */
const KYRA_WEBHOOK_EVENTS: GHLWebhookEventType[] = [
  // Messages
  'InboundMessage',
  'OutboundMessage',

  // Contacts
  'ContactCreate',
  'ContactUpdate',
  'ContactDelete',
  'ContactDndUpdate',
  'ContactTagUpdate',

  // Pipeline / Opportunities
  'OpportunityCreate',
  'OpportunityUpdate',
  'OpportunityStageUpdate',
  'OpportunityMonetaryValueUpdate',
  'OpportunityAssignedToUpdate',

  // Appointments
  'AppointmentCreate',
  'AppointmentUpdate',

  // Tasks & Notes
  'TaskCreate',
  'TaskUpdate',
  'NoteCreate',

  // Conversations
  'ConversationUnreadUpdate',

  // Calls
  'CallCompleted',

  // Forms & Surveys
  'FormSubmission',
  'SurveySubmission',
];

// ---------- Public API ----------

/**
 * Register Kyra's webhook URL with a GHL location for all relevant events.
 *
 * @param accessToken - GHL OAuth access token (location-scoped)
 * @param locationId  - GHL location ID
 * @param webhookUrl  - Full URL to our webhook endpoint (e.g. https://kyra.example.com/api/webhooks/ghl)
 * @returns The created webhook registration, or null on failure
 */
export async function registerWebhooks(
  accessToken: string,
  locationId: string,
  webhookUrl: string
): Promise<GHLWebhookRegistration | null> {
  try {
    // First, clean up any existing Kyra webhooks for this location
    await unregisterWebhooks(accessToken, locationId, webhookUrl);

    const response = await fetch(`${GHL_API_BASE}/hooks/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        Version: '2021-07-28',
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: KYRA_WEBHOOK_EVENTS,
        locationId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[ghl-webhooks] Failed to register webhooks for location ${locationId}:`,
        response.status,
        errorText
      );
      return null;
    }

    const data = (await response.json()) as GHLWebhookRegistration;
    console.log(
      `[ghl-webhooks] ✅ Registered ${KYRA_WEBHOOK_EVENTS.length} events for location ${locationId}`
    );
    return data;
  } catch (error) {
    console.error('[ghl-webhooks] Registration error:', error);
    return null;
  }
}

/**
 * Unregister (delete) all Kyra webhooks for a GHL location.
 * Called on disconnect or before re-registering.
 *
 * @param accessToken - GHL OAuth access token
 * @param locationId  - GHL location ID
 * @param webhookUrl  - (Optional) Only delete webhooks matching this URL
 */
export async function unregisterWebhooks(
  accessToken: string,
  locationId: string,
  webhookUrl?: string
): Promise<void> {
  try {
    // List existing webhooks for this location
    const listResponse = await fetch(
      `${GHL_API_BASE}/hooks/?locationId=${locationId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: '2021-07-28',
        },
      }
    );

    if (!listResponse.ok) {
      console.warn(
        `[ghl-webhooks] Could not list webhooks for location ${locationId}:`,
        listResponse.status
      );
      return;
    }

    const data = (await listResponse.json()) as {
      hooks?: GHLWebhookRegistration[];
      webhooks?: GHLWebhookRegistration[];
    };
    const hooks = data.hooks ?? data.webhooks ?? [];

    // Filter to our webhooks (matching URL if provided)
    const toDelete = webhookUrl
      ? hooks.filter((h) => h.url === webhookUrl)
      : hooks; // If no URL filter, delete all (use with caution)

    for (const hook of toDelete) {
      try {
        const deleteResponse = await fetch(`${GHL_API_BASE}/hooks/${hook.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-07-28',
          },
        });

        if (deleteResponse.ok) {
          console.log(`[ghl-webhooks] Deleted webhook ${hook.id}`);
        } else {
          console.warn(
            `[ghl-webhooks] Failed to delete webhook ${hook.id}:`,
            deleteResponse.status
          );
        }
      } catch (err) {
        console.error(`[ghl-webhooks] Error deleting webhook ${hook.id}:`, err);
      }
    }

    if (toDelete.length > 0) {
      console.log(
        `[ghl-webhooks] 🗑️ Cleaned up ${toDelete.length} webhook(s) for location ${locationId}`
      );
    }
  } catch (error) {
    console.error('[ghl-webhooks] Unregister error:', error);
  }
}

/**
 * List all registered webhooks for a GHL location.
 * Useful for debugging / admin dashboards.
 */
export async function listWebhooks(
  accessToken: string,
  locationId: string
): Promise<GHLWebhookRegistration[]> {
  try {
    const response = await fetch(
      `${GHL_API_BASE}/hooks/?locationId=${locationId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: '2021-07-28',
        },
      }
    );

    if (!response.ok) return [];

    const data = (await response.json()) as {
      hooks?: GHLWebhookRegistration[];
      webhooks?: GHLWebhookRegistration[];
    };
    return data.hooks ?? data.webhooks ?? [];
  } catch {
    return [];
  }
}

/**
 * Build the full webhook URL from environment config.
 * Uses NEXT_PUBLIC_APP_URL as the base.
 * Appends GHL_WEBHOOK_SECRET as ?secret= query param if configured.
 */
export function getKyraWebhookUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com';
  const base = `${baseUrl}/api/webhooks/ghl`;
  const secret = process.env.GHL_WEBHOOK_SECRET;
  return secret ? `${base}?secret=${secret}` : base;
}
