// ────────────────────────────────────────────────────────────────────────────
// Rule Execution Engine — The decision-making brain of dispatch intelligence
//
// Orchestrates all automation rules: iterates enabled rules, dispatches each
// to the appropriate evaluator, and collects results. The engine itself does
// NOT perform DB writes — callers are responsible for inserting returned events
// into dispatch_events (preserving the existing separation of concerns).
// ────────────────────────────────────────────────────────────────────────────

import { evaluateCutoffPriority } from './rules/cutoff-priority';
import { evaluateCancelReoptimize } from './rules/cancel-reoptimize';
import { evaluateBreachAlert } from './rules/breach-alerting';
import type { RuleExecutionContext, RuleExecutionResult } from './types';

/**
 * Execute all enabled automation rules for the given context.
 *
 * Called from:
 *  - Webhook receiver (single task, specific trigger)
 *  - Cron route (batch of pending tasks)
 *  - Manual optimize endpoint
 *
 * Returns an array of results — callers insert events for results where fired === true.
 */
export async function executeRules(
  ctx: RuleExecutionContext,
): Promise<RuleExecutionResult[]> {
  const rules = ctx.config.rules?.filter((r) => r.enabled) ?? [];
  if (rules.length === 0) return [];

  const results: RuleExecutionResult[] = [];

  // Evaluate rules sequentially to avoid race conditions
  // (e.g., cutoff boost sets completeBefore, then breach alerting reads it)
  for (const rule of rules) {
    try {
      let result: RuleExecutionResult;

      switch (rule.type) {
        case 'complete_before_override':
          result = await evaluateCutoffPriority(rule, ctx);
          break;
        case 'optimization_interval':
          result = await evaluateCancelReoptimize(rule, ctx);
          break;
        case 'breach_alert':
          result = await evaluateBreachAlert(rule, ctx);
          break;
        case 'driver_break':
          // P2 — not yet implemented
          result = {
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: rule.type,
            fired: false,
          };
          break;
        default:
          result = {
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: rule.type,
            fired: false,
          };
      }

      results.push(result);
    } catch (err) {
      console.error(`[rule-engine] Rule "${rule.name}" (${rule.id}) failed:`, err);
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.type,
        fired: false,
        details: { error: err instanceof Error ? err.message : 'Unknown error' },
      });
    }
  }

  return results;
}
