/**
 * GET /api/agency/intelligence
 *
 * Returns all agency intelligence data:
 * - Overview stats (conversations, bookings, reply rate, sentiment, knowledge, tasks)
 * - Client health scores (sorted healthiest → most at-risk)
 * - Cross-client patterns (common questions, busiest hours, best workers)
 * - Smart recommendations (rule-based, not LLM)
 *
 * Cached for 5 minutes to avoid re-querying on every page load.
 */

import { NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { getAgencyIntelligence } from '@/lib/intelligence/agency-analytics';

export const dynamic = 'force-dynamic';

// In-memory cache: agencyId → { data, timestamp }
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.status },
    );
  }

  const { agency } = result.data;

  // Plan gating: intelligence is pro/scale only (master accounts always have access)
  const agencyRaw = agency as unknown as Record<string, unknown>;
  const isMaster = agencyRaw.account_level === 'master';
  if (!['pro', 'scale'].includes(agency.plan) && !isMaster) {
    return NextResponse.json(
      { error: 'Agency Intelligence requires a Pro or Scale plan.' },
      { status: 403 },
    );
  }

  // Check cache
  const cached = cache.get(agency.id);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const data = await getAgencyIntelligence(agency.id);

    // Store in cache
    cache.set(agency.id, { data, timestamp: Date.now() });

    return NextResponse.json(data);
  } catch (err) {
    console.error('[intelligence] Failed to compute agency intelligence:', err);
    return NextResponse.json(
      { error: 'Failed to compute intelligence data' },
      { status: 500 },
    );
  }
}
