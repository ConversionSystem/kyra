import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { amount, note } = await req.json();
  if (!amount || typeof amount !== 'number') {
    return NextResponse.json({ error: 'amount (number) required' }, { status: 400 });
  }

  const admin = createServiceClientWithoutCookies();

  const { data: current } = await admin
    .from('agency_credits')
    .select('id, balance, lifetime_purchased, lifetime_used')
    .eq('agency_id', id)
    .single();

  if (!current) return NextResponse.json({ error: 'Credits record not found' }, { status: 404 });

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
