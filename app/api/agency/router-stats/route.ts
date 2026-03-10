import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';

const EMPTY = { daily_cost: 0, total_savings: 0, tier_percentages: {}, daily_queries: 0, savings_ratio: 0 };

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(EMPTY);

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json(EMPTY);

  try {
    const PROVISIONER_URL = process.env.OVH_PROVISIONER_URL || '';
    const PROVISIONER_SECRET = process.env.OVH_PROVISIONER_SECRET || '';
    if (!PROVISIONER_URL || !PROVISIONER_SECRET) return NextResponse.json(EMPTY);

    const res = await fetch(`${PROVISIONER_URL}/router/stats`, {
      headers: { Authorization: `Bearer ${PROVISIONER_SECRET}` },
      next: { revalidate: 60 }, // cache for 60s
    });
    if (!res.ok) return NextResponse.json(EMPTY);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(EMPTY);
  }
}
