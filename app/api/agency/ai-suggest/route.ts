import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';

export const dynamic = 'force-dynamic';

const SUGGESTIONS: Record<string, (context: Record<string, string>) => string[]> = {
  tasks: (ctx) => {
    const industry = ctx.industry || 'your business';
    return [
      `Research top 10 keywords in the ${industry} niche this week`,
      `Write 5 social media post ideas for ${industry}`,
      `Summarize last 10 customer questions into an FAQ document`,
      `Find 20 potential leads in the ${industry} space using Google`,
      `Create a 5-email onboarding sequence for new subscribers`,
      `Draft a weekly performance report template`,
      `Audit competitor websites and list their top 3 offers`,
      `Write 3 blog post outlines targeting ${industry} pain points`,
      `Create a customer testimonial request email template`,
      `Build a referral program outline for existing customers`,
    ];
  },
  role_description: (ctx) => {
    const role = ctx.role || 'AI Worker';
    const industry = ctx.industry || 'your business';
    return [
      `You are a ${role} for a ${industry} business. Your job is to greet every new lead within 60 seconds, qualify them by asking about their needs, budget, and timeline, then either book an appointment or pass them to a human agent. Always be professional, warm, and concise. Never make promises about pricing — direct those questions to the team.`,
      `You are an AI assistant specializing in ${industry}. You handle incoming inquiries via SMS and web chat. Your priorities: (1) Answer questions using the knowledge base, (2) Collect contact information, (3) Schedule appointments when appropriate, (4) Escalate complex issues to a human. Keep responses under 3 sentences unless the customer asks for detail.`,
      `You are a customer support specialist for a ${industry} company. You resolve common issues, track service requests, send follow-up reminders, and collect reviews after completed jobs. You know the business hours, service area, and pricing tiers. When you don't know something, say so and offer to connect them with the team.`,
    ];
  },
  follow_up_sequence: (ctx) => {
    const industry = ctx.industry || 'your business';
    return [
      `Day 1: Welcome message — Thank them for reaching out, confirm their inquiry, set expectations for response time`,
      `Day 3: Value add — Share a helpful tip or resource related to ${industry} that addresses their likely pain point`,
      `Day 7: Check-in — Ask if they have any questions, remind them of your services, offer to schedule a call`,
      `Day 14: Social proof — Share a brief customer success story or testimonial from a similar client`,
      `Day 30: Re-engagement — "Still thinking about [service]? We have availability this week" with a direct booking link`,
    ];
  },
  email_templates: (ctx) => {
    const industry = ctx.industry || 'your business';
    return [
      `Subject: Quick question about your ${industry} needs\n\nHi {{firstName}},\n\nI noticed you recently [action]. Most ${industry} businesses we work with face [common challenge].\n\nWe help businesses like yours [specific outcome] — typically within [timeframe].\n\nWould a 15-minute call this week make sense?\n\nBest,\n{{senderName}}`,
      `Subject: {{firstName}}, here's what we found\n\nHi {{firstName}},\n\nAfter looking at your [business/website/inquiry], here are 3 quick wins:\n\n1. [Specific suggestion]\n2. [Specific suggestion]\n3. [Specific suggestion]\n\nWant us to implement these for you? Reply "yes" and I'll set it up.\n\n{{senderName}}`,
    ];
  },
  alert_rules: () => [
    'Alert me if any AI worker goes offline for more than 10 minutes',
    'Alert me if daily token usage exceeds 50,000 tokens for any client',
    'Alert me if no conversations happen for 24 hours on an active client',
    'Alert me if a review queue item sits for more than 4 hours',
    'Alert me if AI response error rate exceeds 10% in a day',
  ],
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const body = await request.json();
  const type = body.type as string;
  const context = (body.context || {}) as Record<string, string>;

  // Add agency info to context
  const settings = (result.agency.settings as Record<string, unknown>) ?? {};
  context.industry = context.industry || (settings.industry as string) || '';

  const generator = SUGGESTIONS[type];
  if (!generator) {
    return NextResponse.json({ error: `Unknown suggestion type: ${type}` }, { status: 400 });
  }

  const suggestions = generator(context);

  return NextResponse.json({ suggestions, type });
}
