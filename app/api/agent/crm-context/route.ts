/**
 * POST /api/agent/crm-context
 *
 * Returns structured CRM context for a contact.
 * Called by an OpenClaw container to look up who it's talking to.
 *
 * This is Fix C: CRM database access from the Terminal.
 * "Who called us last week?" "What deals do we have open?" → all answerable.
 *
 * Auth: Bearer {gateway_token} from the container
 * Body: { phone?: string, email?: string, contact_id?: string, query?: string }
 * Returns: structured contact context ready for LLM injection
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getMemories, buildMemoryContext } from '@/lib/crm/relationship-memory';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate via gateway token
    const authHeader = req.headers.get('authorization');
    const gatewayToken = authHeader?.replace('Bearer ', '').trim();

    if (!gatewayToken) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401, headers: CORS });
    }

    const supabase = createServiceClientWithoutCookies();

    // Resolve client from gateway token
    const { data: client } = await supabase
      .from('agency_clients')
      .select('id, agency_id, name, gateway_token')
      .eq('gateway_token', gatewayToken)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Container not recognized' }, { status: 403, headers: CORS });
    }

    const body = await req.json();
    const { phone, email, contact_id, query } = body as {
      phone?: string;
      email?: string;
      contact_id?: string;
      query?: string;
    };

    // ── Find contact ──────────────────────────────────────────────────────────
    let crmContactId: string | null = contact_id || null;

    if (!crmContactId && phone) {
      const { data } = await supabase
        .from('crm_contacts')
        .select('id')
        .eq('agency_id', client.agency_id)
        .eq('phone', phone)
        .maybeSingle();
      if (data) crmContactId = data.id;
    }

    if (!crmContactId && email) {
      const { data } = await supabase
        .from('crm_contacts')
        .select('id')
        .eq('agency_id', client.agency_id)
        .ilike('email', email)
        .maybeSingle();
      if (data) crmContactId = data.id;
    }

    // ── If query is a general CRM question (no specific contact) ─────────────
    if (!crmContactId && query) {
      // Return aggregated CRM stats
      const [contactsResult, dealsResult, tasksResult, hotLeadsResult] = await Promise.all([
        supabase.from('crm_contacts').select('id', { count: 'exact', head: true }).eq('agency_id', client.agency_id),
        supabase.from('crm_deals').select('id, name, value, stage').eq('agency_id', client.agency_id).not('stage', 'in', '(won,lost)').order('value', { ascending: false }).limit(10),
        supabase.from('crm_tasks').select('id, title, priority, due_date').eq('agency_id', client.agency_id).eq('status', 'pending').order('due_date', { ascending: true }).limit(10),
        supabase.from('crm_contacts').select('id', { count: 'exact', head: true }).eq('agency_id', client.agency_id).eq('score_label', 'hot'),
      ]);

      const openDeals = dealsResult.data || [];
      const pendingTasks = tasksResult.data || [];
      const pipelineValue = openDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

      const contextText = [
        `CRM OVERVIEW for ${client.name}:`,
        `• Total contacts: ${contactsResult.count ?? 0}`,
        `• Hot leads: ${hotLeadsResult.count ?? 0}`,
        `• Open pipeline value: $${pipelineValue >= 1000 ? `${(pipelineValue / 1000).toFixed(1)}K` : pipelineValue}`,
        `• Open deals: ${openDeals.length}`,
        openDeals.length > 0 ? `\nOPEN DEALS:\n${openDeals.map(d => `- ${d.name}: $${d.value} (${d.stage})`).join('\n')}` : '',
        pendingTasks.length > 0 ? `\nPENDING TASKS:\n${pendingTasks.map(t => `- [${t.priority}] ${t.title}${t.due_date ? ` (due ${new Date(t.due_date).toLocaleDateString()})` : ''}`).join('\n')}` : '',
      ].filter(Boolean).join('\n');

      return NextResponse.json({
        found: false,
        type: 'aggregate',
        context: contextText,
        data: {
          totalContacts: contactsResult.count ?? 0,
          hotLeads: hotLeadsResult.count ?? 0,
          pipelineValue,
          openDeals,
          pendingTasks,
        },
      }, { headers: CORS });
    }

    if (!crmContactId) {
      return NextResponse.json({
        found: false,
        context: 'No contact found with that phone number, email, or ID in the CRM.',
      }, { headers: CORS });
    }

    // ── Load full contact context ─────────────────────────────────────────────
    const [contactResult, dealsResult, tasksResult, activitiesResult] = await Promise.all([
      supabase
        .from('crm_contacts')
        .select('id, first_name, last_name, email, phone, company_id, stage, score, score_label, tags, source, ai_summary, ai_next_action, last_activity_at, last_contacted_at, enrichment_data')
        .eq('id', crmContactId)
        .single(),
      supabase
        .from('crm_deals')
        .select('id, name, value, stage, close_date, notes')
        .eq('contact_id', crmContactId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('crm_tasks')
        .select('id, title, priority, status, due_date')
        .eq('contact_id', crmContactId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(5),
      supabase
        .from('crm_activities')
        .select('type, subject, body, direction, actor, created_at')
        .eq('contact_id', crmContactId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const contact = contactResult.data;
    if (!contact) {
      return NextResponse.json({ found: false, context: 'Contact not found.' }, { headers: CORS });
    }

    const deals = dealsResult.data || [];
    const tasks = tasksResult.data || [];
    const activities = activitiesResult.data || [];

    // Load relationship memories
    const memories = await getMemories(client.agency_id, crmContactId).catch(() => []);
    const memoryContext = buildMemoryContext(memories);

    // Build contact name
    const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown';

    // Build human-readable context string for LLM injection
    const contextLines = [
      `CONTACT: ${contactName}`,
      contact.email ? `Email: ${contact.email}` : '',
      contact.phone ? `Phone: ${contact.phone}` : '',
      contact.stage ? `Stage: ${contact.stage}` : '',
      contact.score_label ? `Lead score: ${contact.score_label} (${contact.score}/100)` : '',
      contact.tags?.length ? `Tags: ${contact.tags.join(', ')}` : '',
      contact.ai_summary ? `\nAI Summary: ${contact.ai_summary}` : '',
      contact.ai_next_action ? `Recommended next action: ${contact.ai_next_action}` : '',
      contact.last_contacted_at ? `Last contacted: ${new Date(contact.last_contacted_at).toLocaleDateString()}` : '',
      deals.length > 0 ? `\nOPEN DEALS:\n${deals.map(d => `- ${d.name}: $${d.value} (${d.stage})${d.close_date ? ` | close: ${new Date(d.close_date).toLocaleDateString()}` : ''}`).join('\n')}` : '',
      tasks.length > 0 ? `\nPENDING TASKS:\n${tasks.map(t => `- [${t.priority}] ${t.title}${t.due_date ? ` (due ${new Date(t.due_date).toLocaleDateString()})` : ''}`).join('\n')}` : '',
      activities.length > 0 ? `\nRECENT ACTIVITY:\n${activities.slice(0, 5).map(a => `- ${a.type} (${a.direction || 'note'}): ${a.subject || a.body?.slice(0, 80) || a.type}`).join('\n')}` : '',
      memoryContext ? `\nRELATIONSHIP NOTES:\n${memoryContext}` : '',
    ].filter(Boolean).join('\n');

    return NextResponse.json({
      found: true,
      contactId: crmContactId,
      contactName,
      context: contextLines,
      data: {
        contact,
        deals,
        tasks,
        recentActivities: activities.slice(0, 5),
        memories: memories.slice(0, 10),
      },
    }, { headers: CORS });

  } catch (err) {
    console.error('[agent/crm-context] Error:', err);
    return NextResponse.json(
      { found: false, error: err instanceof Error ? err.message : 'CRM lookup failed' },
      { status: 500, headers: CORS }
    );
  }
}
