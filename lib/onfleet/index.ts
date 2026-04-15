// ────────────────────────────────────────────────────────────────────────────
// OnFleet Dispatch System — Public API
// ────────────────────────────────────────────────────────────────────────────

export { OnfleetClient, createOnfleetClient } from './client';
export { calculateCompleteBefore, checkSlaBreach, calculateSlaStats } from './sla-calculator';
export { runOptimization } from './route-optimizer';
export { evaluateNotificationGate } from './notification-gate';
export type {
  OnfleetWorker,
  OnfleetTask,
  OnfleetTeam,
  OptimizationRequest,
  OptimizationResult,
  SlaZone,
  SlaRule,
  DispatchEvent,
  ClientDispatchConfig,
  DispatchStats,
  DriverStatus,
} from './types';
