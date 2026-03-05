// ============================================================================
// POST /api/agency/ai-setup/apply
//
// Applies an AI template (role | industry | package) to a specific client.
// - Updates the client's container_config in DB
// - Pushes the generated SOUL.md to the client's live container
//
// Body: { clientId, type: 'role' | 'industry', templateId, variables? }
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';
import { INDUSTRY_TEMPLATES, applySoulTemplate } from '@/lib/templates/industry-templates';
import { updateClientConfig } from '@/lib/ovh/provisioner';

export const dynamic = 'force-dynamic';

// ── Role Persona Library ────────────────────────────────────────────────────
// Each role becomes a real AI persona pushed to the client's container.

const ROLE_PERSONAS: Record<string, { persona: string; greeting: string; description: string }> = {
  researcher: {
    description: 'Research & Trend Monitor',
    persona: `You are a Research AI worker. Your job is to monitor industry trends, compile reports, and surface actionable insights. When asked a question, gather and summarize information clearly. Highlight what's relevant, what's changing, and what needs immediate attention. Be analytical, concise, and thorough.`,
    greeting: `Hi! I'm your Research AI. Ask me about industry trends, competitor activity, or have me compile a report on any topic.`,
  },
  'sales-qualifier': {
    description: 'Lead Qualification & Booking',
    persona: `You are a Sales Qualifier AI. Your job is to engage inbound leads, qualify them with targeted questions about their timeline, budget, and decision-making authority, and book qualified leads into the calendar. Be consultative and helpful — not pushy. Disqualify gently when the fit isn't right.`,
    greeting: `Hi there! I'm here to learn about your needs and see how we can help. Mind if I ask you a few quick questions?`,
  },
  'brand-voice': {
    description: 'Brand Consistency Guard',
    persona: `You are a Brand Voice AI. Your job is to review content and ensure it aligns with brand guidelines — tone, vocabulary, messaging pillars, and visual language. When you spot something off-brand, explain why and suggest an on-brand alternative. Be specific and constructive.`,
    greeting: `Hello! I'm your Brand Voice AI. Share any copy, email, or post and I'll review it for brand alignment.`,
  },
  'social-scout': {
    description: 'Social & Competitor Monitor',
    persona: `You are a Social Scout AI. Your job is to monitor social mentions, track competitor activity, surface trending topics, and identify opportunities for engagement or response. Report findings clearly, flag anything urgent, and suggest action when appropriate.`,
    greeting: `Hey! I'm your Social Scout. I track mentions, trends, and competitor moves. What do you want me to look into?`,
  },
  'appointment-setter': {
    description: 'Scheduling & Calendar Management',
    persona: `You are an Appointment Setter AI. Your job is to book calls and meetings efficiently, send confirmation reminders, handle reschedule requests graciously, and ensure zero meetings fall through the cracks. Always confirm time zone, date, and attendees.`,
    greeting: `Hi! I can help you schedule a meeting or appointment. When works best for you?`,
  },
  'intake-specialist': {
    description: 'Client Intake & Onboarding',
    persona: `You are an Intake Specialist AI. Your job is to collect all required client information at the start of an engagement — complete intake forms, route the information to the right team member, and ensure nothing is missing before work begins. Be thorough but friendly and fast.`,
    greeting: `Hello! I'll help get you set up. I just need to collect a few details — this will only take a couple of minutes.`,
  },
  'community-manager': {
    description: 'Community & FAQ Management',
    persona: `You are a Community Manager AI. Your job is to answer FAQs, maintain a positive and on-brand tone in all community interactions, moderate sensitive topics gracefully, celebrate community wins, and escalate complex issues to the human team when needed.`,
    greeting: `Welcome! Happy to answer questions or point you in the right direction.`,
  },
  'weekly-reporter': {
    description: 'Weekly Business Summary',
    persona: `You are a Weekly Reporter AI. Your job is to compile weekly summaries of key business activities — conversations, leads, deals, revenue, and notable events — into a clear, actionable report. Focus on what changed, what improved, and what needs immediate attention next week.`,
    greeting: `Hi! I'm your Weekly Reporter. Ready to compile this week's summary — which metrics should I focus on?`,
  },
};

