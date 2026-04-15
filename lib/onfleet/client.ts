// ────────────────────────────────────────────────────────────────────────────
// OnFleet REST API Client
// Wraps OnFleet's v2 API with Basic auth (API key as username, no password)
// Docs: https://docs.onfleet.com/reference
// ────────────────────────────────────────────────────────────────────────────

import type {
  OnfleetWorker,
  OnfleetTask,
  OnfleetTeam,
  OptimizationResult,
} from './types';

const ONFLEET_BASE = 'https://onfleet.com/api/v2';

export class OnfleetClient {
  private authHeader: string;

  constructor(apiKey: string) {
    // OnFleet uses Basic auth: API key as username, empty password
    this.authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${ONFLEET_BASE}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OnFleet API ${method} ${path} failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Organization ──────────────────────────────────────────────────────

  /** Validate API key by hitting the org endpoint */
  async validateKey(): Promise<boolean> {
    try {
      await this.request('GET', '/organization');
      return true;
    } catch {
      return false;
    }
  }

  // ── Workers (Drivers) ─────────────────────────────────────────────────

  /** List all workers */
  async listWorkers(): Promise<OnfleetWorker[]> {
    return this.request<OnfleetWorker[]>('GET', '/workers');
  }

  /** Get a single worker by ID */
  async getWorker(workerId: string): Promise<OnfleetWorker> {
    return this.request<OnfleetWorker>('GET', `/workers/${workerId}`);
  }

  /** Get workers currently on duty with location */
  async getActiveWorkers(): Promise<OnfleetWorker[]> {
    const workers = await this.listWorkers();
    return workers.filter((w) => w.onDuty);
  }

  // ── Tasks ─────────────────────────────────────────────────────────────

  /** List tasks (paginated — returns most recent by default) */
  async listTasks(from?: number): Promise<OnfleetTask[]> {
    const params = from ? `?from=${from}` : '';
    return this.request<OnfleetTask[]>('GET', `/tasks/all${params}`);
  }

  /** Get a single task by ID */
  async getTask(taskId: string): Promise<OnfleetTask> {
    return this.request<OnfleetTask>('GET', `/tasks/${taskId}`);
  }

  /** Update a task (PATCH) — used to set completeBefore, notes, etc. */
  async updateTask(
    taskId: string,
    updates: Partial<Pick<OnfleetTask, 'completeBefore' | 'completeAfter' | 'notes'>>,
  ): Promise<OnfleetTask> {
    return this.request<OnfleetTask>('PATCH', `/tasks/${taskId}`, updates);
  }

  /** Assign a task to a worker */
  async assignTask(taskId: string, workerId: string): Promise<OnfleetTask> {
    return this.request<OnfleetTask>('PATCH', `/tasks/${taskId}`, {
      worker: workerId,
    });
  }

  // ── Teams ─────────────────────────────────────────────────────────────

  /** List all teams */
  async listTeams(): Promise<OnfleetTeam[]> {
    return this.request<OnfleetTeam[]>('GET', '/teams');
  }

  // ── Route Optimization ────────────────────────────────────────────────

  /**
   * Trigger auto-dispatch (route optimization) for a team.
   * OnFleet assigns unassigned tasks to available workers optimally.
   * Docs: https://docs.onfleet.com/reference/automatically-dispatch-tasks
   */
  async autoAssign(teamId: string, options?: {
    maxRouteSize?: number;
    maxAllowedDelay?: number;
    serviceTime?: number;
    routeEnd?: string;
  }): Promise<OptimizationResult> {
    try {
      await this.request('POST', `/teams/${teamId}/autoDispatch`, {
        mode: 'distance',
        ...(options?.maxRouteSize && { maxTasksPerRoute: options.maxRouteSize }),
        ...(options?.maxAllowedDelay && { maxAllowedDelay: options.maxAllowedDelay }),
        ...(options?.serviceTime && { serviceTime: options.serviceTime }),
        ...(options?.routeEnd && { routeEnd: options.routeEnd }),
      });

      return {
        success: true,
        workersOptimized: 0, // OnFleet doesn't return this in the response
        tasksAssigned: 0,
        tasksUnassigned: 0,
      };
    } catch (err) {
      return {
        success: false,
        workersOptimized: 0,
        tasksAssigned: 0,
        tasksUnassigned: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  // ── Webhooks ──────────────────────────────────────────────────────────

  /** List registered webhooks */
  async listWebhooks(): Promise<Array<{ id: string; url: string; trigger: number }>> {
    return this.request('GET', '/webhooks');
  }

  /** Register a new webhook */
  async createWebhook(url: string, trigger: number): Promise<{ id: string }> {
    return this.request('POST', '/webhooks', { url, trigger });
  }

  /** Delete a webhook */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request('DELETE', `/webhooks/${webhookId}`);
  }
}

/** Create an OnFleet client from an API key */
export function createOnfleetClient(apiKey: string): OnfleetClient {
  return new OnfleetClient(apiKey);
}
