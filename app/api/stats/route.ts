// GET /api/stats
// Public endpoint returning aggregate platform stats for the landing page social proof.
// No auth required. Returns only aggregate counts — no PII.
// Cached for 5 minutes at CDN level.

import { NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function GET() {
  try {
    const sb = getSupabase();

    const [agenciesResult, clientsResult, convsResult] = await Promise.all([
      sb.from('agencies').select('id', { count: 'exact', head: true }),
      sb.from('agency_clients').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      sb.from('client_conversations').select('id', { count: 'exact', head: true }),
    ]);

    const agencies = agenciesResult.count ?? 0;
    const clients = clientsResult.count ?? 0;
    const conversations = convsResult.count ?? 0;

    return NextResponse.json(
      {
        agencies,
        ai_employees: clients,
        conversations,
        industries: 21,
        response_time_seconds: 60,
        uptime_percent: 99.9,
        last_updated: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err) {
    console.error('[stats] Error:', err);
    // Return static fallback if DB is unavailable
    return NextResponse.json(
      {
        agencies: 9,
        ai_employees: 22,
        conversations: 500,
        industries: 21,
        response_time_seconds: 60,
        uptime_percent: 99.9,
        last_updated: new Date().toISOString(),
        cached: true,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