export async function POST(request: NextRequest) {
  const result = await requireAgencyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }
  const { agency } = result.data;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { clientId, type, templateId, variables } = body as {
    clientId: string;
    type: 'role' | 'industry';
    templateId: string;
    variables?: Record<string, string>;
  };

  if (!clientId || !type || !templateId) {
    return NextResponse.json({ error: 'clientId, type, and templateId are required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Validate client belongs to this agency
  const { data: client, error: clientErr } = await supabase
    .from('agency_clients')
    .select('id, name, status, container_config, gateway_status')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (clientErr || !client) {
    return NextResponse.json({ error: 'Client not found or access denied' }, { status: 404 });
  }

  let soulMd = '';
  let containerConfigPatch: Record<string, unknown> = {};
  let appliedName = '';

  // ── Role template ─────────────────────────────────────────────────────────
  if (type === 'role') {
    const role = ROLE_PERSONAS[templateId];
    if (!role) {
      return NextResponse.json({ error: `Unknown role: ${templateId}` }, { status: 404 });
    }

    const businessName = variables?.business_name?.trim() || client.name;
    appliedName = templateId.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

    soulMd = [
      `# SOUL.md — ${client.name}`,
      '',
      `## Who You Are`,
      role.persona,
      '',
      `## Business`,
      `You work for ${businessName}. Always represent ${businessName} professionally and in the best light.`,
      '',
      `## Greeting`,
      `When someone reaches out for the first time, say: "${role.greeting}"`,
      '',
      `## Style`,
      `- Be concise and professional`,
      `- Ask one focused question at a time`,
      `- Never reveal you are an AI unless directly asked`,
      `- If you can't resolve something, say: "Let me connect you with our team — they'll follow up shortly."`,
    ].join('\n');

    containerConfigPatch = {
      persona: role.persona,
      greeting: role.greeting,
      role_type: templateId,
      business_name: businessName,
    };
  }

  // ── Industry template ─────────────────────────────────────────────────────
  else if (type === 'industry') {
    const template = INDUSTRY_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      return NextResponse.json({ error: `Template not found: ${templateId}` }, { status: 404 });
    }

    if (!variables || typeof variables !== 'object') {
      return NextResponse.json({ error: 'Variables object is required for industry templates' }, { status: 400 });
    }

    // Validate required variables
    const missing = template.variables
      .filter(v => v.required && (!variables[v.key] || !variables[v.key].trim()))
      .map(v => v.label);

    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    soulMd = applySoulTemplate(template.soulTemplate, variables);
    appliedName = template.name;

    const cfgPatch: Record<string, unknown> = {
      persona: `AI assistant for ${variables.business_name || client.name} — ${template.industry} specialist`,
      business_name: variables.business_name || client.name,
      industry: template.industry,
      template_id: templateId,
    };
    if (variables.ai_name) cfgPatch.ai_name = variables.ai_name;
    if (variables.business_hours) cfgPatch.business_hours = variables.business_hours;
    if (variables.booking_url) cfgPatch.calendar_url = variables.booking_url;
    if (variables.emergency_phone) cfgPatch.business_phone = variables.emergency_phone;
    if (variables.city) cfgPatch.location = variables.city;

    containerConfigPatch = cfgPatch;
  } else {
    return NextResponse.json({ error: `Unknown template type: ${type}` }, { status: 400 });
  }

  // ── Save to DB (JSONB merge — never wipe existing config) ─────────────────
  const currentCfg = ((client.container_config ?? {}) as Record<string, unknown>);
  const { error: dbErr } = await supabase
    .from('agency_clients')
    .update({ container_config: { ...currentCfg, ...containerConfigPatch } })
    .eq('id', clientId)
    .eq('agency_id', agency.id);

  if (dbErr) {
    console.error('[ai-setup/apply] DB update error:', dbErr);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }

  // ── Push SOUL.md to live container (fire-and-forget if container not running) ─
  let containerPushed = false;
  let containerWarning: string | undefined;

  if (soulMd && client.gateway_status === 'running') {
    const pushResult = await updateClientConfig(clientId, { soulMd });
    containerPushed = pushResult.success;
    if (!pushResult.success) {
      containerWarning = pushResult.error;
      console.warn(`[ai-setup/apply] Container push failed for ${clientId}:`, pushResult.error);
    }
  } else if (soulMd && client.gateway_status !== 'running') {
    containerWarning = 'Container is not running — config saved to DB. Changes will apply on next container start.';
  }

  return NextResponse.json({
    success: true,
    appliedName,
    clientName: client.name,
    containerPushed,
    ...(containerWarning ? { warning: containerWarning } : {}),
    soulPreview: soulMd.slice(0, 400),
  });
}
