// ============================================================================
// Credit Engine — Balance management + deduction
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export interface CreditBalance {
  balance: number;
  lifetimePurchased: number;
  lifetimeUsed: number;
}

export interface DeductResult {
  ok: boolean;
  newBalance: number;
  insufficient: boolean;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  type: 'purchase' | 'usage' | 'refund' | 'bonus' | 'manual';
  description: string | null;
  clientId: string | null;
  createdAt: string;
}

/**
 * Get the current credit balance for an agency.
 * Auto-creates the record if it doesn't exist.
 */
export async function getAgencyCredits(agencyId: string): Promise<CreditBalance> {
  const supabase = createServiceClientWithoutCookies();

  // Upsert to ensure row exists
  const { data, error } = await supabase
    .from('agency_credits')
    .upsert({ agency_id: agencyId }, { onConflict: 'agency_id' })
    .select('balance, lifetime_purchased, lifetime_used')
    .eq('agency_id', agencyId)
    .single();

  if (error || !data) {
    // Return zero balance on error rather than crashing
    console.warn('[credit-engine] Failed to get credits:', error);
    return { balance: 0, lifetimePurchased: 0, lifetimeUsed: 0 };
  }

  return {
    balance: data.balance ?? 0,
    lifetimePurchased: data.lifetime_purchased ?? 0,
    lifetimeUsed: data.lifetime_used ?? 0,
  };
}

/**
 * Deduct 1 credit for an AI conversation.
 * NEVER throws — always returns a result. Failures are non-fatal.
 * If balance is 0, returns insufficient=true but does NOT block the conversation.
 */
export async function deductCredit(
  agencyId: string,
  clientId?: string | null,
  description?: string,
): Promise<DeductResult> {
  const supabase = createServiceClientWithoutCookies();

  try {
    // Check current balance first
    const { data: current } = await supabase
      .from('agency_credits')
      .select('balance')
      .eq('agency_id', agencyId)
      .single();

    const currentBalance = current?.balance ?? 0;

    if (currentBalance <= 0) {
      return { ok: false, newBalance: 0, insufficient: true };
    }

    // Decrement balance
    const { data: updated, error } = await supabase
      .from('agency_credits')
      .update({
        balance: currentBalance - 1,
        updated_at: new Date().toISOString(),
      })
      .eq('agency_id', agencyId)
      .select('balance')
      .single();

    if (error || !updated) {
      return { ok: false, newBalance: currentBalance, insufficient: false };
    }

    // Update lifetime_used (best-effort, non-blocking)
    void supabase
      .from('agency_credits')
      .select('lifetime_used')
      .eq('agency_id', agencyId)
      .single()
      .then(({ data }) => {
        if (data) {
          supabase
            .from('agency_credits')
            .update({ lifetime_used: (data.lifetime_used ?? 0) + 1 })
            .eq('agency_id', agencyId)
            .then(() => {});
        }
      });

    // Log the transaction
    await supabase.from('credit_transactions').insert({
      agency_id: agencyId,
      amount: -1,
      type: 'usage',
      description: description || 'AI conversation',
      client_id: clientId || null,
    });

    return { ok: true, newBalance: updated.balance, insufficient: false };
  } catch (err) {
    console.warn('[credit-engine] deductCredit error:', err);
    return { ok: false, newBalance: 0, insufficient: false };
  }
}

/**
 * Add credits to an agency (purchase, bonus, manual adjustment).
 * Returns new balance.
 */
export async function addCredits(
  agencyId: string,
  amount: number,
  type: CreditTransaction['type'],
  description: string,
  stripePaymentIntentId?: string,
): Promise<number> {
  const supabase = createServiceClientWithoutCookies();

  // Ensure record exists
  await supabase
    .from('agency_credits')
    .upsert({ agency_id: agencyId }, { onConflict: 'agency_id' });

  // Fetch current values
  const { data: current } = await supabase
    .from('agency_credits')
    .select('balance, lifetime_purchased')
    .eq('agency_id', agencyId)
    .single();

  const newBalance = (current?.balance ?? 0) + amount;
  const newLifetime = type === 'purchase'
    ? (current?.lifetime_purchased ?? 0) + amount
    : (current?.lifetime_purchased ?? 0);

  const { data: updated } = await supabase
    .from('agency_credits')
    .update({
      balance: newBalance,
      lifetime_purchased: newLifetime,
      updated_at: new Date().toISOString(),
    })
    .eq('agency_id', agencyId)
    .select('balance')
    .single();

  // Log the transaction
  await supabase.from('credit_transactions').insert({
    agency_id: agencyId,
    amount,
    type,
    description,
    stripe_payment_intent_id: stripePaymentIntentId || null,
  });

  return updated?.balance ?? newBalance;
}

/**
 * Fetch recent credit transactions for an agency.
 */
export async function getCreditTransactions(
  agencyId: string,
  limit = 10,
): Promise<CreditTransaction[]> {
  const supabase = createServiceClientWithoutCookies();

  const { data } = await supabase
    .from('credit_transactions')
    .select('id, amount, type, description, client_id, created_at')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    amount: row.amount,
    type: row.type as CreditTransaction['type'],
    description: row.description,
    clientId: row.client_id,
    createdAt: row.created_at,
  }));
}
