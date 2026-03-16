/**
 * POST /api/agency/templates/community/install
 *
 * Install a community template. Increments install count and
 * grants 5 credits to the creator per install.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const CREDITS_PER_INSTALL = 5;

export async function POST(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();
  const { templateId } = (await request.json()) as { templateId: string };

  if (!templateId) {
    return NextResponse.json({ error: 'Missing templateId' }, { status: 400 });
  }

  // Get template
  const { data: template } = await supabase
    .from('agency_templates')
    .select('*')
    .eq('id', templateId)
    .eq('is_community', true)
    .single();

  if (!template) {
    return NextResponse.json({ error: 'Community template not found' }, { status: 404 });
  }

  // Don't let creator install their own template
  if (template.agency_id === agency.id) {
    return NextResponse.json({ error: 'You cannot install your own template' }, { status: 400 });
  }

  // Copy template to agency's own templates (remove community flag)
  const { error: insertError } = await supabase
    .from('agency_templates')
    .insert({
      name: template.name,
      industry: template.industry,
      description: template.description,
      icon: template.icon,
      tags: template.tags,
      soul_template: template.soul_template,
      variables: template.variables,
      suggested_tools: template.suggested_tools,
      sample_faqs: template.sample_faqs,
      automations: template.automations,
      agency_id: agency.id,
      is_community: false,
      source_template_id: template.id,
    });

  if (insertError) {
    // Likely duplicate
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'Template already installed' }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Increment install count
  await supabase.rpc('increment_template_installs', { template_id: templateId });

  // Grant credits to creator
  if (template.agency_id) {
    const { data: creatorAgency } = await supabase
      .from('agencies')
      .select('id, credits')
      .eq('id', template.agency_id)
      .single();

    if (creatorAgency) {
      await supabase
        .from('agencies')
        .update({ credits: (creatorAgency.credits || 0) + CREDITS_PER_INSTALL })
        .eq('id', creatorAgency.id);

      // Log the credit event
      await supabase.from('credit_events').insert({
        agency_id: creatorAgency.id,
        amount: CREDITS_PER_INSTALL,
        type: 'template_install_reward',
        description: `Template "${template.name}" installed by another agency`,
        metadata: { template_id: templateId, installer_agency_id: agency.id },
      }).then(() => {/* fire and forget is fine for logging */});
    }
  }

  return NextResponse.json({
    ok: true,
    message: `Template "${template.name}" installed successfully`,
  });
}
