import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getPlanLimit, getUsagePercentage, PLANS, CREDIT_COSTS } from '@/lib/billing/plans';
import type { Plan } from '@/lib/billing/plans';

export async function GET() {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await serviceClient
      .from('users')
      .select('plan, usage_this_month, usage_reset_at, stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single();

    const plan = (profile?.plan || 'free') as Plan;
    const usage = profile?.usage_this_month || 0;
    const limit = getPlanLimit(plan);
    const percentage = getUsagePercentage(plan, usage);
    const resetAt = profile?.usage_reset_at || null;

    // Get message count this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: messageCount } = await serviceClient
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());

    const { count: memoryCount } = await serviceClient
      .from('memories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      plan,
      planName: PLANS[plan].name,
      price: PLANS[plan].price,
      creditsUsed: usage,
      creditsLimit: limit,
      creditsRemaining: Math.max(0, limit - usage),
      usagePercentage: percentage,
      resetAt,
      messageCount: messageCount || 0,
      memoryCount: memoryCount || 0,
      hasStripe: !!profile?.stripe_customer_id,
      hasSubscription: !!profile?.stripe_subscription_id,
      creditCosts: CREDIT_COSTS,
    });
  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
