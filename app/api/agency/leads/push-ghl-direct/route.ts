/**
 * POST /api/agency/leads/push-ghl-direct
 *
 * Pushes outreach leads directly into GHL as contacts — no webhook workflow needed.
 *
 * Strategy:
 *   1. Fetch the CS account's GHL private token from agency_clients
 *   2. For each lead: create/update GHL contact + add tags + add note with pitch
 *   3. Return created contact IDs
 *
 * The CS GHL account should have a simple tag-trigger automation:
 *   Trigger: Contact Tag Added = "kyra-outreach"
 *   Action:  Send email / enroll in sequence
 * This is a 2-minute setup vs 5 minutes for a webhook workflow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];
const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

interface LeadInput {
  id: string;
  owner: string;
  agency: string;
  niche: string;
  email?: string;
  linkedin?: string;
  warmth: string;
  angle: string;
  why: string;
  location: string;
  clients: string;
  ghlTier: string;
}

function firstName(fullName: string) {
  return fullName.split(' ')[0] ?? fullName;
}
function lastName(fullName: string) {
  const parts = fullName.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}

async function upsertGhlContact(
  ghlToken: string,
  locationId: string,
  lead: LeadInput,
): Promise<{ contactId: string | null; status: 'created' | 'updated' | 'error'; error?: string }> {
  const pitchUrl = `https://kyra.conversionsystem.com/for/${lead.niche.toLowerCase().replace(/\s+/g, '-')}`;

  const payload = {
    locationId,
    firstName: firstName(lead.owner),
    lastName: lastName(lead.owner),
    companyName: lead.agency,
    email: lead.email || '',
    source: 'Kyra Sales Pipeline',
    tags: [
      'kyra-outreach',
      `warmth-${lead.warmth}`,
      `niche-${lead.niche.toLowerCase().replace(/\s+/g, '-')}`,
    ],
    customFields: [
      { key: 'kyra_pitch_url', field_value: pitchUrl },
      { key: 'kyra_niche', field_value: lead.niche },
      { key: 'kyra_clients', field_value: lead.clients },
      { key: 'kyra_tier', field_value: lead.ghlTier },
    ],
  };

  try {
    // Try create first
    const createRes = await fetch(`${GHL_API_BASE}/contacts/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ghlToken}`,
        Version: GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    const createData = await createRes.json().catch(() => ({}));
    const contactId: string | null =
      createData?.contact?.id || createData?.id || null;

    if (!createRes.ok && createRes.status !== 422) {
      return {
        contactId: null,
        status: 'error',
        error: `GHL ${createRes.status}: ${JSON.stringify(createData).slice(0, 200)}`,
      };
    }

    const finalContactId = contactId;

    // Add a note with the personalised pitch
    if (finalContactId) {
      const noteBody = [
        `🎯 Kyra Sales Lead — ${lead.warmth.toUpperCase()} warmth`,
        ``,
        `Personalized pitch:`,
        lead.angle,
        ``,
        `Why they fit:`,
        lead.why,
        ``,
        `Details: ${lead.clients} clients · ${lead.ghlTier} · ${lead.location}`,
        `LinkedIn: ${lead.linkedin || 'N/A'}`,
        `Pitch URL: ${pitchUrl}`,
        ``,
        `Added by Kyra Sales Pipeline — ${new Date().toISOString()}`,
      ].join('\n');

      await fetch(`${GHL_API_BASE}/contacts/${finalContactId}/notes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ghlToken}`,
          Version: GHL_API_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: noteBody, userId: '' }),
        signal: AbortSignal.timeout(8_000),
      }).catch(() => null); // note failure is non-fatal
    }

    return {
      contactId: finalContactId,
      status: createRes.status === 422 ? 'updated' : 'created',
    };
  } catch (err: unknown) {
    return {
      contactId: null,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { leads } = body as { leads: LeadInput[] };

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
    }

    // ── Get the CS agency's GHL token from DB ────────────────────────────
    const serviceClient = createServiceClientWithoutCookies();

    // Find the user's agency via membership
    const { data: membership } = await serviceClient
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    // Find any GHL-connected client for this agency
    // Prefer the AGENCY account (main sales location); fall back to any GHL-connected client
    let clientsQuery = serviceClient
      .from('agency_clients')
      .select('id, name, ghl_private_token, ghl_location_id, created_at')
      .not('ghl_private_token', 'is', null)
      .not('ghl_location_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (membership?.agency_id) {
      clientsQuery = clientsQuery.eq('agency_id', membership.agency_id);
    }

    const { data: clients } = await clientsQuery;

    if (!clients || clients.length === 0) {
      return NextResponse.json({
        status: 'no_ghl_token',
        message: 'No GHL connection found. Connect GHL on your Conversion System client in the dashboard first.',
        setupUrl: '/agency/clients',
      });
    }

    // Prefer the AGENCY account (highest contact count / primary sales location)
    // If none named "AGENCY", fall back to first result
    const preferredClient =
      clients.find(c => (c.name as string).includes('AGENCY')) ?? clients[0];

    const ghlToken = preferredClient.ghl_private_token as string;
    const locationId = preferredClient.ghl_location_id as string;

    // ── Push contacts in batches of 5 ────────────────────────────────────
    const results: Array<{
      id: string;
      contactId: string | null;
      status: 'created' | 'updated' | 'error';
      error?: string;
    }> = [];

    const batchSize = 5;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (lead) => {
          const res = await upsertGhlContact(ghlToken, locationId, lead);
          return { id: lead.id, ...res };
        }),
      );
      results.push(...batchResults);

      // Small delay between batches to respect GHL rate limits
      if (i + batchSize < leads.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    const created = results.filter(r => r.status === 'created').length;
    const updated = results.filter(r => r.status === 'updated').length;
    const errors  = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      status: 'done',
      created,
      updated,
      errors,
      results,
      locationId,
      message: `${created + updated} lead${created + updated !== 1 ? 's' : ''} pushed to GHL${errors > 0 ? ` · ${errors} failed` : ''}.`,
      nextStep: 'In GHL → Automation, create a rule: Trigger = Tag Added "kyra-outreach" → Send email template. Contacts are ready and tagged.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[leads/push-ghl-direct] error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
