// POST /api/stripe/credits — Create Stripe checkout for credit pack purchase

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCreditPack } from '@/lib/billing/credits';
import { stripe } from '@/lib/stripe/config';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();

  if (!member) return NextResponse.json({ error: 'No agency found' }, { status: 404 });

  let body: { packId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const pack = body.packId ? getCreditPack(body.packId) : null;
  if (!pack) return NextResponse.json({ error: 'Invalid pack ID' }, { status: 400 });

  if (!stripe) return NextResponse.json({ error: 'Stripe is not configured. Contact support.' }, { status: 503 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: pack.price * 100,
          product_data: {
            name: `Kyra Credits — ${pack.name} Pack`,
            description: `${pack.totalCredits.toLocaleString()} credits${pack.bonusPct > 0 ? ` (includes ${pack.bonusPct}% bonus)` : ''}. ~${pack.totalCredits.toLocaleString()} AI conversations.`,
            images: [],
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      agency_id: member.agency_id,
      pack_id: pack.id,
      credits: pack.totalCredits.toString(),
      pack_name: pack.name,
    },
    success_url: `${appUrl}/agency/credits?checkout=success`,
    cancel_url: `${appUrl}/agency/credits?checkout=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
