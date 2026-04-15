// ────────────────────────────────────────────────────────────────────────────
// OnFleet Dispatch System — Public API
// ────────────────────────────────────────────────────────────────────────────

export { OnfleetClient, createOnfleetClient } from './client';
export { calculateCompleteBefore, checkSlaBreach, calculateSlaStats } from './sla-calculator';
export { runOptimization } from './route-optimizer';
export { evaluateNotificationGate } from './notification-gate';
export { executeRules } from './rule-engine';
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
  RuleExecutionContext,
  RuleExecutionResult,
  BreachAlert,
} from './types';
