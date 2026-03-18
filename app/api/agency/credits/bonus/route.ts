// POST /api/agency/credits/bonus
// Grant bonus credits for specific actions (social share, referral bonus, etc.)
// Each reason is one-time — checked via agency settings JSONB

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { addCredits } from '@/lib/billing/credit-engine';

const BONUS_AMOUNTS: Record<string, number> = {
  social_share: 500,   // Share on social media
  case_study: 1000,    // Submit a case study
  video_review: 2000,  // Record a video review
};

const BONUS_DESCRIPTIONS: Record<string, string> = {
  social_share: 'Bonus credits for sharing Kyra on social media',
  case_study: 'Bonus credits for submitting a case study',
  video_review: 'Bonus credits for recording a video review',
};

export async function POST(req: NextRequest) {
  try {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { reason } = await req.json();
  if (!reason) return NextResponse.json({ error: 'Missing reason' }, { status: 400 });

  const amount = BONUS_AMOUNTS[reason];
  if (!amount) return NextResponse.json({ error: 'Unknown bonus reason' }, { status: 400 });

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();
  if (!member) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const svc = createServiceClientWithoutCookies();

  // Check if already claimed via settings JSONB (one-time per reason)
  const { data: agency } = await svc
    .from('agencies')
    .select('settings')
    .eq('id', member.agency_id)
    .single();

  const settings = (agency?.settings as Record<string, unknown>) ?? {};
  const claimed = (settings.claimed_bonuses as string[]) ?? [];

  if (claimed.includes(reason)) {
    return NextResponse.json({ ok: true, alreadyClaimed: true, message: 'Already claimed' });
  }

  // Grant the credits
  await addCredits(
    member.agency_id,
    amount,
    'bonus',
    BONUS_DESCRIPTIONS[reason] ?? `Bonus: ${reason}`
  );

  // Mark as claimed
  await svc
    .from('agencies')
    .update({
      settings: {
        ...settings,
        claimed_bonuses: [...claimed, reason],
      },
    })
    .eq('id', member.agency_id);

  return NextResponse.json({ ok: true, creditsGranted: amount });
  } catch (err) {
    console.error('[credits/bonus]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
