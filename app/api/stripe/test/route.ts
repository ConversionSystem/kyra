import { NextResponse } from 'next/server';
import { requireMaster } from '@/lib/auth/admin';
import { stripe } from '@/lib/stripe/config';

export const dynamic = 'force-dynamic';

export async function POST() {
  const auth = await requireMaster();
  if (!auth.ok) return auth.response;

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ ok: false, error: 'STRIPE_SECRET_KEY is not set' });
  }

  try {
    const account = await stripe.accounts.retrieve();
    return NextResponse.json({ ok: true, accountName: account.settings?.dashboard?.display_name || account.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message });
  }
}
