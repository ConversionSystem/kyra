// ────────────────────────────────────────────────────────────────────────────
// OnFleet Dispatch System — Type Definitions
// Used by: API client, SLA calculator, route optimizer, notification gate
// ────────────────────────────────────────────────────────────────────────────

/** OnFleet task status codes */
export type OnfleetTaskStatus = 0 | 1 | 2 | 3;
// 0 = created, 1 = assigned, 2 = active (in progress), 3 = completed

/** OnFleet worker (driver) from API */
export interface OnfleetWorker {
  id: string;
  name: string;
  phone: string;
  teams: string[];
  onDuty: boolean;
  timeLastSeen: number;
  location?: [number, number]; // [lng, lat]
  activeTask?: string | null;
  tasks: string[];
  vehicle?: {
    type: string;
    description?: string;
    licensePlate?: string;
    color?: string;
  };
  metadata?: Array<{ name: string; value: string }>;
}

/** OnFleet task from API */
export interface OnfleetTask {
  id: string;
  shortId: string;
  state: OnfleetTaskStatus;
  status?: OnfleetTaskStatus; // alias — OnFleet uses 'state'
  timeCreated: number;
  timeLastModified: number;
  completeAfter?: number;
  completeBefore?: number;
  eta?: number;
  trackingURL?: string;
  worker?: string; // worker ID
  recipients: Array<{
    id: string;
    name: string;
    phone: string;
  }>;
  destination: {
    id: string;
    location: [number, number]; // [lng, lat]
    address: {
      unparsed?: string;
      number?: string;
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  completionDetails?: {
    success?: boolean;
    notes?: string;
    time?: number;
  };
  notes?: string;
  metadata?: Array<{ name: string; value: string }>;
}

/** OnFleet team from API */
export interface OnfleetTeam {
  id: string;
  name: string;
  workers: string[];
  managers: string[];
  hub?: string;
  timeCreated: number;
  timeLastModified: number;
}

/** Route optimization request */
export interface OptimizationRequest {
  workers: string[]; // worker IDs to optimize
  tasks?: string[];  // specific task IDs (optional — defaults to all unassigned)
  options?: {
    maxRouteSize?: number;
    maxAllowedDelay?: number; // seconds
    routeEnd?: 'anywhere' | 'hub' | 'worker_start';
    serviceTime?: number; // seconds per stop
  };
}

/** Route optimization result */
export interface OptimizationResult {
  success: boolean;
  workersOptimized: number;
  tasksAssigned: number;
  tasksUnassigned: number;
  estimatedCompletionTime?: number;
  error?: string;
}

/** SLA zone configuration */
export interface SlaZone {
  id: string;
  name: string;          // e.g. "Blue Zone", "Red Zone"
  zipCodes: string[];
  targetMinutes: number;  // SLA target in minutes
  priority: number;       // 1 = highest priority
  color: string;          // hex color for UI
}

/** SLA rule for automation */
export interface SlaRule {
  id: string;
  enabled: boolean;
  name: string;
  description: string;
  type: 'complete_before_override' | 'optimization_interval' | 'breach_alert' | 'driver_break';
  config: Record<string, unknown>;
}

/** Dispatch event log entry */
export interface DispatchEvent {
  id: string;
  client_id: string;
  event_type: 'optimization_run' | 'sla_breach' | 'notification_suppressed' | 'driver_break' | 'route_rebalance' | 'complete_before_set' | 'rule_execution' | 'cancellation_reopt' | 'breach_alert_sent';
  details: Record<string, unknown>;
  tasks_affected: number;
  workers_affected: number;
  created_at: string;
}

/** Dispatch configuration (stored in agency_clients.settings.dispatch) */
export interface ClientDispatchConfig {
  enabled: boolean;
  onfleetApiKey: string;
  optimizationIntervalMinutes: number; // default: 15
  zones: SlaZone[];
  rules: SlaRule[];
  notificationGate: {
    suppressOnReassign: boolean;     // suppress duplicate notifications on task reassignment
    suppressOnRouteReoptimize: boolean; // suppress when route is reoptimized
    cooldownMinutes: number;         // min time between notifications for same order
  };
  defaultSlaTotalMinutes: number;    // default: 60
  autoOptimize: boolean;             // enable cron-based auto-optimization
}

// ── Rule Engine Types ────────────────────────────────────────────────────

/** Context passed to the rule engine for evaluation */
export interface RuleExecutionContext {
  clientId: string;
  config: ClientDispatchConfig;
  trigger: 'webhook' | 'cron' | 'manual';
  eventType?: string;               // OnFleet trigger name: 'taskFailed', 'taskCreated', etc.
  triggerId?: number;               // OnFleet trigger ID: 4 = failed, 12 = created, etc.
  task?: OnfleetTask;                // The task involved (from webhook or fetch)
  webhookPayload?: unknown;          // Raw webhook payload for advanced rules
  allPendingTasks?: OnfleetTask[];   // Available during cron (batch evaluation)
  lastCancelReoptAt?: number;        // Epoch ms of last cancellation reopt (for debounce)
}

/** Result from evaluating a single rule */
export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  ruleType: SlaRule['type'];
  fired: boolean;
  action?: string;
  details?: Record<string, unknown>;
  event?: Omit<DispatchEvent, 'id' | 'created_at'>;
}

/** SLA breach alert for dashboard / webhook delivery */
export interface BreachAlert {
  taskId: string;
  taskShortId?: string;
  predictedMinutes: number;
  targetMinutes: number;
  overshootMinutes: number;
  zone?: string;
  workerName?: string;
  severity: 'warning' | 'critical';
  createdAt: string;
}

/** Dispatch stats summary */
export interface DispatchStats {
  totalTasks24h: number;
  completedOnTime: number;
  slaBreaches: number;
  avgDeliveryMinutes: number;
  activeDrivers: number;
  optimizationRuns24h: number;
  lastOptimization?: string;
}

/** Driver status for dashboard */
export interface DriverStatus {
  id: string;
  name: string;
  onDuty: boolean;
  activeTasks: number;
  location?: [number, number];
  lastSeen: string;
  currentTaskEta?: number;
  breakEligible: boolean; // calculated from shift duration
}
