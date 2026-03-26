// ============================================================================
// GHL Action Engine
// Propose, approve/reject, and log GHL actions with audit trail.
// ============================================================================

import { createClient } from '@/lib/supabase/server';
import { classifyRiskLevel, deriveCategory, isWriteAction, type RiskLevel } from './risk-config';

export { classifyRiskLevel } from './risk-config';

// ── Types ───────────────────────────────────────────────────────────────────

export interface ActionProposal {
  id: string;
  client_id: string;
  agency_id: string;
  action_type: string;
  action_category: string;
  risk_level: RiskLevel;
  parameters: Record<string, unknown>;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed' | 'expired';
  proposed_at: string;
  decided_at: string | null;
  decided_by: string | null;
  executed_at: string | null;
  result: Record<string, unknown> | null;
  expires_at: string;
}

export interface ActionLogEntry {
  id: string;
  client_id: string;
  agency_id: string;
  action_type: string;
  action_category: string;
  is_write: boolean;
  risk_level: RiskLevel;
  parameters: Record<string, unknown>;
  result: Record<string, unknown> | null;
  status: string;
  error_message: string | null;
  proposal_id: string | null;
  confirmed_by: string | null;
  duration_ms: number | null;
  created_at: string;
}

// ── Propose ─────────────────────────────────────────────────────────────────

export async function proposeAction(
  clientId: string,
  agencyId: string,
  actionType: string,
  params: Record<string, unknown>,
  description: string,
): Promise<{ data: ActionProposal | null; error: string | null }> {
  const supabase = await createClient();
  const riskLevel = classifyRiskLevel(actionType);
  const category = deriveCategory(actionType);

  const { data, error } = await supabase
    .from('ghl_action_proposals')
    .insert({
      client_id: clientId,
      agency_id: agencyId,
      action_type: actionType,
      action_category: category,
      risk_level: riskLevel,
      parameters: params,
      description,
    })
    .select()
    .single();

  if (error) {
    console.error('[action-engine] Failed to create proposal:', error);
    return { data: null, error: error.message };
  }

  return { data: data as ActionProposal, error: null };
}

// ── Approve ─────────────────────────────────────────────────────────────────

export async function approveAction(
  proposalId: string,
  userId: string,
): Promise<{ data: ActionProposal | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ghl_action_proposals')
    .update({
      status: 'approved',
      decided_at: new Date().toISOString(),
      decided_by: userId,
    })
    .eq('id', proposalId)
    .eq('status', 'pending')
    .select()
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Proposal not found or already decided' };
  }

  return { data: data as ActionProposal, error: null };
}

// ── Reject ──────────────────────────────────────────────────────────────────

export async function rejectAction(
  proposalId: string,
  userId: string,
): Promise<{ data: ActionProposal | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ghl_action_proposals')
    .update({
      status: 'rejected',
      decided_at: new Date().toISOString(),
      decided_by: userId,
    })
    .eq('id', proposalId)
    .eq('status', 'pending')
    .select()
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Proposal not found or already decided' };
  }

  return { data: data as ActionProposal, error: null };
}

// ── Mark Executed ───────────────────────────────────────────────────────────

export async function markProposalExecuted(
  proposalId: string,
  result: Record<string, unknown>,
  success: boolean,
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('ghl_action_proposals')
    .update({
      status: success ? 'executed' : 'failed',
      executed_at: new Date().toISOString(),
      result,
    })
    .eq('id', proposalId);
}

// ── Log Action ──────────────────────────────────────────────────────────────

export async function logAction(
  clientId: string,
  agencyId: string,
  actionType: string,
  params: Record<string, unknown>,
  result: Record<string, unknown> | null,
  status: string,
  options?: {
    proposalId?: string;
    confirmedBy?: string;
    durationMs?: number;
    errorMessage?: string;
  },
): Promise<void> {
  const supabase = await createClient();
  const riskLevel = classifyRiskLevel(actionType);
  const category = deriveCategory(actionType);

  const { error } = await supabase.from('ghl_action_log').insert({
    client_id: clientId,
    agency_id: agencyId,
    action_type: actionType,
    action_category: category,
    is_write: isWriteAction(actionType),
    risk_level: riskLevel,
    parameters: params,
    result,
    status,
    error_message: options?.errorMessage ?? null,
    proposal_id: options?.proposalId ?? null,
    confirmed_by: options?.confirmedBy ?? null,
    duration_ms: options?.durationMs ?? null,
  });

  if (error) {
    console.error('[action-engine] Failed to log action:', error);
  }
}
