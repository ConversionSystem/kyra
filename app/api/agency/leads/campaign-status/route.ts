/**
 * GET /api/agency/leads/campaign-status
 *
 * Returns the current outbound campaign state for all leads.
 * Stored in agencies.settings.campaign_state
 */

import { NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireMaster } from '@/lib/auth/admin';
import type { CampaignRecord } from '../run-campaign/route';

export async function GET() {
  try {
    const auth = await requireMaster();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const serviceClient = createServiceClientWithoutCookies();
    const { data: membership } = await serviceClient
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();

    if (!membership?.agency_id) {
      return NextResponse.json({ campaign_state: {} });
    }

    const { data: agency } = await serviceClient
      .from('agencies')
      .select('settings')
      .eq('id', membership.agency_id)
      .single();

    const settings = (agency?.settings ?? {}) as Record<string, unknown>;
    const campaignState = (settings.campaign_state ?? {}) as Record<string, CampaignRecord>;

    // Summary stats
    const records = Object.values(campaignState);
    const summary = {
      total: records.length,
      sent: records.filter(r => r.status === 'sent').length,
      replied: records.filter(r => r.status === 'replied').length,
      interested: records.filter(r => r.status === 'interested').length,
      booked: records.filter(r => r.status === 'booked').length,
      closed: records.filter(r => r.status === 'closed').length,
      no_email: records.filter(r => r.status === 'no_email').length,
      errors: records.filter(r => r.status === 'error').length,
    };

    return NextResponse.json({ campaign_state: campaignState, summary });
  } catch (err) {
    console.error('[campaign-status]', err);
    return NextResponse.json({ campaign_state: {}, summary: {} });
  }
}

/**
 * PATCH /api/agency/leads/campaign-status
 * Update a single lead's campaign status (e.g. mark as replied, interested, booked)
 */
export async function PATCH(req: Request) {
  try {
    const auth = await requireMaster();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const { leadId, status, notes } = await req.json() as {
      leadId: string;
      status: CampaignRecord['status'];
      notes?: string;
    };

    const serviceClient = createServiceClientWithoutCookies();
    const { data: membership } = await serviceClient
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();

    if (!membership?.agency_id) {
      return NextResponse.json({ error: 'No agency' }, { status: 404 });
    }

    const { data: agency } = await serviceClient
      .from('agencies')
      .select('settings')
      .eq('id', membership.agency_id)
      .single();

    const settings = (agency?.settings ?? {}) as Record<string, unknown>;
    const campaignState = (settings.campaign_state ?? {}) as Record<string, CampaignRecord>;

    const existing = campaignState[leadId] ?? {};
    campaignState[leadId] = {
      ...existing,
      status,
      ...(status === 'replied' ? { replied_at: new Date().toISOString() } : {}),
      ...(status === 'booked' ? { replied_at: existing.replied_at, booked_at: new Date().toISOString() } : {}),
      ...(notes ? { notes } : {}),
    } as CampaignRecord;

    await serviceClient
      .from('agencies')
      .update({
        settings: { ...settings, campaign_state: campaignState },
        updated_at: new Date().toISOString(),
      })
      .eq('id', membership.agency_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[campaign-status PATCH]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
