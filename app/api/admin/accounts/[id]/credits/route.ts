import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireMaster } from '@/lib/auth/admin';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMaster();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { amount, note } = await req.json();
  if (!amount || typeof amount !== 'number') {
    return NextResponse.json({ error: 'amount (number) required' }, { status: 400 });
  }

  const admin = createServiceClientWithoutCookies();

  // Try to get existing credits row
  const { data: current } = await admin
    .from('agency_credits')
    .select('id, balance, lifetime_purchased, lifetime_used')
    .eq('agency_id', id)
    .single();

  if (!current) {
    // No credits row yet — create one (new accounts may not have this row)
    const initialBalance = Math.max(0, amount);
    const { error: insertErr } = await admin
      .from('agency_credits')
      .insert({
        agency_id: id,
        balance: initialBalance,
        lifetime_purchased: amount > 0 ? amount : 0,
        lifetime_used: 0,
      });
    if (insertErr) return NextResponse.json({ error: `Failed to create credits: ${insertErr.message}` }, { status: 500 });

    // Log transaction
    try {
      await admin.from('credit_transactions').insert({
        agency_id: id,
        amount,
        type: amount > 0 ? 'admin_grant' : 'admin_deduct',
        description: note || `Admin adjustment: ${amount > 0 ? '+' : ''}${amount} credits`,
        balance_after: initialBalance,
      });
    } catch { /* ignore — table may not exist */ }

    return NextResponse.json({ ok: true, newBalance: initialBalance, delta: amount });
  }

  const newBalance = Math.max(0, current.balance + amount);
  const newLifetimePurchased = amount > 0 ? current.lifetime_purchased + amount : current.lifetime_purchased;
  const newLifetimeUsed = amount < 0 ? current.lifetime_used + Math.abs(amount) : current.lifetime_used;

  const { error } = await admin
    .from('agency_credits')
    .update({
      balance: newBalance,
      lifetime_purchased: newLifetimePurchased,
      lifetime_used: newLifetimeUsed,
      updated_at: new Date().toISOString(),
    })
    .eq('agency_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log transaction (non-fatal — table may not exist)
  try {
    await admin.from('credit_transactions').insert({
      agency_id: id,
      amount,
      type: amount > 0 ? 'admin_grant' : 'admin_deduct',
      description: note || `Admin adjustment: ${amount > 0 ? '+' : ''}${amount} credits`,
      balance_after: newBalance,
    });
  } catch { /* ignore */ }

  return NextResponse.json({ ok: true, newBalance, delta: amount });
}
