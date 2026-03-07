/**
 * Lead Sync — Supabase → Kyra CRM
 *
 * Every time a new agency signs up on kyra.conversionsystem.com,
 * we automatically create a contact in the master Conversion System CRM.
 * This means all Kyra signups are instantly visible as leads in Angel's CRM.
 *
 * Master agency ID comes from MASTER_AGENCY_ID env var.
 * If not set, lead sync is skipped silently (non-fatal).
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export interface LeadData {
  fullName: string;
  email: string;
  businessName: string;
  websiteUrl?: string | null;
  accountType: 'solo' | 'agency';
  plan: string;
  agencyId: string;        // the new signup's agency ID (for source_id)
  referredBy?: string;     // referrer agency ID if any
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#84cc16', '#f97316',
];

function pickColor(email: string): string {
  let hash = 0;
  for (const c of email) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Sync a new signup to the master CRM as a lead contact.
 * Called from solo-signup and agency-signup routes after account creation.
 * Always non-fatal — never throws, never blocks the signup flow.
 */
export async function syncLeadToCRM(lead: LeadData): Promise<void> {
  const masterAgencyId = process.env.MASTER_AGENCY_ID;
  if (!masterAgencyId) {
    // Silently skip — MASTER_AGENCY_ID not configured
    return;
  }

  try {
    const db = createServiceClientWithoutCookies();

    // Check if this email already exists as a CRM contact for the master agency
    const { data: existing } = await db
      .from('crm_contacts')
      .select('id')
      .eq('agency_id', masterAgencyId)
      .eq('email', lead.email)
      .limit(1)
      .single();

    if (existing) {
      // Already in CRM — just update stage to 'lead' if they re-signed up
      await db
        .from('crm_contacts')
        .update({
          stage: 'lead',
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      return;
    }

    const [firstName, ...rest] = lead.fullName.trim().split(' ');
    const lastName = rest.join(' ') || null;

    // Build a useful note
    const notes = [
      `Signed up for Kyra ${lead.accountType === 'solo' ? 'Solo Free' : 'Agency'} plan`,
      `Plan: ${lead.plan}`,
      lead.websiteUrl ? `Website: ${lead.websiteUrl}` : null,
      lead.referredBy ? `Referred by agency: ${lead.referredBy}` : null,
      `Agency ID: ${lead.agencyId}`,
      `Signup date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    ].filter(Boolean).join('\n');

    // Determine lead score — paying = higher score
    const score = lead.plan === 'free' ? 30 : 65;
    const scoreLabel = lead.plan === 'free' ? 'cold' : 'warm';

    // Tags
    const tags = [
      'kyra-signup',
      lead.accountType,
      lead.plan,
      ...(lead.referredBy ? ['referred'] : []),
    ];

    await db.from('crm_contacts').insert({
      agency_id:        masterAgencyId,
      first_name:       firstName,
      last_name:        lastName,
      email:            lead.email,
      stage:            'lead',
      source:           'website',
      source_id:        lead.agencyId,
      score,
      score_label:      scoreLabel,
      avatar_color:     pickColor(lead.email),
      tags,
      notes: notes,
      ai_next_action:   lead.plan === 'free'
        ? 'Send onboarding email — free user, nurture to Solo Pro or Agency plan'
        : 'Follow up — new paying customer, confirm onboarding success',
      last_activity_at: new Date().toISOString(),
    });

    console.log(`[lead-sync] ✅ Synced ${lead.email} → master CRM (${lead.accountType}, ${lead.plan})`);
  } catch (err) {
    // Never block signups over CRM sync failures
    console.warn('[lead-sync] Failed to sync lead to CRM (non-fatal):', err);
  }
}
