// POST /api/agency/demo-client
// Creates a pre-configured demo client with mock conversations so agencies
// can show prospects a live example of Kyra AI in action.

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';
import { provisionClientGateway } from '@/lib/ovh/provisioner';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

const DEMO_PERSONAS = [
  {
    slug: 'smile-dental-demo',
    name: 'Smile Dental (Demo)',
    industry: 'Dental',
    persona: 'Friendly dental receptionist named Sarah who is warm, professional, and always tries to book appointments.',
    greeting: "Hi! Thanks for reaching out to Smile Dental Clinic. I'm Sarah, your AI receptionist. How can I help you today? 😊",
    instructions: `Business: Smile Dental Clinic
Hours: Mon-Fri 9am-5pm, Sat 9am-1pm
Address: 123 Main St, Springfield
Phone: (555) 123-4567

Services & Pricing:
- Dental Cleaning: $150 (or $0 with insurance)
- Teeth Whitening: $299
- Crown: $800-1200
- Emergency exam: $75

Rules:
- Always try to book an appointment
- Ask about insurance upfront
- For dental emergencies, ask them to call the office directly
- Never give specific medical advice`,
    conversations: [
      {
        user_message: '[Maria Garcia] Hi, I need to get my teeth cleaned. How much does it cost?',
        ai_response: "Hi Maria! 😊 A routine dental cleaning at Smile Dental is $150, or completely covered by most dental insurance plans. We're currently accepting new patients! Would you like me to get you scheduled? We have openings this week.",
        channel: 'ghl_sms',
      },
      {
        user_message: '[John Smith] Do you take Delta Dental insurance?',
        ai_response: "Yes, we absolutely accept Delta Dental! 🎉 With Delta Dental, your routine cleaning is typically 100% covered. Would you like to book your appointment? I have Tuesday at 2pm or Thursday at 10am available this week.",
        channel: 'ghl_sms',
      },
      {
        user_message: '[James Wilson] I have severe tooth pain and need to be seen TODAY',
        ai_response: "I'm so sorry you're in pain, James! 😟 For dental emergencies, please call our office directly at (555) 123-4567 so our team can see you as soon as possible today. I'll flag this for our team and someone will follow up with you shortly.",
        channel: 'ghl_sms',
      },
      {
        user_message: '[NEW CONTACT] Sarah Johnson (+1-555-0192)',
        ai_response: "Hi! Thanks for reaching out to Smile Dental Clinic. I'm Sarah, your AI receptionist. How can I help you today? 😊",
        channel: 'ghl_sms',
      },
      {
        user_message: '[Carlos Martinez] What are your hours?',
        ai_response: "We're open Monday through Friday, 9am-5pm, and Saturday 9am-1pm. Is there a day that works best for you? I'd love to get you scheduled! 😊",
        channel: 'ghl_sms',
      },
    ],
  },
  {
    slug: 'apex-leads-demo',
    name: 'Apex Realty (Demo)',
    industry: 'Real Estate',
    persona: 'Sharp, friendly real estate lead qualifier named Alex who qualifies buyers and books property tours.',
    greeting: "Hey! This is Alex from Apex Realty 👋 Thanks for your interest. Are you looking to buy, sell, or just exploring the market?",
    instructions: `Business: Apex Realty
Agent: Michael Torres
Phone: (555) 987-6543

Focus areas:
- Qualifying buyer leads (timeline, budget, pre-approved?)
- Scheduling property tours
- Answering basic market questions

Rules:
- Always ask: Are they pre-approved? What's their budget? Timeline?
- Hot lead = pre-approved + buying in 60 days
- Book tours for qualified leads immediately
- For complex questions, say agent Michael will follow up`,
    conversations: [
      {
        user_message: '[David Kim] I saw your listing on Zillow for the 3br on Oak Street',
        ai_response: "Great choice, David! That 3BR on Oak Street just came on the market at $425K. Before I book a tour, quick question — are you pre-approved for financing, or are you in the early stages? 🏡",
        channel: 'ghl_sms',
      },
      {
        user_message: '[Lisa Chen] Yes, pre-approved up to $500K. Can I see it this weekend?',
        ai_response: "Absolutely! 🎉 Pre-approved at $500K puts you in a great position for Oak Street. I have Saturday 10am or Sunday 2pm available for a private tour with Agent Michael Torres. Which works better for you?",
        channel: 'ghl_sms',
      },
      {
        user_message: '[NEW CONTACT] Tom Bradley (+1-555-0847)',
        ai_response: "Hey! This is Alex from Apex Realty 👋 Thanks for your interest. Are you looking to buy, sell, or just exploring the market?",
        channel: 'ghl_sms',
      },
    ],
  },
];

export async function POST(request: NextRequest) {
  const result = await requireAgencyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = getSupabase();

  // Pick demo persona (default to first)
  let body: { persona?: string } = {};
  try { body = await request.json(); } catch { /* no body */ }
  const demo = DEMO_PERSONAS[body.persona === 'realty' ? 1 : 0];

  // Check if demo already exists
  const { data: existing } = await supabase
    .from('agency_clients')
    .select('id')
    .eq('agency_id', agency.id)
    .eq('name', demo.name)
    .single();

  if (existing) {
    return NextResponse.json({ clientId: existing.id, already_existed: true });
  }

  // Create the client
  const slug = `${demo.slug}-${Date.now().toString(36)}`;
  const { data: client, error: createErr } = await supabase
    .from('agency_clients')
    .insert({
      agency_id: agency.id,
      name: demo.name,
      slug,
      status: 'active',
      industry: demo.industry,
      container_config: {
        persona: demo.persona,
        greeting: demo.greeting,
        instructions: demo.instructions,
      },
    })
    .select('id')
    .single();

  if (createErr || !client) {
    return NextResponse.json({ error: 'Failed to create demo client' }, { status: 500 });
  }

  // Provision container in background (best-effort)
  const soulMd = [
    `# SOUL.md — ${demo.name}`,
    '',
    demo.persona,
    '',
    `## Greeting`,
    demo.greeting,
    '',
    `## Instructions`,
    demo.instructions,
  ].join('\n');
  provisionClientGateway(client.id, agency.id, { soulMd }).catch(() => {});

  // Seed mock conversations
  const convDocs = demo.conversations.map((c) => ({
    client_id: client.id,
    agency_id: agency.id,
    channel: c.channel,
    user_message: c.user_message,
    ai_response: c.ai_response,
  }));

  await supabase.from('client_conversations').insert(convDocs);

  // Increment usage_this_month to show activity
  await supabase
    .from('agency_clients')
    .update({ usage_this_month: demo.conversations.length })
    .eq('id', client.id);

  return NextResponse.json({ clientId: client.id, already_existed: false });
}
