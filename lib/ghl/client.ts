// ============================================================================
// GHLClient — GoHighLevel REST API Client
//
// Production-ready client with:
// - Automatic token refresh on 401
// - Rate limit handling with exponential backoff
// - Typed responses for all endpoints
// - Error handling with descriptive messages
// ============================================================================

import type {
  GHLContact,
  GHLContactSearchResult,
  GHLContactUpdateData,
  GHLConversationListResult,
  GHLMessageListResult,
  GHLSendMessagePayload,
  GHLSendMessageResult,
  GHLOpportunity,
  GHLOpportunityListResult,
  GHLOpportunityUpdateData,
  GHLCalendar,
  GHLCalendarAvailability,
  GHLAppointment,
  GHLBookAppointmentPayload,
  GHLPipeline,
  GHLTokenResponse,
  GHLTriggerWorkflowResult,
  GHLMessageChannel,
} from './types';

// ── Constants ─────────────────────────────────────────────────────────────────

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_TOKEN_URL = `${GHL_API_BASE}/oauth/token`;

const MAX_RETRIES = 3;
const RATE_LIMIT_BASE_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30_000;

// ── Error Classes ─────────────────────────────────────────────────────────────

export class GHLError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: string,
  ) {
    super(message);
    this.name = 'GHLError';
  }
}

export class GHLRateLimitError extends GHLError {
  constructor(
    public retryAfterMs: number,
    responseBody?: string,
  ) {
    super(`Rate limited — retry after ${retryAfterMs}ms`, 429, responseBody);
    this.name = 'GHLRateLimitError';
  }
}

export class GHLTokenExpiredError extends GHLError {
  constructor() {
    super('Access token expired', 401);
    this.name = 'GHLTokenExpiredError';
  }
}

// ── Token Refresh Callback ────────────────────────────────────────────────────

/**
 * Called when the client refreshes the token. The consumer should
 * persist the new tokens (e.g. update the database row).
 */
export type OnTokenRefresh = (tokens: {
  accessToken: string;
  refreshToken: string;
}) => Promise<void>;

// ── Client ────────────────────────────────────────────────────────────────────

export class GHLClient {
  private accessToken: string;
  private refreshToken: string;
  private clientId: string;
  private clientSecret: string;
  private onTokenRefresh?: OnTokenRefresh;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(opts: {
    accessToken: string;
    refreshToken: string;
    clientId?: string;
    clientSecret?: string;
    onTokenRefresh?: OnTokenRefresh;
  }) {
    this.accessToken = opts.accessToken;
    this.refreshToken = opts.refreshToken;
    this.clientId = opts.clientId ?? process.env.GHL_CLIENT_ID!;
    this.clientSecret = opts.clientSecret ?? process.env.GHL_CLIENT_SECRET!;
    this.onTokenRefresh = opts.onTokenRefresh;
  }

