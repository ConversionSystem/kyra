// POST /api/admin/sync-leads
// Backfill all existing Supabase agencies → master CRM contacts.
// Safe to run multiple times — deduplicates by email.
// Restricted to ADMIN_EMAILS only.

import { NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireMaster } from '@/lib/auth/admin';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#84cc16', '#f97316',
];
function pickColor(str: string): string {
  let h = 0;
  for (const c of str) h = c.charCodeAt(0) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const PLAN_MRR: Record<string, number> = {
  free: 0, solo_pro: 49, starter: 99, pro: 249, scale: 499, beta: 249,
};

export async function POST() {
  const auth = await requireMaster();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const db = createServiceClientWithoutCookies();

  // ── Locate master agency (by admin email owner) ───────────────────────────
  // First check env var, then fall back to finding by owner email.
  let masterAgencyId = process.env.MASTER_AGENCY_ID || '1511e077-77ef-4c47-81fd-06a3bc9f1dbb';
  const masterClientId = process.env.MASTER_CLIENT_ID || '307c9548-2782-4c12-8122-0f0d132bd4dd';

  if (!masterAgencyId) {
    // Find the agency owned by the logged-in admin user (earliest-created = master)
    const { data: masterMembership } = await db
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    masterAgencyId = masterMembership?.agency_id ?? '';
  }

  if (!masterAgencyId) {
    return NextResponse.json({
      error: 'Could not determine master agency. Set MASTER_AGENCY_ID env var in Vercel.',
    }, { status: 400 });
  }

  // ── Load all agencies (excluding the master itself) ───────────────────────
  const { data: agencies, error: agenciesError } = await db
    .from('agencies')
    .select('id, name, plan, created_at, settings, owner_id')
    .neq('id', masterAgencyId)
    .order('created_at', { ascending: true });

  if (agenciesError) {
    return NextResponse.json({ error: agenciesError.message }, { status: 500 });
  }

  const allAgencies = agencies ?? [];

  // ── Load existing CRM contacts (emails already in master CRM) ────────────
  const { data: existingContacts } = await db
    .from('crm_contacts')
    .select('email, source_id')
    .eq('agency_id', masterAgencyId);

  const existingEmails  = new Set((existingContacts ?? []).map(c => c.email?.toLowerCase()).filter(Boolean));
  const existingSourceIds = new Set((existingContacts ?? []).map(c => c.source_id).filter(Boolean));

  // ── Load owner emails for all agencies in one batch ───────────────────────
  // agency_members → user_id, then auth.users → email
  const { data: memberships } = await db
    .from('agency_members')
    .select('agency_id, user_id, role')
    .eq('role', 'owner')
    .in('agency_id', allAgencies.map(a => a.id));

  const ownerUserIds = [...new Set((memberships ?? []).map(m => m.user_id))];

  // Batch-fetch user emails (Supabase admin API, up to 100 at a time)
  const userEmailMap = new Map<string, string>(); // userId → email
  const chunkSize = 50;
  for (let i = 0; i < ownerUserIds.length; i += chunkSize) {
    const chunk = ownerUserIds.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (uid) => {
      try {
        const { data } = await db.auth.admin.getUserById(uid);
        if (data?.user?.email) userEmailMap.set(uid, data.user.email);
      } catch { /* skip */ }
    }));
  }

  // Build agency → owner email map
  const agencyOwnerEmail = new Map<string, string>();
  const agencyOwnerName  = new Map<string, string>();
  (memberships ?? []).forEach(m => {
    const email = userEmailMap.get(m.user_id);
    if (email) agencyOwnerEmail.set(m.agency_id, email);
  });

  // ── Insert contacts ───────────────────────────────────────────────────────
  let synced = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  const batchInserts: object[] = [];

  for (const agency of allAgencies) {
    const email = agencyOwnerEmail.get(agency.id);
    const settings = (agency.settings ?? {}) as Record<string, unknown>;
    const accountType = settings.account_type === 'solo' ? 'solo' : 'agency';
    const ownerName = (settings.owner_name as string) || agency.name;
    const websiteUrl = (settings.website_url as string) || null;
    const referralSource = (settings.referral_source as string) || null;

    // Skip if already synced (by email or source_id)
    if ((email && existingEmails.has(email.toLowerCase())) ||
        existingSourceIds.has(agency.id)) {
      skipped++;
      continue;
    }

    if (!email) {
      // No email found — still create a contact with available data
      errors++;
      errorDetails.push(`No email for agency: ${agency.name} (${agency.id})`);
      continue;
    }

    const [firstName, ...rest] = ownerName.trim().split(' ');
    const lastName = rest.join(' ') || null;

    const plan = agency.plan ?? 'free';
    const mrr = PLAN_MRR[plan] ?? 0;
    const score = plan === 'free' ? 25 : mrr >= 249 ? 75 : 55;
    const scoreLabel = plan === 'free' ? 'cold' : mrr >= 249 ? 'hot' : 'warm';

    const tags = [
      'kyra-signup',
      accountType,
      plan.replace('_', '-'),
      ...(referralSource ? ['referred'] : []),
      'backfill',
    ];

    const noteLines = [
      `Account type: ${accountType}`,
      `Plan: ${plan}${mrr > 0 ? ` ($${mrr}/mo)` : ' (free)'}`,
      websiteUrl ? `Website: ${websiteUrl}` : null,
      referralSource ? `Referral source: ${referralSource}` : null,
      `Signed up: ${new Date(agency.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      `Agency ID: ${agency.id}`,
    ].filter(Boolean).join('\n');

    const aiNextAction = plan === 'free'
      ? `Follow up — free ${accountType} user, nurture toward ${accountType === 'solo' ? 'Solo Pro ($49/mo)' : 'Lite plan ($99/mo)'}`
      : `Check in — paying customer on ${plan} plan. Confirm they're getting value.`;

    batchInserts.push({
      agency_id:        masterAgencyId,
      client_id:        masterClientId,
      first_name:       firstName,
      last_name:        lastName,
      email,
      stage:            mrr > 0 ? 'customer' : 'lead',
      source:           'website',
      source_id:        agency.id,
      score,
      score_label:      scoreLabel,
      avatar_color:     pickColor(email),
      tags,
      ai_summary:       noteLines,
      ai_next_action:   aiNextAction,
      last_activity_at: agency.created_at,
      created_at:       agency.created_at, // preserve original signup date
    });

    synced++;
  }

  // ── Batch insert (chunks of 100) ──────────────────────────────────────────
  const insertChunkSize = 100;
  for (let i = 0; i < batchInserts.length; i += insertChunkSize) {
    const chunk = batchInserts.slice(i, i + insertChunkSize);
    const { error: insertError } = await db
      .from('crm_contacts')
      .insert(chunk);

    if (insertError) {
      errors += chunk.length;
      synced -= chunk.length;
      errorDetails.push(`Batch insert error (offset ${i}): ${insertError.message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    masterAgencyId,
    total: allAgencies.length,
    synced,
    skipped,
    errors,
    errorDetails: errorDetails.slice(0, 20), // cap to avoid huge response
  });
}
