// ============================================================================
// GET /api/agency/stats
//
// Returns aggregate stats for the agency dashboard:
// - Total messages processed today/this week/all time
// - Average response time
// - Active conversations
// - Client breakdown
// ============================================================================

import { NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServiceClientWithoutCookies();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get all message logs
  const [todayResult, weekResult, allTimeResult, clientsResult] = await Promise.all([
    // Today's messages
    supabase
      .from('ghl_message_log')
      .select('id, response_time_ms', { count: 'exact' })
      .gte('created_at', todayStart),

    // This week's messages
    supabase
      .from('ghl_message_log')
      .select('id', { count: 'exact' })
      .gte('created_at', weekStart),

    // All time
    supabase
      .from('ghl_message_log')
      .select('id, response_time_ms', { count: 'exact' }),

    // Active clients
    supabase
      .from('agency_clients')
      .select('id, name, status, ghl_location_id', { count: 'exact' })
      .not('ghl_access_token', 'is', null)
      .in('status', ['active', 'setup']),
  ]);

  // Calculate average response time
  const allMessages = allTimeResult.data || [];
  const responseTimes = allMessages
    .map((m) => m.response_time_ms)
    .filter((t): t is number => t !== null && t > 0);
  const avgResponseTimeMs = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;

  // Unique contacts today
  const todayContacts = new Set<string>();
  if (todayResult.data) {
    // We'd need contact_id for this — using count as proxy for now
  }

  return NextResponse.json({
    messages: {
      today: todayResult.count || 0,
      thisWeek: weekResult.count || 0,
      allTime: allTimeResult.count || 0,
    },
    performance: {
      avgResponseTimeMs,
      avgResponseTimeSec: Math.round(avgResponseTimeMs / 100) / 10,
    },
    clients: {
      active: clientsResult.count || 0,
      list: (clientsResult.data || []).map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        connected: !!c.ghl_location_id,
      })),
    },
  });
}
