/**
 * GET /api/admin/qa-health
 *
 * Authenticated admin endpoint that runs the 7 QA health checks and returns
 * a structured JSON report. Powers the QA dashboard card.
 *
 * Auth: requires X-Admin-Key header matching ADMIN_API_KEY env var,
 *       OR a valid Supabase service-role key in Authorization header.
 *
 * Response:
 * {
 *   timestamp: string,
 *   overall: "PASS" | "WARN" | "FAIL",
 *   checks: QACheck[],
 *   failCount: number,
 *   warnCount: number,
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type CheckStatus = 'PASS' | 'WARN' | 'FAIL' | 'SKIP';

interface QACheck {
  id: string;
  name: string;
  status: CheckStatus;
  detail: string;
  /** Optional: structured data for dashboard rendering */
  data?: Record<string, unknown>;
}

interface QAReport {
  timestamp: string;
  overall: 'PASS' | 'WARN' | 'FAIL';
  checks: QACheck[];
  failCount: number;
  warnCount: number;
  durationMs: number;
}

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  // Check X-Admin-Key header
  const adminKey = req.headers.get('x-admin-key');
  if (adminKey && adminKey === process.env.ADMIN_API_KEY) return true;

  // Check Authorization: Bearer <supabase-service-key>
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (token && token === process.env.SUPABASE_SERVICE_ROLE_KEY) return true;

  return false;
}

// ─────────────────────────────────────────────
// Supabase client
// ─────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// ─────────────────────────────────────────────
// Stripe helpers
// ─────────────────────────────────────────────

interface StripeWebhookEndpoint {
  id: string;
  url: string;
  status: string;
  enabled_events: string[];
}

async function fetchStripeWebhooks(): Promise<StripeWebhookEndpoint[]> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return [];

  const res = await fetch('https://api.stripe.com/v1/webhook_endpoints?limit=20', {
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}

// ─────────────────────────────────────────────
// Deploy counter
// ─────────────────────────────────────────────

function getTodayDeployCount(): number {
  // This runs on Vercel/server — /tmp is available
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs') as typeof import('fs');
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const file = `/tmp/.kyra_deploy_${today}`;
  try {
    if (fs.existsSync(file)) {
      return parseInt(fs.readFileSync(file, 'utf8').trim(), 10) || 0;
    }
  } catch {
    // ignore
  }
  return 0;
}

// ─────────────────────────────────────────────
// Individual Checks
// ─────────────────────────────────────────────

async function checkStripeWebhook(
  webhooks: StripeWebhookEndpoint[]
): Promise<QACheck> {
  const id = 'stripe_webhook';
  const name = 'Stripe Webhook Endpoint';
  const CORRECT_PATH = '/api/webhooks/stripe';

  if (!process.env.STRIPE_SECRET_KEY) {
    return { id, name, status: 'SKIP', detail: 'STRIPE_SECRET_KEY not configured' };
  }

  const correctActive = webhooks.filter(
    (wh) => wh.status === 'enabled' && wh.url.includes(CORRECT_PATH)
  );

  if (correctActive.length > 0) {
    return {
      id, name, status: 'PASS',
      detail: `${CORRECT_PATH} is registered and active`,
      data: { activeUrl: correctActive[0].url },
    };
  }

  return {
    id, name, status: 'FAIL',
    detail: `CORRECT endpoint (${CORRECT_PATH}) is NOT active in Stripe — plan upgrades are silently failing`,
    data: { enabledWebhooks: webhooks.filter((w) => w.status === 'enabled').map((w) => w.url) },
  };
}

async function checkDeadWebhookHandlers(
  webhooks: StripeWebhookEndpoint[]
): Promise<QACheck> {
  const id = 'dead_webhook_handlers';
  const name = 'Dead Webhook Handlers';
  const DEAD_PATHS = ['/api/billing/webhook', '/api/stripe/webhooks'];

  if (!process.env.STRIPE_SECRET_KEY) {
    return { id, name, status: 'SKIP', detail: 'STRIPE_SECRET_KEY not configured' };
  }

  const deadActive = webhooks.filter(
    (wh) =>
      wh.status === 'enabled' &&
      DEAD_PATHS.some((p) => wh.url.includes(p))
  );

  if (deadActive.length > 0) {
    return {
      id, name, status: 'FAIL',
      detail: `Old broken webhook handlers are still ENABLED in Stripe: ${deadActive.map((w) => w.url).join(', ')}`,
      data: { deadActiveUrls: deadActive.map((w) => w.url) },
    };
  }

  return {
    id, name, status: 'PASS',
    detail: 'Old handlers (/api/billing/webhook, /api/stripe/webhooks) are disabled',
  };
}

async function checkPlanVsCredits(): Promise<QACheck> {
  const id = 'plan_vs_credits';
  const name = 'Plan vs Credits Consistency';

  const sb = getSupabase();

  const { data: agencies, error } = await sb
    .from('agencies')
    .select('id, name, plan, credit_balance')
    .in('plan', ['starter', 'pro', 'scale'])
    .limit(500);

  if (error) {
    return {
      id, name, status: 'WARN',
      detail: `Could not query agencies: ${error.message}`,
    };
  }

  const MIN_CREDITS: Record<string, number> = {
    starter: 500,
    pro: 500,
    scale: 500,
  };

  const bad = (agencies ?? []).filter((a) => {
    const min = MIN_CREDITS[a.plan] ?? 0;
    return (a.credit_balance ?? 0) < min;
  });

  if (bad.length > 0) {
    return {
      id, name, status: 'FAIL',
      detail: `${bad.length} paid agencies have insufficient credits (paid but not credited)`,
      data: {
        affectedCount: bad.length,
        affected: bad.slice(0, 10).map((a) => ({
          name: a.name,
          plan: a.plan,
          creditBalance: a.credit_balance,
          minimum: MIN_CREDITS[a.plan],
        })),
      },
    };
  }

  return {
    id, name, status: 'PASS',
    detail: `All ${agencies?.length ?? 0} paid agencies have sufficient credits`,
    data: { checkedCount: agencies?.length ?? 0 },
  };
}

async function checkRecentSignupsWrongPlan(): Promise<QACheck> {
  const id = 'recent_signups_wrong_plan';
  const name = 'Recent Signups — Wrong Plan';

  const sb = getSupabase();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: bad, error } = await sb
    .from('agencies')
    .select('id, name, email, plan, stripe_customer_id, created_at')
    .eq('plan', 'free')
    .not('stripe_customer_id', 'is', null)
    .gte('created_at', sevenDaysAgo)
    .limit(50);

  if (error) {
    return {
      id, name, status: 'WARN',
      detail: `Could not query agencies: ${error.message}`,
    };
  }

  if ((bad?.length ?? 0) > 0) {
    return {
      id, name, status: 'FAIL',
      detail: `${bad!.length} users have a Stripe customer ID but are still on plan=free (last 7 days)`,
      data: {
        affectedCount: bad!.length,
        affected: bad!.slice(0, 10).map((a) => ({
          name: a.name,
          email: a.email,
          stripeCustomerId: a.stripe_customer_id,
          createdAt: a.created_at,
        })),
      },
    };
  }

  return {
    id, name, status: 'PASS',
    detail: 'No paid customers stuck on free plan in the last 7 days',
  };
}

