/**
 * GET /api/cron/gateway-token-sync
 *
 * Runs daily via Vercel cron (once per day is enough).
 *
 * Problem it solves:
 * When a container is provisioned, the auth token is generated on the VPS
 * and stored in /opt/kyra/data/clients/{id}/openclaw/meta.json.
 * Occasionally the DB write fails or the token rotates, leaving gateway_token
 * NULL in agency_clients → terminal shows raw OpenClaw login screen.
 *
 * This cron:
 * 1. Queries all running/starting containers from agency_clients
 * 2. Calls the provisioner API to get the current token for each container
 * 3. Updates the DB if the token is missing or stale
 *
 * Also exposed as POST /api/cron/gateway-token-sync for manual trigger (master only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCron } from '@/lib/auth/cron';
import { requireMaster } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PROVISIONER_URL = process.env.OVH_PROVISIONER_URL || 'https://provisioner.gw.kyra.conversionsystem.com';
const PROVISIONER_SECRET = process.env.OVH_PROVISIONER_SECRET;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function runSync(): Promise<{ fixed: number; checked: number; errors: string[] }> {
  const supabase = getSupabase();

  // Get all clients with running/starting containers
  const { data: clients, error } = await supabase
    .from('agency_clients')
    .select('id, name, gateway_url, gateway_token, gateway_container_id, gateway_status')
    .in('gateway_status', ['running', 'starting'])
    .not('gateway_url', 'is', null);

  if (error) throw new Error(`DB query failed: ${error.message}`);

  const results = { fixed: 0, checked: clients?.length ?? 0, errors: [] as string[] };

  for (const client of clients ?? []) {
    try {
      // Ask provisioner for the current token for this client
      const res = await fetch(`${PROVISIONER_URL}/clients/${client.id}/token`, {
        headers: { Authorization: `Bearer ${PROVISIONER_SECRET}` },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        // Provisioner doesn't have a /token endpoint for this client — skip
        continue;
      }

      const data = await res.json();
      const liveToken = data?.authToken || data?.token;

      if (!liveToken) continue;

      // If token is missing or stale, update it
      if (client.gateway_token !== liveToken) {
        const { error: updateError } = await supabase
          .from('agency_clients')
          .update({ gateway_token: liveToken })
          .eq('id', client.id);

        if (updateError) {
          results.errors.push(`Failed to update token for ${client.id}: ${updateError.message}`);
        } else {
          results.fixed++;
          console.log(`[gateway-token-sync] Fixed token for client ${client.id} (${client.name})`);
        }
      }
    } catch (err) {
      // Network error for this client — skip, don't fail the whole job
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('timeout') && !msg.includes('fetch')) {
        results.errors.push(`Client ${client.id}: ${msg}`);
      }
    }
  }

  return results;
}

// Cron trigger (GET with CRON_SECRET header, or OVH_PROVISIONER_SECRET for manual)
export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request, { extraSecretEnvVars: ['OVH_PROVISIONER_SECRET'] });
  if (unauthorized) return unauthorized;

  try {
    const result = await runSync();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Manual trigger for master admins (POST)
export async function POST(request: NextRequest) {
  const auth = await requireMaster();
  if (!auth.ok) return auth.response;

  try {
    const result = await runSync();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
