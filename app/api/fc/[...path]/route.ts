/**
 * Kyra Firecrawl Proxy — /api/fc/[...path]
 *
 * All OpenClaw containers call this endpoint as their FIRECRAWL_API_URL.
 * Kyra owns one Firecrawl account. Agencies never touch the real API key.
 *
 * Flow:
 *   Container → /api/fc/v1/scrape (with X-Kyra-Agency-ID header)
 *   → Check agency plan limit
 *   → Hard block if over limit (429)
 *   → Forward to api.firecrawl.dev with Kyra's master key
 *   → Increment usage (fire-and-forget)
 *   → Return Firecrawl response
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const FIRECRAWL_BASE = 'https://api.firecrawl.dev';

// Per-plan monthly scrape limits (0 = no web intelligence)
const PLAN_LIMITS: Record<string, number> = {
  free: 0,
  solo_pro: 0,
  starter: 500,
  pro: 2000,
  scale: 5000,
};

// Credit cost per endpoint (number of scrapes consumed per call)
const ENDPOINT_COST: Record<string, number> = {
  'v1/scrape': 1,
  'v1/crawl': 1,
  'v1/map': 1,
  'v1/search': 2,
  'v1/agent': 5,
  'v1/extract': 2,
};

// Paths that pass through without auth or usage tracking
const PASSTHROUGH_PATHS = new Set(['v1/status', 'health', 'v1/health']);

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function getCurrentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function getAgencyPlanLimit(agencyId: string): Promise<number> {
  const sb = getServiceClient();
  const { data } = await sb
    .from('agencies')
    .select('plan')
    .eq('id', agencyId)
    .single();
  const plan = (data?.plan as string) ?? 'free';
  return PLAN_LIMITS[plan] ?? 0;
}

async function getUsedScrapes(agencyId: string, yearMonth: string): Promise<number> {
  const sb = getServiceClient();
  const { data } = await sb
    .from('firecrawl_usage')
    .select('scrapes_used')
    .eq('agency_id', agencyId)
    .eq('year_month', yearMonth)
    .single();
  return data?.scrapes_used ?? 0;
}

async function incrementUsage(agencyId: string, yearMonth: string, cost: number): Promise<void> {
  const sb = getServiceClient();
  await sb.rpc('increment_firecrawl_usage', {
    p_agency_id: agencyId,
    p_year_month: yearMonth,
    p_cost: cost,
  });
}

async function handleProxy(
  req: NextRequest,
  paramsPromise: Promise<{ path: string[] }>,
  method: string
): Promise<NextResponse> {
  const { path } = await paramsPromise;
  const pathStr = path.join('/');

  // Pass-through: status checks require no auth or usage tracking
  if (PASSTHROUGH_PATHS.has(pathStr)) {
    const fcRes = await fetch(`${FIRECRAWL_BASE}/${pathStr}`, {
      headers: { 'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}` },
      signal: AbortSignal.timeout(10_000),
    });
    return new NextResponse(await fcRes.text(), {
      status: fcRes.status,
      headers: { 'Content-Type': fcRes.headers.get('content-type') || 'application/json' },
    });
  }

  // All other calls require agency context
  const agencyId = req.headers.get('x-kyra-agency-id');
  if (!agencyId) {
    return NextResponse.json(
      { error: 'Missing agency context. Web Intelligence requires a properly provisioned Kyra container.' },
      { status: 400 }
    );
  }

  const yearMonth = getCurrentYearMonth();

  // Check plan limit and current usage in parallel
  const [limit, used] = await Promise.all([
    getAgencyPlanLimit(agencyId),
    getUsedScrapes(agencyId, yearMonth),
  ]);

  // Free/solo plans have no web intelligence
  if (limit === 0) {
    return NextResponse.json(
      {
        error: 'Web Intelligence is not included in your current plan. Upgrade to Lite or higher to unlock web scraping for your AI workers.',
        upgrade: true,
      },
      { status: 402 }
    );
  }

  // Hard block when limit reached
  if (used >= limit) {
    return NextResponse.json(
      {
        error: `Web Intelligence limit reached (${used}/${limit} scrapes used this month). Upgrade your plan for more.`,
        upgrade: true,
        used,
        limit,
        resetOn: (() => {
          const d = new Date();
          return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split('T')[0];
        })(),
      },
      { status: 429 }
    );
  }

  // Determine cost for this endpoint
  const cost = ENDPOINT_COST[pathStr] ?? 1;

  // Forward to Firecrawl
  const fcUrl = `${FIRECRAWL_BASE}/${pathStr}${req.nextUrl.search}`;
  const forwardHeaders: Record<string, string> = {
    'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
  };

  const contentType = req.headers.get('content-type');
  if (contentType) forwardHeaders['Content-Type'] = contentType;

  let body: BodyInit | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await req.text();
  }

  let fcRes: Response;
  try {
    fcRes = await fetch(fcUrl, {
      method,
      headers: forwardHeaders,
      body,
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    console.error('[firecrawl-proxy] Upstream fetch failed:', err);
    return NextResponse.json({ error: 'Web Intelligence service unavailable. Please try again.' }, { status: 503 });
  }

  // Only increment usage on successful responses
  if (fcRes.ok) {
    void incrementUsage(agencyId, yearMonth, cost);
  }

  const resBody = await fcRes.text();
  return new NextResponse(resBody, {
    status: fcRes.status,
    headers: { 'Content-Type': fcRes.headers.get('content-type') || 'application/json' },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, params, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, params, 'POST');
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, params, 'DELETE');
}
