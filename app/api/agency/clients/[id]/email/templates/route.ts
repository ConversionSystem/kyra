import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/agency/clients/[id]/email/templates
 * List templates (system + custom for this client).
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id: clientId } = await context.params;
  const result = await requireAgencyAdmin();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: result.error.status });

  const { agency } = result.data;
  const supabase = await createClient();

  // Get system templates + client-specific templates
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('agency_id', agency.id)
    .or(`is_system.eq.true,client_id.eq.${clientId}`)
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  return NextResponse.json({ templates: data });
}

/**
 * POST /api/agency/clients/[id]/email/templates
 * Create a custom template.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: clientId } = await context.params;
  const result = await requireAgencyAdmin();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: result.error.status });

  const { agency } = result.data;
  const body = await request.json();
  const { name, subject, html_body, text_body, category, variables } = body;

  if (!name || !subject || !html_body) {
    return NextResponse.json({ error: 'Missing required fields: name, subject, html_body' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      agency_id: agency.id,
      client_id: clientId,
      name,
      subject,
      html_body,
      text_body: text_body || null,
      category: category || 'custom',
      is_system: false,
      variables: variables || [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  return NextResponse.json({ template: data }, { status: 201 });
}
