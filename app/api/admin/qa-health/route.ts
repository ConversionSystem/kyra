// GET /api/admin/qa-health
// Nightly QA health check — checks DB consistency, env vars, and known issues.
// Requires Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
//
// Returns:
//   { status: "ok" | "degraded", checks: [...], timestamp: "..." }

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

interface QACheck {
  id: string;
  label: string;
  count?: number;
  ok: boolean;
  detail?: string;
}

async function countQuery(
  sb: ReturnType<typeof getSupabase>,
  table: string,
  filter: Record<string, unknown>
): Promise<number> {
  let q = sb.from(table).select('id', { count: 'exact', head: true });
  for (const [col, val] of Object.entries(filter)) {
    if (typeof val === 'object' && val !== null && 'neq' in (val as object)) {
      q = q.neq(col, (val as { neq: unknown }).neq);
    } else if (typeof val === 'object' && val !== null && 'lt' in (val as object)) {
      q = q.lt(col, (val as { lt: unknown }).lt);
    } else {
      q = q.eq(col, val as string);
    }
  }
  const { count, error } = await q;
  if (error) throw new Error(`${table} query failed: ${error.message}`);
  return count ?? 0;
}

export async function GET(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checks: QACheck[] = [];
  let degraded = false;

  const sb = getSupabase();

  // 1. Agencies with negative credits
  try {
    const count = await countQuery(sb, 'agencies', { credits: { lt: 0 } });
    const ok = count === 0;
    if (!ok) degraded = true;
    checks.push({ id: 'negative_credits', label: 'Agencies with negative credits', count, ok });
  } catch (e) {
    degraded = true;
    checks.push({ id: 'negative_credits', label: 'Agencies with negative credits', ok: false, detail: String(e) });
  }

  // 2. Agencies with invalid/unknown plan
  const validPlans = ['lite', 'pro', 'scale', 'starter', 'trial', 'free', 'solo_trial', 'solo_pro'];
  try {
    // Fetch all distinct plans and flag any not in the valid list
    const { data, error } = await sb.from('agencies').select('plan').limit(1000);
    if (error) throw new Error(error.message);
    const invalidPlans = [...new Set((data ?? []).map((r) => r.plan).filter((p) => !validPlans.includes(p)))];
    const count = invalidPlans.length;
    const ok = count === 0;
    if (!ok) degraded = true;
    checks.push({
      id: 'invalid_plans',
      label: 'Agencies with unrecognised plan',
      count,
      ok,
      detail: count > 0 ? `Unknown plans: ${invalidPlans.join(', ')}` : undefined,
    });
  } catch (e) {
    degraded = true;
    checks.push({ id: 'invalid_plans', label: 'Agencies with unrecognised plan', ok: false, detail: String(e) });
  }

  // 3. Test rows in build_requests
  try {
    const { count, error } = await sb
      .from('build_requests')
      .select('id', { count: 'exact', head: true })
      .eq('email', 'test@test.com');
    if (error) throw new Error(error.message);
    const n = count ?? 0;
    const ok = n === 0;
    if (!ok) degraded = true;
    checks.push({
      id: 'test_build_requests',
      label: 'Test rows in build_requests (email=test@test.com)',
      count: n,
      ok,
      detail: ok ? undefined : 'Delete these from the Supabase dashboard → Table Editor → build_requests',
    });
  } catch (e) {
    degraded = true;
    checks.push({ id: 'test_build_requests', label: 'Test rows in build_requests', ok: false, detail: String(e) });
  }

  // 4. Stripe webhook secret present
  const stripeOk = !!process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeOk) degraded = true;
  checks.push({
    id: 'stripe_webhook_secret',
    label: 'STRIPE_WEBHOOK_SECRET env var present',
    ok: stripeOk,
    detail: stripeOk ? undefined : 'Add STRIPE_WEBHOOK_SECRET to Vercel environment variables',
  });

  // 5. Resend API key present
  const resendOk = !!process.env.RESEND_API_KEY;
  if (!resendOk) degraded = true;
  checks.push({
    id: 'resend_api_key',
    label: 'RESEND_API_KEY env var present',
    ok: resendOk,
    detail: resendOk ? undefined : 'Add RESEND_API_KEY to Vercel — email sending is disabled without it',
  });

  return NextResponse.json({
    status: degraded ? 'degraded' : 'ok',
    checks,
    timestamp: new Date().toISOString(),
  });
}
