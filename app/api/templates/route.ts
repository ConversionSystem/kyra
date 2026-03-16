import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { INDUSTRY_TEMPLATES, getTemplate, applySoulTemplate } from '@/lib/templates/industry-templates';

export const dynamic = 'force-dynamic';

// GET — List all templates or get one by ID
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');

  if (id) {
    const template = getTemplate(id);
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    return NextResponse.json({ template });
  }

  return NextResponse.json({
    templates: INDUSTRY_TEMPLATES.map(t => ({
      id: t.id,
      name: t.name,
      industry: t.industry,
      emoji: t.emoji,
      description: t.description,
      tags: t.tags,
      popularity: t.popularity,
      variableCount: t.variables.length,
      toolCount: t.suggestedTools.length,
    })),
  });
}

// POST — Apply a template to the user's AI worker
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { templateId, variables } = body;

  if (!templateId || !variables) {
    return NextResponse.json({ error: 'templateId and variables required' }, { status: 400 });
  }

  const template = getTemplate(templateId);
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  // Validate required variables
  const missing = template.variables
    .filter(v => v.required && (!variables[v.key] || !variables[v.key].trim()))
    .map(v => v.label);

  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
  }

  // Generate the SOUL.md content
  const soulContent = applySoulTemplate(template.soulTemplate, variables);

  // Get user's agency
  const { data: membership } = await sb
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  // Save template config to agency_templates table
  await sb
    .from('agency_templates')
    .upsert({
      agency_id: membership.agency_id,
      name: template.name,
      description: template.description,
      industry: template.industry,
      soul_template: soulContent,
      skills: template.suggestedTools,
      is_public: false,
    }, { onConflict: 'agency_id,name' });

  return NextResponse.json({
    success: true,
    soul: soulContent,
    tools: template.suggestedTools,
    automations: template.automations,
    message: `${template.name} template applied! Your AI worker is now configured for ${template.industry}.`,
  });
}