async function checkVercelDeployCount(): Promise<QACheck> {
  const id = 'vercel_deploy_count';
  const name = 'Vercel Deploy Count';
  const MAX_DEPLOYS = 2;

  const count = getTodayDeployCount();

  if (count > MAX_DEPLOYS) {
    return {
      id, name, status: 'WARN',
      detail: `${count} deploys today — limit is ${MAX_DEPLOYS}. Check for FORCE=1 abuse.`,
      data: { deployCount: count, limit: MAX_DEPLOYS },
    };
  }

  if (count === MAX_DEPLOYS) {
    return {
      id, name, status: 'WARN',
      detail: `${count}/${MAX_DEPLOYS} deploys today — limit reached`,
      data: { deployCount: count, limit: MAX_DEPLOYS },
    };
  }

  return {
    id, name, status: 'PASS',
    detail: `${count}/${MAX_DEPLOYS} deploys today`,
    data: { deployCount: count, limit: MAX_DEPLOYS },
  };
}

/**
 * Container health and provisioner image checks both require SSH to the VPS,
 * which is not feasible from a serverless environment. These checks are marked
 * as SKIP with guidance to run the shell script for full coverage.
 */
async function checkContainerHealth(): Promise<QACheck> {
  return {
    id: 'container_health',
    name: 'Container Health (VPS)',
    status: 'SKIP',
    detail:
      'Container health requires SSH — run scripts/qa-check.sh for full VPS checks',
  };
}

async function checkProvisionerImage(): Promise<QACheck> {
  return {
    id: 'provisioner_image',
    name: 'Provisioner Image Pin',
    status: 'SKIP',
    detail:
      'Image pin check requires SSH — run scripts/qa-check.sh for full VPS checks',
  };
}

// ─────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startMs = Date.now();

  // Fetch Stripe webhooks once and share across checks
  const webhooks = await fetchStripeWebhooks();

  // Run all checks (non-SSH ones in parallel)
  const [
    stripeWebhook,
    deadHandlers,
    planVsCredits,
    recentSignups,
    deployCount,
    containerHealth,
    provisionerImage,
  ] = await Promise.all([
    checkStripeWebhook(webhooks),
    checkDeadWebhookHandlers(webhooks),
    checkPlanVsCredits(),
    checkRecentSignupsWrongPlan(),
    checkVercelDeployCount(),
    checkContainerHealth(),
    checkProvisionerImage(),
  ]);

  const checks: QACheck[] = [
    stripeWebhook,
    deadHandlers,
    planVsCredits,
    recentSignups,
    deployCount,
    containerHealth,
    provisionerImage,
  ];

  const failCount = checks.filter((c) => c.status === 'FAIL').length;
  const warnCount = checks.filter((c) => c.status === 'WARN').length;

  let overall: QAReport['overall'] = 'PASS';
  if (failCount > 0) overall = 'FAIL';
  else if (warnCount > 0) overall = 'WARN';

  const report: QAReport = {
    timestamp: new Date().toISOString(),
    overall,
    checks,
    failCount,
    warnCount,
    durationMs: Date.now() - startMs,
  };

  return NextResponse.json(report, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
