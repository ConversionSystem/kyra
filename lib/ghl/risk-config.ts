// ============================================================================
// GHL Action Risk Classification
// Maps action type prefixes to risk levels for the confirmation flow.
// ============================================================================

export type RiskLevel = 'low' | 'medium' | 'high';

/** Specific actions that are always high-risk regardless of prefix. */
const HIGH_RISK_EXACT = new Set([
  'create_invoice',
  'send_invoice',
  'create_estimate',
  'record_payment',
  'mark_won_lost',
  'send_email_campaign',
  'complete_task',
]);

/** Actions that are always high-risk (destructive / externally visible). */
const HIGH_RISK_PREFIXES = [
  'delete_',
  'send_',
  'payment_',
  'remove_',
  'cancel_',
  'void_',
];

/** Actions that are medium-risk (create or modify data). */
const MEDIUM_RISK_PREFIXES = [
  'create_',
  'update_',
  'add_',
  'assign_',
  'move_',
  'merge_',
  'upsert_',
];

/** Actions that are low-risk (read-only). */
const LOW_RISK_PREFIXES = [
  'get_',
  'search_',
  'list_',
  'find_',
  'count_',
  'check_',
  'fetch_',
];

/**
 * Classify the risk level of a GHL action based on its type name.
 */
export function classifyRiskLevel(actionType: string): RiskLevel {
  const lower = actionType.toLowerCase();

  if (HIGH_RISK_EXACT.has(lower)) return 'high';
  if (HIGH_RISK_PREFIXES.some(p => lower.startsWith(p))) return 'high';
  if (MEDIUM_RISK_PREFIXES.some(p => lower.startsWith(p))) return 'medium';
  if (LOW_RISK_PREFIXES.some(p => lower.startsWith(p))) return 'low';

  // Default: if we can't classify it, treat it as medium
  return 'medium';
}

/**
 * Derive the action category from the action type.
 * e.g. "create_contact" -> "contact", "send_message" -> "message"
 */
export function deriveCategory(actionType: string): string {
  const parts = actionType.toLowerCase().split('_');
  return parts.length > 1 ? parts.slice(1).join('_') : actionType;
}

/**
 * Whether an action type represents a write operation.
 */
export function isWriteAction(actionType: string): boolean {
  const lower = actionType.toLowerCase();
  return !LOW_RISK_PREFIXES.some(p => lower.startsWith(p));
}
