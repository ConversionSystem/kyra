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

      // Sprint 4: Bulk SMS from segment
      case 'sms': {
        const message = payload?.message as string;
        if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 });

        // Fetch contacts with phone numbers (either from explicit IDs or from segment filter)
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

        // Log as activity (actual SMS delivery via GHL is handled separately by the AI worker)
        const activityRows = smsContacts.map(c => ({
          agency_id: result.agency.id,
          contact_id: c.id,
          type: 'sms',
          actor: 'human',
          direction: 'outbound',
          subject: 'Bulk SMS',
          body: message.replace(/\{\{first_name\}\}/gi, c.first_name || 'there'),
          needs_attention: false,
        }));

        await service.from('crm_activities').insert(activityRows);

        return NextResponse.json({ ok: true, count: smsContacts.length });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error('Bulk action error:', err);
    return NextResponse.json({ error: 'Bulk action failed' }, { status: 500 });
  }
}