  // ── Core HTTP ─────────────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    attempt = 1,
  ): Promise<T> {
    const url = `${GHL_API_BASE}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Version: '2021-07-28',
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    // ── 401 → Refresh token and retry ──────────────────────────────────────
    if (res.status === 401) {
      await this.refreshAccessToken();
      // Retry once after refresh
      return this.request<T>(method, path, body, attempt);
    }

    // ── 429 → Rate-limited, back off and retry ────────────────────────────
    if (res.status === 429) {
      if (attempt >= MAX_RETRIES) {
        const text = await res.text().catch(() => '');
        throw new GHLRateLimitError(0, text);
      }

      const retryAfter = res.headers.get('retry-after');
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : RATE_LIMIT_BASE_DELAY_MS * Math.pow(2, attempt - 1);

      await sleep(delayMs);
      return this.request<T>(method, path, body, attempt + 1);
    }

    // ── Other errors ──────────────────────────────────────────────────────
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new GHLError(
        `GHL API ${method} ${path} failed: ${res.status} ${res.statusText}`,
        res.status,
        text,
      );
    }

    // 204 No Content
    if (res.status === 204) {
      return {} as T;
    }

    return res.json() as Promise<T>;
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  private post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  private delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  // ── Token Refresh ──────────────────────────────────────────────────────────

  private async refreshAccessToken(): Promise<void> {
    // De-duplicate concurrent refresh calls
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._doRefresh();

    try {
      await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async _doRefresh(): Promise<void> {
    const res = await fetch(GHL_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new GHLError(
        `Token refresh failed: ${res.status}`,
        res.status,
        text,
      );
    }

    const data: GHLTokenResponse = await res.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;

    // Notify consumer so they can persist
    if (this.onTokenRefresh) {
      await this.onTokenRefresh({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONTACTS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Search contacts by query string (name, email, phone, etc.)
   */
  async searchContacts(
    query: string,
    opts?: { limit?: number; locationId?: string },
  ): Promise<GHLContactSearchResult> {
    const params = new URLSearchParams({
      query,
      limit: String(opts?.limit ?? 20),
    });
    if (opts?.locationId) params.set('locationId', opts.locationId);

    return this.get<GHLContactSearchResult>(
      `/contacts/?${params.toString()}`,
    );
  }

  /**
   * Get a single contact by ID
   */
  async getContact(contactId: string): Promise<{ contact: GHLContact }> {
    return this.get<{ contact: GHLContact }>(`/contacts/${contactId}`);
  }

  /**
   * Update a contact
   */
  async updateContact(
    contactId: string,
    data: GHLContactUpdateData,
  ): Promise<{ contact: GHLContact }> {
    return this.put<{ contact: GHLContact }>(`/contacts/${contactId}`, data);
  }

  /**
   * Add a note to a contact
   */
  async addContactNote(
    contactId: string,
    body: string,
  ): Promise<{ note: { id: string; body: string } }> {
    return this.post<{ note: { id: string; body: string } }>(
      `/contacts/${contactId}/notes`,
      { body },
    );
  }

  /**
   * Add/remove tags on a contact
   */
  async addContactTags(
    contactId: string,
    tags: string[],
  ): Promise<{ tags: string[] }> {
    return this.post<{ tags: string[] }>(`/contacts/${contactId}/tags`, {
      tags,
    });
  }

  async removeContactTag(
    contactId: string,
    tag: string,
  ): Promise<void> {
    await this.request<void>('DELETE', `/contacts/${contactId}/tags`, {
      tags: [tag],
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONVERSATIONS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get conversations for a contact
   */
  async getConversations(
    contactId: string,
    opts?: { limit?: number },
  ): Promise<GHLConversationListResult> {
    const params = new URLSearchParams({
      contactId,
      limit: String(opts?.limit ?? 20),
    });
    return this.get<GHLConversationListResult>(
      `/conversations/search?${params.toString()}`,
    );
  }

  /**
   * Get messages in a conversation
   */
  async getMessages(
    conversationId: string,
    opts?: { limit?: number; lastMessageId?: string },
  ): Promise<GHLMessageListResult> {
    const params = new URLSearchParams({
      limit: String(opts?.limit ?? 50),
    });
    if (opts?.lastMessageId) params.set('lastMessageId', opts.lastMessageId);

    return this.get<GHLMessageListResult>(
      `/conversations/${conversationId}/messages?${params.toString()}`,
    );
  }

  /**
   * Send a message (SMS, email, WhatsApp, etc.) to a contact
   */
  async sendMessage(
    contactId: string,
    channel: GHLMessageChannel,
    message: string,
    opts?: { subject?: string; html?: string; emailFrom?: string },
  ): Promise<GHLSendMessageResult> {
    const payload: GHLSendMessagePayload = {
      type: channel,
      contactId,
      message,
      ...opts,
    };

    return this.post<GHLSendMessageResult>(
      '/conversations/messages',
      payload,
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // OPPORTUNITIES (Pipeline)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * List opportunities (deals), optionally filtered by pipeline
   */
  async getOpportunities(opts?: {
    pipelineId?: string;
    stageId?: string;
    status?: string;
    contactId?: string;
    limit?: number;
    page?: number;
    locationId?: string;
  }): Promise<GHLOpportunityListResult> {
    const params = new URLSearchParams();
    if (opts?.pipelineId) params.set('pipelineId', opts.pipelineId);
    if (opts?.stageId) params.set('pipelineStageId', opts.stageId);
    if (opts?.status) params.set('status', opts.status);
    if (opts?.contactId) params.set('contactId', opts.contactId);
    if (opts?.locationId) params.set('location_id', opts.locationId);
    params.set('limit', String(opts?.limit ?? 20));
    if (opts?.page) params.set('page', String(opts.page));

    return this.get<GHLOpportunityListResult>(
      `/opportunities/search?${params.toString()}`,
    );
  }

  /**
   * Get a single opportunity
   */
  async getOpportunity(
    opportunityId: string,
  ): Promise<{ opportunity: GHLOpportunity }> {
    return this.get<{ opportunity: GHLOpportunity }>(
      `/opportunities/${opportunityId}`,
    );
  }

  /**
   * Update an opportunity (move stage, change status, etc.)
   */
  async updateOpportunity(
    opportunityId: string,
    data: GHLOpportunityUpdateData,
  ): Promise<{ opportunity: GHLOpportunity }> {
    return this.put<{ opportunity: GHLOpportunity }>(
      `/opportunities/${opportunityId}`,
      data,
    );
  }

  /**
   * Get all pipelines for the location
   */
  async getPipelines(locationId: string): Promise<{ pipelines: GHLPipeline[] }> {
    return this.get<{ pipelines: GHLPipeline[] }>(
      `/opportunities/pipelines?locationId=${locationId}`,
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CALENDAR
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * List all calendars for the location
   */
  async getCalendars(locationId: string): Promise<{ calendars: GHLCalendar[] }> {
    return this.get<{ calendars: GHLCalendar[] }>(
      `/calendars/?locationId=${locationId}`,
    );
  }

  /**
   * Get available time slots for a calendar on a given date
   */
  async getCalendarAvailability(
    calendarId: string,
    startDate: string,
    endDate?: string,
  ): Promise<GHLCalendarAvailability> {
    const params = new URLSearchParams({
      calendarId,
      startDate,
      endDate: endDate ?? startDate,
    });
    return this.get<GHLCalendarAvailability>(
      `/calendars/events/slots?${params.toString()}`,
    );
  }

  /**
   * Book an appointment
   */
  async bookAppointment(
    payload: GHLBookAppointmentPayload,
  ): Promise<{ event: GHLAppointment }> {
    return this.post<{ event: GHLAppointment }>(
      '/calendars/events/appointments',
      {
        ...payload,
        status: payload.status ?? 'confirmed',
      },
    );
  }

  /**
   * Get an appointment by ID
   */
  async getAppointment(
    appointmentId: string,
  ): Promise<{ event: GHLAppointment }> {
    return this.get<{ event: GHLAppointment }>(
      `/calendars/events/appointments/${appointmentId}`,
    );
  }

  /**
   * Cancel (delete) an appointment
   */
  async cancelAppointment(appointmentId: string): Promise<void> {
    await this.delete(`/calendars/events/appointments/${appointmentId}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WORKFLOWS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Trigger a workflow for a contact
   */
  async triggerWorkflow(
    contactId: string,
    workflowId: string,
  ): Promise<GHLTriggerWorkflowResult> {
    return this.post<GHLTriggerWorkflowResult>(
      `/contacts/${contactId}/workflow/${workflowId}`,
      {},
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
