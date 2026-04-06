// ============================================================================
// GET  /api/admin/nurture-audit  — audit all agencies' nurture enrollment
// POST /api/admin/nurture-audit  — re-enroll missing (or specific) agencies
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

/** Day offsets matching nurture-enrollment.ts */
const STEP_DAYS: Record<number, number> = {
  1: 0,
  2: 1,
  3: 3,
  4: 5,
  5: 7,
  6: 14,
  7: 21,
};

async function authCheck() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) return null;
  return user;
}

// ── GET — audit ──────────────────────────────────────────────────────────────

export async function GET() {
  if (!await authCheck()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createServiceClientWithoutCookies();

  // All agencies
  const { data: agencies, error: agErr } = await admin
    .from('agencies')
    .select('id, name, created_at, owner_id')
    .order('created_at', { ascending: false });

  if (agErr) return NextResponse.json({ error: agErr.message }, { status: 500 });

  // All nurture queue rows
  const { data: queue } = await admin
    .from('email_nurture_queue')
    .select('agency_id, sequence_step, status, sent_at');

  // Auth users for email lookup
  const emailMap: Record<string, string> = {};
  try {
    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of usersData?.users ?? []) {
      if (u.email) emailMap[u.id] = u.email;
    }
  } catch { /* non-fatal */ }

  // Group queue rows by agency
  const queueByAgency: Record<string, typeof queue> = {};
  for (const row of queue ?? []) {
    if (!queueByAgency[row.agency_id]) queueByAgency[row.agency_id] = [];
    queueByAgency[row.agency_id]!.push(row);
  }

  const result = (agencies ?? []).map(a => {
    const rows = queueByAgency[a.id] ?? [];
    const stepsSent = rows.filter(r => r.status === 'sent').length;
    const stepsPending = rows.filter(r => r.status === 'pending').length;

    let nurture_status: 'enrolled' | 'missing' | 'completed';
    if (rows.length === 0) {
      nurture_status = 'missing';
    } else if (stepsPending === 0) {
      nurture_status = 'completed';
    } else {
      nurture_status = 'enrolled';
    }

    return {
      agency_id: a.id,
      name: a.name,
      email: emailMap[a.owner_id] ?? null,
      created_at: a.created_at,
      nurture_status,
      steps_sent: stepsSent,
      steps_pending: stepsPending,
    };
  });

  return NextResponse.json(result);
}

// ── POST — re-enroll ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!await authCheck()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json() as { action: string; agencyIds?: string[] };
  const { action, agencyIds } = body;

  if (action !== 'enroll-missing' && action !== 'enroll') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const admin = createServiceClientWithoutCookies();

  // Determine which agencies to enroll
  let targetAgencies: Array<{ id: string; created_at: string; owner_id: string }> = [];

  if (action === 'enroll-missing') {
    // All agencies with NO nurture rows
    const { data: allAgencies } = await admin
      .from('agencies')
      .select('id, created_at, owner_id');

    const { data: enrolled } = await admin
      .from('email_nurture_queue')
      .select('agency_id');

    const enrolledSet = new Set((enrolled ?? []).map(r => r.agency_id));
    targetAgencies = (allAgencies ?? []).filter(a => !enrolledSet.has(a.id));

  } else {
    // Specific agencies
    if (!agencyIds?.length) {
      return NextResponse.json({ error: 'agencyIds required' }, { status: 400 });
    }
    const { data } = await admin
      .from('agencies')
      .select('id, created_at, owner_id')
      .in('id', agencyIds);
    targetAgencies = data ?? [];
  }

  // Email map
  const emailMap: Record<string, string> = {};
  try {
    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of usersData?.users ?? []) {
      if (u.email) emailMap[u.id] = u.email;
    }
  } catch { /* non-fatal */ }

  const now = new Date();
  let enrolled = 0;
  let skipped = 0;
  const details: Array<{ agency_id: string; result: string }> = [];

  for (const agency of targetAgencies) {
    const email = emailMap[agency.owner_id];
    if (!email) {
      skipped++;
      details.push({ agency_id: agency.id, result: 'skipped: no email' });
      continue;
    }

    const signupDate = new Date(agency.created_at);
    const daysSinceSignup = Math.floor((now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24));

    const rows = Object.entries(STEP_DAYS).map(([step, days]) => {
      let sendAt: Date;
      if (days <= daysSinceSignup) {
        // Missed — send ASAP (stagger by step index to avoid spam)
        sendAt = new Date(now);
        sendAt.setMinutes(sendAt.getMinutes() + Number(step) * 5);
      } else {
        // Future — send on original schedule
        sendAt = new Date(signupDate);
        sendAt.setDate(sendAt.getDate() + days);
      }
      return {
        agency_id: agency.id,
        email,
        sequence_step: Number(step),
        send_at: sendAt.toISOString(),
      };
    });

    const { error } = await admin.from('email_nurture_queue').insert(rows);
    if (error) {
      skipped++;
      details.push({ agency_id: agency.id, result: `error: ${error.message}` });
    } else {
      enrolled++;
      details.push({ agency_id: agency.id, result: 'enrolled' });
    }
  }

  return NextResponse.json({ enrolled, skipped, details });
}
