import { NextResponse } from 'next/server';
import { requireMaster } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireMaster();
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_LITE_PRICE_ID: !!(process.env.STRIPE_STARTER_PRICE_ID || process.env.STRIPE_LITE_PRICE_ID),
    STRIPE_PRO_PRICE_ID: !!process.env.STRIPE_PRO_PRICE_ID,
    STRIPE_SCALE_PRICE_ID: !!process.env.STRIPE_SCALE_PRICE_ID,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  });
}
