import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { exportContactsCsv } from '@/lib/crm/export';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const body = await req.json();
  const { action, contact_ids, payload } = body as {
    action: 'tag' | 'stage' | 'delete' | 'export' | 'sms';
    contact_ids: string[];
    payload?: Record<string, unknown>;
  };

  if (!action || !contact_ids?.length) {
    return NextResponse.json({ error: 'action and contact_ids required' }, { status: 400 });
  }

  const service = await createServiceClient();

  try {
    switch (action) {
      case 'tag': {
        const tag = (payload?.tag as string) || '';
        const removeTag = payload?.remove === true;
        if (!tag) return NextResponse.json({ error: 'tag required' }, { status: 400 });

        for (const cid of contact_ids) {
          const { data: contact } = await service
            .from('crm_contacts')
            .select('tags')
            .eq('id', cid)
            .eq('agency_id', result.agency.id)
            .single();

          if (!contact) continue;
          let tags = (contact.tags || []) as string[];
          if (removeTag) {
            tags = tags.filter(t => t !== tag);
          } else if (!tags.includes(tag)) {
            tags = [...tags, tag];
          }

          await service
            .from('crm_contacts')
            .update({ tags })
            .eq('id', cid)
            .eq('agency_id', result.agency.id);
        }
        return NextResponse.json({ ok: true, updated: contact_ids.length });
      }

      case 'stage': {
        const stage = payload?.stage as string;
        if (!stage) return NextResponse.json({ error: 'stage required' }, { status: 400 });

        const { error } = await service
          .from('crm_contacts')
          .update({ stage })
          .in('id', contact_ids)
          .eq('agency_id', result.agency.id);

        if (error) throw error;
        return NextResponse.json({ ok: true, updated: contact_ids.length });
      }

      case 'delete': {
        // Delete activities first
        await service
          .from('crm_activities')
          .delete()
          .in('contact_id', contact_ids)
          .eq('agency_id', result.agency.id);

        // Delete deals linked to these contacts
        await service
          .from('crm_deals')
          .delete()
          .in('contact_id', contact_ids)
          .eq('agency_id', result.agency.id);

        // Delete contacts
        const { error } = await service
          .from('crm_contacts')
          .delete()
          .in('id', contact_ids)
          .eq('agency_id', result.agency.id);

        if (error) throw error;
        return NextResponse.json({ ok: true, deleted: contact_ids.length });
      }

      case 'export': {
        const csv = await exportContactsCsv(result.agency.id);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="contacts-${new Date().toISOString().split('T')[0]}.csv"`,
          },
        });
      }

      // Bulk SMS — logs to CRM AND delivers via GHL
      case 'sms': {
        const message = payload?.message as string;
        if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 });

        // Fetch contacts with phone numbers
        let contactQuery = service
          .from('crm_contacts')
          .select('id, first_name, last_name, phone')
          .eq('agency_id', result.agency.id)
          .not('phone', 'is', null);

        if (contact_ids?.length) {
          contactQuery = contactQuery.in('id', contact_ids);
        }

        const { data: smsContacts } = await contactQuery;
        if (!smsContacts?.length) return NextResponse.json({ ok: true, count: 0, message: 'No contacts with phone numbers' });

        // Find a GHL-connected client for this agency to use for delivery
        const { data: ghlClient } = await service
          .from('agency_clients')
          .select('id, ghl_location_id, ghl_private_token, ghl_access_token')
          .eq('agency_id', result.agency.id)
          .not('ghl_location_id', 'is', null)
          .limit(1)
          .single();

        let delivered = 0;
        let failed = 0;
        const GHL_API_BASE = 'https://services.leadconnectorhq.com';
        const GHL_API_VERSION = '2021-04-15';

        // Deliver SMS via GHL for contacts that have a matching GHL contact
        for (const contact of smsContacts) {
          const personalizedMsg = message.replace(/\{\{first_name\}\}/gi, contact.first_name || 'there');

          // Log to CRM activities
          try {
            await service.from('crm_activities').insert({
              agency_id: result.agency.id,
              contact_id: contact.id,
              type: 'sms',
              actor: 'human',
              direction: 'outbound',
              subject: 'Bulk SMS',
              body: personalizedMsg,
              needs_attention: false,
            });
          } catch { /* non-fatal */ }

          // Deliver via GHL if credentials available
          if (ghlClient?.ghl_location_id) {
            const ghlToken = ghlClient.ghl_private_token || ghlClient.ghl_access_token;
            if (ghlToken && contact.phone) {
              try {
                // Search for GHL contact by phone
                const searchRes = await fetch(
                  `${GHL_API_BASE}/contacts/search/duplicate?locationId=${ghlClient.ghl_location_id}&phone=${encodeURIComponent(contact.phone)}`,
                  { headers: { Authorization: `Bearer ${ghlToken}`, Version: GHL_API_VERSION }, signal: AbortSignal.timeout(5000) }
                );
                if (searchRes.ok) {
                  const searchData = await searchRes.json();
                  const ghlContactId = searchData?.contact?.id || searchData?.contacts?.[0]?.id;
                  if (ghlContactId) {
                    const sendRes = await fetch(`${GHL_API_BASE}/conversations/messages`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${ghlToken}`, Version: GHL_API_VERSION, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'SMS', contactId: ghlContactId, message: personalizedMsg }),
                      signal: AbortSignal.timeout(8000),
                    });
                    if (sendRes.ok) { delivered++; } else { failed++; }
                  }
                }
              } catch { failed++; }
            }
          }
        }

        return NextResponse.json({
          ok: true,
          count: smsContacts.length,
          delivered,
          failed,
          message: ghlClient ? `SMS queued for ${smsContacts.length} contacts (${delivered} delivered via GHL)` : `Logged for ${smsContacts.length} contacts (connect GHL for live delivery)`,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error('Bulk action error:', err);
    return NextResponse.json({ error: 'Bulk action failed' }, { status: 500 });
  }
}
